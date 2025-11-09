# 🎥 Self-Hosted Live Streaming Server

## **Overview**

This folder contains a complete RTMP/HLS streaming solution for the Andar Bahar game. It replaces external streaming services with a self-hosted server running on your VPS.

---

## **What's Inside**

```
live_stream/
├── server.js           # Main streaming server (RTMP + HLS + Player)
├── player.html         # HLS video player with HLS.js
├── package.json        # Dependencies
├── media/              # Auto-generated video segments
│   └── live/
│       └── test/
│           ├── index.m3u8    # HLS playlist
│           ├── segment0.ts   # Video segment 1
│           ├── segment1.ts   # Video segment 2
│           └── segment2.ts   # Video segment 3
└── README.md           # This file
```

---

## **How It Works**

### **1. RTMP Server (Port 1935)**
- Receives video stream from OBS/streaming software
- Stream URL: `rtmp://91.108.110.72:1935/live/test`

### **2. FFmpeg Transcoding**
- Converts RTMP → HLS format
- Creates 1-second video segments
- Auto-deletes old segments to save disk space

### **3. HTTP Server (Port 8000)**
- Serves HLS video segments
- URL: `http://91.108.110.72:8000/live/test/index.m3u8`
- CORS enabled for cross-origin requests

### **4. Express Server (Port 3000)**
- Serves `player.html` (HLS.js video player)
- URL: `http://91.108.110.72:3000`
- Embedded in game via iFrame

---

## **Quick Start**

### **1. Install Dependencies**
```bash
npm install
```

### **2. Start Server**
```bash
node server.js
```

**Expected Output:**
```
✅ NodeMediaServer started!
RTMP URL: rtmp://91.108.110.72:1935/live
HLS URL: http://91.108.110.72:8000/live/test/index.m3u8
✅ Player running at http://91.108.110.72:3000
✅ CORS enabled for cross-origin requests
```

### **3. Configure OBS**
- **Server:** `rtmp://91.108.110.72:1935/live`
- **Stream Key:** `test`
- **Bitrate:** 2500-4000 Kbps

### **4. Start Streaming**
Click "Start Streaming" in OBS

---

## **Configuration**

### **Change Stream Quality**

Edit `server.js` line 36:

```javascript
hlsFlags: '[hls_time=1:hls_list_size=3:hls_flags=delete_segments]'
```

**Options:**
- `hls_time=1` → 1-second segments (low latency)
- `hls_time=2` → 2-second segments (balanced)
- `hls_list_size=3` → Keep 3 segments in playlist
- `delete_segments` → Auto-delete old segments

### **Change Ports**

Edit `server.js`:

```javascript
// RTMP port (line 19)
port: 1935,

// HLS port (line 26)
port: 8000,

// Player port (line 86)
app.listen(3000, () => { ... });
```

---

## **Testing**

### **Test 1: Player Page**
```
Open: http://91.108.110.72:3000
```
Should show video player with your stream

### **Test 2: HLS Playlist**
```
Open: http://91.108.110.72:8000/live/test/index.m3u8
```
Should show M3U8 playlist file

### **Test 3: Media Folder**
```bash
ls -la media/live/test/
```
Should show `index.m3u8` and `.ts` segment files

---

## **Production Deployment**

### **Use PM2 for Auto-Restart**

```bash
# Install PM2
npm install -g pm2

# Start server
pm2 start server.js --name streaming-server

# Save configuration
pm2 save

# Auto-start on reboot
pm2 startup
# Follow the command it outputs

# Monitor
pm2 status
pm2 logs streaming-server
```

---

## **Troubleshooting**

### **Stream not showing?**

**Check 1: Is server running?**
```bash
ps aux | grep node
# or
pm2 status
```

**Check 2: Is OBS streaming?**
- Look for green "LIVE" indicator in OBS
- Check upload speed in OBS stats

**Check 3: Are ports open?**
```bash
sudo ufw status
# Should show: 1935/tcp, 8000/tcp, 3000/tcp ALLOW
```

**Check 4: Check logs**
```bash
pm2 logs streaming-server
# or check terminal output if running directly
```

### **High latency?**

**Solution 1:** Reduce segment size
```javascript
// server.js line 36
hlsFlags: '[hls_time=0.5:hls_list_size=2:hls_flags=delete_segments]'
```

**Solution 2:** Use faster encoding in OBS
- Settings → Output → Preset: `ultrafast` or `superfast`

**Solution 3:** Lower bitrate
- Settings → Output → Bitrate: 2000 Kbps

### **Stream keeps buffering?**

**Solution 1:** Check internet speed
```bash
speedtest-cli
# Minimum: 5 Mbps upload
```

**Solution 2:** Lower OBS bitrate
- Settings → Output → Bitrate: 1500-2000 Kbps

**Solution 3:** Increase buffer in player.html
```javascript
// player.html line 86-88
maxBufferLength: 60,
maxMaxBufferLength: 120,
```

---

## **Security**

### **Add Stream Key Authentication**

Edit `server.js` after line 46:

```javascript
nms.on('prePublish', (id, StreamPath, args) => {
  const streamKey = args.key;
  const validKey = 'your-secret-stream-key';
  
  if (streamKey !== validKey) {
    console.log('❌ Invalid stream key');
    let session = nms.getSession(id);
    session.reject();
  }
});
```

**OBS Stream Key:** `test?key=your-secret-stream-key`

---

## **Architecture Diagram**

```
┌─────────────┐
│ OBS Studio  │ Admin broadcasts
└──────┬──────┘
       │ RTMP
       │ rtmp://91.108.110.72:1935/live/test
       ↓
┌──────────────────────────────────┐
│  Node-Media-Server (Port 1935)   │
│  - Receives RTMP stream          │
└──────┬───────────────────────────┘
       │
       ↓
┌──────────────────────────────────┐
│  FFmpeg Transcoder               │
│  - RTMP → HLS conversion         │
│  - Creates 1-second segments     │
└──────┬───────────────────────────┘
       │
       ↓
┌──────────────────────────────────┐
│  Media Folder                    │
│  media/live/test/                │
│  ├── index.m3u8                  │
│  ├── segment0.ts                 │
│  ├── segment1.ts                 │
│  └── segment2.ts                 │
└──────┬───────────────────────────┘
       │
       ├──→ HTTP Server (Port 8000)
       │    Serves HLS files
       │    http://91.108.110.72:8000/live/test/index.m3u8
       │
       └──→ Express Server (Port 3000)
            Serves player.html
            http://91.108.110.72:3000
            ↓
       ┌────────────────────────────┐
       │  Game Client (Browser)     │
       │  - iFrame embeds player    │
       │  - Overlays (timer, etc)   │
       └────────────────────────────┘
            ↓
       👥 Players watch
```

---

## **Integration with Game**

The streaming server is integrated into the game via:

**File:** `client/src/components/MobileGameLayout/VideoArea.tsx`

```typescript
// Line 51
const STREAM_URL = 'http://91.108.110.72:3000';

// Line 165-182
<iframe
  src={STREAM_URL}
  className="w-full h-full border-0"
  allow="autoplay; fullscreen"
  style={{ zIndex: 1 }}
/>
```

The video runs independently in an iFrame and is **never interrupted** by game state changes, balance updates, or any other operations.

---

## **Performance**

### **Resource Usage**
- **CPU:** 10-30% (depends on encoding preset)
- **RAM:** 100-200 MB
- **Disk:** ~10 MB (only keeps 3 segments)
- **Bandwidth:** 2-4 Mbps upload (OBS bitrate)

### **Optimization Tips**
1. Use hardware encoding (NVENC/QuickSync) in OBS
2. Lower resolution to 720p instead of 1080p
3. Use faster encoding preset (veryfast/superfast)
4. Reduce segment size for lower latency

---

## **Monitoring**

### **Check Server Status**
```bash
pm2 status
```

### **View Logs**
```bash
pm2 logs streaming-server --lines 50
```

### **Check Media Folder Size**
```bash
du -sh media/
```

### **Monitor Network Usage**
```bash
iftop -i eth0
```

---

## **Backup & Recovery**

### **Backup Configuration**
```bash
cp server.js server.js.backup
cp player.html player.html.backup
```

### **Restore**
```bash
cp server.js.backup server.js
pm2 restart streaming-server
```

---

## **Upgrade**

### **Update Dependencies**
```bash
npm update
```

### **Update Node-Media-Server**
```bash
npm install node-media-server@latest
```

---

## **Support**

### **Check Logs**
```bash
pm2 logs streaming-server
```

### **Restart Server**
```bash
pm2 restart streaming-server
```

### **Stop Server**
```bash
pm2 stop streaming-server
```

### **Delete Server**
```bash
pm2 delete streaming-server
```

---

## **Status**

✅ **PRODUCTION READY**

- Self-hosted streaming
- Low latency (1-2 seconds)
- Auto-cleanup of old segments
- CORS enabled
- Health check endpoint
- Integrated with game

---

## **Quick Reference**

| Component | URL/Command |
|-----------|-------------|
| RTMP Input | `rtmp://91.108.110.72:1935/live/test` |
| HLS Output | `http://91.108.110.72:8000/live/test/index.m3u8` |
| Player Page | `http://91.108.110.72:3000` |
| Health Check | `http://91.108.110.72:3000/health` |
| Start Server | `pm2 start server.js --name streaming-server` |
| View Logs | `pm2 logs streaming-server` |
| Restart | `pm2 restart streaming-server` |

---

**For detailed setup guide, see:** `../SELF_HOSTED_STREAMING_SETUP.md`  
**For quick start, see:** `../STREAMING_QUICK_START.md`
