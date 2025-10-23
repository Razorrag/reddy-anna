# 🎥 How Stream is Displayed on Frontend Game Page

## Visual Layout

```
┌─────────────────────────────────────────────────────────────┐
│                    PLAYER GAME PAGE                          │
│                     (/game route)                            │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │                                                     │    │
│  │  ┌─────────────┐         ┌──────────────┐        │    │
│  │  │ ROUND 1     │         │   🔴 LIVE    │        │    │
│  │  │ Betting     │         │              │        │    │
│  │  │ 25s remain  │         └──────────────┘        │    │
│  │  └─────────────┘                                  │    │
│  │                                                     │    │
│  │              ┌─────────────┐                       │    │
│  │              │             │                       │    │
│  │              │     25      │  ← Circular Timer    │    │
│  │              │             │     (Center)          │    │
│  │              └─────────────┘                       │    │
│  │                                                     │    │
│  │         🎥 LIVE STREAM PLAYS HERE 🎥              │    │
│  │    (Restream Player Iframe - Full Video)          │    │
│  │                                                     │    │
│  │  ┌──────────────────────────────────────────┐    │    │
│  │  │ ● ONLINE                                  │    │    │
│  │  └──────────────────────────────────────────┘    │    │
│  │                                                     │    │
│  └────────────────────────────────────────────────────┘    │
│                    VideoArea Component                      │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │         Andar (Red)  |  Bahar (Blue)              │    │
│  │         [Betting Areas]                            │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │  [1K] [2.5K] [5K] [10K] [20K] [30K] [40K] [50K]  │    │
│  │              Chip Selector                         │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │  [Undo] [Rebet] [History] [Wallet]               │    │
│  │           Control Buttons                          │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Component Hierarchy

```
PlayerGame (player-game.tsx)
    ↓
MobileGameLayout
    ↓
VideoArea (VideoArea.tsx)
    ↓
VideoStream (VideoStream.tsx)
    ↓
<iframe> with Restream Player
```

---

## Detailed Flow

### 1. **VideoArea Component** (`VideoArea.tsx`)

**Location:** Lines 92-100
```tsx
<div className="relative aspect-video">
  <VideoStream 
    streamUrl={streamUrl}
    streamType={streamType}
    isLive={gameState.phase !== 'idle'}
    title={streamTitle}
  />
</div>
```

**What it does:**
- Fetches stream settings from backend on mount (line 33-45)
- Passes settings to VideoStream component
- Overlays game UI elements (timer, round info, status)

---

### 2. **VideoStream Component** (`VideoStream.tsx`)

**Location:** Lines 66-135

**Three Display States:**

#### A. **Loading State** (lines 67-76)
```tsx
if (isLoading) {
  return (
    <div>
      <div className="spinner"></div>
      <p>Loading stream...</p>
    </div>
  );
}
```
Shows: Loading spinner while fetching settings

#### B. **Not Configured State** (lines 79-99)
```tsx
if (!streamSettings.streamKey) {
  return (
    <div>
      <Settings icon />
      <h3>Stream Not Configured</h3>
      <p>Please configure RTMP settings...</p>
      <a href="/backend-settings">Go to Settings</a>
    </div>
  );
}
```
Shows: Warning message with link to backend settings

#### C. **Stream Display State** (lines 101-134)

**When Stream is LIVE** (status === 'online'):
```tsx
const streamPlayerUrl = `https://player.restream.io?token=${streamSettings.streamKey}`;

<iframe
  src={streamPlayerUrl}
  width="100%"
  height="100%"
  frameBorder="0"
  allowFullScreen
  allow="autoplay; fullscreen"
  className="w-full h-full"
  title={streamSettings.streamTitle}
/>
```
Shows: **Actual live stream in iframe**

**When Stream is OFFLINE**:
```tsx
<div>
  <Radio icon />
  <h3>{streamSettings.streamTitle}</h3>
  <p>Stream is currently offline</p>
  <p>Start streaming from OBS to see the live stream here</p>
</div>
```
Shows: Placeholder with offline message

---

## What the Player Sees

### Scenario 1: Stream is LIVE and Configured ✅

```
┌──────────────────────────────────────┐
│  🔴 LIVE                             │
│                                      │
│  ┌────────────────────────────────┐ │
│  │                                 │ │
│  │    ACTUAL VIDEO PLAYING         │ │
│  │    (Restream Player)            │ │
│  │                                 │ │
│  │    [Your OBS stream content]    │ │
│  │                                 │ │
│  └────────────────────────────────┘ │
│                                      │
│  ● ONLINE                            │
└──────────────────────────────────────┘
```

**Player sees:**
- ✅ Live video stream playing
- ✅ Game overlays (timer, round info)
- ✅ Full video controls (play/pause/fullscreen)
- ✅ Auto-plays when page loads

---

### Scenario 2: Stream is OFFLINE but Configured ⚫

```
┌──────────────────────────────────────┐
│                                      │
│  ┌────────────────────────────────┐ │
│  │         📹                      │ │
│  │                                 │ │
│  │  Andar Bahar Live               │ │
│  │  Stream is currently offline    │ │
│  │                                 │ │
│  │  Start streaming from OBS       │ │
│  │  to see the live stream here    │ │
│  │                                 │ │
│  └────────────────────────────────┘ │
│                                      │
│  ● OFFLINE                           │
└──────────────────────────────────────┘
```

**Player sees:**
- ⚫ Offline placeholder
- ⚫ Stream title
- ⚫ Instructions to start OBS

---

### Scenario 3: Stream NOT Configured ⚠️

```
┌──────────────────────────────────────┐
│                                      │
│  ┌────────────────────────────────┐ │
│  │         ⚙️                      │ │
│  │                                 │ │
│  │  Stream Not Configured          │ │
│  │                                 │ │
│  │  Please configure your RTMP     │ │
│  │  settings in the backend        │ │
│  │  settings page                  │ │
│  │                                 │ │
│  │  [Go to Settings] ←─ Button    │ │
│  │                                 │ │
│  └────────────────────────────────┘ │
│                                      │
└──────────────────────────────────────┘
```

**Player sees:**
- ⚠️ Configuration warning
- ⚠️ Link to backend settings
- ⚠️ No stream display

---

## Technical Details

### Stream URL Construction

```typescript
// In VideoStream.tsx (line 102)
const streamPlayerUrl = `https://player.restream.io?token=${streamSettings.streamKey}`;
```

**Example:**
- Stream Key: `re_10643053_eventd64cd5dd4a144026bc377f2449320575`
- Final URL: `https://player.restream.io?token=re_10643053_eventd64cd5dd4a144026bc377f2449320575`

This URL is used as the `src` for the iframe.

---

### Auto-Refresh Mechanism

```typescript
// In VideoStream.tsx (lines 58-62)
useEffect(() => {
  loadStreamSettings();
  
  // Refresh every 30 seconds
  const interval = setInterval(loadStreamSettings, 30000);
  return () => clearInterval(interval);
}, [title]);
```

**What happens:**
1. Page loads → Fetch settings immediately
2. Every 30 seconds → Fetch settings again
3. If status changes from 'offline' to 'live' → Stream appears automatically
4. If status changes from 'live' to 'offline' → Placeholder appears

---

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    BACKEND (Supabase)                        │
│  stream_settings table:                                      │
│  - restream_rtmp_url: "rtmp://live.restream.io/live"        │
│  - restream_stream_key: "re_XXXXX_XXXXX"                    │
│  - stream_title: "Andar Bahar Live"                         │
│  - stream_status: "live" or "offline"                       │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ↓
┌─────────────────────────────────────────────────────────────┐
│              GET /api/game/stream-settings                   │
│  Returns: {                                                  │
│    restreamRtmpUrl: "...",                                  │
│    restreamStreamKey: "re_XXXXX_XXXXX",                    │
│    streamTitle: "Andar Bahar Live",                         │
│    streamStatus: "live"                                     │
│  }                                                           │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ↓
┌─────────────────────────────────────────────────────────────┐
│              VideoStream Component                           │
│  1. Fetch settings on mount                                  │
│  2. Extract streamKey from response                          │
│  3. Build iframe URL:                                        │
│     https://player.restream.io?token={streamKey}            │
│  4. Check streamStatus                                       │
│  5. Display iframe if "live", placeholder if "offline"      │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ↓
┌─────────────────────────────────────────────────────────────┐
│                    PLAYER SEES                               │
│  - If live: Actual video stream playing in iframe           │
│  - If offline: Placeholder with offline message             │
│  - If not configured: Warning with settings link            │
└─────────────────────────────────────────────────────────────┘
```

---

## Example: Complete User Experience

### Admin Side:

1. **Configure Backend Settings:**
   ```
   /backend-settings
   RTMP URL: rtmp://live.restream.io/live
   Stream Key: re_10643053_eventXXXXXXXXXXXXXXXXXXXXXX
   [Save Settings]
   ```

2. **Configure OBS:**
   ```
   Settings → Stream → Custom
   Server: rtmp://live.restream.io/live
   Stream Key: re_10643053_eventXXXXXXXXXXXXXXXXXXXXXX
   [Start Streaming]
   ```

### Player Side:

3. **Open Game Page:**
   ```
   http://localhost:5000/game
   ```

4. **What Player Sees:**
   - **First 5 seconds:** Loading spinner
   - **After loading:** 
     - If OBS streaming: Live video plays automatically
     - If OBS not streaming: Offline placeholder
   - **Every 30 seconds:** Auto-checks if stream status changed

---

## Summary

**The stream is displayed as:**

1. **Full-width video player** in the VideoArea component
2. **Restream player iframe** showing actual live stream
3. **Overlaid with game UI** (timer, round info, betting status)
4. **Auto-refreshing** every 30 seconds
5. **Responsive** to stream status changes

**The player gets:**
- ✅ Real-time video stream from OBS
- ✅ Automatic status updates
- ✅ Clean fallback when offline
- ✅ No configuration needed on their end

**It just works!** 🎉
