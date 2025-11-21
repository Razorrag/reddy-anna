-- Verify that game statistics are being saved automatically
-- Run this AFTER completing a game to check if statistics were saved

-- Check the most recent games and their statistics
SELECT 
  gh.game_id,
  gh.winner,
  gh.created_at as game_time,
  CASE 
    WHEN gs.game_id IS NOT NULL THEN '✅ HAS STATISTICS'
    ELSE '❌ MISSING STATISTICS'
  END as status,
  gs.total_bets,
  gs.total_winnings,
  gs.profit_loss,
  gs.total_players
FROM game_history gh
LEFT JOIN game_statistics gs ON gh.game_id = gs.game_id
ORDER BY gh.created_at DESC
LIMIT 20;

-- Count games with and without statistics
SELECT 
  COUNT(*) FILTER (WHERE gs.game_id IS NOT NULL) as games_with_stats,
  COUNT(*) FILTER (WHERE gs.game_id IS NULL) as games_without_stats,
  COUNT(*) as total_games,
  ROUND(
    (COUNT(*) FILTER (WHERE gs.game_id IS NOT NULL)::numeric / 
     NULLIF(COUNT(*), 0)::numeric) * 100, 
    2
  ) as percent_with_stats
FROM game_history gh
LEFT JOIN game_statistics gs ON gh.game_id = gs.game_id;

-- Check recent games (last 24 hours)
SELECT 
  'Recent Games (24h)' as period,
  COUNT(*) FILTER (WHERE gs.game_id IS NOT NULL) as with_stats,
  COUNT(*) FILTER (WHERE gs.game_id IS NULL) as without_stats
FROM game_history gh
LEFT JOIN game_statistics gs ON gh.game_id = gs.game_id
WHERE gh.created_at >= NOW() - INTERVAL '24 hours';

-- If you see games without statistics, check server logs for errors:
-- Look for these messages:
-- ✅ "Game statistics saved for gameId: xxx"
-- ❌ "CRITICAL: All 3 attempts to save game statistics failed"
