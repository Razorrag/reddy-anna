-- 🧪 TEST YOUR RESTREAM.IO CONFIGURATION
-- Let's test if your token is working or if there's another issue

-- First, let's check what's currently in your database
SELECT setting_key, setting_value FROM stream_settings WHERE setting_key IN ('stream_url', 'stream_provider', 'restream_embed_token') ORDER BY setting_key;

-- Test 1: Use your exact iframe URL
UPDATE stream_settings SET 
    setting_value = 'https://player.restream.io?token=2123471e69ed8bf8cb11cd207c282b1',
    updated_at = NOW() 
WHERE setting_key = 'stream_url';

-- Test 2: Try alternative iframe format (without ?token=)
UPDATE stream_settings SET 
    setting_value = 'https://player.restream.io/embed/2123471e69ed8bf8cb11cd207c282b1',
    updated_at = NOW() 
WHERE setting_key = 'stream_url';

-- Test 3: Try with channel format (if token is actually a channel ID)
UPDATE stream_settings SET 
    setting_value = 'https://player.restream.io/?channel=2123471e69ed8bf8cb11cd207c282b1',
    updated_at = NOW() 
WHERE setting_key = 'stream_url';

-- Reset to your original token format
UPDATE stream_settings SET 
    setting_value = 'https://player.restream.io?token=2123471e69ed8bf8cb11cd207c282b1',
    updated_at = NOW() 
WHERE setting_key = 'stream_url';

-- Update other settings
UPDATE stream_settings SET 
    setting_value = 'embed',
    updated_at = NOW() 
WHERE setting_key = 'stream_type';

UPDATE stream_settings SET 
    setting_value = 'restream',
    updated_at = NOW() 
WHERE setting_key = 'stream_provider';

UPDATE stream_settings SET 
    setting_value = 'Andar Bahar Live - Your Stream',
    updated_at = NOW() 
WHERE setting_key = 'stream_title';

-- Ensure your stream key is saved
UPDATE stream_settings SET 
    setting_value = 're_10541509_eventd4960ba1734c49369fc0d114295801a0',
    updated_at = NOW() 
WHERE setting_key = 'restream_stream_key';

-- Disable fallback
UPDATE stream_settings SET 
    setting_value = 'false',
    updated_at = NOW() 
WHERE setting_key = 'enable_fallback';

-- Verify the configuration
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
    'restream_stream_key',
    'enable_fallback'
)
ORDER BY setting_key;

-- Test results
SELECT 
    '🧪 RESTREAM.IO TEST CONFIGURATION' as test_status,
    'Token: 2123471e69ed8bf8cb11cd207c282b1' as token_used,
    'Stream Key: re_10541509_eventd4960ba1734c49369fc0d114295801a0' as stream_key,
    'If this still shows errors, the token may be expired or invalid' as note;

-- Troubleshooting info
SELECT 
    '🔧 TROUBLESHOOTING:' as troubleshooting,
    '1. Check if token is valid in Restream.io dashboard' as step1,
    '2. Ensure stream is active in Restream.io' as step2,
    '3. Try streaming to Restream.io first with OBS' as step3,
    '4. Then check if embed works' as step4;
