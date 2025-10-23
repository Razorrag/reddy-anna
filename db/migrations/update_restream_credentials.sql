-- 🔄 Update Restream.io Credentials with New Stream Details
-- This migration updates the stream settings with the new RTMP credentials

-- Update Restream RTMP URL and Stream Key with new credentials
UPDATE stream_settings SET setting_value = 'rtmp://live.restream.io/live' WHERE setting_key = 'restream_rtmp_url';

UPDATE stream_settings SET setting_value = 're_10643053_eventd64cd5dd4a144026bc377f2449320575' WHERE setting_key = 'restream_stream_key';

-- Update stream title to reflect the new stream
UPDATE stream_settings SET setting_value = 'Reddy Anna Andar Bahar Live - Stream Active' WHERE setting_key = 'stream_title';

-- Set stream status to ready for live streaming
UPDATE stream_settings SET setting_value = 'ready' WHERE setting_key = 'stream_status';

-- Update last stream check timestamp
UPDATE stream_settings SET setting_value = NOW() WHERE setting_key = 'last_stream_check';

-- Add new settings for the updated stream configuration
INSERT INTO stream_settings (setting_key, setting_value) VALUES
('restream_rtmp_server', 'rtmp://live.restream.io/live'),
('restream_stream_key_new', 're_10643053_eventd64cd5dd4a144026bc377f2449320575'),
('stream_credentials_updated', 'true'),
('stream_credentials_updated_at', NOW())
ON CONFLICT (setting_key) DO UPDATE SET 
    setting_value = EXCLUDED.setting_value,
    updated_at = NOW();

-- Verify the updates
SELECT 
    setting_key, 
    setting_value, 
    updated_at 
FROM stream_settings 
WHERE setting_key IN (
    'restream_rtmp_url', 
    'restream_stream_key', 
    'stream_title', 
    'stream_status',
    'restream_rtmp_server',
    'restream_stream_key_new'
)
ORDER BY setting_key;

SELECT '✅ Restream.io credentials updated successfully' AS status;
SELECT '📡 RTMP URL: rtmp://live.restream.io/live' AS rtmp_url;
SELECT '🔑 Stream Key: re_10643053_eventd64cd5dd4a144026bc377f2449320575' AS stream_key;
SELECT '🎬 Stream Status: Ready for live streaming' AS stream_status;
