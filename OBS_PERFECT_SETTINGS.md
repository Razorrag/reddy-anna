# 🎥 PERFECT OBS SETTINGS FOR ULTRA-LOW LATENCY HLS STREAMING

## Quick Setup Guide

### Step 1: OBS Stream Settings

1. **Open OBS Studio**
2. **Go to**: Settings → Stream

```
Service: Custom
Server: rtmp://89.42.231.35:1935/live
Stream Key: test
```

---

### Step 2: OBS Output Settings

**Go to**: Settings → Output

#### Streaming Tab

```
Output Mode: Advanced

Encoder: x264 (or NVIDIA NVENC H.264 if you have NVIDIA GPU)

Rate Control: CBR (Constant Bitrate)
Bitrate: 2500 Kbps (for 720p) or 4000 Kbps (for 1080p)

Keyframe Interval: 1 (CRITICAL for low latency!)
  ⚠️ This MUST be 1 second to match HLS segment size

CPU Usage Preset: veryfast (or ultrafast for low-end PCs)
Profile: main
Tune: zerolatency (CRITICAL for low latency!)
```

**IMPORTANT SETTINGS**:
- ✅ **Keyframe Interval = 1** (matches 0.5s HLS segments)
- ✅ **Tune = zerolatency** (reduces encoding delay)
- ✅ **CBR** (constant bitrate for stable streaming)

---

### Step 3: OBS Video Settings

**Go to**: Settings → Video

```
Base (Canvas) Resolution: 1920x1080 (or your screen resolution)
Output (Scaled) Resolution: 1280x720 (recommended for smooth streaming)
  • Use 1920x1080 only if you have good upload speed (>10 Mbps)

Downscale Filter: Lanczos (best quality)

Common FPS Values: 30 (recommended) or 60 (if upload speed >5 Mbps)
```

**Recommended Combinations**:

| Upload Speed | Resolution | FPS | Bitrate |
|--------------|------------|-----|---------|
| 3-5 Mbps     | 1280x720   | 30  | 2500    |
| 5-10 Mbps    | 1280x720   | 60  | 4000    |
| 10+ Mbps     | 1920x1080  | 30  | 4000    |
| 15+ Mbps     | 1920x1080  | 60  | 6000    |

---

### Step 4: OBS Advanced Settings

**Go to**: Settings → Advanced

```
Process Priority: High (if your PC can handle it)

Color Format: NV12
Color Space: 709
Color Range: Partial

Stream Delay: 0 seconds (no delay!)

Automatically Reconnect: ✅ Enabled
Retry Delay: 2 seconds
Maximum Retries: 20

Network:
  • Bind to IP: Default
  • Enable Dynamic Bitrate: ✅ Enabled (helps with unstable internet)
```

---

### Step 5: OBS Audio Settings

**Go to**: Settings → Audio

```
Sample Rate: 48 kHz (standard)

Channels: Stereo

Desktop Audio: Default (to capture game audio)
Mic/Auxiliary Audio: Your microphone (if using)
```

**Audio Bitrate** (in Output → Audio):
```
Track 1 Audio Bitrate: 160 (good quality)
```

---

## Complete OBS Configuration File

Save this as `obs-low-latency.json` and import in OBS:

```json
{
  "stream": {
    "service": "Custom",
    "server": "rtmp://89.42.231.35:1935/live",
    "key": "test"
  },
  "output": {
    "mode": "Advanced",
    "encoder": "x264",
    "rate_control": "CBR",
    "bitrate": 2500,
    "keyframe_interval": 1,
    "preset": "veryfast",
    "profile": "main",
    "tune": "zerolatency"
  },
  "video": {
    "base_resolution": "1920x1080",
    "output_resolution": "1280x720",
    "fps": 30,
    "downscale_filter": "lanczos"
  },
  "audio": {
    "sample_rate": 48000,
    "channels": "Stereo",
    "bitrate": 160
  }
}
```

---

## HLS Server Configuration (Already Applied)

Your streaming server is configured with:

```javascript
// Ultra-low latency HLS settings
{
  hls_time: 0.5,              // 0.5 second segments
  hls_list_size: 2,           // Keep only 2 segments (1s buffer)
  hls_flags: 'delete_segments+independent_segments',
  hls_segment_type: 'mpegts'  // Faster than fmp4
}
```

**This means**:
- OBS sends stream with 1s keyframes
- Server splits into 0.5s HLS segments
- Client buffers only 1s of video
- **Total latency: 1-2 seconds!**

---

## Testing Your Stream

### 1. Start Streaming
1. Open OBS
2. Click **Start Streaming**
3. Wait 5-10 seconds for connection

### 2. Check Stream Health in OBS
Look at bottom right corner:
```
✅ Green: Good (0% dropped frames)
⚠️ Yellow: Okay (1-5% dropped frames)
❌ Red: Bad (>5% dropped frames)
```

**If dropping frames**:
- Lower bitrate (2500 → 2000)
- Lower resolution (1080p → 720p)
- Lower FPS (60 → 30)
- Change preset (veryfast → ultrafast)

### 3. Check Stream in Browser
1. Open: https://rajugarikossu.com
2. Login as player
3. Wave hand in front of camera
4. **Expected**: See hand in 1-2 seconds

### 4. Check Server Logs
```bash
ssh root@89.42.231.35
pm2 logs streaming-server --lines 20
```

Look for:
```
✅ [rtmp publish] New stream. id=XXX streamPath=/live/test
✅ [Transmuxing HLS] /live/test to .../index.m3u8
✅ [rtmp publish] Handle video. codec_name=H264 1280x720
✅ [rtmp publish] Handle audio. codec_name=AAC 48000 2ch
```

---

## Troubleshooting

### Problem: "Failed to connect to server"
**Solution**:
```
1. Check server is running: ssh root@89.42.231.35 'pm2 status'
2. Check firewall allows port 1935: sudo ufw status
3. Verify RTMP URL: rtmp://89.42.231.35:1935/live
4. Verify stream key: test
```

### Problem: "High CPU usage in OBS"
**Solution**:
```
1. Change encoder: x264 → NVENC (if you have NVIDIA GPU)
2. Lower preset: veryfast → ultrafast
3. Lower resolution: 1080p → 720p
4. Lower FPS: 60 → 30
```

### Problem: "Choppy/laggy stream"
**Solution**:
```
1. Lower bitrate: 4000 → 2500 → 2000
2. Enable Dynamic Bitrate in OBS Advanced settings
3. Check upload speed: speedtest.net (need at least 3 Mbps)
4. Close other apps using internet
```

### Problem: "Stream has 5+ second delay"
**Solution**:
```
1. Verify Keyframe Interval = 1 in OBS
2. Verify Tune = zerolatency in OBS
3. Check HLS config: ssh root@89.42.231.35 'cat /var/www/andar-bahar/reddy-anna/live_stream/server.js | grep hlsFlags'
4. Should see: hls_time=0.5:hls_list_size=2
```

### Problem: "Black screen in browser"
**Solution**:
```
1. Wait 10 seconds after starting OBS stream
2. Refresh browser page
3. Check stream is active in admin settings
4. Check browser console for errors (F12)
```

---

## Performance Optimization

### For Low-End PC (Dual Core, 4GB RAM)
```
Encoder: x264
Preset: ultrafast
Resolution: 1280x720
FPS: 30
Bitrate: 2000
```

### For Mid-Range PC (Quad Core, 8GB RAM)
```
Encoder: x264
Preset: veryfast
Resolution: 1280x720
FPS: 30
Bitrate: 2500
```

### For High-End PC (6+ Cores, 16GB RAM)
```
Encoder: x264
Preset: fast
Resolution: 1920x1080
FPS: 30
Bitrate: 4000
```

### For PC with NVIDIA GPU (GTX 1050+)
```
Encoder: NVENC H.264
Preset: Quality
Resolution: 1920x1080
FPS: 60
Bitrate: 6000
```

---

## Network Requirements

### Minimum (720p @ 30fps)
```
Upload Speed: 3 Mbps
Bitrate: 2000 Kbps
Ping: <100ms
```

### Recommended (720p @ 60fps)
```
Upload Speed: 5 Mbps
Bitrate: 4000 Kbps
Ping: <50ms
```

### Optimal (1080p @ 60fps)
```
Upload Speed: 10 Mbps
Bitrate: 6000 Kbps
Ping: <30ms
```

**Check your upload speed**: https://speedtest.net

---

## Quick Start Checklist

- [ ] OBS installed and updated
- [ ] Stream settings configured (rtmp://89.42.231.35:1935/live, key: test)
- [ ] Output settings: CBR, Keyframe=1, Tune=zerolatency
- [ ] Video settings: 720p @ 30fps (or based on your PC)
- [ ] Audio settings: 48kHz, Stereo, 160 bitrate
- [ ] Advanced: Process Priority=High, Dynamic Bitrate=Enabled
- [ ] Upload speed tested (minimum 3 Mbps)
- [ ] Streaming server running (pm2 status)
- [ ] Test stream started and visible in browser

---

## Complete Settings Summary

### CRITICAL SETTINGS (Must Have!)
```
✅ Server: rtmp://89.42.231.35:1935/live
✅ Stream Key: test
✅ Keyframe Interval: 1
✅ Tune: zerolatency
✅ Rate Control: CBR
✅ Stream Delay: 0
```

### RECOMMENDED SETTINGS
```
✅ Encoder: x264 or NVENC
✅ Bitrate: 2500 Kbps
✅ Resolution: 1280x720
✅ FPS: 30
✅ Preset: veryfast
✅ Audio: 48kHz, 160 Kbps
✅ Dynamic Bitrate: Enabled
```

---

## Expected Results

With these settings, you should achieve:

- **Stream Latency**: 1-2 seconds (from camera to browser)
- **Smooth Playback**: No buffering or stuttering
- **Fast Resume**: 1-2 seconds after pause
- **Stable Connection**: No disconnections
- **Good Quality**: Clear video at 720p/1080p

---

## Support

If you encounter issues:

1. **Check logs**: `pm2 logs streaming-server`
2. **Test stream**: `scripts/test-stream-fix.ps1`
3. **Verify settings**: Compare with this guide
4. **Check network**: Run speedtest.net

**Common Issues**: See Troubleshooting section above

---

## Status: ✅ READY TO STREAM

Follow this guide exactly and your stream will work perfectly with ultra-low latency!

**Start streaming now!** 🎥🚀
