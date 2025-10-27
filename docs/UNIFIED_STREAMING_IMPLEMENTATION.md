# Unified Streaming Implementation Guide

## Overview

This document outlines the complete implementation of the unified streaming system that consolidates the previously separate RTMP and WebRTC streaming systems into a single comprehensive interface.

## Problem Solved

### Before: Duplicate Stream Systems
- **Game Admin Panel** (`/api/stream/*`): Full dual streaming with RTMP + WebRTC
- **Admin Dashboard** (`/api/game/stream-settings`): Simplified RTMP-only system
- Both managed similar configurations but were completely disconnected
- WebRTC implementation was incomplete with missing client-side logic

### After: Unified Stream System
- Single comprehensive interface combining both systems
- Complete WebRTC implementation with proper peer connection handling
- Seamless integration with Andar Bahar game state
- Real-time stream status synchronization

## Implementation Components

### 1. Backend API (`server/unified-stream-routes.ts`)
- **Unified endpoints** replacing duplicate systems
- **RTMP configuration** management
- **WebRTC configuration** management
- **Stream status** control
- **Game integration** endpoints
- **Active streams** monitoring

### 2. WebRTC Client (`client/src/lib/webrtc-client.ts`)
- **Complete WebRTC implementation** with proper peer connection
- **Screen capture** functionality
- **SDP offer/answer** handling
- **ICE candidate** exchange
- **Event system** for status updates
- **Error handling** and cleanup

### 3. Unified Stream Control (`client/src/components/UnifiedStreamControl.tsx`)
- **Tabbed interface** for RTMP and WebRTC
- **Stream method switching** with confirmation
- **RTMP configuration** (URL, key, player URL)
- **WebRTC quality settings** (resolution, FPS, bitrate)
- **Screen capture control** with preview
- **Stream status** display and management

### 4. Game Integration (`client/src/components/GameStreamIntegration.tsx`)
- **Game state synchronization** with streaming
- **Auto-stream management** based on game phases
- **Manual stream controls** override
- **Viewer management** and analytics
- **Real-time status** updates

### 5. Admin Dashboard (`client/src/pages/admin-stream-dashboard.tsx`)
- **Unified control panel** for administrators
- **Quick action overview** of all streaming components
- **System status** monitoring
- **Integration guide** for users

## Key Features Implemented

### 1. Stream Method Switching
```typescript
// Switch between RTMP and WebRTC with confirmation
const switchMethod = async (method: 'rtmp' | 'webrtc') => {
  if (isCapturing && method === 'rtmp') {
    const confirmed = window.confirm('Switching to RTMP will stop the current WebRTC stream. Continue?');
    if (!confirmed) return;
    stopCapture();
  }
  // ... switch logic
};
```

### 2. WebRTC Screen Capture
```typescript
// Complete screen capture implementation
const startCapture = async () => {
  await webrtcClient.initialize();
  webrtcClient.on('screen_captured', (stream: MediaStream) => {
    videoRef.current.srcObject = stream;
    videoRef.current.play();
    setIsCapturing(true);
  });
  await webrtcClient.startCapture();
};
```

### 3. Game State Synchronization
```typescript
// Auto-manage stream based on game state
const autoManageStream = async (gameStatus: string) => {
  switch (gameStatus) {
    case 'betting':
      if (!webrtcClient.getLocalStream()) {
        await startStreamForGame();
      }
      break;
    case 'finished':
      if (webrtcClient.getLocalStream()) {
        stopStreamForGame();
      }
      break;
  }
};
```

### 4. Stream Status Management
```typescript
// Real-time stream status updates
const handleStreamStatusUpdate = (data: any) => {
  if (data.method === 'webrtc') {
    setWebrtcStatus(data.status);
    if (data.status === 'online' && !isCapturing) {
      setIsCapturing(true);
    } else if (data.status === 'offline') {
      setIsCapturing(false);
      setIsPaused(false);
    }
  }
  loadConfig(); // Refresh config
};
```

## Database Schema Integration

### Unified Stream Configuration Table
```sql
CREATE TABLE stream_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  active_method VARCHAR(10) CHECK (active_method IN ('rtmp', 'webrtc', 'none')),
  stream_status VARCHAR(20) CHECK (stream_status IN ('online', 'offline', 'connecting', 'error')),
  stream_title VARCHAR(255),
  
  -- RTMP Configuration
  rtmp_server_url VARCHAR(500),
  rtmp_stream_key VARCHAR(255),
  rtmp_player_url VARCHAR(500),
  rtmp_status VARCHAR(50),
  rtmp_last_check TIMESTAMP,
  
  -- WebRTC Configuration  
  webrtc_enabled BOOLEAN DEFAULT true,
  webrtc_quality VARCHAR(10) CHECK (webrtc_quality IN ('low', 'medium', 'high', 'ultra')),
  webrtc_resolution VARCHAR(10) CHECK (webrtc_resolution IN ('480p', '720p', '1080p')),
  webrtc_fps INTEGER CHECK (webrtc_fps BETWEEN 15 AND 60),
  webrtc_bitrate INTEGER CHECK (webrtc_bitrate BETWEEN 500 AND 10000),
  webrtc_audio_enabled BOOLEAN DEFAULT true,
  webrtc_screen_source VARCHAR(10) CHECK (webrtc_screen_source IN ('screen', 'window', 'tab')),
  webrtc_room_id VARCHAR(255),
  webrtc_last_check TIMESTAMP,
  
  -- Analytics
  viewer_count INTEGER DEFAULT 0,
  total_views INTEGER DEFAULT 0,
  stream_duration_seconds INTEGER DEFAULT 0,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Game Stream Integration Table
```sql
CREATE TABLE game_stream_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID REFERENCES games(id),
  stream_sync_enabled BOOLEAN DEFAULT false,
  auto_start_stream BOOLEAN DEFAULT false,
  auto_stop_stream BOOLEAN DEFAULT false,
  stream_method VARCHAR(10) CHECK (stream_method IN ('rtmp', 'webrtc')),
  stream_status VARCHAR(20) CHECK (stream_status IN ('online', 'offline', 'connecting', 'error')),
  viewer_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

## API Endpoints

### Unified Stream Endpoints
- `GET /api/unified-stream/config` - Get current stream configuration
- `POST /api/unified-stream/method` - Switch between RTMP and WebRTC
- `POST /api/unified-stream/rtmp/config` - Save RTMP configuration
- `POST /api/unified-stream/webrtc/config` - Save WebRTC configuration
- `POST /api/unified-stream/status` - Update stream status
- `POST /api/unified-stream/title` - Update stream title
- `GET /api/unified-stream/webrtc/active` - Get active WebRTC streams

### Game Integration Endpoints
- `GET /api/unified-stream/game-config` - Get game stream configuration
- `POST /api/unified-stream/game-config` - Update game stream settings

## WebSocket Integration

### Unified WebSocket Messages
```typescript
// WebRTC signaling
case 'webrtc:signal':
  handleWebRTCSignal(message.data);
  break;

// Stream status updates
case 'stream_status':
  handleStreamStatusUpdate(message.data);
  break;

// Viewer count updates
case 'viewer_count':
  handleViewerCountUpdate(message.data);
  break;
```

### Game Socket Integration
```typescript
// Game state updates
socket.on('game_state_update', (data: any) => {
  handleGameStateUpdate(data);
});

// Stream viewer events
socket.on('stream_viewer_join', (data: any) => {
  setViewers(prev => [...prev, data.viewer]);
});

socket.on('stream_viewer_leave', (data: any) => {
  setViewers(prev => prev.filter(v => v.id !== data.viewerId));
});
```

## Testing Guide

### 1. RTMP Streaming Test
1. Navigate to Admin Dashboard → Stream Configuration
2. Switch to RTMP tab
3. Enter valid RTMP server URL and stream key
4. Save configuration
5. Start OBS Studio with the provided settings
6. Verify stream appears in player URL (if provided)

### 2. WebRTC Streaming Test
1. Navigate to Admin Dashboard → Stream Configuration
2. Switch to WebRTC tab
3. Click "Start Screen Capture"
4. Select screen/window/tab to share
5. Verify preview appears in the interface
6. Confirm stream status shows "🟢 Streaming"

### 3. Game Integration Test
1. Enable "Sync with Game Events"
2. Enable "Auto Start/Stop Stream"
3. Start a new Andar Bahar game
4. Verify stream automatically starts when game enters betting phase
5. Verify stream automatically stops when game finishes
6. Test manual controls override auto-stream behavior

### 4. Stream Switching Test
1. Start WebRTC stream
2. Attempt to switch to RTMP method
3. Confirm warning dialog appears
4. Verify stream stops and method switches correctly
5. Test reverse switching from RTMP to WebRTC

## Deployment Considerations

### 1. Supabase Configuration
- Ensure `update_balance_atomic` RPC function is implemented
- Verify real-time subscriptions are enabled
- Configure proper row-level security policies

### 2. WebSocket Configuration
- Ensure WebSocket server is running on port 3001
- Configure proper CORS and authentication
- Set up SSL certificates for production

### 3. WebRTC Requirements
- Configure STUN/TURN servers for production
- Ensure HTTPS for screen capture API
- Test browser compatibility (Chrome, Firefox, Edge)

### 4. RTMP Requirements
- Configure OBS Studio with proper settings
- Set up Restream.io account for multi-platform streaming
- Test network bandwidth for stable streaming

## Benefits Achieved

### 1. Eliminated Duplication
- **Before**: Two separate stream systems with overlapping functionality
- **After**: Single unified system with comprehensive features

### 2. Complete WebRTC Implementation
- **Before**: Incomplete WebRTC with missing client-side logic
- **After**: Full WebRTC implementation with proper peer connections

### 3. Game Integration
- **Before**: Streaming disconnected from game state
- **After**: Seamless integration with automatic stream management

### 4. User Experience
- **Before**: Confusing duplicate interfaces
- **After**: Clear, unified control panel with intuitive workflow

### 5. Maintainability
- **Before**: Separate codebases requiring duplicate maintenance
- **After**: Single codebase with shared components and logic

## Conclusion

The unified streaming implementation successfully resolves all identified issues:

1. ✅ **Eliminated duplicate stream systems** - Single unified interface
2. ✅ **Implemented complete WebRTC functionality** - Full client-side implementation
3. ✅ **Integrated streaming with game state** - Automatic synchronization
4. ✅ **Provided comprehensive admin controls** - Unified dashboard
5. ✅ **Maintained backward compatibility** - All existing functionality preserved

This implementation provides a solid foundation for future streaming enhancements and ensures a seamless user experience for both administrators and viewers.