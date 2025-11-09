# 🚀 **Quick Start: Self-Hosted Streaming (5 Minutes)**

## **What Changed?**

✅ **Before:** External streaming service (`screen-sharing-web.onrender.com`)  
✅ **After:** Self-hosted RTMP/HLS server on your VPS

---

## **⚡ Fast Setup (Copy-Paste Commands)**

### **1. Install FFmpeg on VPS**
```bash
sudo apt update && sudo apt install ffmpeg -y
```

### **2. Open Ports**
```bash
sudo ufw allow 1935/tcp
sudo ufw allow 8000/tcp
sudo ufw allow 3000/tcp
sudo ufw reload
```

### **3. Install Dependencies**
```bash
cd live_stream
npm install
```

### **4. Start Streaming Server**
```bash
# Option A: Direct (for testing)
node server.js

# Option B: PM2 (for production)
npm install -g pm2
pm2 start server.js --name streaming-server
pm2 save
pm2 startup  # Follow the command it outputs
```

### **5. Configure OBS**
- **Server:** `rtmp://91.108.110.72:1935/live`
- **Stream Key:** `test`
- **Bitrate:** 2500-4000 Kbps
- **Keyframe Interval:** 2 seconds

### **6. Start Streaming**
Click "Start Streaming" in OBS

---

## **✅ Verify It's Working**

### **Test 1: Player Page**
```
Open: http://91.108.110.72:3000
Expected: Video player with your stream
```

### **Test 2: Game Integration**
```
Open your game URL
Expected: Video embedded in game
```

### **Test 3: Check Logs**
```bash
pm2 logs streaming-server
# Should show: "✅ NodeMediaServer started!"
```

---

## **🎯 Architecture**

```
OBS → RTMP (1935) → Node-Media-Server → FFmpeg → HLS (8000) → Player (3000) → Game iFrame
```

---

## **📁 What's in `live_stream/` Folder?**

| File | Purpose |
|------|---------|
| `server.js` | RTMP/HLS streaming server |
| `player.html` | HLS video player with HLS.js |
| `package.json` | Dependencies |
| `media/` | Stores video segments (auto-generated) |

---

## **🔧 Common Issues**

### **Stream not showing?**
```bash
# Check if server is running
pm2 status

# Check if OBS is streaming (green "LIVE" indicator)
# Check if ports are open
sudo ufw status
```

### **High latency?**
- Reduce `hls_time` in `server.js` line 36 from `1` to `0.5`
- Use faster encoding preset in OBS (ultrafast/superfast)

### **Buffering?**
- Lower OBS bitrate to 2000 Kbps
- Check VPS upload speed: `speedtest-cli`

---

## **🎮 Game Integration**

**File:** `client/src/components/MobileGameLayout/VideoArea.tsx`  
**Line 51:** `const STREAM_URL = 'http://91.108.110.72:3000';`

**Change to your domain:**
```typescript
const STREAM_URL = 'https://yourdomain.com:3000';
```

---

## **📊 Monitoring**

```bash
# View logs
pm2 logs streaming-server

# Check status
pm2 status

# Restart if needed
pm2 restart streaming-server

# Check media folder
ls -la live_stream/media/live/test/
# Should show: index.m3u8, segment0.ts, segment1.ts, etc.
```

---

## **🔒 Security (Optional)**

Add stream key authentication in `server.js`:

```javascript
nms.on('prePublish', (id, StreamPath, args) => {
  const streamKey = args.key;
  if (streamKey !== 'your-secret-key') {
    let session = nms.getSession(id);
    session.reject();
  }
});
```

**OBS Stream Key:** `test?key=your-secret-key`

---

## **✅ Success Checklist**

- [ ] FFmpeg installed
- [ ] Ports opened (1935, 8000, 3000)
- [ ] Dependencies installed (`npm install`)
- [ ] Server running (`pm2 status` shows "online")
- [ ] OBS streaming (green "LIVE")
- [ ] Player page works (`http://91.108.110.72:3000`)
- [ ] Game shows video
- [ ] Overlays (timer, results) working

---

## **🎉 Done!**

Your game now uses self-hosted streaming. No external dependencies, full control!

**For detailed guide:** See `SELF_HOSTED_STREAMING_SETUP.md`
