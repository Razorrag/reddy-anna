-- ============================================================================
-- ADD FOREIGN KEY RELATIONSHIP: player_bets → game_history
-- ============================================================================
-- This allows Supabase to JOIN player_bets with game_history
-- Error: "Could not find a relationship between 'player_bets' and 'game_history'"
-- ============================================================================

-- Step 1: Check if foreign key already exists
SELECT 
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name = 'player_bets'
  AND ccu.table_name = 'game_history';

-- Step 2: Add foreign key constraint
-- This links player_bets.game_id to game_history.game_id
ALTER TABLE player_bets
ADD CONSTRAINT fk_player_bets_game_history
FOREIGN KEY (game_id)
REFERENCES game_history(game_id)
ON DELETE CASCADE;

-- Step 3: Verify the foreign key was created
SELECT 
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name = 'player_bets'
  AND ccu.table_name = 'game_history';

-- Expected result: Should show fk_player_bets_game_history

-- ============================================================================
-- After running this, restart your server and test game history
-- ============================================================================
