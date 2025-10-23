# 🎥 Reddy Anna Live Streaming - Complete Fix Guide

## 🚨 Current Issue Status

✅ **Build Files**: Application built successfully  
✅ **RTMP Server**: Running and accepting connections  
❌ **HLS Generation**: Not working - No HLS files created  
❌ **Stream Playback**: Frontend cannot load stream  

## 🔧 Root Cause Analysis

The RTMP server is configured correctly and receiving streams (we saw logs showing stream start/end), but **ffmpeg is not converting RTMP to HLS**. This means:

1. OBS can connect to `rtmp://91.108.110.72:1935/live`
2. RTMP server accepts the stream
3. **Missing**: ffmpeg conversion to HLS format
4. **Missing**: HLS files in `/media/live/` directory
5. **Result**: Frontend cannot play the stream

## 🛠️ Immediate Fix Steps

### Step 1: Run the Fix Script
```bash
# On the production server:
chmod +x /root/reddy-anna/scripts/fix-streaming.sh
./reddy-anna/scripts/fix-streaming.sh
```

**This script will:**
- ✅ Check and install ffmpeg if missing
- ✅ Create media directories with proper permissions
- ✅ Test ffmpeg functionality
- ✅ Restart the application
- ✅ Show current status

### Step 2: Run the Test Script
```bash
# After fix script completes:
chmod +x /root/reddy-anna/scripts/test-streaming.sh
./reddy-anna/scripts/test-streaming.sh
```

**This script will:**
- ✅ Test all endpoints
- ✅ Check port connectivity
- ✅ Verify media files
- ✅ Show detailed status

### Step 3: Start Test Stream
**OBS Settings:**
- **Server**: `rtmp://91.108.110.72:1935/live`
- **Stream Key**: `stream`
- **Output**: 1280x720, 30fps, 2500 kbps

### Step 4: Monitor HLS Generation
```bash
# Watch for files being created:
watch -n 1 'ls -la /root/reddy-anna/media/live/'
```

**Expected files:**
- `stream.m3u8` (playlist)
- `stream0.ts`, `stream1.ts`, etc. (segments)

### Step 5: Test Stream Access
```bash
# Test direct HLS:
curl http://91.108.110.72:8000/live/stream.m3u8

# Test proxied HLS:
curl http://91.108.110.72:5000/stream/live/stream.m3u8
```

### Step 6: Test in Browser
Open: `http://91.108.110.72:5000`

## 🎯 Expected Results

After running the fix script and starting OBS stream:

1. ✅ **HLS files appear** in `/media/live/`
2. ✅ **HLS endpoints return 200** with valid M3U8 content
3. ✅ **Frontend plays the stream** successfully
4. ✅ **No more HLS errors** in browser console

## 🚨 Troubleshooting

### If HLS files still don't appear:

```bash
# Check ffmpeg installation:
ffmpeg -version

# If not installed:
sudo apt update
sudo apt install ffmpeg

# Check RTMP server logs:
pm2 logs --lines 20

# Restart everything:
pm2 restart reddy-anna-app
```

### If ports are not accessible:

```bash
# Check firewall:
sudo ufw status

# Allow ports:
sudo ufw allow 1935
sudo ufw allow 8000

# Check if ports are listening:
netstat -tlnp | grep 1935
netstat -tlnp | grep 8000
```

### If stream still doesn't play:

1. **Check browser console** for HLS.js errors
2. **Verify CORS headers** are present
3. **Test different browsers** (Chrome, Firefox)
4. **Check network tab** for failed requests

## 📋 Verification Checklist

Run through this checklist after implementing the fix:

- [ ] ffmpeg is installed and working
- [ ] Media directories exist with proper permissions
- [ ] RTMP server is running on port 1935
- [ ] HTTP server is running on port 8000
- [ ] OBS can connect to RTMP server
- [ ] HLS files are generated when streaming
- [ ] HLS endpoints return valid M3U8 content
- [ ] Frontend can play the stream
- [ ] No HLS errors in browser console

## 🎉 Success Indicators

When everything is working, you should see:

```
✅ ffmpeg is installed
✅ Media directory permissions set
✅ RTMP port 1935 is open
✅ HTTP port 8000 is open
✅ HLS files are being created
✅ Stream plays in browser
```

## 📞 Next Steps

1. **Run the fix script** first
2. **Start OBS streaming** 
3. **Monitor HLS file generation**
4. **Test stream in browser**
5. **If issues persist, check logs and run test script**

## 🔧 Manual Commands (if scripts don't work)

```bash
# Install ffmpeg
sudo apt update && sudo apt install -y ffmpeg

# Create directories
mkdir -p /root/reddy-anna/media/live
chmod 755 /root/reddy-anna/media/live

# Restart application
pm2 restart reddy-anna-app

# Test everything
curl http://91.108.110.72:8000/live/stream.m3u8
```

---

**The fix is ready to implement! The main issue is missing ffmpeg for HLS conversion.** 🚀
