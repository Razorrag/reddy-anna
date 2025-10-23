# 🎥 Simplified Streaming Guide

## Overview

The streaming system has been **completely simplified** to use only:
- **RTMP URL** (e.g., `rtmp://live.restream.io/live`)
- **Stream Key** (your unique Restream key)
- **Stream Title** (display name)

All HLS, embed tokens, and fallback complexity has been removed.

---

## 🔧 How It Works

### 1. Backend Settings Page (`/backend-settings`)

**Configure your stream:**
1. Enter your **RTMP URL** (from Restream.io or other provider)
2. Enter your **Stream Key** (keep this private!)
3. Set a **Stream Title** (optional)
4. Click **Save Settings**

**Preview your stream:**
- Live preview appears automatically when streaming
- Click "Check Status" to refresh
- Click "Open Stream in New Tab" to view fullscreen

### 2. Player Game Page (`/game`)

**Stream display:**
- Shows actual live stream using Restream player
- Automatically loads settings from backend
- Displays placeholder when offline
- Auto-refreshes every 30 seconds

---

## 📋 Setup Instructions

### Step 1: Get Your Restream Credentials

1. Go to [Restream.io](https://restream.io)
2. Sign up / Log in
3. Navigate to **Settings → Channel**
4. Copy your:
   - **RTMP URL**: `rtmp://live.restream.io/live`
   - **Stream Key**: `re_XXXXXXXXX_XXXXXXXX`

### Step 2: Configure Backend Settings

1. Open `http://localhost:5000/backend-settings`
2. Paste your RTMP URL
3. Paste your Stream Key
4. Set Stream Title (e.g., "Andar Bahar Live")
5. Click **Save Settings**

### Step 3: Configure OBS Studio

1. Open OBS Studio
2. Go to **Settings → Stream**
3. Service: **Custom**
4. Server: Paste your RTMP URL
5. Stream Key: Paste your Stream Key
6. Click **Apply** then **OK**

### Step 4: Start Streaming

1. In OBS, click **Start Streaming**
2. Wait 5-10 seconds for stream to connect
3. Go to `http://localhost:5000/game`
4. Your stream should appear automatically!

---

## 🔍 Troubleshooting

### Stream Not Showing?

**Check these:**
1. ✅ RTMP URL and Stream Key saved in backend settings
2. ✅ OBS is streaming (green "Stop Streaming" button)
3. ✅ Stream status shows "LIVE" in backend settings
4. ✅ Wait 10-15 seconds after starting OBS

**Refresh the page:**
- Stream auto-refreshes every 30 seconds
- Or manually refresh browser

### Stream Shows "Not Configured"?

**Solution:**
1. Go to `/backend-settings`
2. Enter RTMP URL and Stream Key
3. Click Save
4. Refresh player page

### OBS Connection Failed?

**Common fixes:**
1. Use IP address instead of hostname:
   - ✅ `rtmp://127.0.0.1:1935/live`
   - ❌ `rtmp://localhost:1935/live`
2. Check firewall settings
3. Verify RTMP URL is correct

---

## 📊 Database Schema

Only these settings are stored:

```sql
stream_settings table:
- restream_rtmp_url     → Your RTMP server URL
- restream_stream_key   → Your stream key (private)
- stream_title          → Display title
- stream_status         → 'live' or 'offline'
- last_stream_check     → Last status update timestamp
```

---

## 🔌 API Endpoints

### GET `/api/game/stream-settings`
Returns current stream configuration:
```json
{
  "restreamRtmpUrl": "rtmp://live.restream.io/live",
  "restreamStreamKey": "re_XXXXX_XXXXX",
  "streamTitle": "Andar Bahar Live",
  "streamStatus": "offline"
}
```

### POST `/api/game/stream-settings`
Update stream configuration:
```json
{
  "restreamRtmpUrl": "rtmp://live.restream.io/live",
  "restreamStreamKey": "re_XXXXX_XXXXX",
  "streamTitle": "Andar Bahar Live"
}
```

### POST `/api/game/stream-status`
Update stream status (internal use):
```json
{
  "streamStatus": "live"
}
```

---

## 📁 Files Modified

### Backend
- `server/routes.ts` - Simplified API endpoints
- `server/storage-supabase.ts` - No changes needed

### Frontend
- `client/src/components/VideoStream.tsx` - Now displays actual stream
- `client/src/components/AdminGamePanel/SimpleStreamSettings.tsx` - Simplified UI
- `client/src/pages/backend-settings.tsx` - No changes needed

### Database
- `db/migrations/simplify_stream_settings.sql` - Cleanup migration

---

## ✅ What Was Removed

**Removed complexity:**
- ❌ HLS streaming
- ❌ Embed tokens
- ❌ Fallback URLs
- ❌ Stream provider selection
- ❌ Bitrate monitoring
- ❌ Viewer count tracking
- ❌ Multiple stream types
- ❌ Backup URLs

**What remains:**
- ✅ RTMP URL
- ✅ Stream Key
- ✅ Stream Title
- ✅ Stream Status (live/offline)

---

## 🎯 Summary

**Before:** Complex system with HLS, embed tokens, fallbacks, multiple providers
**After:** Simple RTMP URL + Stream Key → Display stream

**Configuration:** Backend Settings Page
**Display:** Automatic on Player Game Page
**Provider:** Works with Restream.io or any RTMP provider

**That's it!** 🎉
