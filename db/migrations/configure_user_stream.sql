-- Configure user's specific RTMP stream settings
-- This migration sets up the provided RTMP credentials

-- Update stream settings with user's specific RTMP configuration
UPDATE stream_settings 
SET setting_value = 'rtmp://live.restream.io/live',
    updated_at = NOW()
WHERE setting_key = 'restream_rtmp_url';

UPDATE stream_settings 
SET setting_value = 're_10541509_eventd4960ba1734c49369fc0d114295801a0',
    updated_at = NOW()
WHERE setting_key = 'restream_stream_key';

UPDATE stream_settings 
SET setting_value = 'Andar Bahar Live Game',
    updated_at = NOW()
WHERE setting_key = 'stream_title';

-- Insert default settings if they don't exist
INSERT INTO stream_settings (setting_key, setting_value, created_at, updated_at)
VALUES 
  ('restream_rtmp_url', 'rtmp://live.restream.io/live', NOW(), NOW()),
  ('restream_stream_key', 're_10541509_eventd4960ba1734c49369fc0d114295801a0', NOW(), NOW()),
  ('stream_title', 'Andar Bahar Live Game', NOW(), NOW()),
  ('stream_status', 'offline', NOW(), NOW())
ON CONFLICT (setting_key) DO UPDATE SET
  setting_value = EXCLUDED.setting_value,
  updated_at = NOW();

-- Update last stream check time
INSERT INTO stream_settings (setting_key, setting_value, created_at, updated_at)
VALUES ('last_stream_check', NOW()::text, NOW(), NOW())
ON CONFLICT (setting_key) DO UPDATE SET
  setting_value = EXCLUDED.setting_value,
  updated_at = NOW();
