# 🔑 Stream Key Configuration Guide

## Quick Answer: How to Get Your Stream Key

Your stream key is currently **hardcoded** in the `live_stream/server.js` file.

### Current Configuration:
- **Stream Key:** `test`
- **RTMP Server:** `rtmp://91.108.110.72:1935/live`
- **OBS Stream Key:** `test`
- **Player URL:** `http://91.108.110.72:3000`

---

## Option 1: Use Hardcoded Key (Simplest - Recommended for Now)

### OBS Configuration:
1. Open OBS Studio
2. Go to **Settings → Stream**
3. Configure:
   - **Service:** Custom
   - **Server:** `rtmp://91.108.110.72:1935/live`
   - **Stream Key:** `test`
4. Click **OK**
5. Click **Start Streaming**

### Admin Panel Configuration:
1. Login to Admin Dashboard
2. Go to **Stream Settings** (or navigate to `/admin-stream-settings-new`)
3. Enter:
   - **Stream URL:** `http://91.108.110.72:3000`
   - **Stream Type:** iframe
   - **Stream Active:** ✅ ON
4. Click **Save Settings**

### Result:
- OBS pushes to: `rtmp://91.108.110.72:1935/live/test`
- Server converts to HLS: `http://91.108.110.72:8000/live/test/index.m3u8`
- Player displays at: `http://91.108.110.72:3000`
- Players see it embedded in game

---

## Option 2: Dynamic Stream Keys (Better Security)

If you want to **generate unique stream keys** and manage them via admin panel:

### Implementation Steps:

#### 1. Add Stream Key to Database

Create a new table in Supabase:

```sql
CREATE TABLE stream_keys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  stream_key TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  is_active BOOLEAN DEFAULT true,
  last_used_at TIMESTAMP
);

-- Create index for fast lookup
CREATE INDEX idx_stream_keys_key ON stream_keys(stream_key);
CREATE INDEX idx_stream_keys_active ON stream_keys(is_active);
```

#### 2. Update Admin Stream Settings Page

Add stream key generation and display:

**File:** `client/src/pages/admin-stream-settings-new.tsx`

Add to interface:
```typescript
interface StreamConfig {
  streamUrl: string;
  streamType: 'iframe' | 'video' | 'custom';
  isActive: boolean;
  streamTitle: string;
  autoplay: boolean;
  muted: boolean;
  controls: boolean;
  streamKey?: string; // NEW
}
```

Add UI section (after Stream URL input):
```tsx
{/* Stream Key Display */}
<div className="bg-purple-900/20 border border-purple-700/30 rounded-lg p-4">
  <h4 className="text-sm font-semibold text-purple-300 mb-3">
    🔑 Your Stream Key (for OBS)
  </h4>
  <div className="flex gap-2">
    <input
      type="text"
      value={config.streamKey || 'Click Generate to create'}
      readOnly
      className="flex-1 px-4 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white font-mono text-sm"
    />
    <button
      onClick={generateStreamKey}
      className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold"
    >
      Generate New
    </button>
  </div>
  <p className="text-xs text-gray-400 mt-2">
    Use this key in OBS: Server = rtmp://91.108.110.72:1935/live, Key = {config.streamKey || 'your-key'}
  </p>
</div>
```

Add function:
```typescript
const generateStreamKey = async () => {
  try {
    const response = await apiClient.post<any>('/stream/generate-key');
    if (response.success && response.data.streamKey) {
      setConfig({ ...config, streamKey: response.data.streamKey });
      alert('✅ New stream key generated!');
    }
  } catch (error) {
    console.error('Failed to generate stream key:', error);
    alert('❌ Failed to generate stream key');
  }
};
```

#### 3. Add Backend Endpoint

**File:** `server/routes/stream-routes.ts`

Add route:
```typescript
/**
 * POST /api/stream/generate-key
 * Generate new stream key (Admin only)
 */
router.post('/generate-key', requireAuth, validateAdminAccess, async (req, res) => {
  try {
    // Generate random stream key
    const crypto = require('crypto');
    const streamKey = crypto.randomBytes(16).toString('hex');
    
    // Save to database
    const { data, error } = await supabaseServer
      .from('stream_keys')
      .insert({
        stream_key: streamKey,
        created_by: req.user.id,
        is_active: true
      })
      .select()
      .single();
    
    if (error) throw error;
    
    // Also update simple_stream_config
    await supabaseServer
      .from('simple_stream_config')
      .update({ stream_key: streamKey })
      .eq('id', 1);
    
    res.json({
      success: true,
      data: {
        streamKey: streamKey
      }
    });
  } catch (error) {
    console.error('❌ Error generating stream key:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate stream key'
    });
  }
});

/**
 * GET /api/stream/current-key
 * Get current active stream key (Admin only)
 */
router.get('/current-key', requireAuth, validateAdminAccess, async (req, res) => {
  try {
    const { data, error } = await supabaseServer
      .from('stream_keys')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    
    res.json({
      success: true,
      data: data || null
    });
  } catch (error) {
    console.error('❌ Error fetching stream key:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch stream key'
    });
  }
});
```

#### 4. Update live_stream Server to Accept Any Key

**File:** `live_stream/server.js`

The current setup already accepts ANY stream key! The key becomes part of the path:
- OBS pushes to: `rtmp://91.108.110.72:1935/live/YOUR_KEY`
- HLS available at: `http://91.108.110.72:8000/live/YOUR_KEY/index.m3u8`

To validate keys, add authentication hook:

```javascript
// Add after nms.run()
nms.on('prePublish', async (id, StreamPath, args) => {
  console.log('[NodeMediaServer] prePublish', id, StreamPath);
  
  // Extract stream key from path: /live/YOUR_KEY
  const streamKey = StreamPath.split('/')[2];
  
  // Validate against database (optional)
  // For now, just log it
  console.log('Stream Key:', streamKey);
  
  // To reject invalid keys:
  // let session = nms.getSession(id);
  // session.reject();
});

nms.on('postPublish', (id, StreamPath, args) => {
  console.log('[NodeMediaServer] Stream started:', StreamPath);
});

nms.on('donePublish', (id, StreamPath, args) => {
  console.log('[NodeMediaServer] Stream ended:', StreamPath);
});
```

---

## Complete Flow with Dynamic Keys

### 1. Admin Generates Key
```
Admin Panel → Stream Settings → Click "Generate New" → Get key: abc123def456
```

### 2. Configure OBS
```
Server: rtmp://91.108.110.72:1935/live
Stream Key: abc123def456
```

### 3. Update Player URL
The player URL needs to include the stream key:
```
http://91.108.110.72:3000?key=abc123def456
```

Or update `player.html` to accept key as query parameter:

```html
<script>
  // Get stream key from URL
  const urlParams = new URLSearchParams(window.location.search);
  const streamKey = urlParams.get('key') || 'test';
  
  // Update HLS source
  const videoSrc = `http://91.108.110.72:8000/live/${streamKey}/index.m3u8`;
  
  if (Hls.isSupported()) {
    var hls = new Hls();
    hls.loadSource(videoSrc);
    hls.attachMedia(video);
  }
</script>
```

### 4. Save in Admin Panel
```
Stream URL: http://91.108.110.72:3000?key=abc123def456
Stream Active: ON
Save Settings
```

---

## Recommendation

**For now, use Option 1 (hardcoded key `test`)** because:
- ✅ Already working
- ✅ No code changes needed
- ✅ Simple to set up
- ✅ Sufficient for single admin

**Upgrade to Option 2 later** if you need:
- Multiple admins with different keys
- Key rotation for security
- Ability to revoke access
- Audit trail of who streamed when

---

## Quick Start Checklist

- [ ] VPS: `pm2 start server.js --name streaming-server` (in live_stream folder)
- [ ] VPS: Open ports 1935, 8000, 3000 in firewall
- [ ] OBS: Server = `rtmp://91.108.110.72:1935/live`, Key = `test`
- [ ] OBS: Click "Start Streaming"
- [ ] Admin Panel: Stream URL = `http://91.108.110.72:3000`
- [ ] Admin Panel: Stream Active = ON
- [ ] Admin Panel: Click "Save Settings"
- [ ] Test: Open player game page as normal user
- [ ] Verify: Live video appears in game

---

## Troubleshooting

### Stream not appearing?
1. Check OBS is streaming (green indicator)
2. Test HLS directly: `http://91.108.110.72:8000/live/test/index.m3u8`
3. Test player page: `http://91.108.110.72:3000`
4. Check PM2 logs: `pm2 logs streaming-server`

### "Connection refused" in OBS?
- Firewall blocking port 1935
- Run: `sudo ufw allow 1935/tcp`

### Player shows black screen?
- Wait 5-10 seconds for HLS segments to generate
- Check browser console for errors
- Verify CORS headers in server.js

### Want to change stream key?
- **Option 1:** Keep using `test` (simplest)
- **Option 2:** Implement dynamic keys (see above)

---

## Summary

**Your stream key is: `test`**

This is hardcoded in your current setup and works perfectly. Use it in OBS, and your stream will be available at `http://91.108.110.72:3000` for embedding in your game.

No additional configuration needed unless you want dynamic key generation (which requires the implementation steps above).
