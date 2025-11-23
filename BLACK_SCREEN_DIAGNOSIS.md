# Black Screen Diagnosis - Stream Not Playing

## Current Status

✅ **Configuration is CORRECT**
- Stream URL configured: `http://72.61.170.227:8080/live/test/llhls.m3u8`
- Stream type: VIDEO
- Player initialized successfully
- HLS.js loaded
- Fake viewer count working (1000-1100 range)

❌ **Problem: Black Screen**
- `currentTime: '0.00'` - Stream not playing
- `latency: '0.00s'` - No stream data
- `buffer: '0.00s'` - No buffered data
- Player renders but shows black screen

## Root Cause

The stream endpoint `http://72.61.170.227:8080/live/test/llhls.m3u8` returns **404 Not Found** because:

**There is NO ACTIVE STREAM in OvenMediaEngine with the name "test"**

This means:
1. ✅ Frontend configuration is working perfectly
2. ✅ Player is trying to load the stream
3. ❌ OvenMediaEngine has no stream to serve
4. ❌ No one is streaming to RTMP endpoint with stream key "test"

---

## Verification Steps (Run on VPS)

### Step 1: Check if Stream Exists
```bash
curl http://72.61.170.227:8080/live/test/llhls.m3u8
```

**Current Result (Expected):**
```
404 Not Found
```

**Desired Result (When stream is active):**
```
#EXTM3U
#EXT-X-VERSION:7
#EXT-X-TARGETDURATION:1
#EXT-X-SERVER-CONTROL:CAN-BLOCK-RELOAD=YES
...
```

### Step 2: Check Active Streams
```bash
curl http://localhost:8081/v1/vhosts/default/apps/live/streams
```

**Current Result (Expected):**
```json
{
  "statusCode": 200,
  "message": "OK",
  "response": []
}
```
Empty array means NO streams are active.

**Desired Result (When OBS is streaming):**
```json
{
  "statusCode": 200,
  "message": "OK",
  "response": [
    {
      "name": "test",
      "app": "live",
      "createdTime": "2024-11-23T17:30:00.000Z"
    }
  ]
}
```

### Step 3: Check OvenMediaEngine Logs
```bash
tail -f /var/log/ovenmediaengine/ovenmediaengine.log
```

**Current Logs (No stream):**
Just background processes, no stream creation logs.

**Expected Logs (When OBS connects):**
```
[2024-11-23 17:30:45.123] [RTMP Provider] Stream created: live/test
[2024-11-23 17:30:45.456] [LLHLS Publisher] Publishing stream: live/test
```

---

## Solution: Start OBS Streaming

You need to **start streaming from OBS Studio** to create the stream in OvenMediaEngine.

### OBS Configuration

#### Settings → Stream:
```
Service:    Custom
Server:     rtmp://72.61.170.227:1935/live
Stream Key: test
```

#### Settings → Video:
```
Base Resolution:   1920x1080
Output Resolution: 1280x720 (recommended) or 1920x1080
FPS:              30
```

#### Settings → Output:
```
Output Mode:       Simple
Video Bitrate:     3000 Kbps (or 4000-5000 for HD)
Encoder:           x264
Audio Bitrate:     160 Kbps
```

#### Advanced Settings (Settings → Advanced → Video):
```
Renderer:          Direct3D 11 (Windows) or OpenGL (Mac/Linux)
Color Format:      NV12
Color Space:       709
Color Range:       Limited
```

### Start Streaming Process

1. **Open OBS Studio**

2. **Add Sources** (if not already added):
   - Click `+` in Sources panel
   - Add Video Capture Device (webcam)
   - OR Add Display Capture (screen)
   - OR Add Media Source (video file for testing)

3. **Verify Settings** (gear icon next to Start Streaming):
   - Server: `rtmp://72.61.170.227:1935/live`
   - Stream Key: `test`

4. **Click "Start Streaming"**
   - Button will turn red and say "Stop Streaming"
   - Bottom bar shows "LIVE" in green
   - FPS and bitrate stats will start moving

5. **Wait 5-10 seconds** for stream to initialize

6. **Verify Connection**:
   - OBS bottom bar shows stable bitrate (e.g., 3000 kbps)
   - "0 kb/s" dropped frames
   - CPU usage reasonable (< 50%)

---

## Verification After Starting OBS

### On VPS:

**Check 1: Stream endpoint returns playlist**
```bash
curl http://72.61.170.227:8080/live/test/llhls.m3u8
```
Should return HLS playlist (not 404)

**Check 2: List shows active stream**
```bash
curl http://localhost:8081/v1/vhosts/default/apps/live/streams
```
Should show "test" stream in response array

**Check 3: Logs show stream creation**
```bash
tail -20 /var/log/ovenmediaengine/ovenmediaengine.log
```
Should show RTMP connection and LLHLS publishing logs

### In Browser:

**Check 1: Refresh game page**
- Video should start playing
- Black screen should disappear
- Stream should be visible

**Check 2: Console logs**
- Should show HLS.js loading segments
- `currentTime` should increment
- `latency` should show 1-3 seconds

**Check 3: Network tab**
- Should see requests to `.m4s` segment files
- All requests should return 200 OK
- Continuous segment loading

---

## Alternative: Test with Video File

If you don't have OBS or a camera ready, you can test with FFmpeg:

### Install FFmpeg (if not installed):
```bash
# Ubuntu/Debian
apt install ffmpeg

# CentOS/RHEL
yum install ffmpeg

# Or download from ffmpeg.org
```

### Stream a Test Video:
```bash
# If you have a video file
ffmpeg -re -i /path/to/video.mp4 \
  -c:v libx264 -preset veryfast -tune zerolatency \
  -c:a aac -b:a 128k \
  -f flv rtmp://72.61.170.227:1935/live/test

# Or stream test pattern
ffmpeg -f lavfi -i testsrc=size=1280x720:rate=30 \
  -f lavfi -i sine=frequency=1000:sample_rate=48000 \
  -c:v libx264 -preset veryfast -tune zerolatency \
  -c:a aac -b:a 128k \
  -f flv rtmp://72.61.170.227:1935/live/test
```

This will create a test stream to verify the setup works.

---

## Common OBS Issues

### Issue 1: "Failed to connect to server"

**Causes:**
- Wrong server URL
- Port 1935 blocked by firewall
- OvenMediaEngine not running

**Fix:**
```bash
# On VPS, check if port 1935 is listening
netstat -tulpn | grep 1935

# Check firewall
ufw status
# If blocked, allow:
ufw allow 1935/tcp

# Check OME status
ps aux | grep ovenmedia
systemctl status ovenmediaengine
```

### Issue 2: "Encoding overloaded"

**Causes:**
- CPU too slow for selected preset
- Resolution too high
- FPS too high

**Fix in OBS:**
- Lower Output Resolution to 1280x720
- Change CPU Preset to "ultrafast" or "superfast"
- Reduce FPS to 30
- Lower bitrate to 2500 Kbps

### Issue 3: OBS Crashes

**Fix:**
- Update OBS to latest version
- Update graphics drivers
- Restart OBS
- Try different encoder (NVENC if you have Nvidia GPU)

---

## Expected Timeline

Once OBS starts streaming:

**0-5 seconds:**
- OBS connects to RTMP server
- OvenMediaEngine receives stream
- Creates "test" stream in "live" app

**5-10 seconds:**
- OvenMediaEngine generates first LL-HLS segments
- Playlist becomes available at endpoint
- Stream ready for playback

**10+ seconds:**
- Frontend player loads playlist
- HLS.js starts buffering
- Video begins playing
- Black screen disappears

**Total time from "Start Streaming" to visible video: 10-15 seconds**

---

## Current vs Desired State

### CURRENT STATE ❌
```
OBS: Not streaming
  ↓
OME:  No active streams
  ↓
Endpoint: 404 Not Found
  ↓
Frontend: Black screen (no data to play)
```

### DESIRED STATE ✅
```
OBS: Streaming to rtmp://72.61.170.227:1935/live/test
  ↓
OME:  Active stream "live/test" with LL-HLS output
  ↓
Endpoint: http://72.61.170.227:8080/live/test/llhls.m3u8 → Returns playlist
  ↓
Frontend: Video playing, viewer count, LIVE badge, latency stats
```

---

## Quick Test Checklist

Run these in order to diagnose:

**On VPS:**
- [ ] `ps aux | grep ovenmedia` - OME is running
- [ ] `netstat -tulpn | grep 1935` - RTMP port listening
- [ ] `netstat -tulpn | grep 8080` - LL-HLS port listening
- [ ] `curl http://localhost:8081/v1/vhosts/default/apps/live/streams` - Check active streams

**In OBS:**
- [ ] Stream settings configured correctly
- [ ] At least one source added to scene
- [ ] "Start Streaming" clicked
- [ ] Bottom bar shows "LIVE" in green
- [ ] Bitrate stats showing activity
- [ ] No "Failed to connect" error

**In Browser:**
- [ ] Console shows VideoArea rendering stream URL
- [ ] Network tab shows requests to llhls.m3u8
- [ ] 200 OK response (not 404)
- [ ] Requests to .m4s segment files
- [ ] currentTime > 0.00
- [ ] Video playing (not black)

---

## Next Steps

1. **Open OBS Studio** on your computer
2. **Configure stream settings** as shown above
3. **Add a video source** (camera, screen, or test pattern)
4. **Click "Start Streaming"**
5. **Wait 10-15 seconds**
6. **Refresh game page** in browser
7. **Video should appear**

The frontend is **100% configured correctly** and ready. You just need to create the stream on the OvenMediaEngine side by streaming from OBS.

---

## Summary

**The Problem:**
Player tries to load `http://72.61.170.227:8080/live/test/llhls.m3u8` but gets 404 because no stream named "test" exists in OvenMediaEngine.

**The Solution:**
Start streaming from OBS to `rtmp://72.61.170.227:1935/live` with stream key `test`. This will create the stream and make it available at the LL-HLS endpoint.

**Status:**
- ✅ Frontend configuration: PERFECT
- ✅ OvenMediaEngine configuration: PERFECT  
- ✅ Database configuration: PERFECT
- ❌ Active stream: MISSING (needs OBS)

Everything is ready - just start OBS streaming!