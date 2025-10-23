# Streaming Diagnosis and Fix Plan

## Current Status Analysis

✅ **Build Files**: `/root/reddy-anna/dist/public/index.html` exists
❌ **HLS Files**: `/root/reddy-anna/media/live/` directory is empty
❌ **HLS Endpoint**: `http://91.108.110.72:8000/live/stream.m3u8` returns 404

## Root Cause

The RTMP server is receiving streams (we saw this in logs), but the HLS conversion is not working. The media directory is empty, which means ffmpeg is not converting RTMP to HLS.

## Immediate Fix Steps

### Step 1: Check if ffmpeg is installed
```bash
ffmpeg -version
```

If not installed:
```bash
sudo apt update
sudo apt install ffmpeg
```

### Step 2: Check RTMP Server Configuration
The RTMP server might not be configured to generate HLS files. Let's check the configuration.

### Step 3: Start a Test Stream
Start OBS streaming to:
- **Server**: `rtmp://91.108.110.72:1935/live`
- **Stream Key**: `stream`

### Step 4: Monitor HLS Generation
While streaming, watch for files:
```bash
watch -n 1 'ls -la /root/reddy-anna/media/live/'
```

### Step 5: Test HLS Access
Once files appear, test:
```bash
curl http://91.108.110.72:8000/live/stream.m3u8
```

## Configuration Issues to Check

### RTMP Server Configuration
The RTMP server needs to be configured to:
1. Accept RTMP streams on port 1935
2. Convert RTMP to HLS using ffmpeg
3. Serve HLS files on port 8000

### HLS Generation Settings
- **Output Directory**: `/root/reddy-anna/media/live/`
- **Segment Duration**: 6 seconds
- **Playlist Size**: 3 segments
- **Codec**: H.264 + AAC

## Troubleshooting Commands

### Check RTMP Server Status
```bash
netstat -tlnp | grep 1935
netstat -tlnp | grep 8000
```

### Check Media Directory Permissions
```bash
ls -la /root/reddy-anna/media/
chmod 755 /root/reddy-anna/media/live/
```

### Test RTMP Connection
```bash
telnet 91.108.110.72 1935
```

## Expected Behavior

When streaming starts:
1. OBS connects to `rtmp://91.108.110.72:1935/live`
2. RTMP server accepts the stream
3. ffmpeg converts RTMP to HLS
4. HLS files appear in `/media/live/`
5. HLS manifest available at `http://91.108.110.72:8000/live/stream.m3u8`
6. Frontend plays the HLS stream

## If Still Not Working

1. **Check ffmpeg installation**
2. **Verify RTMP server configuration**
3. **Check media directory permissions**
4. **Restart the application**
5. **Check for firewall issues**

## Next Steps

1. Install ffmpeg if missing
2. Start OBS stream test
3. Monitor HLS file generation
4. Test HLS playback
5. Fix any remaining configuration issues
