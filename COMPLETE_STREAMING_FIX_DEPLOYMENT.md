# 🚀 Complete Streaming Fix Deployment Guide

## 📋 All Issues Fixed

This guide covers the deployment of ALL fixes for:
- ✅ Stuttering (GOP/segment alignment)
- ✅ Black screens on resume
- ✅ Pause/resume functionality
- ✅ Buffer optimization
- ✅ Cache optimization
- ✅ Latency reduction (2-3s total)

---

## 🔧 FILES MODIFIED

### 1. **Server Configuration**
- **File:** [`live_stream/server.js`](live_stream/server.js)
- **Changes:**
  - Reduced playlist from 10 to 3 segments (lower latency)
  - Fixed GOP settings: `scenecut=0`, `keyint_min=30` (force consistent keyframes)
  - Added segment deletion for memory efficiency
  - Updated health check to reflect new config

### 2. **Frontend Player**
- **File:** [`client/src/components/MobileGameLayout/VideoArea.tsx`](client/src/components/MobileGameLayout/VideoArea.tsx)
- **Changes:**
  - Resume uses `hls.startLoad(-1)` for instant live edge
  - Added pause state check in visibility handler
  - Optimized buffer: `liveSyncDurationCount: 3`, `maxBufferLength: 4`
  - Reduced back buffer to 0 (save memory)
  - Faster buffering popup (800ms instead of 3000ms)

### 3. **Nginx Configuration**
- **File:** [`NGINX_CONFIG_andar-bahar_COMPLETE.conf`](NGINX_CONFIG_andar-bahar_COMPLETE.conf)
- **Changes:**
  - Cache time reduced from 10s to 2s (live content)
  - Cache-Control header updated to 2s

### 4. **OBS Settings Guide**
- **File:** [`OBS_PERFECT_SETTINGS_4000K.md`](OBS_PERFECT_SETTINGS_4000K.md)
- **New comprehensive guide with critical settings**

---

## 🎯 DEPLOYMENT STEPS

### **STEP 1: Update Node Media Server (5 minutes)**

```bash
# Navigate to live_stream directory
cd live_stream

# Stop current server (if running)
# Method depends on how you're running it:
# If using npm:
npm stop
# If using pm2:
pm2 stop server
# If using node directly, kill the process

# The server.js file has already been updated
# Just restart the server:
npm start
# OR
pm2 start server.js --name "streaming-server"
# OR
node server.js
```

**Verify server started:**
```bash
# Should see output:
# ✅ NodeMediaServer started with ULTRA-LOW LATENCY config!
# 📊 Config: 1s GOP, 1s segments, 3-segment playlist
# ✅ GOP LOCK: scenecut=0, keyint_min=30
```

---

### **STEP 2: Update Frontend Application (10 minutes)**

```bash
# Navigate to project root
cd /var/www/andar-bahar/reddy-anna

# Pull latest changes (if using git)
git pull origin main

# Install dependencies (if needed)
cd client
npm install

# Build the frontend
npm run build

# The VideoArea.tsx changes are now compiled
```

**Restart your Node.js backend:**
```bash
# Navigate to server directory
cd ..
npm run build  # If you have a build step

# Restart the backend server
pm2 restart your-backend-name
# OR
npm restart
```

---

### **STEP 3: Update Nginx Configuration (5 minutes)**

```bash
# Backup current config
sudo cp /etc/nginx/sites-available/andar-bahar /etc/nginx/sites-available/andar-bahar.backup

# Edit the config file
sudo nano /etc/nginx/sites-available/andar-bahar

# Find these lines (around line 49 and 66):
proxy_cache_valid 200 10s;
add_header Cache-Control "public, max-age=10" always;

# Change to:
proxy_cache_valid 200 2s;
add_header Cache-Control "public, max-age=2" always;

# Save and exit (Ctrl+X, Y, Enter)

# Test configuration
sudo nginx -t

# If test passes, reload nginx
sudo systemctl reload nginx
```

---

### **STEP 4: Configure OBS (CRITICAL - 5 minutes)**

**Open OBS and configure these CRITICAL settings:**

#### **Output Tab:**
1. Output Mode: `Advanced`
2. Encoder: `x264`
3. Bitrate: `4000` Kbps
4. Buffer Size: `8000`
5. **Keyframe Interval: `1`** ⚠️ **MUST BE 1**
6. Preset: `veryfast`
7. Tune: `zerolatency`

#### **Advanced Tab → x264 Options:**
```
keyint=30 min-keyint=30 scenecut=0 bframes=0
```

#### **Video Tab:**
- Output Resolution: `1920x1080`
- FPS: `30`

**⚠️ CRITICAL:** The keyframe interval and x264 options are THE most important settings!

See [`OBS_PERFECT_SETTINGS_4000K.md`](OBS_PERFECT_SETTINGS_4000K.md) for full details.

---

### **STEP 5: Restart Everything (5 minutes)**

```bash
# 1. Restart Node Media Server
cd /path/to/live_stream
pm2 restart streaming-server

# 2. Restart backend
cd /var/www/andar-bahar/reddy-anna
pm2 restart your-backend

# 3. Nginx is already reloaded from Step 3

# 4. Restart OBS stream
# Stop streaming in OBS, wait 5 seconds, start again
```

---

## ✅ VERIFICATION & TESTING

### **Test 1: Check Server is Running**

```bash
# Test health endpoint
curl http://localhost:3000/health

# Should return:
# {"status":"ok","streaming":true,"latencyMode":"ultra-low-latency-2-3s","config":{...}}
```

### **Test 2: Verify HLS Stream**

```bash
# Test HLS playlist is accessible
curl https://rajugarikossu.com/live/test/index.m3u8

# Should return playlist with 3 segments
```

### **Test 3: Check Nginx Caching**

```bash
# Test cache headers
curl -I https://rajugarikossu.com/live/test/index.m3u8 | grep Cache

# Should see:
# Cache-Control: no-cache (for playlist)
# X-Cache-Status: BYPASS (for playlist)

# Test segment caching
curl -I https://rajugarikossu.com/live/test/segment1.ts | grep Cache

# Should see:
# Cache-Control: public, max-age=2
# X-Cache-Status: HIT or MISS
```

### **Test 4: Frontend Player Testing**

1. **Open browser:** `https://rajugarikossu.com`
2. **Check video loads:** Should see stream within 2-3 seconds
3. **Test pause/resume:**
   - Go to admin panel
   - Click pause → should show frozen frame immediately
   - Click play → should resume to live within <1 second
4. **Test tab switching:**
   - Switch to another tab for 30 seconds
   - Switch back → stream should still be at live edge
5. **Test refresh during pause:**
   - Pause stream
   - Refresh page
   - Should show frozen frame (not black screen)

### **Test 5: Stuttering Check**

**With correct OBS settings (keyframe=1), you should see:**
- ✅ Smooth playback during motion
- ✅ No frame freezing or artifacts
- ✅ Consistent quality throughout
- ✅ No sudden jumps or skips

**If still stuttering:**
- Double-check OBS keyframe interval is exactly `1`
- Verify x264 options are entered correctly
- Restart OBS completely
- Check OBS logs for encoding errors

---

## 📊 EXPECTED RESULTS

### **Before Fixes:**
- ❌ Stuttering every 1-2 seconds
- ❌ Black screen for 2-3s on resume
- ❌ 5-8s total latency
- ❌ Buffer issues and seeking loops
- ❌ Frozen frame lost on tab switch

### **After Fixes:**
- ✅ Zero stuttering (perfect GOP alignment)
- ✅ <500ms resume time (instant)
- ✅ 2-3s total latency (OBS → Player)
- ✅ Stable playback position
- ✅ Clean pause/resume with frozen frame
- ✅ Seamless tab switching
- ✅ Lower memory usage
- ✅ Better cache efficiency

---

## 🐛 TROUBLESHOOTING

### **Issue: Still seeing stuttering**

**Solution:**
1. Check OBS keyframe interval: MUST be exactly `1`
2. Verify x264 options in OBS Advanced tab
3. Check OBS logs for encoding errors
4. Test with VLC player to isolate issue
5. Verify network stability (6+ Mbps upload)

### **Issue: Black screen on resume**

**Solution:**
1. Check browser console for errors
2. Verify frontend code was rebuilt (`npm run build`)
3. Clear browser cache (Ctrl+Shift+Del)
4. Check that `hls.startLoad(-1)` is in VideoArea.tsx line 608

### **Issue: Pause doesn't show frozen frame**

**Solution:**
1. Check browser console for capture errors
2. Verify video is actually playing before pause
3. Check that stream URL is .m3u8 (HLS)
4. Try refreshing page and testing again

### **Issue: High latency (>5s)**

**Solution:**
1. Check OBS bitrate isn't too high for your upload
2. Verify nginx cache is 2s (not 10s)
3. Check buffer settings in VideoArea.tsx
4. Verify playlist size is 3 segments in server.js

### **Issue: Stream won't connect**

**Solution:**
1. Check Node Media Server is running: `curl http://localhost:8000`
2. Verify OBS stream key matches
3. Check firewall isn't blocking port 1935
4. Test with: `telnet your-vps-ip 1935`

---

## 📈 MONITORING

### **Check Stream Stats:**

Open browser console (F12) and filter logs for:
```
📊 Stream Stats
```

Should see every 5 seconds:
```
📊 Stream Stats: {
  latency: "2.50s",
  buffer: "3.20s",
  liveSyncPos: "120.45",
  currentTime: "117.95"
}
```

**Good values:**
- Latency: 2-4s
- Buffer: 3-5s
- Difference (latency): <5s

---

## 🎯 QUICK DEPLOYMENT CHECKLIST

Use this checklist to ensure everything is deployed:

- [ ] Node Media Server restarted with new config
- [ ] Frontend rebuilt and backend restarted
- [ ] Nginx config updated and reloaded
- [ ] OBS keyframe interval set to 1
- [ ] OBS x264 options configured
- [ ] OBS stream restarted
- [ ] All tests passed
- [ ] No errors in console
- [ ] Stuttering eliminated
- [ ] Pause/resume working
- [ ] Tab switching works correctly

---

## 📞 SUPPORT

If issues persist after following all steps:

1. Check all server logs for errors
2. Verify all configuration files match this guide
3. Test with simple VLC player first
4. Check network/bandwidth is stable
5. Review browser console for JavaScript errors

---

## 📝 SUMMARY OF CHANGES

### **Server (live_stream/server.js):**
- Playlist: 10 → 3 segments
- GOP: Added `scenecut=0`, `keyint_min=30`
- Segments: Auto-delete old ones

### **Frontend (VideoArea.tsx):**
- Resume: `hls.startLoad(-1)` for instant live
- Buffer: Optimized for 2-3s latency
- Pause: Fixed visibility handler check
- Debounce: 3000ms → 800ms

### **Nginx:**
- Cache: 10s → 2s
- Headers: max-age=2

### **OBS (Critical):**
- Keyframe: MUST be 1 second
- x264: `keyint=30 min-keyint=30 scenecut=0 bframes=0`

---

**Last Updated:** 2025-01-19
**Target Performance:** 2-3s latency, zero stuttering, instant pause/resume
**Status:** ✅ ALL FIXES APPLIED