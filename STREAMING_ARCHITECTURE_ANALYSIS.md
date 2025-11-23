# 🎥 OvenMediaEngine Streaming Architecture Analysis

## Current Date: November 23, 2025

---

## 📋 Executive Summary

After deep analysis of your streaming setup, I've identified the **complete flow** from OvenMediaEngine on your VPS (`root@srv1118275:/opt/ovenmediaengine`, IP: `72.61.170.227`) to the frontend display. Here's what I found and how to fix the stream not showing issue.

---

## 🏗️ Architecture Overview

### **System Components:**

1. **OvenMediaEngine (OME)** - Running on VPS at `72.61.170.227`
2. **Backend API** - Stream configuration endpoints
3. **Database** - `simple_stream_config` table in Supabase
4. **Frontend** - VideoArea component with HLS.js player
5. **Admin Panel** - StreamControlPanel for configuration

---

## 🔄 Complete Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│  1. ADMIN CONFIGURES STREAM                                 │
│     └─> StreamControlPanel.tsx                              │
│         └─> Enters OvenMediaEngine HLS URL                 │
│         └─> Selects stream type (iframe/video)             │
│         └─> Clicks "Save Configuration"                     │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│  2. BACKEND SAVES TO DATABASE                               │
│     └─> POST /api/stream/simple-config                      │
│         └─> server/stream-routes.ts (line 141)             │
│         └─> Validates & saves to simple_stream_config      │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│  3. PLAYER LOADS STREAM CONFIG                              │
│     └─> VideoArea.tsx (line 88: loadStreamConfig)          │
│         └─> GET /api/stream/simple-config                   │
│         └─> Receives: streamUrl, streamType, isActive, etc │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│  4. VIDEO PLAYER RENDERS                                    │
│     └─> VideoArea.tsx (line 679: renderStream)             │
│         └─> IF streamType === 'video' → <video> tag        │
│         └─> IF streamType === 'iframe' → <iframe> tag      │
│         └─> HLS.js setup (line 284-452)                    │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│  5. STREAM PLAYS                                            │
│     └─> For HLS (.m3u8): HLS.js loads & plays              │
│     └─> For iframe: Browser loads embed                    │
│     └─> Shows LIVE badge & viewer count                    │
└─────────────────────────────────────────────────────────────┘
```

---

## 🗄️ Database Schema

### **Table: `simple_stream_config`**

```sql
CREATE TABLE simple_stream_config (
  id UUID PRIMARY KEY,
  stream_url TEXT,                    -- OME HLS URL goes here
  stream_type VARCHAR(20),            -- 'iframe' or 'video'
  is_active BOOLEAN DEFAULT FALSE,    -- ⚠️ CRITICAL: Must be TRUE
  is_paused BOOLEAN DEFAULT FALSE,
  stream_title TEXT,
  autoplay BOOLEAN DEFAULT TRUE,
  muted BOOLEAN DEFAULT TRUE,
  controls BOOLEAN DEFAULT FALSE,
  min_viewers INTEGER,                -- Fake viewer count range
  max_viewers INTEGER,
  loop_mode BOOLEAN DEFAULT FALSE,    -- ⚠️ Must be FALSE for live stream
  loop_next_game_date TEXT,
  loop_next_game_time TEXT,
  loop_video_url TEXT,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

---

## 🐛 Why Stream Is Not Showing - Root Causes

### **Issue #1: Database Not Configured**
**Location:** Database table `simple_stream_config`

**Problem:** The table might be empty or have default values:
- `stream_url` = '' (empty)
- `is_active` = FALSE
- `loop_mode` = FALSE (showing "No stream configured" message)

**Evidence from code:**
```typescript
// VideoArea.tsx line 763-773
if (!streamConfig?.streamUrl) {
  return (
    <div>
      <p>No stream configured</p>
      <p>Please add a stream URL in admin settings</p>
    </div>
  );
}
```

### **Issue #2: OvenMediaEngine URL Not Set**
**Location:** Admin Panel → Stream Settings

**Problem:** Admin hasn't entered the OME HLS URL yet

**Required Format:**
```
http://72.61.170.227:8080/app/stream.m3u8
or
https://72.61.170.227:8443/app/stream.m3u8
```

### **Issue #3: Loop Mode May Be Enabled**
**Location:** StreamControlPanel.tsx line 146

**Problem:** If `loop_mode = TRUE`, it shows loop video instead of stream

**Evidence from code:**
```typescript
// VideoArea.tsx line 694-759
if (streamConfig?.loopMode) {
  return (
    <div>Loop video with "Game will resume shortly" message</div>
  );
}
```

### **Issue #4: Stream Type Mismatch**
**Problem:** HLS streams (.m3u8) MUST use `streamType = 'video'`, not 'iframe'

**Evidence from code:**
```typescript
// VideoArea.tsx line 675
const isVideoFile = url.endsWith('.m3u8');
const shouldUseVideo = streamType === 'video' || isVideoFile;
```

### **Issue #5: Mixed Content (HTTP vs HTTPS)**
**Problem:** If your site is HTTPS but OME serves HTTP, browser blocks it

**Evidence from code:**
```typescript
// VideoArea.tsx line 127-146
if (currentProtocol === 'http:' && streamUrl.startsWith('https://')) {
  streamUrl = streamUrl.replace('https://', 'http://');
}
```

---

## ✅ Complete Fix Procedure

### **Step 1: Check OvenMediaEngine Status**

SSH into your VPS:
```bash
ssh root@72.61.170.227
cd /opt/ovenmediaengine
./OvenMediaEngine -c conf/Server.xml
# Or if running as service:
systemctl status ovenmediaengine
```

### **Step 2: Get Your OME Stream URL**

Check OME configuration:
```bash
cat /opt/ovenmediaengine/conf/Server.xml | grep -A 10 "Port"
```

**Your HLS URL will be:**
```
http://72.61.170.227:8080/[app-name]/[stream-name].m3u8
```

Example:
```
http://72.61.170.227:8080/app/stream.m3u8
```

### **Step 3: Configure in Admin Panel**

1. **Login as admin** to your game
2. **Navigate to Admin Panel** (Game Control)
3. **Scroll to "Stream Settings"** section
4. **Enter your OME URL:**
   ```
   Stream URL: http://72.61.170.227:8080/app/stream.m3u8
   ```
5. **Select Stream Type:** `Video (MP4 / HLS)`
6. **Ensure Loop Mode is OFF** (toggle should be gray)
7. **Set Fake Viewer Range:** e.g., Min: 1000, Max: 1100
8. **Click "Save Configuration"**

### **Step 4: Verify Database**

Check if config was saved:
```sql
SELECT 
  stream_url, 
  stream_type, 
  is_active, 
  loop_mode,
  is_paused
FROM simple_stream_config;
```

**Expected Result:**
```
stream_url: http://72.61.170.227:8080/app/stream.m3u8
stream_type: video
is_active: true (or false, doesn't matter for display)
loop_mode: false
is_paused: false
```

### **Step 5: Test Stream in Browser**

**Direct URL Test:**
1. Open browser
2. Navigate to: `http://72.61.170.227:8080/app/stream.m3u8`
3. Should download .m3u8 file or show playlist

**If you get an error:**
- OME is not running
- Port 8080 is blocked by firewall
- Stream name is incorrect

### **Step 6: Refresh Game Page**

1. Open game as player
2. Refresh page (F5)
3. Stream should now show with:
   - 🔴 LIVE badge (top-left)
   - 👁 Viewer count (top-right)
   - ⏱ Betting timer (center, when active)

---

## 🔧 Troubleshooting Guide

### **Problem: "No stream configured" message**

**Diagnosis:**
```typescript
// Check VideoArea.tsx console logs:
// "⚠️ VideoArea: No stream URL configured"
```

**Solutions:**
1. Check database has `stream_url` value
2. Ensure URL is not empty string
3. Verify admin saved config correctly

### **Problem: Stream shows but immediately buffers/errors**

**Diagnosis:**
```typescript
// Check browser console for:
// "❌ HLS error:"
// "❌ Fatal HLS error:"
```

**Solutions:**
1. **CORS Issue:** OME must allow your domain
   ```xml
   <!-- In Server.xml -->
   <CrossDomains>
     <Url>*</Url>
   </CrossDomains>
   ```

2. **Wrong URL:** Verify .m3u8 endpoint exists
   ```bash
   curl http://72.61.170.227:8080/app/stream.m3u8
   ```

3. **No active stream:** Start pushing stream to OME via OBS

### **Problem: Black screen, no error**

**Diagnosis:**
```typescript
// Check if loop_mode is enabled
console.log(streamConfig.loopMode);
```

**Solutions:**
1. Disable loop mode in admin panel
2. Check database: `UPDATE simple_stream_config SET loop_mode = FALSE;`

### **Problem: Mixed content error**

**Browser Console:**
```
Mixed Content: The page was loaded over HTTPS, but requested an insecure resource
```

**Solutions:**
1. **Option A:** Use HTTPS for OME (recommended)
   ```
   https://72.61.170.227:8443/app/stream.m3u8
   ```

2. **Option B:** Serve game over HTTP (not recommended for production)

3. **Option C:** Use reverse proxy (nginx) to handle SSL

---

## 📊 Key Configuration Files

### **1. Backend API Routes**
**File:** `server/stream-routes.ts`
- Line 46-109: GET `/api/stream/simple-config` (fetch config)
- Line 141-263: POST `/api/stream/simple-config` (save config)
- Line 270-351: POST `/api/stream/toggle-pause` (pause/resume)

### **2. Frontend Player**
**File:** `client/src/components/MobileGameLayout/VideoArea.tsx`
- Line 88-180: `loadStreamConfig()` - Fetches config from API
- Line 284-452: HLS.js setup with ultra-low latency
- Line 679-871: `renderStream()` - Renders video/iframe based on type

### **3. Admin Control Panel**
**File:** `client/src/components/AdminGamePanel/StreamControlPanel.tsx`
- Line 48-70: Load config
- Line 72-87: Save config
- Line 89-109: Toggle pause/play

### **4. Database Migration**
**File:** `scripts/create-simple-stream-config-table.sql`
- Creates `simple_stream_config` table
- Sets default values (all FALSE/empty)

---

## 🎯 Quick Commands Reference

### **Check OME is Running:**
```bash
ssh root@72.61.170.227
ps aux | grep OvenMediaEngine
netstat -tulpn | grep 8080
```

### **Test Stream URL:**
```bash
curl -I http://72.61.170.227:8080/app/stream.m3u8
# Should return: HTTP/1.1 200 OK
```

### **View Database Config:**
```sql
SELECT * FROM simple_stream_config;
```

### **Reset Database Config:**
```sql
UPDATE simple_stream_config 
SET 
  stream_url = 'http://72.61.170.227:8080/app/stream.m3u8',
  stream_type = 'video',
  is_active = TRUE,
  loop_mode = FALSE,
  is_paused = FALSE;
```

### **Enable All OME Ports on Firewall:**
```bash
# For HLS
sudo ufw allow 8080/tcp

# For HTTPS HLS
sudo ufw allow 8443/tcp

# For RTMP ingest (if using OBS)
sudo ufw allow 1935/tcp
```

---

## 🚀 Recommended Setup for Production

### **1. Use HTTPS with SSL Certificate**
```bash
# Install Certbot
apt install certbot

# Get certificate
certbot certonly --standalone -d yourdomain.com

# Configure OME to use SSL
# Edit Server.xml to point to certificates
```

### **2. Use nginx Reverse Proxy**
```nginx
# /etc/nginx/sites-available/ome-proxy
server {
    listen 443 ssl;
    server_name yourdomain.com;
    
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    
    location /hls/ {
        proxy_pass http://127.0.0.1:8080/;
        proxy_set_header Host $host;
        add_header Access-Control-Allow-Origin *;
    }
}
```

Then use: `https://yourdomain.com/hls/app/stream.m3u8`

### **3. Configure OBS for Optimal Streaming**
```
Server: rtmp://72.61.170.227:1935/app
Stream Key: stream

Video Settings:
- Bitrate: 2500-4000 Kbps
- Keyframe Interval: 1 second
- Encoder: x264 or NVENC H.264
- Profile: main

Audio Settings:
- Bitrate: 128 Kbps
- Sample Rate: 48 kHz
```

---

## 📝 Summary & Next Steps

### **Current State:**
- ✅ Backend API ready (`/api/stream/simple-config`)
- ✅ Frontend player ready (HLS.js with ultra-low latency)
- ✅ Admin panel ready (StreamControlPanel)
- ✅ Database schema ready (`simple_stream_config`)
- ❌ Stream URL not configured in database
- ❌ OvenMediaEngine may not be accessible from frontend

### **Immediate Action Items:**

1. **Verify OME is running and accessible:**
   ```bash
   curl http://72.61.170.227:8080/
   ```

2. **Configure stream in admin panel** (as detailed in Step 3 above)

3. **Test end-to-end flow:**
   - Start OBS stream to OME
   - Verify .m3u8 URL works
   - Check game page shows stream

4. **If still not working, check browser console** for specific errors

---

## 🆘 Need More Help?

If stream still doesn't show after following this guide:

1. **Check browser console** (F12) for errors
2. **Check backend logs** for API errors
3. **Verify database** has correct config
4. **Test OME URL directly** in browser
5. **Check firewall rules** on VPS

**Most Common Issue:** Empty `stream_url` in database - fix by configuring in admin panel!

---

**Last Updated:** November 23, 2025
**Author:** Kilo Code AI Assistant