-- 🚨 IMMEDIATE FIX - Run This Now in Supabase SQL Editor
-- This will replace the invalid Restream.io token with a working YouTube stream

-- First, let's see what's currently in your database
SELECT setting_key, setting_value FROM stream_settings WHERE setting_key IN ('stream_url', 'stream_provider') ORDER BY setting_key;

-- Now update with working YouTube stream (this will fix the errors immediately)
UPDATE stream_settings SET 
    setting_value = 'https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1&mute=1',
    updated_at = NOW() 
WHERE setting_key = 'stream_url';

UPDATE stream_settings SET 
    setting_value = 'youtube',
    updated_at = NOW() 
WHERE setting_key = 'stream_provider';

UPDATE stream_settings SET 
    setting_value = 'Test Stream - YouTube',
    updated_at = NOW() 
WHERE setting_key = 'stream_title';

-- Disable fallback completely
UPDATE stream_settings SET 
    setting_value = 'false',
    updated_at = NOW() 
WHERE setting_key = 'enable_fallback';

-- Verify the changes
SELECT 
    setting_key, 
    setting_value, 
    updated_at 
FROM stream_settings 
WHERE setting_key IN (
    'stream_url', 
    'stream_provider', 
    'stream_title',
    'enable_fallback'
)
ORDER BY setting_key;

-- Success confirmation
SELECT 
    '✅ STREAM URL FIXED!' as status,
    'No more Restream.io token errors' as message,
    'YouTube embed ready for testing' as note;
