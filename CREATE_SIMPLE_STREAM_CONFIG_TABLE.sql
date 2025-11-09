-- ========================================
-- SIMPLE STREAM CONFIGURATION TABLE
-- ========================================
-- This table stores the simple stream URL configuration
-- Replaces complex WebRTC/RTMP system with simple iframe/video embeds

CREATE TABLE IF NOT EXISTS simple_stream_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Stream URL (YouTube embed, Vimeo, custom player, etc.)
  stream_url TEXT NOT NULL,
  
  -- Stream type: 'iframe' (YouTube, Vimeo) or 'video' (MP4, HLS)
  stream_type VARCHAR(20) NOT NULL DEFAULT 'iframe' CHECK (stream_type IN ('iframe', 'video', 'custom')),
  
  -- Is stream active (visible to players)
  is_active BOOLEAN NOT NULL DEFAULT false,
  
  -- Stream title/description
  stream_title VARCHAR(255) DEFAULT 'Live Game Stream',
  
  -- Video player options (only for 'video' type)
  autoplay BOOLEAN DEFAULT true,
  muted BOOLEAN DEFAULT true,
  controls BOOLEAN DEFAULT false,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on is_active for faster queries
CREATE INDEX IF NOT EXISTS idx_simple_stream_config_active ON simple_stream_config(is_active);

-- Add comment
COMMENT ON TABLE simple_stream_config IS 'Simple stream configuration for iframe/video embeds - replaces complex WebRTC/RTMP system';

-- Insert default configuration
INSERT INTO simple_stream_config (
  stream_url,
  stream_type,
  is_active,
  stream_title,
  autoplay,
  muted,
  controls
) VALUES (
  '',
  'iframe',
  false,
  'Live Game Stream',
  true,
  true,
  false
) ON CONFLICT DO NOTHING;

-- Grant permissions (adjust role name as needed)
-- GRANT SELECT ON simple_stream_config TO authenticated;
-- GRANT ALL ON simple_stream_config TO service_role;

SELECT 'Simple stream config table created successfully!' as message;
