# 🔧 Fix: Stream Settings Not Saving

## Problem

You can see the stream at `https://rajugarikossu.com/live/test/index.m3u8` but when you try to save it in admin settings, it fails with "Failed to configure" error.

## Root Causes

1. **Authentication Issue** - Admin token might be expired
2. **Database Permission** - `simple_stream_config` table might not exist or have wrong permissions
3. **Validation Error** - Backend rejecting the request

## Quick Fix Steps

### Step 1: Check if you're logged in as admin

1. Open browser console (F12)
2. Go to: https://rajugarikossu.com/admin-stream-settings
3. Look for any 401/403 errors in console
4. If you see auth errors, **logout and login again**

### Step 2: Try saving with these exact settings

```
Stream URL: https://rajugarikossu.com/live/test/index.m3u8
Stream Type: Video (MP4 / HLS .m3u8)  ← Click this button
Is Active: ON (toggle to green)
Min Viewers: 1000
Max Viewers: 1100
```

Click **Save Settings**

### Step 3: Check browser console for errors

Press F12 and look for:
- ❌ Red errors
- Network tab → Look for `/api/stream/simple-config` request
- Check the response

## Common Errors & Solutions

### Error: "streamUrl and streamType are required"
**Solution**: Make sure you filled in the Stream URL field

### Error: "Invalid streamType"
**Solution**: Click the "Video (MP4 / HLS .m3u8)" button (should be green)

### Error: "Failed to save stream configuration"
**Solution**: Database issue - need to check server logs

### Error: 401 Unauthorized
**Solution**: 
1. Logout
2. Login again as admin
3. Try saving again

### Error: 403 Forbidden
**Solution**: Your account is not admin
1. Check database: `users` table
2. Make sure your user has `role = 'admin'`

## Manual Database Fix (If needed)

If the table doesn't exist, SSH to server and run:

```bash
ssh root@89.42.231.35
```

Then run this SQL in Supabase dashboard:

```sql
-- Create table if not exists
CREATE TABLE IF NOT EXISTS simple_stream_config (
  id BIGSERIAL PRIMARY KEY,
  stream_url TEXT NOT NULL,
  stream_type TEXT NOT NULL DEFAULT 'iframe',
  is_active BOOLEAN DEFAULT false,
  is_paused BOOLEAN DEFAULT false,
  stream_title TEXT DEFAULT 'Live Game Stream',
  autoplay BOOLEAN DEFAULT true,
  muted BOOLEAN DEFAULT true,
  controls BOOLEAN DEFAULT false,
  min_viewers INTEGER,
  max_viewers INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default config
INSERT INTO simple_stream_config (
  stream_url,
  stream_type,
  is_active,
  is_paused
) VALUES (
  'https://rajugarikossu.com/live/test/index.m3u8',
  'video',
  true,
  false
) ON CONFLICT DO NOTHING;

-- Enable RLS
ALTER TABLE simple_stream_config ENABLE ROW LEVEL SECURITY;

-- Allow public read
CREATE POLICY "Allow public read" ON simple_stream_config
  FOR SELECT USING (true);

-- Allow authenticated users to update
CREATE POLICY "Allow authenticated update" ON simple_stream_config
  FOR ALL USING (true);
```

## Alternative: Direct Database Update

If admin panel keeps failing, update directly in Supabase:

1. Go to: https://supabase.com/dashboard
2. Select your project
3. Go to Table Editor → `simple_stream_config`
4. Click on the row (or insert new row)
5. Set:
   ```
   stream_url: https://rajugarikossu.com/live/test/index.m3u8
   stream_type: video
   is_active: true
   is_paused: false
   ```
6. Save

## Verify It's Working

### Check 1: API Response
```bash
curl https://rajugarikossu.com/api/stream/simple-config
```

Should return:
```json
{
  "success": true,
  "data": {
    "streamUrl": "https://rajugarikossu.com/live/test/index.m3u8",
    "streamType": "video",
    "isActive": true,
    "isPaused": false
  }
}
```

### Check 2: Player Page
1. Open: https://rajugarikossu.com
2. Login as player
3. You should see the stream playing

### Check 3: Browser Console
Press F12 on player page, look for:
```
✅ HLS.js initialized successfully
✅ HLS manifest parsed, starting playback
▶️ Video playing
```

## Still Not Working?

### Get Server Logs
```bash
ssh root@89.42.231.35
pm2 logs --lines 50
```

Look for errors when you try to save.

### Check Streaming Server
```bash
ssh root@89.42.231.35
pm2 status
# Should show "streaming-server" as "online"

# Check if HLS files exist
ls -lh /var/www/andar-bahar/reddy-anna/live_stream/media/live/test/
# Should show index.m3u8 and .ts files
```

### Restart Everything
```bash
ssh root@89.42.231.35
pm2 restart all
sudo systemctl restart nginx
```

## Quick Test Script

Run this in your browser console (F12) on admin settings page:

```javascript
// Test API directly
fetch('/api/stream/simple-config', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${localStorage.getItem('token')}`
  },
  body: JSON.stringify({
    streamUrl: 'https://rajugarikossu.com/live/test/index.m3u8',
    streamType: 'video',
    isActive: true,
    isPaused: false,
    streamTitle: 'Live Game Stream',
    autoplay: true,
    muted: true,
    controls: false,
    minViewers: 1000,
    maxViewers: 1100
  })
})
.then(r => r.json())
.then(data => console.log('✅ Response:', data))
.catch(err => console.error('❌ Error:', err));
```

If this works, the admin panel should work too.

## Summary

Most likely causes:
1. ✅ **Auth token expired** - Logout and login again
2. ✅ **Table doesn't exist** - Run SQL above
3. ✅ **Wrong permissions** - Check RLS policies

Try these in order and the stream should save successfully! 🎉
