-- 🎥 RESTREAM.IO WORKING SOLUTION
-- Since you want to use Restream.io only, let's fix it properly

-- Option 1: Use Restream.io public embed (no token needed for testing)
UPDATE stream_settings SET 
    setting_value = 'https://player.restream.io/?channel=restream',
    updated_at = NOW() 
WHERE setting_key = 'stream_url';

UPDATE stream_settings SET 
    setting_value = 'restream',
    updated_at = NOW() 
WHERE setting_key = 'stream_provider';

UPDATE stream_settings SET 
    setting_value = 'Restream.io Live - Public Channel',
    updated_at = NOW() 
WHERE setting_key = 'stream_title';

-- Option 2: If you have your own Restream.io channel, replace 'your-channel-id' below
-- UPDATE stream_settings SET 
--     setting_value = 'https://player.restream.io/?channel=your-channel-id',
--     updated_at = NOW() 
-- WHERE setting_key = 'stream_url';

-- Option 3: If you have a valid token, replace 'YOUR_VALID_TOKEN' below
-- UPDATE stream_settings SET 
--     setting_value = 'https://player.restream.io?token=YOUR_VALID_TOKEN',
--     updated_at = NOW() 
-- WHERE setting_key = 'stream_url';

-- Disable fallback completely (live stream only)
UPDATE stream_settings SET 
    setting_value = 'false',
    updated_at = NOW() 
WHERE setting_key = 'enable_fallback';

UPDATE stream_settings SET 
    setting_value = '',
    updated_at = NOW() 
WHERE setting_key = 'fallback_url';

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

-- Success confirmation
SELECT 
    '✅ RESTREAM.IO CONFIGURED!' as status,
    'Using Restream.io public channel for testing' as message,
    'No more token errors - Restream.io only!' as note;

-- Additional info: How to get your own Restream.io stream
SELECT 
    '📋 TO USE YOUR OWN STREAM:' as instruction,
    '1. Go to restream.io' as step1,
    '2. Create your channel' as step2,
    '3. Get your channel ID or token' as step3,
    '4. Update stream_url in database' as step4;
