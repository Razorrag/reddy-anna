-- Migration: Add currentTimer column to game_sessions table
-- This fixes the PGRST204 error: "Could not find the 'currentTimer' column"

-- Add the missing currentTimer column
ALTER TABLE game_sessions 
ADD COLUMN IF NOT EXISTS currentTimer INTEGER DEFAULT 30;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_game_sessions_current_timer ON game_sessions(currentTimer);

-- Update existing records to have default timer value
UPDATE game_sessions 
SET currentTimer = 30 
WHERE currentTimer IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN game_sessions.currentTimer IS 'Current countdown timer value in seconds for the active betting phase';

SELECT '✅ Migration completed: currentTimer column added to game_sessions table' as status;
