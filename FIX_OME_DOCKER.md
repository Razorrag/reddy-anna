# OvenMediaEngine Docker Configuration Fix

## Critical Discovery

OvenMediaEngine is running in **Docker**, not as a native process!

Your `docker-compose.yml` shows:
- Container name: `ovenmediaengine`
- Config mounted: `./conf:/opt/ovenmediaengine/bin/origin_conf`
- **API Port:** 9999 (not 8081!) mapped to host port 9999
- **LL-HLS Port:** 8080 mapped to host port 8080
- **RTMP Port:** 1935 mapped to host port 1935

## The Real Configuration

Your OvenMediaEngine is using the correct Server.xml, but Docker maps the ports differently:

**Inside Container:**
- API Port: 9999 (not 8081)
- LL-HLS Port: 8080
- RTMP Port: 1935

**On Host (VPS):**
- API Port: 9999 → localhost:9999
- LL-HLS Port: 8080 → 72.61.170.227:8080
- RTMP Port: 1935 → 72.61.170.227:1935

---

## Solution: Use Correct Ports

### Step 1: Test with Correct API Port

```bash
# Use port 9999 instead of 8081
curl http://localhost:9999/v1/vhosts/default/apps/live/streams
```

**Expected output:**
```json
{
  "statusCode": 200,
  "message": "OK",
  "response": []
}
```

### Step 2: Verify Container is Running

```bash
# Check Docker container status
docker ps | grep ovenmediaengine

# Should show:
# CONTAINER ID   IMAGE                              STATUS
# xxxxxxxxx      airensoft/ovenmediaengine:latest   Up X hours
```

### Step 3: Check Container Logs

```bash
# View OvenMediaEngine logs
docker logs ovenmediaengine --tail 50

# Or follow live
docker logs -f ovenmediaengine
```

### Step 4: Verify All Ports Are Listening

```bash
# Check host ports
netstat -tulpn | grep -E "1935|8080|9999"

# Should show:
# tcp 0.0.0.0:1935 ... docker-proxy
# tcp 0.0.0.0:8080 ... docker-proxy
# tcp 0.0.0.0:9999 ... docker-proxy
```

---

## Your Correct Stream Configuration

Based on Docker setup:

### For Admin Panel:
```
Stream URL: http://72.61.170.227:8080/live/stream/llhls.m3u8
Stream Type: Video (MP4 / HLS)
Loop Mode: OFF
```

### For OBS:
```
Server: rtmp://72.61.170.227:1935/live
Stream Key: stream
```

### API Endpoint (for monitoring):
```
http://72.61.170.227:9999/v1/vhosts/default/apps/live/streams
```

---

## Understanding Docker Volume Mount

The docker-compose.yml shows:
```yaml
volumes:
  - ./conf:/opt/ovenmediaengine/bin/origin_conf
```

This means:
- Host: `/opt/ovenmediaengine/conf/` (your Server.xml location)
- Container: `/opt/ovenmediaengine/bin/origin_conf`
- The container reads your Server.xml as `origin_conf`

**So the container IS using your Server.xml configuration!** ✅

---

## Verification Commands

### 1. Check Container Status
```bash
docker ps -a | grep ovenmediaengine
```

If not running:
```bash
cd /opt/ovenmediaengine
docker-compose up -d
```

### 2. Check API (Correct Port)
```bash
# Inside container uses port 9999
curl http://localhost:9999/v1/vhosts/default/apps/live/streams
```

### 3. Check LL-HLS Endpoint
```bash
# Should return 404 (stream not found) but connection works
curl -I http://localhost:8080/live/stream/llhls.m3u8
```

### 4. View Container Logs
```bash
docker logs ovenmediaengine --tail 100
```

Look for:
```
[LLHLS Publisher] Server is listening on port 8080
[RTMP Provider] Server is listening on port 1935
```

---

## Start/Restart Container

### Restart Container
```bash
cd /opt/ovenmediaengine
docker-compose restart
```

### Stop Container
```bash
cd /opt/ovenmediaengine
docker-compose down
```

### Start Container
```bash
cd /opt/ovenmediaengine
docker-compose up -d
```

### View Logs in Real-Time
```bash
docker logs -f ovenmediaengine
```

---

## Test Complete Flow

### 1. Verify Container Running
```bash
docker ps | grep ovenmediaengine
```

### 2. Check API Responds
```bash
curl http://localhost:9999/v1/vhosts/default/apps/live/streams
```

Expected: `{"statusCode":200,"message":"OK","response":[]}`

### 3. Start OBS
```
Server: rtmp://72.61.170.227:1935/live
Stream Key: stream
```
Click "Start Streaming"

### 4. Verify Stream in Container
```bash
# Should now show "stream" in response
curl http://localhost:9999/v1/vhosts/default/apps/live/streams
```

### 5. Test LL-HLS Endpoint
```bash
# Should return playlist, not 404
curl http://localhost:8080/live/stream/llhls.m3u8
```

### 6. Check Frontend
1. Refresh game page (Ctrl+F5)
2. Video should display
3. LIVE badge appears
4. Viewer count shows

---

## Update Admin Panel (If Needed)

Your stream URL in admin panel should be:
```
http://72.61.170.227:8080/live/stream/llhls.m3u8
```

This is correct! The LL-HLS port 8080 is properly exposed by Docker.

---

## Docker Configuration Summary

**Current Setup (Correct):**
```yaml
ports:
  - "1935:1935"    # RTMP for OBS ✓
  - "9999:9999"    # API for monitoring ✓
  - "8080:8080"    # LL-HLS for players ✓
  - "3333:3333"    # WebRTC (not used)
  - "3478:3478/udp" # WebRTC TURN (not used)
  - "10000-10010:10000-10010/udp" # WebRTC (not used)

volumes:
  - ./conf:/opt/ovenmediaengine/bin/origin_conf  # Your Server.xml ✓

restart: unless-stopped  # Auto-restart ✓
```

Everything is configured correctly!

---

## Why Stream Wasn't Working

1. ✅ Docker configuration is correct
2. ✅ Ports are properly mapped
3. ✅ Server.xml is being used
4. ❌ Frontend had HLS.js bug (FIXED)
5. ❌ We were checking wrong API port (8081 instead of 9999)

---

## Final Verification Script

```bash
#!/bin/bash

echo "🐳 Checking OvenMediaEngine Docker Setup..."
echo ""

# 1. Container status
echo "1️⃣ Container Status:"
docker ps | grep ovenmediaengine || echo "❌ Container not running!"
echo ""

# 2. API check (correct port)
echo "2️⃣ API Check (port 9999):"
curl -s http://localhost:9999/v1/vhosts/default/apps/live/streams | head -n 5
echo ""

# 3. Ports listening
echo "3️⃣ Ports Listening:"
netstat -tulpn | grep -E "1935|8080|9999"
echo ""

# 4. Container logs (last 10 lines)
echo "4️⃣ Recent Logs:"
docker logs ovenmediaengine --tail 10
echo ""

echo "✅ If API returned JSON and ports are listening, OME is ready!"
echo "📡 Start OBS streaming to: rtmp://72.61.170.227:1935/live"
echo "🎮 Stream key: stream"
echo "🌐 Frontend URL: http://72.61.170.227:8080/live/stream/llhls.m3u8"
```

Save as `check_ome.sh` and run:
```bash
chmod +x check_ome.sh
./check_ome.sh
```

---

## Summary

**Key Discovery:** OvenMediaEngine runs in Docker with API on port **9999** (not 8081)

**Your Configuration:**
- ✅ Docker setup correct
- ✅ Server.xml being used
- ✅ Ports properly mapped
- ✅ Frontend bug fixed

**Action Required:**
1. Verify container running: `docker ps | grep ovenmediaengine`
2. Test API: `curl http://localhost:9999/v1/vhosts/default/apps/live/streams`
3. Start OBS streaming
4. Refresh frontend → Stream displays!

Everything is ready to work!