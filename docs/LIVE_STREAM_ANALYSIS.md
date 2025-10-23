# 🎥 Live Stream Implementation - Deep Analysis

## Overview
The game page uses **Restream.io** as the streaming platform with RTMP URL and Stream Key configuration. This document provides a comprehensive analysis of how the live streaming works.

---

## 🏗️ Architecture Flow

```
OBS Studio → RTMP → Restream.io → Player Game Page
     ↓                    ↓              ↓
Stream Key          Backend API    VideoStream Component
```

---

## 📊 Component Breakdown

### 1. **Frontend Components**

#### **VideoStream.tsx** (Main Stream Display Component)
**Location:** `client/src/components/VideoStream.tsx`

**Purpose:** Displays the live stream to players

**Key Features:**
- Fetches stream settings from backend API (`/api/game/stream-settings`)
- Shows RTMP URL and Stream Key status
- Displays stream status (online/offline/error)
- Auto-refreshes every 30 seconds
- Shows configuration prompts if stream not set up

**Data Flow:**
```typescript
// Fetches from backend
const response = await fetch('/api/game/stream-settings');
const data = await response.json();

// Receives:
{
  restreamRtmpUrl: 'rtmps://live.restream.io:1937/live',
  restreamStreamKey: 're_10541509_eventd4960ba1734c49369fc0d114295801a0',
  streamTitle: 'Andar Bahar Live',
  streamStatus: 'offline' | 'live' | 'error'
}
```

**Current Implementation Issue:**
- **Lines 136-190:** Shows a placeholder UI with "LIVE NOW" badge and "Watch Live Stream" button
- **Does NOT embed actual video player** - just shows decorative UI
- Restream.io blocks iframe embedding, so it redirects to Restream.io website
- **This is NOT showing actual live video on the game page**

#### **VideoArea.tsx** (Video Container with Overlays)
**Location:** `client/src/components/MobileGameLayout/VideoArea.tsx`

**Purpose:** Wraps VideoStream with game overlays (timer, round info, betting status)

**Key Features:**
- Circular countdown timer overlay (center of screen)
- Round number display (top-left)
- Phase indicator (betting/dealing/complete)
- Game winner overlay
- Betting locked indicator

**Integration:**
```typescript
<VideoStream 
  isLive={gameState.phase !== 'idle'}
  title={streamTitle}
/>
```

#### **PlayerGame.tsx** (Main Player Page)
**Location:** `client/src/pages/player-game.tsx`

**Purpose:** Main game interface for players

**Stream Integration:**
- Uses `MobileGameLayout` which includes `VideoArea`
- VideoArea includes `VideoStream` component
- Stream is always visible at top of game interface

---

### 2. **Backend API**

#### **Stream Settings Endpoint**
**Location:** `server/routes.ts` (Lines 1338-1360)

**GET `/api/game/stream-settings`**
```typescript
// Returns stream configuration from database
{
  restreamRtmpUrl: settingsObj.restream_rtmp_url || '',
  restreamStreamKey: settingsObj.restream_stream_key || '',
  streamTitle: settingsObj.stream_title || 'Andar Bahar Live',
  streamStatus: settingsObj.stream_status || 'offline'
}
```

**POST `/api/game/stream-settings`**
```typescript
// Updates stream configuration
{
  restreamRtmpUrl: string,
  restreamStreamKey: string,
  streamTitle: string
}
```

**POST `/api/game/stream-status`**
```typescript
// Updates only stream status (for monitoring)
{
  streamStatus: 'live' | 'offline' | 'error'
}
```

**GET `/api/game/stream-status-check`**
```typescript
// Checks if stream is stale (no update in 5 minutes)
// Auto-updates to offline if stale
```

---

### 3. **Database Schema**

#### **stream_settings Table**
**Location:** `SUPABASE_SCHEMA.sql` (Lines 528-564)

**Structure:**
```sql
CREATE TABLE stream_settings (
    id SERIAL PRIMARY KEY,
    setting_key VARCHAR(255) UNIQUE NOT NULL,
    setting_value TEXT,
    description TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Key Settings:**
| Setting Key | Purpose | Example Value |
|------------|---------|---------------|
| `restream_rtmp_url` | RTMP server URL for OBS | `rtmps://live.restream.io:1937/live` |
| `restream_stream_key` | Stream key for authentication | `re_10541509_eventd4960ba1734c49369fc0d114295801a0` |
| `stream_title` | Display title | `Andar Bahar Live` |
| `stream_status` | Current status | `live`, `offline`, `error` |
| `restream_embed_token` | Embed token (unused) | `2123471e69ed8bf8cb11cd207c282b1` |
| `last_stream_check` | Last status check | ISO timestamp |

**Default Values:**
```sql
INSERT INTO stream_settings (setting_key, setting_value) VALUES
('restream_rtmp_url', 'rtmps://live.restream.io:1937/live'),
('restream_stream_key', 're_10541509_eventd4960ba1734c49369fc0d114295801a0'),
('stream_title', 'Andar Bahar Live'),
('stream_status', 'offline');
```

---

### 4. **Admin Configuration Panel**

#### **StreamSettingsPanel.tsx**
**Location:** `client/src/components/AdminGamePanel/StreamSettingsPanel.tsx`

**Purpose:** Admin interface to configure stream settings

**Features:**
- Display RTMP URL (read-only)
- Display Stream Key (password-masked, can toggle visibility)
- Copy RTMP settings to clipboard
- Test stream connectivity
- Save settings to database

**Hardcoded Defaults:**
```typescript
restreamRtmpUrl: 'rtmps://live.restream.io:1937/live'
restreamStreamKey: 're_10541509_eventd4960ba1734c49369fc0d114295801a0'
restreamEmbedToken: '2123471e69ed8bf8cb11cd207c282b1'
```

#### **BackendSettings.tsx**
**Location:** `client/src/components/GameAdmin/BackendSettings.tsx`

**Purpose:** Alternative admin settings page

**Features:**
- Configure RTMP server URL
- Set stream key
- Configure backup RTMP URL
- Set HLS playback URLs

---

## 🔄 Complete Data Flow

### **Setup Flow (Admin)**
1. Admin opens admin panel (`/game` or `/admin-game`)
2. Navigates to Stream Settings
3. Views RTMP URL: `rtmps://live.restream.io:1937/live`
4. Views Stream Key: `re_10541509_eventd4960ba1734c49369fc0d114295801a0`
5. Copies settings to OBS Studio
6. Saves settings to database via `POST /api/game/stream-settings`

### **Streaming Flow (OBS → Restream)**
1. OBS Studio configured with:
   - **Server:** `rtmps://live.restream.io:1937/live`
   - **Stream Key:** `re_10541509_eventd4960ba1734c49369fc0d114295801a0`
2. OBS starts streaming
3. Stream goes to Restream.io servers
4. Restream.io processes and distributes stream

### **Player View Flow**
1. Player opens game page (`/game` or `/`)
2. `PlayerGame.tsx` renders `MobileGameLayout`
3. `MobileGameLayout` renders `VideoArea`
4. `VideoArea` renders `VideoStream`
5. `VideoStream` fetches settings from `GET /api/game/stream-settings`
6. **Current Issue:** Shows placeholder UI, NOT actual video
7. Player sees "LIVE NOW" badge and "Watch Live Stream" button
8. Clicking button opens Restream.io website in new tab

### **Status Monitoring Flow**
1. Backend checks `last_stream_check` timestamp
2. If no update in 5 minutes, auto-sets status to `offline`
3. Frontend polls every 30 seconds for status updates
4. Status displayed as badge: `● ONLINE`, `● OFFLINE`, or `● ERROR`

---

## ⚠️ Critical Issues Identified

### **Issue #1: No Actual Video Playback**
**Problem:** VideoStream.tsx does NOT embed actual video player

**Current Code (Lines 136-190):**
```typescript
// Shows decorative UI only - NO VIDEO PLAYER
return (
  <div className="w-full h-full bg-gradient-to-br from-gray-900 to-black relative flex items-center justify-center">
    <div className="flex items-center gap-3 bg-red-600/20 backdrop-blur-sm px-6 py-3 rounded-full border border-red-500/30">
      <div className="w-4 h-4 bg-red-500 rounded-full animate-pulse"></div>
      <span className="text-red-400 text-xl font-bold uppercase tracking-wider">LIVE NOW</span>
    </div>
    <button onClick={() => window.open('https://restream.io/', '_blank')}>
      Watch Live Stream
    </button>
  </div>
);
```

**Why It Doesn't Work:**
- Restream.io blocks iframe embedding for security
- No video player implementation (no `<video>`, `<iframe>`, or player library)
- Just shows static UI with external link

**Impact:**
- Players cannot watch stream on game page
- Must leave game to watch on Restream.io website
- Defeats purpose of integrated live stream

### **Issue #2: Unused Embed Token**
**Problem:** Embed token stored but never used

**Database has:**
```sql
restream_embed_token: '2123471e69ed8bf8cb11cd207c282b1'
```

**But:**
- Token not sent to frontend in API response
- Frontend doesn't use it for embedding
- No player implementation to use the token

### **Issue #3: Stream Status Not Automated**
**Problem:** Stream status must be manually updated

**Current Flow:**
- Admin must manually call `POST /api/game/stream-status` with status
- No automatic detection when OBS starts/stops streaming
- No webhook from Restream.io to update status

**Impact:**
- Status often shows `offline` even when streaming
- Players don't know if stream is actually live

### **Issue #4: No HLS/RTMP Playback URL**
**Problem:** No playback URL for video player

**What's Missing:**
- Restream.io provides RTMP **input** URL (for OBS)
- But no **output** URL for players to watch
- Need HLS (.m3u8) or RTMP playback URL

**Restream.io Limitation:**
- Free tier may not provide direct playback URLs
- Requires embedding via their player widget
- Or using their API to get stream URLs

---

## 🎯 How It SHOULD Work

### **Proper Implementation Options**

#### **Option 1: Restream.io Embed Player** (Recommended)
```typescript
// Use Restream's embed player with token
<iframe
  src={`https://player.restream.io?token=${embedToken}`}
  width="100%"
  height="100%"
  frameBorder="0"
  allow="autoplay; fullscreen"
  allowFullScreen
/>
```

**Requirements:**
- Valid embed token from Restream.io dashboard
- Token must have embed permissions enabled
- May require paid Restream.io plan

#### **Option 2: HLS Video Player**
```typescript
// Use video.js or hls.js for HLS playback
import videojs from 'video.js';

<video
  ref={videoRef}
  className="video-js vjs-default-skin"
  controls
  preload="auto"
>
  <source src={hlsPlaybackUrl} type="application/x-mpegURL" />
</video>
```

**Requirements:**
- HLS playback URL from Restream.io API
- May require Restream.io API key
- Need to handle stream availability

#### **Option 3: Direct RTMP Playback**
```typescript
// Use rtmp.js or similar library
import RTMPPlayer from 'rtmp-player';

<RTMPPlayer
  url={rtmpPlaybackUrl}
  autoPlay
  controls
/>
```

**Requirements:**
- RTMP playback URL (different from input URL)
- Browser support for RTMP (limited)
- May need Flash fallback (deprecated)

---

## 🔧 Current Configuration

### **Restream.io Credentials**
```
RTMP Input URL: rtmps://live.restream.io:1937/live
Stream Key: re_10541509_eventd4960ba1734c49369fc0d114295801a0
Embed Token: 2123471e69ed8bf8cb11cd207c282b1
```

### **OBS Studio Configuration**
```
Service: Custom
Server: rtmps://live.restream.io:1937/live
Stream Key: re_10541509_eventd4960ba1734c49369fc0d114295801a0
```

### **Database Configuration**
```sql
-- Check current settings
SELECT setting_key, setting_value 
FROM stream_settings 
WHERE setting_key IN (
  'restream_rtmp_url', 
  'restream_stream_key', 
  'restream_embed_token',
  'stream_status'
);
```

---

## 📝 Recommendations

### **Immediate Actions**

1. **Verify Restream.io Account**
   - Check if embed token is valid
   - Verify account has embed permissions
   - Check if stream is configured in Restream dashboard

2. **Implement Actual Video Player**
   - Try iframe embed with token
   - If blocked, request HLS URL from Restream.io API
   - Implement video.js or similar player

3. **Add Stream Status Webhook**
   - Configure Restream.io webhook to call your API
   - Auto-update status when stream starts/stops
   - Notify players in real-time

4. **Test Stream Flow**
   - Start OBS with configured settings
   - Verify stream appears in Restream.io dashboard
   - Test if embed token works in iframe
   - Check if players can see video

### **Long-term Improvements**

1. **Self-hosted RTMP Server**
   - Use Node-Media-Server for RTMP input
   - Generate HLS output for playback
   - Full control over streaming pipeline

2. **Stream Health Monitoring**
   - Monitor bitrate, FPS, dropped frames
   - Alert admin if stream quality degrades
   - Auto-restart on connection loss

3. **Multi-quality Streaming**
   - Provide 1080p, 720p, 480p options
   - Adaptive bitrate based on player connection
   - Reduce buffering for slow connections

4. **Stream Recording**
   - Auto-record all streams
   - Provide replay functionality
   - Archive for compliance/review

---

## 🐛 Debugging Steps

### **Check if Stream is Configured**
```bash
# API call
curl http://localhost:5000/api/game/stream-settings

# Expected response
{
  "restreamRtmpUrl": "rtmps://live.restream.io:1937/live",
  "restreamStreamKey": "re_10541509_eventd4960ba1734c49369fc0d114295801a0",
  "streamTitle": "Andar Bahar Live",
  "streamStatus": "offline"
}
```

### **Check Database Settings**
```sql
SELECT * FROM stream_settings 
WHERE setting_key LIKE 'restream%' OR setting_key = 'stream_status';
```

### **Test Embed Token**
```html
<!-- Open in browser -->
<iframe 
  src="https://player.restream.io?token=2123471e69ed8bf8cb11cd207c282b1"
  width="800" 
  height="450"
></iframe>
```

### **Check OBS Connection**
1. Open OBS Studio
2. Settings → Stream
3. Verify Server and Stream Key match database
4. Start Streaming
5. Check OBS output for connection errors
6. Verify stream appears in Restream.io dashboard

---

## 📚 Related Files

### **Frontend**
- `client/src/components/VideoStream.tsx` - Main stream component
- `client/src/components/MobileGameLayout/VideoArea.tsx` - Video container
- `client/src/pages/player-game.tsx` - Player game page
- `client/src/components/AdminGamePanel/StreamSettingsPanel.tsx` - Admin config

### **Backend**
- `server/routes.ts` (Lines 1338-1440) - Stream API endpoints
- `server/storage-supabase.ts` (Lines 659-696) - Database operations

### **Database**
- `SUPABASE_SCHEMA.sql` (Lines 528-564) - Table schema
- `docs/YOUR_RESTREAM_CONFIG.sql` - Configuration script
- `docs/UPDATE_EXISTING_STREAM_SETTINGS.sql` - Update script

### **Documentation**
- `docs/OBS_CONNECTION_FIX.md` - OBS troubleshooting
- `FIX_OBS_NOW.md` - Quick OBS fix guide

---

## ✅ Summary

**Current State:**
- RTMP URL and Stream Key properly configured
- Backend API working correctly
- Database storing settings properly
- Admin panel functional
- **BUT: No actual video playback on game page**

**Root Cause:**
- VideoStream.tsx shows placeholder UI only
- No video player implementation
- Restream.io iframe embedding may be blocked
- Need proper embed token usage or HLS URL

**Next Steps:**
1. Test if embed token works in iframe
2. If not, request HLS URL from Restream.io
3. Implement proper video player (video.js recommended)
4. Add stream status automation
5. Test complete flow from OBS to player view

---

**Generated:** $(date)
**Version:** 1.0
**Status:** Analysis Complete - Implementation Needed
