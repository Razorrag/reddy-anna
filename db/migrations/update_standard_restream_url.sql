-- Update to standard Restream RTMP URL
-- User wants to use: rtmp://live.restream.io/live
-- Stream key: re_10541509_eventd4960ba1734c49369fc0d114295801a0

UPDATE stream_settings 
SET setting_value = 'rtmp://live.restream.io/live'
WHERE setting_key = 'restream_rtmp_url';

UPDATE stream_settings 
SET setting_value = 'rtmp://live.restream.io/live'
WHERE setting_key = 'rtmp_url';

-- Ensure stream key is set correctly
UPDATE stream_settings 
SET setting_value = 're_10541509_eventd4960ba1734c49369fc0d114295801a0'
WHERE setting_key = 'restream_stream_key';

UPDATE stream_settings 
SET setting_value = 're_10541509_eventd4960ba1734c49369fc0d114295801a0'
WHERE setting_key = 'rtmp_stream_key';

-- Insert if not exists
INSERT INTO stream_settings (setting_key, setting_value, updated_at) VALUES
('restream_rtmp_url', 'rtmp://live.restream.io/live', NOW()),
('rtmp_url', 'rtmp://live.restream.io/live', NOW()),
('restream_stream_key', 're_10541509_eventd4960ba1734c49369fc0d114295801a0', NOW()),
('rtmp_stream_key', 're_10541509_eventd4960ba1734c49369fc0d114295801a0', NOW())
ON CONFLICT (setting_key) DO UPDATE SET
  setting_value = EXCLUDED.setting_value,
  updated_at = NOW();

SELECT '✅ Updated RTMP URL to standard Restream URL: rtmp://live.restream.io/live' as result;
