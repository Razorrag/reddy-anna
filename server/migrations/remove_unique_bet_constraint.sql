-- Remove unique constraint from player_bets table
-- This allows users to bet multiple times on the same side in the same round
-- Date: $(date)
-- Purpose: Remove incorrect constraint that prevents multiple bets

-- Drop the unique constraint if it exists
ALTER TABLE player_bets 
DROP CONSTRAINT IF EXISTS unique_user_game_round_side;

-- Verify the constraint is removed
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM pg_constraint 
        WHERE conname = 'unique_user_game_round_side'
        AND conrelid = 'player_bets'::regclass
    ) THEN
        RAISE EXCEPTION 'Constraint still exists - removal may have failed';
    ELSE
        RAISE NOTICE 'Constraint successfully removed - users can now bet multiple times';
    END IF;
END $$;

-- Keep the index for performance (no unique constraint needed)
CREATE INDEX IF NOT EXISTS idx_player_bets_user_game_round_side 
ON player_bets(user_id, game_id, round, side);

-- Note: Users can now bet multiple times on the same side in the same round
-- Example: User can bet ₹100 on andar, then ₹200 on andar again, then ₹500 on bahar












