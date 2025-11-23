-- Add loop video maintenance mode to simple_stream_config table
-- This allows admins to show a loop video with "Next game at DATE TIME" message
-- when the game is offline for maintenance

-- Add loop video fields to simple_stream_config
ALTER TABLE simple_stream_config
ADD COLUMN IF NOT EXISTS loop_mode BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS loop_next_game_date TEXT,
ADD COLUMN IF NOT EXISTS loop_next_game_time TEXT,
ADD COLUMN IF NOT EXISTS loop_video_url TEXT DEFAULT '/shared/uhd_30fps.mp4';

-- Add helpful comment
COMMENT ON COLUMN simple_stream_config.loop_mode IS 'Enable loop video maintenance mode';
COMMENT ON COLUMN simple_stream_config.loop_next_game_date IS 'Date when next game starts (e.g., "25 Nov 2025")';
COMMENT ON COLUMN simple_stream_config.loop_next_game_time IS 'Time when next game starts (e.g., "7:00 PM")';
COMMENT ON COLUMN simple_stream_config.loop_video_url IS 'Path to loop video file (default: /shared/uhd_30fps.mp4)';

-- Log the migration
DO $$
BEGIN
  RAISE NOTICE 'Loop video mode fields added to simple_stream_config table';
END $$;