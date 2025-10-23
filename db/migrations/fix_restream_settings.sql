-- 🔄 Fix Restream.io Settings - Add Missing Keys
-- This migration adds all the missing Restream.io specific settings

-- Clear existing restream settings to avoid conflicts
DELETE FROM stream_settings WHERE setting_key LIKE 'restream_%';

-- Insert all required Restream.io settings
INSERT INTO stream_settings (setting_key, setting_value) VALUES
-- Core stream settings
('stream_url', 'https://player.restream.io?token=2123471e69ed8bf8cb11cd207c282b1'),
('stream_type', 'embed'),
('stream_title', 'Andar Bahar Live - Powered by Restream'),
('stream_provider', 'restream'),
('stream_status', 'offline'),
('stream_description', 'Live Andar Bahar game streaming'),

-- Restream.io specific settings
('restream_embed_token', '2123471e69ed8bf8cb11cd207c282b1'),
('restream_rtmp_url', 'rtmps://live.restream.io:1937/live'),
('restream_stream_key', 're_10541509_eventd4960ba1734c49369fc0d114295801a0'),
('restream_backup_url', 'https://player.restream.io?token=2123471e69ed8bf8cb11cd207c282b1'),

-- Fallback settings
('enable_fallback', 'true'),
('fallback_url', '/hero-images/uhd_30fps.mp4'),

-- Legacy RTMP settings (for backward compatibility)
('rtmp_url', 'rtmps://live.restream.io:1937/live'),
('rtmp_stream_key', 're_10541509_eventd4960ba1734c49369fc0d114295801a0'),

-- Stream monitoring
('stream_viewers', '0'),
('stream_bitrate', '0'),
('last_stream_check', NOW())
ON CONFLICT (setting_key) DO UPDATE SET 
    setting_value = EXCLUDED.setting_value,
    updated_at = NOW();

-- Verify the settings were inserted
SELECT 
    setting_key, 
    setting_value, 
    updated_at 
FROM stream_settings 
WHERE setting_key LIKE 'restream_%' OR setting_key IN ('stream_url', 'stream_type', 'stream_title', 'stream_provider', 'stream_status', 'stream_description', 'enable_fallback', 'fallback_url', 'rtmp_url', 'rtmp_stream_key', 'stream_viewers', 'stream_bitrate', 'last_stream_check')
ORDER BY setting_key;

SELECT '✅ Restream.io settings fixed and inserted successfully' AS status;
