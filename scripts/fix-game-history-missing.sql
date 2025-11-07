-- ============================================
-- FIX MISSING GAME HISTORY RECORDS
-- ============================================
-- Problem: Only 1 out of 4 games have game_history records
-- Solution: Add unique constraint and backfill missing records
-- ============================================

-- Step 1: Add unique constraint to prevent duplicates
ALTER TABLE game_history
ADD CONSTRAINT unique_game_history_game_id UNIQUE (game_id);

-- Step 2: Backfill missing game_history from game_sessions
-- This will create game_history records for completed games that don't have them
INSERT INTO game_history (
  id,
  game_id,
  opening_card,
  winner,
  winning_card,
  winning_round,
  total_cards,
  total_bets,
  total_payouts,
  created_at
)
SELECT 
  gen_random_uuid()::text as id,
  gs.game_id,
  gs.opening_card,
  gs.winner,
  gs.winning_card,
  gs.current_round as winning_round,
  COALESCE((SELECT COUNT(*) FROM dealt_cards WHERE game_id = gs.game_id), 0) as total_cards,
  COALESCE((SELECT SUM(amount) FROM player_bets WHERE game_id = gs.game_id), 0) as total_bets,
  COALESCE((SELECT SUM(actual_payout) FROM player_bets WHERE game_id = gs.game_id), 0) as total_payouts,
  gs.created_at
FROM game_sessions gs
WHERE gs.status = 'completed'
  AND gs.winner IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM game_history gh WHERE gh.game_id = gs.game_id
  );

-- Step 3: Verify the fix
SELECT 
  'After Fix' as status,
  COUNT(*) as game_history_count
FROM game_history;

-- Step 4: Show which games were backfilled
SELECT 
  gs.game_id,
  gs.opening_card,
  gs.winner,
  gs.created_at as game_created,
  gh.created_at as history_created,
  CASE 
    WHEN gh.created_at > gs.created_at + INTERVAL '1 minute' 
    THEN 'BACKFILLED' 
    ELSE 'ORIGINAL' 
  END as record_type
FROM game_sessions gs
INNER JOIN game_history gh ON gs.game_id = gh.game_id
WHERE gs.status = 'completed'
ORDER BY gs.created_at DESC;
