-- 🔄 Stream Settings Migration - ALREADY INCLUDED IN MAIN SCHEMA
-- ⚠️ This migration is DEPRECATED - stream_settings is already in SUPABASE_SCHEMA.sql
-- This file is kept for reference but should not be run separately

-- The stream_settings table is already created in SUPABASE_SCHEMA.sql with this structure:
-- CREATE TABLE IF NOT EXISTS stream_settings (
--     id SERIAL PRIMARY KEY,
--     setting_key VARCHAR(255) UNIQUE NOT NULL,
--     setting_value TEXT,
--     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
--     updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
-- );

-- Default settings are also already inserted in SUPABASE_SCHEMA.sql:
-- INSERT INTO stream_settings (setting_key, setting_value) VALUES
-- ('rtmp_port', '1935'),
-- ('hls_port', '8000'),
-- ('stream_path', '/live/stream'),
-- ('hls_fragment_time', '4'),
-- ('hls_list_size', '6'),
-- ('hls_window_size', '60'),
-- ('enable_adaptive_bitrate', 'false'),
-- ('max_viewers', '1000'),
-- ('stream_quality', '720p'),
-- ('enable_recording', 'false'),
-- ('recording_path', '/recordings'),
-- ('stream_title', 'Reddy Anna Andar Bahar Live'),
-- ('stream_description', 'Live Andar Bahar Game Stream');

-- ✅ Use SUPABASE_SCHEMA.sql instead of this migration file
-- This file is kept for historical reference only

SELECT '⚠️ DEPRECATED: Use SUPABASE_SCHEMA.sql instead - stream_settings already included' AS status;
