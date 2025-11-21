-- ============================================
-- GAME HISTORY DIAGNOSTIC SCRIPT
-- ============================================
-- Run this in Supabase SQL Editor to diagnose why game history is not showing
-- ============================================

-- 1. Check total counts
SELECT '=== TABLE COUNTS ===' as check_name;

SELECT 
  'users' as table_name,
  COUNT(*) as total_count
FROM users
WHERE role = 'player'
UNION ALL
SELECT 
  'game_sessions' as table_name,
  COUNT(*) as total_count
FROM game_sessions
UNION ALL
SELECT 
  'player_bets' as table_name,
  COUNT(*) as total_count
FROM player_bets
UNION ALL
SELECT 
  'game_history' as table_name,
  COUNT(*) as total_count
FROM game_history
UNION ALL
SELECT 
  'dealt_cards' as table_name,
  COUNT(*) as total_count
FROM dealt_cards
UNION ALL
SELECT 
  'game_statistics' as table_name,
  COUNT(*) as total_count
FROM game_statistics;

-- 2. Check game_sessions status distribution
SELECT '=== GAME SESSIONS STATUS ===' as check_name;

SELECT 
  status,
  COUNT(*) as count
FROM game_sessions
GROUP BY status
ORDER BY count DESC;

-- 3. Check for orphaned player_bets (bets without game_sessions)
SELECT '=== ORPHANED BETS CHECK ===' as check_name;

SELECT 
  COUNT(*) as orphaned_bets_count,
  COUNT(DISTINCT pb.game_id) as orphaned_game_ids
FROM player_bets pb
LEFT JOIN game_sessions gs ON pb.game_id = gs.game_id
WHERE gs.game_id IS NULL;

-- 4. Check for bets with game_sessions but no game_history
SELECT '=== BETS WITH SESSIONS BUT NO HISTORY ===' as check_name;

SELECT 
  COUNT(DISTINCT pb.game_id) as games_with_bets_and_sessions_but_no_history
FROM player_bets pb
INNER JOIN game_sessions gs ON pb.game_id = gs.game_id
LEFT JOIN game_history gh ON pb.game_id = gh.game_id
WHERE gh.game_id IS NULL;

-- 5. Sample of recent player_bets with their game_sessions and game_history status
SELECT '=== RECENT BETS SAMPLE ===' as check_name;

SELECT 
  pb.id as bet_id,
  pb.user_id,
  pb.game_id,
  pb.side,
  pb.amount,
  pb.status as bet_status,
  pb.created_at as bet_created,
  CASE WHEN gs.game_id IS NOT NULL THEN 'YES' ELSE 'NO' END as has_game_session,
  gs.status as session_status,
  gs.winner as session_winner,
  CASE WHEN gh.game_id IS NOT NULL THEN 'YES' ELSE 'NO' END as has_game_history,
  gh.winner as history_winner
FROM player_bets pb
LEFT JOIN game_sessions gs ON pb.game_id = gs.game_id
LEFT JOIN game_history gh ON pb.game_id = gh.game_id
ORDER BY pb.created_at DESC
LIMIT 20;

-- 6. Check specific user's data (REPLACE 'USER_ID' with actual user ID)
SELECT '=== SPECIFIC USER DATA ===' as check_name;

-- Get a sample user ID first
WITH sample_user AS (
  SELECT user_id 
  FROM player_bets 
  LIMIT 1
)
SELECT 
  pb.id as bet_id,
  pb.game_id,
  pb.side,
  pb.amount,
  pb.actual_payout,
  pb.status as bet_status,
  pb.created_at,
  gs.game_id as session_exists,
  gs.status as session_status,
  gs.winner as session_winner,
  gs.opening_card,
  gh.id as history_exists,
  gh.winner as history_winner,
  gh.winning_card
FROM player_bets pb
LEFT JOIN game_sessions gs ON pb.game_id = gs.game_id
LEFT JOIN game_history gh ON pb.game_id = gh.game_id
WHERE pb.user_id = (SELECT user_id FROM sample_user)
ORDER BY pb.created_at DESC
LIMIT 10;

-- 7. Check for games that completed but sessions still exist
SELECT '=== COMPLETED GAMES WITH ACTIVE SESSIONS ===' as check_name;

SELECT 
  gs.game_id,
  gs.status as session_status,
  gs.winner,
  gs.created_at as session_created,
  gh.id as history_id,
  gh.winner as history_winner,
  gh.created_at as history_created
FROM game_sessions gs
INNER JOIN game_history gh ON gs.game_id = gh.game_id
WHERE gs.status = 'completed'
ORDER BY gh.created_at DESC
LIMIT 10;

-- 8. Check user statistics vs actual game data
SELECT '=== USER STATISTICS VALIDATION ===' as check_name;

SELECT 
  u.id as user_id,
  u.full_name,
  u.games_played as stats_games_played,
  u.games_won as stats_games_won,
  u.total_winnings as stats_total_winnings,
  u.total_losses as stats_total_losses,
  COUNT(DISTINCT pb.game_id) as actual_games_played,
  SUM(CASE WHEN pb.actual_payout > 0 THEN 1 ELSE 0 END) as actual_games_won,
  SUM(CASE WHEN pb.actual_payout > pb.amount THEN pb.actual_payout - pb.amount ELSE 0 END) as actual_winnings,
  SUM(CASE WHEN pb.actual_payout < pb.amount THEN pb.amount - pb.actual_payout ELSE 0 END) as actual_losses
FROM users u
LEFT JOIN player_bets pb ON u.id = pb.user_id
WHERE u.role = 'player'
GROUP BY u.id, u.full_name, u.games_played, u.games_won, u.total_winnings, u.total_losses
HAVING COUNT(pb.id) > 0
ORDER BY actual_games_played DESC
LIMIT 10;

-- 9. Check for duplicate game_history entries
SELECT '=== DUPLICATE GAME HISTORY CHECK ===' as check_name;

SELECT 
  game_id,
  COUNT(*) as duplicate_count
FROM game_history
GROUP BY game_id
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC
LIMIT 10;

-- 10. Check foreign key integrity
SELECT '=== FOREIGN KEY INTEGRITY ===' as check_name;

SELECT 
  'player_bets → game_sessions' as relationship,
  COUNT(*) as broken_references
FROM player_bets pb
LEFT JOIN game_sessions gs ON pb.game_id = gs.game_id
WHERE gs.game_id IS NULL
UNION ALL
SELECT 
  'game_history → game_sessions' as relationship,
  COUNT(*) as broken_references
FROM game_history gh
LEFT JOIN game_sessions gs ON gh.game_id = gs.game_id
WHERE gs.game_id IS NULL
UNION ALL
SELECT 
  'dealt_cards → game_sessions' as relationship,
  COUNT(*) as broken_references
FROM dealt_cards dc
LEFT JOIN game_sessions gs ON dc.game_id = gs.game_id
WHERE gs.game_id IS NULL;

-- ============================================
-- SUMMARY
-- ============================================

SELECT '=== DIAGNOSTIC SUMMARY ===' as check_name;

SELECT 
  'Total Users' as metric,
  COUNT(*)::text as value
FROM users
WHERE role = 'player'
UNION ALL
SELECT 
  'Total Bets Placed' as metric,
  COUNT(*)::text as value
FROM player_bets
UNION ALL
SELECT 
  'Total Game Sessions' as metric,
  COUNT(*)::text as value
FROM game_sessions
UNION ALL
SELECT 
  'Total Game History Records' as metric,
  COUNT(*)::text as value
FROM game_history
UNION ALL
SELECT 
  'Orphaned Bets (no session)' as metric,
  COUNT(*)::text as value
FROM player_bets pb
LEFT JOIN game_sessions gs ON pb.game_id = gs.game_id
WHERE gs.game_id IS NULL
UNION ALL
SELECT 
  'Games with History but No Session' as metric,
  COUNT(*)::text as value
FROM game_history gh
LEFT JOIN game_sessions gs ON gh.game_id = gs.game_id
WHERE gs.game_id IS NULL;

-- ============================================
-- RECOMMENDATIONS
-- ============================================

/*
Based on the results above:

1. If "Orphaned Bets" > 0:
   - game_sessions are being deleted but player_bets remain
   - This breaks getUserGameHistory() because it uses INNER JOIN
   - FIX: Change to LEFT JOIN or don't delete game_sessions

2. If "Games with History but No Session" > 0:
   - game_sessions are being deleted after game_history is saved
   - This is expected if you clean up old sessions
   - FIX: Use game_history instead of game_sessions in getUserGameHistory()

3. If user statistics don't match actual game data:
   - updateUserGameStats() is not being called correctly
   - FIX: Ensure it's called after every game completion

4. If duplicate game_history entries exist:
   - saveGameHistory() is being called multiple times
   - FIX: Add unique constraint on game_id in game_history table
*/
