-- Migration: Set Default Restream.io Configuration
-- Purpose: Initialize stream settings with Restream.io defaults

-- Insert default Restream.io configuration settings
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
  ('enable_fallback', 'true', NOW(), NOW()),
  ('fallback_url', '/hero-images/uhd_30fps.mp4', NOW(), NOW()),
  ('rtmp_url', 'rtmps://live.restream.io:1937/live', NOW(), NOW()),
  ('rtmp_stream_key', 're_10541509_eventd4960ba1734c49369fc0d114295801a0', NOW(), NOW()),
  ('stream_viewers', '0', NOW(), NOW()),
  ('stream_bitrate', '0', NOW(), NOW()),
  ('last_stream_check', NOW(), NOW())
ON CONFLICT (setting_key) DO UPDATE SET
  setting_value = EXCLUDED.setting_value,
  updated_at = NOW();

-- Verify the configuration was set
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
  'restream_stream_key'
)
ORDER BY setting_key;

-- Log successful migration
SELECT 'DEFAULT RESTREAM CONFIGURATION SET SUCCESSFULLY' as migration_status,
       COUNT(*) as total_settings_set
FROM stream_settings;
