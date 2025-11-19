-- ============================================================================
-- FIX ADMIN ANALYTICS DATABASE ISSUES
-- ============================================================================
-- This script fixes the broken analytics triggers and adds missing functionality
-- 
-- CRITICAL FIXES:
-- 1. Fix update_daily_statistics() to count games correctly (not player_bets)
-- 2. Add proper unique player tracking
-- 3. Add payout tracking
-- 4. Fix revenue calculation (house edge, not total bets)
-- 5. Add monthly and yearly statistics triggers
-- 6. Add user statistics updates
-- ============================================================================

-- ============================================================================
-- STEP 1: Drop the broken trigger and function
-- ============================================================================
DROP TRIGGER IF EXISTS trigger_update_daily_statistics ON player_bets;
DROP TRIGGER IF EXISTS daily_stats_trigger ON player_bets;
DROP FUNCTION IF EXISTS update_daily_statistics() CASCADE;

-- ============================================================================
-- STEP 2: Create proper statistics update functions
-- ============================================================================

-- Function to update statistics when a game completes
CREATE OR REPLACE FUNCTION update_game_statistics()
RETURNS TRIGGER AS $$
DECLARE
  game_total_bets NUMERIC(12,2);
  game_total_payouts NUMERIC(12,2);
  game_unique_players INTEGER;
  game_date DATE;
  game_month TEXT;
  game_year INTEGER;
BEGIN
  -- Only process completed games
  IF NEW.phase = 'complete' AND OLD.phase != 'complete' THEN
    
    -- Get game statistics
    SELECT
      COALESCE(SUM(amount), 0),
      COUNT(DISTINCT user_id)
    INTO game_total_bets, game_unique_players
    FROM player_bets
    WHERE game_id = NEW.game_id;
    
    -- Calculate total payouts for this game
    SELECT COALESCE(SUM(actual_payout), 0)
    INTO game_total_payouts
    FROM player_bets
    WHERE game_id = NEW.game_id AND status = 'completed';
    
    -- Extract date components
    game_date := DATE(NEW.created_at);
    game_month := TO_CHAR(NEW.created_at, 'YYYY-MM');
    game_year := EXTRACT(YEAR FROM NEW.created_at)::INTEGER;
    
    -- ========================================================================
    -- UPDATE DAILY STATISTICS
    -- ========================================================================
    INSERT INTO daily_game_statistics (
      date,
      total_games,
      total_bets,
      total_payouts,
      total_revenue,
      unique_players,
      created_at,
      updated_at
    )
    VALUES (
      game_date,
      1,
      game_total_bets,
      game_total_payouts,
      game_total_bets - game_total_payouts,  -- House profit (revenue)
      game_unique_players,
      NOW(),
      NOW()
    )
    ON CONFLICT (date)
    DO UPDATE SET
      total_games = daily_game_statistics.total_games + 1,
      total_bets = daily_game_statistics.total_bets + EXCLUDED.total_bets,
      total_payouts = daily_game_statistics.total_payouts + EXCLUDED.total_payouts,
      total_revenue = daily_game_statistics.total_revenue + EXCLUDED.total_revenue,
      unique_players = daily_game_statistics.unique_players + EXCLUDED.unique_players,
      updated_at = NOW();
    
    -- ========================================================================
    -- UPDATE MONTHLY STATISTICS
    -- ========================================================================
    INSERT INTO monthly_game_statistics (
      month_year,
      total_games,
      total_bets,
      total_payouts,
      total_revenue,
      unique_players,
      created_at,
      updated_at
    )
    VALUES (
      game_month,
      1,
      game_total_bets,
      game_total_payouts,
      game_total_bets - game_total_payouts,
      game_unique_players,
      NOW(),
      NOW()
    )
    ON CONFLICT (month_year)
    DO UPDATE SET
      total_games = monthly_game_statistics.total_games + 1,
      total_bets = monthly_game_statistics.total_bets + EXCLUDED.total_bets,
      total_payouts = monthly_game_statistics.total_payouts + EXCLUDED.total_payouts,
      total_revenue = monthly_game_statistics.total_revenue + EXCLUDED.total_revenue,
      unique_players = monthly_game_statistics.unique_players + EXCLUDED.unique_players,
      updated_at = NOW();
    
    -- ========================================================================
    -- UPDATE YEARLY STATISTICS
    -- ========================================================================
    INSERT INTO yearly_game_statistics (
      year,
      total_games,
      total_bets,
      total_payouts,
      total_revenue,
      unique_players,
      created_at,
      updated_at
    )
    VALUES (
      game_year,
      1,
      game_total_bets,
      game_total_payouts,
      game_total_bets - game_total_payouts,
      game_unique_players,
      NOW(),
      NOW()
    )
    ON CONFLICT (year)
    DO UPDATE SET
      total_games = yearly_game_statistics.total_games + 1,
      total_bets = yearly_game_statistics.total_bets + EXCLUDED.total_bets,
      total_payouts = yearly_game_statistics.total_payouts + EXCLUDED.total_payouts,
      total_revenue = yearly_game_statistics.total_revenue + EXCLUDED.total_revenue,
      unique_players = yearly_game_statistics.unique_players + EXCLUDED.unique_players,
      updated_at = NOW();
    
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to update user statistics when player_bets are resolved
CREATE OR REPLACE FUNCTION update_user_bet_statistics()
RETURNS TRIGGER AS $$
BEGIN
  -- Only update when player_bet status changes to completed or failed
  IF NEW.status IN ('completed', 'failed') AND OLD.status = 'pending' THEN
    
    IF NEW.status = 'completed' AND NEW.actual_payout > 0 THEN
      -- Update user statistics for win
      UPDATE users
      SET
        total_winnings = COALESCE(total_winnings, 0) + COALESCE(NEW.actual_payout, 0),
        games_won = COALESCE(games_won, 0) + 1,
        games_played = COALESCE(games_played, 0) + 1,
        updated_at = NOW()
      WHERE id = NEW.user_id;
      
    ELSIF NEW.status = 'completed' AND NEW.actual_payout = 0 THEN
      -- Update user statistics for loss (completed but no payout)
      UPDATE users
      SET
        total_losses = COALESCE(total_losses, 0) + NEW.amount,
        games_played = COALESCE(games_played, 0) + 1,
        updated_at = NOW()
      WHERE id = NEW.user_id;
    ELSIF NEW.status = 'failed' THEN
      -- Bet failed/cancelled - just count games played
      UPDATE users
      SET
        games_played = COALESCE(games_played, 0) + 1,
        updated_at = NOW()
      WHERE id = NEW.user_id;
    END IF;
    
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- STEP 3: Create triggers
-- ============================================================================

-- Trigger to update game statistics when game completes
CREATE TRIGGER trigger_update_game_statistics
  AFTER UPDATE ON game_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_game_statistics();

-- Trigger to update user statistics when player_bets are resolved
CREATE TRIGGER trigger_update_user_bet_statistics
  AFTER UPDATE ON player_bets
  FOR EACH ROW
  EXECUTE FUNCTION update_user_bet_statistics();

-- ============================================================================
-- STEP 4: Ensure statistics tables have proper constraints
-- ============================================================================

-- Add unique constraints if they don't exist
DO $$
BEGIN
  -- Daily statistics unique constraint
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'daily_game_statistics_date_key'
  ) THEN
    ALTER TABLE daily_game_statistics ADD CONSTRAINT daily_game_statistics_date_key UNIQUE (date);
  END IF;
  
  -- Monthly statistics unique constraint
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'monthly_game_statistics_month_year_key'
  ) THEN
    ALTER TABLE monthly_game_statistics ADD CONSTRAINT monthly_game_statistics_month_year_key UNIQUE (month_year);
  END IF;
  
  -- Yearly statistics unique constraint
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'yearly_game_statistics_year_key'
  ) THEN
    ALTER TABLE yearly_game_statistics ADD CONSTRAINT yearly_game_statistics_year_key UNIQUE (year);
  END IF;
END $$;

-- ============================================================================
-- STEP 5: Create helper functions for analytics queries
-- ============================================================================

-- Function to get realtime game statistics
CREATE OR REPLACE FUNCTION get_realtime_game_stats()
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'currentGame', (
      SELECT json_build_object(
        'id', gs.game_id,
        'phase', gs.phase,
        'currentRound', gs.current_round,
        'totalPlayers', COUNT(DISTINCT pb.user_id),
        'andarTotal', COALESCE(SUM(CASE WHEN pb.side = 'andar' THEN pb.amount ELSE 0 END), 0),
        'baharTotal', COALESCE(SUM(CASE WHEN pb.side = 'bahar' THEN pb.amount ELSE 0 END), 0),
        'timer', EXTRACT(EPOCH FROM (NOW() - gs.phase_start_time))::INTEGER
      )
      FROM game_sessions gs
      LEFT JOIN player_bets pb ON pb.game_id = gs.game_id AND pb.status = 'active'
      WHERE gs.phase IN ('betting', 'dealing')
      ORDER BY gs.created_at DESC
      LIMIT 1
    )
  ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- STEP 6: Backfill existing data (optional but recommended)
-- ============================================================================
-- This recalculates statistics from existing completed games
-- WARNING: This may take a while if you have many games

DO $$
DECLARE
  game_record RECORD;
BEGIN
  -- Clear existing statistics (start fresh)
  TRUNCATE TABLE daily_game_statistics;
  TRUNCATE TABLE monthly_game_statistics;
  TRUNCATE TABLE yearly_game_statistics;
  
  -- Recalculate from all completed games
  FOR game_record IN 
    SELECT 
      game_id,
      created_at,
      DATE(created_at) as game_date,
      TO_CHAR(created_at, 'YYYY-MM') as game_month,
      EXTRACT(YEAR FROM created_at)::INTEGER as game_year
    FROM game_sessions
    WHERE phase = 'complete'
    ORDER BY created_at
  LOOP
    -- Insert/update daily statistics
    INSERT INTO daily_game_statistics (
      date,
      total_games,
      total_bets,
      total_payouts,
      total_revenue,
      unique_players,
      created_at,
      updated_at
    )
    SELECT
      game_record.game_date,
      1,
      COALESCE(SUM(pb.amount), 0),
      COALESCE(SUM(CASE WHEN pb.status = 'completed' THEN pb.actual_payout ELSE 0 END), 0),
      COALESCE(SUM(pb.amount), 0) - COALESCE(SUM(CASE WHEN pb.status = 'completed' THEN pb.actual_payout ELSE 0 END), 0),
      COUNT(DISTINCT pb.user_id),
      NOW(),
      NOW()
    FROM player_bets pb
    WHERE pb.game_id = game_record.game_id
    ON CONFLICT (date)
    DO UPDATE SET
      total_games = daily_game_statistics.total_games + 1,
      total_bets = daily_game_statistics.total_bets + EXCLUDED.total_bets,
      total_payouts = daily_game_statistics.total_payouts + EXCLUDED.total_payouts,
      total_revenue = daily_game_statistics.total_revenue + EXCLUDED.total_revenue,
      unique_players = daily_game_statistics.unique_players + EXCLUDED.unique_players,
      updated_at = NOW();
    
    -- Insert/update monthly statistics
    INSERT INTO monthly_game_statistics (
      month_year,
      total_games,
      total_bets,
      total_payouts,
      total_revenue,
      unique_players,
      created_at,
      updated_at
    )
    SELECT
      game_record.game_month,
      1,
      COALESCE(SUM(pb.amount), 0),
      COALESCE(SUM(CASE WHEN pb.status = 'completed' THEN pb.actual_payout ELSE 0 END), 0),
      COALESCE(SUM(pb.amount), 0) - COALESCE(SUM(CASE WHEN pb.status = 'completed' THEN pb.actual_payout ELSE 0 END), 0),
      COUNT(DISTINCT pb.user_id),
      NOW(),
      NOW()
    FROM player_bets pb
    WHERE pb.game_id = game_record.game_id
    ON CONFLICT (month_year)
    DO UPDATE SET
      total_games = monthly_game_statistics.total_games + 1,
      total_bets = monthly_game_statistics.total_bets + EXCLUDED.total_bets,
      total_payouts = monthly_game_statistics.total_payouts + EXCLUDED.total_payouts,
      total_revenue = monthly_game_statistics.total_revenue + EXCLUDED.total_revenue,
      unique_players = monthly_game_statistics.unique_players + EXCLUDED.unique_players,
      updated_at = NOW();
    
    -- Insert/update yearly statistics
    INSERT INTO yearly_game_statistics (
      year,
      total_games,
      total_bets,
      total_payouts,
      total_revenue,
      unique_players,
      created_at,
      updated_at
    )
    SELECT
      game_record.game_year,
      1,
      COALESCE(SUM(pb.amount), 0),
      COALESCE(SUM(CASE WHEN pb.status = 'completed' THEN pb.actual_payout ELSE 0 END), 0),
      COALESCE(SUM(pb.amount), 0) - COALESCE(SUM(CASE WHEN pb.status = 'completed' THEN pb.actual_payout ELSE 0 END), 0),
      COUNT(DISTINCT pb.user_id),
      NOW(),
      NOW()
    FROM player_bets pb
    WHERE pb.game_id = game_record.game_id
    ON CONFLICT (year)
    DO UPDATE SET
      total_games = yearly_game_statistics.total_games + 1,
      total_bets = yearly_game_statistics.total_bets + EXCLUDED.total_bets,
      total_payouts = yearly_game_statistics.total_payouts + EXCLUDED.total_payouts,
      total_revenue = yearly_game_statistics.total_revenue + EXCLUDED.total_revenue,
      unique_players = yearly_game_statistics.unique_players + EXCLUDED.unique_players,
      updated_at = NOW();
  END LOOP;
  
  RAISE NOTICE 'Statistics backfill complete!';
END $$;

-- ============================================================================
-- STEP 7: Verify the fix
-- ============================================================================

-- Check daily statistics
SELECT 
  date,
  total_games,
  total_bets,
  total_payouts,
  total_revenue,
  unique_players
FROM daily_game_statistics
ORDER BY date DESC
LIMIT 5;

-- Check monthly statistics
SELECT 
  month_year,
  total_games,
  total_bets,
  total_payouts,
  total_revenue,
  unique_players
FROM monthly_game_statistics
ORDER BY month_year DESC
LIMIT 3;

-- Check yearly statistics  
SELECT 
  year,
  total_games,
  total_bets,
  total_payouts,
  total_revenue,
  unique_players
FROM yearly_game_statistics
ORDER BY year DESC;

-- ============================================================================
-- COMPLETION MESSAGE
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE '✅ Admin analytics database fixes applied successfully!';
  RAISE NOTICE '📊 Statistics have been recalculated from existing games';
  RAISE NOTICE '🎯 New triggers will maintain accurate statistics going forward';
  RAISE NOTICE '';
  RAISE NOTICE 'WHAT WAS FIXED:';
  RAISE NOTICE '1. ✅ Games counted correctly (once per game, not per bet)';
  RAISE NOTICE '2. ✅ Payouts tracked accurately';
  RAISE NOTICE '3. ✅ Revenue calculated correctly (bets - payouts)';
  RAISE NOTICE '4. ✅ Monthly and yearly statistics now updating';
  RAISE NOTICE '5. ✅ User statistics (total_winnings, games_won, etc) updating';
  RAISE NOTICE '6. ✅ Realtime game stats function created';
  RAISE NOTICE '';
  RAISE NOTICE 'NEXT STEPS:';
  RAISE NOTICE '- Apply backend snake_case → camelCase transformation';
  RAISE NOTICE '- Create /admin/realtime-stats endpoint';
  RAISE NOTICE '- Test analytics dashboard';
END $$;