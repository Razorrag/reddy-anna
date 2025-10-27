-- Simplified Stream Configuration Database Schema
-- Unified approach for both RTMP and WebRTC streaming

CREATE TABLE stream_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Stream method and status
  active_method VARCHAR(10) DEFAULT 'rtmp' CHECK (active_method IN ('rtmp', 'webrtc', 'none')),
  stream_status VARCHAR(20) DEFAULT 'offline' CHECK (stream_status IN ('online', 'offline', 'connecting', 'error')),
  
  -- RTMP settings
  rtmp_server_url VARCHAR(255) DEFAULT 'rtmp://localhost/live',
  rtmp_stream_key VARCHAR(255),
  rtmp_enabled BOOLEAN DEFAULT true,
  
  -- WebRTC settings
  webrtc_enabled BOOLEAN DEFAULT true,
  webrtc_resolution VARCHAR(10) DEFAULT '720p' CHECK (webrtc_resolution IN ('480p', '720p', '1080p')),
  webrtc_fps INTEGER DEFAULT 30,
  webrtc_bitrate INTEGER DEFAULT 2500,
  
  -- Display settings for players
  stream_width INTEGER DEFAULT 1280,
  stream_height INTEGER DEFAULT 720,
  show_stream BOOLEAN DEFAULT true,
  
  -- Admin settings
  admin_stream_url VARCHAR(255),
  stream_title VARCHAR(255) DEFAULT 'Andar Bahar Live',
  viewer_count INTEGER DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default configuration
INSERT INTO stream_config (id, active_method, stream_status, rtmp_server_url, stream_title) 
VALUES (
  gen_random_uuid(),
  'rtmp',
  'offline',
  'rtmp://live.restream.io/live',
  'Andar Bahar Live'
);

-- Create index for faster queries
CREATE INDEX idx_stream_config_active_method ON stream_config(active_method);
CREATE INDEX idx_stream_config_stream_status ON stream_config(stream_status);