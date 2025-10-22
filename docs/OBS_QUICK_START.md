# OBS Quick Start Guide

## Local Development Setup (5 Minutes)

### 1. Start Your Server
```bash
npm run dev
```

### 2. Configure OBS
**Settings → Stream:**
- Service: **Custom**
- Server: `rtmp://localhost:1935/live`
- Stream Key: *(leave blank)*

**Settings → Output:**
- Bitrate: **2500 Kbps**
- Keyframe Interval: **2**

**Settings → Video:**
- Output Resolution: **1280x720**
- FPS: **30**

### 3. Add Video Source
- Click **+** in Sources
- Add **Video Capture Device** or **Display Capture**

### 4. Start Streaming
- Click **Start Streaming** in OBS
- Open browser to `http://localhost:5000`
- Navigate to player game page
- Stream should appear! 🎉

## Production Setup (Render)

### ⚠️ Important: Render Blocks Port 1935

You **cannot** stream directly to Render. Use one of these options:

### Option 1: YouTube Live (Easiest)
1. Go to YouTube Studio → **Go Live**
2. Copy RTMP URL and Stream Key
3. Configure OBS with YouTube settings
4. In admin panel: Set **Stream Type** = `embed`
5. Paste YouTube embed URL

### Option 2: Restream.io (Recommended)
1. Sign up at **restream.io** (free tier)
2. Get RTMP URL and stream key
3. Configure OBS to stream to Restream
4. In admin panel: Set **Stream Type** = `embed`
5. Use Restream embed code

### Option 3: Cloudflare Stream (Best Quality)
1. Sign up for **Cloudflare Stream** ($5/month)
2. Get RTMP ingest URL
3. Stream from OBS to Cloudflare
4. In admin panel: Use Cloudflare HLS URL

## Troubleshooting

### Stream Not Showing?
1. Check OBS shows **"Live"** indicator
2. Check server logs for: `🔴 STREAM STARTED`
3. Open browser DevTools → Console for errors
4. Verify URL: `http://localhost:5000/stream/live/stream.m3u8`

### Lag/Buffering?
- Lower bitrate to 2000 Kbps
- Reduce resolution to 720p
- Use wired internet connection

### FFmpeg Error?
```bash
# macOS:
brew install ffmpeg

# Ubuntu:
sudo apt-get install ffmpeg
```

## Quick Test

### Test HLS Stream Directly
Open in browser:
```
http://localhost:5000/stream/live/stream.m3u8
```

Should download a playlist file if stream is active.

### Test Stream Status API
```bash
curl http://localhost:5000/api/game/stream-status
```

Should return:
```json
{
  "streamStatus": "live",
  "hlsUrl": "/stream/live/stream.m3u8"
}
```

## OBS Optimal Settings

| Setting | Value | Why |
|---------|-------|-----|
| Resolution | 1280x720 | Best balance quality/bandwidth |
| FPS | 30 | Smooth, lower CPU |
| Bitrate | 2500 Kbps | Good quality, reasonable size |
| Keyframe | 2 seconds | HLS segment size |
| Encoder | NVENC/QuickSync | Hardware acceleration |
| Rate Control | CBR | Consistent quality |

## File Structure

```
media/
└── live/
    ├── stream.m3u8      ← HLS playlist
    └── stream-0.ts      ← Video segments
    └── stream-1.ts
    └── stream-2.ts
```

## URLs Reference

| Environment | RTMP Input | HLS Output |
|-------------|------------|------------|
| Local Dev | `rtmp://localhost:1935/live` | `http://localhost:5000/stream/live/stream.m3u8` |
| Production | ❌ Blocked on Render | Use external service |

## Need Help?

See full documentation:
- `docs/OBS_STREAMING_SETUP_GUIDE.md` - Complete setup guide
- `docs/OBS_STREAMING_ANALYSIS_AND_FIX.md` - Technical analysis

---

**TL;DR for Local Testing:**
1. `npm run dev`
2. OBS → Settings → Stream → Custom → `rtmp://localhost:1935/live`
3. Start Streaming
4. Open `http://localhost:5000` → See stream ✅
