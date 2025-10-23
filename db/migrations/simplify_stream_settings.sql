-- 🎯 Simplify Stream Settings - Remove Unnecessary Complexity
-- This migration removes all HLS/embed settings and keeps only RTMP essentials

-- Ensure we have the required RTMP settings
INSERT INTO stream_settings (setting_key, setting_value, created_at, updated_at) VALUES
('restream_rtmp_url', '', NOW(), NOW()),
('restream_stream_key', '', NOW(), NOW()),
('stream_title', 'Andar Bahar Live', NOW(), NOW()),
('stream_status', 'offline', NOW(), NOW()),
('last_stream_check', NOW(), NOW(), NOW())
ON CONFLICT (setting_key) DO UPDATE SET
  updated_at = NOW();

-- Remove all unnecessary settings (optional cleanup)
DELETE FROM stream_settings WHERE setting_key IN (
    'stream_url',
    'stream_type',
    'stream_provider',
    'stream_description',
    'restream_embed_token',
    'restream_backup_url',
    'enable_fallback',
    'fallback_url',
    'rtmp_url',
    'rtmp_stream_key',
    'stream_viewers',
    'stream_bitrate',
    'rtmp_port',
    'hls_port',
    'stream_path',
    'hls_fragment_time',
    'hls_list_size',
    'hls_window_size',
    'enable_adaptive_bitrate',
    'max_viewers',
    'stream_quality',
    'enable_recording',
    'recording_path'
);

-- Verify the simplified settings
SELECT 
    setting_key, 
    setting_value, 
    updated_at 
FROM stream_settings 
ORDER BY setting_key;

SELECT '✅ Stream settings simplified successfully' AS status;
SELECT '📡 Only RTMP URL + Stream Key configuration remains' AS message;
