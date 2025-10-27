-- =====================================================
-- Dual Streaming Migration - Andar Bahar
-- Adds support for both RTMP and WebRTC streaming
-- =====================================================

BEGIN;

-- =====================================================
-- 1. Backup existing stream_settings (if exists)
-- =====================================================
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'stream_settings') THEN
        CREATE TEMP TABLE IF NOT EXISTS temp_stream_backup AS
        SELECT * FROM stream_settings;
        RAISE NOTICE 'Backed up existing stream_settings';
    END IF;
END $$;

-- =====================================================
-- 2. Create new stream_config table
-- =====================================================
CREATE TABLE IF NOT EXISTS stream_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Stream Method Configuration
  active_method VARCHAR(10) NOT NULL DEFAULT 'rtmp' CHECK (active_method IN ('rtmp', 'webrtc')),
  stream_status VARCHAR(20) NOT NULL DEFAULT 'offline' CHECK (stream_status IN ('online', 'offline', 'connecting', 'error')),
  stream_title VARCHAR(255) DEFAULT 'Andar Bahar Live',
  
  -- RTMP Configuration
  rtmp_server_url VARCHAR(255) DEFAULT 'rtmp://live.restream.io/live',
  rtmp_stream_key VARCHAR(255),
  rtmp_player_url VARCHAR(255) DEFAULT 'https://player.restream.io?token=2123471e69ed8bf8cb11cd207c282b1',
  rtmp_status VARCHAR(20) DEFAULT 'offline' CHECK (rtmp_status IN ('online', 'offline', 'connecting', 'error')),
  rtmp_last_check TIMESTAMP WITH TIME ZONE,
  
  -- WebRTC Configuration
  webrtc_enabled BOOLEAN DEFAULT true,
  webrtc_status VARCHAR(20) DEFAULT 'offline' CHECK (webrtc_status IN ('online', 'offline', 'connecting', 'error')),
  webrtc_quality VARCHAR(20) DEFAULT 'high' CHECK (webrtc_quality IN ('low', 'medium', 'high', 'ultra')),
  webrtc_resolution VARCHAR(10) DEFAULT '720p' CHECK (webrtc_resolution IN ('480p', '720p', '1080p')),
  webrtc_fps INTEGER DEFAULT 30 CHECK (webrtc_fps IN (15, 24, 30, 60)),
  webrtc_bitrate INTEGER DEFAULT 2500 CHECK (webrtc_bitrate >= 500 AND webrtc_bitrate <= 10000),
  webrtc_audio_enabled BOOLEAN DEFAULT true,
  webrtc_screen_source VARCHAR(20) DEFAULT 'screen' CHECK (webrtc_screen_source IN ('screen', 'window', 'tab')),
  webrtc_room_id VARCHAR(100) DEFAULT 'andar-bahar-live',
  webrtc_last_check TIMESTAMP WITH TIME ZONE,
  
  -- Analytics
  viewer_count INTEGER DEFAULT 0 CHECK (viewer_count >= 0),
  total_views INTEGER DEFAULT 0 CHECK (total_views >= 0),
  stream_duration_seconds INTEGER DEFAULT 0 CHECK (stream_duration_seconds >= 0),
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID,
  last_modified_by UUID
);

-- =====================================================
-- 3. Create stream_sessions table for tracking
-- =====================================================
CREATE TABLE IF NOT EXISTS stream_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stream_method VARCHAR(10) NOT NULL CHECK (stream_method IN ('rtmp', 'webrtc')),
  start_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  end_time TIMESTAMP WITH TIME ZONE,
  duration_seconds INTEGER,
  peak_viewers INTEGER DEFAULT 0 CHECK (peak_viewers >= 0),
  total_viewers INTEGER DEFAULT 0 CHECK (total_viewers >= 0),
  admin_id UUID,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'ended', 'error')),
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 4. Create indexes for performance
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_stream_config_method ON stream_config(active_method);
CREATE INDEX IF NOT EXISTS idx_stream_config_status ON stream_config(stream_status);
CREATE INDEX IF NOT EXISTS idx_stream_sessions_method ON stream_sessions(stream_method);
CREATE INDEX IF NOT EXISTS idx_stream_sessions_admin ON stream_sessions(admin_id);
CREATE INDEX IF NOT EXISTS idx_stream_sessions_start ON stream_sessions(start_time DESC);

-- =====================================================
-- 5. Migrate existing data (if any)
-- =====================================================
DO $$
DECLARE
    existing_rtmp_url TEXT;
    existing_stream_key TEXT;
    existing_title TEXT;
    existing_status TEXT;
BEGIN
    -- Check if temp backup exists and has data
    IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'temp_stream_backup') THEN
        -- Get existing RTMP URL
        SELECT setting_value INTO existing_rtmp_url 
        FROM temp_stream_backup 
        WHERE setting_key = 'restream_rtmp_url' 
        LIMIT 1;
        
        -- Get existing stream key
        SELECT setting_value INTO existing_stream_key 
        FROM temp_stream_backup 
        WHERE setting_key = 'restream_stream_key' 
        LIMIT 1;
        
        -- Get existing title
        SELECT setting_value INTO existing_title 
        FROM temp_stream_backup 
        WHERE setting_key = 'stream_title' 
        LIMIT 1;
        
        -- Get existing status
        SELECT setting_value INTO existing_status 
        FROM temp_stream_backup 
        WHERE setting_key = 'stream_status' 
        LIMIT 1;
        
        -- Insert migrated data
        IF existing_rtmp_url IS NOT NULL OR existing_stream_key IS NOT NULL THEN
            INSERT INTO stream_config (
                active_method,
                rtmp_server_url,
                rtmp_stream_key,
                stream_title,
                stream_status
            ) VALUES (
                'rtmp',
                COALESCE(existing_rtmp_url, 'rtmp://live.restream.io/live'),
                existing_stream_key,
                COALESCE(existing_title, 'Andar Bahar Live'),
                COALESCE(existing_status, 'offline')
            ) ON CONFLICT (id) DO NOTHING;
            
            RAISE NOTICE 'Migrated existing stream settings';
        END IF;
    END IF;
END $$;

-- =====================================================
-- 6. Insert default configuration if table is empty
-- =====================================================
INSERT INTO stream_config (
    active_method,
    rtmp_server_url,
    rtmp_stream_key,
    stream_title,
    stream_status
)
SELECT 
    'rtmp',
    'rtmp://live.restream.io/live',
    're_10541509_eventd4960ba1734c49369fc0d114295801a0',
    'Andar Bahar Live',
    'offline'
WHERE NOT EXISTS (SELECT 1 FROM stream_config LIMIT 1);

-- =====================================================
-- 7. Create updated_at trigger
-- =====================================================
CREATE OR REPLACE FUNCTION update_stream_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS stream_config_updated_at ON stream_config;
CREATE TRIGGER stream_config_updated_at
    BEFORE UPDATE ON stream_config
    FOR EACH ROW
    EXECUTE FUNCTION update_stream_config_updated_at();

-- =====================================================
-- 8. Create function to get active stream config
-- =====================================================
CREATE OR REPLACE FUNCTION get_active_stream_config()
RETURNS TABLE (
    id UUID,
    active_method VARCHAR(10),
    stream_status VARCHAR(20),
    stream_title VARCHAR(255),
    rtmp_player_url VARCHAR(255),
    webrtc_room_id VARCHAR(100),
    viewer_count INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        sc.id,
        sc.active_method,
        sc.stream_status,
        sc.stream_title,
        sc.rtmp_player_url,
        sc.webrtc_room_id,
        sc.viewer_count
    FROM stream_config sc
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 9. Grant permissions (adjust as needed)
-- =====================================================
-- Grant SELECT to authenticated users (players can view stream config)
GRANT SELECT ON stream_config TO authenticated;
GRANT SELECT ON stream_sessions TO authenticated;

-- Admin users need full access (handle via RLS or backend)

-- =====================================================
-- 10. Add comments for documentation
-- =====================================================
COMMENT ON TABLE stream_config IS 'Dual streaming configuration supporting both RTMP and WebRTC methods';
COMMENT ON TABLE stream_sessions IS 'Tracks individual streaming sessions for analytics';

COMMENT ON COLUMN stream_config.active_method IS 'Currently active streaming method: rtmp or webrtc';
COMMENT ON COLUMN stream_config.rtmp_stream_key IS 'RTMP stream key - should be kept secure';
COMMENT ON COLUMN stream_config.webrtc_room_id IS 'WebRTC room identifier for signaling';

COMMIT;

-- =====================================================
-- Verification queries (run after migration)
-- =====================================================
-- SELECT * FROM stream_config;
-- SELECT * FROM stream_sessions;
-- SELECT * FROM get_active_stream_config();
