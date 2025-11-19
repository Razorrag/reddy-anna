# 🚀 QUICK DEPLOYMENT GUIDE - Copy-Paste Ready!

## 📋 You Have 2 Files to Update

### FILE 1: `/etc/nginx/nginx.conf` (Add cache zone)
### FILE 2: `/etc/nginx/sites-available/andar-bahar` (Complete replacement)

---

## STEP 1: Backup Everything

```bash
# SSH to your VPS
ssh root@89.42.231.35

# Backup nginx.conf
sudo cp /etc/nginx/nginx.conf /etc/nginx/nginx.conf.backup-$(date +%Y%m%d-%H%M%S)

# Backup andar-bahar config
sudo cp /etc/nginx/sites-available/andar-bahar /etc/nginx/sites-available/andar-bahar.backup-$(date +%Y%m%d-%H%M%S)

# Verify backups created
ls -ltr /etc/nginx/*.backup* /etc/nginx/sites-available/*.backup*
```

---

## STEP 2: Update /etc/nginx/nginx.conf

```bash
# Open the main nginx config
sudo nano /etc/nginx/nginx.conf
```

**Find the `http {` block and add these lines INSIDE it, BEFORE any server blocks:**

```nginx
    # ==========================================
    # HLS STREAMING CACHE ZONE (ADD THIS)
    # ==========================================
    proxy_cache_path /dev/shm/stream_cache 
        levels=1:2 
        keys_zone=stream_cache:100m    # 100MB for cache keys
        max_size=500m                  # 500MB total cache size
        inactive=10s                   # Remove if not accessed for 10s
        use_temp_path=off;             # Direct write to cache

    # Upstream for HLS backend
    upstream hls_backend {
        server 127.0.0.1:8000;
        keepalive 32;                  # Keep connections alive
    }
```

**Save:** `Ctrl+X`, then `Y`, then `Enter`

---

## STEP 3: Replace /etc/nginx/sites-available/andar-bahar

```bash
# Open your andar-bahar config
sudo nano /etc/nginx/sites-available/andar-bahar
```

**IMPORTANT: Copy the ENTIRE content from `NGINX_CONFIG_andar-bahar_COMPLETE.conf` file and paste it here, replacing EVERYTHING.**

The file is ready in: `NGINX_CONFIG_andar-bahar_COMPLETE.conf`

**Before saving, verify these lines (23-24) have correct SSL certificate paths:**
```nginx
ssl_certificate /etc/letsencrypt/live/rajugarikossu.com/fullchain.pem;
ssl_certificate_key /etc/letsencrypt/live/rajugarikossu.com/privkey.pem;
```

**Save:** `Ctrl+X`, then `Y`, then `Enter`

---

## STEP 4: Test Configuration

```bash
# Test nginx syntax
sudo nginx -t
```

**Expected output:**
```
nginx: the configuration file /etc/nginx/nginx.conf syntax is ok
nginx: configuration file /etc/nginx/nginx.conf test is successful
```

**If you see errors:**
- Check for missing semicolons
- Check SSL certificate paths
- Verify you copied everything correctly
- Restore backups if needed:
  ```bash
  sudo cp /etc/nginx/nginx.conf.backup-* /etc/nginx/nginx.conf
  sudo cp /etc/nginx/sites-available/andar-bahar.backup-* /etc/nginx/sites-available/andar-bahar
  ```

---

## STEP 5: Create Cache Directory

```bash
# Create cache directory in RAM
sudo mkdir -p /dev/shm/stream_cache

# Set permissions
sudo chown -R www-data:www-data /dev/shm/stream_cache
sudo chmod -R 755 /dev/shm/stream_cache

# Verify
ls -la /dev/shm/ | grep stream_cache
```

---

## STEP 6: Reload Nginx

```bash
# Reload nginx
sudo systemctl reload nginx

# Verify nginx is running
sudo systemctl status nginx
```

**Expected:** `Active: active (running)`

---

## STEP 7: Verify Cache is Working

```bash
# Test playlist (should be BYPASS)
curl -I https://rajugarikossu.com/live/test/index.m3u8 2>&1 | grep -i cache

# Test segment (should be HIT after first request)
curl -I https://rajugarikossu.com/live/test/segment0.ts 2>&1 | grep -i cache
curl -I https://rajugarikossu.com/live/test/segment0.ts 2>&1 | grep -i cache
```

**Expected:**
```
X-Cache-Status: BYPASS  (for .m3u8 playlists)
X-Cache-Status: MISS    (first segment request)
X-Cache-Status: HIT     (second segment request) ✅
```

---

## STEP 8: Update Streaming Server

```bash
# Navigate to streaming directory
cd /var/www/andar-bahar/reddy-anna/live_stream

# Backup current server.js
cp server.js server.js.backup

# The updated server.js is already in your project
# Just restart the streaming server
pm2 restart streaming-server

# View logs
pm2 logs streaming-server --lines 20
```

**Expected log:**
```
✅ NodeMediaServer started with VPS-OPTIMIZED ULTRA-LOW LATENCY config!
```

---

## STEP 9: Deploy React Client Updates

```bash
# Navigate to project root
cd /var/www/andar-bahar/reddy-anna

# Pull latest changes or upload VideoArea.tsx manually
# git pull origin main

# Build client
cd client
npm install
npm run build

# Restart backend
cd ..
pm2 restart all

# Verify all services
pm2 status
```

---

## STEP 10: Configure OBS

**OBS Settings (Critical for low latency):**
- **Output Mode**: Advanced
- **Encoder**: x264 or NVENC H.264
- **Bitrate**: 4000 Kbps
- **Keyframe Interval**: 1 second
- **CPU Preset**: veryfast (or medium if powerful VPS)
- **Tune**: zerolatency
- **Dynamic Bitrate**: ON

**Stream Settings:**
- **URL**: `rtmp://89.42.231.35:1935/live`
- **Stream Key**: `test`

---

## ✅ FINAL VERIFICATION

### 1. Check Cache Hit Rate
```bash
# Monitor cache in real-time
sudo tail -f /var/log/nginx/access.log | grep "Cache"
```

**You should see mostly HIT responses** (95%+ = cache working!)

### 2. Check Latency
- Start OBS streaming
- Wave hand in front of camera
- Open https://rajugarikossu.com
- **Expected: 1-2 seconds delay** ✅

### 3. Check Buffering
- Stream for 10+ minutes
- **Expected: ZERO "Loading stream..." popups** ✅

### 4. Check "Stream Paused" Text
- Open stream and pause
- **Expected: Clean frozen frame, NO "Stream Paused" text overlay** ✅

---

## 🐛 Quick Troubleshooting

### Still seeing buffering?
```bash
# Check cache is being used
du -sh /dev/shm/stream_cache  # Should be 50-500MB
grep "HIT" /var/log/nginx/access.log | wc -l  # Should be high number
```

### High latency?
```bash
# Verify OBS keyframe = 1 second
# Verify server.js has hls_time=0.5
cd /var/www/andar-bahar/reddy-anna/live_stream
grep "hls_time" server.js  # Should show 0.5
```

### Cache not working?
```bash
# Verify cache zone exists
sudo nginx -T | grep proxy_cache_path
# Should show: /dev/shm/stream_cache

# Check permissions
ls -la /dev/shm/stream_cache/
# Should show: www-data www-data
```

---

## 📊 Expected Performance

After deployment:
- ✅ **Latency**: 1-2 seconds (camera to browser)
- ✅ **Buffering**: Zero
- ✅ **Cache Hit Rate**: 95%+
- ✅ **Concurrent Users**: 1000+
- ✅ **Smooth Streaming**: Hours without interruption
- ✅ **RAM Cache Usage**: 50-500MB in /dev/shm
- ✅ **"Stream Paused" Overlay**: Removed for players

---

## 📞 Emergency Rollback

If something goes wrong:
```bash
# Restore nginx.conf
sudo cp /etc/nginx/nginx.conf.backup-* /etc/nginx/nginx.conf

# Restore andar-bahar config
sudo cp /etc/nginx/sites-available/andar-bahar.backup-* /etc/nginx/sites-available/andar-bahar

# Test and reload
sudo nginx -t
sudo systemctl reload nginx

# Restore server.js
cd /var/www/andar-bahar/reddy-anna/live_stream
cp server.js.backup server.js
pm2 restart streaming-server
```

---

**Your VPS-powered ultra-low latency streaming is ready!** 🚀
