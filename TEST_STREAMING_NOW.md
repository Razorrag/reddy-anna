# Test OBS Streaming Right Now

## Quick Test (5 Minutes)

### Step 1: Start Your Server
```bash
npm run dev
```

Wait for:
```
✅ serving on http://0.0.0.0:5000
✅ RTMP server running on port 1935
✅ HTTP server for HLS running on port 8000
```

### Step 2: Open OBS Studio

If you don't have OBS:
- Download from: https://obsproject.com/download
- Install and open

### Step 3: Configure OBS Stream Settings

1. Click **Settings** (bottom right)
2. Click **Stream** (left sidebar)
3. Set these values:
   - **Service:** Custom
   - **Server:** `rtmp://localhost:1935/live`
   - **Stream Key:** *(leave blank or type anything)*
4. Click **OK**

### Step 4: Add a Video Source

1. In **Sources** panel (bottom), click **+**
2. Select **Video Capture Device** (for webcam)
   - Or **Display Capture** (for screen)
   - Or **Window Capture** (for specific window)
3. Click **OK** → **OK**
4. You should see your video in the preview

### Step 5: Start Streaming

1. Click **Start Streaming** (bottom right)
2. Wait 2-3 seconds
3. Look for **"LIVE"** indicator in OBS status bar (bottom)
4. Check your terminal/console for:
   ```
   🔴 STREAM STARTED: /live/stream
   [NodeEvent on postPublish] StreamPath=/live/stream
   ```

### Step 6: View Stream in Browser

1. Open browser to: `http://localhost:5000`
2. You should see the player game page
3. **The video area should now show your OBS stream!** 🎉

### Step 7: Verify It's Working

**Check 1: Direct HLS URL**
Open in new tab: `http://localhost:5000/stream/live/stream.m3u8`
- Should download a text file with video segments

**Check 2: Stream Status API**
Open in new tab: `http://localhost:5000/api/game/stream-status`
- Should show: `"streamStatus": "live"`

**Check 3: Browser Console**
- Press F12 to open DevTools
- Go to Console tab
- Should see HLS.js loading messages, no errors

## Troubleshooting

### OBS Won't Connect?

**Check 1: Server Running?**
```bash
# Make sure you see:
RTMP server running on port 1935
```

**Check 2: Port Already in Use?**
```bash
# Kill any process using port 1935
# Windows:
netstat -ano | findstr :1935
taskkill /PID <PID> /F

# macOS/Linux:
lsof -ti:1935 | xargs kill -9
```

**Check 3: OBS Logs**
- In OBS: Help → Log Files → View Current Log
- Look for connection errors

### Stream Not Showing in Browser?

**Check 1: HLS Files Generated?**
```bash
# Check if files exist:
ls media/live/

# Should see:
stream.m3u8
stream-0.ts
stream-1.ts
stream-2.ts
```

**Check 2: FFmpeg Installed?**
```bash
# Test FFmpeg:
ffmpeg -version

# If not installed:
# macOS:
brew install ffmpeg

# Ubuntu/Debian:
sudo apt-get install ffmpeg

# Windows:
# Download from ffmpeg.org
```

**Check 3: Browser Console Errors?**
- Press F12
- Check Console tab for errors
- Check Network tab for failed requests

### Black Screen in Browser?

**Possible causes:**
1. Stream just started - wait 5-10 seconds
2. HLS.js loading - check console for progress
3. Browser autoplay blocked - click video to play
4. CORS issue - check server logs

**Fix:**
- Refresh browser page
- Check OBS is still streaming (LIVE indicator)
- Verify HLS URL works: `http://localhost:5000/stream/live/stream.m3u8`

### High Latency (Delay)?

**Normal:** 5-10 seconds delay is expected with HLS

**To reduce:**
1. In OBS: Settings → Advanced → Stream Delay = 0
2. Lower keyframe interval to 1 second
3. Use lower resolution (720p)

## What You Should See

### In OBS:
- Green "LIVE" indicator in status bar
- Bitrate showing (e.g., "2500 kb/s")
- FPS stable (e.g., "30.00 FPS")
- No dropped frames

### In Terminal:
```
🔴 STREAM STARTED: /live/stream
[NodeEvent on postPublish] id=xxx StreamPath=/live/stream
```

### In Browser:
- Video playing in the game area
- Your OBS scene visible
- Slight delay (5-10 seconds) is normal

### In File System:
```
media/
└── live/
    ├── stream.m3u8      ← Playlist file
    ├── stream-0.ts      ← Video segment
    ├── stream-1.ts
    └── stream-2.ts
```

## Success Checklist

- [ ] Server started successfully
- [ ] OBS configured with `rtmp://localhost:1935/live`
- [ ] OBS showing "LIVE" indicator
- [ ] Terminal shows "🔴 STREAM STARTED"
- [ ] HLS files exist in `media/live/`
- [ ] Browser shows video stream
- [ ] No errors in browser console
- [ ] Stream status API returns "live"

## Next Steps After Success

### 1. Test Admin Panel
- Go to: `http://localhost:5000/admin-game`
- Find Stream Settings section
- Verify settings are loaded
- Try updating stream title

### 2. Test Stream Settings API
```bash
# Get current settings:
curl http://localhost:5000/api/game/stream-settings

# Update settings:
curl -X POST http://localhost:5000/api/game/stream-settings \
  -H "Content-Type: application/json" \
  -d '{"streamTitle":"My Test Stream","streamStatus":"live"}'
```

### 3. Test Multiple Viewers
- Open multiple browser tabs to `http://localhost:5000`
- All should show the same stream
- Verify performance is good

### 4. Test Stop/Start
- In OBS: Click "Stop Streaming"
- Terminal should show: `⚫ STREAM ENDED`
- Browser should show stream unavailable
- Start streaming again - should reconnect

## Production Deployment

**Important:** This local setup works perfectly, but Render blocks port 1935.

**For production, you need:**
1. External streaming service (Restream.io, YouTube Live, Cloudflare Stream)
2. Or deploy to VPS with open ports (DigitalOcean, AWS EC2)

See full guide: `docs/OBS_STREAMING_SETUP_GUIDE.md`

## Need Help?

### Documentation
- `docs/OBS_QUICK_START.md` - Quick reference
- `docs/OBS_STREAMING_SETUP_GUIDE.md` - Complete guide
- `docs/OBS_STREAMING_ANALYSIS_AND_FIX.md` - Technical details
- `docs/STREAMING_IMPLEMENTATION_SUMMARY.md` - What was fixed

### Check Logs
```bash
# Server logs show:
- RTMP connections
- HLS transcoding
- Stream start/stop events
- FFmpeg output

# OBS logs show:
- Connection status
- Encoding settings
- Dropped frames
- Errors
```

### Common Issues

| Issue | Solution |
|-------|----------|
| Port 1935 in use | Kill process or restart computer |
| FFmpeg not found | Install FFmpeg |
| Stream not showing | Wait 10 seconds, refresh browser |
| High CPU usage | Lower OBS resolution/bitrate |
| Dropped frames | Close other apps, use wired internet |

## Quick Commands

```bash
# Start server
npm run dev

# Check if port 1935 is free (Windows)
netstat -ano | findstr :1935

# Check if port 1935 is free (macOS/Linux)
lsof -i:1935

# View HLS files
ls -la media/live/

# Test HLS URL
curl http://localhost:5000/stream/live/stream.m3u8

# Test stream status
curl http://localhost:5000/api/game/stream-status
```

---

## 🎯 Goal

**You should be able to:**
1. Start OBS streaming
2. See your video in the game page
3. Verify it works with multiple viewers
4. Stop and restart streaming successfully

**Time to complete:** 5-10 minutes

**If it works:** You're ready for production deployment! 🚀

**If it doesn't work:** Check troubleshooting section above or review the detailed guides in `docs/` folder.

---

**Ready? Let's test!** 🎬
