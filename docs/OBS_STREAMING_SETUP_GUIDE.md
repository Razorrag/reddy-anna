# OBS Live Streaming Setup Guide

## Overview

This guide explains how to set up OBS Studio to stream live video to your Andar Bahar game application.

## Architecture

```
OBS Studio → RTMP (Port 1935) → Node Media Server → HLS Transcoding → 
Express Proxy (/stream) → Player Browser (HLS.js)
```

## Prerequisites

- OBS Studio installed on your computer
- Application deployed and running
- FFmpeg installed on server (automatic on Render)

## Step 1: Configure OBS Studio

### 1.1 Open OBS Settings
1. Open OBS Studio
2. Go to **Settings** → **Stream**

### 1.2 Configure Stream Settings
- **Service:** Custom
- **Server:** 
  - **Local Development:** `rtmp://localhost:1935/live`
  - **Production (Render):** `rtmp://your-app-name.onrender.com:1935/live`
- **Stream Key:** Leave blank or use custom key (optional)

### 1.3 Configure Output Settings
1. Go to **Settings** → **Output**
2. Set **Output Mode** to **Advanced**
3. **Streaming** tab:
   - **Encoder:** x264 or Hardware encoder (NVENC/QuickSync)
   - **Rate Control:** CBR
   - **Bitrate:** 2500-4000 Kbps (adjust based on upload speed)
   - **Keyframe Interval:** 2 seconds
   - **Preset:** veryfast (for x264)

### 1.4 Configure Video Settings
1. Go to **Settings** → **Video**
2. **Base (Canvas) Resolution:** 1920x1080
3. **Output (Scaled) Resolution:** 1280x720 (recommended for streaming)
4. **FPS:** 30 (or 60 for smoother gameplay)

### 1.5 Configure Audio Settings
1. Go to **Settings** → **Audio**
2. **Sample Rate:** 48 kHz
3. **Channels:** Stereo

## Step 2: Set Up Your Scene

### 2.1 Add Video Source
1. In **Sources** panel, click **+**
2. Add **Video Capture Device** (for webcam)
3. Or add **Game Capture** (for screen capture)
4. Or add **Window Capture** (for specific window)

### 2.2 Add Game Elements (Optional)
- Add **Text** overlays for game information
- Add **Image** for logo or branding
- Add **Browser Source** for dynamic content

### 2.3 Arrange Layout
- Position and resize sources as needed
- Use **Transform** → **Edit Transform** for precise positioning

## Step 3: Test Stream Locally

### 3.1 Start Local Server
```bash
npm run dev
```

### 3.2 Start Streaming in OBS
1. Click **Start Streaming** in OBS
2. Check OBS status bar - should show "Live" with green indicator
3. Monitor bitrate and dropped frames

### 3.3 Verify Stream in Browser
1. Open browser to `http://localhost:5000`
2. Navigate to player game page
3. You should see your OBS stream appear in the video area
4. Check browser console for any HLS errors

### 3.4 Check Server Logs
Look for these messages:
```
🔴 STREAM STARTED: /live/stream
RTMP server running on port 1935
HTTP server for HLS running on port 8000
```

## Step 4: Deploy to Production

### 4.1 Important: Render Port Limitations

⚠️ **CRITICAL:** Render blocks external access to ports other than the main PORT (10000).

**This means:**
- ❌ You CANNOT stream directly to `rtmp://your-app.onrender.com:1935/live`
- ❌ RTMP port 1935 is blocked for external connections
- ✅ The internal RTMP server still works for local testing

### 4.2 Solution Options

#### Option A: Use External RTMP Service (Recommended)

**1. Restream.io (Free tier available)**
```
1. Sign up at restream.io
2. Get your RTMP URL and stream key
3. Configure OBS to stream to Restream
4. In admin panel, set stream type to 'embed'
5. Paste Restream embed code
```

**2. YouTube Live (Free)**
```
1. Go to YouTube Studio → Go Live
2. Copy RTMP URL and stream key
3. Configure OBS with YouTube settings
4. In admin panel, set stream type to 'embed'
5. Use YouTube embed URL
```

**3. Cloudflare Stream (Paid - $5/month)**
```
1. Sign up for Cloudflare Stream
2. Get RTMP ingest URL
3. Stream from OBS to Cloudflare
4. Use Cloudflare HLS URL in app
```

#### Option B: Use VPS with Open Ports

If you need full control:
1. Deploy to DigitalOcean, AWS EC2, or similar VPS
2. Open port 1935 in firewall
3. Stream directly to your server
4. Use the HLS proxy setup we implemented

### 4.3 Update Admin Panel Settings

1. Log in to admin panel at `/admin-game`
2. Go to **Settings** → **Stream Configuration**
3. Update stream settings:
   - **Stream Type:** Choose `rtmp`, `video`, or `embed`
   - **Stream URL:** Enter HLS URL or embed code
   - **RTMP URL:** For reference only (if using external service)
4. Click **Save Settings**

## Step 5: Admin Panel Configuration

### 5.1 Access Admin Panel
- URL: `https://your-app.onrender.com/admin-game`
- Or: `/game-admin` or `/admin-control`

### 5.2 Stream Settings Section

**RTMP Configuration (For Reference):**
- RTMP Server URL: `rtmp://localhost:1935/live` (internal only)
- Stream Key: (optional)
- Backup RTMP URL: (optional)

**HLS/Web Playback URLs:**
- Primary Stream URL: `/stream/live/stream.m3u8` (if using internal RTMP)
- Or external HLS URL from streaming service

**Stream Display Settings:**
- Stream Title: "Andar Bahar Live"
- Stream Status: live/offline
- Stream Description: Custom description

### 5.3 Test Connection
1. Click **Test Connection** button
2. Check if stream is accessible
3. Verify HLS playlist is loading

## Step 6: Troubleshooting

### Issue: Stream Not Appearing

**Check 1: OBS Connection**
```
- Is OBS showing "Live" status?
- Check OBS logs for connection errors
- Verify RTMP URL is correct
```

**Check 2: Server Logs**
```bash
# Look for these messages:
🔴 STREAM STARTED: /live/stream
[NodeEvent on postPublish] StreamPath=/live/stream
```

**Check 3: HLS Files Generated**
```bash
# Check if media directory has files:
ls -la media/live/
# Should see: stream.m3u8 and stream-*.ts files
```

**Check 4: Browser Console**
```javascript
// Open browser DevTools → Console
// Look for HLS.js errors
// Check network tab for .m3u8 and .ts file requests
```

### Issue: Stream Lag/Buffering

**Solution 1: Reduce Latency**
- In OBS: Settings → Advanced → Stream Delay = 0
- Reduce keyframe interval to 1 second
- Use lower resolution (720p instead of 1080p)

**Solution 2: Optimize Bitrate**
- Test your upload speed: speedtest.net
- Set OBS bitrate to 70% of upload speed
- Use CBR (Constant Bitrate) not VBR

**Solution 3: Server-Side**
- Update HLS flags in `rtmp-server.ts`:
```javascript
hlsFlags: '[hls_time=1:hls_list_size=2:hls_flags=delete_segments]'
```

### Issue: FFmpeg Not Found

**On Render:**
```bash
# FFmpeg should be installed automatically
# If not, add to render.yaml:
buildCommand: |
  apt-get update
  apt-get install -y ffmpeg
  npm install
  npm run build
```

**On Local Development:**
```bash
# macOS:
brew install ffmpeg

# Ubuntu/Debian:
sudo apt-get install ffmpeg

# Windows:
# Download from ffmpeg.org and add to PATH
```

### Issue: CORS Errors

**Solution:**
Already configured in `server/index.ts`:
```javascript
app.use('/stream', express.static(path.join(process.cwd(), 'media'), {
  setHeaders: (res, filePath) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
}));
```

### Issue: 404 on Stream URL

**Check 1: Media Directory Exists**
```bash
mkdir -p media/live
```

**Check 2: HLS Transcoding Working**
```bash
# Check server logs for FFmpeg errors
# Verify FFmpeg path is correct
```

**Check 3: Stream Path Correct**
```
OBS Stream Key: (blank) or "stream"
Results in: /live/stream.m3u8
Access at: http://localhost:5000/stream/live/stream.m3u8
```

## Step 7: Best Practices

### 7.1 Stream Quality
- **Resolution:** 1280x720 (720p) - Best balance
- **Framerate:** 30 FPS - Smooth enough, lower bandwidth
- **Bitrate:** 2500-3500 Kbps - Good quality, reasonable bandwidth
- **Encoder:** Hardware encoder if available (NVENC, QuickSync)

### 7.2 Scene Setup
- Keep scenes simple - complex scenes use more CPU
- Use hardware acceleration when possible
- Monitor CPU usage in OBS stats

### 7.3 Network
- Use wired connection, not WiFi
- Close bandwidth-heavy applications
- Monitor dropped frames in OBS

### 7.4 Backup Plan
- Have a backup video file ready
- Configure fallback stream URL in admin panel
- Test failover before going live

## Step 8: Going Live Checklist

- [ ] OBS configured with correct RTMP URL
- [ ] Test stream working locally
- [ ] Admin panel stream settings saved
- [ ] Players can see stream in browser
- [ ] Audio levels correct
- [ ] Scene layout finalized
- [ ] Backup plan ready
- [ ] Monitor system resources
- [ ] Check stream on multiple devices
- [ ] Have admin panel open for control

## API Endpoints Reference

### Get Stream Settings
```http
GET /api/game/stream-settings
```

**Response:**
```json
{
  "streamUrl": "/stream/live/stream.m3u8",
  "streamType": "rtmp",
  "streamTitle": "Andar Bahar Live",
  "streamStatus": "live",
  "rtmpUrl": "rtmp://localhost:1935/live",
  "rtmpStreamKey": ""
}
```

### Update Stream Settings
```http
POST /api/game/stream-settings
Content-Type: application/json

{
  "streamUrl": "/stream/live/stream.m3u8",
  "streamType": "rtmp",
  "streamTitle": "Andar Bahar Live",
  "streamStatus": "live"
}
```

### Get Stream Status
```http
GET /api/game/stream-status
```

**Response:**
```json
{
  "success": true,
  "streamStatus": "live",
  "streamPath": "/live/stream",
  "hlsUrl": "/stream/live/stream.m3u8",
  "viewers": 0
}
```

## Support

For issues or questions:
1. Check server logs for errors
2. Check browser console for client-side errors
3. Verify OBS is streaming successfully
4. Test with a simple video file first
5. Review the comprehensive analysis in `OBS_STREAMING_ANALYSIS_AND_FIX.md`

## Next Steps

1. **Test locally** with OBS streaming to localhost
2. **Verify** stream appears in player game page
3. **Deploy** to production (consider external RTMP service for Render)
4. **Configure** admin panel with production stream URLs
5. **Go live** and monitor performance

---

**Remember:** Due to Render's port restrictions, you'll likely need to use an external streaming service (Restream.io, YouTube Live, or Cloudflare Stream) for production deployment.
