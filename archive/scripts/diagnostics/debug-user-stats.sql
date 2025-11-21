-- ============================================
-- DEBUG USER STATISTICS ISSUE
-- ============================================
-- Check why user statistics are showing 0
-- ============================================

-- 1. Check player_bets data for Test Player 1
SELECT '=== PLAYER BETS RAW DATA ===' as check_name;

SELECT 
  pb.id,
  pb.user_id,
  pb.game_id,
  pb.side,
  pb.amount,
  pb.potential_payout,
  pb.actual_payout,
  pb.status,
  pb.created_at,
  gs.winner as game_winner,
  CASE 
    WHEN pb.actual_payout > 0 THEN 'WIN'
    WHEN pb.actual_payout = 0 AND pb.status = 'completed' THEN 'LOSS'
    WHEN pb.status = 'pending' THEN 'PENDING'
    ELSE 'UNKNOWN'
  END as calculated_result
FROM player_bets pb
LEFT JOIN game_sessions gs ON pb.game_id = gs.game_id
WHERE pb.user_id IN (
  SELECT id FROM users WHERE phone LIKE '%9876543210%' OR full_name LIKE '%Test Player 1%'
)
ORDER BY pb.created_at DESC;

-- 2. Check users table statistics fields
SELECT '=== USER STATISTICS IN DATABASE ===' as check_name;

SELECT 
  id,
  full_name,
  phone,
  balance,
  games_played,
  games_won,
  total_winnings,
  total_losses,
  created_at
FROM users
WHERE phone LIKE '%9876543210%' OR full_name LIKE '%Test Player 1%';

-- 3. Calculate what statistics SHOULD be
SELECT '=== CALCULATED STATISTICS (SHOULD BE) ===' as check_name;

WITH user_bets AS (
  SELECT 
    pb.user_id,
    pb.game_id,
    pb.side,
    pb.amount,
    pb.actual_payout,
    gs.winner
  FROM player_bets pb
  LEFT JOIN game_sessions gs ON pb.game_id = gs.game_id
  WHERE pb.user_id IN (
    SELECT id FROM users WHERE phone LIKE '%9876543210%' OR full_name LIKE '%Test Player 1%'
  )
  AND pb.status = 'completed'
)
SELECT 
  user_id,
  COUNT(DISTINCT game_id) as should_be_games_played,
  COUNT(DISTINCT CASE 
    WHEN actual_payout > amount THEN game_id 
    ELSE NULL 
  END) as should_be_games_won,
  SUM(CASE 
    WHEN actual_payout > amount THEN actual_payout - amount 
    ELSE 0 
  END) as should_be_total_winnings,
  SUM(CASE 
    WHEN actual_payout < amount THEN amount - actual_payout 
    ELSE 0 
  END) as should_be_total_losses
FROM user_bets
GROUP BY user_id;

-- 4. Check if updateUserGameStats was ever called
SELECT '=== RECENT GAME COMPLETIONS ===' as check_name;

SELECT 
  gs.game_id,
  gs.status,
  gs.winner,
  gs.created_at as game_created,
  gh.created_at as history_created,
  COUNT(DISTINCT pb.user_id) as players_count,
  STRING_AGG(DISTINCT pb.user_id, ', ') as player_ids
FROM game_sessions gs
LEFT JOIN game_history gh ON gs.game_id = gh.game_id
LEFT JOIN player_bets pb ON gs.game_id = pb.game_id
WHERE gs.status = 'completed'
GROUP BY gs.game_id, gs.status, gs.winner, gs.created_at, gh.created_at
ORDER BY gs.created_at DESC
LIMIT 5;

-- 5. Check if actual_payout is being set correctly
SELECT '=== PAYOUT VALIDATION ===' as check_name;

SELECT 
  pb.game_id,
  pb.user_id,
  pb.side as bet_side,
  pb.amount as bet_amount,
  gs.winner as game_winner,
  pb.actual_payout,
  pb.status,
  CASE 
    WHEN pb.side = gs.winner AND pb.actual_payout > 0 THEN 'CORRECT - Won and got payout'
    WHEN pb.side != gs.winner AND pb.actual_payout = 0 THEN 'CORRECT - Lost and no payout'
    WHEN pb.side = gs.winner AND pb.actual_payout = 0 THEN 'ERROR - Won but no payout!'
    WHEN pb.side != gs.winner AND pb.actual_payout > 0 THEN 'ERROR - Lost but got payout!'
    ELSE 'UNKNOWN'
  END as payout_status
FROM player_bets pb
INNER JOIN game_sessions gs ON pb.game_id = gs.game_id
WHERE gs.status = 'completed'
  AND pb.status = 'completed'
ORDER BY pb.created_at DESC
LIMIT 10;

-- 6. Check for any bets with status != 'completed'
SELECT '=== INCOMPLETE BETS ===' as check_name;

SELECT 
  status,
  COUNT(*) as count
FROM player_bets
GROUP BY status;
