# 🗄️ Supabase SQL Scripts Guide - Live Stream Setup

## 🚀 Quick Setup - Run These Scripts in Order

### **Step 1: Main Schema (Required)**
Run this first if you haven't already:
```sql
-- File: reddy-anna/supabase_schema.sql
-- This creates all tables including stream_settings
```

### **Step 2: Restream.io Configuration (Required)**
Run this to set up live stream defaults:
```sql
-- File: reddy-anna/db/migrations/set_default_restream_config.sql
```

### **Step 3: Update Existing Settings (Optional)**
If you already have stream_settings and want to update:
```sql
-- File: reddy-anna/db/migrations/update_stream_settings_for_restream.sql
```

---

## 📋 Complete Script Contents

### **Script 1: Main Schema Setup**
```sql
-- Run this FIRST if you don't have tables yet
-- Location: reddy-anna/supabase_schema.sql

-- This creates:
-- ✅ stream_settings table
-- ✅ users table
-- ✅ game_sessions table
-- ✅ All other required tables
-- ✅ Default stream settings
```

### **Script 2: Restream.io Default Configuration**
```sql
-- Run this AFTER main schema
-- Location: reddy-anna/db/migrations/set_default_restream_config.sql

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
```

### **Script 3: Update Existing Settings**
```sql
-- Run this ONLY if you already have stream_settings
-- Location: reddy-anna/db/migrations/update_stream_settings_for_restream.sql

UPDATE stream_settings SET setting_value = 'https://player.restream.io?token=2123471e69ed8bf8cb11cd207c282b1' WHERE setting_key = 'stream_url';
UPDATE stream_settings SET setting_value = 'embed' WHERE setting_key = 'stream_type';

INSERT INTO stream_settings (setting_key, setting_value) VALUES
('restream_embed_token', '2123471e69ed8bf8cb11cd207c282b1'),
('restream_rtmp_url', 'rtmps://live.restream.io:1937/live'),
('restream_stream_key', 're_10541509_eventd4960ba1734c49369fc0d114295801a0'),
('stream_provider', 'restream'),
('stream_status', 'offline')
ON CONFLICT (setting_key) DO UPDATE SET 
    setting_value = EXCLUDED.setting_value,
    updated_at = NOW();
```

---

## 🎯 Which Scripts to Run?

### **🆕 New Installation**
1. Run `supabase_schema.sql` (creates all tables)
2. Run `set_default_restream_config.sql` (sets up live stream)

### **🔄 Existing Installation**
1. Run `update_stream_settings_for_restream.sql` (updates existing)
2. OR run `set_default_restream_config.sql` (resets to defaults)

### **⚡ Quick Test**
Just run this to verify stream settings:
```sql
SELECT * FROM stream_settings WHERE setting_key IN (
  'stream_url', 
  'stream_type', 
  'stream_provider', 
  'restream_embed_token'
) ORDER BY setting_key;
```

---

## 🔧 How to Run in Supabase

### **Method 1: Supabase Dashboard**
1. Go to your Supabase project
2. Click "SQL Editor" in the sidebar
3. Copy and paste the script content
4. Click "Run"

### **Method 2: Supabase CLI**
```bash
# Install Supabase CLI if not already
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref your-project-ref

# Run the script
supabase db push
```

### **Method 3: psql (if you have direct access)**
```bash
psql -h your-project-ref.supabase.co -U postgres -d postgres -f script.sql
```

---

## ✅ Verification Scripts

### **Check Stream Settings**
```sql
-- Verify all stream settings are correct
SELECT 
  setting_key, 
  setting_value, 
  updated_at 
FROM stream_settings 
WHERE setting_key IN (
  'stream_url', 
  'stream_type', 
  'stream_provider', 
  'restream_embed_token'
)
ORDER BY setting_key;
```

### **Check Table Exists**
```sql
-- Verify stream_settings table exists
SELECT table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'stream_settings' 
ORDER BY ordinal_position;
```

### **Test API Response**
```sql
-- This will be tested by the application
-- The API should return these settings when queried
```

---

## 🎥 Expected Results

After running the scripts, your `stream_settings` table should contain:

| setting_key | setting_value |
|-------------|---------------|
| stream_url | `https://player.restream.io?token=2123471e69ed8bf8cb11cd207c282b1` |
| stream_type | `embed` |
| stream_provider | `restream` |
| restream_embed_token | `2123471e69ed8bf8cb11cd207c282b1` |
| restream_rtmp_url | `rtmps://live.restream.io:1937/live` |
| restream_stream_key | `re_10541509_eventd4960ba1734c49369fc0d114295801a0` |

---

## 🚨 Troubleshooting

### **Table Doesn't Exist**
```sql
-- Run the main schema first
-- File: reddy-anna/supabase_schema.sql
```

### **Settings Not Updating**
```sql
-- Check if there are conflicts
SELECT setting_key, setting_value FROM stream_settings;

-- Delete old settings if needed
DELETE FROM stream_settings WHERE setting_key = 'your_key';

-- Re-insert with new values
```

### **Permission Errors**
- Ensure you're logged in as admin
- Check your Supabase project permissions
- Verify you're using the correct project

---

## 📞 Support

### **If Scripts Fail**
1. Check Supabase project status
2. Verify you have admin permissions
3. Check for syntax errors in SQL
4. Run each script individually

### **Expected API Response**
After setup, your API should return:
```json
{
  "streamUrl": "https://player.restream.io?token=2123471e69ed8bf8cb11cd207c282b1",
  "streamType": "embed",
  "streamProvider": "restream",
  "restreamEmbedToken": "2123471e69ed8bf8cb11cd207c282b1"
}
```

---

## 🎉 Success Criteria

✅ **Scripts run without errors**  
✅ **stream_settings table exists**  
✅ **Default Restream.io values are set**  
✅ **API returns correct stream settings**  
✅ **Live stream loads in the application**

**Once these are complete, your live stream integration is ready!** 🚀
