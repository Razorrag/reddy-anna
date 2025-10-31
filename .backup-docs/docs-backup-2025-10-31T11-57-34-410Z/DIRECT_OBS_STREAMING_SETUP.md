# 🎥 Direct OBS Streaming Setup Guide

## Overview

Stream directly from OBS to your app **without any third-party services** like YouTube, Restream, or Twitch. Your stream goes directly to your server and plays in your app with minimal latency.

## Architecture

```
OBS Studio → RTMP Server (Port 1935) → HLS Conversion → Browser Player
```

- **RTMP Ingestion**: OBS sends stream to `rtmp://localhost:1935/live`
- **HLS Conversion**: Server converts RTMP to HLS using FFmpeg
- **Browser Playback**: Players watch via `http://localhost:8000/live/stream/index.m3u8`

## Prerequisites

### 1. Install FFmpeg

FFmpeg is required to convert RTMP streams to HLS format for browser playback.

#### Windows
1. Download FFmpeg from: https://www.gyan.dev/ffmpeg/builds/
2. Extract to `C:\ffmpeg`
3. Add to PATH or set in `.env`: `FFMPEG_PATH=C:/ffmpeg/bin/ffmpeg.exe`

#### macOS
```bash
brew install ffmpeg
```

#### Linux (Ubuntu/Debian)
```bash
sudo apt update
sudo apt install ffmpeg
```

#### Verify Installation
```bash
ffmpeg -version
```

### 2. Configure Environment Variables

Add to your `.env` file:
```env
FFMPEG_PATH=ffmpeg
```

Or specify full path:
```env
# Windows
FFMPEG_PATH=C:/ffmpeg/bin/ffmpeg.exe

# Linux/Mac
FFMPEG_PATH=/usr/bin/ffmpeg
```

## OBS Studio Setup

### Step 1: Open OBS Settings
1. Open OBS Studio
2. Go to **File → Settings** (or click Settings button)
3. Navigate to **Stream** section

### Step 2: Configure Stream Settings
- **Service**: Select **Custom...**
- **Server**: `rtmp://localhost:1935/live`
- **Stream Key**: `stream` (or any key you want)

### Step 3: Configure Output Settings (Optional but Recommended)
1. Go to **Output** section
2. Set **Output Mode**: Advanced
3. **Streaming** tab:
   - **Encoder**: x264 or NVENC (if you have NVIDIA GPU)
   - **Rate Control**: CBR
   - **Bitrate**: 2500-5000 Kbps (depending on your upload speed)
   - **Keyframe Interval**: 2 seconds
   - **Preset**: veryfast or faster
   - **Profile**: main
   - **Tune**: zerolatency

### Step 4: Configure Video Settings
1. Go to **Video** section
2. **Base (Canvas) Resolution**: 1920x1080
3. **Output (Scaled) Resolution**: 1280x720 or 1920x1080
4. **FPS**: 30 or 60

### Step 5: Start Streaming
1. Click **Start Streaming** button in OBS
2. Your stream will appear in the app within 2-5 seconds

## Testing the Stream

### 1. Start Your Server
```bash
npm run dev
```

You should see:
```
🎥 RTMP Server started
📡 RTMP URL: rtmp://localhost:1935/live
🔑 Stream Key: stream
🌐 HLS Playback: http://localhost:8000/live/stream/index.m3u8
```

### 2. Start OBS Streaming
Click "Start Streaming" in OBS

### 3. Check Server Logs
You should see:
```
🔴 STREAM STARTED: /live/stream
[NodeEvent on postPublish] id=... StreamPath=/live/stream
```

### 4. Open Your App
Navigate to your game page (e.g., `http://localhost:5173`)

The stream should appear automatically with:
- Loading spinner while connecting
- Live video once connected
- Error message if stream is not available

## Troubleshooting

### Stream Not Appearing

**Problem**: Black screen or "Stream Not Available" error

**Solutions**:
1. **Check FFmpeg**:
   ```bash
   ffmpeg -version
   ```
   If not found, install FFmpeg and set `FFMPEG_PATH` in `.env`

2. **Check Server Logs**:
   Look for "🔴 STREAM STARTED" message
   If missing, OBS is not connecting

3. **Check OBS Connection**:
   - Make sure Server is `rtmp://localhost:1935/live` (not `rtmp://127.0.0.1`)
   - Try changing Stream Key to something else
   - Check OBS logs for connection errors

4. **Check Ports**:
   - RTMP Port 1935 must be available
   - HTTP Port 8000 must be available
   - Run: `netstat -ano | findstr "1935"` (Windows) or `lsof -i :1935` (Mac/Linux)

### High Latency

**Problem**: 10+ seconds delay between OBS and browser

**Solutions**:
1. **OBS Settings**:
   - Set Tune to "zerolatency"
   - Set Keyframe Interval to 1-2 seconds
   - Use faster preset (veryfast, ultrafast)

2. **Browser Settings**:
   - The HLS player is configured for low latency
   - Latency should be 2-5 seconds typically

### Stream Keeps Buffering

**Problem**: Stream stutters or buffers frequently

**Solutions**:
1. **Lower Bitrate**: Reduce to 2500 Kbps in OBS
2. **Lower Resolution**: Use 1280x720 instead of 1920x1080
3. **Check CPU Usage**: Use hardware encoder (NVENC) if available
4. **Check Network**: Make sure localhost connection is stable

### OBS Shows "Connection Failed"

**Problem**: OBS can't connect to RTMP server

**Solutions**:
1. **Check Server Running**:
   ```bash
   npm run dev
   ```
   Look for "🎥 RTMP Server started"

2. **Check Firewall**:
   - Allow port 1935 in firewall
   - Windows: `netsh advfirewall firewall add rule name="RTMP" dir=in action=allow protocol=TCP localport=1935`

3. **Try Different Port**:
   - Edit `server/rtmp-server.ts`
   - Change `port: 1935` to `port: 1936`
   - Update OBS Server to `rtmp://localhost:1936/live`

## Advanced Configuration

### Multiple Stream Keys

Edit `server/rtmp-server.ts` to add authentication:

```typescript
nms.on('prePublish', (id: string, StreamPath: string, args: any) => {
  const streamKey = StreamPath.split('/').pop();
  
  // Validate stream key
  const validKeys = ['stream', 'admin-stream', 'backup-stream'];
  
  if (!validKeys.includes(streamKey)) {
    console.log('❌ Invalid stream key:', streamKey);
    let session = nms.getSession(id);
    session.reject();
  }
});
```

### Custom Stream Path

Change the HLS URL in `client/src/components/VideoStream.tsx`:

```typescript
const HLS_URL = "http://localhost:8000/live/YOUR_STREAM_KEY/index.m3u8";
```

And update OBS Stream Key to match.

### Production Deployment

For production, you'll need to:

1. **Use Public IP/Domain**:
   - OBS Server: `rtmp://your-domain.com:1935/live`
   - Or: `rtmp://your-ip-address:1935/live`

2. **Open Firewall Ports**:
   - Port 1935 (RTMP)
   - Port 8000 (HLS)

3. **Use HTTPS for HLS**:
   - Set up reverse proxy (nginx)
   - Serve HLS over HTTPS
   - Update HLS_URL to use HTTPS

4. **Add Authentication**:
   - Implement stream key validation
   - Use secure stream keys
   - Rotate keys regularly

## Performance Tips

### For Best Quality:
- **Bitrate**: 5000-8000 Kbps
- **Resolution**: 1920x1080
- **FPS**: 60
- **Encoder**: NVENC H.264 (if available)
- **Preset**: Quality

### For Best Performance:
- **Bitrate**: 2500-3500 Kbps
- **Resolution**: 1280x720
- **FPS**: 30
- **Encoder**: x264
- **Preset**: veryfast

### For Lowest Latency:
- **Keyframe Interval**: 1 second
- **Tune**: zerolatency
- **Preset**: ultrafast
- **Buffer**: Minimal

## Monitoring

### Check Active Streams
The server logs will show:
- `🔴 STREAM STARTED` when OBS connects
- `⚫ STREAM STOPPED` when OBS disconnects
- `▶️ VIEWER CONNECTED` when someone watches
- `⏹️ VIEWER DISCONNECTED` when viewer leaves

### Check Stream Health
Open in browser: `http://localhost:8000/live/stream/index.m3u8`

You should see:
```
#EXTM3U
#EXT-X-VERSION:3
#EXT-X-TARGETDURATION:2
#EXTINF:2.000000,
stream-0.ts
#EXTINF:2.000000,
stream-1.ts
```

## Support

If you encounter issues:

1. **Check Server Logs**: Look for error messages
2. **Check OBS Logs**: Help → Log Files → View Current Log
3. **Test FFmpeg**: Run `ffmpeg -version`
4. **Test Ports**: Make sure 1935 and 8000 are available
5. **Check Network**: Use `localhost` not `127.0.0.1` in OBS

## Summary

✅ **No third-party services needed**
✅ **Low latency (2-5 seconds)**
✅ **Full control over your stream**
✅ **No viewer limits**
✅ **Free forever**
✅ **Works on local network**

Your stream goes directly from OBS → Your Server → Your Players!
