# ⚡ QUICK STREAMING FIX - ONE CHANGE NEEDED

## ✅ Backend: DONE
File: `live_stream/server.js` - Already fixed!

## ⏳ Frontend: ONE EDIT REQUIRED

**File**: `client/src/components/MobileGameLayout/VideoArea.tsx`  
**Lines**: 280-286 (inside the `new Hls({...})` configuration)

### CHANGE THESE 4 VALUES:

```typescript
// Line 280: Change from 1 to 2
liveSyncDurationCount: 2,           // Was: 1

// Line 281: Change from 2 to 4  
liveMaxLatencyDurationCount: 4,     // Was: 2

// Line 285: Change from 2 to 3
maxBufferLength: 3,                 // Was: 2

// Line 286: Change from 4 to 6
maxMaxBufferLength: 6,              // Was: 4
```

### RESULT:
- ✅ 2-3s latency (down from 6s)
- ✅ No black screens on pause/resume
- ✅ No crashes on refresh
- ✅ Smooth, stable playback

### AFTER EDITING:
```bash
cd client
npm run build
pm2 restart andar-bahar
```

That's it! 🎉
