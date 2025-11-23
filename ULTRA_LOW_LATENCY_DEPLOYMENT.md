# Ultra-Low Latency Streaming Deployment Guide

## Goal
Achieve **sub-1-second latency** (0.6-0.9s) with **zero buffering** and perfect stability.

## Architecture Overview

```
OBS Studio (Encoder)
  ↓ RTMP (1935)
OvenMediaEngine (0.3s segments, 0.1s parts)
  ↓ LL-HLS (8080)
NGINX Proxy (SSL termination)
  ↓ HTTPS
HLS.js Player (Ultra-low latency mode)
  ↓
User sees stream (<1s latency)
```

## Part 1: OvenMediaEngine Configuration

### Step 1: Update OvenMediaEngine Config

Copy the optimized configuration to your server:

```bash
# On VPS (as root)
cd /opt/ovenmediaengine

# Backup current config
cp conf/Server.xml conf/Server.xml.backup-$(date +%Y%m%d)

# Copy new ultra-low latency config
# (Upload Server-UltraLowLatency.xml to server first)
cp Server-UltraLowLatency.xml conf/Server.xml
```

### Step 2: Restart OvenMediaEngine

```bash
# Stop container
docker-compose down

# Start with new config
docker-compose up -d

# Verify it's running
docker logs ovenmediaengine --tail=50
```

### Configuration Details

**Key Settings:**
- **SegmentDuration**: 0.3s (300ms) - Ultra-short segments
- **SegmentCount**: 6 - Total 1.8s buffer for stability
- **PartDuration**: 0.1s (100ms) - Partial segments for LL-HLS
- **PartHoldBack**: 0.5s - Smoother playback

**Expected Latency Breakdown:**
- OBS encoding: ~100ms
- Network transfer: ~50ms
- OME segmentation: ~300ms
- Player buffer: ~300ms
- **Total: 0.75s** ✅

## Part 2: OBS Studio Configuration

### Critical OBS Settings for Low Latency

```
Settings → Output → Streaming:

✅ Output Mode: Advanced
✅ Encoder: x264 or NVENC H.264
✅ Rate Control: CBR (Constant Bitrate)
✅ Bitrate: 3000-5000 Kbps (based on upload speed)

✅ Keyframe Interval: 1 second (CRITICAL!)
   - This must match OME SegmentDuration
   - Type "1" in the field

✅ CPU Usage Preset (x264): veryfast or faster
✅ Profile: main or high
✅ Tune: zerolatency (CRITICAL!)

Settings → Video:
✅ Base Resolution: 1920x1080 or 1280x720
✅ Output Resolution: 1280x720 (recommended)
✅ FPS: 30 (stable) or 25

Settings → Advanced:
✅ Process Priority: High
✅ Network Buffering: Unchecked
```

### OBS Stream Settings

```
Server: rtmp://72.61.170.227:1935/live
Stream Key: stream
```

## Part 3: Frontend Deployment

### Step 1: Deploy Updated Frontend

```bash
# On your local machine (in project directory)

# Build the updated frontend
npm run build

# Deploy to VPS (adjust path as needed)
scp -r dist/* root@72.61.170.227:/root/reddy-anna/dist/
```

### Step 2: Restart Node.js Server

```bash
# On VPS
cd /root/reddy-anna

# Restart the application
pm2 restart all

# Or if not using pm2
pkill node
nohup node dist/index.js > app.log 2>&1 &
```

## Part 4: Verification & Testing

### Test 1: Check Stream Endpoint

```bash
# Test LL-HLS manifest
curl https://rajugarikossu.com/live/stream/llhls.m3u8

# Should return:
#EXTM3U
#EXT-X-VERSION:6
#EXT-X-INDEPENDENT-SEGMENTS
...
```

### Test 2: Verify Segment Duration

```bash
# Check video segment manifest
curl https://rajugarikossu.com/live/stream/chunklist_0_video_*.m3u8

# Look for:
#EXT-X-PART-INF:PART-TARGET=0.100000
#EXTINF:0.300000
```

### Test 3: Monitor Latency in Browser

1. Open browser DevTools (F12)
2. Navigate to game page
3. Click top-left corner 5 times quickly to show debug overlay
4. Check latency reading (should be 0.6-0.9s)

### Test 4: Check for Buffering

1. Watch stream for 5 minutes
2. No buffering spinner should appear
3. Video should play smoothly without stuttering

## Expected Results

✅ **Latency**: 0.6-0.9 seconds (down from 2s)
✅ **Stability**: Zero buffering events
✅ **Quality**: 720p30 with bypass transcoding
✅ **Smoothness**: No stuttering or frame drops

## Troubleshooting

### Issue: High Latency (Still 2s+)

**Solution 1**: Verify OBS keyframe interval is exactly 1 second
```
OBS → Settings → Output → Keyframe Interval = 1
```

**Solution 2**: Check OME is using new config
```bash
docker exec ovenmediaengine cat /opt/ovenmediaengine/bin/origin_conf/Server.xml | grep SegmentDuration
# Should show: <SegmentDuration>0.3</SegmentDuration>
```

**Solution 3**: Clear browser cache and hard refresh (Ctrl+F5)

### Issue: Buffering/Stuttering

**Solution 1**: Check OBS upload is stable
- OBS → View → Stats
- Look for "Dropped Frames" (should be 0%)
- Check "Bitrate" is stable (not fluctuating wildly)

**Solution 2**: Increase SegmentCount in OME (for more buffer)
```xml
<SegmentCount>8</SegmentCount>  <!-- Increase from 6 to 8 -->
```

**Solution 3**: Reduce OBS bitrate if network is unstable
```
Settings → Output → Bitrate: 2500-3000 Kbps
```

### Issue: Player Not Loading

**Solution 1**: Check NGINX is proxying correctly
```bash
curl -I https://rajugarikossu.com/live/stream/llhls.m3u8
# Should return: HTTP/2 200
```

**Solution 2**: Check browser console for errors
- Look for CORS errors
- Look for mixed content warnings
- Look for HLS.js errors

## Performance Monitoring

### Server-Side Monitoring

```bash
# Monitor OME logs
docker logs -f ovenmediaengine

# Check segment generation
ls -lh /opt/ovenmediaengine/data/

# Monitor network
iftop -i eth0
```

### Client-Side Monitoring

Enable debug overlay by clicking top-left corner 5 times:
- **Latency**: Current latency in seconds
- **Buffer**: Forward buffer amount
- **Dropped**: Dropped video frames
- **BW**: Bandwidth estimate in Mbps

## OBS Encoder Comparison

### x264 (CPU Encoding)
- **Pros**: Better quality at lower bitrates
- **Cons**: Higher CPU usage
- **Recommended for**: Powerful CPUs (Intel i7/i9, AMD Ryzen 7/9)

### NVENC (GPU Encoding)
- **Pros**: Low CPU usage, consistent performance
- **Cons**: Slightly lower quality at same bitrate
- **Recommended for**: NVIDIA RTX 2000+ series

### Settings for Each:

**x264:**
```
Encoder: x264
CPU Usage Preset: veryfast
Tune: zerolatency
Profile: main
```

**NVENC:**
```
Encoder: NVENC H.264
Preset: Low-Latency Quality
Profile: high
Look-ahead: OFF (critical for low latency)
Psycho Visual Tuning: ON
GPU: 0 (auto)
Max B-frames: 0 (critical for low latency)
```

## Final Checklist

Before going live, verify:

- [ ] OBS keyframe interval = 1 second
- [ ] OBS tune = zerolatency
- [ ] OBS bitrate = 3000-5000 Kbps (stable upload)
- [ ] OME SegmentDuration = 0.3
- [ ] OME PartDuration = 0.1
- [ ] NGINX proxy working (HTTPS accessible)
- [ ] Frontend deployed with new HLS.js config
- [ ] Browser cache cleared
- [ ] Debug overlay shows <1s latency
- [ ] No buffering for 5+ minutes
- [ ] Smooth playback with no stuttering

## Support

If issues persist after following this guide:
1. Check all configurations match exactly
2. Verify network stability (no packet loss)
3. Monitor server resources (CPU/RAM/Bandwidth)
4. Check browser compatibility (Chrome/Firefox recommended)

**Estimated Setup Time**: 15-20 minutes
**Expected Latency**: 0.6-0.9 seconds
**Expected Stability**: 99.9% uptime with zero buffering