# Stream System Cleanup - HLS-Only Simplification

## Overview
Simplifying streaming from dual WebRTC/RTMP system to clean HLS-only architecture using the `live_stream` folder.

## Current State
- ✅ HLS server in `live_stream/` (NodeMediaServer) - KEEP
- ✅ Simple stream config (`/api/stream/simple-config`) - KEEP
- ✅ VideoArea player component - KEEP
- ✅ admin-stream-settings.tsx - KEEP
- ❌ WebRTC signaling infrastructure - REMOVE
- ❌ RTMP legacy configuration - REMOVE
- ❌ Duplicate player components - REMOVE

## Cleanup Tasks

### Phase 1: Frontend Component Removal
- [ ] Remove `client/src/components/StreamPlayer/WebRTCPlayer.tsx`
- [ ] Remove `client/src/components/StreamPlayer/RTMPPlayer.tsx`
- [ ] Remove `client/src/components/StreamPlayer/UniversalStreamPlayer.tsx`
- [ ] Remove `client/src/components/StreamPlayer.tsx`
- [ ] Remove `client/src/components/AdminStreamControl.tsx`
- [ ] Remove `client/src/components/AdminGamePanel/StreamControlPanel.tsx`
- [ ] Remove `client/src/pages/admin-stream-settings-new.tsx`
- [ ] Clean WebRTC handlers from `client/src/contexts/WebSocketContext.tsx`

### Phase 2: Backend Code Removal
- [ ] Remove `server/webrtc-signaling.ts`
- [ ] Remove `server/stream-storage.ts`
- [ ] Remove `server/routes/stream-config.ts`
- [ ] Clean WebRTC routes from `server/stream-routes.ts`
- [ ] Clean WebRTC handlers from `server/routes.ts`

### Phase 3: Type Cleanup
- [ ] Remove WebRTC types from shared types
- [ ] Update interfaces to remove RTMP/WebRTC fields

### Phase 4: Documentation
- [ ] Create final documentation of HLS-only architecture
- [ ] Document environment variables for HLS base URL

## Final Architecture
```
HLS Origin (live_stream/) 
    ↓ (produces .m3u8 URL)
Backend (/api/stream/simple-config)
    ↓ (stores/serves config)
Frontend (VideoArea component)
    ↓ (plays HLS with HLS.js)
Users see stream
