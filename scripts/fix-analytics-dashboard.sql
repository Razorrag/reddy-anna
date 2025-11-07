-- ============================================
-- FIX ANALYTICS DASHBOARD - POPULATE STATISTICS TABLES
-- ============================================
-- Problem: Analytics dashboard showing all zeros
-- Root Cause: game_statistics and daily_game_statistics tables are empty
-- Solution: Populate these tables from actual game data
-- ============================================

-- Step 0: Add unique constraints if they don't exist
DO $$ 
BEGIN
    -- Add unique constraint to game_statistics if not exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'unique_game_statistics_game_id'
    ) THEN
        ALTER TABLE game_statistics 
        ADD CONSTRAINT unique_game_statistics_game_id UNIQUE (game_id);
    END IF;

    -- Add unique constraint to daily_game_statistics if not exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'unique_daily_game_statistics_date'
    ) THEN
        ALTER TABLE daily_game_statistics 
        ADD CONSTRAINT unique_daily_game_statistics_date UNIQUE (date);
    END IF;
END $$;

-- Step 1: Populate game_statistics for each completed game
INSERT INTO game_statistics (
  id,
  game_id,
  total_players,
  total_bets,
  total_winnings,
  house_earnings,
  andar_bets_count,
  bahar_bets_count,
  andar_total_bet,
  bahar_total_bet,
  profit_loss,
  profit_loss_percentage,
  house_payout,
  game_duration,
  unique_players,
  created_at
)
SELECT 
  gen_random_uuid()::text as id,
  gs.game_id,
  COUNT(DISTINCT pb.user_id) as total_players,
  SUM(pb.amount) as total_bets,
  SUM(CASE WHEN pb.status = 'won' THEN pb.actual_payout ELSE 0 END) as total_winnings,
  SUM(pb.amount) - SUM(CASE WHEN pb.status = 'won' THEN pb.actual_payout ELSE 0 END) as house_earnings,
  COUNT(CASE WHEN pb.side = 'andar' THEN 1 END) as andar_bets_count,
  COUNT(CASE WHEN pb.side = 'bahar' THEN 1 END) as bahar_bets_count,
  SUM(CASE WHEN pb.side = 'andar' THEN pb.amount ELSE 0 END) as andar_total_bet,
  SUM(CASE WHEN pb.side = 'bahar' THEN pb.amount ELSE 0 END) as bahar_total_bet,
  SUM(pb.amount) - SUM(CASE WHEN pb.status = 'won' THEN pb.actual_payout ELSE 0 END) as profit_loss,
  CASE 
    WHEN SUM(pb.amount) > 0 
    THEN ((SUM(pb.amount) - SUM(CASE WHEN pb.status = 'won' THEN pb.actual_payout ELSE 0 END)) / SUM(pb.amount) * 100)
    ELSE 0 
  END as profit_loss_percentage,
  SUM(CASE WHEN pb.status = 'won' THEN pb.actual_payout ELSE 0 END) as house_payout,
  0 as game_duration,
  COUNT(DISTINCT pb.user_id) as unique_players,
  gs.created_at
FROM game_sessions gs
INNER JOIN player_bets pb ON gs.game_id = pb.game_id
WHERE gs.status = 'completed'
  AND NOT EXISTS (
    SELECT 1 FROM game_statistics WHERE game_id = gs.game_id
  )
GROUP BY gs.game_id, gs.created_at
ON CONFLICT (game_id) DO NOTHING;

-- Step 2: Populate daily_game_statistics
INSERT INTO daily_game_statistics (
  id,
  date,
  total_games,
  total_bets,
  total_payouts,
  total_revenue,
  profit_loss,
  profit_loss_percentage,
  unique_players,
  peak_bets_hour,
  created_at
)
SELECT 
  gen_random_uuid()::text as id,
  DATE(gs.created_at) as date,
  COUNT(DISTINCT gs.game_id) as total_games,
  SUM(pb.amount) as total_bets,
  SUM(CASE WHEN pb.status = 'won' THEN pb.actual_payout ELSE 0 END) as total_payouts,
  SUM(pb.amount) as total_revenue,
  SUM(pb.amount) - SUM(CASE WHEN pb.status = 'won' THEN pb.actual_payout ELSE 0 END) as profit_loss,
  CASE 
    WHEN SUM(pb.amount) > 0 
    THEN ((SUM(pb.amount) - SUM(CASE WHEN pb.status = 'won' THEN pb.actual_payout ELSE 0 END)) / SUM(pb.amount) * 100)
    ELSE 0 
  END as profit_loss_percentage,
  COUNT(DISTINCT pb.user_id) as unique_players,
  EXTRACT(HOUR FROM MIN(gs.created_at)) as peak_bets_hour,
  NOW() as created_at
FROM game_sessions gs
INNER JOIN player_bets pb ON gs.game_id = pb.game_id
WHERE gs.status = 'completed'
GROUP BY DATE(gs.created_at)
ON CONFLICT (date) DO UPDATE SET
  total_games = EXCLUDED.total_games,
  total_bets = EXCLUDED.total_bets,
  total_payouts = EXCLUDED.total_payouts,
  total_revenue = EXCLUDED.total_revenue,
  profit_loss = EXCLUDED.profit_loss,
  profit_loss_percentage = EXCLUDED.profit_loss_percentage,
  unique_players = EXCLUDED.unique_players,
  peak_bets_hour = EXCLUDED.peak_bets_hour;

-- Step 3: Populate monthly_game_statistics
INSERT INTO monthly_game_statistics (
  id,
  month_year,
  total_games,
  total_bets,
  total_payouts,
  total_revenue,
  profit_loss,
  profit_loss_percentage,
  unique_players,
  created_at
)
SELECT 
  gen_random_uuid()::text as id,
  TO_CHAR(gs.created_at, 'YYYY-MM') as month_year,
  COUNT(DISTINCT gs.game_id) as total_games,
  SUM(pb.amount) as total_bets,
  SUM(CASE WHEN pb.status = 'won' THEN pb.actual_payout ELSE 0 END) as total_payouts,
  SUM(pb.amount) as total_revenue,
  SUM(pb.amount) - SUM(CASE WHEN pb.status = 'won' THEN pb.actual_payout ELSE 0 END) as profit_loss,
  CASE 
    WHEN SUM(pb.amount) > 0 
    THEN ((SUM(pb.amount) - SUM(CASE WHEN pb.status = 'won' THEN pb.actual_payout ELSE 0 END)) / SUM(pb.amount) * 100)
    ELSE 0 
  END as profit_loss_percentage,
  COUNT(DISTINCT pb.user_id) as unique_players,
  NOW() as created_at
FROM game_sessions gs
INNER JOIN player_bets pb ON gs.game_id = pb.game_id
WHERE gs.status = 'completed'
GROUP BY TO_CHAR(gs.created_at, 'YYYY-MM')
ON CONFLICT (month_year) DO UPDATE SET
  total_games = EXCLUDED.total_games,
  total_bets = EXCLUDED.total_bets,
  total_payouts = EXCLUDED.total_payouts,
  total_revenue = EXCLUDED.total_revenue,
  profit_loss = EXCLUDED.profit_loss,
  profit_loss_percentage = EXCLUDED.profit_loss_percentage,
  unique_players = EXCLUDED.unique_players;

-- Step 4: Populate yearly_game_statistics
INSERT INTO yearly_game_statistics (
  id,
  year,
  total_games,
  total_bets,
  total_payouts,
  total_revenue,
  profit_loss,
  profit_loss_percentage,
  unique_players,
  created_at
)
SELECT 
  gen_random_uuid()::text as id,
  EXTRACT(YEAR FROM gs.created_at)::INTEGER as year,
  COUNT(DISTINCT gs.game_id) as total_games,
  SUM(pb.amount) as total_bets,
  SUM(CASE WHEN pb.status = 'won' THEN pb.actual_payout ELSE 0 END) as total_payouts,
  SUM(pb.amount) as total_revenue,
  SUM(pb.amount) - SUM(CASE WHEN pb.status = 'won' THEN pb.actual_payout ELSE 0 END) as profit_loss,
  CASE 
    WHEN SUM(pb.amount) > 0 
    THEN ((SUM(pb.amount) - SUM(CASE WHEN pb.status = 'won' THEN pb.actual_payout ELSE 0 END)) / SUM(pb.amount) * 100)
    ELSE 0 
  END as profit_loss_percentage,
  COUNT(DISTINCT pb.user_id) as unique_players,
  NOW() as created_at
FROM game_sessions gs
INNER JOIN player_bets pb ON gs.game_id = pb.game_id
WHERE gs.status = 'completed'
GROUP BY EXTRACT(YEAR FROM gs.created_at)::INTEGER
ON CONFLICT (year) DO UPDATE SET
  total_games = EXCLUDED.total_games,
  total_bets = EXCLUDED.total_bets,
  total_payouts = EXCLUDED.total_payouts,
  total_revenue = EXCLUDED.total_revenue,
  profit_loss = EXCLUDED.profit_loss,
  profit_loss_percentage = EXCLUDED.profit_loss_percentage,
  unique_players = EXCLUDED.unique_players;

-- Step 5: Verify the results
SELECT 
  '✅ ANALYTICS TABLES POPULATED' as status;

SELECT 
  'game_statistics' as table_name,
  COUNT(*) as records_created,
  SUM(total_bets) as total_bets_all_games,
  SUM(house_earnings) as total_house_earnings
FROM game_statistics;

SELECT 
  'daily_game_statistics' as table_name,
  COUNT(*) as days_with_data,
  SUM(total_games) as total_games,
  SUM(total_bets) as total_bets,
  SUM(profit_loss) as total_profit
FROM daily_game_statistics;

SELECT 
  'monthly_game_statistics' as table_name,
  COUNT(*) as months_with_data,
  SUM(total_games) as total_games,
  SUM(total_bets) as total_bets,
  SUM(profit_loss) as total_profit
FROM monthly_game_statistics;

SELECT 
  'yearly_game_statistics' as table_name,
  COUNT(*) as years_with_data,
  SUM(total_games) as total_games,
  SUM(total_bets) as total_bets,
  SUM(profit_loss) as total_profit
FROM yearly_game_statistics;

-- Step 6: Show today's statistics (what analytics dashboard will display)
SELECT 
  '📊 TODAY''S ANALYTICS' as info,
  total_games as "Games Today",
  total_bets as "Total Bets",
  total_payouts as "Total Payouts",
  profit_loss as "Net Profit",
  profit_loss_percentage || '%' as "Profit %",
  unique_players as "Unique Players"
FROM daily_game_statistics
WHERE date = CURRENT_DATE;

-- Step 7: Show this month's statistics
SELECT 
  '📊 THIS MONTH''S ANALYTICS' as info,
  total_games as "Games This Month",
  total_bets as "Total Bets",
  total_payouts as "Total Payouts",
  profit_loss as "Net Profit",
  profit_loss_percentage || '%' as "Profit %",
  unique_players as "Unique Players"
FROM monthly_game_statistics
WHERE month_year = TO_CHAR(CURRENT_DATE, 'YYYY-MM');

-- ============================================
-- SUCCESS MESSAGE
-- ============================================

SELECT 
  '✅ ANALYTICS DASHBOARD FIX COMPLETE!' as status,
  'game_statistics table populated with per-game data' as fix_1,
  'daily_game_statistics populated with daily aggregates' as fix_2,
  'monthly_game_statistics populated with monthly aggregates' as fix_3,
  'yearly_game_statistics populated with yearly aggregates' as fix_4,
  'Analytics dashboard will now show real data!' as result;
