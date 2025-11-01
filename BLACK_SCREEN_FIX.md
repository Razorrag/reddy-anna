# Black Screen Fix - WebRTC Player

## Issue
Track is received successfully (`Track readyState: live`) but video shows black screen on player page.

## Root Causes Identified

### 1. **Stream Not Being Attached to Video Element**
- Track received via `ontrack` event
- But video element never got the stream attached
- Missing log: "📺 Setting video stream to video element"

**Problem**: The code was checking conditions but not logging why it failed, making debugging impossible.

**Fix Applied**:
- Removed `setTimeout` delay - attach stream immediately when track arrives
- Added comprehensive condition checking with detailed logs
- Added fallback retry mechanism if video element not ready immediately

### 2. **Duplicate Offer Processing**
- Multiple offers being received repeatedly
- Causing connection issues
- Component may be remounting or admin sending multiple offers

**Fix Applied**:
- Added check for existing remote description
- Ignore duplicate offers if connection already established
- Ignore duplicate offers if same SDP already set
- Added logging for duplicate offer detection

### 3. **Missing Video Element Verification**
- No verification that video element is in DOM
- No check for visibility/display CSS issues
- No check for video element dimensions

**Fix Applied**:
- Added comprehensive video element verification useEffect
- Logs all video element properties (dimensions, visibility, CSS)
- Checks if video is actually visible in DOM

### 4. **Missing Event Listeners**
- No `loadedmetadata` listener to verify video metadata loaded
- No `canplay` listener to catch when video is ready to play
- Limited error handling for play() failures

**Fix Applied**:
- Added `loadedmetadata` event listener with logging
- Added `canplay` event listener with logging
- Enhanced play() error handling with detailed error logs

---

## Changes Made

### File: `client/src/components/StreamPlayer/WebRTCPlayer.tsx`

#### 1. Enhanced Stream Attachment Logic (Line 347-421)

**Before**:
```typescript
setTimeout(() => {
  if (isMountedRef.current && videoRef.current && streamRef.current) {
    console.log('📺 Setting video stream to video element');
    videoRef.current.srcObject = streamRef.current;
    // ...
  }
}, 100);
```

**After**:
```typescript
// Immediate attachment with comprehensive logging
console.log('🔍 [PLAYER] Checking conditions before attaching stream:');
console.log('   - isMountedRef:', isMountedRef.current);
console.log('   - videoRef exists:', !!videoRef.current);
console.log('   - streamRef exists:', !!streamRef.current);
console.log('   - video element in DOM:', videoRef.current?.isConnected);

if (isMountedRef.current && videoRef.current && streamRef.current) {
  // Attach immediately with detailed logging
  videoRef.current.srcObject = streamRef.current;
  // Enhanced play() with promise handling
  // Fallback retry if conditions not met
}
```

#### 2. Duplicate Offer Prevention (Line 83-106)

**Added**:
- Check if remote description already exists
- Ignore if connection already established
- Ignore if same SDP already set
- Logging for all duplicate detection cases

#### 3. Video Element Verification (Line 582-659)

**Added**:
- Comprehensive video element verification on mount
- Logs all video properties (dimensions, visibility, CSS)
- `loadedmetadata` event listener
- `canplay` event listener
- Enhanced stream re-attachment logic

---

## Expected Logs After Fix

When track is received, you should now see:

```
📺 [PLAYER] Received remote track:
   Track kind: video
   Track readyState: live
   Track enabled: true

🔍 [PLAYER] Checking conditions before attaching stream:
   - isMountedRef: true
   - videoRef exists: true
   - streamRef exists: true
   - video element in DOM: true

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📺 [PLAYER] Attaching stream to video element
📺 [PLAYER] Setting srcObject to stream
📺 [PLAYER] Video element srcObject set: true
📺 [PLAYER] Stream tracks: 1
📺 [PLAYER] Video element readyState: 0
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ [PLAYER] Video play() succeeded
✅ [PLAYER] Video element paused: false
✅ [PLAYER] Video element currentTime: 0.xxx
✅ [PLAYER] Video stream attached successfully

📊 [PLAYER] Video metadata loaded: {videoWidth: 1920, videoHeight: 1080, readyState: 4}
✅ [PLAYER] Video can play
```

---

## Testing Steps

1. **Open Player Page** with console open (F12)
2. **Wait for track to be received** (look for `📺 [PLAYER] Received remote track`)
3. **Check logs** - You should see:
   - ✅ "📺 [PLAYER] Attaching stream to video element"
   - ✅ "✅ [PLAYER] Video play() succeeded"
   - ✅ "✅ [PLAYER] Video stream attached successfully"
4. **Verify video is visible** on page
5. **If still black**, check logs for:
   - ❌ Error messages about conditions not met
   - ⚠️ Warnings about video element visibility
   - Dimensions showing 0x0 (video not rendering)

---

## If Still Black Screen

Check console logs for:

### Issue: Video element not in DOM
**Logs**: `video element in DOM: false`
**Fix**: Check component rendering - video element may not be mounted

### Issue: Video dimensions are 0
**Logs**: `Video dimensions: {width: 0, height: 0}`
**Fix**: Check CSS - video container may have 0 height/width

### Issue: Video hidden by CSS
**Logs**: `Video display style: none` or `Video visibility style: hidden`
**Fix**: Check CSS styles - video may be hidden

### Issue: Video play() failed
**Logs**: `❌ [PLAYER] Video play() failed`
**Fix**: Click on page to trigger user interaction (browser autoplay policy)

### Issue: Stream not attaching
**Logs**: `❌ [PLAYER] Cannot attach stream - conditions not met`
**Fix**: Check which condition failed (isMountedRef, videoRef, streamRef)

---

## Next Steps

1. **Test the fix** - Refresh player page and check logs
2. **Share new logs** if still not working
3. **Check video element verification logs** for CSS/visibility issues
4. **Verify track is being received** - Look for ontrack event

---

## Additional Debugging

If video still doesn't show, check browser Network tab:
- Look for WebRTC connections
- Check if ICE candidates are being exchanged
- Verify STUN/TURN servers are accessible

Also check browser DevTools:
- Elements tab: Verify video element exists and has srcObject
- Console tab: All logs with `[PLAYER]` prefix
- Network tab: WebSocket messages should show offer/answer/ICE exchange



