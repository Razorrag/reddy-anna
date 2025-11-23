# OvenMediaEngine Using Wrong Configuration File

## Problem Identified

OvenMediaEngine is running but using the WRONG configuration file:

```bash
root 112408 2.6 0.0 295604 30872 ? Ssl 16:08 2:26 /opt/ovenmediaengine/bin/OvenMediaEngine -c origin_conf
```

Notice: `-c origin_conf` instead of `-c conf/Server.xml`

This means:
- ✅ OvenMediaEngine process is running
- ❌ Using wrong configuration (origin_conf)
- ❌ API port 8081 not listening
- ❌ LL-HLS settings from Server.xml NOT being used

---

## Solution: Restart with Correct Configuration

### Step 1: Stop Current Process

```bash
# Kill the current OME process
kill 112408

# Or if that doesn't work
kill -9 112408

# Verify it's stopped
ps aux | grep ovenmedia
```

### Step 2: Check Configuration Files

```bash
# List available configs
ls -la /opt/ovenmediaengine/conf/
ls -la /opt/ovenmediaengine/*.conf
ls -la /opt/ovenmediaengine/origin_conf

# View what's in origin_conf
cat /opt/ovenmediaengine/origin_conf
# OR
cat /root/reddy-anna/origin_conf
```

### Step 3: Start with Correct Configuration

**Option A: Use the Server.xml we analyzed earlier**
```bash
cd /opt/ovenmediaengine
./bin/OvenMediaEngine -c conf/Server.xml &
```

**Option B: Update origin_conf to match Server.xml settings**
```bash
# Make a backup first
cp /opt/ovenmediaengine/origin_conf /opt/ovenmediaengine/origin_conf.backup

# Copy Server.xml settings to origin_conf
cp /opt/ovenmediaengine/conf/Server.xml /opt/ovenmediaengine/origin_conf

# Then restart
cd /opt/ovenmediaengine
./bin/OvenMediaEngine -c origin_conf &
```

### Step 4: Verify Correct Startup

```bash
# Check process with correct config
ps aux | grep OvenMediaEngine

# Should show either:
# -c conf/Server.xml
# OR
# -c origin_conf (if you updated it)

# Verify API port is now listening
curl http://localhost:8081/v1/vhosts/default/apps/live/streams

# Should return JSON, not connection error
```

---

## Why This Happened

The `origin_conf` file likely has DIFFERENT settings than `Server.xml`:

**Server.xml (correct - what we analyzed):**
- RTMP Port: 1935 ✓
- LL-HLS Port: 8080 ✓
- API Port: 8081 ✓
- Application: live ✓
- Segment Duration: 0.5s ✓

**origin_conf (unknown):**
- Ports: ??? (likely different)
- Settings: ??? (likely missing API)
- Application: ??? (might not be "live")

---

## Quick Fix Commands

### Option 1: Full Restart (Recommended)
```bash
# Stop wrong config
kill 112408

# Wait 2 seconds
sleep 2

# Start with correct config
cd /opt/ovenmediaengine
./bin/OvenMediaEngine -c conf/Server.xml &

# Wait 2 seconds
sleep 2

# Verify
curl http://localhost:8081/v1/vhosts/default/apps/live/streams
netstat -tulpn | grep -E "1935|8080|8081"
```

### Option 2: Replace origin_conf
```bash
# Stop wrong config
kill 112408

# Copy correct config
cp /opt/ovenmediaengine/conf/Server.xml /opt/ovenmediaengine/origin_conf

# Start with updated origin_conf
cd /opt/ovenmediaengine
./bin/OvenMediaEngine -c origin_conf &

# Verify
curl http://localhost:8081/v1/vhosts/default/apps/live/streams
```

---

## Verification Checklist

After restarting with correct config:

### 1. Process Running
```bash
ps aux | grep OvenMediaEngine
```
Expected: Process with correct `-c` parameter

### 2. Ports Listening
```bash
netstat -tulpn | grep -E "1935|8080|8081"
```
Expected output:
```
tcp 0.0.0.0:1935 0.0.0.0:* LISTEN 12345/OvenMediaEngine
tcp 0.0.0.0:8080 0.0.0.0:* LISTEN 12345/OvenMediaEngine
tcp 0.0.0.0:8081 0.0.0.0:* LISTEN 12345/OvenMediaEngine
```

### 3. API Responding
```bash
curl http://localhost:8081/v1/vhosts/default/apps/live/streams
```
Expected output:
```json
{
  "statusCode": 200,
  "message": "OK",
  "response": []
}
```

### 4. LL-HLS Endpoint Ready
```bash
curl -I http://localhost:8080/live/stream/llhls.m3u8
```
Expected: 404 (stream not found yet) but connection succeeds

---

## After Fixing Configuration

### 1. Start OBS
```
Server: rtmp://72.61.170.227:1935/live
Stream Key: stream
```
Click "Start Streaming"

### 2. Verify Stream Created
```bash
# Should show stream now
curl http://localhost:8081/v1/vhosts/default/apps/live/streams

# Should return playlist
curl http://localhost:8080/live/stream/llhls.m3u8
```

### 3. Test Frontend
1. Refresh game page (Ctrl+F5)
2. Stream should display
3. LIVE badge appears
4. Viewer count shows

---

## Understanding the Issue

**Current situation:**
```
OME running → origin_conf → Wrong ports/settings → API not available → Stream URL 404
```

**After fix:**
```
OME running → Server.xml → Correct ports/settings → API available → Stream URL works
```

---

## Auto-Start with Correct Config

To ensure OME always starts with correct config:

### Create systemd service
```bash
# Create service file
nano /etc/systemd/system/ovenmediaengine.service
```

Add:
```ini
[Unit]
Description=OvenMediaEngine
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/ovenmediaengine
ExecStart=/opt/ovenmediaengine/bin/OvenMediaEngine -c /opt/ovenmediaengine/conf/Server.xml
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
# Reload systemd
systemctl daemon-reload

# Kill current process
kill 112408

# Start service
systemctl start ovenmediaengine

# Enable auto-start
systemctl enable ovenmediaengine

# Check status
systemctl status ovenmediaengine
```

---

## Summary

**Problem:** OME running with wrong config file (origin_conf)
**Solution:** Restart with correct config (Server.xml)
**Result:** API port 8081 will respond, stream will work

Run these commands now:
```bash
# Stop wrong config
kill 112408

# Start correct config  
cd /opt/ovenmediaengine
./bin/OvenMediaEngine -c conf/Server.xml &

# Verify
curl http://localhost:8081/v1/vhosts/default/apps/live/streams