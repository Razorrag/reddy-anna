# OBS Live Streaming Analysis and Fix Plan

## Current Situation

You have an Andar Bahar game deployed on Render with OBS streaming capability, but the stream is not appearing on the player game page.

### What's Currently Implemented

1. **RTMP Server (Backend)**
   - Location: `server/rtmp-server.ts`
   - Uses `node-media-server` package (v4.1.0)
   - Configuration:
     - RTMP Port: 1935 (for OBS input)
     - HTTP Port: 8000 (for HLS output)
     - App Name: `live`
   - Server is started in `server/index.ts` line 140

2. **Video Player Component**
   - Location: `client/src/components/VideoStream.tsx`
   - Supports 3 stream types: `video`, `rtmp`, `embed`
   - Uses `hls.js` library for HLS playback
   - Converts RTMP URLs to HLS URLs automatically

3. **Admin Settings Panel**
   - Location: `client/src/components/GameAdmin/BackendSettings.tsx`
   - Has UI for configuring RTMP settings
   - Default RTMP URL: `rtmp://localhost:1936/live`
   - Has stream key input field

4. **Player Game Page**
   - Location: `client/src/pages/player-game.tsx`
   - Uses `MobileGameLayout` component
   - VideoArea component shows placeholder, NOT actual stream

## Critical Issues Identified

### Issue #1: VideoStream Component Not Used in Player Game
**Problem:** The `VideoStream.tsx` component exists but is NOT imported or used in the player game page.

**Current Flow:**
```
player-game.tsx 
  → MobileGameLayout 
    → VideoArea 
      → Shows PLACEHOLDER (gradient background)
      → NO video player at all
```

**Expected Flow:**
```
player-game.tsx 
  → MobileGameLayout 
    → VideoArea 
      → VideoStream component 
        → Actual HLS video player
```

### Issue #2: No Stream Settings API Endpoints
**Problem:** Admin panel tries to fetch/save stream settings, but endpoints don't exist.

**Missing Endpoints:**
- `GET /api/game/stream-settings` - Returns 404
- `POST /api/game/stream-settings` - Returns 404

**Exists but incomplete:**
- `GET /api/game/stream-status` - Returns hardcoded mock data

### Issue #3: RTMP to HLS Conversion Not Configured
**Problem:** `node-media-server` is running but NOT configured to convert RTMP to HLS.

**Current Config (server/rtmp-server.ts):**
```javascript
{
  rtmp: { port: 1935 },
  http: { port: 8000, mediaroot: './media' },
  relay: { ... } // Wrong configuration
}
```

**Missing:** HLS transcoding configuration

### Issue #4: Port Conflicts on Render
**Problem:** Render only exposes ONE port (PORT=10000). Internal ports 1935 and 8000 are not accessible externally.

**Current Setup:**
- Main app: Port 5000 (development) / 10000 (production)
- RTMP server: Port 1935 (blocked on Render)
- HLS server: Port 8000 (blocked on Render)

### Issue #5: Stream State Management Missing
**Problem:** No way to track if stream is live or offline.

**Missing:**
- Stream status in database
- WebSocket events for stream status
- UI updates when stream goes live/offline

## The Complete OBS → Player Flow (What Should Happen)

```
┌─────────────────────────────────────────────────────────────────┐
│                         OBS STUDIO                              │
│  Settings → Stream → Custom                                     │
│  Server: rtmp://your-app.onrender.com:1935/live               │
│  Stream Key: your-secret-key                                    │
└────────────────────┬────────────────────────────────────────────┘
                     │ RTMP Stream
                     ↓
┌─────────────────────────────────────────────────────────────────┐
│              NODE-MEDIA-SERVER (Backend)                        │
│  - Receives RTMP on port 1935                                   │
│  - Transcodes to HLS format                                     │
│  - Saves .m3u8 playlist + .ts segments to ./media/live/         │
│  - Serves HLS on port 8000                                      │
└────────────────────┬────────────────────────────────────────────┘
                     │ HLS Stream
                     ↓
┌─────────────────────────────────────────────────────────────────┐
│                   EXPRESS SERVER                                │
│  - Proxies HLS files from port 8000                             │
│  - Serves at /stream/live/stream.m3u8                           │
│  - Accessible via main app port (10000)                         │
└────────────────────┬────────────────────────────────────────────┘
                     │ HTTP Request
                     ↓
┌─────────────────────────────────────────────────────────────────┐
│              PLAYER GAME PAGE (Frontend)                        │
│  VideoStream component with HLS.js                              │
│  - Fetches .m3u8 playlist                                       │
│  - Downloads .ts video segments                                 │
│  - Plays live stream with ~5-10s latency                        │
└─────────────────────────────────────────────────────────────────┘
```

## Solution: Complete Implementation Plan

### Fix #1: Configure RTMP to HLS Transcoding

**File:** `server/rtmp-server.ts`

Add HLS transcoding configuration:

```javascript
const config = {
  rtmp: {
    port: parseInt(process.env.RTMP_SERVER_PORT || '1935'),
    chunk_size: 60000,
    gop_cache: true,
    ping: 30,
    ping_timeout: 60
  },
  http: {
    port: parseInt(process.env.RTMP_HTTP_PORT || '8000'),
    allow_origin: '*',
    mediaroot: './media'
  },
  trans: {
    ffmpeg: '/usr/bin/ffmpeg', // Render uses /usr/bin/ffmpeg
    tasks: [
      {
        app: 'live',
        hls: true,
        hlsFlags: '[hls_time=2:hls_list_size=3:hls_flags=delete_segments]',
        hlsKeep: true, // Keep segments for replay
        dash: false
      }
    ]
  }
};
```

### Fix #2: Add HLS Proxy to Main Express Server

**File:** `server/index.ts`

Add proxy middleware to serve HLS files through main port:

```javascript
import express from 'express';
import path from 'path';

// Add after other middleware, before routes
app.use('/stream', express.static(path.join(process.cwd(), 'media'), {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.m3u8')) {
      res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
      res.setHeader('Cache-Control', 'no-cache');
    } else if (filePath.endsWith('.ts')) {
      res.setHeader('Content-Type', 'video/mp2t');
      res.setHeader('Cache-Control', 'public, max-age=3600');
    }
  }
}));
```

### Fix #3: Integrate VideoStream Component into Player Game

**File:** `client/src/components/MobileGameLayout/VideoArea.tsx`

Replace placeholder with actual VideoStream:

```typescript
import { VideoStream } from '../VideoStream';
import { useEffect, useState } from 'react';

const VideoArea: React.FC<VideoAreaProps> = ({ className = '' }) => {
  const { gameState } = useGameState();
  const [streamUrl, setStreamUrl] = useState<string>('');
  const [streamType, setStreamType] = useState<'video' | 'rtmp' | 'embed'>('video');

  // Fetch stream settings
  useEffect(() => {
    fetch('/api/game/stream-settings')
      .then(res => res.json())
      .then(data => {
        setStreamUrl(data.streamUrl || '/stream/live/stream.m3u8');
        setStreamType(data.streamType || 'rtmp');
      })
      .catch(err => {
        console.error('Failed to load stream settings:', err);
        // Fallback to default HLS stream
        setStreamUrl('/stream/live/stream.m3u8');
        setStreamType('rtmp');
      });
  }, []);

  return (
    <div className={`relative bg-black rounded-lg overflow-hidden ${className}`}>
      {/* Replace placeholder with VideoStream */}
      <VideoStream 
        streamUrl={streamUrl}
        streamType={streamType}
        isLive={gameState.phase !== 'idle'}
        title="Andar Bahar Live Game"
      />
      
      {/* Keep timer overlay and other UI elements */}
      {/* ... existing timer and status overlays ... */}
    </div>
  );
};
```

### Fix #4: Add Stream Settings API Endpoints

**File:** `server/routes.ts`

Add new endpoints:

```typescript
// GET stream settings
app.get('/api/game/stream-settings', async (req, res) => {
  try {
    const settings = await storage.getStreamSettings();
    
    // Convert array to object
    const settingsObj = settings.reduce((acc, setting) => {
      acc[setting.settingKey] = setting.settingValue;
      return acc;
    }, {} as Record<string, string>);

    res.json({
      streamUrl: settingsObj.stream_url || '/stream/live/stream.m3u8',
      streamType: settingsObj.stream_type || 'rtmp',
      streamTitle: settingsObj.stream_title || 'Andar Bahar Live',
      streamStatus: settingsObj.stream_status || 'offline',
      rtmpUrl: settingsObj.rtmp_url || 'rtmp://localhost:1935/live',
      rtmpStreamKey: settingsObj.rtmp_stream_key || ''
    });
  } catch (error) {
    console.error('Error fetching stream settings:', error);
    res.status(500).json({ error: 'Failed to fetch stream settings' });
  }
});

// POST stream settings
app.post('/api/game/stream-settings', async (req, res) => {
  try {
    const { streamUrl, streamType, streamTitle, streamStatus, rtmpUrl, rtmpStreamKey } = req.body;

    // Update each setting
    if (streamUrl) await storage.updateStreamSetting('stream_url', streamUrl);
    if (streamType) await storage.updateStreamSetting('stream_type', streamType);
    if (streamTitle) await storage.updateStreamSetting('stream_title', streamTitle);
    if (streamStatus) await storage.updateStreamSetting('stream_status', streamStatus);
    if (rtmpUrl) await storage.updateStreamSetting('rtmp_url', rtmpUrl);
    if (rtmpStreamKey) await storage.updateStreamSetting('rtmp_stream_key', rtmpStreamKey);

    res.json({ success: true, message: 'Stream settings updated' });
  } catch (error) {
    console.error('Error updating stream settings:', error);
    res.status(500).json({ error: 'Failed to update stream settings' });
  }
});
```

### Fix #5: Add Stream Status Tracking

**File:** `server/rtmp-server.ts`

Add event handlers to track stream status:

```typescript
let isStreamLive = false;

nms.on('postPublish', (id: string, StreamPath: string, args: any) => {
  console.log('[Stream Started]', `StreamPath=${StreamPath}`);
  isStreamLive = true;
  
  // Broadcast to all connected clients via WebSocket
  // (Add WebSocket broadcast logic here)
});

nms.on('donePublish', (id: string, StreamPath: string, args: any) => {
  console.log('[Stream Ended]', `StreamPath=${StreamPath}`);
  isStreamLive = false;
  
  // Broadcast to all connected clients via WebSocket
});

export { nms, isStreamLive };
```

### Fix #6: Update Admin Panel Stream Configuration

**File:** `client/src/components/GameAdmin/BackendSettings.tsx`

Update default RTMP URL for production:

```typescript
const [streamSettings, setStreamSettings] = useState({
  // Use production URL when deployed
  rtmpServerUrl: import.meta.env.PROD 
    ? 'rtmp://reddy-anna-7n83.onrender.com:1935/live'
    : 'rtmp://localhost:1935/live',
  streamKey: '',
  
  // HLS playback URL (through proxy)
  primaryStreamUrl: '/stream/live/stream.m3u8',
  
  // ... other settings
});
```

## Deployment Considerations for Render

### 1. FFmpeg Installation
Render needs FFmpeg for RTMP to HLS conversion.

**Add to `render.yaml`:**
```yaml
services:
  - type: web
    name: reddy-anna
    env: node
    buildCommand: |
      apt-get update
      apt-get install -y ffmpeg
      npm install
      npm run build
    startCommand: npm start
```

### 2. Port Configuration
Only use internal ports for RTMP/HLS, proxy through main port.

**Environment Variables:**
```
PORT=10000                    # Main app (Render assigns this)
RTMP_SERVER_PORT=1935        # Internal only
RTMP_HTTP_PORT=8000          # Internal only
```

### 3. Media Directory Persistence
HLS segments are stored in `./media/live/`. This directory is ephemeral on Render.

**Options:**
- **Option A:** Accept that stream history is lost on restart (recommended for live streaming)
- **Option B:** Use Render disk storage (costs extra)
- **Option C:** Stream directly without saving segments (lower latency)

### 4. OBS Configuration for Production

**Server URL:** `rtmp://reddy-anna-7n83.onrender.com:1935/live`
**Stream Key:** Set in admin panel and use same in OBS

**Note:** Render blocks port 1935 externally. You need to:
1. Use a different RTMP relay service (like Restream.io)
2. Or use Render's internal networking if you have multiple services

## Alternative Solution: Use External RTMP Service

If Render blocks RTMP ports, use a relay service:

### Option A: Restream.io (Free tier available)
1. Sign up at restream.io
2. Get RTMP URL and stream key
3. Configure OBS to stream to Restream
4. Embed Restream player in your app

### Option B: YouTube Live (Free)
1. Create YouTube live stream
2. Get RTMP URL and key
3. Stream from OBS to YouTube
4. Embed YouTube player with `streamType: 'embed'`

### Option C: Cloudflare Stream (Paid)
1. Use Cloudflare Stream API
2. Upload or stream via RTMP
3. Get HLS URL
4. Use in VideoStream component

## Testing Checklist

- [ ] RTMP server starts without errors
- [ ] FFmpeg is installed and accessible
- [ ] HLS files are generated in `./media/live/`
- [ ] HLS proxy serves files at `/stream/live/stream.m3u8`
- [ ] VideoStream component loads in player game
- [ ] HLS.js plays the stream successfully
- [ ] Admin can update stream settings
- [ ] Stream status updates in real-time
- [ ] OBS can connect and stream
- [ ] Players see the live stream

## Quick Start Implementation Order

1. ✅ **Fix RTMP server config** (Add HLS transcoding)
2. ✅ **Add HLS proxy** (Serve through main port)
3. ✅ **Add API endpoints** (Stream settings CRUD)
4. ✅ **Integrate VideoStream** (Replace placeholder)
5. ✅ **Test locally** (OBS → localhost:1935 → player sees stream)
6. ⚠️ **Deploy to Render** (May need external RTMP relay)
7. ✅ **Configure OBS** (Point to production URL)
8. ✅ **Verify in production** (Players see live stream)

## Recommended Approach

Given Render's port restrictions, I recommend:

**Short-term (Quick Fix):**
Use YouTube Live or Restream.io embed for immediate streaming capability.

**Long-term (Full Control):**
Move to a VPS (DigitalOcean, AWS EC2) where you have full control over ports and can run your own RTMP server.

**Hybrid (Best of Both):**
Keep game logic on Render, use Cloudflare Stream or AWS MediaLive for video streaming infrastructure.
