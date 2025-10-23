-- 🎥 YOUR ACTUAL RESTREAM.IO CONFIGURATION
-- Using your provided stream key and iframe URL

-- Update with your actual Restream.io configuration
UPDATE stream_settings SET 
    setting_value = 'https://player.restream.io?token=2123471e69ed8bf8cb11cd207c282b1',
    updated_at = NOW() 
WHERE setting_key = 'stream_url';

UPDATE stream_settings SET 
    setting_value = 'embed',
    updated_at = NOW() 
WHERE setting_key = 'stream_type';

UPDATE stream_settings SET 
    setting_value = 'restream',
    updated_at = NOW() 
WHERE setting_key = 'stream_provider';

UPDATE stream_settings SET 
    setting_value = 'Andar Bahar Live - Powered by Restream',
    updated_at = NOW() 
WHERE setting_key = 'stream_title';

UPDATE stream_settings SET 
    setting_value = 'Live Andar Bahar game streaming via Restream.io',
    updated_at = NOW() 
WHERE setting_key = 'stream_description';

-- Your Restream.io credentials
UPDATE stream_settings SET 
    setting_value = '2123471e69ed8bf8cb11cd207c282b1',
    updated_at = NOW() 
WHERE setting_key = 'restream_embed_token';

UPDATE stream_settings SET 
    setting_value = 'rtmps://live.restream.io:1937/live',
    updated_at = NOW() 
WHERE setting_key = 'restream_rtmp_url';

UPDATE stream_settings SET 
    setting_value = 're_10541509_eventd4960ba1734c49369fc0d114295801a0',
    updated_at = NOW() 
WHERE setting_key = 'restream_stream_key';

UPDATE stream_settings SET 
    setting_value = 'https://player.restream.io?token=2123471e69ed8bf8cb11cd207c282b1',
    updated_at = NOW() 
WHERE setting_key = 'restream_backup_url';

-- RTMP settings for OBS/Streaming software
UPDATE stream_settings SET 
    setting_value = 'rtmps://live.restream.io:1937/live',
    updated_at = NOW() 
WHERE setting_key = 'rtmp_url';

UPDATE stream_settings SET 
    setting_value = 're_10541509_eventd4960ba1734c49369fc0d114295801a0',
    updated_at = NOW() 
WHERE setting_key = 'rtmp_stream_key';

-- Disable fallback (live stream only)
UPDATE stream_settings SET 
    setting_value = 'false',
    updated_at = NOW() 
WHERE setting_key = 'enable_fallback';

UPDATE stream_settings SET 
    setting_value = '',
    updated_at = NOW() 
WHERE setting_key = 'fallback_url';

-- Stream status
UPDATE stream_settings SET 
    setting_value = 'offline',
    updated_at = NOW() 
WHERE setting_key = 'stream_status';

UPDATE stream_settings SET 
    setting_value = '0',
    updated_at = NOW() 
WHERE setting_key = 'stream_viewers';

UPDATE stream_settings SET 
    setting_value = '0',
    updated_at = NOW() 
WHERE setting_key = 'stream_bitrate';

UPDATE stream_settings SET 
    setting_value = NOW(),
    updated_at = NOW() 
WHERE setting_key = 'last_stream_check';

-- Verify your configuration
SELECT 
    setting_key, 
    setting_value, 
    updated_at 
FROM stream_settings 
WHERE setting_key IN (
    'stream_url', 
    'stream_type', 
    'stream_provider', 
    'stream_title',
    'restream_embed_token',
    'restream_stream_key',
    'restream_rtmp_url',
    'enable_fallback'
)
ORDER BY setting_key;

-- Success confirmation
SELECT 
    '✅ YOUR RESTREAM.IO CONFIGURED!' as status,
    'Using your actual stream key and token' as message,
    'Ready to go live!' as note;

-- Your streaming info for OBS
SELECT 
    '📺 OBS STREAMING INFO:' as obs_info,
    'Server: rtmps://live.restream.io:1937/live' as rtmp_server,
    'Stream Key: re_10541509_eventd4960ba1734c49369fc0d114295801a0' as stream_key,
    'Your iframe: https://player.restream.io?token=2123471e69ed8bf8cb11cd207c282b1' as embed_url;
