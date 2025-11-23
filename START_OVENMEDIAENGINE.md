# OvenMediaEngine Not Running - Start Guide

## Problem Detected

Port 8081 (OME API) is not responding, which means **OvenMediaEngine is NOT running**.

```bash
curl: (7) Failed to connect to localhost port 8081 after 2 ms: Could not connect to server
```

This is why:
- Stream URL returns 404
- Black screen on frontend
- OBS can't connect

---

## Solution: Start OvenMediaEngine

### Step 1: Check if OvenMediaEngine process exists
```bash
ps aux | grep ovenmedia
```

**If no process found**, OME is stopped.

### Step 2: Start OvenMediaEngine

**Method 1: Using systemd (if installed as service)**
```bash
# Start the service
systemctl start ovenmediaengine

# Check status
systemctl status ovenmediaengine

# Enable auto-start on boot
systemctl enable ovenmediaengine
```

**Method 2: Direct binary execution (if not a service)**
```bash
# Navigate to OME directory
cd /opt/ovenmediaengine

# Find the binary
ls -la bin/

# Start OvenMediaEngine
./bin/OvenMediaEngine -c conf/Server.xml &

# Or if it's in a different location:
/usr/bin/OvenMediaEngine -c /opt/ovenmediaengine/conf/Server.xml &
```

**Method 3: Docker (if running in container)**
```bash
# Check if it's a Docker container
docker ps -a | grep ovenmedia

# Start the container
docker start ovenmediaengine

# Or restart
docker restart ovenmediaengine
```

### Step 3: Verify OvenMediaEngine Started

**Check process:**
```bash
ps aux | grep OvenMediaEngine
```

Expected output:
```
root     12345  0.5  2.1 1234567 123456 ?     Ssl  17:30   0:01 /usr/bin/OvenMediaEngine -c /opt/ovenmediaengine/conf/Server.xml
```

**Check API port:**
```bash
curl http://localhost:8081/v1/vhosts/default/apps/live/streams
```

Expected output (when no streams active):
```json
{
  "statusCode": 200,
  "message": "OK",
  "response": []
}
```

**Check listening ports:**
```bash
netstat -tulpn | grep ovenmedia
```

Expected output:
```
tcp    0.0.0.0:1935   0.0.0.0:*    LISTEN   12345/OvenMediaEngine  (RTMP input)
tcp    0.0.0.0:8080   0.0.0.0:*    LISTEN   12345/OvenMediaEngine  (LL-HLS output)
tcp    0.0.0.0:8081   0.0.0.0:*    LISTEN   12345/OvenMediaEngine  (API)
```

**Check logs:**
```bash
# If logs exist
tail -f /var/log/ovenmediaengine/ovenmediaengine.log

# Or check systemd logs
journalctl -u ovenmediaengine -f
```

---

## Common Issues & Solutions

### Issue 1: "Permission denied"

**Solution:**
```bash
# Run as root or with sudo
sudo systemctl start ovenmediaengine

# Or
sudo /opt/ovenmediaengine/bin/OvenMediaEngine -c /opt/ovenmediaengine/conf/Server.xml &
```

### Issue 2: "Address already in use"

Another process is using ports 1935, 8080, or 8081.

**Solution:**
```bash
# Find what's using the port
lsof -i :1935
lsof -i :8080
lsof -i :8081

# Kill the process
kill -9 <PID>

# Then start OME again
systemctl start ovenmediaengine
```

### Issue 3: Configuration file not found

**Solution:**
```bash
# Verify config exists
ls -la /opt/ovenmediaengine/conf/Server.xml

# If not there, find it
find /opt -name "Server.xml"

# Start with correct path
/usr/bin/OvenMediaEngine -c /correct/path/to/Server.xml &
```

### Issue 4: Binary not found

**Solution:**
```bash
# Find the binary
find /opt -name "OvenMediaEngine" -type f

# Or search in common locations
ls -la /usr/bin/OvenMediaEngine
ls -la /usr/local/bin/OvenMediaEngine
ls -la /opt/ovenmediaengine/bin/OvenMediaEngine

# Make executable if needed
chmod +x /path/to/OvenMediaEngine
```

---

## After Starting OvenMediaEngine

### 1. Verify All Ports Are Listening

```bash
netstat -tulpn | grep -E "1935|8080|8081"
```

Should show:
- Port 1935: RTMP input (for OBS)
- Port 8080: LL-HLS output (for players)
- Port 8081: REST API (for management)

### 2. Test Stream Endpoint

```bash
# Should return 404 (stream not found) - but connection works
curl -I http://localhost:8080/live/stream/llhls.m3u8

# Should return 200 with empty array
curl http://localhost:8081/v1/vhosts/default/apps/live/streams
```

### 3. Start OBS Streaming

Configure OBS:
```
Server: rtmp://72.61.170.227:1935/live
Stream Key: stream
```

Click "Start Streaming"

### 4. Verify Stream Created

```bash
# Should now show the stream
curl http://localhost:8081/v1/vhosts/default/apps/live/streams

# Should return 200 with playlist
curl http://localhost:8080/live/stream/llhls.m3u8
```

### 5. Check Frontend

1. Refresh game page (Ctrl+F5)
2. Video should start playing
3. LIVE badge should appear
4. Viewer count should show

---

## Quick Start Script

Save this as `start_ome.sh`:

```bash
#!/bin/bash

echo "🚀 Starting OvenMediaEngine..."

# Try systemd first
if systemctl is-enabled ovenmediaengine 2>/dev/null; then
    echo "📦 Using systemd..."
    systemctl start ovenmediaengine
    sleep 2
    systemctl status ovenmediaengine
else
    echo "🔧 Using direct execution..."
    /opt/ovenmediaengine/bin/OvenMediaEngine -c /opt/ovenmediaengine/conf/Server.xml &
    sleep 2
fi

echo ""
echo "🔍 Checking status..."

# Check process
if ps aux | grep -v grep | grep OvenMediaEngine > /dev/null; then
    echo "✅ OvenMediaEngine process running"
else
    echo "❌ OvenMediaEngine process NOT running"
    exit 1
fi

# Check ports
echo ""
echo "🌐 Checking ports..."
netstat -tulpn | grep -E "1935|8080|8081"

# Check API
echo ""
echo "📡 Testing API..."
curl -s http://localhost:8081/v1/vhosts/default/apps/live/streams | head -n 5

echo ""
echo "✅ OvenMediaEngine started successfully!"
echo ""
echo "Next steps:"
echo "1. Start OBS: rtmp://72.61.170.227:1935/live"
echo "2. Stream Key: stream"
echo "3. Refresh game page"
```

Make executable and run:
```bash
chmod +x start_ome.sh
./start_ome.sh
```

---

## Installation Check

If OvenMediaEngine is not installed at all:

```bash
# Check if binary exists
which OvenMediaEngine

# Check installation directory
ls -la /opt/ovenmediaengine/
ls -la /usr/bin/OvenMediaEngine
ls -la /usr/local/bin/OvenMediaEngine
```

If not found, you may need to reinstall OvenMediaEngine.

---

## Summary

**Current Issue:** OvenMediaEngine is stopped

**Solution:** Start OvenMediaEngine using one of the methods above

**After Starting:**
1. Verify ports 1935, 8080, 8081 are listening
2. Start OBS streaming
3. Refresh frontend
4. Stream should display

**Expected Timeline:**
- Start OME: 5 seconds
- Start OBS: 5 seconds
- Stream appears: 10 seconds
- **Total: 20 seconds from stopped to streaming**