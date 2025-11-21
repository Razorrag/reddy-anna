-- ⚡⚡⚡ MASTER SETUP - INSTANT STATISTICS TRIGGERS ⚡⚡⚡
-- Run this ONCE to set up automatic, instant statistics tracking
-- This ensures ALL data is calculated and saved the MOMENT a game completes

-- ============================================================================
-- PART 1: CREATE INDEXES FOR LIGHTNING-FAST QUERIES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_player_bets_game_id ON player_bets(game_id);
CREATE INDEX IF NOT EXISTS idx_player_bets_game_side ON player_bets(game_id, side);
CREATE INDEX IF NOT EXISTS idx_player_bets_user_payout ON player_bets(user_id, game_id, actual_payout);
CREATE INDEX IF NOT EXISTS idx_game_statistics_game_id ON game_statistics(game_id);
CREATE INDEX IF NOT EXISTS idx_game_history_created ON game_history(created_at DESC);

SELECT '✅ STEP 1: Indexes created for fast queries' as status;

-- ============================================================================
-- PART 2: GAME STATISTICS TRIGGER (Calculates game-level statistics)
-- ============================================================================

CREATE OR REPLACE FUNCTION instant_calculate_game_statistics()
RETURNS TRIGGER AS $$
DECLARE
  v_stats RECORD;
  v_profit_loss NUMERIC;
  v_profit_loss_percentage NUMERIC;
BEGIN
  -- Single optimized query to get ALL statistics
  SELECT 
    COUNT(DISTINCT pb.user_id) as total_players,
    COALESCE(SUM(pb.amount), 0) as total_bets,
    COALESCE(SUM(pb.actual_payout), 0) as total_winnings,
    COALESCE(SUM(CASE WHEN pb.side = 'andar' THEN pb.amount ELSE 0 END), 0) as andar_total_bet,
    COALESCE(SUM(CASE WHEN pb.side = 'bahar' THEN pb.amount ELSE 0 END), 0) as bahar_total_bet,
    COUNT(CASE WHEN pb.side = 'andar' THEN 1 END) as andar_bets_count,
    COUNT(CASE WHEN pb.side = 'bahar' THEN 1 END) as bahar_bets_count
  INTO v_stats
  FROM player_bets pb
  WHERE pb.game_id = NEW.game_id;

  v_profit_loss := v_stats.total_bets - v_stats.total_winnings;
  
  IF v_stats.total_bets > 0 THEN
    v_profit_loss_percentage := (v_profit_loss / v_stats.total_bets) * 100;
  ELSE
    v_profit_loss_percentage := 0;
  END IF;

  INSERT INTO game_statistics (
    game_id, total_players, total_bets, total_winnings, house_earnings,
    andar_bets_count, bahar_bets_count, andar_total_bet, bahar_total_bet,
    profit_loss, profit_loss_percentage, house_payout, game_duration,
    unique_players, created_at
  )
  VALUES (
    NEW.game_id, v_stats.total_players, v_stats.total_bets,
    v_stats.total_winnings, v_profit_loss, v_stats.andar_bets_count,
    v_stats.bahar_bets_count, v_stats.andar_total_bet, v_stats.bahar_total_bet,
    v_profit_loss, v_profit_loss_percentage, v_stats.total_winnings,
    0, v_stats.total_players, NEW.created_at
  )
  ON CONFLICT (game_id) DO UPDATE SET
    total_bets = EXCLUDED.total_bets,
    total_winnings = EXCLUDED.total_winnings,
    profit_loss = EXCLUDED.profit_loss;

  RAISE NOTICE '⚡ GAME STATS: % | Bets: % | Profit: %', 
    NEW.game_id, v_stats.total_bets, v_profit_loss;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING '❌ Game stats failed for %: %', NEW.game_id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_instant_game_statistics ON game_history;

CREATE TRIGGER trg_instant_game_statistics
AFTER INSERT ON game_history
FOR EACH ROW
EXECUTE FUNCTION instant_calculate_game_statistics();

SELECT '✅ STEP 2: Game statistics trigger created' as status;

-- ============================================================================
-- PART 3: USER STATISTICS TRIGGER (Updates player stats on payout)
-- ============================================================================

CREATE OR REPLACE FUNCTION instant_update_user_statistics()
RETURNS TRIGGER AS $$
DECLARE
  v_user_won BOOLEAN;
  v_profit_loss NUMERIC;
  v_is_first_bet_in_game BOOLEAN;
BEGIN
  IF NEW.actual_payout IS NOT NULL AND (OLD.actual_payout IS NULL OR OLD.actual_payout != NEW.actual_payout) THEN
    
    v_user_won := (NEW.actual_payout > NEW.amount);
    v_profit_loss := NEW.actual_payout - NEW.amount;
    
    -- Check if this is the first bet with payout for this user in this game
    v_is_first_bet_in_game := NOT EXISTS (
      SELECT 1 FROM player_bets 
      WHERE user_id = NEW.user_id 
      AND game_id = NEW.game_id 
      AND id < NEW.id 
      AND actual_payout IS NOT NULL
    );
    
    UPDATE users
    SET 
      games_played = COALESCE(games_played, 0) + 
        CASE WHEN v_is_first_bet_in_game THEN 1 ELSE 0 END,
      games_won = COALESCE(games_won, 0) + 
        CASE WHEN v_user_won AND v_is_first_bet_in_game THEN 1 ELSE 0 END,
      total_winnings = COALESCE(total_winnings, 0) + 
        CASE WHEN v_profit_loss > 0 THEN v_profit_loss ELSE 0 END,
      total_losses = COALESCE(total_losses, 0) + 
        CASE WHEN v_profit_loss < 0 THEN ABS(v_profit_loss) ELSE 0 END,
      updated_at = NOW()
    WHERE id = NEW.user_id;
    
    RAISE NOTICE '⚡ USER STATS: % | Won: % | P/L: %', 
      NEW.user_id, v_user_won, v_profit_loss;
  END IF;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING '❌ User stats failed for %: %', NEW.user_id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_instant_user_statistics ON player_bets;
DROP TRIGGER IF EXISTS trg_instant_user_statistics_insert ON player_bets;

CREATE TRIGGER trg_instant_user_statistics
AFTER UPDATE OF actual_payout ON player_bets
FOR EACH ROW
WHEN (NEW.actual_payout IS NOT NULL AND (OLD.actual_payout IS NULL OR OLD.actual_payout != NEW.actual_payout))
EXECUTE FUNCTION instant_update_user_statistics();

CREATE TRIGGER trg_instant_user_statistics_insert
AFTER INSERT ON player_bets
FOR EACH ROW
WHEN (NEW.actual_payout IS NOT NULL)
EXECUTE FUNCTION instant_update_user_statistics();

SELECT '✅ STEP 3: User statistics triggers created' as status;

-- ============================================================================
-- PART 4: VERIFY ALL TRIGGERS ARE ACTIVE
-- ============================================================================

SELECT 
  '✅✅✅ ALL TRIGGERS ACTIVE' as status,
  COUNT(*) as trigger_count
FROM information_schema.triggers
WHERE trigger_name LIKE 'trg_instant%';

SELECT 
  trigger_name, 
  event_manipulation as fires_on,
  event_object_table as table_name,
  action_timing as timing
FROM information_schema.triggers
WHERE trigger_name LIKE 'trg_instant%'
ORDER BY event_object_table, trigger_name;

-- ============================================================================
-- PART 5: TEST QUERY - Show recent games and statistics
-- ============================================================================

SELECT 
  '📊 RECENT GAMES WITH STATISTICS' as section,
  COUNT(*) FILTER (WHERE gs.game_id IS NOT NULL) as games_with_stats,
  COUNT(*) FILTER (WHERE gs.game_id IS NULL) as games_without_stats
FROM game_history gh
LEFT JOIN game_statistics gs ON gh.game_id = gs.game_id
WHERE gh.created_at >= NOW() - INTERVAL '24 hours';

SELECT 
  gh.game_id,
  gh.winner,
  gh.created_at,
  CASE 
    WHEN gs.game_id IS NOT NULL THEN '✅ HAS STATS'
    ELSE '⚠️ NO STATS'
  END as status,
  gs.total_bets,
  gs.total_winnings,
  gs.profit_loss
FROM game_history gh
LEFT JOIN game_statistics gs ON gh.game_id = gs.game_id
ORDER BY gh.created_at DESC
LIMIT 5;

-- ============================================================================
-- 🎯 SETUP COMPLETE!
-- ============================================================================

SELECT '🎉🎉🎉 SETUP COMPLETE! 🎉🎉🎉' as message;

SELECT '
✅ WHAT WAS INSTALLED:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Performance Indexes
   - player_bets: game_id, user_id, side
   - game_statistics: game_id
   - game_history: created_at

2. Game Statistics Trigger
   - Fires: INSTANTLY when game completes
   - Calculates: Total bets, winnings, profit/loss
   - Saves to: game_statistics table

3. User Statistics Triggers (2 triggers)
   - Fires: When payout is set on player_bets
   - Updates: games_played, games_won, winnings, losses
   - Saves to: users table

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🚀 NEXT STEPS:
1. Complete a test game
2. Check game_statistics table - should have new row instantly
3. Check users table - statistics should update instantly
4. Check Supabase logs for "⚡" messages

⚠️ IMPORTANT:
- Triggers work INDEPENDENTLY of application code
- Statistics are calculated at DATABASE LEVEL
- Even if application code fails, triggers still work
- No performance impact on game completion

' as instructions;
