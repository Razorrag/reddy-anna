# 🎥 Get OvenMediaEngine Configuration from VPS

## Server Details
- **Server:** `root@srv1118275:/opt/ovenmediaengine`
- **IP:** `72.61.170.227`
- **Protocol:** LL-HLS (Low-Latency HLS)

---

## Step 1: Connect to VPS

```bash
ssh root@72.61.170.227
```

---

## Step 2: Navigate to OvenMediaEngine Directory

```bash
cd /opt/ovenmediaengine
ls -la
```

---

## Step 3: Get OME Configuration

### Check Server Configuration:
```bash
cat conf/Server.xml
```

### Find LL-HLS Port & Settings:
```bash
# Look for LLHLS publisher configuration
grep -A 20 "LLHLS" conf/Server.xml

# Find port configuration
grep -i "port" conf/Server.xml | grep -v "<!--"
```

### Expected Output Should Include:
```xml
<Publishers>
  <LLHLS>
    <Port>3333</Port> <!-- or 8080, 9000, etc -->
    <TLSPort>3334</TLSPort>
    <ChunkDuration>0.5</ChunkDuration>
    <SegmentDuration>6</SegmentDuration>
    <CrossDomains>
      <Url>*</Url>
    </CrossDomains>
  </LLHLS>
</Publishers>
```

---

## Step 4: Check Application & Stream Names

```bash
# Find configured applications
grep -A 10 "<Applications>" conf/Server.xml

# Look for app names
grep -i "<Name>" conf/Server.xml
```

### Expected Format:
```xml
<Applications>
  <Application>
    <Name>app</Name>  <!-- This is your app name -->
    <Type>live</Type>
    <Publishers>
      <LLHLS>...</LLHLS>
    </Publishers>
  </Application>
</Applications>
```

---

## Step 5: Check if OME is Running

```bash
# Check process
ps aux | grep OvenMedia

# Check port status
netstat -tulpn | grep -E "3333|8080|9000"

# Check service status (if running as service)
systemctl status ovenmediaengine
```

---

## Step 6: Test LL-HLS Endpoint

```bash
# Test if LL-HLS endpoint responds
curl -I http://127.0.0.1:3333/app/stream/llhls.m3u8

# Or with your port
curl -I http://127.0.0.1:[PORT]/[APP_NAME]/[STREAM_NAME]/llhls.m3u8
```

### Expected Response:
```
HTTP/1.1 200 OK
Content-Type: application/vnd.apple.mpegurl
Access-Control-Allow-Origin: *
```

---

## Step 7: Get Complete LL-HLS URL

Based on your findings, your LL-HLS URL will be:

```
http://72.61.170.227:[PORT]/[APP_NAME]/[STREAM_NAME]/llhls.m3u8
```

### Common Examples:
```
http://72.61.170.227:3333/app/stream/llhls.m3u8
http://72.61.170.227:8080/app/stream/llhls.m3u8
http://72.61.170.227:9000/live/game/llhls.m3u8
```

---

## Step 8: Check Firewall & Network

```bash
# Check if port is open
sudo ufw status | grep [PORT]

# Open port if needed
sudo ufw allow [PORT]/tcp

# Check if OME is listening on external interface
netstat -tulpn | grep [PORT]
```

---

## Step 9: Copy Entire Server.xml

```bash
# Display entire config (copy this)
cat conf/Server.xml

# Or save to file and download
cat conf/Server.xml > ~/ome_config.xml
```

Then use SCP to download:
```bash
# From your local machine:
scp root@72.61.170.227:/root/ome_config.xml .
```

---

## Step 10: Verify Stream is Active

```bash
# Check active streams
curl http://127.0.0.1:[PORT]/v1/stats/current

# Or specific app
curl http://127.0.0.1:[PORT]/v1/stats/current/[APP_NAME]
```

---

## Quick Copy-Paste Commands

Run these on your VPS and **copy the output back to me**:

```bash
echo "=== OME Directory Contents ==="
ls -la /opt/ovenmediaengine/

echo ""
echo "=== OME Process Status ==="
ps aux | grep -i oven

echo ""
echo "=== Open Ports ==="
netstat -tulpn | grep -E "3333|8080|9000|1935"

echo ""
echo "=== LL-HLS Configuration ==="
grep -A 30 "LLHLS" /opt/ovenmediaengine/conf/Server.xml

echo ""
echo "=== Application Names ==="
grep -A 5 "<Name>" /opt/ovenmediaengine/conf/Server.xml | head -20

echo ""
echo "=== Port Configuration ==="
grep -i "<Port>" /opt/ovenmediaengine/conf/Server.xml | grep -v "<!--"

echo ""
echo "=== CORS Settings ==="
grep -A 5 "CrossDomains" /opt/ovenmediaengine/conf/Server.xml
```

---

## What I Need From You

Please run the commands above and provide me with:

1. ✅ **LL-HLS Port** (e.g., 3333, 8080)
2. ✅ **Application Name** (e.g., "app", "live")
3. ✅ **Stream Name** (e.g., "stream", "game")
4. ✅ **CORS Settings** (should allow `*` or your domain)
5. ✅ **Confirm OME is running** (ps aux output)

---

## Expected LL-HLS URL Format

Once you provide the details, your URL will be:

```
http://72.61.170.227:[PORT]/[APP]/[STREAM]/llhls.m3u8
```

Example:
```
http://72.61.170.227:3333/app/stream/llhls.m3u8
```

This URL will then be entered in your admin panel's Stream Settings.

---

## LL-HLS vs Regular HLS

**Key Differences:**
- LL-HLS uses `/llhls.m3u8` endpoint (not just `.m3u8`)
- Much lower latency (1-3 seconds vs 10-30 seconds)
- Uses chunked transfer encoding
- Requires modern browsers with Media Source Extensions

**Your HLS.js player in VideoArea.tsx already supports LL-HLS!** ✅

---

## Next Steps After Getting URL

1. Copy the LL-HLS URL
2. Open your game admin panel
3. Navigate to Stream Settings
4. Paste URL in "Stream URL" field
5. Select "Video (MP4 / HLS)" as stream type
6. Save configuration
7. Start streaming from OBS to OME
8. Refresh game page - stream should appear!

---

**Ready to proceed once you provide the OME configuration details!** 🚀