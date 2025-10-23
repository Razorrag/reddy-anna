-- 🎥 Update Existing Stream Settings for Restream.io Live Stream
-- Run this script in your Supabase SQL Editor to update existing stream_settings
-- Your database already has the stream_settings table from SUPABASE_SCHEMA.sql

-- Clear old RTMP/HLS settings and insert new Restream.io configuration
DELETE FROM stream_settings WHERE setting_key IN (
    'rtmp_port', 'hls_port', 'stream_path', 'hls_fragment_time', 
    'hls_list_size', 'hls_window_size', 'enable_adaptive_bitrate',
    'max_viewers', 'stream_quality', 'enable_recording', 'recording_path'
);

-- Insert Restream.io live stream configuration
INSERT INTO stream_settings (setting_key, setting_value, created_at, updated_at) VALUES
('stream_url', 'https://player.restream.io?token=2123471e69ed8bf8cb11cd207c282b1', NOW(), NOW()),
('stream_type', 'embed', NOW(), NOW()),
('stream_title', 'Andar Bahar Live - Powered by Restream', NOW(), NOW()),
('stream_provider', 'restream', NOW(), NOW()),
('stream_status', 'offline', NOW(), NOW()),
('stream_description', 'Live Andar Bahar game streaming via Restream.io', NOW(), NOW()),
('restream_embed_token', '2123471e69ed8bf8cb11cd207c282b1', NOW(), NOW()),
('restream_rtmp_url', 'rtmps://live.restream.io:1937/live', NOW(), NOW()),
('restream_stream_key', 're_10541509_eventd4960ba1734c49369fc0d114295801a0', NOW(), NOW()),
('restream_backup_url', 'https://player.restream.io?token=2123471e69ed8bf8cb11cd207c282b1', NOW(), NOW()),
('enable_fallback', 'false', NOW(), NOW()), -- Disabled since we want live stream only
('fallback_url', '', NOW(), NOW()), -- Empty since no fallback
('rtmp_url', 'rtmps://live.restream.io:1937/live', NOW(), NOW()),
('rtmp_stream_key', 're_10541509_eventd4960ba1734c49369fc0d114295801a0', NOW(), NOW()),
('stream_viewers', '0', NOW(), NOW()),
('stream_bitrate', '0', NOW(), NOW()),
('last_stream_check', NOW(), NOW())
ON CONFLICT (setting_key) DO UPDATE SET
    setting_value = EXCLUDED.setting_value,
    updated_at = NOW();

-- Verify the configuration
SELECT 
    setting_key, 
    setting_value, 
    updated_at 
FROM stream_settings 
WHERE setting_key IN (
    'stream_url', 
    'stream_type', 
    'stream_provider', 
    'restream_embed_token',
    'restream_rtmp_url',
    'restream_stream_key',
    'enable_fallback'
)
ORDER BY setting_key;

-- Success message
SELECT 
    '✅ Stream settings updated for LIVE STREAM ONLY!' as status,
    'Restream.io integration ready' as message,
    COUNT(*) as settings_updated
FROM stream_settings 
WHERE setting_key IN ('stream_url', 'stream_type', 'stream_provider');
