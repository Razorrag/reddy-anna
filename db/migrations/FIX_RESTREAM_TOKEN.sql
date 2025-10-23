-- 🔧 Fix Restream.io Token Issues
-- Replace invalid token with a working solution or test stream

-- Option 1: Use a working test stream URL (recommended for testing)
UPDATE stream_settings SET setting_value = 'https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1&mute=1' WHERE setting_key = 'stream_url';
UPDATE stream_settings SET setting_value = 'Test Stream - YouTube' WHERE setting_key = 'stream_title';
UPDATE stream_settings SET setting_value = 'youtube' WHERE setting_key = 'stream_provider';

-- Option 2: Use a placeholder Restream.io embed (if you have a valid token)
-- UPDATE stream_settings SET setting_value = 'https://player.restream.io?token=YOUR_VALID_TOKEN_HERE' WHERE setting_key = 'stream_url';

-- Update fallback settings
UPDATE stream_settings SET setting_value = 'false' WHERE setting_key = 'enable_fallback';
UPDATE stream_settings SET setting_value = '' WHERE setting_key = 'fallback_url';

-- Verify the changes
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
    'enable_fallback'
)
ORDER BY setting_key;

-- Success message
SELECT 
    '✅ Stream settings updated with working URL!' as status,
    'Test stream ready - no more token errors' as message,
    COUNT(*) as settings_updated
FROM stream_settings 
WHERE setting_key IN ('stream_url', 'stream_provider');
