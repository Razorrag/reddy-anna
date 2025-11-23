# Complete Streaming Fix Guide - OvenMediaEngine to Frontend

## Problem Summary
Stream is not showing on frontend game page despite OvenMediaEngine running on VPS. Need to configure LL-HLS URL and verify entire data flow.

---

## Part 1: Get OvenMediaEngine Configuration

### Step 1: SSH into VPS
```bash
ssh root@72.61.170.227
```

### Step 2: Navigate to OvenMediaEngine Directory
```bash
cd /opt/ovenmediaengine
```

### Step 3: Find Configuration File
```bash
# Check common locations
ls -la conf/Server.xml
ls -la config/Server.xml
ls -la Server.xml

# If not found, search
find /opt/ovenmediaengine -name "Server.xml"
```

### Step 4: Extract LL-HLS Configuration
```bash
# View the configuration
cat conf/Server.xml | grep -A 20 "LLHLS"
cat conf/Server.xml | grep -A 10 "Port"
```

**Look for these critical values:**

1. **LL-HLS Port** (usually 3333, 8080, or 9000)
```xml
<LLHLS>
    <Port>3333</Port>  <!-- THIS IS YOUR PORT -->
</LLHLS>
```

2. **Application Name** (usually "app" or "live")
```xml
<Applications>
    <Application>
        <Name>app</Name>  <!-- THIS IS YOUR APP NAME -->
    </Application>
</Applications>
```

3. **CORS Settings** (must allow your frontend domain)
```xml
<CrossDomains>
    <Url>*</Url>  <!-- Should allow all or your domain -->
</CrossDomains>
```

### Step 5: Check OvenMediaEngine Status
```bash
# Check if running
ps aux | grep ovenmedia

# Check logs
tail -f /var/log/ovenmediaengine/ovenmediaengine.log

# Check listening ports
netstat -tulpn | grep ovenmedia
```

### Step 6: Test LL-HLS Endpoint
```bash
# Replace [PORT], [APP], [STREAM] with actual values
curl http://72.61.170.227:3333/app/stream/llhls.m3u8
```

**Expected Response:**
- HTTP 200 if stream is live
- HTTP 404 if stream name doesn't exist
- Connection refused if OME not running

---

## Part 2: Common LL-HLS URL Formats

Based on typical OvenMediaEngine setups:

### Format 1: Default Configuration
```
http://72.61.170.227:3333/app/stream/llhls.m3u8
```
- Port: 3333
- Application: app
- Stream: stream

### Format 2: Custom Application
```
http://72.61.170.227:8080/live/game/llhls.m3u8
```
- Port: 8080
- Application: live
- Stream: game

### Format 3: With Security Token
```
http://72.61.170.227:3333/app/stream/llhls.m3u8?token=YOUR_TOKEN
```

### Format 4: HTTPS (if SSL configured)
```
https://72.61.170.227:3334/app/stream/llhls.m3u8
```

---

## Part 3: Configure Stream in Admin Panel

### Step 1: Access Admin Panel
1. Open browser and login to your game admin panel
2. Navigate to **Stream Settings** or **Stream Control Panel** section

### Step 2: Enter Stream Configuration

**Required Fields:**

1. **Stream URL** *(critical)*
   ```
   http://72.61.170.227:3333/app/stream/llhls.m3u8
   ```
   *(Replace with your actual LL-HLS URL from Part 1)*

2. **Stream Type**
   - Select: **Video (MP4 / HLS)**
   - DO NOT select "Iframe Embed"

3. **Loop Mode**
   - Toggle: **OFF**
   - (If ON, shows loop video instead of live stream)

4. **Fake Viewer Count** *(optional)*
   - Min Viewers: 1000
   - Max Viewers: 1100
   - (Random number between these shown as "viewers")

5. **Advanced Settings** *(optional)*
   - LL-HLS Segment Duration: 2 (seconds)
   - LL-HLS Part Duration: 0.5 (seconds)
   - Enable Low Latency: **ON**

### Step 3: Save Configuration
Click **"Save Configuration"** button

### Step 4: Verify Database Update
Run this SQL query to confirm settings saved:
```sql
SELECT 
    stream_url,
    stream_type,
    is_active,
    is_paused,
    loop_mode,
    min_viewers,
    max_viewers
FROM simple_stream_config
LIMIT 1;
```

**Expected Result:**
```
stream_url: http://72.61.170.227:3333/app/stream/llhls.m3u8
stream_type: video
is_active: true
is_paused: false
loop_mode: false
min_viewers: 1000
max_viewers: 1100
```

---

## Part 4: Start OBS Stream to OvenMediaEngine

### Step 1: Open OBS Studio

### Step 2: Configure Stream Settings
1. Go to **Settings → Stream**
2. Service: **Custom**
3. Server: `rtmp://72.61.170.227:1935/app`
4. Stream Key: `stream`
   *(Must match the stream name in your LL-HLS URL)*

### Step 3: Video Settings
1. Go to **Settings → Video**
2. Base Resolution: 1920x1080
3. Output Resolution: 1280x720 (or 1920x1080)
4. FPS: 30

### Step 4: Output Settings
1. Go to **Settings → Output**
2. Output Mode: **Simple**
3. Video Bitrate: 3000 Kbps
4. Encoder: x264
5. Audio Bitrate: 160 Kbps

### Step 5: Start Streaming
1. Add video sources (camera, screen capture, etc.)
2. Click **"Start Streaming"** button
3. Wait 5-10 seconds for stream to initialize

### Step 6: Verify Stream Active
```bash
# On VPS, check active streams
curl http://localhost:8081/v1/vhosts/default/apps/app/streams
```

---

## Part 5: Test Stream on Frontend

### Step 1: Open Game Page
Navigate to the player game page in your browser

### Step 2: Check Video Player Component
The stream should automatically load via:
1. [`VideoArea.tsx`](client/src/components/MobileGameLayout/VideoArea.tsx:88) calls API endpoint
2. API returns stream configuration from database
3. HLS.js player initializes with LL-HLS URL
4. Stream displays with LIVE badge and viewer count

### Step 3: Verify Browser Console
Open Developer Tools (F12) → Console tab

**Look for:**
- ✅ `"Stream config loaded successfully"`
- ✅ `"HLS.js initialized"`
- ✅ `"Stream started playing"`
- ❌ No CORS errors
- ❌ No 404 errors

### Step 4: Check Network Tab
Developer Tools → Network tab

**Verify requests:**
1. `GET /api/stream/simple-config` → Status 200
2. `GET http://72.61.170.227:3333/app/stream/llhls.m3u8` → Status 200
3. `GET http://72.61.170.227:3333/app/stream/llhls_*.m4s` → Status 200

---

## Part 6: Troubleshooting Common Issues

### Issue 1: "No stream configured" Message

**Symptom:**
Frontend shows: *"No stream configured. Please add a stream URL in admin settings"*

**Cause:**
Database has empty or NULL `stream_url`

**Fix:**
```sql
-- Check current value
SELECT stream_url FROM simple_stream_config;

-- Update manually if admin panel doesn't work
UPDATE simple_stream_config
SET stream_url = 'http://72.61.170.227:3333/app/stream/llhls.m3u8',
    stream_type = 'video',
    is_active = true,
    loop_mode = false;
```

### Issue 2: Stream Shows Loop Video

**Symptom:**
Sees loop video with "Next game starts at..." message instead of live stream

**Cause:**
`loop_mode = true` in database

**Fix:**
```sql
-- Check loop mode
SELECT loop_mode FROM simple_stream_config;

-- Disable loop mode
UPDATE simple_stream_config
SET loop_mode = false;
```

### Issue 3: CORS Error in Console

**Symptom:**
```
Access to XMLHttpRequest at 'http://72.61.170.227:3333/...' from origin 'http://localhost:5173' has been blocked by CORS policy
```

**Cause:**
OvenMediaEngine doesn't allow requests from frontend domain

**Fix:**
Edit `/opt/ovenmediaengine/conf/Server.xml`:
```xml
<CrossDomains>
    <Url>*</Url>  <!-- Allow all domains -->
</CrossDomains>
```

Restart OvenMediaEngine:
```bash
systemctl restart ovenmediaengine
```

### Issue 4: Stream Not Loading (404 Error)

**Symptom:**
Network tab shows 404 error for `llhls.m3u8`

**Cause:**
Stream is not active in OvenMediaEngine (no OBS streaming)

**Fix:**
1. Verify OBS is streaming
2. Check stream name matches URL
3. Verify OvenMediaEngine logs:
```bash
tail -f /var/log/ovenmediaengine/ovenmediaengine.log
```

### Issue 5: Black Screen / Player Not Playing

**Symptom:**
Video player visible but shows black screen

**Cause:**
- HLS.js initialization failed
- Codec not supported
- Video format incompatible

**Fix:**
1. Check browser console for HLS.js errors
2. Verify video codec in OBS settings (H.264 required)
3. Test stream URL directly in VLC or another player

### Issue 6: Mixed Content Warning (HTTP/HTTPS)

**Symptom:**
```
Mixed Content: The page at 'https://yourdomain.com' was loaded over HTTPS, but requested an insecure resource 'http://72.61.170.227:3333/...'
```

**Cause:**
Frontend is HTTPS but stream URL is HTTP

**Fix:**
Configure SSL for OvenMediaEngine or use HTTPS proxy

---

## Part 7: Complete Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        ADMIN PANEL                               │
│  StreamControlPanel.tsx (Line 72-87: Save Configuration)        │
└───────────────┬─────────────────────────────────────────────────┘
                │
                │ POST /api/stream/simple-config
                │ Body: { streamUrl, streamType, loopMode, ... }
                │
                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    BACKEND API ROUTE                             │
│  stream-routes.ts (Line 141-263: POST handler)                  │
│  - Validates input                                               │
│  - Saves to database                                             │
│  - Broadcasts to WebSocket clients                               │
└───────────────┬─────────────────────────────────────────────────┘
                │
                │ INSERT/UPDATE
                │
                ▼
┌─────────────────────────────────────────────────────────────────┐
│                      DATABASE                                    │
│  Table: simple_stream_config                                     │
│  Columns: stream_url, stream_type, loop_mode, is_active, etc.   │
└───────────────┬─────────────────────────────────────────────────┘
                │
                │ SELECT (when player loads)
                │
                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    BACKEND API ROUTE                             │
│  stream-routes.ts (Line 46-109: GET handler)                    │
│  - Fetches from database                                         │
│  - Returns JSON response                                         │
└───────────────┬─────────────────────────────────────────────────┘
                │
                │ GET /api/stream/simple-config
                │ Response: { streamUrl, streamType, loopMode, ... }
                │
                ▼
┌─────────────────────────────────────────────────────────────────┐
│                   FRONTEND PLAYER                                │
│  VideoArea.tsx (Line 88-180: loadStreamConfig)                  │
│  - Fetches configuration                                         │
│  - Checks loop mode                                              │
│  - Initializes HLS.js player if streamType === 'video'           │
└───────────────┬─────────────────────────────────────────────────┘
                │
                │ IF streamType === 'video' AND streamUrl exists
                │
                ▼
┌─────────────────────────────────────────────────────────────────┐
│                      HLS.JS PLAYER                               │
│  VideoArea.tsx (Line 284-452: HLS setup)                        │
│  - Creates HLS instance with low latency config                 │
│  - Loads LL-HLS manifest (llhls.m3u8)                           │
│  - Attaches to <video> element                                   │
│  - Starts playback                                               │
└───────────────┬─────────────────────────────────────────────────┘
                │
                │ HTTP GET requests to OvenMediaEngine
                │
                ▼
┌─────────────────────────────────────────────────────────────────┐
│                  OVENMEDIAENGINE (VPS)                           │
│  IP: 72.61.170.227                                               │
│  Port: 3333 (LL-HLS)                                             │
│  - Receives RTMP from OBS                                        │
│  - Transcodes to LL-HLS segments                                 │
│  - Serves llhls.m3u8 playlist                                    │
│  - Serves .m4s video segments                                    │
└───────────────┬─────────────────────────────────────────────────┘
                │
                │ RTMP stream (rtmp://72.61.170.227:1935/app/stream)
                │
                ▼
┌─────────────────────────────────────────────────────────────────┐
│                         OBS STUDIO                               │
│  - Captures video/audio                                          │
│  - Encodes with x264                                             │
│  - Streams via RTMP to OME                                       │
└─────────────────────────────────────────────────────────────────┘
```

---

## Part 8: Quick Verification Checklist

Use this checklist to verify each step:

### OvenMediaEngine Configuration
- [ ] SSH access to VPS working
- [ ] OvenMediaEngine is running (`ps aux | grep ovenmedia`)
- [ ] LL-HLS port is open (3333, 8080, or 9000)
- [ ] CORS allows your frontend domain
- [ ] Configuration file has correct settings

### Database Configuration
- [ ] `simple_stream_config` table exists
- [ ] `stream_url` is not NULL or empty
- [ ] `stream_type` is 'video' (not 'iframe')
- [ ] `loop_mode` is FALSE
- [ ] `is_active` is TRUE

### Admin Panel
- [ ] Can access stream settings page
- [ ] Can save stream URL
- [ ] URL matches OvenMediaEngine endpoint
- [ ] Stream type set to "Video (MP4 / HLS)"

### OBS Configuration
- [ ] RTMP server URL correct
- [ ] Stream key matches LL-HLS URL
- [ ] Video codec is H.264
- [ ] Streaming started successfully

### Frontend
- [ ] API endpoint returns stream config
- [ ] No CORS errors in console
- [ ] HLS.js loads manifest successfully
- [ ] Video player shows LIVE badge
- [ ] Stream plays without buffering

---

## Part 9: Expected Results

### After Successful Configuration:

1. **Admin Panel**
   - Stream URL saved
   - Green status indicator
   - "Stream active" message

2. **Database**
   ```sql
   SELECT * FROM simple_stream_config;
   ```
   Returns complete configuration with your LL-HLS URL

3. **Frontend Player**
   - Video displays live stream
   - LIVE badge visible (red indicator)
   - Viewer count shows (e.g., "1053 viewers")
   - No buffering or delays
   - Latency < 3 seconds

4. **Browser Console**
   ```
   ✓ Stream config loaded successfully
   ✓ HLS.js initialized
   ✓ Manifest loaded: llhls.m3u8
   ✓ Stream started playing
   ✓ WebSocket connected
   ```

5. **Network Tab**
   - Continuous requests to `.m4s` segments
   - All requests return 200 OK
   - No 404 or 500 errors

---

## Part 10: Next Steps After Stream Works

Once stream is displaying correctly:

1. **Optimize Latency**
   - Reduce LL-HLS segment duration to 1s
   - Reduce part duration to 0.33s
   - Enable player ABR (auto bitrate)

2. **Add Stream Controls**
   - Test pause/play toggle from admin
   - Verify WebSocket broadcasts status
   - Test loop mode activation

3. **Monitor Performance**
   - Check CPU usage on VPS
   - Monitor bandwidth consumption
   - Track concurrent viewers

4. **Production Deployment**
   - Configure SSL for HTTPS
   - Set up CDN for scaling
   - Add stream health monitoring
   - Implement automatic failover

---

## Support & References

### Key Files to Reference:
- [`VideoArea.tsx`](client/src/components/MobileGameLayout/VideoArea.tsx) - Frontend player
- [`stream-routes.ts`](server/stream-routes.ts) - Backend API
- [`StreamControlPanel.tsx`](client/src/components/AdminGamePanel/StreamControlPanel.tsx) - Admin UI
- [`create-simple-stream-config-table.sql`](scripts/create-simple-stream-config-table.sql) - Database schema

### Common Commands:
```bash
# Check OvenMediaEngine status
systemctl status ovenmediaengine

# View OME logs
tail -f /var/log/ovenmediaengine/ovenmediaengine.log

# Test LL-HLS endpoint
curl http://72.61.170.227:3333/app/stream/llhls.m3u8

# Check database
psql -U postgres -d your_database -c "SELECT * FROM simple_stream_config;"
```

---

## Contact Points

If stream still not working after following all steps:
1. Provide OvenMediaEngine logs
2. Share browser console errors
3. Confirm database query results
4. Test stream URL in VLC player first