-- Configure Restream.io Live Stream Settings
-- RTMP URL: rtmp://live.restream.io/live
-- Stream Key: re_10541509_eventd4960ba1734c49369fc0d114295801a0

-- Update stream settings with Restream configuration
INSERT INTO stream_settings (setting_key, setting_value, created_at, updated_at) VALUES
('restream_rtmp_url', 'rtmp://live.restream.io/live', NOW(), NOW()),
('restream_stream_key', 're_10541509_eventd4960ba1734c49369fc0d114295801a0', NOW(), NOW()),
('stream_title', 'Andar Bahar Live', NOW(), NOW()),
('stream_status', 'live', NOW(), NOW()),
('last_stream_check', NOW(), NOW(), NOW())
ON CONFLICT (setting_key) DO UPDATE SET
  setting_value = EXCLUDED.setting_value,
  updated_at = NOW();

-- Verify the configuration
SELECT 
    setting_key, 
    CASE 
        WHEN setting_key = 'restream_stream_key' THEN 're_10541509_event...' 
        ELSE setting_value 
    END AS setting_value,
    updated_at 
FROM stream_settings 
WHERE setting_key IN ('restream_rtmp_url', 'restream_stream_key', 'stream_title', 'stream_status')
ORDER BY setting_key;

SELECT '✅ Restream.io configured successfully' AS status;
SELECT '🎥 Stream URL: rtmp://live.restream.io/live' AS rtmp_url;
SELECT '🔑 Stream Key: re_10541509_event***' AS stream_key;
SELECT '📺 Player will use: https://player.restream.io?token=re_10541509_event...' AS player_url;
