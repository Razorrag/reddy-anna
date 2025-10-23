-- 🎥 Update Stream Settings for Restream.io Integration
-- This migration updates the stream_settings table with Restream configuration

-- Update existing stream settings with Restream configuration
UPDATE stream_settings SET setting_value = 'https://player.restream.io?token=2123471e69ed8bf8cb11cd207c282b1' WHERE setting_key = 'stream_url';

UPDATE stream_settings SET setting_value = 'embed' WHERE setting_key = 'stream_type';

UPDATE stream_settings SET setting_value = 'Andar Bahar Live - Powered by Restream' WHERE setting_key = 'stream_title';

-- Add new Restream-specific settings
INSERT INTO stream_settings (setting_key, setting_value) VALUES
('restream_embed_token', '2123471e69ed8bf8cb11cd207c282b1'),
('restream_rtmp_url', 'rtmps://live.restream.io:1937/live'),
('restream_stream_key', 're_10541509_eventd4960ba1734c49369fc0d114295801a0'),
('restream_backup_url', 'https://player.restream.io?token=2123471e69ed8bf8cb11cd207c282b1'),
('stream_provider', 'restream'),
('enable_fallback', 'true'),
('stream_status', 'offline'),
('stream_viewers', '0'),
('stream_bitrate', '0'),
('last_stream_check', 'NOW()')
ON CONFLICT (setting_key) DO UPDATE SET 
    setting_value = EXCLUDED.setting_value,
    updated_at = NOW();

-- Remove old RTMP-specific settings (optional cleanup)
DELETE FROM stream_settings WHERE setting_key IN (
    'rtmp_port',
    'hls_port', 
    'stream_path',
    'hls_fragment_time',
    'hls_list_size',
    'hls_window_size',
    'enable_adaptive_bitrate'
);

SELECT '✅ Stream settings updated for Restream.io integration' AS status;
