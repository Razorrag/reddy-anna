# ⚙️ OBS Low-Latency Settings - Quick Reference

## 🎯 Critical Settings (MUST CONFIGURE!)

### Output Settings
**Path:** OBS → Settings → Output

```
Output Mode: Advanced
```

### Streaming Tab
```
✅ Encoder: x264
✅ Rate Control: CBR
✅ Bitrate: 3000 Kbps (adjust based on upload speed)
✅ Keyframe Interval: 1 ⚠️ CRITICAL!
✅ CPU Usage Preset: veryfast
✅ Profile: main
✅ Tune: zerolatency ⚠️ CRITICAL!
```

### Video Settings
**Path:** OBS → Settings → Video

```
✅ Base Resolution: 1920x1080 (or your camera resolution)
✅ Output Resolution: 1280x720 (good balance)
✅ FPS: 30 (or 25 for lower bandwidth)
```

### Advanced Settings
**Path:** OBS → Settings → Advanced

```
✅ Process Priority: High
✅ Color Format: NV12
✅ Color Space: 709
✅ Color Range: Partial
```

## 🚨 Why Keyframe = 1 is Critical

### The Problem
- HLS segments MUST align with keyframes
- If keyframe = 2, segments will be 1 second (2 × 0.5s)
- This defeats the 0.5s segment optimization
- Results in 4-6 second delay instead of 1-2 seconds

### The Solution
- **Always set Keyframe Interval = 1**
- This ensures every 0.5s segment has a keyframe
- Allows instant segment switching
- Achieves 1-2 second latency

## 📊 Bitrate Recommendations

| Upload Speed | Recommended Bitrate | Quality |
|--------------|---------------------|---------|
| 5 Mbps | 2500 Kbps | Good |
| 10 Mbps | 3500 Kbps | Better |
| 20+ Mbps | 4500 Kbps | Best |

**Formula:** Bitrate = 70% of upload speed

## 🎬 Stream Settings

### RTMP URL
```
rtmp://91.108.110.72:1935/live
```

### Stream Key
```
test
```

### Full URL (for reference)
```
rtmp://91.108.110.72:1935/live/test
```

## ✅ Quick Checklist

Before starting stream, verify:
- [ ] Keyframe Interval = 1 ✅
- [ ] Tune = zerolatency ✅
- [ ] Rate Control = CBR ✅
- [ ] CPU Preset = veryfast or ultrafast ✅
- [ ] Bitrate appropriate for upload speed ✅
- [ ] RTMP URL correct ✅

## 🐛 Troubleshooting

### Issue: High CPU usage
**Solution:** Change CPU Preset to `ultrafast` or `superfast`

### Issue: Buffering/stuttering
**Solution:** Reduce bitrate by 500 Kbps

### Issue: Still high latency
**Solution:** 
1. Verify Keyframe = 1 (not 0, not 2, exactly 1)
2. Verify Tune = zerolatency
3. Restart OBS
4. Restart stream

### Issue: Stream not connecting
**Solution:**
1. Check RTMP URL: `rtmp://91.108.110.72:1935/live`
2. Check Stream Key: `test`
3. Verify streaming server is running: `pm2 status`

## 📈 Performance Monitoring

### In OBS
- **CPU Usage:** Should be < 50%
- **Dropped Frames:** Should be 0%
- **Bitrate:** Should be stable (CBR)

### On VPS
```bash
# Check streaming server
pm2 logs streaming-server --lines 50

# Check segment creation
watch -n 1 'ls -lh /var/www/andar-bahar/reddy-anna/live_stream/media/live/test/'
```

## 🎯 Expected Results

With correct settings:
- ✅ **Latency:** 1-2 seconds
- ✅ **Stability:** No buffering
- ✅ **Quality:** Clear video
- ✅ **CPU:** < 50% usage

## 📚 Additional Resources

- [OBS Studio Quickstart](https://obsproject.com/wiki/OBS-Studio-Quickstart)
- [OBS Low Latency Guide](https://obsproject.com/wiki/Reducing-Stream-Delay)
- [x264 Encoding Guide](https://trac.ffmpeg.org/wiki/Encode/H.264)

## 💡 Pro Tips

1. **Test before going live:** Stream for 5 minutes to verify stability
2. **Monitor CPU usage:** If > 70%, reduce preset or bitrate
3. **Use wired connection:** WiFi can cause packet loss
4. **Close unnecessary apps:** Free up CPU and bandwidth
5. **Restart OBS daily:** Prevents memory leaks

## 🆘 Quick Support Commands

```bash
# Check if streaming server is running
pm2 status

# View streaming server logs
pm2 logs streaming-server

# Restart streaming server
pm2 restart streaming-server

# Check HLS segments
ls -lh /var/www/andar-bahar/reddy-anna/live_stream/media/live/test/

# Test stream URL
curl -I http://91.108.110.72:8000/live/test/index.m3u8
```

---

**Remember:** Keyframe = 1 and Tune = zerolatency are the two most critical settings for low-latency streaming!
