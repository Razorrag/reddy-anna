# WebRTC Screen Sharing Debug Guide

## Overview
This guide explains how to debug the WebRTC screen sharing feature between the admin dashboard and player page.

## Enhanced Logging Added

Comprehensive logging has been added to trace the entire WebRTC flow. All logs are prefixed with emoji indicators and `[ADMIN]` or `[PLAYER]` tags for easy identification.

## Complete Flow and What to Look For

### 1. Admin Starts Screen Share

**Location**: Admin Dashboard → Start Screen Share → Confirm Crop (or Skip)

**Expected Console Logs (Admin)**:
```
📡 [ADMIN] Starting broadcast to players
📡 [ADMIN] Admin streamId: stream-XXXXXXXXXX-admin_user_id
```

**What to check**:
- Verify a unique `streamId` is generated
- Confirm `stream-start` message is sent

---

### 2. Players Receive Stream-Start

**Location**: Player page console

**Expected Console Logs (Player)**:
```
✅ Screen sharing started - UI updated
💾 Stored streamId: stream-XXXXXXXXXX-admin_user_id
🔔 Stream started - sending viewer-join signal to admin
```

**What to check**:
- Player receives `stream-start` message
- StreamId is stored in sessionStorage
- Player sends `viewer-join` message with correct streamId

---

### 3. Player Sends Viewer-Join

**Location**: Player page console (WebRTCPlayer component)

**Expected Console Logs (Player)**:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
👤 [PLAYER] Sending viewer-join signal to admin
👤 [PLAYER] StreamId: stream-XXXXXXXXXX-admin_user_id
👤 [PLAYER] Time: 2025-11-01T...
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**What to check**:
- Message is sent immediately after stream-start
- Correct streamId is included
- No errors during message send

---

### 4. Server Routes Viewer-Join to Admin

**Location**: Server console

**Expected Console Logs (Server)**:
```
[WebRTC] Message from player_user_id: viewer-join
[WebRTC] Found admin admin_user_id for stream stream-XXX, notifying of new viewer player_user_id
[WebRTC] Viewer player_user_id joined, notified admin admin_user_id
```

**What to check**:
- Server receives viewer-join
- Server finds correct admin using streamId
- Server sends `new-viewer` message to admin

**Common Issue**: If you see:
```
[WebRTC] No active stream found for viewer player_user_id (streamId: ...)
[WebRTC] Sent stream-not-available to player_user_id
```
This means the streamId doesn't match any active stream on the server.

---

### 5. Admin Receives New-Viewer Event

**Location**: Admin dashboard console

**Expected Console Logs (Admin)**:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🆕 [ADMIN] New viewer joined: player_user_id
🆕 [ADMIN] Time: 2025-11-01T...
🆕 [ADMIN] Current peer connections: 0
🆕 [ADMIN] Stream ref exists: true
🆕 [ADMIN] Is broadcasting: true
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**What to check**:
- Admin receives new-viewer event
- `Stream ref exists: true` (if false, stream not ready)
- `Is broadcasting: true` (if false, admin hasn't confirmed crop yet)

---

### 6. Admin Checks Stream Readiness

**Location**: Admin dashboard console

**Expected Console Logs (Admin)**:
```
🔍 [ADMIN] Checking stream readiness for player_user_id:
   - Has stream: true
   - Video tracks: 1
   - First track state: live
   - First track enabled: true
   - Has live track: true
✅ [ADMIN] Stream ready for player_user_id, creating offer...
```

**What to check**:
- Stream has video tracks (`Video tracks: 1`)
- Track state is `live` (not `ended` or `new`)
- Track is enabled (`true`)

**Common Issue**: If you see:
```
📋 [ADMIN] Queued viewer player_user_id - stream track not live yet (state: new)
```
This means the canvas stream hasn't started yet. The viewer will be queued and offer will be created once stream is ready.

---

### 7. Admin Creates and Sends Offer

**Location**: Admin dashboard console

**Expected Console Logs (Admin)**:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📤 [ADMIN] createAndSendOffer called for player_user_id
📤 [ADMIN] Time: 2025-11-01T...
📤 [ADMIN] Video tracks count: 1
📹 Adding 1 tracks to peer connection for player_user_id:
✅ Added video track (enabled: true, state: live)
📤 [ADMIN] Creating offer for player_user_id...
⬆️ [ADMIN] Sending offer to client: player_user_id
⬆️ [ADMIN] Offer type: offer, SDP length: XXXX chars
⬆️ [ADMIN] Offer SDP (first 200 chars): v=0...
✅ [ADMIN] Offer sent successfully to player_user_id
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**What to check**:
- Offer is created successfully
- SDP length is > 0 (typically 1000-3000 chars)
- Message is sent without errors

---

### 8. Player Receives Offer

**Location**: Player page console

**Expected Console Logs (Player)**:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📡 [PLAYER] Received WebRTC offer event
📡 [PLAYER] Event detail structure:
   hasSdp: true
   sdpType: "object"
   sdpValueType: "offer"
   from: "admin_user_id"
   streamId: "stream-XXXXXXXXXX"
📡 [PLAYER] Peer connection exists: true
📡 [PLAYER] Peer connection state: new
📡 [PLAYER] Video ref exists: true
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Remote description set successfully
✅ Answer sent successfully
```

**What to check**:
- Player receives offer with valid SDP
- Peer connection exists
- Remote description is set successfully
- Answer is created and sent back

**Common Issue**: If you see:
```
❌ No peer connection available when offer received!
```
This means WebRTCPlayer hasn't initialized yet. Check if player page loaded properly.

---

### 9. Admin Receives Answer

**Location**: Admin dashboard console

**Expected Console Logs (Admin)**:
```
📩 Received answer from player_user_id
🔌 ADMIN WebRTC Connection State for player_user_id: connecting
🔌 ADMIN WebRTC Connection State for player_user_id: connected
✅ ADMIN WebRTC connection established with player_user_id!
```

**What to check**:
- Admin receives answer
- Connection state progresses: `new` → `connecting` → `connected`
- Final state is `connected`

**Common Issue**: If stuck on `connecting` or goes to `failed`:
- Check STUN/TURN server configuration
- Network firewall might be blocking WebRTC
- ICE candidates not being exchanged properly

---

### 10. Player Receives Video Track

**Location**: Player page console

**Expected Console Logs (Player)**:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📺 [PLAYER] Received remote track:
📺 [PLAYER] Track kind: video
📺 [PLAYER] Track id: XXXXXXXX-XXXX-XXXX
📺 [PLAYER] Track readyState: live
📺 [PLAYER] Track enabled: true
📺 [PLAYER] Streams count: 1
📺 [PLAYER] Time: 2025-11-01T...
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📺 Setting video stream to video element
✅ Video stream attached successfully
```

**What to check**:
- Track is received (`kind: video`)
- Track state is `live`
- Track is enabled
- Video element is set and playing

**SUCCESS**: At this point, the video should be visible on the player page!

---

## Common Issues and Solutions

### Issue 1: Player Never Receives Offer

**Symptoms**:
- Admin logs show offer sent
- Player logs don't show offer received

**Possible Causes**:
1. **StreamId Mismatch**: Check if streamId sent by player in `viewer-join` matches admin's streamId
2. **WebSocket Connection**: Player's WebSocket might be disconnected
3. **Server Routing**: Check server logs for routing errors

**Debug Steps**:
1. Check player console for `viewer-join` message
2. Check server console for `viewer-join` received
3. Verify streamId in both admin and player logs match
4. Check if server found admin for that streamId

---

### Issue 2: Admin Stream Not Ready

**Symptoms**:
```
📋 [ADMIN] Queued viewer player_user_id - stream track not live yet (state: new)
```

**Possible Causes**:
1. **Canvas Stream Not Started**: Admin confirmed crop before canvas had actual frames
2. **Track Not Live**: Canvas.captureStream() called too early

**Debug Steps**:
1. Wait a few seconds after starting screen share before confirming crop
2. Check if canvas has visible content before confirming
3. Look for canvas stream creation logs in admin console

---

### Issue 3: Connection Fails or Times Out

**Symptoms**:
- Connection state goes from `connecting` to `failed`
- Or stays on `connecting` indefinitely

**Possible Causes**:
1. **ICE Candidates Not Exchanged**: Check for ICE candidate logs
2. **Network/Firewall**: WebRTC traffic blocked
3. **STUN/TURN Server Issues**: Servers unreachable

**Debug Steps**:
1. Look for ICE candidate exchange logs (🧊 emoji)
2. Check network connectivity
3. Try from a different network
4. Verify STUN/TURN servers in code are accessible

---

### Issue 4: Video Black Screen

**Symptoms**:
- ontrack fires
- Video element has srcObject
- But video displays black screen

**Possible Causes**:
1. **Admin Canvas Black**: Crop area is invalid or canvas hasn't drawn frames
2. **Track Ended**: Video track stopped prematurely
3. **Browser Autoplay Policy**: Video not playing due to browser restrictions

**Debug Steps**:
1. Check admin screen share preview (should show video)
2. Verify crop area is valid and has actual content
3. Click on player page to trigger autoplay (some browsers require user interaction)
4. Check for video.play() errors in console

---

## Testing Checklist

Use this checklist when testing the screen sharing feature:

### Admin Side
- [ ] Start screen share shows browser's screen picker
- [ ] Screen share preview displays correctly
- [ ] Crop tool allows selecting area
- [ ] "Start Streaming" button sends stream-start
- [ ] Console shows new-viewer events for each connected player
- [ ] Console shows offer creation and sending
- [ ] Console shows connection state: connected

### Player Side
- [ ] Player page loads without errors
- [ ] Console shows stream-start received
- [ ] Console shows viewer-join sent
- [ ] Console shows offer received
- [ ] Console shows answer sent
- [ ] Console shows track received
- [ ] Console shows video stream attached
- [ ] **MOST IMPORTANT**: Video is visible and playing

### Server Side
- [ ] Server logs show viewer-join received
- [ ] Server finds correct admin
- [ ] Server sends new-viewer to admin
- [ ] Server routes offer to player
- [ ] Server routes answer to admin
- [ ] ICE candidates exchanged

---

## Quick Debug Command

To filter console logs, use browser dev tools console filter:
- Admin: `[ADMIN]`
- Player: `[PLAYER]`
- WebRTC only: `━━━` (the separator lines)

---

## Next Steps

After reviewing the logs, if you still don't see video:

1. **Check all logs match the expected sequence above**
2. **Look for any ERROR (❌) or WARNING (⚠️) messages**
3. **Verify streamId is consistent throughout the flow**
4. **Check network tab for WebSocket messages**
5. **Try with a fresh browser session (clear cache/cookies)**

---

## Support

If issue persists after following this guide:
1. Copy all console logs from both admin and player
2. Copy server logs
3. Note exact steps to reproduce
4. Check if issue is reproducible on different browsers/devices



