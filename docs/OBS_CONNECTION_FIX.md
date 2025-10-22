# OBS Connection Error Fix

## Error You're Seeing

```
Failed to connect to server
Hostname not found. Make sure you entered a valid streaming server
and your internet connection / DNS are working correctly.
```

And in server logs:
```
[NodeEvent on donePlay] id=[object Object] StreamPath=undefined args=undefined
```

## Problems Identified

### 1. Event Handler Type Errors
**Fixed:** Updated all RTMP event handlers to handle both string and object IDs

### 2. Missing FFMPEG_PATH
**Issue:** Your .env is missing the FFmpeg path configuration

### 3. OBS Server Configuration Error
**Issue:** OBS is trying to connect to wrong hostname

## Solutions

### Fix #1: Add FFMPEG_PATH to .env

**Add this line to your `.env` file:**

```bash
# For Windows (if ffmpeg is in PATH):
FFMPEG_PATH=ffmpeg

# Or if you installed ffmpeg manually:
# FFMPEG_PATH=C:/ffmpeg/bin/ffmpeg.exe
```

**Check if FFmpeg is installed:**

```bash
# Test FFmpeg
ffmpeg -version
```

**If not installed:**

**Windows:**
```bash
# Using Chocolatey:
choco install ffmpeg

# Or download from: https://ffmpeg.org/download.html
# Extract and add to PATH
```

**macOS:**
```bash
brew install ffmpeg
```

**Linux:**
```bash
sudo apt-get update
sudo apt-get install ffmpeg
```

### Fix #2: Correct OBS Configuration

The error "Hostname not found" means OBS can't resolve the server address.

**For Local Development:**

1. Open OBS Studio
2. Go to **Settings** → **Stream**
3. Configure exactly like this:
   - **Service:** Custom
   - **Server:** `rtmp://127.0.0.1:1935/live`
   - **Stream Key:** *(leave blank)*

**Important:** Use `127.0.0.1` instead of `localhost` to avoid DNS issues.

### Fix #3: Verify Server is Running

Before starting OBS, make sure your server is running:

```bash
npm run dev
```

**Look for these messages:**
```
✅ serving on http://0.0.0.0:5000
✅ RTMP server running on port 1935
✅ HTTP server for HLS running on port 8000
```

**If you see port errors:**
```bash
# Windows - Check what's using port 1935:
netstat -ano | findstr :1935

# Kill the process:
taskkill /PID <PID> /F

# macOS/Linux:
lsof -ti:1935 | xargs kill -9
```

### Fix #4: Complete .env Configuration

Your `.env` should have these lines:

```bash
# Backend API URL for client-side WebSocket connections
VITE_API_BASE_URL=http://localhost:5000

# Server environment variables
NODE_ENV=development
PORT=5000
WEBSOCKET_URL=ws://localhost:5000

# RTMP Server configuration
RTMP_SERVER_PORT=1935
RTMP_HTTP_PORT=8000
RTMP_APP_NAME=live
FFMPEG_PATH=ffmpeg

# Supabase configuration
VITE_SUPABASE_URL=https://vtnlaofpaovkmeqiidaw.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ0bmxhb2ZwYW92a21lcWlpZGF3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA5OTc3MDMsImV4cCI6MjA3NjU3MzcwM30.9g1BlGxuxt_EkSFnM4h51mOUvhAWAEBywMZqqk7Zpiw
SUPABASE_URL=https://vtnlaofpaovkmeqiidaw.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ0bmxhb2ZwYW92a21lcWlpZGF3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDk5NzcwMywiZXhwIjoyMDc2NTczNzAzfQ.zJCjyaS4HQU3CvgMoJo9FMmigTRK8714mFxs8y1oOAA

# Session configuration
SESSION_SECRET=new-secure-secret-change-in-production-IMPORTANT

# JWT configuration
JWT_SECRET=your-very-secure-jwt-secret-key-at-least-32-characters-long-for-production
JWT_EXPIRES_IN=1h
JWT_ISSUER=AndarBaharApp
JWT_AUDIENCE=users

# CORS configuration
CORS_ORIGIN=http://localhost:5000
```

**Note:** Changed `VITE_API_BASE_URL` to include `http://` protocol.

## Step-by-Step Testing

### Step 1: Install FFmpeg

```bash
# Check if installed:
ffmpeg -version

# If not, install it (see Fix #1 above)
```

### Step 2: Update .env

Add this line:
```bash
FFMPEG_PATH=ffmpeg
```

### Step 3: Restart Server

```bash
# Stop current server (Ctrl+C)
# Start again:
npm run dev
```

### Step 4: Configure OBS

1. Open OBS Studio
2. **Settings** → **Stream**
3. **Service:** Custom
4. **Server:** `rtmp://127.0.0.1:1935/live`
5. **Stream Key:** *(blank)*
6. Click **OK**

### Step 5: Add Video Source

1. **Sources** panel → **+**
2. Add **Video Capture Device** or **Display Capture**
3. Click **OK**

### Step 6: Start Streaming

1. Click **Start Streaming**
2. Wait 5 seconds
3. Check OBS status bar for **"LIVE"** indicator

### Step 7: Check Server Logs

Look for:
```
🔴 STREAM STARTED: /live/stream
[NodeEvent on postPublish] id=xxx StreamPath=/live/stream
```

### Step 8: View Stream

1. Open browser: `http://localhost:5000`
2. Navigate to player game page
3. Stream should appear in video area

## Troubleshooting

### Issue: "Hostname not found"

**Solution 1:** Use IP address instead of hostname
```
rtmp://127.0.0.1:1935/live
```

**Solution 2:** Check Windows Firewall
- Allow Node.js through firewall
- Allow OBS through firewall

**Solution 3:** Disable VPN/Proxy
- VPNs can block local RTMP connections
- Try disabling temporarily

### Issue: "Connection timed out"

**Check 1:** Server is running
```bash
# Should see:
RTMP server running on port 1935
```

**Check 2:** Port not blocked
```bash
# Windows:
netstat -ano | findstr :1935

# Should show LISTENING
```

**Check 3:** Antivirus not blocking
- Add exception for Node.js
- Add exception for port 1935

### Issue: Server logs show "undefined"

**Fixed:** This was the event handler type issue - already fixed in the code.

### Issue: FFmpeg not found

**Error:**
```
Error: spawn ffmpeg ENOENT
```

**Solution:**
1. Install FFmpeg (see Fix #1)
2. Add to .env: `FFMPEG_PATH=ffmpeg`
3. Restart server

### Issue: Stream connects but no video in browser

**Check 1:** HLS files generated
```bash
ls media/live/
# Should see: stream.m3u8, stream-*.ts
```

**Check 2:** Browser console
- Press F12
- Check for HLS.js errors
- Check network tab for .m3u8 requests

**Check 3:** Direct HLS URL
```
http://localhost:5000/stream/live/stream.m3u8
```

## Verification Checklist

- [ ] FFmpeg installed and in PATH
- [ ] `FFMPEG_PATH=ffmpeg` in .env
- [ ] Server running without errors
- [ ] OBS configured with `rtmp://127.0.0.1:1935/live`
- [ ] OBS shows "LIVE" indicator
- [ ] Server logs show "🔴 STREAM STARTED"
- [ ] HLS files exist in `media/live/`
- [ ] Browser shows video stream
- [ ] No errors in browser console

## Quick Test Commands

```bash
# 1. Test FFmpeg
ffmpeg -version

# 2. Check port 1935
netstat -ano | findstr :1935

# 3. Test HLS URL
curl http://localhost:5000/stream/live/stream.m3u8

# 4. Test stream status API
curl http://localhost:5000/api/game/stream-status

# 5. Check HLS files
dir media\live\  # Windows
ls media/live/   # macOS/Linux
```

## Expected Output

### When OBS Connects Successfully:

**OBS:**
```
[Info] Connecting to RTMP URL rtmp://127.0.0.1:1935/live...
[Info] Connection to rtmp://127.0.0.1:1935/live successful
```

**Server Logs:**
```
[NodeEvent on preConnect] id=xxx args={}
[NodeEvent on postConnect] id=xxx args={}
[NodeEvent on prePublish] id=xxx StreamPath=/live/stream args={}
🔴 STREAM STARTED: /live/stream
[NodeEvent on postPublish] id=xxx StreamPath=/live/stream args={}
```

**File System:**
```
media/
└── live/
    ├── stream.m3u8      ← Created
    ├── stream-0.ts      ← Created
    ├── stream-1.ts      ← Created
    └── stream-2.ts      ← Created
```

**Browser:**
- Video playing in game area
- HLS.js loading messages in console
- No errors

## Summary of Changes Made

1. ✅ Fixed RTMP event handlers to handle object IDs
2. ✅ Added FFMPEG_PATH configuration
3. ✅ Updated OBS connection instructions
4. ✅ Created troubleshooting guide

## Next Steps

1. Add `FFMPEG_PATH=ffmpeg` to your `.env` file
2. Restart server: `npm run dev`
3. Configure OBS with `rtmp://127.0.0.1:1935/live`
4. Start streaming
5. Check server logs for "🔴 STREAM STARTED"
6. Open browser and verify stream appears

If you still have issues after following these steps, check:
- Windows Firewall settings
- Antivirus software
- VPN/Proxy settings
- Port conflicts

---

**The code fixes are already applied. You just need to:**
1. Add `FFMPEG_PATH=ffmpeg` to `.env`
2. Use `rtmp://127.0.0.1:1935/live` in OBS (not localhost)
3. Restart everything and test
