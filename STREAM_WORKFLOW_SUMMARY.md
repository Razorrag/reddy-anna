# 🎥 COMPLETE STREAM WORKFLOW - DEEP INVESTIGATION

## **ARCHITECTURE OVERVIEW**

```
┌─────────────────────────────────────────────────────────────────┐
│                    STREAMING SYSTEM FLOW                         │
└─────────────────────────────────────────────────────────────────┘

Admin (OBS) → RTMP Server → HLS Transcoding → Database Config → Frontend Display
     ↓              ↓              ↓                ↓                    ↓
  Stream Key   Port 1935    .m3u8 Files    Supabase Table      Player Video
```

---

## **1️⃣ LIVE_STREAM DIRECTORY** (Self-Hosted RTMP/HLS Server)

### **Files:**
- `server.js` - Node-Media-Server (RTMP → HLS transcoding)
- `index.html` - HLS.js video player
- `package.json` - Dependencies (node-media-server, express)
- `media/live/test/` - Auto-generated HLS segments

### **What It Does:**
1. **Receives RTMP stream** from OBS on port 1935
2. **Transcodes to HLS** (.m3u8 playlist + .ts segments)
3. **Serves HLS files** via HTTP on port 8000
4. **Serves player page** via Express on port 3000

### **Stream URL:**
```
RTMP Input:  rtmp://91.108.110.72:1935/live/test
HLS Output:  http://91.108.110.72:8000/live/test/index.m3u8
Player Page: http://91.108.110.72:3000
```

### **Status:** ✅ WORKING
- Low latency (1-2s delay)
- Auto-cleanup of old segments
- CORS enabled for cross-origin

---

## **2️⃣ BACKEND (Server-Side Stream Management)**

### **A. Database Schema**

**Table:** `simple_stream_config`

```sql
CREATE TABLE simple_stream_config (
  id UUID PRIMARY KEY,
  stream_url TEXT NOT NULL,              -- HLS/YouTube/MP4 URL
  stream_type VARCHAR(20),               -- 'iframe' or 'video'
  is_active BOOLEAN DEFAULT false,       -- Stream visible to players?
  is_paused BOOLEAN DEFAULT false,       -- Stream paused? (NEW)
  stream_title VARCHAR(255),
  autoplay BOOLEAN DEFAULT true,
  muted BOOLEAN DEFAULT true,
  controls BOOLEAN DEFAULT false,
  min_viewers INTEGER DEFAULT 1000,      -- Fake viewer range min
  max_viewers INTEGER DEFAULT 1100,      -- Fake viewer range max
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

**Location:** `CREATE_SIMPLE_STREAM_CONFIG_TABLE.sql`

---

### **B. API Routes**

**File:** `server/stream-routes.ts`

#### **GET /api/stream/simple-config** (Public)
- Fetches current stream configuration
- Used by frontend to load stream URL
- Returns: `{ streamUrl, streamType, isActive, isPaused, minViewers, maxViewers }`

#### **POST /api/stream/simple-config** (Admin Only)
- Saves stream configuration
- Updates database with new URL/settings
- Validates admin access via JWT

#### **POST /api/stream/toggle-pause** (Admin Only)
- Toggles stream pause/play state
- Broadcasts WebSocket message to all clients
- Updates `is_paused` in database

**WebSocket Broadcast:**
```typescript
wss.clients.forEach((client) => {
  client.send(JSON.stringify({
    type: 'stream_pause_state',
    data: { isPaused, timestamp }
  }));
  client.send(JSON.stringify({
    type: 'stream_status_updated',
    data: { isPaused, timestamp }
  }));
});
```

---

### **C. Route Registration**

**File:** `server/index.ts` (line 155)
```typescript
import streamRoutes from './stream-routes';
app.use('/api/stream', streamRoutes);
```

**Public Endpoints:** (No auth required)
- `/api/stream/simple-config` (GET)

---

## **3️⃣ FRONTEND (Client-Side Stream Display)**

### **A. Admin Stream Settings Page**

**File:** `client/src/pages/admin-stream-settings.tsx`

**Features:**
- ✅ Stream URL input
- ✅ Stream type toggle (iframe/video)
- ✅ Active/inactive toggle
- ✅ Fake viewer range (min/max)
- ✅ Pause/Play control
- ✅ Save configuration

**API Calls:**
```typescript
// Load config
GET /api/stream/simple-config

// Save config
POST /api/stream/simple-config {
  streamUrl, streamType, isActive, isPaused,
  minViewers, maxViewers
}

// Toggle pause
POST /api/stream/toggle-pause { isPaused }
```

---

### **B. Admin Stream Control Panel**

**File:** `client/src/components/AdminGamePanel/StreamControlPanel.tsx`

**Features:**
- Embedded in admin game panel
- Quick stream configuration
- Pause/play button
- Viewer range settings
- Same API endpoints as settings page

---

### **C. Video Player Component**

**File:** `client/src/components/MobileGameLayout/VideoArea.tsx`

**Key Features:**

#### **1. Stream Configuration Loading**
```typescript
// Line 56-140: Load stream config from backend
const loadStreamConfig = async () => {
  const response = await fetch('/api/stream/simple-config');
  const data = await response.json();
  setStreamConfig(data.data);
  setIsPausedState(data.data.isPaused);
};
```

#### **2. Auto-Refresh Mechanisms**
- **1-second polling** (line 176-182): Checks for config updates
- **WebSocket listener** (line 185-196): Instant pause/play updates
- **Page visibility** (line 200-237): Auto-resume when tab visible

#### **3. Stream Type Detection**
```typescript
// Line 517-520: Auto-detect based on URL
const isVideoFile = url.endsWith('.mp4') || url.endsWith('.m3u8');
const shouldUseVideo = streamType === 'video' || isVideoFile;
```

#### **4. HLS.js Integration**
```typescript
// Line 240-318: Low-latency HLS configuration
const hls = new Hls({
  liveSyncDurationCount: 1,        // 0.5s behind live
  liveMaxLatencyDurationCount: 2,  // Max 1s delay
  maxBufferLength: 1,              // 1s buffer
  lowLatencyMode: true,
  backBufferLength: 0
});
```

#### **5. Pause/Play Handling**
```typescript
// Line 417-484: Anti-flicker pause/resume
if (isPaused) {
  captureCurrentFrame();  // Freeze frame
  videoElement.pause();
} else {
  smoothReload();         // Resume without black screen
}
```

#### **6. Stream Health Monitor**
```typescript
// Line 321-364: Auto-recovery every 500ms
- Auto-resume if paused unexpectedly
- Reload if failed/stalled
- Check for progress
```

#### **7. Fake Viewer Count**
```typescript
// Line 143-167: Random count every 2s
const fakeCount = Math.floor(
  Math.random() * (maxViewers - minViewers + 1)
) + minViewers;
```

---

### **D. WebSocket Context**

**File:** `client/src/contexts/WebSocketContext.tsx`

**Stream-Related Messages:**

```typescript
// Line 1017-1026: stream_pause_state
case 'stream_pause_state': {
  const { isPaused } = data.data;
  window.dispatchEvent(new CustomEvent('stream_status_updated', {
    detail: { isPaused }
  }));
  break;
}

// Line 1029-1034: stream_status_updated
case 'stream_status_updated': {
  window.dispatchEvent(new CustomEvent('stream_status_updated', {
    detail: data.data
  }));
  break;
}
```

**Event Flow:**
1. Admin clicks pause/play
2. Backend broadcasts WebSocket message
3. WebSocketContext receives message
4. Dispatches `stream_status_updated` event
5. VideoArea listens to event (line 186-196)
6. VideoArea refetches config immediately

---

## **4️⃣ COMPLETE DATA FLOW**

### **Scenario 1: Admin Configures Stream**

```
1. Admin opens /admin-stream-settings
2. Enters HLS URL: http://91.108.110.72:8000/live/test/index.m3u8
3. Selects type: "Video"
4. Toggles "Active": ON
5. Sets viewers: 1000-1100
6. Clicks "Save"
   ↓
7. POST /api/stream/simple-config
   ↓
8. Backend saves to simple_stream_config table
   ↓
9. Success notification shown
```

---

### **Scenario 2: Player Views Stream**

```
1. Player opens /game
2. VideoArea component mounts
3. Calls loadStreamConfig()
   ↓
4. GET /api/stream/simple-config
   ↓
5. Receives: { streamUrl, streamType: 'video', isActive: true }
   ↓
6. Detects .m3u8 → Uses HLS.js
   ↓
7. Creates HLS instance with low-latency config
   ↓
8. Loads stream: http://91.108.110.72:8000/live/test/index.m3u8
   ↓
9. Video plays with 1-2s latency
   ↓
10. Fake viewer count: Random(1000-1100) updates every 2s
```

---

### **Scenario 3: Admin Pauses Stream**

```
1. Admin clicks "Pause Stream" in settings
   ↓
2. POST /api/stream/toggle-pause { isPaused: true }
   ↓
3. Backend updates database: is_paused = true
   ↓
4. Backend broadcasts WebSocket:
   {
     type: 'stream_pause_state',
     data: { isPaused: true }
   }
   ↓
5. All connected clients receive message
   ↓
6. WebSocketContext dispatches 'stream_status_updated' event
   ↓
7. VideoArea receives event
   ↓
8. VideoArea calls loadStreamConfig()
   ↓
9. Gets isPaused: true
   ↓
10. Captures current frame
   ↓
11. Pauses video
   ↓
12. Shows frozen frame overlay (no black screen)
   ↓
13. Players see: "⏸️ Stream Paused"
```

---

### **Scenario 4: Admin Resumes Stream**

```
1. Admin clicks "Resume Stream"
   ↓
2. POST /api/stream/toggle-pause { isPaused: false }
   ↓
3. Backend broadcasts WebSocket
   ↓
4. VideoArea receives event
   ↓
5. Calls loadStreamConfig()
   ↓
6. Gets isPaused: false
   ↓
7. Smooth reload (no flicker):
   - Keep frozen frame visible
   - Load new video in background
   - Swap when ready
   - Remove frozen frame
   ↓
8. Video resumes playing
   ↓
9. Players see live stream again
```

---

## **5️⃣ WHAT'S WORKING**

### ✅ **Backend**
- Stream config API endpoints
- Database storage (simple_stream_config)
- WebSocket pause/play broadcasts
- Admin authentication
- Public config access

### ✅ **Frontend**
- Admin stream settings page
- Stream control panel
- Video player with HLS.js
- Auto-refresh (polling + WebSocket)
- Pause/play with frozen frame
- Fake viewer count
- Auto-resume on tab focus
- Stream health monitoring
- Anti-flicker mechanisms

### ✅ **Live Stream Server**
- RTMP ingestion (port 1935)
- HLS transcoding
- Low-latency segments (1s)
- Auto-cleanup
- CORS enabled
- Player page

---

## **6️⃣ KEY TECHNOLOGIES**

| Component | Technology |
|-----------|-----------|
| **RTMP Server** | node-media-server |
| **Transcoding** | FFmpeg (built-in) |
| **HLS Player** | HLS.js |
| **Backend API** | Express.js |
| **Database** | Supabase (PostgreSQL) |
| **Real-time** | WebSocket |
| **Frontend** | React + TypeScript |
| **Video Element** | HTML5 `<video>` + `<iframe>` |

---

## **7️⃣ CRITICAL FILES SUMMARY**

### **Backend (5 files)**
1. `server/stream-routes.ts` - API routes
2. `server/index.ts` - Route registration
3. `server/routes.ts` - WebSocket integration
4. `server/storage-supabase.ts` - Database queries
5. `CREATE_SIMPLE_STREAM_CONFIG_TABLE.sql` - Schema

### **Frontend (4 files)**
1. `client/src/components/MobileGameLayout/VideoArea.tsx` - Player
2. `client/src/pages/admin-stream-settings.tsx` - Settings page
3. `client/src/components/AdminGamePanel/StreamControlPanel.tsx` - Control panel
4. `client/src/contexts/WebSocketContext.tsx` - Real-time updates

### **Live Stream (3 files)**
1. `live_stream/server.js` - RTMP/HLS server
2. `live_stream/index.html` - HLS player
3. `live_stream/package.json` - Dependencies

---

## **8️⃣ CONFIGURATION FLOW**

```
Admin Input → Backend API → Database → WebSocket → Frontend Display
     ↓             ↓            ↓           ↓            ↓
Stream URL    Validation   Supabase   Broadcast   VideoArea
Stream Type   Auth Check   Storage    All Clients  HLS.js
Active/Pause  Save Config  Update     Event       Render
Viewer Range  Response     Timestamp  Dispatch    Update
```

---

## **9️⃣ REAL-TIME UPDATES**

### **Polling (Fallback)**
- Every 1 second
- Calls `/api/stream/simple-config`
- Updates local state

### **WebSocket (Primary)**
- Instant notifications
- `stream_pause_state` message
- `stream_status_updated` event
- No delay

### **Page Visibility**
- Auto-resume when tab visible
- Prevents stale streams
- Smooth reconnection

---

## **🔟 ANTI-FLICKER MECHANISMS**

1. **Frozen Frame Capture** - Canvas screenshot before pause
2. **Background Loading** - New video loads while old visible
3. **Smooth Swap** - Transition when ready
4. **No Black Screen** - Always show something
5. **Reload State** - Keep frame during refresh

---

## **FINAL STATUS: ✅ FULLY OPERATIONAL**

**All components working:**
- ✅ RTMP server receiving streams
- ✅ HLS transcoding active
- ✅ Database storing config
- ✅ API endpoints responding
- ✅ WebSocket broadcasting
- ✅ Frontend displaying stream
- ✅ Pause/play functioning
- ✅ Fake viewers showing
- ✅ Auto-recovery working
- ✅ Admin controls active

**No blocking issues found.**
