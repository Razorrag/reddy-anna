# Console Errors Fix - October 29, 2025

## Issues Fixed

### 1. ✅ React Infinite Loop (CRITICAL)
**Error:** `Maximum update depth exceeded`

**Root Cause:** `WebSocketContext.tsx` line 755 was calling `showNotification()` inside a state setter callback, triggering infinite re-renders.

**Fix Applied:**
- Removed `showNotification()` call from inside `setConnectionState`
- Added `maxReconnectReached` flag to `ConnectionState` interface
- Created separate `useEffect` hook to watch for max reconnect and show notification
- Files modified:
  - `client/src/contexts/WebSocketContext.tsx` (lines 735-766, 930-935)
  - `client/src/types/game.ts` (line 85)

### 2. ✅ Game State Sync Logging Enhanced
**Issue:** `/play` page appeared empty with no debugging information

**Fix Applied:**
- Added comprehensive logging to `sync_game_state` WebSocket message handler
- Logs now show:
  - Phase, round, opening card
  - Number of Andar/Bahar cards
  - Winner status, betting locked status
  - Betting totals sync
- Files modified:
  - `client/src/contexts/WebSocketContext.tsx` (lines 210-256)

### 3. ⚠️ Database Schema Issues (Non-blocking)
**Errors in server logs:**
```
Could not find the table 'public.user_game_history_view' in the schema cache
column user_referrals.updated_at does not exist
```

**Status:** These are non-critical - the app works without these features. Can be fixed later by:
1. Creating missing database view: `user_game_history_view`
2. Removing reference to `updated_at` column in referrals query

## Testing Instructions

1. **Refresh the browser** to load the fixed code
2. **Open browser console** (F12)
3. **Navigate to `/play` page**
4. **Look for these logs:**
   ```
   📥 Syncing game state: { phase: 'idle', round: 1, ... }
   ✅ Game state synchronized
   ```

## Expected Behavior

### When Game is Idle (No Active Game)
- Video area shows hourglass emoji (⏳)
- "ROUND 1" badge in top-left
- "Waiting" phase text
- Stream player visible (may show placeholder if no stream)
- Betting strip shows Andar/Opening Card/Bahar positions
- All UI elements visible and functional

### When Game is Active (Betting Phase)
- Large circular timer in center of video
- "ROUND X" badge with "Betting" text
- Countdown timer visible
- Betting positions enabled
- Chip selector functional

## Files Modified

1. `client/src/contexts/WebSocketContext.tsx`
   - Fixed infinite loop bug
   - Enhanced sync_game_state logging
   
2. `client/src/types/game.ts`
   - Added `maxReconnectReached?: boolean` to ConnectionState

## Next Steps

If `/play` page is still empty after refresh:
1. Check browser console for the new sync logs
2. Verify WebSocket connection succeeds
3. Check if admin has started a game
4. Verify stream configuration is correct

## Admin Must Start Game

**Important:** The `/play` page will show "Waiting" until an admin:
1. Logs into `/admin-game`
2. Selects an opening card
3. Clicks "Start Game"

This is **normal behavior** - players wait for admin to start the game.
