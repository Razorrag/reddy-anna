-- ⚡ INSTANT USER STATISTICS TRIGGER
-- Automatically updates user statistics the MOMENT they receive a payout
-- Updates: games_played, games_won, total_winnings, total_losses

-- Step 1: Create index for FAST queries
CREATE INDEX IF NOT EXISTS idx_player_bets_user_payout ON player_bets(user_id, game_id, payout);

-- Step 2: Create the instant user stats update function
CREATE OR REPLACE FUNCTION instant_update_user_statistics()
RETURNS TRIGGER AS $$
DECLARE
  v_user_won BOOLEAN;
  v_profit_loss NUMERIC;
BEGIN
  -- Only process if payout was set (meaning game completed)
  IF NEW.payout IS NOT NULL AND (OLD.payout IS NULL OR OLD.payout != NEW.payout) THEN
    
    -- Calculate if user won (payout > bet amount)
    v_user_won := (NEW.payout > NEW.amount);
    v_profit_loss := NEW.payout - NEW.amount;
    
    -- ⚡ ATOMIC UPDATE: Increment user statistics
    UPDATE users
    SET 
      -- Increment games played (only once per game per user)
      games_played = COALESCE(games_played, 0) + 
        CASE 
          WHEN NOT EXISTS (
            SELECT 1 FROM player_bets 
            WHERE user_id = NEW.user_id 
            AND game_id = NEW.game_id 
            AND id < NEW.id 
            AND payout IS NOT NULL
          ) THEN 1
          ELSE 0
        END,
      
      -- Increment games won if user won
      games_won = COALESCE(games_won, 0) + 
        CASE WHEN v_user_won THEN 1 ELSE 0 END,
      
      -- Update total winnings (only profits, not full payout)
      total_winnings = (COALESCE(CAST(total_winnings AS NUMERIC), 0) + 
        CASE WHEN v_profit_loss > 0 THEN v_profit_loss ELSE 0 END)::text,
      
      -- Update total losses (absolute value of losses)
      total_losses = (COALESCE(CAST(total_losses AS NUMERIC), 0) + 
        CASE WHEN v_profit_loss < 0 THEN ABS(v_profit_loss) ELSE 0 END)::text,
      
      updated_at = NOW()
    WHERE id = NEW.user_id;
    
    -- Log the update
    RAISE NOTICE '⚡ USER STATS: User % | Won: % | Profit/Loss: %', 
      NEW.user_id, v_user_won, v_profit_loss;
  END IF;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING '❌ User stats update failed for user % game %: %', 
      NEW.user_id, NEW.game_id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 3: Drop old trigger if exists
DROP TRIGGER IF EXISTS trg_instant_user_statistics ON player_bets;

-- Step 4: Create AFTER UPDATE trigger (fires when payout is set)
CREATE TRIGGER trg_instant_user_statistics
AFTER UPDATE OF payout ON player_bets
FOR EACH ROW
WHEN (NEW.payout IS NOT NULL AND (OLD.payout IS NULL OR OLD.payout != NEW.payout))
EXECUTE FUNCTION instant_update_user_statistics();

-- Step 5: Also handle INSERT (in case payout is set immediately)
DROP TRIGGER IF EXISTS trg_instant_user_statistics_insert ON player_bets;

CREATE TRIGGER trg_instant_user_statistics_insert
AFTER INSERT ON player_bets
FOR EACH ROW
WHEN (NEW.payout IS NOT NULL)
EXECUTE FUNCTION instant_update_user_statistics();

-- Step 6: Verify triggers are active
SELECT 
  '✅ TRIGGERS CREATED' as status,
  trigger_name, 
  event_manipulation as fires_on,
  event_object_table as table_name
FROM information_schema.triggers
WHERE trigger_name LIKE 'trg_instant_user_statistics%'
ORDER BY trigger_name;

-- Step 7: Show sample of user statistics
SELECT 
  id,
  phone,
  full_name,
  games_played,
  games_won,
  total_winnings,
  total_losses,
  CASE 
    WHEN games_played > 0 
    THEN ROUND((games_won::numeric / games_played::numeric) * 100, 2)
    ELSE 0 
  END as win_rate_percent
FROM users
WHERE games_played > 0
ORDER BY games_played DESC
LIMIT 10;

-- 📊 PERFORMANCE NOTES:
-- - Indexed queries for fast user lookups
-- - Atomic updates prevent race conditions
-- - Only updates when payout changes (not on every bet)
-- - Counts games_played only once per user per game
-- - Tracks winnings vs losses separately
-- - Error handling prevents blocking payouts

COMMENT ON TRIGGER trg_instant_user_statistics ON player_bets IS 
  '⚡ INSTANT: Updates user statistics when payout is set. Tracks games played, won, winnings, and losses.';

COMMENT ON TRIGGER trg_instant_user_statistics_insert ON player_bets IS 
  '⚡ INSTANT: Updates user statistics on bet insert if payout already set.';

-- 🎯 WHAT THIS DOES:
-- 1. Fires when payout is set on player_bets (game completion)
-- 2. Increments games_played (once per game per user)
-- 3. Increments games_won if user's payout > bet
-- 4. Adds to total_winnings (profits only)
-- 5. Adds to total_losses (losses only)
-- 6. Atomic updates prevent race conditions
-- 7. Never blocks payout processing

-- ✅ COMBINED WITH GAME STATISTICS TRIGGER:
-- Now you have COMPLETE automatic statistics tracking:
-- - Game statistics: Calculated instantly when game completes
-- - User statistics: Updated instantly when payouts are distributed
-- - All happens at DATABASE LEVEL (independent of application code)
