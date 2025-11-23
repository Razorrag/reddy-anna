-- Create simple_stream_config table for HLS/video streaming
-- This table stores stream configuration including loop video maintenance mode

CREATE TABLE IF NOT EXISTS simple_stream_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Stream Configuration
  stream_url TEXT,
  stream_type VARCHAR(20) DEFAULT 'iframe' CHECK (stream_type IN ('iframe', 'video', 'custom')),
  is_active BOOLEAN DEFAULT FALSE,
  is_paused BOOLEAN DEFAULT FALSE,
  stream_title TEXT DEFAULT 'Live Game Stream',
  autoplay BOOLEAN DEFAULT TRUE,
  muted BOOLEAN DEFAULT TRUE,
  controls BOOLEAN DEFAULT FALSE,
  
  -- Viewer Count Configuration (fake viewer display)
  min_viewers INTEGER DEFAULT NULL,
  max_viewers INTEGER DEFAULT NULL,
  
  -- Loop Video Maintenance Mode
  loop_mode BOOLEAN DEFAULT FALSE,
  loop_next_game_date TEXT,
  loop_next_game_time TEXT,
  loop_video_url TEXT DEFAULT '/shared/uhd_30fps.mp4',
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add helpful comments
COMMENT ON TABLE simple_stream_config IS 'Simple stream configuration for HLS/video streaming';
COMMENT ON COLUMN simple_stream_config.stream_url IS 'URL of the stream (HLS .m3u8, MP4, YouTube embed, etc.)';
COMMENT ON COLUMN simple_stream_config.stream_type IS 'How to render the stream: iframe, video, or custom';
COMMENT ON COLUMN simple_stream_config.is_active IS 'Whether the stream is active and visible to players';
COMMENT ON COLUMN simple_stream_config.is_paused IS 'Whether the stream is paused (shows frozen frame)';
COMMENT ON COLUMN simple_stream_config.min_viewers IS 'Minimum fake viewer count to display (null = show real count)';
COMMENT ON COLUMN simple_stream_config.max_viewers IS 'Maximum fake viewer count to display (null = show real count)';
COMMENT ON COLUMN simple_stream_config.loop_mode IS 'Enable loop video maintenance mode (overrides stream)';
COMMENT ON COLUMN simple_stream_config.loop_next_game_date IS 'Date when next game starts (e.g., "25 Nov 2025")';
COMMENT ON COLUMN simple_stream_config.loop_next_game_time IS 'Time when next game starts (e.g., "7:00 PM")';
COMMENT ON COLUMN simple_stream_config.loop_video_url IS 'Path to loop video file (default: /shared/uhd_30fps.mp4)';

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_simple_stream_config_active ON simple_stream_config(is_active);

-- Insert default configuration
INSERT INTO simple_stream_config (
  stream_url,
  stream_type,
  is_active,
  is_paused,
  stream_title,
  autoplay,
  muted,
  controls,
  loop_mode
) VALUES (
  '',
  'iframe',
  FALSE,
  FALSE,
  'Live Game Stream',
  TRUE,
  TRUE,
  FALSE,
  FALSE
) ON CONFLICT DO NOTHING;

-- Log success
DO $$
BEGIN
  RAISE NOTICE '✅ simple_stream_config table created successfully';
END $$;
