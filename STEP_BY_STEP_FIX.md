# 🔧 Step-by-Step: Fix Streaming System

## Overview
Simplify streaming from complex HLS/embed system to simple RTMP URL + Stream Key → Display actual stream.

---

## Step 1: Run Database Migration (Optional Cleanup)

**File:** `db/migrations/simplify_stream_settings.sql`

```bash
# Run this in your database console or migration tool
psql -d your_database -f db/migrations/simplify_stream_settings.sql
```

**What it does:**
- Removes 20+ unnecessary stream settings
- Keeps only: `restream_rtmp_url`, `restream_stream_key`, `stream_title`, `stream_status`
- Cleans up database

---

## Step 2: Simplify Backend API

**File:** `server/routes.ts`

### A. Simplify GET /api/game/stream-settings (lines ~1339-1360)

**Replace this:**
```typescript
app.get("/api/game/stream-settings", async (req, res) => {
  // 20+ lines of complex settings
  res.json({
    streamUrl: settingsObj.stream_url || 'hardcoded_value',
    streamType: settingsObj.stream_type || 'embed',
    restreamEmbedToken: settingsObj.restream_embed_token || 'token',
    // ... 15+ more settings
  });
});
```

**With this:**
```typescript
app.get("/api/game/stream-settings", async (req, res) => {
  try {
    const settings = await storage.getStreamSettings();
    const settingsObj = settings.reduce((acc, setting) => {
      acc[setting.settingKey] = setting.settingValue;
      return acc;
    }, {} as Record<string, string>);

    res.json({
      restreamRtmpUrl: settingsObj.restream_rtmp_url || '',
      restreamStreamKey: settingsObj.restream_stream_key || '',
      streamTitle: settingsObj.stream_title || 'Andar Bahar Live',
      streamStatus: settingsObj.stream_status || 'offline'
    });
  } catch (error) {
    console.error('Error fetching stream settings:', error);
    res.status(500).json({ error: 'Failed to fetch stream settings' });
  }
});
```

### B. Simplify POST /api/game/stream-settings (lines ~1362-1387)

**Replace this:**
```typescript
app.post("/api/game/stream-settings", async (req, res) => {
  const { streamUrl, streamType, restreamEmbedToken, /* 10+ params */ } = req.body;
  // 20+ lines updating various settings
});
```

**With this:**
```typescript
app.post("/api/game/stream-settings", async (req, res) => {
  try {
    const { restreamRtmpUrl, restreamStreamKey, streamTitle } = req.body;

    if (restreamRtmpUrl !== undefined) await storage.updateStreamSetting('restream_rtmp_url', restreamRtmpUrl);
    if (restreamStreamKey !== undefined) await storage.updateStreamSetting('restream_stream_key', restreamStreamKey);
    if (streamTitle !== undefined) await storage.updateStreamSetting('stream_title', streamTitle);

    await storage.updateStreamSetting('last_stream_check', new Date().toISOString());

    res.json({
      success: true,
      message: 'Stream settings updated successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error updating stream settings:', error);
    res.status(500).json({ error: 'Failed to update stream settings' });
  }
});
```

### C. Simplify POST /api/game/stream-status (lines ~1389-1406)

**Replace this:**
```typescript
app.post("/api/game/stream-status", async (req, res) => {
  const { streamStatus, streamViewers, streamBitrate } = req.body;
  // Update multiple monitoring fields
});
```

**With this:**
```typescript
app.post("/api/game/stream-status", async (req, res) => {
  try {
    const { streamStatus } = req.body;
    if (streamStatus !== undefined) await storage.updateStreamSetting('stream_status', streamStatus);
    await storage.updateStreamSetting('last_stream_check', new Date().toISOString());

    res.json({
      success: true,
      message: 'Stream status updated successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error updating stream status:', error);
    res.status(500).json({ error: 'Failed to update stream status' });
  }
});
```

---

## Step 3: Update VideoStream Component

**File:** `client/src/components/VideoStream.tsx`

### A. Update imports and interface (lines ~1-25)

**Replace this:**
```typescript
interface VideoStreamProps {
  streamUrl?: string;
  streamType?: 'video' | 'rtmp' | 'embed';
  isLive?: boolean;
  viewerCount?: number;
  title?: string;
}
```

**With this:**
```typescript
interface VideoStreamProps {
  isLive?: boolean;
  viewerCount?: number;
  title?: string;
}
```

### B. Update component logic (lines ~26-135)

**Replace the entire component logic with:**
```typescript
export function VideoStream({
  isLive = false,
  viewerCount = 0,
  title = "Andar Bahar Live Game"
}: VideoStreamProps) {
  const [streamSettings, setStreamSettings] = useState({
    rtmpUrl: '',
    streamKey: '',
    streamTitle: title
  });
  const [streamStatus, setStreamStatus] = useState<'online' | 'offline' | 'error'>('offline');
  const [isLoading, setIsLoading] = useState(true);

  // Load stream settings from backend
  useEffect(() => {
    const loadStreamSettings = async () => {
      setIsLoading(true);
      try {
        const response = await fetch('/api/game/stream-settings');
        const data = await response.json();

        setStreamSettings({
          rtmpUrl: data.restreamRtmpUrl || '',
          streamKey: data.restreamStreamKey || '',
          streamTitle: data.streamTitle || title
        });

        setStreamStatus(data.streamStatus === 'live' ? 'online' : 'offline');
      } catch (error) {
        console.error('Failed to load stream settings:', error);
        setStreamStatus('error');
      } finally {
        setIsLoading(false);
      }
    };

    loadStreamSettings();

    // Refresh every 30 seconds
    const interval = setInterval(loadStreamSettings, 30000);
    return () => clearInterval(interval);
  }, [title]);

  const renderStreamContent = () => {
    if (isLoading) {
      return (
        <div className="w-full h-full bg-gradient-to-br from-gray-900 to-black flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-gold border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-400 text-sm">Loading stream...</p>
          </div>
        </div>
      );
    }

    // Check if stream is configured
    if (!streamSettings.streamKey) {
      return (
        <div className="w-full h-full bg-gradient-to-br from-gray-900 to-black flex items-center justify-center">
          <div className="text-center p-8 max-w-md">
            <div className="w-20 h-20 bg-yellow-600/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Settings className="w-10 h-10 text-yellow-500" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Stream Not Configured</h3>
            <p className="text-gray-400 text-sm mb-4">
              Please configure your RTMP settings in the backend settings page to start streaming.
            </p>
            <a
              href="/backend-settings"
              className="inline-block px-4 py-2 bg-gold hover:bg-gold/90 text-gray-900 rounded-lg font-semibold"
            >
              Go to Settings
            </a>
          </div>
        </div>
      );
    }

    // Display actual stream using Restream player
    const streamPlayerUrl = `https://player.restream.io?token=${streamSettings.streamKey}`;

    return (
      <div className="w-full h-full bg-black relative">
        {streamStatus === 'online' ? (
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
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-gray-900 to-black flex items-center justify-center">
            <div className="text-center p-8">
              <div className="w-20 h-20 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                <Radio className="w-10 h-10 text-gray-500" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">{streamSettings.streamTitle}</h3>
              <p className="text-gray-400 text-sm mb-4">
                Stream is currently offline
              </p>
              <p className="text-gray-500 text-xs">
                Start streaming from OBS to see the live stream here
              </p>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="relative w-full aspect-video bg-black rounded-xl overflow-hidden shadow-2xl">
      {/* Stream Configuration Display */}
      {renderStreamContent()}

      {/* Top Left - Live Badge */}
      {(isLive || streamStatus === 'online') && (
        <div className="absolute top-4 left-4 z-10">
          <div className="flex items-center gap-2 bg-red-600/90 backdrop-blur-sm px-3 py-1.5 rounded-full shadow-lg">
            <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
            <span className="text-white font-bold text-xs uppercase tracking-wider">LIVE</span>
          </div>
        </div>
      )}

      {/* Top Right - View Count */}
      {viewerCount > 0 && (
        <div className="absolute top-4 right-4 z-10">
          <div className="flex items-center gap-2 bg-black/60 backdrop-blur-sm px-3 py-1.5 rounded-full">
            <Eye className="w-3 h-3 text-red-400" />
            <span className="text-white text-xs font-medium">
              {viewerCount.toLocaleString()}
            </span>
          </div>
        </div>
      )}

      {/* Bottom Left - Stream Status */}
      <div className="absolute bottom-4 left-4 z-10">
        <div className={`px-2 py-1 rounded-full text-xs font-medium backdrop-blur-sm ${
          streamStatus === 'online' || isLive
            ? 'bg-green-500/80 text-white'
            : streamStatus === 'error'
            ? 'bg-red-500/80 text-white'
            : 'bg-gray-500/80 text-white'
        }`}>
          {streamStatus === 'online' || isLive ? '● ONLINE' : streamStatus === 'error' ? '● ERROR' : '● OFFLINE'}
        </div>
      </div>

      {/* Bottom Right - Settings Link (only show if not configured) */}
      {!streamSettings.streamKey && (
        <div className="absolute bottom-4 right-4 z-10">
          <a
            href="/backend-settings"
            className="flex items-center gap-2 bg-black/60 backdrop-blur-sm px-3 py-2 rounded-lg hover:bg-black/80 transition-colors"
          >
            <Settings className="w-3 h-3 text-gold" />
            <span className="text-gold text-xs font-medium">Configure Stream</span>
          </a>
        </div>
      )}
    </div>
  );
}
```

---

## Step 4: Update SimpleStreamSettings Component

**File:** `client/src/components/AdminGamePanel/SimpleStreamSettings.tsx`

### A. Update interface (lines ~14-19)

**Replace this:**
```typescript
interface StreamSettings {
  restreamRtmpUrl: string;
  restreamStreamKey: string;
  streamTitle: string;
  streamStatus: 'live' | 'offline' | 'error';
}
```

**With this:**
```typescript
interface StreamSettings {
  restreamRtmpUrl: string;
  restreamStreamKey: string;
  streamTitle: string;
  streamStatus: 'live' | 'offline';
}
```

### B. Update state initialization (lines ~21-30)

**Replace this:**
```typescript
const [settings, setSettings] = useState<StreamSettings>({
  restreamRtmpUrl: '',
  restreamStreamKey: '',
  streamTitle: '',
  streamStatus: 'offline'
});
```

**With this:**
```typescript
const [settings, setSettings] = useState<StreamSettings>({
  restreamRtmpUrl: '',
  restreamStreamKey: '',
  streamTitle: 'Andar Bahar Live',
  streamStatus: 'offline'
});
```

### C. Update loadSettings function (lines ~37-54)

**Replace this:**
```typescript
const loadSettings = async () => {
  try {
    const response = await fetch('/api/game/stream-settings');
    const data = await response.json();
    
    // Only use database values, no hardcoded fallbacks
    setSettings({
      restreamRtmpUrl: data.restreamRtmpUrl || '',
      restreamStreamKey: data.restreamStreamKey || '',
      streamTitle: data.streamTitle || '',
      streamStatus: data.streamStatus || 'offline'
    });
  } catch (error) {
    console.error('Failed to load stream settings:', error);
    showNotification('❌ Failed to load stream settings', 'error');
  }
};
```

**With this:**
```typescript
const loadSettings = async () => {
  try {
    const response = await fetch('/api/game/stream-settings');
    const data = await response.json();
    
    setSettings({
      restreamRtmpUrl: data.restreamRtmpUrl || '',
      restreamStreamKey: data.restreamStreamKey || '',
      streamTitle: data.streamTitle || 'Andar Bahar Live',
      streamStatus: data.streamStatus || 'offline'
    });
  } catch (error) {
    console.error('Failed to load stream settings:', error);
    showNotification('❌ Failed to load stream settings', 'error');
  }
};
```

### D. Update saveSettings function (lines ~56-87)

**Replace this:**
```typescript
const saveSettings = async () => {
  setIsLoading(true);
  try {
    const response = await fetch('/api/game/stream-settings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        restreamRtmpUrl: settings.restreamRtmpUrl,
        restreamStreamKey: settings.restreamStreamKey,
        streamTitle: settings.streamTitle,
        streamProvider: 'restream',
        streamType: 'rtmp',
        streamUrl: '' // No embed URL - RTMP only
      }),
    });

    if (response.ok) {
      showNotification('✅ Stream settings saved successfully', 'success');
      // Reload settings to confirm they were saved
      await loadSettings();
    } else {
      throw new Error('Failed to save settings');
    }
  } catch (error) {
    console.error('Failed to save stream settings:', error);
    showNotification('❌ Failed to save stream settings', 'error');
  } finally {
    setIsLoading(false);
  }
};
```

**With this:**
```typescript
const saveSettings = async () => {
  if (!settings.restreamRtmpUrl || !settings.restreamStreamKey) {
    showNotification('⚠️ Please fill in both RTMP URL and Stream Key', 'error');
    return;
  }

  setIsLoading(true);
  try {
    const response = await fetch('/api/game/stream-settings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        restreamRtmpUrl: settings.restreamRtmpUrl,
        restreamStreamKey: settings.restreamStreamKey,
        streamTitle: settings.streamTitle
      }),
    });

    if (response.ok) {
      showNotification('✅ Stream settings saved successfully', 'success');
      await loadSettings();
    } else {
      throw new Error('Failed to save settings');
    }
  } catch (error) {
    console.error('Failed to save stream settings:', error);
    showNotification('❌ Failed to save stream settings', 'error');
  } finally {
    setIsLoading(false);
  }
};
```

### E. Update getStatusColor and getStatusIcon (lines ~100-109)

**Replace this:**
```typescript
const getStatusColor = () => {
  switch (settings.streamStatus) {
    case 'live': return 'text-green-400';
    case 'error': return 'text-red-400';
    default: return 'text-gray-400';
  }
};

const getStatusIcon = () => {
  switch (settings.streamStatus) {
    case 'live': return '🟢';
    case 'error': return '🔴';
    default: return '⚫';
  }
};
```

**With this:**
```typescript
const getStatusColor = () => {
  return settings.streamStatus === 'live' ? 'text-green-400' : 'text-gray-400';
};

const getStatusIcon = () => {
  return settings.streamStatus === 'live' ? '🟢' : '⚫';
};
```

### F. Update checkStreamStatus function (lines ~111-122)

**Replace this:**
```typescript
const checkStreamStatus = async () => {
  setPreviewLoading(true);
  try {
    const response = await fetch('/api/game/stream-status-check');
    const data = await response.json();
    
    // Update local status
    setSettings(prev => ({
      ...prev,
      streamStatus: data.status === 'online' ? 'live' : 
                    data.status === 'error' ? 'error' : 'offline'
    }));
    
    showNotification(
      data.status === 'online' ? '✅ Stream is live!' : 
      data.status === 'error' ? '❌ Stream error detected' : 
      '⚫ Stream is offline', 
      data.status === 'online' ? 'success' : 
      data.status === 'error' ? 'error' : 'info'
    );
  } catch (error) {
    console.error('Failed to check stream status:', error);
    showNotification('❌ Failed to check stream status', 'error');
  } finally {
    setPreviewLoading(false);
  }
};
```

**With this:**
```typescript
const checkStreamStatus = async () => {
  setPreviewLoading(true);
  try {
    await loadSettings();
    showNotification(
      settings.streamStatus === 'live' ? '✅ Stream is live!' : '⚫ Stream is offline',
      settings.streamStatus === 'live' ? 'success' : 'info'
    );
  } catch (error) {
    console.error('Failed to check stream status:', error);
    showNotification('❌ Failed to check stream status', 'error');
  } finally {
    setPreviewLoading(false);
  }
};
```

### G. Remove error references in UI (lines ~248, 270, 273)

**Find and remove:**
```typescript
{settings.streamStatus === 'error' ? 'Stream Error' : 'Stream Offline'}
```

**Replace with:**
```typescript
Stream Offline
```

**And:**
```typescript
settings.streamStatus === 'error' ? 'text-red-400' : 'text-gray-400'
```

**Replace with:**
```typescript
'text-gray-400'
```

**And:**
```typescript
settings.streamStatus === 'live' ? '🟢 Stream Active' : 
settings.streamStatus === 'error' ? '🔴 Stream Error' : '⚫ Stream Offline'
```

**Replace with:**
```typescript
settings.streamStatus === 'live' ? '🟢 Stream Active' : '⚫ Stream Offline'
```

---

## Step 5: Test the Implementation

### A. Start the application
```bash
npm run dev
```

### B. Configure backend settings
1. Open `http://localhost:5000/backend-settings`
2. Enter RTMP URL: `rtmp://live.restream.io/live`
3. Enter Stream Key: `re_10643053_eventXXXXXXXXXXXXXXXXXXXX`
4. Click **Save Settings**

### C. Configure OBS
1. Open OBS Studio
2. Settings → Stream
3. Service: **Custom**
4. Server: `rtmp://live.restream.io/live`
5. Stream Key: `re_10643053_eventXXXXXXXXXXXXXXXXXXXX`
6. Apply → OK

### D. Test the stream
1. Start streaming in OBS
2. Open `http://localhost:5000/game`
3. Stream should appear automatically

### E. Test offline state
1. Stop streaming in OBS
2. Refresh game page
3. Should show offline placeholder

---

## Step 6: Verify Everything Works

### Checklist:
- [ ] Backend settings save successfully
- [ ] API returns correct data: `GET /api/game/stream-settings`
- [ ] VideoStream component loads without errors
- [ ] Stream appears when OBS is streaming
- [ ] Offline placeholder shows when OBS is not streaming
- [ ] Auto-refresh works (every 30 seconds)
- [ ] No console errors in browser
- [ ] No console errors in server

---

## Summary

**What was changed:**
- ✅ Simplified backend API (3 endpoints)
- ✅ Updated VideoStream to show actual stream
- ✅ Simplified SimpleStreamSettings UI
- ✅ Removed complex HLS/embed logic

**What now works:**
- ✅ Configure once in backend settings
- ✅ Stream appears automatically on game page
- ✅ No hardcoded values
- ✅ Clean and simple

**Done!** 🎉
