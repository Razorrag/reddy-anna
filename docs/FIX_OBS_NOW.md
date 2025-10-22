# Fix OBS Connection Error - Quick Guide

## The Errors You're Seeing

**OBS Error:**
```
Failed to connect to server
Hostname not found
```

**Server Logs:**
```
[NodeEvent on donePlay] id=[object Object] StreamPath=undefined args=undefined
```

## Quick Fix (3 Steps)

### Step 1: Add to .env File

Open your `.env` file and add this line:

```bash
FFMPEG_PATH=ffmpeg
```

**Full line to add after line 11:**
```bash
RTMP_APP_NAME=live
FFMPEG_PATH=ffmpeg          ← ADD THIS LINE
```

### Step 2: Install FFmpeg (if not installed)

**Check if installed:**
```bash
ffmpeg -version
```

**If not installed:**

**Windows:**
```bash
choco install ffmpeg
```
Or download from: https://ffmpeg.org/download.html

**macOS:**
```bash
brew install ffmpeg
```

**Linux:**
```bash
sudo apt-get install ffmpeg
```

### Step 3: Fix OBS Server URL

In OBS Studio:
1. **Settings** → **Stream**
2. Change Server from `rtmp://localhost:1935/live`
3. To: `rtmp://127.0.0.1:1935/live`
4. Click **OK**

**Use IP address (127.0.0.1) instead of hostname (localhost)**

## Restart and Test

```bash
# 1. Stop server (Ctrl+C)

# 2. Start server
npm run dev

# 3. Wait for:
✅ RTMP server running on port 1935

# 4. In OBS: Click "Start Streaming"

# 5. Check server logs for:
🔴 STREAM STARTED: /live/stream
```

## What Was Fixed in Code

✅ Fixed RTMP event handlers (already done)
✅ All `id` and `StreamPath` parameters now handle objects
✅ No more "undefined" errors in logs

## What You Need to Do

1. ✅ Add `FFMPEG_PATH=ffmpeg` to `.env`
2. ✅ Change OBS server to `rtmp://127.0.0.1:1935/live`
3. ✅ Restart server
4. ✅ Test streaming

## Verification

**Success looks like:**

**OBS:**
- Green "LIVE" indicator
- Bitrate showing (e.g., 2500 kb/s)

**Server Logs:**
```
🔴 STREAM STARTED: /live/stream
[NodeEvent on postPublish] id=xxx StreamPath=/live/stream
```

**Browser:**
- Open `http://localhost:5000`
- Video stream appears in game area

## Still Not Working?

### Check Port 1935

```bash
# Windows:
netstat -ano | findstr :1935

# macOS/Linux:
lsof -i:1935
```

If something is using port 1935, kill it:
```bash
# Windows:
taskkill /PID <PID> /F

# macOS/Linux:
kill -9 <PID>
```

### Check Firewall

- Allow Node.js through Windows Firewall
- Allow OBS through Windows Firewall
- Temporarily disable antivirus to test

### Try Different Port

If port 1935 is blocked, change in `.env`:
```bash
RTMP_SERVER_PORT=1936
```

Then in OBS:
```
rtmp://127.0.0.1:1936/live
```

## Complete Documentation

See detailed guides:
- `docs/OBS_CONNECTION_FIX.md` - Complete troubleshooting
- `docs/OBS_STREAMING_SETUP_GUIDE.md` - Full setup guide
- `TEST_STREAMING_NOW.md` - Step-by-step testing

---

## TL;DR

1. Add `FFMPEG_PATH=ffmpeg` to `.env`
2. Use `rtmp://127.0.0.1:1935/live` in OBS (not localhost)
3. Restart server
4. Start streaming in OBS
5. Check for "🔴 STREAM STARTED" in logs

**That's it!** 🎉
