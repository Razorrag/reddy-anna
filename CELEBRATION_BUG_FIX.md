# Game Completion Celebration Bug Fix

## Problem
When a game completed, the celebration overlay was not showing for players, and the "Start New Game" button was not appearing for admins.

## Root Cause
The `completeGame` function in `server/game.ts` was trying to send `game_complete` WebSocket messages to clients, but the `clients` variable was not imported from `routes.ts`. This caused the condition `if (payoutNotifications && payoutNotifications.length > 0 && clients)` to fail because `clients` was `undefined`.

As a result:
- No `game_complete` messages were sent to any clients
- Players never received celebration data
- The frontend never transitioned to the "complete" phase properly

## Solution
Added `clients` to the imports in `server/game.ts`:

```typescript
// Before:
import { broadcastToRole, GameState } from './routes';

// After:
import { broadcastToRole, GameState, clients } from './routes';
```

## Additional Improvements
Added debug logging to help diagnose similar issues in the future:

### Backend (`server/game.ts`)
- Already had logging for sending `game_complete` messages

### Frontend (`client/src/contexts/WebSocketContext.tsx`)
- Added logging when `game_complete` event is received
- Added logging when celebration data is set
- Added logging when phase changes to 'complete'

### Frontend (`client/src/contexts/GameStateContext.tsx`)
- Added logging in `SHOW_CELEBRATION` and `HIDE_CELEBRATION` reducer actions

### Frontend (`client/src/components/MobileGameLayout/GlobalWinnerCelebration.tsx`)
- Added logging on every render to show celebration state

### Frontend (`client/src/contexts/WebSocketContext.tsx` - opening_card_confirmed)
- Fixed the handler to properly clear old game state without using `resetGame()`
- Now explicitly calls `hideCelebration()` when a new game starts
- This ensures celebration stays visible until admin starts a new game

## Testing
To verify the fix:
1. Start a game as admin
2. Place bets as a player
3. Deal cards until a winner is determined
4. Check that:
   - Player sees celebration overlay with payout information
   - Admin sees "Start New Game" button
   - Celebration stays visible until admin clicks "Start New Game"
   - Console logs show `game_complete` messages being sent and received

## Files Modified
- `server/game.ts` - Added `clients` import (CRITICAL FIX)
- `client/src/contexts/WebSocketContext.tsx` - Added debug logging and fixed opening_card_confirmed handler
- `client/src/contexts/GameStateContext.tsx` - Added debug logging
- `client/src/components/MobileGameLayout/GlobalWinnerCelebration.tsx` - Added debug logging
