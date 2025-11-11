# 🎥 OBS Quick Setup Card

## Your Stream Credentials

```
RTMP Server:  rtmp://91.108.110.72:1935/live
Stream Key:   test
Player URL:   http://91.108.110.72:3000
```

---

## OBS Configuration (5 Steps)

### 1. Open OBS Settings
- Click **Settings** (bottom right)
- Go to **Stream** tab

### 2. Configure Stream
- **Service:** Custom
- **Server:** `rtmp://91.108.110.72:1935/live`
- **Stream Key:** `test`

### 3. Click OK
- Save settings

### 4. Start Streaming
- Click **Start Streaming** (bottom right)
- Wait 5-10 seconds for connection

### 5. Verify
- Green indicator = streaming active
- Check player: `http://91.108.110.72:3000`

---

## Admin Panel Setup (3 Steps)

### 1. Login to Admin
- Go to `/admin-stream-settings-new`

### 2. Enter Stream URL
- **Stream URL:** `http://91.108.110.72:3000`
- **Stream Type:** iframe
- **Stream Active:** ✅ ON

### 3. Save
- Click **Save Settings**

---

## Test Your Stream

### Browser Test:
1. Open: `http://91.108.110.72:3000`
2. Should see your OBS output

### HLS Direct Test:
1. Open: `http://91.108.110.72:8000/live/test/index.m3u8`
2. Should download playlist file

### In-Game Test:
1. Open player game page as normal user
2. Video should appear in video area

---

## Common Issues

### OBS shows "Connection failed"
- **Fix:** Check firewall allows port 1935
- **Command:** `sudo ufw allow 1935/tcp`

### Player shows black screen
- **Fix:** Wait 10 seconds for HLS segments
- **Fix:** Refresh page
- **Fix:** Check OBS is streaming (green indicator)

### Stream not in game
- **Fix:** Check Admin Panel → Stream Active = ON
- **Fix:** Verify Stream URL = `http://91.108.110.72:3000`
- **Fix:** Hard refresh game page (Ctrl+Shift+R)

---

## Change Stream Source Anytime

### Switch to YouTube:
1. Admin Panel → Stream Settings
2. Change URL to: `https://www.youtube.com/embed/VIDEO_ID`
3. Save

### Switch back to self-hosted:
1. Admin Panel → Stream Settings
2. Change URL to: `http://91.108.110.72:3000`
3. Save

**No code changes needed!**

---

## Server Management

### Start streaming server:
```bash
cd live_stream
pm2 start server.js --name streaming-server
```

### Check status:
```bash
pm2 status
pm2 logs streaming-server
```

### Restart:
```bash
pm2 restart streaming-server
```

### Stop:
```bash
pm2 stop streaming-server
```

---

## Port Requirements

Make sure these ports are open:
- **1935** - RTMP (OBS pushes here)
- **8000** - HLS (video segments)
- **3000** - Player (iframe embed)

### Check ports:
```bash
sudo ufw status
```

### Open ports:
```bash
sudo ufw allow 1935/tcp
sudo ufw allow 8000/tcp
sudo ufw allow 3000/tcp
```

---

## That's It!

Your stream key is **`test`** and it's ready to use right now.

Just configure OBS with the credentials above, click Start Streaming, and your players will see the live video in the game! 🎮
