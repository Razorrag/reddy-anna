-- ============================================================================
-- FIX GAMES_PLAYED COUNTING INCONSISTENCY
-- ============================================================================
-- Problem: Two duplicate triggers causing double-counting + race conditions
-- Result: games_played shows 73 instead of 70 (overcount of 3 games)
--
-- Root Causes:
-- 1. trigger_update_player_stats_on_bet_complete (has race condition)
-- 2. trigger_update_user_bet_statistics (duplicate - also increments games_played)
-- 3. Both fire on player_bets UPDATE, causing double counting
--
-- Solution:
-- 1. Drop duplicate trigger
-- 2. Fix remaining trigger to use game_history (no race condition)
-- 3. Recalculate all user stats correctly
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '🔧 Starting games_played counting fix...';
  RAISE NOTICE '';
END $$;

-- ============================================================================
-- STEP 1: DROP DUPLICATE TRIGGER
-- ============================================================================

DO $$
BEGIN
  -- Drop the duplicate trigger from FIX_ADMIN_ANALYTICS_DATABASE.sql
  DROP TRIGGER IF EXISTS trigger_update_user_bet_statistics ON player_bets;
  DROP FUNCTION IF EXISTS update_user_bet_statistics();
  
  RAISE NOTICE '✅ Step 1: Dropped duplicate trigger_update_user_bet_statistics';
  RAISE NOTICE '';
END $$;

-- ============================================================================
-- STEP 2: CREATE NEW GAME HISTORY TRIGGER (RACE-CONDITION FREE)
-- ============================================================================

-- ============================================================================
-- STEP 2: CREATE NEW GAME HISTORY TRIGGER (RACE-CONDITION FREE)
-- ============================================================================

-- This trigger updates games_played from game_history table
-- One game_history record = one game, so NO race conditions possible
CREATE OR REPLACE FUNCTION update_player_games_played_from_history()
RETURNS TRIGGER AS $$
BEGIN
  -- Update games_played for ALL users who participated in this game
  UPDATE users u
  SET 
    games_played = COALESCE(games_played, 0) + 1,
    updated_at = NOW()
  WHERE u.id IN (
    SELECT DISTINCT user_id 
    FROM player_bets 
    WHERE game_id = NEW.game_id
  );
  
  RAISE NOTICE '✅ Updated games_played for game %', NEW.game_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on game_history INSERT (fires once per game)
DROP TRIGGER IF EXISTS trigger_update_games_played_from_history ON game_history;
CREATE TRIGGER trigger_update_games_played_from_history
  AFTER INSERT ON game_history
  FOR EACH ROW
  EXECUTE FUNCTION update_player_games_played_from_history();

DO $$
BEGIN
  RAISE NOTICE '✅ Step 2: Created new trigger_update_games_played_from_history';
  RAISE NOTICE '   - Fires: AFTER INSERT on game_history';
  RAISE NOTICE '   - No race conditions (one record = one game)';
  RAISE NOTICE '';
END $$;

-- ============================================================================
-- STEP 3: FIX EXISTING TRIGGER - REMOVE GAMES_PLAYED LOGIC
-- ============================================================================

-- Update trigger_update_player_stats_on_bet_complete to ONLY handle winnings/losses
-- Remove games_played and games_won (will be handled by game_history trigger)
CREATE OR REPLACE FUNCTION update_player_stats_on_bet_complete()
RETURNS TRIGGER AS $$
DECLARE
  v_user RECORD;
  v_new_winnings NUMERIC;
  v_new_losses NUMERIC;
  v_games_won INT;
BEGIN
  -- Only process if status changed to 'won' or 'lost' or 'completed'
  IF NEW.status IN ('won', 'lost', 'completed') AND 
     (OLD.status IS NULL OR OLD.status = 'pending') THEN
    
    -- Get current user stats
    SELECT 
      total_winnings, 
      total_losses, 
      games_won
    INTO v_user
    FROM users
    WHERE id = NEW.user_id;
    
    -- Calculate new stats based on GROSS amounts
    v_new_winnings := COALESCE(v_user.total_winnings, 0);
    v_new_losses := COALESCE(v_user.total_losses, 0);
    v_games_won := COALESCE(v_user.games_won, 0);
    
    -- Update winnings/losses based on bet outcome
    IF NEW.status = 'won' AND NEW.actual_payout > 0 THEN
      -- Add GROSS payout to winnings
      v_new_winnings := v_new_winnings + NEW.actual_payout;
      
      -- Increment games_won only if this is first winning bet from this game
      IF NOT EXISTS(
        SELECT 1 FROM player_bets 
        WHERE user_id = NEW.user_id 
          AND game_id = NEW.game_id 
          AND id != NEW.id 
          AND status = 'won'
      ) THEN
        v_games_won := v_games_won + 1;
      END IF;
      
    ELSIF NEW.status = 'lost' AND NEW.actual_payout = 0 THEN
      -- Add GROSS bet amount to losses
      v_new_losses := v_new_losses + NEW.amount;
      
    ELSIF NEW.actual_payout > 0 AND NEW.actual_payout < NEW.amount THEN
      -- Partial loss - track both
      v_new_winnings := v_new_winnings + NEW.actual_payout;
      v_new_losses := v_new_losses + (NEW.amount - NEW.actual_payout);
    END IF;
    
    -- Update user stats (NO games_played update here - handled by game_history trigger)
    UPDATE users
    SET 
      total_winnings = v_new_winnings,
      total_losses = v_new_losses,
      games_won = v_games_won,
      updated_at = NOW()
    WHERE id = NEW.user_id;
    
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  RAISE NOTICE '✅ Step 3: Updated trigger_update_player_stats_on_bet_complete';
  RAISE NOTICE '   - Removed games_played logic (prevents race condition)';
  RAISE NOTICE '   - Kept winnings/losses logic (per-bet stats)';
  RAISE NOTICE '';
END $$;

-- ============================================================================
-- STEP 4: RECALCULATE ALL USER STATISTICS
-- ============================================================================

DO $$
DECLARE
  v_users_updated INT := 0;
  v_total_users INT;
BEGIN
  RAISE NOTICE '🔄 Step 4: Recalculating all user statistics...';
  
  -- Get total users count
  SELECT COUNT(*) INTO v_total_users FROM users;
  
  -- Recalculate games_played correctly (count DISTINCT games)
  UPDATE users u
  SET games_played = (
    SELECT COUNT(DISTINCT pb.game_id)
    FROM player_bets pb
    WHERE pb.user_id = u.id
      AND pb.status IN ('won', 'lost', 'completed')
  );
  
  GET DIAGNOSTICS v_users_updated = ROW_COUNT;
  
  RAISE NOTICE '   ✅ Recalculated games_played for % users', v_users_updated;
  
  -- Recalculate games_won correctly
  UPDATE users u
  SET games_won = (
    SELECT COUNT(DISTINCT pb.game_id)
    FROM player_bets pb
    WHERE pb.user_id = u.id
      AND pb.status = 'won'
  );
  
  RAISE NOTICE '   ✅ Recalculated games_won for % users', v_users_updated;
  
  -- Recalculate total_winnings correctly
  UPDATE users u
  SET total_winnings = (
    SELECT COALESCE(SUM(pb.actual_payout), 0)
    FROM player_bets pb
    WHERE pb.user_id = u.id
      AND pb.status IN ('won', 'completed')
      AND pb.actual_payout > 0
  );
  
  RAISE NOTICE '   ✅ Recalculated total_winnings for % users', v_users_updated;
  
  -- Recalculate total_losses correctly
  UPDATE users u
  SET total_losses = (
    SELECT COALESCE(SUM(pb.amount), 0)
    FROM player_bets pb
    WHERE pb.user_id = u.id
      AND pb.status IN ('lost', 'completed')
      AND pb.actual_payout = 0
  );
  
  RAISE NOTICE '   ✅ Recalculated total_losses for % users', v_users_updated;
  RAISE NOTICE '';
END $$;

-- ============================================================================
-- STEP 5: VERIFICATION QUERIES
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '📊 Step 5: Verification Results';
  RAISE NOTICE '';
END $$;

-- Show current triggers on player_bets
SELECT 
  '🔍 Active Triggers on player_bets:' as info,
  trigger_name,
  action_timing || ' ' || event_manipulation as when_fires,
  action_statement as function_called
FROM information_schema.triggers
WHERE event_object_table = 'player_bets'
ORDER BY trigger_name;

-- Show current triggers on game_history
SELECT 
  '🔍 Active Triggers on game_history:' as info,
  trigger_name,
  action_timing || ' ' || event_manipulation as when_fires,
  action_statement as function_called
FROM information_schema.triggers
WHERE event_object_table = 'game_history'
ORDER BY trigger_name;

-- Show sample user stats (verify they look reasonable)
SELECT 
  '📈 Sample User Stats (Top 5 by games_played):' as info,
  id,
  username,
  games_played,
  games_won,
  total_winnings,
  total_losses,
  CASE 
    WHEN games_played > 0 THEN ROUND((games_won::NUMERIC / games_played::NUMERIC) * 100, 2)
    ELSE 0
  END as win_rate_pct
FROM users
WHERE games_played > 0
ORDER BY games_played DESC
LIMIT 5;

-- ============================================================================
-- COMPLETION SUMMARY
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ GAMES_PLAYED COUNTING FIX COMPLETE!';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'WHAT WAS FIXED:';
  RAISE NOTICE '1. ✅ Removed duplicate trigger (trigger_update_user_bet_statistics)';
  RAISE NOTICE '2. ✅ Created new race-condition-free trigger on game_history';
  RAISE NOTICE '3. ✅ Updated existing trigger to only handle winnings/losses';
  RAISE NOTICE '4. ✅ Recalculated all user statistics correctly';
  RAISE NOTICE '';
  RAISE NOTICE 'NEW ARCHITECTURE:';
  RAISE NOTICE '  📍 game_history INSERT → Updates games_played (1 game = 1 count)';
  RAISE NOTICE '  📍 player_bets UPDATE → Updates winnings/losses only';
  RAISE NOTICE '  📍 No more race conditions or double counting!';
  RAISE NOTICE '';
  RAISE NOTICE 'EXPECTED RESULT:';
  RAISE NOTICE '  Your games_played should now show 70 (not 73)';
  RAISE NOTICE '  Future games will count correctly (no more overcounting)';
  RAISE NOTICE '';
  RAISE NOTICE 'NEXT STEPS:';
  RAISE NOTICE '1. Verify your profile shows correct games_played count';
  RAISE NOTICE '2. Play a test game and confirm it increments by exactly 1';
  RAISE NOTICE '3. Check analytics dashboard for accurate stats';
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
END $$;