# 🎥 ADMIN STREAM SETTINGS - Complete Guide

## 🔐 How to Access Stream Settings

After deploying your app, follow these steps to configure and view the live stream:

---

## 📍 STEP 1: Login as Admin

1. **Open your website:**
   ```
   https://rajugarikossu.com
   ```

2. **Go to Admin Login:**
   ```
   https://rajugarikossu.com/admin-login
   ```

3. **Enter admin credentials:**
   - Phone/Username: Your admin account
   - Password: Your admin password
   - Click "Login"

4. **You'll be redirected to:**
   ```
   https://rajugarikossu.com/admin
   ```

---

## 🎛️ STEP 2: Access Stream Settings Page

**Direct URL:**
```
https://rajugarikossu.com/admin/stream-settings
```

**Or navigate from Admin Dashboard:**
1. Click on "Stream Settings" in the admin menu
2. Or look for "Video/Stream Configuration" option

---

## ⚙️ STEP 3: Configure Stream Settings

You'll see a form with these options:

### 1. **Stream URL** (Required)
Enter your HLS stream URL:
```
https://rajugarikossu.com/live/test/index.m3u8
```

**Important:** This should be the `.m3u8` file URL from your streaming server!

### 2. **Stream Type** (Choose one)
- **iFrame Mode**: For YouTube/embedded players
- **Video Mode**: For direct HLS/MP4 streams ✅ (Use this for your setup!)

**Select:** `Video Mode` for your HLS stream

### 3. **Stream Status**
- **Active**: Toggle ON to make stream visible to players ✅
- **Paused**: Toggle OFF (only use if you want to pause stream)

### 4. **Viewer Count Range** (Optional)
- **Min Viewers**: 1000 (fake viewer count minimum)
- **Max Viewers**: 1100 (fake viewer count maximum)

This shows a random number between min-max to players (e.g., "1,047 viewers watching")

---

## 💾 STEP 4: Save Configuration

1. **Fill in all fields:**
   ```
   Stream URL: https://rajugarikossu.com/live/test/index.m3u8
   Stream Type: Video Mode
   Active: ON
   Paused: OFF
   Min Viewers: 1000
   Max Viewers: 1100
   ```

2. **Click "Save Settings" button**

3. **Wait for success message:**
   ```
   ✅ Stream settings saved successfully!
   ```

---

## 👀 STEP 5: View the Stream

### Option A: View as Player (Recommended)

1. **Open a new incognito/private window**
2. **Go to:**
   ```
   https://rajugarikossu.com
   ```
3. **Login as a regular player** (not admin)
4. **You should see:**
   - Live video stream playing automatically
   - Game interface overlaid on top
   - Viewer count displayed

### Option B: Preview from Admin Page

Some admin pages may have a "Preview Stream" button that shows how it looks to players.

---

## 🎮 STEP 6: Start Streaming from OBS

Now that settings are configured, start your OBS stream:

1. **OBS Settings:**
   ```
   Server: rtmp://89.42.231.35:1935/live
   Stream Key: test
   Keyframe Interval: 1 second
   Bitrate: 4000 Kbps
   Encoder: x264
   Preset: veryfast or faster
   Tune: zerolatency
   ```

2. **Click "Start Streaming" in OBS**

3. **Wait 2-3 seconds** for stream to initialize

4. **Refresh player page:**
   ```
   https://rajugarikossu.com
   ```

5. **Stream should now be playing!** 🎉

---

## 📊 Stream Settings Explained

### Stream URL Format

Your stream URL should follow this pattern:
```
https://YOUR_DOMAIN/live/STREAM_KEY/index.m3u8
```

**Examples:**
```
✅ https://rajugarikossu.com/live/test/index.m3u8
✅ https://rajugarikossu.com/live/game1/index.m3u8
✅ https://rajugarikossu.com/live/live-stream/index.m3u8
```

**NOT:**
```
❌ rtmp://89.42.231.35:1935/live/test (RTMP, not HLS)
❌ https://rajugarikossu.com/live/test (missing index.m3u8)
❌ http://89.42.231.35/live/test/index.m3u8 (use domain, not IP)
```

### Stream Type Options

| Type | Use Case | Example |
|------|----------|---------|
| **Video Mode** | Direct HLS/MP4 streams | Your setup ✅ |
| **iFrame Mode** | YouTube embeds, external players | YouTube live |

**For your setup, always use Video Mode!**

### Active vs Paused

| Status | What It Does |
|--------|--------------|
| **Active: ON** | Stream visible to all players ✅ |
| **Active: OFF** | Stream hidden from players |
| **Paused: ON** | Shows "Stream Paused" message |
| **Paused: OFF** | Normal playback ✅ |

**Normal operation:** Active ON, Paused OFF

---

## 🔍 Troubleshooting

### Issue 1: "Stream Settings" page not found

**Solution:**
```bash
# Rebuild client with latest code
cd /var/www/andar-bahar/reddy-anna/client
npm run build
pm2 restart all
```

### Issue 2: Stream not playing after saving settings

**Checklist:**
1. ✅ Is OBS streaming? (Check OBS status)
2. ✅ Is stream URL correct? (Must end with `.m3u8`)
3. ✅ Is "Active" toggled ON?
4. ✅ Is "Paused" toggled OFF?
5. ✅ Is stream type set to "Video Mode"?
6. ✅ Did you refresh the player page?

**Test stream URL directly:**
```bash
curl -I https://rajugarikossu.com/live/test/index.m3u8
```

**Expected response:**
```
HTTP/2 200 
content-type: application/vnd.apple.mpegurl
```

### Issue 3: Settings not saving

**Check backend logs:**
```bash
pm2 logs backend --lines 50 | grep stream
```

**Verify API endpoint exists:**
```bash
# Should return current config
curl -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  https://rajugarikossu.com/api/stream/simple-config
```

### Issue 4: Players can't see stream

**Verify:**
1. ✅ Admin saved settings with "Active: ON"
2. ✅ Players are logged in (stream may require auth)
3. ✅ Players refreshed page after settings saved
4. ✅ Stream is actually running in OBS

**Check player console:**
- Open browser DevTools (F12)
- Look for errors related to video/stream
- Check Network tab for `.m3u8` and `.ts` file requests

---

## 📱 Mobile vs Desktop

### Desktop View
- Stream plays in main video area
- Game controls overlaid on top
- Full screen available

### Mobile View
- Stream plays in mobile-optimized player
- Touch controls for betting
- Responsive layout

**Both should work automatically!**

---

## 🎯 Quick Start Checklist

After deployment, follow this checklist:

- [ ] 1. Login as admin at `/admin-login`
- [ ] 2. Navigate to `/admin/stream-settings`
- [ ] 3. Enter stream URL: `https://rajugarikossu.com/live/test/index.m3u8`
- [ ] 4. Select "Video Mode"
- [ ] 5. Toggle "Active" to ON
- [ ] 6. Toggle "Paused" to OFF
- [ ] 7. Set viewer range (1000-1100)
- [ ] 8. Click "Save Settings"
- [ ] 9. Wait for success message
- [ ] 10. Start OBS streaming (rtmp://89.42.231.35:1935/live, key: test)
- [ ] 11. Open player page in incognito window
- [ ] 12. Login as player
- [ ] 13. Verify stream is playing ✅

---

## 🔗 Important URLs

| Page | URL | Purpose |
|------|-----|---------|
| Admin Login | `/admin-login` | Login as admin |
| Admin Dashboard | `/admin` | Main admin page |
| **Stream Settings** | `/admin/stream-settings` | Configure stream ⭐ |
| Player Game | `/` or `/game` | Where players see stream |
| Backend Settings | `/backend-settings` | Other configs |

---

## 🎥 Stream URL Examples

### Production Setup (Your VPS)
```
Stream URL: https://rajugarikossu.com/live/test/index.m3u8
OBS Server: rtmp://89.42.231.35:1935/live
OBS Key: test
```

### Multiple Streams (If needed)
```
Stream 1: https://rajugarikossu.com/live/game1/index.m3u8
Stream 2: https://rajugarikossu.com/live/game2/index.m3u8
Stream 3: https://rajugarikossu.com/live/vip/index.m3u8
```

Just change the stream key in OBS and update the URL in admin settings!

---

## 💡 Pro Tips

### Tip 1: Test Before Going Live
1. Configure stream settings
2. Start OBS streaming
3. Open player page in incognito
4. Verify everything works
5. Then announce to real players

### Tip 2: Monitor Stream Health
```bash
# Check if stream is active
curl -I https://rajugarikossu.com/live/test/index.m3u8

# Check nginx cache
du -sh /dev/shm/stream_cache

# Check streaming server logs
pm2 logs streaming-server --lines 20
```

### Tip 3: Quick Stream Restart
If stream gets stuck:
```bash
# Stop OBS streaming
# Wait 5 seconds
# Restart OBS streaming
# Refresh player page
```

### Tip 4: Viewer Count Psychology
Set realistic viewer ranges:
- **Small game:** 500-700 viewers
- **Medium game:** 1000-1500 viewers
- **Big game:** 2000-3000 viewers

This creates social proof and excitement!

---

## 🚀 You're All Set!

Your stream configuration is now complete. Here's what happens:

1. **Admin** configures stream URL in `/admin/stream-settings`
2. **Streaming server** receives RTMP from OBS, converts to HLS
3. **Nginx** caches HLS segments for ultra-low latency
4. **Players** see live stream with 1-2 second delay
5. **Game interface** overlays on top of stream
6. **Everyone** enjoys smooth, buffer-free gameplay! 🎉

---

**Need help?** Check the troubleshooting section or review deployment logs:
```bash
pm2 logs backend --lines 100
pm2 logs streaming-server --lines 100
sudo tail -f /var/log/nginx/error.log
```
