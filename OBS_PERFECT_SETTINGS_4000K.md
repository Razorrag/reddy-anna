# 🎯 OBS Perfect Settings for Zero Stuttering (4000 Kbps)

## ⚡ CRITICAL SETTINGS - MUST CONFIGURE THESE

These settings are **MANDATORY** to eliminate stuttering and match your server configuration.

---

## 📹 OUTPUT TAB

### **Streaming Section:**

1. **Output Mode:** `Advanced`
2. **Encoder:** `x264`
3. **Rate Control:** `CBR`
4. **Bitrate:** `4000` Kbps
5. **Custom Buffer Size:** `8000` (2x bitrate = stable connection)
6. **Keyframe Interval:** `1` ⚠️ **CRITICAL - MUST BE 1**
7. **CPU Usage Preset:** `veryfast` (or `faster` if CPU allows)
8. **Profile:** `high`
9. **Tune:** `zerolatency`

---

## 🎛️ ADVANCED TAB

### **Recording Section (x264 Options):**

Add this EXACT text in the **"x264 Options"** field:

```
keyint=30 min-keyint=30 scenecut=0 bframes=0
```

**What this does:**
- `keyint=30` = Force keyframe every 30 frames (1 second at 30fps)
- `min-keyint=30` = Never insert keyframes sooner than 1 second
- `scenecut=0` = Disable scene detection (prevents random keyframes)
- `bframes=0` = No B-frames (lower latency)

⚠️ **This is THE most important setting to eliminate stuttering!**

---

## 📺 VIDEO TAB

1. **Base (Canvas) Resolution:** `1920x1080`
2. **Output (Scaled) Resolution:** `1920x1080`
3. **Downscale Filter:** `Lanczos` (best quality)
4. **Common FPS Values:** `30`

**Note:** 4000 Kbps is perfect for 1080p streaming.

---

## 🔊 AUDIO TAB

1. **Sample Rate:** `44.1 kHz` (or 48 kHz)
2. **Channels:** `Stereo`
3. **Desktop Audio Bitrate:** `160` kbps
4. **Mic/Auxiliary Audio Bitrate:** `160` kbps

---

## 🌐 STREAM TAB

1. **Service:** `Custom`
2. **Server:** `rtmp://89.42.231.35:1935/live` (your VPS IP)
3. **Stream Key:** `test` (or your chosen key)

---

## ✅ VERIFICATION CHECKLIST

Before you start streaming, verify:

- [ ] Keyframe Interval = 1 second
- [ ] x264 Options = `keyint=30 min-keyint=30 scenecut=0 bframes=0`
- [ ] Bitrate = 4000 Kbps
- [ ] Buffer Size = 8000
- [ ] Rate Control = CBR
- [ ] CPU Preset = veryfast or faster
- [ ] Tune = zerolatency
- [ ] FPS = 30

---

## 🚀 WHY THESE SETTINGS MATTER

### **Keyframe Interval = 1 Second:**
- Server creates 1-second HLS segments
- Each segment MUST start with a keyframe
- Wrong interval = stuttering on every frame
- **This is the #1 cause of stuttering**

### **scenecut=0:**
- Prevents OBS from inserting extra keyframes on scene changes
- Keeps keyframes perfectly aligned with segments
- Without this, random stutters occur

### **min-keyint=30:**
- Forces consistent 1-second keyframe spacing
- Prevents early keyframes that break alignment
- Critical for smooth playback

### **Bitrate 4000 + Buffer 8000:**
- Matches server configuration (no re-encoding)
- Direct passthrough (zero latency)
- Stable connection during motion scenes

### **bframes=0:**
- No B-frames = lower encoding latency
- Instant encoding decisions
- Better for live streaming

---

## 📊 EXPECTED RESULTS

After applying these settings:

✅ **Zero stuttering** - Every segment starts with keyframe
✅ **2-3 second latency** - OBS to player total
✅ **Smooth motion** - No artifacts or freezing
✅ **Sharp 1080p quality** - 4000 Kbps is perfect for 1080p
✅ **Stable connection** - 8000 buffer handles spikes
✅ **No frame drops** - Proper encoding settings

---

## 🔧 TROUBLESHOOTING

### **Still seeing stuttering?**
1. Double-check keyframe interval is exactly `1`
2. Verify x264 options are entered correctly
3. Restart OBS after changing settings
4. Check that stream key matches server

### **Stream won't connect?**
1. Verify RTMP URL is correct
2. Check firewall isn't blocking port 1935
3. Ensure Node Media Server is running
4. Test with: `telnet 89.42.231.35 1935`

### **CPU usage too high?**
1. Change preset to `ultrafast` (lower quality but less CPU)
2. Consider reducing resolution to 720p
3. Close other applications
4. Use GPU encoding (NVENC/QuickSync) if available

### **Bitrate spikes/drops?**
1. Check internet upload speed (need 6+ Mbps)
2. Close other applications using bandwidth
3. Use wired ethernet instead of WiFi
4. Consider lowering bitrate to 3000 if unstable

---

## 💡 QUICK SETTINGS SUMMARY

**For copy-paste:**

```
Output Tab:
- Bitrate: 4000
- Buffer: 8000
- Keyframe: 1
- Preset: veryfast
- Tune: zerolatency

Advanced Tab -> x264 Options:
keyint=30 min-keyint=30 scenecut=0 bframes=0

Video:
- Resolution: 1920x1080
- FPS: 30
```

---

## 🎬 START STREAMING

1. Apply all settings above
2. Click "Start Streaming" in OBS
3. Wait 5-10 seconds for stream to stabilize
4. Open your player: `https://rajugarikossu.com/live/test/index.m3u8`
5. Should see smooth, stutter-free playback!

---

## 📞 NEED HELP?

If you still experience issues after applying these settings:

1. Check OBS logs for errors
2. Verify Node Media Server is running
3. Test with VLC player first (simpler debugging)
4. Check network connection stability
5. Ensure all code fixes from this session are deployed

---

**Last Updated:** 2025-01-19
**Server Config:** 4000 Kbps, 1s GOP, 3-segment playlist
**Target Latency:** 2-3 seconds total (OBS → Player)