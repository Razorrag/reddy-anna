-- ============================================================================
-- AUTO-UPDATE TRIGGERS FOR PLAYER STATS AND ANALYTICS
-- ============================================================================
-- This script creates comprehensive auto-update triggers for:
-- 1. Player stats (total_winnings, total_losses, games_played, games_won)
-- 2. Daily analytics (daily_game_statistics)
-- 3. Monthly analytics (monthly_game_statistics)
-- 4. Yearly analytics (yearly_game_statistics)
-- ============================================================================

-- ============================================================================
-- PART 1: AUTO-UPDATE PLAYER STATS
-- ============================================================================

-- Drop existing trigger and function if they exist
DROP TRIGGER IF EXISTS trigger_update_player_stats_on_bet_complete ON player_bets;
DROP FUNCTION IF EXISTS update_player_stats_on_bet_complete();

-- Function to auto-update player stats when bet completes
CREATE OR REPLACE FUNCTION update_player_stats_on_bet_complete()
RETURNS TRIGGER AS $$
DECLARE
  v_user RECORD;
  v_new_winnings NUMERIC;
  v_new_losses NUMERIC;
  v_games_played INT;
  v_games_won INT;
  v_game_already_counted BOOLEAN;
BEGIN
  -- Only process if status changed to 'won' or 'lost' or 'completed'
  IF NEW.status IN ('won', 'lost', 'completed') AND 
     (OLD.status IS NULL OR OLD.status = 'pending') THEN
    
    -- Get current user stats
    SELECT 
      total_winnings, 
      total_losses, 
      games_played, 
      games_won
    INTO v_user
    FROM users
    WHERE id = NEW.user_id;
    
    -- Check if this game was already counted for games_played
    SELECT EXISTS(
      SELECT 1 FROM player_bets 
      WHERE user_id = NEW.user_id 
        AND game_id = NEW.game_id 
        AND id != NEW.id 
        AND status IN ('won', 'lost', 'completed')
    ) INTO v_game_already_counted;
    
    -- Calculate new stats based on GROSS amounts
    v_new_winnings := COALESCE(v_user.total_winnings, 0);
    v_new_losses := COALESCE(v_user.total_losses, 0);
    v_games_played := COALESCE(v_user.games_played, 0);
    v_games_won := COALESCE(v_user.games_won, 0);
    
    -- Update games_played only if this is the first bet from this game
    IF NOT v_game_already_counted THEN
      v_games_played := v_games_played + 1;
    END IF;
    
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
    
    -- Update user stats
    UPDATE users
    SET 
      total_winnings = v_new_winnings,
      total_losses = v_new_losses,
      games_played = v_games_played,
      games_won = v_games_won,
      updated_at = NOW()
    WHERE id = NEW.user_id;
    
    RAISE NOTICE 'Updated player stats for user %: games_played=%, games_won=%, winnings=%, losses=%', 
      NEW.user_id, v_games_played, v_games_won, v_new_winnings, v_new_losses;
    
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER trigger_update_player_stats_on_bet_complete
  AFTER UPDATE ON player_bets
  FOR EACH ROW
  EXECUTE FUNCTION update_player_stats_on_bet_complete();

COMMENT ON TRIGGER trigger_update_player_stats_on_bet_complete ON player_bets 
IS 'Auto-updates player total_winnings, total_losses, games_played, games_won when bet completes';

-- ============================================================================
-- PART 2: AUTO-UPDATE DAILY ANALYTICS
-- ============================================================================

-- Drop existing trigger and function if they exist
DROP TRIGGER IF EXISTS trigger_update_daily_analytics_on_game_complete ON game_statistics;
DROP FUNCTION IF EXISTS update_daily_analytics_on_game_complete();

-- Function to auto-update daily analytics when game completes
CREATE OR REPLACE FUNCTION update_daily_analytics_on_game_complete()
RETURNS TRIGGER AS $$
DECLARE
  v_stat_date DATE;
  v_existing RECORD;
  v_new_total_bets NUMERIC;
  v_new_total_payouts NUMERIC;
  v_new_profit_loss NUMERIC;
  v_new_profit_percentage NUMERIC;
BEGIN
  -- Get the date for this game
  v_stat_date := DATE(NEW.created_at);
  
  -- Check if daily stat record exists
  SELECT 
    total_games,
    total_bets,
    total_payouts,
    profit_loss,
    unique_players
  INTO v_existing
  FROM daily_game_statistics
  WHERE date = v_stat_date;
  
  IF FOUND THEN
    -- Update existing record
    v_new_total_bets := v_existing.total_bets + COALESCE(NEW.total_bets, 0);
    v_new_total_payouts := v_existing.total_payouts + COALESCE(NEW.house_payout, 0);
    v_new_profit_loss := v_existing.profit_loss + COALESCE(NEW.profit_loss, 0);
    
    -- Calculate profit percentage
    IF v_new_total_bets > 0 THEN
      v_new_profit_percentage := (v_new_profit_loss / v_new_total_bets) * 100;
    ELSE
      v_new_profit_percentage := 0;
    END IF;
    
    UPDATE daily_game_statistics
    SET
      total_games = total_games + 1,
      total_bets = v_new_total_bets,
      total_payouts = v_new_total_payouts,
      total_revenue = v_new_total_bets,
      profit_loss = v_new_profit_loss,
      profit_loss_percentage = v_new_profit_percentage,
      unique_players = unique_players + COALESCE(NEW.unique_players, 0),
      updated_at = NOW()
    WHERE date = v_stat_date;
    
    RAISE NOTICE 'Updated daily analytics for %: games=%, bets=%, profit=%', 
      v_stat_date, v_existing.total_games + 1, v_new_total_bets, v_new_profit_loss;
  ELSE
    -- Create new record
    v_new_profit_percentage := CASE 
      WHEN NEW.total_bets > 0 THEN (NEW.profit_loss / NEW.total_bets) * 100
      ELSE 0
    END;
    
    INSERT INTO daily_game_statistics (
      date,
      total_games,
      total_bets,
      total_payouts,
      total_revenue,
      profit_loss,
      profit_loss_percentage,
      unique_players,
      created_at,
      updated_at
    ) VALUES (
      v_stat_date,
      1,
      COALESCE(NEW.total_bets, 0),
      COALESCE(NEW.house_payout, 0),
      COALESCE(NEW.total_bets, 0),
      COALESCE(NEW.profit_loss, 0),
      v_new_profit_percentage,
      COALESCE(NEW.unique_players, 0),
      NOW(),
      NOW()
    );
    
    RAISE NOTICE 'Created daily analytics for %: bets=%, profit=%', 
      v_stat_date, NEW.total_bets, NEW.profit_loss;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER trigger_update_daily_analytics_on_game_complete
  AFTER INSERT ON game_statistics
  FOR EACH ROW
  EXECUTE FUNCTION update_daily_analytics_on_game_complete();

COMMENT ON TRIGGER trigger_update_daily_analytics_on_game_complete ON game_statistics 
IS 'Auto-updates daily_game_statistics when a game completes';

-- ============================================================================
-- PART 3: AUTO-UPDATE MONTHLY ANALYTICS
-- ============================================================================

-- Drop existing trigger and function if they exist
DROP TRIGGER IF EXISTS trigger_update_monthly_analytics_on_daily_update ON daily_game_statistics;
DROP FUNCTION IF EXISTS update_monthly_analytics_on_daily_update();

-- Function to auto-update monthly analytics when daily stats change
CREATE OR REPLACE FUNCTION update_monthly_analytics_on_daily_update()
RETURNS TRIGGER AS $$
DECLARE
  v_month_year TEXT;
  v_existing RECORD;
  v_daily_totals RECORD;
  v_new_profit_percentage NUMERIC;
BEGIN
  -- Get month-year for this daily stat
  v_month_year := TO_CHAR(NEW.date, 'YYYY-MM');
  
  -- Calculate totals for this month from all daily records
  SELECT 
    SUM(total_games) as total_games,
    SUM(total_bets) as total_bets,
    SUM(total_payouts) as total_payouts,
    SUM(total_revenue) as total_revenue,
    SUM(profit_loss) as profit_loss,
    SUM(unique_players) as unique_players
  INTO v_daily_totals
  FROM daily_game_statistics
  WHERE TO_CHAR(date, 'YYYY-MM') = v_month_year;
  
  -- Calculate profit percentage
  IF v_daily_totals.total_bets > 0 THEN
    v_new_profit_percentage := (v_daily_totals.profit_loss / v_daily_totals.total_bets) * 100;
  ELSE
    v_new_profit_percentage := 0;
  END IF;
  
  -- Check if monthly record exists
  SELECT month_year INTO v_existing
  FROM monthly_game_statistics
  WHERE month_year = v_month_year;
  
  IF FOUND THEN
    -- Update existing record
    UPDATE monthly_game_statistics
    SET
      total_games = v_daily_totals.total_games,
      total_bets = v_daily_totals.total_bets,
      total_payouts = v_daily_totals.total_payouts,
      total_revenue = v_daily_totals.total_revenue,
      profit_loss = v_daily_totals.profit_loss,
      profit_loss_percentage = v_new_profit_percentage,
      unique_players = v_daily_totals.unique_players,
      updated_at = NOW()
    WHERE month_year = v_month_year;
    
    RAISE NOTICE 'Updated monthly analytics for %: games=%, profit=%', 
      v_month_year, v_daily_totals.total_games, v_daily_totals.profit_loss;
  ELSE
    -- Create new record
    INSERT INTO monthly_game_statistics (
      month_year,
      total_games,
      total_bets,
      total_payouts,
      total_revenue,
      profit_loss,
      profit_loss_percentage,
      unique_players,
      created_at,
      updated_at
    ) VALUES (
      v_month_year,
      v_daily_totals.total_games,
      v_daily_totals.total_bets,
      v_daily_totals.total_payouts,
      v_daily_totals.total_revenue,
      v_daily_totals.profit_loss,
      v_new_profit_percentage,
      v_daily_totals.unique_players,
      NOW(),
      NOW()
    );
    
    RAISE NOTICE 'Created monthly analytics for %: games=%, profit=%', 
      v_month_year, v_daily_totals.total_games, v_daily_totals.profit_loss;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER trigger_update_monthly_analytics_on_daily_update
  AFTER INSERT OR UPDATE ON daily_game_statistics
  FOR EACH ROW
  EXECUTE FUNCTION update_monthly_analytics_on_daily_update();

COMMENT ON TRIGGER trigger_update_monthly_analytics_on_daily_update ON daily_game_statistics 
IS 'Auto-updates monthly_game_statistics when daily stats change';

-- ============================================================================
-- PART 4: AUTO-UPDATE YEARLY ANALYTICS
-- ============================================================================

-- Drop existing trigger and function if they exist
DROP TRIGGER IF EXISTS trigger_update_yearly_analytics_on_monthly_update ON monthly_game_statistics;
DROP FUNCTION IF EXISTS update_yearly_analytics_on_monthly_update();

-- Function to auto-update yearly analytics when monthly stats change
CREATE OR REPLACE FUNCTION update_yearly_analytics_on_monthly_update()
RETURNS TRIGGER AS $$
DECLARE
  v_year INT;
  v_existing RECORD;
  v_monthly_totals RECORD;
  v_new_profit_percentage NUMERIC;
BEGIN
  -- Get year for this monthly stat
  v_year := CAST(SUBSTRING(NEW.month_year FROM 1 FOR 4) AS INT);
  
  -- Calculate totals for this year from all monthly records
  SELECT 
    SUM(total_games) as total_games,
    SUM(total_bets) as total_bets,
    SUM(total_payouts) as total_payouts,
    SUM(total_revenue) as total_revenue,
    SUM(profit_loss) as profit_loss,
    SUM(unique_players) as unique_players
  INTO v_monthly_totals
  FROM monthly_game_statistics
  WHERE SUBSTRING(month_year FROM 1 FOR 4) = v_year::TEXT;
  
  -- Calculate profit percentage
  IF v_monthly_totals.total_bets > 0 THEN
    v_new_profit_percentage := (v_monthly_totals.profit_loss / v_monthly_totals.total_bets) * 100;
  ELSE
    v_new_profit_percentage := 0;
  END IF;
  
  -- Check if yearly record exists
  SELECT year INTO v_existing
  FROM yearly_game_statistics
  WHERE year = v_year;
  
  IF FOUND THEN
    -- Update existing record
    UPDATE yearly_game_statistics
    SET
      total_games = v_monthly_totals.total_games,
      total_bets = v_monthly_totals.total_bets,
      total_payouts = v_monthly_totals.total_payouts,
      total_revenue = v_monthly_totals.total_revenue,
      profit_loss = v_monthly_totals.profit_loss,
      profit_loss_percentage = v_new_profit_percentage,
      unique_players = v_monthly_totals.unique_players,
      updated_at = NOW()
    WHERE year = v_year;
    
    RAISE NOTICE 'Updated yearly analytics for %: games=%, profit=%', 
      v_year, v_monthly_totals.total_games, v_monthly_totals.profit_loss;
  ELSE
    -- Create new record
    INSERT INTO yearly_game_statistics (
      year,
      total_games,
      total_bets,
      total_payouts,
      total_revenue,
      profit_loss,
      profit_loss_percentage,
      unique_players,
      created_at,
      updated_at
    ) VALUES (
      v_year,
      v_monthly_totals.total_games,
      v_monthly_totals.total_bets,
      v_monthly_totals.total_payouts,
      v_monthly_totals.total_revenue,
      v_monthly_totals.profit_loss,
      v_new_profit_percentage,
      v_monthly_totals.unique_players,
      NOW(),
      NOW()
    );
    
    RAISE NOTICE 'Created yearly analytics for %: games=%, profit=%', 
      v_year, v_monthly_totals.total_games, v_monthly_totals.profit_loss;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER trigger_update_yearly_analytics_on_monthly_update
  AFTER INSERT OR UPDATE ON monthly_game_statistics
  FOR EACH ROW
  EXECUTE FUNCTION update_yearly_analytics_on_monthly_update();

COMMENT ON TRIGGER trigger_update_yearly_analytics_on_monthly_update ON monthly_game_statistics 
IS 'Auto-updates yearly_game_statistics when monthly stats change';

-- ============================================================================
-- PART 5: VERIFICATION QUERIES
-- ============================================================================

-- Check all triggers are created
SELECT 
  tgname as trigger_name,
  tgrelid::regclass as table_name,
  tgenabled as enabled
FROM pg_trigger
WHERE tgname LIKE 'trigger_%analytics%' OR tgname LIKE 'trigger_%player_stats%'
ORDER BY tgname;

-- Check all trigger functions are created
SELECT 
  proname as function_name,
  pg_get_function_arguments(oid) as arguments
FROM pg_proc
WHERE proname LIKE '%analytics%' OR proname LIKE '%player_stats%'
ORDER BY proname;

-- ============================================================================
-- PART 6: TEST THE TRIGGERS
-- ============================================================================

-- Test 1: Simulate a bet completion (will auto-update player stats)
-- UPDATE player_bets 
-- SET status = 'won', actual_payout = 1000 
-- WHERE id = 'some-bet-id' AND status = 'pending';

-- Test 2: Insert a game statistic (will auto-update daily analytics)
-- INSERT INTO game_statistics (game_id, total_bets, house_payout, profit_loss, unique_players)
-- VALUES ('test-game-123', 5000, 2000, 3000, 5);

-- Test 3: Check if daily stats were updated (will auto-update monthly analytics)
-- SELECT * FROM daily_game_statistics WHERE date = CURRENT_DATE;

-- Test 4: Check if monthly stats were updated (will auto-update yearly analytics)
-- SELECT * FROM monthly_game_statistics WHERE month_year = TO_CHAR(CURRENT_DATE, 'YYYY-MM');

-- Test 5: Check if yearly stats were updated
-- SELECT * FROM yearly_game_statistics WHERE year = EXTRACT(YEAR FROM CURRENT_DATE);

-- ============================================================================
-- EXECUTION SUMMARY
-- ============================================================================
-- 
-- This script creates 4 auto-update triggers:
-- 
-- 1. ✅ trigger_update_player_stats_on_bet_complete
--    - Fires when: player_bets status changes to won/lost/completed
--    - Updates: users.total_winnings, total_losses, games_played, games_won
--    - Uses: GROSS amounts (not NET)
-- 
-- 2. ✅ trigger_update_daily_analytics_on_game_complete
--    - Fires when: game_statistics record inserted (game completes)
--    - Updates: daily_game_statistics for that day
--    - Calculates: profit_loss_percentage automatically
-- 
-- 3. ✅ trigger_update_monthly_analytics_on_daily_update
--    - Fires when: daily_game_statistics record inserted/updated
--    - Updates: monthly_game_statistics for that month
--    - Aggregates: all daily stats for the month
-- 
-- 4. ✅ trigger_update_yearly_analytics_on_monthly_update
--    - Fires when: monthly_game_statistics record inserted/updated
--    - Updates: yearly_game_statistics for that year
--    - Aggregates: all monthly stats for the year
-- 
-- CASCADE EFFECT:
-- Game completes → Daily stats updated → Monthly stats updated → Yearly stats updated
-- 
-- ALL ANALYTICS NOW AUTO-UPDATE IN REAL-TIME! 🎉
-- 
-- ============================================================================
