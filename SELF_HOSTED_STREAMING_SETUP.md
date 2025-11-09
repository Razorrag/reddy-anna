# 🎥 **Self-Hosted RTMP/HLS Streaming - Complete Setup Guide**

## **✅ Implementation Complete**

Your game now uses **self-hosted streaming** instead of external services.

---

## **📁 Files Modified**

### **1. Streaming Server**
- ✅ `live_stream/server.js` - Added CORS, MIME types, health check
- ✅ `live_stream/player.html` - Standalone HLS player (already exists)

### **2. Game Client**
- ✅ `client/src/components/MobileGameLayout/VideoArea.tsx` - Updated to use `http://91.108.110.72:3000`

---

## **🚀 Deployment Steps**

### **STEP 1: Install FFmpeg on VPS**

#### **For Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install ffmpeg -y
ffmpeg -version
```

#### **For CentOS/RHEL:**
```bash
sudo yum install epel-release -y
sudo yum install ffmpeg -y
ffmpeg -version
```

#### **Verify Installation:**
```bash
which ffmpeg
# Should output: /usr/bin/ffmpeg
```

---

### **STEP 2: Update Server Configuration**

Edit `live_stream/server.js` line 11-12 if needed:

```javascript
const ffmpegPath = isWindows
  ? 'C:\\ffmpeg\\bin\\ffmpeg.exe'  // Windows path
  : '/usr/bin/ffmpeg';              // Linux VPS path (use this)
```

**For VPS, it should already be set to `/usr/bin/ffmpeg`** ✅

---

### **STEP 3: Install Dependencies**

```bash
cd live_stream
npm install
```

**Dependencies installed:**
- `express` - Web server for player page
- `node-media-server` - RTMP/HLS streaming
- `os` - OS detection
- `path` - Path utilities

---

### **STEP 4: Open Required Ports on VPS**

#### **Ports Needed:**
- **1935** - RTMP input (for OBS/streaming software)
- **8000** - HLS output (video segments)
- **3000** - Player webpage

#### **Using UFW (Ubuntu):**
```bash
sudo ufw allow 1935/tcp
sudo ufw allow 8000/tcp
sudo ufw allow 3000/tcp
sudo ufw reload
sudo ufw status
```

#### **Using Firewalld (CentOS):**
```bash
sudo firewall-cmd --permanent --add-port=1935/tcp
sudo firewall-cmd --permanent --add-port=8000/tcp
sudo firewall-cmd --permanent --add-port=3000/tcp
sudo firewall-cmd --reload
sudo firewall-cmd --list-ports
```

---

### **STEP 5: Start Streaming Server**

#### **Option A: Run Directly (Testing)**
```bash
cd live_stream
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

#### **Option B: Run with PM2 (Production)**
```bash
# Install PM2 globally
npm install -g pm2

# Start streaming server
cd live_stream
pm2 start server.js --name "streaming-server"

# Save PM2 config
pm2 save

# Auto-start on reboot
pm2 startup
# Follow the command it outputs

# Check status
pm2 status
pm2 logs streaming-server
```

---

### **STEP 6: Configure OBS for Streaming**

#### **OBS Settings:**

1. **Open OBS Studio**
2. **Go to Settings → Stream**
3. **Configure:**
   - **Service:** Custom
   - **Server:** `rtmp://91.108.110.72:1935/live`
   - **Stream Key:** `test`

4. **Go to Settings → Output**
   - **Output Mode:** Advanced
   - **Encoder:** x264 (or NVENC if you have GPU)
   - **Rate Control:** CBR
   - **Bitrate:** 2500-4000 Kbps
   - **Keyframe Interval:** 2 seconds
   - **Preset:** veryfast (or faster)

5. **Go to Settings → Video**
   - **Base Resolution:** 1920x1080 (or 1280x720)
   - **Output Resolution:** 1280x720 (recommended)
   - **FPS:** 30

6. **Click OK → Start Streaming**

---

### **STEP 7: Verify Stream is Working**

#### **Test 1: Check Player Page**
```
Open browser: http://91.108.110.72:3000
```
**Expected:** Video player with your OBS stream

#### **Test 2: Check HLS Playlist**
```
Open browser: http://91.108.110.72:8000/live/test/index.m3u8
```
**Expected:** M3U8 playlist file with segment URLs

#### **Test 3: Check Media Folder**
```bash
cd live_stream/media/live/test
ls -la
```
**Expected:** 
```
index.m3u8
segment0.ts
segment1.ts
segment2.ts
```

#### **Test 4: Check Game Integration**
```
Open your game: http://91.108.110.72:5173 (or your game URL)
```
**Expected:** Video stream embedded in game

---

## **🔧 Configuration Options**

### **Change Stream Quality (server.js line 36):**

```javascript
hlsFlags: '[hls_time=1:hls_list_size=3:hls_flags=delete_segments]'
```

**Options:**
- `hls_time=1` - 1-second segments (low latency, more CPU)
- `hls_time=2` - 2-second segments (balanced)
- `hls_time=4` - 4-second segments (less CPU, higher latency)
- `hls_list_size=3` - Keep 3 segments (saves disk space)
- `delete_segments` - Auto-delete old segments

### **Change Stream URL (if using domain):**

Edit `client/src/components/MobileGameLayout/VideoArea.tsx` line 51:

```typescript
// Using IP
const STREAM_URL = 'http://91.108.110.72:3000';

// Using domain
const STREAM_URL = 'https://yourdomain.com:3000';
```

---

## **📊 How It Works**

### **Complete Flow:**

```
1. ADMIN STARTS OBS
   ↓
   Streams to: rtmp://91.108.110.72:1935/live/test
   ↓
2. NODE-MEDIA-SERVER (Port 1935)
   Receives RTMP stream
   ↓
3. FFMPEG TRANSCODING
   Converts RTMP → HLS format
   Creates 1-second segments
   ↓
4. MEDIA FOLDER
   Saves: media/live/test/segment0.ts, segment1.ts, etc.
   Creates: media/live/test/index.m3u8 (playlist)
   ↓
5. HTTP SERVER (Port 8000)
   Serves HLS files with CORS headers
   ↓
6. EXPRESS SERVER (Port 3000)
   Serves player.html with HLS.js player
   ↓
7. GAME CLIENT
   Embeds iFrame: http://91.108.110.72:3000
   ↓
8. PLAYERS WATCH
   Video plays in game with overlays (timer, results)
```

---

## **🎯 Architecture Diagram**

```
┌─────────────────┐
│   OBS Studio    │ (Admin's Computer)
│  Broadcasting   │
└────────┬────────┘
         │ RTMP Stream
         │ rtmp://91.108.110.72:1935/live/test
         ↓
┌─────────────────────────────────────────┐
│         VPS SERVER (91.108.110.72)      │
│                                         │
│  ┌───────────────────────────────────┐ │
│  │   Node-Media-Server (Port 1935)   │ │
│  │   - Receives RTMP                 │ │
│  │   - Calls FFmpeg for transcoding  │ │
│  └───────────────┬───────────────────┘ │
│                  │                      │
│  ┌───────────────▼───────────────────┐ │
│  │   FFmpeg Transcoder               │ │
│  │   - RTMP → HLS conversion         │ │
│  │   - Creates 1-second segments     │ │
│  └───────────────┬───────────────────┘ │
│                  │                      │
│  ┌───────────────▼───────────────────┐ │
│  │   Media Folder                    │ │
│  │   live/test/index.m3u8            │ │
│  │   live/test/segment0.ts           │ │
│  │   live/test/segment1.ts           │ │
│  │   live/test/segment2.ts           │ │
│  └───────────────┬───────────────────┘ │
│                  │                      │
│  ┌───────────────▼───────────────────┐ │
│  │   HTTP Server (Port 8000)         │ │
│  │   - Serves HLS files              │ │
│  │   - CORS enabled                  │ │
│  └───────────────────────────────────┘ │
│                                         │
│  ┌───────────────────────────────────┐ │
│  │   Express Server (Port 3000)      │ │
│  │   - Serves player.html            │ │
│  │   - HLS.js video player           │ │
│  └───────────────────────────────────┘ │
└─────────────────────────────────────────┘
         │ HTTP
         │ http://91.108.110.72:3000
         ↓
┌─────────────────────────────────────────┐
│         GAME CLIENT (Browser)           │
│                                         │
│  ┌───────────────────────────────────┐ │
│  │   VideoArea Component             │ │
│  │   - iFrame embeds player          │ │
│  │   - Overlays (timer, results)     │ │
│  │   - Never interrupted             │ │
│  └───────────────────────────────────┘ │
└─────────────────────────────────────────┘
         │
         ↓
    👥 PLAYERS WATCH
```

---

## **🛠️ Troubleshooting**

### **Problem: Stream not showing in game**

**Check 1: Is streaming server running?**
```bash
pm2 status
# or
ps aux | grep node
```

**Check 2: Can you access player directly?**
```
Open: http://91.108.110.72:3000
```

**Check 3: Is OBS streaming?**
- Check OBS bottom right corner - should show green "LIVE"
- Check OBS stats - should show upload speed

**Check 4: Are ports open?**
```bash
sudo ufw status
# or
sudo firewall-cmd --list-ports
```

**Check 5: Check server logs**
```bash
pm2 logs streaming-server
# or if running directly, check terminal output
```

---

### **Problem: High latency (delay)**

**Solution 1: Reduce segment size**
Edit `server.js` line 36:
```javascript
hlsFlags: '[hls_time=1:hls_list_size=2:hls_flags=delete_segments]'
// Reduced from 3 to 2 segments
```

**Solution 2: Use faster encoding preset in OBS**
- Settings → Output → Encoder Preset: `ultrafast` or `superfast`

**Solution 3: Lower bitrate in OBS**
- Settings → Output → Bitrate: 2000 Kbps (instead of 4000)

---

### **Problem: Stream keeps buffering**

**Solution 1: Check internet upload speed**
```bash
# On VPS
speedtest-cli
```
**Minimum required:** 5 Mbps upload

**Solution 2: Lower OBS bitrate**
- Settings → Output → Bitrate: 1500-2000 Kbps

**Solution 3: Increase buffer in player.html**
Edit `player.html` line 86-88:
```javascript
maxBufferLength: 60,  // Increased from 30
maxMaxBufferLength: 120,  // Increased from 60
```

---

### **Problem: "Stream unavailable" error**

**Check 1: Is OBS streaming to correct URL?**
```
Server: rtmp://91.108.110.72:1935/live
Stream Key: test
```

**Check 2: Check media folder**
```bash
cd live_stream/media/live/test
ls -la
# Should show index.m3u8 and .ts files
```

**Check 3: Check FFmpeg is installed**
```bash
ffmpeg -version
```

**Check 4: Check server logs for errors**
```bash
pm2 logs streaming-server --lines 50
```

---

## **🔒 Security Considerations**

### **1. Add Stream Key Authentication (Optional)**

Edit `server.js` after line 46:

```javascript
nms.on('prePublish', (id, StreamPath, args) => {
  const streamKey = args.key;
  const validKey = 'your-secret-stream-key-here';
  
  if (streamKey !== validKey) {
    console.log('❌ Invalid stream key:', streamKey);
    let session = nms.getSession(id);
    session.reject();
  } else {
    console.log('✅ Valid stream key, allowing publish');
  }
});
```

**Then in OBS:**
```
Server: rtmp://91.108.110.72:1935/live
Stream Key: test?key=your-secret-stream-key-here
```

### **2. Use HTTPS (Recommended for Production)**

**Install Nginx as reverse proxy:**
```bash
sudo apt install nginx certbot python3-certbot-nginx -y

# Configure Nginx for streaming server
sudo nano /etc/nginx/sites-available/streaming

# Add:
server {
    listen 80;
    server_name yourdomain.com;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}

# Enable site
sudo ln -s /etc/nginx/sites-available/streaming /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# Get SSL certificate
sudo certbot --nginx -d yourdomain.com
```

**Then update VideoArea.tsx:**
```typescript
const STREAM_URL = 'https://yourdomain.com';
```

---

## **📈 Performance Optimization**

### **1. Enable Hardware Encoding (if GPU available)**

**OBS Settings:**
- Output → Encoder: NVENC H.264 (NVIDIA) or QuickSync (Intel)
- This reduces CPU usage significantly

### **2. Optimize FFmpeg Settings**

Edit `server.js` line 36:
```javascript
hlsFlags: '[hls_time=2:hls_list_size=3:hls_flags=delete_segments+append_list]'
```

### **3. Use CDN (for high traffic)**

If you have many players:
- Upload HLS segments to CDN (Cloudflare, AWS CloudFront)
- Serve video from CDN instead of VPS
- Reduces VPS bandwidth usage

---

## **✅ Verification Checklist**

- [ ] FFmpeg installed on VPS
- [ ] Ports 1935, 8000, 3000 opened
- [ ] Streaming server running (PM2 or direct)
- [ ] OBS configured and streaming
- [ ] Player page accessible: `http://91.108.110.72:3000`
- [ ] HLS playlist accessible: `http://91.108.110.72:8000/live/test/index.m3u8`
- [ ] Game shows video stream
- [ ] Video overlays (timer, results) working
- [ ] No interruptions during game state changes

---

## **🎉 Success!**

Your game now uses **100% self-hosted streaming**:
- ✅ No external dependencies
- ✅ Full control over quality and latency
- ✅ No monthly fees for streaming services
- ✅ Better performance (local network)
- ✅ Privacy and security

---

## **📞 Quick Reference**

### **URLs:**
- **RTMP Input:** `rtmp://91.108.110.72:1935/live/test`
- **HLS Output:** `http://91.108.110.72:8000/live/test/index.m3u8`
- **Player Page:** `http://91.108.110.72:3000`
- **Game Integration:** iFrame embeds player page

### **Commands:**
```bash
# Start streaming server
cd live_stream && pm2 start server.js --name streaming-server

# Check status
pm2 status

# View logs
pm2 logs streaming-server

# Restart
pm2 restart streaming-server

# Stop
pm2 stop streaming-server
```

### **File Locations:**
- **Server:** `live_stream/server.js`
- **Player:** `live_stream/player.html`
- **Media:** `live_stream/media/live/test/`
- **Game Component:** `client/src/components/MobileGameLayout/VideoArea.tsx`

---

**Status: ✅ READY FOR DEPLOYMENT**
