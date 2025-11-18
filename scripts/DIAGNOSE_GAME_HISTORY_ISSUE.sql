-- ============================================================================
-- DIAGNOSE GAME HISTORY ISSUE
-- ============================================================================
-- This script helps diagnose why game history is showing 0 data
-- ============================================================================

-- Step 1: Check if RPC function exists
SELECT 
  proname as function_name,
  pg_get_function_arguments(oid) as arguments,
  pg_get_functiondef(oid) as definition_exists
FROM pg_proc
WHERE proname = 'get_user_game_history';

-- Expected: Should show 1 row with function name and arguments
-- If empty: RPC function doesn't exist - run FIX_PLAYER_STATS_AND_GAME_HISTORY.sql

-- ============================================================================

-- Step 2: Check if there's any game history data
SELECT 
  COUNT(*) as total_games,
  COUNT(DISTINCT game_id) as unique_games,
  MIN(created_at) as oldest_game,
  MAX(created_at) as newest_game
FROM game_history;

-- Expected: Should show count > 0
-- If 0: No games have been completed yet

-- ============================================================================

-- Step 3: Check if there are player bets
SELECT 
  COUNT(*) as total_bets,
  COUNT(DISTINCT user_id) as unique_players,
  COUNT(DISTINCT game_id) as games_with_bets,
  COUNT(CASE WHEN status = 'won' THEN 1 END) as won_bets,
  COUNT(CASE WHEN status = 'lost' THEN 1 END) as lost_bets,
  COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_bets
FROM player_bets;

-- Expected: Should show bets exist
-- If 0: No bets have been placed

-- ============================================================================

-- Step 4: Check for a specific user (REPLACE 'user-id-here' with actual user ID)
DO $$
DECLARE
  v_user_id TEXT := 'user-id-here';  -- CHANGE THIS!
BEGIN
  RAISE NOTICE '=== Checking game history for user: % ===', v_user_id;
  
  -- Check if user exists
  IF NOT EXISTS (SELECT 1 FROM users WHERE id = v_user_id) THEN
    RAISE NOTICE '❌ User does not exist!';
    RETURN;
  END IF;
  
  RAISE NOTICE '✅ User exists';
  
  -- Check if user has placed bets
  IF NOT EXISTS (SELECT 1 FROM player_bets WHERE user_id = v_user_id) THEN
    RAISE NOTICE '❌ User has no bets!';
    RETURN;
  END IF;
  
  RAISE NOTICE '✅ User has placed bets';
  
  -- Count user's bets
  RAISE NOTICE 'User bet count: %', (SELECT COUNT(*) FROM player_bets WHERE user_id = v_user_id);
  
  -- Check if bets are linked to games in game_history
  RAISE NOTICE 'Games with history: %', (
    SELECT COUNT(DISTINCT pb.game_id)
    FROM player_bets pb
    INNER JOIN game_history gh ON gh.game_id = pb.game_id
    WHERE pb.user_id = v_user_id
  );
  
END $$;

-- ============================================================================

-- Step 5: Test the RPC function directly (REPLACE 'user-id-here')
-- Uncomment and run this after replacing the user ID:

-- SELECT * FROM get_user_game_history('user-id-here', 10);

-- Expected: Should return game history records
-- If empty: Check if games exist in game_history table
-- If error: RPC function has issues

-- ============================================================================

-- Step 6: Check for orphaned bets (bets without game_history)
SELECT 
  COUNT(*) as orphaned_bets,
  COUNT(DISTINCT game_id) as orphaned_games
FROM player_bets pb
WHERE NOT EXISTS (
  SELECT 1 FROM game_history gh WHERE gh.game_id = pb.game_id
);

-- Expected: Should be 0 or very low
-- If high: Games completed but not saved to game_history

-- ============================================================================

-- Step 7: Check game_history table structure
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'game_history'
ORDER BY ordinal_position;

-- Expected: Should show all required columns

-- ============================================================================

-- Step 8: Check player_bets table structure
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'player_bets'
ORDER BY ordinal_position;

-- Expected: Should show all required columns including actual_payout

-- ============================================================================

-- Step 9: Sample data from game_history (last 5 games)
SELECT 
  game_id,
  opening_card,
  winner,
  winning_card,
  winning_round,
  total_cards,
  created_at
FROM game_history
ORDER BY created_at DESC
LIMIT 5;

-- Expected: Should show recent games

-- ============================================================================

-- Step 10: Sample data from player_bets (last 10 bets)
SELECT 
  id,
  user_id,
  game_id,
  round,
  side,
  amount,
  actual_payout,
  status,
  created_at
FROM player_bets
ORDER BY created_at DESC
LIMIT 10;

-- Expected: Should show recent bets with actual_payout values

-- ============================================================================

-- DIAGNOSIS SUMMARY
-- ============================================================================
-- 
-- Common Issues:
-- 
-- 1. RPC function doesn't exist
--    Solution: Run FIX_PLAYER_STATS_AND_GAME_HISTORY.sql
-- 
-- 2. No game_history records
--    Solution: Complete at least one game
-- 
-- 3. No player_bets records
--    Solution: Place at least one bet
-- 
-- 4. Orphaned bets (bets without game_history)
--    Solution: Check game completion logic in server/game.ts
-- 
-- 5. actual_payout is NULL
--    Solution: Check payout logic in server/game.ts
-- 
-- 6. User ID mismatch
--    Solution: Verify correct user ID is being passed
-- 
-- ============================================================================

-- QUICK FIX COMMANDS
-- ============================================================================

-- If RPC function doesn't exist:
-- \i scripts/FIX_PLAYER_STATS_AND_GAME_HISTORY.sql

-- If you need to manually test with a specific user:
-- SELECT * FROM get_user_game_history('your-user-id-here', 20);

-- If you need to see all users who have placed bets:
-- SELECT DISTINCT u.id, u.phone, COUNT(pb.id) as bet_count
-- FROM users u
-- INNER JOIN player_bets pb ON pb.user_id = u.id
-- GROUP BY u.id, u.phone
-- ORDER BY bet_count DESC
-- LIMIT 10;

-- ============================================================================
