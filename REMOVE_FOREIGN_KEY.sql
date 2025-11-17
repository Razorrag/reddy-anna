-- ============================================================================
-- REMOVE FOREIGN KEY CONSTRAINT
-- ============================================================================
-- The foreign key prevents bets from being placed because game_history
-- doesn't exist until AFTER the game completes
-- ============================================================================

-- Remove the foreign key constraint
ALTER TABLE player_bets
DROP CONSTRAINT IF EXISTS fk_player_bets_game_history;

-- Verify it's removed
SELECT constraint_name
FROM information_schema.table_constraints
WHERE constraint_type = 'FOREIGN KEY'
  AND table_name = 'player_bets'
  AND constraint_name = 'fk_player_bets_game_history';

-- Expected: NO ROWS (constraint removed)

-- ============================================================================
-- NOTE: Supabase can still JOIN without foreign key using !inner syntax
-- ============================================================================
