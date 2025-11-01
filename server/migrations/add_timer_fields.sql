-- Add timer tracking fields to game_sessions table
-- This migration adds timer persistence support for game state restoration

ALTER TABLE game_sessions 
ADD COLUMN IF NOT EXISTS timer_started_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS timer_duration INTEGER DEFAULT 30,
ADD COLUMN IF NOT EXISTS current_round INTEGER DEFAULT 1;

-- Add index for faster queries on active games
CREATE INDEX IF NOT EXISTS idx_game_sessions_active 
ON game_sessions(status, phase) 
WHERE status = 'active';

-- Add comment for documentation
COMMENT ON COLUMN game_sessions.timer_started_at IS 'Timestamp when the current betting timer started';
COMMENT ON COLUMN game_sessions.timer_duration IS 'Duration of the timer in seconds';
COMMENT ON COLUMN game_sessions.current_round IS 'Current round number (1, 2, or 3)';








