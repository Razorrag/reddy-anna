# 🚀 COMPLETE DEPLOYMENT PACKAGE - All Files Ready

## 📦 Files to Deploy to VPS

You have **4 files** to copy to your VPS:

1. `/etc/nginx/nginx.conf` - Main nginx config
2. `/etc/nginx/sites-available/andar-bahar` - Site config
3. `/var/www/andar-bahar/reddy-anna/live_stream/server.js` - Streaming server
4. `/var/www/andar-bahar/reddy-anna/client/` - React app (rebuild needed)

---

## 🎯 STEP-BY-STEP DEPLOYMENT (10 Minutes)

### STEP 1: Backup Everything (1 minute)

```bash
ssh root@89.42.231.35

# Backup nginx configs
sudo cp /etc/nginx/nginx.conf /etc/nginx/nginx.conf.backup-$(date +%Y%m%d-%H%M%S)
sudo cp /etc/nginx/sites-available/andar-bahar /etc/nginx/sites-available/andar-bahar.backup-$(date +%Y%m%d-%H%M%S)

# Backup streaming server
cd /var/www/andar-bahar/reddy-anna/live_stream
cp server.js server.js.backup-$(date +%Y%m%d-%H%M%S)

# Verify backups
ls -ltr /etc/nginx/*.backup*
ls -ltr /var/www/andar-bahar/reddy-anna/live_stream/*.backup*
```

---

### STEP 2: Update nginx.conf (2 minutes)

```bash
# Open the file
sudo nano /etc/nginx/nginx.conf
```

**DELETE EVERYTHING and copy-paste from:** [`NGINX_CONFIG_nginx.conf_COMPLETE.conf`](NGINX_CONFIG_nginx.conf_COMPLETE.conf)

**Save:** `Ctrl+X`, `Y`, `Enter`

---

### STEP 3: Update andar-bahar config (2 minutes)

```bash
# Open the file
sudo nano /etc/nginx/sites-available/andar-bahar
```

**DELETE EVERYTHING and copy-paste from:** [`NGINX_CONFIG_andar-bahar_COMPLETE.conf`](NGINX_CONFIG_andar-bahar_COMPLETE.conf)

⚠️ **BEFORE SAVING**: Verify SSL certificate paths (lines 23-24):
```nginx
ssl_certificate /etc/letsencrypt/live/rajugarikossu.com/fullchain.pem;
ssl_certificate_key /etc/letsencrypt/live/rajugarikossu.com/privkey.pem;
```

**Save:** `Ctrl+X`, `Y`, `Enter`

---

### STEP 4: Update Streaming Server (2 minutes)

```bash
# Navigate to streaming directory
cd /var/www/andar-bahar/reddy-anna/live_stream

# Open server.js
nano server.js
```

**DELETE EVERYTHING and copy-paste from:** [`live_stream/server.js`](live_stream/server.js)

**Save:** `Ctrl+X`, `Y`, `Enter`

---

### STEP 5: Test & Deploy Nginx (2 minutes)

```bash
# Test nginx configuration
sudo nginx -t
```

**Expected output:**
```
nginx: the configuration file /etc/nginx/nginx.conf syntax is ok
nginx: configuration file /etc/nginx/nginx.conf test is successful
```

**If test passes:**
```bash
# Create cache directory
sudo mkdir -p /dev/shm/stream_cache
sudo chown -R www-data:www-data /dev/shm/stream_cache
sudo chmod -R 755 /dev/shm/stream_cache

# Reload nginx
sudo systemctl reload nginx

# Verify nginx is running
sudo systemctl status nginx
```

---

### STEP 6: Restart Streaming Server (1 minute)

```bash
# Make sure you're in the streaming directory
cd /var/www/andar-bahar/reddy-anna/live_stream

# Restart streaming server
pm2 restart streaming-server

# Check logs (should show NEW config)
pm2 logs streaming-server --lines 20
```

**Expected log output:**
```
✅ NodeMediaServer started with VPS-OPTIMIZED ULTRA-LOW LATENCY config!
📊 Config: 0.5s GOP, 0.5s segments, 10-segment cache (5s VPS buffer)
🎯 Target latency: 1-2 seconds
💪 VPS-Powered: 4 CPU threads, 4Mbps bitrate, faster preset
```

**NOT this (old config):**
```
📊 Config: 0.5s GOP, 1s segments, 6-segment cache  ❌ WRONG
```

---

### STEP 7: Rebuild & Deploy React Client (2 minutes)

```bash
# Navigate to client directory
cd /var/www/andar-bahar/reddy-anna/client

# Install dependencies (if needed)
npm install

# Build production version
npm run build

# Restart backend
cd ..
pm2 restart all

# Verify all services
pm2 status
```

**Expected pm2 output:**
```
│ streaming-server │ online │
│ backend          │ online │
```

---

## ✅ VERIFICATION (5 minutes)

### Test 1: Check Streaming Server Config

```bash
pm2 logs streaming-server --lines 5
```

**Must see:**
```
📊 Config: 0.5s GOP, 0.5s segments, 10-segment cache (5s VPS buffer) ✅
```

**NOT:**
```
📊 Config: 0.5s GOP, 1s segments, 6-segment cache ❌
```

---

### Test 2: Check Nginx Cache

```bash
# Test cache for segments (should be HIT after first request)
curl -I https://rajugarikossu.com/live/test/segment0.ts 2>&1 | grep -i cache
curl -I https://rajugarikossu.com/live/test/segment0.ts 2>&1 | grep -i cache
```

**Expected:**
```
X-Cache-Status: MISS  (first request)
X-Cache-Status: HIT   (second request) ✅
```

---

### Test 3: Check Cache Directory

```bash
# Check cache is being used
du -sh /dev/shm/stream_cache
ls -lh /dev/shm/stream_cache/
```

**Expected:** Should show files and ~50-500MB size when streaming

---

### Test 4: Real Stream Test

1. **Start OBS streaming:**
   - URL: `rtmp://89.42.231.35:1935/live`
   - Key: `test`
   - Settings: Keyframe=1, zerolatency, 4000Kbps

2. **Open browser:**
   - Go to: `https://rajugarikossu.com`
   - Start playing stream

3. **Wave hand in OBS:**
   - Expected delay: **1-2 seconds** ✅
   - NOT 3-5 seconds ❌

4. **Watch for 10 minutes:**
   - Expected: **ZERO "Loading stream..." popups** ✅
   - Expected: **Smooth playback, no buffering** ✅

5. **Test pause:**
   - Click pause
   - Expected: **Clean frozen frame, NO "Stream Paused" text** ✅

---

## 🐛 Troubleshooting

### Issue: Still seeing old config in logs

**Solution:**
```bash
cd /var/www/andar-bahar/reddy-anna/live_stream
cat server.js | grep "hls_time"
# Should show: hls_time=0.5

# If shows hls_time=1, the file wasn't updated correctly
# Re-copy from the project
```

---

### Issue: nginx -t fails

**Solution:**
```bash
# View detailed error
sudo nginx -T 2>&1 | less

# Common fixes:
# - Missing semicolons
# - Wrong SSL certificate paths
# - Typos in directive names

# Restore backup if needed
sudo cp /etc/nginx/nginx.conf.backup-* /etc/nginx/nginx.conf
sudo cp /etc/nginx/sites-available/andar-bahar.backup-* /etc/nginx/sites-available/andar-bahar
```

---

### Issue: Cache not working (always MISS)

**Solution:**
```bash
# Check cache directory exists
ls -la /dev/shm/stream_cache/

# Fix permissions
sudo chown -R www-data:www-data /dev/shm/stream_cache
sudo chmod -R 755 /dev/shm/stream_cache

# Reload nginx
sudo systemctl reload nginx
```

---

### Issue: Still buffering after deployment

**Checklist:**
1. ✅ Verify streaming server shows: `0.5s segments, 10-segment cache`
2. ✅ Verify cache is HIT (not MISS) for .ts files
3. ✅ Verify OBS keyframe interval = 1 second
4. ✅ Verify cache directory has files: `ls /dev/shm/stream_cache/`
5. ✅ Verify React client was rebuilt: `ls -lh client/dist/`

---

## 📊 Expected Final Results

After completing all steps:

| Metric | Before | After |
|--------|--------|-------|
| Latency | 3-5s | 1-2s ✅ |
| Buffering | Frequent | Zero ✅ |
| Cache Hit Rate | 0% | 95%+ ✅ |
| "Stream Paused" Text | Visible | Hidden ✅ |
| Segment Size | 1s | 0.5s ✅ |
| Concurrent Users | <100 | 1000+ ✅ |

---

## 📞 Quick Reference Commands

```bash
# View streaming logs
pm2 logs streaming-server

# View nginx logs
sudo tail -f /var/log/nginx/access.log | grep Cache

# Check cache size
du -sh /dev/shm/stream_cache

# Restart everything
pm2 restart all
sudo systemctl reload nginx

# Emergency rollback
sudo cp /etc/nginx/nginx.conf.backup-* /etc/nginx/nginx.conf
sudo cp /etc/nginx/sites-available/andar-bahar.backup-* /etc/nginx/sites-available/andar-bahar
cd /var/www/andar-bahar/reddy-anna/live_stream
cp server.js.backup-* server.js
pm2 restart all
sudo systemctl reload nginx
```

---

## ✅ Success Criteria

Your deployment is successful when you see:

1. ✅ Streaming server logs show: `0.5s segments, 10-segment cache`
2. ✅ Cache shows HIT responses for .ts files
3. ✅ Latency is 1-2 seconds (wave hand test)
4. ✅ Zero buffering during 10+ minute stream
5. ✅ No "Stream Paused" text when pausing
6. ✅ Cache directory shows 50-500MB usage
7. ✅ All pm2 services show "online"

**Your VPS-powered ultra-low latency streaming is now production-ready!** 🚀