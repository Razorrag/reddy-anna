# 🔍 DIAGNOSE: Why Stream Shows "Loading stream..." Forever

## Problem
You saved the stream URL in admin settings, but frontend shows "Loading stream..." forever and nothing plays.

## Possible Causes

### 1. **Stream is NOT Active** (Most Common)
```
Problem: You saved the URL but forgot to toggle "Stream Active" to ON
Fix: Go to admin settings → Toggle "Stream Active" to ON
```

### 2. **Stream Type is Wrong**
```
Problem: URL is .m3u8 but stream type is set to "iframe"
Fix: Set stream type to "video" for .m3u8 files
```

### 3. **Database Not Updating**
```
Problem: API saves but database doesn't update
Fix: Check database directly
```

### 4. **API Not Returning Data**
```
Problem: Frontend can't fetch the config
Fix: Check API response
```

### 5. **OBS Not Streaming**
```
Problem: URL is correct but no HLS files exist
Fix: Start OBS streaming
```

---

## Step-by-Step Diagnosis

### Step 1: Open Browser Console (F12)

Look for these messages:

#### ✅ Good Messages
```
🔍 VideoArea: Fetching stream config from /api/stream/simple-config...
🔍 VideoArea: API Response: {success: true, data: {...}}
🎥 VideoArea: Stream config loaded: {streamUrl: "...", isActive: true}
✅ VideoArea: Rendering VIDEO stream: https://...
```

#### ❌ Bad Messages
```
⚠️ Stream is NOT ACTIVE! Toggle "Stream Active" in admin settings.
⚠️ Stream URL is EMPTY! Enter a URL in admin settings.
❌ VideoArea: Stream NOT showing because: {isActive: false}
```

### Step 2: Check What Console Says

#### If you see: `isActive: false`
```
Problem: Stream is not active
Fix:
1. Go to admin stream settings
2. Toggle "Stream Active" to ON
3. Click Save
4. Refresh player page
```

#### If you see: `hasUrl: false` or `streamUrl: ""`
```
Problem: URL didn't save
Fix:
1. Check database (see below)
2. Re-save URL in admin settings
3. Make sure you clicked "Save Configuration"
```

#### If you see: `streamLoading: true` forever
```
Problem: API not responding
Fix:
1. Check if server is running: pm2 status
2. Check server logs: pm2 logs
3. Test API manually (see below)
```

---

## Quick Checks

### Check 1: Test API Directly

Open browser console and run:
```javascript
fetch('/api/stream/simple-config')
  .then(r => r.json())
  .then(d => console.log('API Response:', d));
```

**Expected Response:**
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

**If you get:**
```json
{
  "success": true,
  "data": {
    "streamUrl": "",
    "isActive": false
  }
}
```
→ **Stream is not configured or not active!**

### Check 2: Verify Database

SSH to server and check:
```bash
ssh root@89.42.231.35

# Connect to database
psql -U postgres -d your_database_name

# Check stream config
SELECT * FROM simple_stream_config;
```

**Expected Output:**
```
 id | stream_url                                      | stream_type | is_active | is_paused
----+-------------------------------------------------+-------------+-----------+-----------
  1 | https://rajugarikossu.com/live/test/index.m3u8 | video       | t         | f
```

**If `is_active` is `f` (false):**
```sql
UPDATE simple_stream_config SET is_active = true WHERE id = 1;
```

**If `stream_url` is empty:**
```sql
UPDATE simple_stream_config 
SET stream_url = 'https://rajugarikossu.com/live/test/index.m3u8',
    stream_type = 'video',
    is_active = true
WHERE id = 1;
```

### Check 3: Verify HLS Files Exist

```bash
ssh root@89.42.231.35
ls -lh /var/www/andar-bahar/reddy-anna/live_stream/media/live/test/
```

**Expected Output:**
```
-rw-r--r-- 1 root root  123 Nov 18 16:42 index.m3u8
-rw-r--r-- 1 root root  45K Nov 18 16:42 index0.ts
-rw-r--r-- 1 root root  47K Nov 18 16:42 index1.ts
-rw-r--r-- 1 root root  46K Nov 18 16:42 index2.ts
-rw-r--r-- 1 root root  48K Nov 18 16:42 index3.ts
```

**If directory is empty:**
→ **OBS is not streaming! Start OBS.**

### Check 4: Test Stream URL Directly

Open in browser:
```
https://rajugarikossu.com/live/test/index.m3u8
```

**Expected:** You should see M3U8 playlist content like:
```
#EXTM3U
#EXT-X-VERSION:3
#EXT-X-TARGETDURATION:2
#EXT-X-MEDIA-SEQUENCE:123
#EXTINF:1.000000,
index123.ts
#EXTINF:1.000000,
index124.ts
...
```

**If you get 404:**
→ **OBS not streaming or NGINX config wrong**

---

## Common Issues & Fixes

### Issue 1: "Loading stream..." Forever

**Diagnosis:**
```javascript
// In browser console (F12)
console.log('streamLoading:', document.querySelector('[class*="Loading"]'));
```

**Possible Causes:**
1. `streamLoading` state stuck at `true`
2. API not responding
3. Infinite loop in config fetch

**Fix:**
```bash
# Restart server
ssh root@89.42.231.35
pm2 restart all

# Clear browser cache
Ctrl + Shift + Delete → Clear cache
```

### Issue 2: Stream Shows "Stream not configured"

**Diagnosis:**
Check console for:
```
❌ VideoArea: Stream NOT showing because: {
  hasConfig: true,
  isActive: false,  ← THIS IS THE PROBLEM
  hasUrl: true
}
```

**Fix:**
```
1. Go to admin stream settings
2. Toggle "Stream Active" to ON (green)
3. Click "Save Configuration"
4. Wait 2 seconds
5. Refresh player page
```

### Issue 3: Stream Shows "Stream is not active"

**Diagnosis:**
```
Console shows: "Stream is not active - Toggle ON in admin settings"
```

**Fix:**
Same as Issue 2 - toggle Stream Active to ON

### Issue 4: Saved URL but Still Shows Empty

**Diagnosis:**
```javascript
// In browser console
fetch('/api/stream/simple-config')
  .then(r => r.json())
  .then(d => console.log('streamUrl:', d.data.streamUrl));
// Shows: streamUrl: ""
```

**Possible Causes:**
1. Database didn't update
2. Wrong API endpoint
3. RLS (Row Level Security) blocking read

**Fix:**
```bash
# Check database directly
ssh root@89.42.231.35
psql -U postgres -d your_database_name

# Check RLS policies
SELECT * FROM simple_stream_config;

# If empty, insert manually:
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
) ON CONFLICT (id) DO UPDATE SET
  stream_url = EXCLUDED.stream_url,
  stream_type = EXCLUDED.stream_type,
  is_active = EXCLUDED.is_active;
```

---

## Quick Fix Checklist

Run through this checklist:

- [ ] **OBS is streaming** (green indicator, 0% dropped frames)
- [ ] **HLS files exist** (`ls /var/www/.../media/live/test/`)
- [ ] **M3U8 accessible** (open `https://rajugarikossu.com/live/test/index.m3u8` in browser)
- [ ] **Stream URL saved** (check admin settings page)
- [ ] **Stream Active = ON** (toggle is green in admin settings)
- [ ] **Stream Type = video** (for .m3u8 files)
- [ ] **Database updated** (check with SQL query)
- [ ] **API returns data** (test with fetch in console)
- [ ] **Server running** (`pm2 status` shows online)
- [ ] **Browser cache cleared** (Ctrl + Shift + Delete)

---

## Most Likely Cause

**90% of the time it's one of these:**

### 1. Stream Active is OFF ⚠️
```
Fix: Admin Settings → Toggle "Stream Active" to ON → Save
```

### 2. Stream Type is Wrong ⚠️
```
For .m3u8 files: Set "Stream Type" to "video"
For YouTube: Set "Stream Type" to "iframe"
```

### 3. OBS Not Streaming ⚠️
```
Fix: Open OBS → Click "Start Streaming"
Wait 10-15 seconds for HLS segments to generate
```

---

## Debug Commands

### Check Everything at Once

Run this in browser console (F12):
```javascript
(async () => {
  console.log('=== STREAM DEBUG ===');
  
  // 1. Check API
  const api = await fetch('/api/stream/simple-config').then(r => r.json());
  console.log('1. API Response:', api);
  console.log('   - Has URL:', !!api.data?.streamUrl);
  console.log('   - Is Active:', api.data?.isActive);
  console.log('   - Stream Type:', api.data?.streamType);
  
  // 2. Check M3U8
  try {
    const m3u8 = await fetch('https://rajugarikossu.com/live/test/index.m3u8');
    console.log('2. M3U8 Status:', m3u8.status, m3u8.ok ? '✅' : '❌');
  } catch (e) {
    console.log('2. M3U8 Error:', e.message);
  }
  
  // 3. Check current state
  console.log('3. Current Page State:');
  console.log('   - Loading:', document.querySelector('[class*="Loading"]') ? 'YES ⚠️' : 'NO ✅');
  console.log('   - Video element:', document.querySelector('video') ? 'YES ✅' : 'NO ⚠️');
  
  console.log('=== END DEBUG ===');
})();
```

**Expected Output:**
```
=== STREAM DEBUG ===
1. API Response: {success: true, data: {...}}
   - Has URL: true
   - Is Active: true
   - Stream Type: video
2. M3U8 Status: 200 ✅
3. Current Page State:
   - Loading: NO ✅
   - Video element: YES ✅
=== END DEBUG ===
```

---

## Summary

**If you see "Loading stream..." forever:**

1. **Open browser console (F12)**
2. **Look for error messages**
3. **Check if `isActive: false`** → Toggle Stream Active to ON
4. **Check if `streamUrl: ""`** → Re-save URL
5. **Run debug command** (see above)
6. **Check database** (see SQL commands)
7. **Verify OBS is streaming**

**Most common fix:**
```
Admin Settings → Toggle "Stream Active" to ON → Save → Refresh
```

**Still not working?**
Run the debug command in browser console and share the output!
