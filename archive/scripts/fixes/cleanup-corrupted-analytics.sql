-- =====================================================
-- ONE-TIME CLEANUP: Fix Corrupted Analytics Data
-- =====================================================
-- Run this ONCE to fix existing NULL values
-- After this, everything updates AUTOMATICALLY!
-- =====================================================

-- 1. Delete existing November 2025 record (corrupted or not)
DELETE FROM monthly_game_statistics WHERE month_year = '2025-11';

-- 2. Recreate November 2025 stats from daily data
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
)
SELECT 
  '2025-11',
  COALESCE(SUM(total_games), 0),
  COALESCE(SUM(total_bets), 0),
  COALESCE(SUM(total_payouts), 0),
  COALESCE(SUM(total_revenue), 0),
  COALESCE(SUM(profit_loss), 0),
  CASE 
    WHEN SUM(total_bets) > 0 
    THEN (SUM(profit_loss) / SUM(total_bets) * 100)
    ELSE 0 
  END,
  MAX(unique_players),
  NOW(),
  NOW()
FROM daily_game_statistics
WHERE date >= '2025-11-01' AND date < '2025-12-01'
HAVING SUM(total_games) > 0;  -- Only insert if there's data

-- 3. Delete existing 2025 yearly record (corrupted or not)
DELETE FROM yearly_game_statistics WHERE year = 2025;

-- 4. Recreate 2025 yearly stats from monthly data
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
)
SELECT 
  2025,
  COALESCE(SUM(total_games), 0),
  COALESCE(SUM(total_bets), 0),
  COALESCE(SUM(total_payouts), 0),
  COALESCE(SUM(total_revenue), 0),
  COALESCE(SUM(profit_loss), 0),
  CASE 
    WHEN SUM(total_bets) > 0 
    THEN (SUM(profit_loss) / SUM(total_bets) * 100)
    ELSE 0 
  END,
  MAX(unique_players),
  NOW(),
  NOW()
FROM monthly_game_statistics
WHERE month_year LIKE '2025-%'
HAVING SUM(total_games) > 0;  -- Only insert if there's data

-- Verify results
SELECT '✅ Monthly Stats (Nov 2025):' as check_type;
SELECT month_year, total_games, total_bets, total_payouts, profit_loss 
FROM monthly_game_statistics 
WHERE month_year = '2025-11';

SELECT '✅ Yearly Stats (2025):' as check_type;
SELECT year, total_games, total_bets, total_payouts, profit_loss 
FROM yearly_game_statistics 
WHERE year = 2025;

-- Done!
SELECT '🎉 Cleanup complete! All future games will update automatically!' as status;
