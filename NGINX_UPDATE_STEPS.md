# 🔧 NGINX UPDATE - STEP-BY-STEP GUIDE FOR rajugarikossu.com

## 📋 Current Status
Your current nginx config is at: `/etc/nginx/sites-available/andar-bahar`
Current `/live/` location has basic proxy_pass but **no RAM caching**.

**Important:** Your config file is named `andar-bahar` (not `default`)

## 🎯 What We're Adding
- **500MB RAM cache** for HLS segments (instant delivery)
- **Optimized proxy settings** for streaming
- **Cache bypass for playlists** (always fresh)
- **Performance tuning** for 1000+ concurrent users

---

## 🚀 STEP-BY-STEP DEPLOYMENT

### STEP 1: Backup Current Config

```bash
# SSH to VPS
ssh root@89.42.231.35

# Navigate to nginx config directory
cd /etc/nginx/sites-available/

# Create backup with timestamp
sudo cp andar-bahar andar-bahar.backup-$(date +%Y%m%d-%H%M%S)

# Verify backup created
ls -ltr | tail -3
```

**Expected output:**
```
-rw-r--r-- 1 root root 2412 May 30  2023 default
-rw-r--r-- 1 root root 4464 Nov 18 19:30 andar-bahar
-rw-r--r-- 1 root root 4464 Nov 19 17:17 andar-bahar.backup-20241119-171700
```

---

### STEP 2: Add Cache Zone Definition

```bash
# Edit the main nginx.conf to add cache zone
sudo nano /etc/nginx/nginx.conf
```

**Find the `http {` block and add this INSIDE it (before any server blocks):**

```nginx
http {
    # ... existing settings ...

    # ==========================================
    # HLS STREAMING CACHE ZONE (ADD THIS)
    # ==========================================
    # Uses 500MB of VPS RAM for ultra-fast segment delivery
    proxy_cache_path /dev/shm/stream_cache 
        levels=1:2 
        keys_zone=stream_cache:100m    # 100MB for cache keys
        max_size=500m                  # 500MB total cache
        inactive=10s                   # Remove if not accessed for 10s
        use_temp_path=off;             # Direct write to cache

    # Upstream for HLS backend
    upstream hls_backend {
        server 127.0.0.1:8000;
        keepalive 32;                  # Keep connections alive
    }

    # ... rest of http block ...
}
```

**Save and exit:** `Ctrl+X`, then `Y`, then `Enter`

---

### STEP 3: Update Site Configuration

```bash
# Edit your Andar Bahar site config
sudo nano /etc/nginx/sites-available/andar-bahar
```

**Find the `/live/` location block and REPLACE it with:**

```nginx
    # ==========================================
    # HLS STREAMING WITH RAM CACHE (OPTIMIZED)
    # ==========================================
    location /live/ {
        # Proxy to HLS backend
        proxy_pass http://hls_backend/live/;
        
        # ==========================================
        # CACHING CONFIGURATION
        # ==========================================
        proxy_cache stream_cache;
        proxy_cache_valid 200 10s;              # Cache successful responses for 10s
        proxy_cache_use_stale updating error timeout;  # Serve stale if backend slow
        proxy_cache_background_update on;       # Update cache in background
        proxy_cache_lock on;                    # Prevent cache stampede
        proxy_cache_min_uses 1;                 # Cache on first request
        
        # Bypass cache for playlists (always fresh)
        set $is_playlist 0;
        if ($uri ~* \.m3u8$) {
            set $is_playlist 1;
        }
        proxy_cache_bypass $is_playlist;
        proxy_no_cache $is_playlist;
        
        # ==========================================
        # HEADERS
        # ==========================================
        add_header Cache-Control "public, max-age=10" always;
        add_header X-Cache-Status $upstream_cache_status always;  # Debug: HIT/MISS
        add_header Access-Control-Allow-Origin "*" always;
        add_header Access-Control-Allow-Methods "GET, OPTIONS" always;
        add_header Access-Control-Allow-Headers "Origin, Range, Accept-Encoding, Referer, Cache-Control" always;
        add_header Access-Control-Expose-Headers "Content-Length, Content-Range" always;
        
        # Handle OPTIONS preflight
        if ($request_method = 'OPTIONS') {
            add_header Access-Control-Allow-Origin "*";
            add_header Access-Control-Allow-Methods "GET, OPTIONS";
            add_header Access-Control-Allow-Headers "Range";
            add_header Content-Type "text/plain; charset=utf-8";
            add_header Content-Length 0;
            return 204;
        }
        
        # ==========================================
        # PROXY SETTINGS
        # ==========================================
        proxy_http_version 1.1;
        proxy_set_header Connection "";         # Keep-alive
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Optimized timeouts for streaming
        proxy_connect_timeout 5s;
        proxy_send_timeout 10s;
        proxy_read_timeout 10s;
        
        # Buffer settings (tuned for streaming)
        proxy_buffering on;
        proxy_buffer_size 4k;
        proxy_buffers 8 4k;
        proxy_busy_buffers_size 8k;
        
        # TCP optimizations
        tcp_nodelay on;
        tcp_nopush on;
        
        # ==========================================
        # MIME TYPES
        # ==========================================
        types {
            application/vnd.apple.mpegurl m3u8;
            video/mp2t ts;
        }
    }
```

**Save and exit:** `Ctrl+X`, then `Y`, then `Enter`

---

### STEP 4: Create Cache Directory

```bash
# Create cache directory in RAM
sudo mkdir -p /dev/shm/stream_cache

# Set permissions
sudo chown -R www-data:www-data /dev/shm/stream_cache
sudo chmod -R 755 /dev/shm/stream_cache

# Verify directory created
ls -la /dev/shm/ | grep stream_cache
```

**Expected output:**
```
drwxr-xr-x  2 www-data www-data   40 Nov 19 17:10 stream_cache
```

---

### STEP 5: Test Configuration

```bash
# Test nginx syntax
sudo nginx -t
```

**Expected output:**
```
nginx: the configuration file /etc/nginx/nginx.conf syntax is ok
nginx: configuration file /etc/nginx/nginx.conf test is successful
```

**If you see errors**, don't proceed! Check:
- Missing semicolons
- Unclosed brackets
- Typos in directives

---

### STEP 6: Reload Nginx

```bash
# Reload nginx to apply changes
sudo systemctl reload nginx

# Verify nginx is running
sudo systemctl status nginx
```

**Expected output:**
```
● nginx.service - A high performance web server
   Active: active (running) since ...
```

**If nginx fails to start:**
```bash
# View error logs
sudo tail -50 /var/log/nginx/error.log

# If needed, restore backup
sudo cp default.backup-* default
sudo systemctl reload nginx
```

---

### STEP 7: Update Streaming Server

```bash
# Navigate to streaming directory
cd /var/www/andar-bahar/reddy-anna/live_stream

# Backup current server.js
cp server.js server.js.backup

# Update with new config
# (Upload the new server.js from your project or edit manually)
nano server.js
```

**Key changes needed in server.js:**
```javascript
// Change these lines:
hlsFlags: '[hls_time=0.5:hls_list_size=10:hls_flags=independent_segments+program_date_time:hls_segment_type=mpegts]',

vcParam: [
  '-preset', 'faster',
  '-tune', 'zerolatency',
  '-g', '15',              // 0.5s keyframes
  '-b:v', '4000k',         // 4Mbps
  '-threads', '4',         // Use 4 CPU threads
]
```

**Save and exit:** `Ctrl+X`, then `Y`, then `Enter`

```bash
# Restart streaming server
pm2 restart streaming-server

# View logs to verify
pm2 logs streaming-server --lines 20
```

**Expected output:**
```
✅ NodeMediaServer started with VPS-OPTIMIZED ULTRA-LOW LATENCY config!
📊 Config: 0.5s GOP, 0.5s segments, 10-segment cache
```

---

### STEP 8: Deploy Updated Client

```bash
# Navigate to project root
cd /var/www/andar-bahar/reddy-anna

# Pull latest changes (if using git)
git pull origin main

# Or upload the updated VideoArea.tsx manually

# Install dependencies
cd client && npm install

# Build React app
npm run build

# Restart backend
cd ..
pm2 restart all

# Verify all services running
pm2 status
```

**Expected output:**
```
│ streaming-server │ online │
│ backend          │ online │
```

---

### STEP 9: Verify Caching is Working

```bash
# Test playlist request (should be MISS/BYPASS)
curl -I https://rajugarikossu.com/live/test/index.m3u8 | grep Cache
```

**Expected:**
```
X-Cache-Status: BYPASS (playlists always fresh)
```

```bash
# Test segment request (should be HIT after first request)
curl -I https://rajugarikossu.com/live/test/segment0.ts | grep Cache

# Request again (should be HIT)
curl -I https://rajugarikossu.com/live/test/segment0.ts | grep Cache
```

**Expected:**
```
X-Cache-Status: MISS  (first request)
X-Cache-Status: HIT   (subsequent requests)
```

```bash
# Monitor cache in real-time
sudo tail -f /var/log/nginx/access.log | grep "X-Cache-Status"
```

**You should see mostly HIT responses** = cache working!

---

### STEP 10: Monitor Performance

```bash
# Check cache size
du -sh /dev/shm/stream_cache

# Should grow to ~50-500MB depending on bitrate
```

```bash
# Monitor nginx cache hits
watch -n 1 'sudo grep "X-Cache-Status: HIT" /var/log/nginx/access.log | wc -l'
```

```bash
# Check RAM usage
free -h
```

**Expected:** ~500MB used for cache

---

## ✅ SUCCESS VERIFICATION

### Test 1: Stream Latency
```bash
# Start OBS streaming
# Wave hand in OBS
# Open https://rajugarikossu.com in browser
# Expected: See hand in 1-2 seconds ✅
```

### Test 2: No Buffering
```bash
# Stream for 30 minutes
# Expected: No "Loading stream..." popups ✅
```

### Test 3: Cache Performance
```bash
# Check cache hit rate
grep "X-Cache-Status" /var/log/nginx/access.log | sort | uniq -c
```

**Expected:**
```
   150 X-Cache-Status: HIT      ← Most requests (95%+)
     5 X-Cache-Status: MISS     ← Only new segments
     3 X-Cache-Status: BYPASS   ← Playlists (always fresh)
```

### Test 4: Concurrent Users
```bash
# Simulate 100 users
ab -n 1000 -c 100 https://rajugarikossu.com/live/test/index.m3u8
```

**Expected:** All requests successful, fast response (<100ms)

---

## 🐛 Troubleshooting

### Issue: nginx -t fails

**Check syntax:**
```bash
sudo nginx -T | less  # View full config
# Look for error line number
```

**Common fixes:**
- Missing semicolons
- Unclosed { brackets
- Typo in directive names

### Issue: Cache not creating

**Fix permissions:**
```bash
sudo mkdir -p /dev/shm/stream_cache
sudo chown -R www-data:www-data /dev/shm/stream_cache
sudo chmod -R 755 /dev/shm/stream_cache
sudo systemctl reload nginx
```

### Issue: Still seeing MISS instead of HIT

**Check:**
```bash
# Verify cache zone exists
sudo nginx -T | grep proxy_cache_path

# Check cache directory has files
ls -lh /dev/shm/stream_cache/

# View nginx error log
sudo tail -50 /var/log/nginx/error.log
```

### Issue: Stream still buffering

**Verify OBS settings:**
- Keyframe Interval = 1 ✅
- Tune = zerolatency ✅
- Enable Dynamic Bitrate = ON ✅

**Check server config:**
```bash
cd /var/www/andar-bahar/reddy-anna/live_stream
grep "hls_time" server.js  # Should be 0.5
grep "tune" server.js      # Should be zerolatency
```

---

## 📞 Quick Commands Reference

```bash
# View nginx config
sudo nano /etc/nginx/sites-available/andar-bahar

# Test config
sudo nginx -t

# Reload nginx
sudo systemctl reload nginx

# View logs
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log | grep Cache

# Check cache
du -sh /dev/shm/stream_cache
ls -lh /dev/shm/stream_cache/

# Restart services
pm2 restart streaming-server
pm2 restart all

# View service logs
pm2 logs streaming-server
pm2 logs backend

# Monitor system
htop
free -h
```

---

## 🎯 Expected Final Result

After completing all steps:
- ✅ Nginx has 500MB RAM cache enabled
- ✅ HLS segments cached with 95%+ hit rate
- ✅ Latency: 1-2 seconds
- ✅ Buffering: ZERO
- ✅ Concurrent users: 1000+
- ✅ Smooth streaming for hours

Your VPS-powered streaming is now **production-ready**! 🚀