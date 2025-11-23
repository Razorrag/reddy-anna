# OvenMediaEngine Configuration Analysis for VPS 72.61.170.227

## Configuration Details Extracted

Based on your Server.xml configuration:

### Critical Settings Found:

```xml
<RTMP>
    <Port>1935</Port>      ← RTMP input port for OBS
</RTMP>

<LLHLS>
    <Port>8080</Port>      ← LL-HLS output port for player
</LLHLS>

<Application>
    <Name>live</Name>      ← Application name
</Application>

<LLHLS>
    <SegmentDuration>0.5</SegmentDuration>  ← Ultra-low latency (500ms segments)
    <SegmentCount>3</SegmentCount>
    <CrossDomains>
        <Url>*</Url>       ← CORS allows all domains ✓
    </CrossDomains>
</LLHLS>
```

---

## Your Exact Stream URLs

### For Admin Panel Configuration:
```
http://72.61.170.227:8080/live/STREAM_NAME/llhls.m3u8
```

Replace `STREAM_NAME` with your chosen stream key (e.g., `game`, `stream`, `live1`)

### Common Stream URL Examples:

**Option 1 - Using "stream" as stream name:**
```
http://72.61.170.227:8080/live/stream/llhls.m3u8
```

**Option 2 - Using "game" as stream name:**
```
http://72.61.170.227:8080/live/game/llhls.m3u8
```

**Option 3 - Using "live1" as stream name:**
```
http://72.61.170.227:8080/live/live1/llhls.m3u8
```

---

## OBS Studio Configuration

### Settings → Stream:

1. **Service**: Custom
2. **Server**: `rtmp://72.61.170.227:1935/live`
3. **Stream Key**: `stream` (or `game`, `live1` - must match the URL above)

### Visual Guide:

```
┌─────────────────────────────────────────┐
│  OBS Studio - Stream Settings           │
├─────────────────────────────────────────┤
│  Service: [Custom                    ▼] │
│  Server:  rtmp://72.61.170.227:1935/live│
│  Stream Key: stream                      │
└─────────────────────────────────────────┘
```

**IMPORTANT**: The stream key in OBS must match the stream name in your LL-HLS URL!

---

## Configuration Highlights

### Ultra-Low Latency Setup ✓

Your configuration is **already optimized** for ultra-low latency:

- **Segment Duration**: 0.5 seconds (500ms)
- **Segment Count**: 3 (only keeps last 3 segments)
- **Expected Latency**: 1.5-3 seconds total
- **CORS**: Enabled for all domains

This is an **excellent** configuration for live betting/gaming!

### Bypass Mode ✓

Your configuration uses bypass mode:
```xml
<Video>
    <Bypass>true</Bypass>
</Video>
<Audio>
    <Bypass>true</Bypass>
</Audio>
```

This means:
- No transcoding (faster processing)
- Lower CPU usage
- Lower latency
- OBS encoding is used directly

**Recommendation**: Use these OBS settings for best compatibility:
- Video Codec: H.264
- Audio Codec: AAC
- Keyframe Interval: 1 second

---

## Step-by-Step Setup Guide

### Step 1: Choose Your Stream Name
Pick one of these (must be consistent everywhere):
- `stream` (simple and common)
- `game` (descriptive for gaming)
- `live1` (numbered for multiple streams)

Let's use `stream` as example.

### Step 2: Configure OBS
1. Open OBS Studio
2. Go to **Settings → Stream**
3. Service: **Custom**
4. Server: `rtmp://72.61.170.227:1935/live`
5. Stream Key: `stream`
6. Click **OK**

### Step 3: Configure Admin Panel
1. Login to your game admin panel
2. Navigate to **Stream Settings** or **Stream Control Panel**
3. Enter these values:
   - **Stream URL**: `http://72.61.170.227:8080/live/stream/llhls.m3u8`
   - **Stream Type**: Select **"Video (MP4 / HLS)"**
   - **Loop Mode**: Toggle **OFF**
   - **Min Viewers**: 1000
   - **Max Viewers**: 1100
4. Click **Save Configuration**

### Step 4: Start Streaming
1. In OBS, add your video sources (camera, screen capture, etc.)
2. Click **"Start Streaming"** button
3. Wait 5-10 seconds for stream to initialize
4. Check OBS bottom bar shows "Live" in green

### Step 5: Verify Stream Active
Run this command on VPS:
```bash
curl http://localhost:8080/live/stream/llhls.m3u8
```

**Expected output:**
```
#EXTM3U
#EXT-X-VERSION:7
#EXT-X-TARGETDURATION:1
#EXT-X-SERVER-CONTROL:CAN-BLOCK-RELOAD=YES,PART-HOLD-BACK=1.5
...
```

If you get this, stream is **ACTIVE** ✓

If you get 404, stream is **NOT ACTIVE** - check OBS

### Step 6: Test in Browser
1. Open your game page as a player
2. Stream should load automatically
3. You should see:
   - Video playing
   - LIVE badge (red indicator)
   - Viewer count (e.g., "1053 viewers")
4. Latency should be 1.5-3 seconds

---

## Verification Commands

### Check OvenMediaEngine Status
```bash
# Check if running
ps aux | grep ovenmedia

# Check ports
netstat -tulpn | grep 8080
netstat -tulpn | grep 1935

# View logs
tail -f /var/log/ovenmediaengine/ovenmediaengine.log
```

### Test Stream Endpoints

**Test RTMP input (should always respond):**
```bash
telnet 72.61.170.227 1935
```

**Test LL-HLS output (only works when stream is active):**
```bash
curl http://72.61.170.227:8080/live/stream/llhls.m3u8
```

**Check active streams:**
```bash
curl http://localhost:8081/v1/vhosts/default/apps/live/streams
```

---

## Database Configuration

After configuring in admin panel, verify with this SQL query:

```sql
SELECT 
    stream_url,
    stream_type,
    is_active,
    loop_mode,
    min_viewers,
    max_viewers
FROM simple_stream_config
LIMIT 1;
```

**Expected result:**
```
stream_url: http://72.61.170.227:8080/live/stream/llhls.m3u8
stream_type: video
is_active: true
loop_mode: false
min_viewers: 1000
max_viewers: 1100
```

If `stream_url` is NULL or empty, manually update:
```sql
UPDATE simple_stream_config
SET 
    stream_url = 'http://72.61.170.227:8080/live/stream/llhls.m3u8',
    stream_type = 'video',
    is_active = true,
    loop_mode = false,
    min_viewers = 1000,
    max_viewers = 1100;
```

---

## Troubleshooting

### Problem 1: Stream Not Loading in Browser

**Check 1: Is OBS streaming?**
- Bottom bar in OBS should show "Live" in green
- If red, click "Start Streaming"

**Check 2: Is stream active in OME?**
```bash
curl http://72.61.170.227:8080/live/stream/llhls.m3u8
```
- Should return playlist, not 404

**Check 3: Does URL match everywhere?**
- OBS Stream Key: `stream`
- Admin Panel URL: `http://72.61.170.227:8080/live/stream/llhls.m3u8`
- Stream name must be identical in both places

**Check 4: Browser console errors**
- Open F12 → Console tab
- Look for CORS errors, 404 errors, or HLS.js errors

### Problem 2: High Latency (>5 seconds)

Your current config already has:
- Segment duration: 0.5s (optimal)
- Segment count: 3 (optimal)

If latency is still high:

**Check OBS settings:**
```
Settings → Output → Streaming:
- Encoder: x264
- Rate Control: CBR
- Bitrate: 3000 Kbps
- Keyframe Interval: 1 second  ← IMPORTANT
- CPU Usage Preset: veryfast or faster
```

**Check network latency:**
```bash
ping 72.61.170.227
```
Should be <100ms

### Problem 3: Stream Buffering/Stuttering

**Increase bitrate in OBS:**
- Current: 3000 Kbps
- Try: 4000-5000 Kbps

**Check VPS resources:**
```bash
top
```
- CPU should be <80%
- Memory should have free space

**Check network bandwidth:**
- Upload from OBS to VPS needs stable connection
- Minimum 5 Mbps upload required

### Problem 4: Black Screen in Player

**Check video codec:**
- OBS must use H.264 (not HEVC/H.265)
- Browser doesn't support other codecs

**Check browser compatibility:**
- Chrome/Edge: Full support ✓
- Firefox: Full support ✓
- Safari: May need HLS native player

**Test stream in VLC:**
```
Media → Open Network Stream
URL: http://72.61.170.227:8080/live/stream/llhls.m3u8
```
If works in VLC but not browser, it's a browser/HLS.js issue

---

## Performance Optimization

### Current Configuration Analysis:

✓ **Excellent**: 0.5s segments (ultra-low latency)
✓ **Excellent**: Bypass mode (no transcoding)
✓ **Excellent**: CORS enabled
✓ **Good**: 3 segment buffer

### Recommended OBS Settings for Best Results:

```
Video:
- Base Resolution: 1920x1080
- Output Resolution: 1280x720 (lower CPU, faster encoding)
- FPS: 30 (stable) or 60 (smoother but higher bandwidth)

Output:
- Encoder: x264
- Rate Control: CBR
- Bitrate: 3000-4000 Kbps
- Keyframe Interval: 1 second
- CPU Preset: veryfast (balance) or faster (lower CPU)
- Profile: baseline or main
- Tune: zerolatency ← CRITICAL for low latency

Audio:
- Bitrate: 128-160 Kbps
- Sample Rate: 44.1 kHz or 48 kHz
```

---

## Expected Results

Once everything is configured correctly:

### In OBS:
- Green "Live" indicator at bottom
- Bitrate/FPS stats showing activity
- No dropped frames

### In VPS (OME logs):
```
[2024-11-23 17:30:45.123] [RTMP Provider] Stream created: live/stream
[2024-11-23 17:30:45.456] [LLHLS Publisher] Publishing stream: live/stream
```

### In Browser (Frontend):
- Video plays automatically
- LIVE badge visible
- Viewer count showing
- No buffering
- Smooth playback
- <3 second latency

### In Browser Console:
```
✓ Stream config loaded successfully
✓ HLS.js initialized
✓ Manifest loaded: llhls.m3u8
✓ Stream started playing
✓ WebSocket connected
```

---

## Next Steps After Stream Works

1. **Test pause/play control** from admin panel
2. **Monitor CPU/bandwidth** usage on VPS
3. **Test with multiple viewers** to check scaling
4. **Set up monitoring** for stream health
5. **Configure HTTPS** for production (optional but recommended)

---

## Quick Reference Card

Copy this for easy access:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
OvenMediaEngine Configuration
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

VPS IP:           72.61.170.227
RTMP Port:        1935
LL-HLS Port:      8080
Application:      live
Stream Name:      stream (or your choice)

OBS Server:       rtmp://72.61.170.227:1935/live
OBS Stream Key:   stream

Admin Panel URL:  http://72.61.170.227:8080/live/stream/llhls.m3u8
Stream Type:      video

Test Command:     curl http://72.61.170.227:8080/live/stream/llhls.m3u8

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## Summary

Your OvenMediaEngine is configured perfectly for ultra-low latency streaming. To get your stream working:

1. **OBS**: Stream to `rtmp://72.61.170.227:1935/live` with key `stream`
2. **Admin Panel**: Enter URL `http://72.61.170.227:8080/live/stream/llhls.m3u8`
3. **Frontend**: Should automatically load and display stream

The system is ready - you just need to connect the pieces!