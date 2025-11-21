-- SQL Script to Check Database for Client-Reported Issues
-- Run this in Supabase SQL Editor

-- ========================================
-- ISSUE #1: User Statistics
-- ========================================
SELECT 
  '=== USER STATISTICS CHECK ===' as check_name;

SELECT 
  COUNT(*) as total_users,
  COUNT(CASE WHEN games_played > 0 THEN 1 END) as users_with_games,
  COUNT(CASE WHEN games_played = 0 THEN 1 END) as users_without_games,
  SUM(games_played) as total_games_played,
  SUM(games_won) as total_games_won
FROM users 
WHERE role = 'player';

-- Top 10 users by games played
SELECT 
  full_name,
  phone,
  games_played,
  games_won,
  total_winnings,
  total_losses,
  balance,
  created_at
FROM users 
WHERE role = 'player'
ORDER BY games_played DESC
LIMIT 10;

-- ========================================
-- ISSUE #2: Financial Overview
-- ========================================
SELECT 
  '=== FINANCIAL OVERVIEW CHECK ===' as check_name;

SELECT 
  SUM(CAST(total_winnings AS DECIMAL)) as total_winnings_all_users,
  SUM(CAST(total_losses AS DECIMAL)) as total_losses_all_users,
  SUM(CAST(total_losses AS DECIMAL)) - SUM(CAST(total_winnings AS DECIMAL)) as net_house_profit,
  SUM(CAST(balance AS DECIMAL)) as total_user_balance
FROM users 
WHERE role = 'player';

-- ========================================
-- ISSUE #3: Game History Payouts
-- ========================================
SELECT 
  '=== GAME HISTORY CHECK ===' as check_name;

-- Check if game_history table exists and has data
SELECT 
  COUNT(*) as total_games,
  COUNT(CASE WHEN winner IS NOT NULL THEN 1 END) as games_with_winner,
  COUNT(CASE WHEN house_payout IS NOT NULL THEN 1 END) as games_with_payout,
  SUM(CAST(house_payout AS DECIMAL)) as total_payouts,
  AVG(CAST(house_payout AS DECIMAL)) as avg_payout
FROM game_history;

-- Recent games with payout info
SELECT 
  id,
  game_id,
  winner,
  round,
  house_payout,
  total_bets,
  created_at
FROM game_history
ORDER BY created_at DESC
LIMIT 10;

-- ========================================
-- ISSUE #4: Payment Requests
-- ========================================
SELECT 
  '=== PAYMENT REQUESTS CHECK ===' as check_name;

SELECT 
  COUNT(*) as total_requests,
  COUNT(CASE WHEN request_type = 'deposit' OR type = 'deposit' THEN 1 END) as deposits,
  COUNT(CASE WHEN request_type = 'withdrawal' OR type = 'withdrawal' THEN 1 END) as withdrawals,
  COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
  COUNT(CASE WHEN status = 'approved' OR status = 'completed' THEN 1 END) as approved,
  COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected
FROM payment_requests;

-- Recent payment requests
SELECT 
  id,
  user_id,
  COALESCE(request_type, type) as type,
  amount,
  status,
  created_at
FROM payment_requests
ORDER BY created_at DESC
LIMIT 10;

-- ========================================
-- ISSUE #5: Bonus System
-- ========================================
SELECT 
  '=== BONUS SYSTEM CHECK ===' as check_name;

SELECT 
  COUNT(*) as users_with_bonus,
  SUM(CAST(locked_bonus AS DECIMAL)) as total_locked_bonus,
  AVG(CAST(locked_bonus AS DECIMAL)) as avg_locked_bonus,
  SUM(wagering_requirement) as total_wagering_required,
  SUM(wagering_progress) as total_wagering_progress
FROM users 
WHERE CAST(locked_bonus AS DECIMAL) > 0;

-- Users with locked bonus
SELECT 
  full_name,
  phone,
  locked_bonus,
  wagering_requirement,
  wagering_progress,
  ROUND((wagering_progress::DECIMAL / NULLIF(wagering_requirement, 0)) * 100, 2) as wagering_percent
FROM users 
WHERE CAST(locked_bonus AS DECIMAL) > 0
ORDER BY CAST(locked_bonus AS DECIMAL) DESC
LIMIT 10;

-- ========================================
-- DATA INTEGRITY CHECKS
-- ========================================
SELECT 
  '=== DATA INTEGRITY CHECKS ===' as check_name;

-- Check for NULL or invalid values
SELECT 
  COUNT(*) as users_with_null_games_played
FROM users 
WHERE games_played IS NULL AND role = 'player';

SELECT 
  COUNT(*) as users_with_null_winnings
FROM users 
WHERE total_winnings IS NULL AND role = 'player';

SELECT 
  COUNT(*) as users_with_negative_balance
FROM users 
WHERE CAST(balance AS DECIMAL) < 0 AND role = 'player';

-- ========================================
-- SUMMARY REPORT
-- ========================================
SELECT 
  '=== SUMMARY REPORT ===' as check_name;

SELECT 
  'Total Players' as metric,
  COUNT(*)::TEXT as value
FROM users WHERE role = 'player'
UNION ALL
SELECT 
  'Players Who Played Games',
  COUNT(*)::TEXT
FROM users WHERE role = 'player' AND games_played > 0
UNION ALL
SELECT 
  'Total Games in History',
  COUNT(*)::TEXT
FROM game_history
UNION ALL
SELECT 
  'Total Payment Requests',
  COUNT(*)::TEXT
FROM payment_requests
UNION ALL
SELECT 
  'Users with Locked Bonus',
  COUNT(*)::TEXT
FROM users WHERE CAST(locked_bonus AS DECIMAL) > 0;

-- ========================================
-- RECOMMENDATIONS
-- ========================================
-- If total_games_played = 0: No games have been completed yet
-- If games_with_payout = 0: Payout calculation might be broken
-- If total_requests = 0: No payment requests created yet
-- If users_with_null_* > 0: Data integrity issue, need to fix
