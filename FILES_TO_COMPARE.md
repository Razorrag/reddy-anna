# 📋 Files to Get from Working Server

## Critical Files to Compare

### 1. **Streaming Server Configuration**
```bash
# From working server, run:
cat /var/www/andar-bahar/reddy-anna/live_stream/server.js
```

### 2. **NGINX Configuration**
```bash
# From working server, run:
cat /etc/nginx/sites-available/andar-bahar
# OR
cat /etc/nginx/sites-available/reddy-anna
# OR
cat /etc/nginx/sites-available/rajugarikossu.com
```

### 3. **Client VideoArea Component**
```bash
# From working server, run:
cat /var/www/andar-bahar/reddy-anna/client/src/components/MobileGameLayout/VideoArea.tsx
```

### 4. **Client index.html (HLS.js library)**
```bash
# From working server, run:
cat /var/www/andar-bahar/reddy-anna/client/index.html
```

### 5. **Stream Routes (Backend API)**
```bash
# From working server, run:
cat /var/www/andar-bahar/reddy-anna/server/stream-routes.ts
```

### 6. **PM2 Configuration**
```bash
# From working server, run:
pm2 list
pm2 show streaming-server
```

### 7. **Database Config (Check what's in DB)**
```sql
-- Run in Supabase SQL Editor on WORKING server's database:
SELECT * FROM simple_stream_config;
```

### 8. **Environment Variables**
```bash
# From working server, run:
cat /var/www/andar-bahar/reddy-anna/.env | grep -E "STREAM|HLS|RTMP"
```

## Quick Commands to Run on Working Server

```bash
# SSH into working server
ssh root@<WORKING_SERVER_IP>

# Get all files at once
cd /var/www/andar-bahar/reddy-anna

echo "=== STREAMING SERVER CONFIG ==="
cat live_stream/server.js

echo ""
echo "=== NGINX CONFIG ==="
cat /etc/nginx/sites-available/*andar* 2>/dev/null || cat /etc/nginx/sites-available/*reddy* 2>/dev/null

echo ""
echo "=== PM2 STATUS ==="
pm2 list

echo ""
echo "=== STREAMING SERVER LOGS ==="
pm2 logs streaming-server --lines 20 --nostream

echo ""
echo "=== CHECK IF HLS FILES EXIST ==="
ls -lh live_stream/media/live/test/ 2>/dev/null || echo "No HLS files found"

echo ""
echo "=== CLIENT INDEX.HTML (HLS.js) ==="
grep -A 5 "hls.js" client/index.html

echo ""
echo "=== VIDEOAREA COMPONENT (HLS CONFIG) ==="
grep -A 30 "Hls({" client/src/components/MobileGameLayout/VideoArea.tsx
```

## Most Important Comparisons

### Priority 1: Streaming Server Config
Compare `live_stream/server.js`:
- `hlsFlags` settings
- Port configuration (8000)
- Media root path

### Priority 2: NGINX Config
Compare nginx config:
- `/live/` proxy settings
- Port forwarding (8000)
- CORS headers

### Priority 3: HLS.js Configuration
Compare VideoArea.tsx:
- HLS.js buffer settings
- Error handling
- Stream URL handling

### Priority 4: Database
Compare database:
- `stream_url` value
- `is_active` status
- `stream_type` value

## What I'm Looking For

1. **Different HLS segment settings** (hls_time, hls_list_size)
2. **Different NGINX proxy config** (buffering, timeouts)
3. **Different HLS.js client config** (buffer sizes, latency settings)
4. **Different stream URL format** (http vs https, different path)
5. **Different PM2 configuration** (environment variables)

## Send Me These

Just copy-paste the output of the commands above, or send me:

1. ✅ `live_stream/server.js` content
2. ✅ NGINX config content
3. ✅ VideoArea.tsx HLS.js section
4. ✅ Database `simple_stream_config` row
5. ✅ PM2 logs (last 20 lines)

Then I can tell you EXACTLY what's different and fix it! 🔍
