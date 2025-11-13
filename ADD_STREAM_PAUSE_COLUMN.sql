-- Add is_paused column to simple_stream_config table
-- This allows admin to pause/play the stream for all players

ALTER TABLE simple_stream_config 
ADD COLUMN IF NOT EXISTS is_paused BOOLEAN NOT NULL DEFAULT false;

-- Add comment
COMMENT ON COLUMN simple_stream_config.is_paused IS 'When true, stream is paused for all players (shows frozen frame instead of black screen)';

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_simple_stream_config_paused ON simple_stream_config(is_paused);

SELECT 'Stream pause column added successfully!' as message;