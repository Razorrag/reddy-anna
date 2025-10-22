# Opening Card Not Visible - Troubleshooting Guide

## Issue
The opening card is not displaying in the center of the betting strip on the player game page.

## How Opening Card Display Works

### 1. Admin Side (Game Start)
1. Admin opens `/admin-game` or `/game` route
2. Admin selects an opening card from the card grid
3. Admin clicks "Start Round 1" button
4. Backend receives `game_start` or `opening_card_confirmed` message
5. Backend broadcasts `opening_card_confirmed` to all connected clients

### 2. Player Side (Display)
1. Player's WebSocket receives `opening_card_confirmed` message
2. WebSocketContext processes the message and calls `setSelectedOpeningCard()`
3. GameStateContext updates `selectedOpeningCard` in state
4. BettingStrip component reads `gameState.selectedOpeningCard`
5. If not null, displays the card in the center section

## Component Chain

```
WebSocketContext (receives message)
    ↓
GameStateContext (updates state)
    ↓
BettingStrip (displays card)
```

## Code Locations

### Display Component
**File:** `client/src/components/MobileGameLayout/BettingStrip.tsx`
**Lines:** 129-157

```tsx
{gameState.selectedOpeningCard ? (
  <div className="relative flex flex-col items-center justify-center">
    <div className={`text-lg font-bold ${gameState.selectedOpeningCard.color === 'red' ? 'text-red-500' : 'text-gray-300'}`}>
      {gameState.selectedOpeningCard.display}
    </div>
    <div className={`text-xs font-semibold ${gameState.selectedOpeningCard.color === 'red' ? 'text-red-400' : 'text-gray-400'}`}>
      {gameState.selectedOpeningCard.suit?.toUpperCase()}
    </div>
  </div>
) : (
  <div className="flex flex-col items-center justify-center">
    <div className="text-gray-400 text-lg font-bold">?</div>
    <div className="text-gray-500 text-xs">CARD</div>
  </div>
)}
```

### WebSocket Handler
**File:** `client/src/contexts/WebSocketContext.tsx`
**Lines:** 207-230

Handles these message types:
- `opening_card_set`
- `opening_card_confirmed`
- `sync_game_state` (for late joiners)

### Backend Broadcast
**File:** `server/routes.ts`
**Lines:** 334-346

Broadcasts opening card when game starts.

## Troubleshooting Steps

### Step 1: Check if Game Has Started
**Symptom:** Opening card shows "?" in center
**Cause:** No game has been started by admin yet
**Solution:** 
1. Open admin panel at `http://localhost:5000/admin-game`
2. Select an opening card
3. Click "Start Round 1"

### Step 2: Check WebSocket Connection
**Check:** Open browser console (F12)
**Look for:**
```
✅ WebSocket connected successfully to: ws://localhost:5000/ws
```

**If not connected:**
- Check if backend is running
- Check if port 5000 is accessible
- Check browser console for errors

### Step 3: Check Opening Card Message
**Check:** Browser console should show:
```
Opening card received: {id: "K♠", display: "K♠", value: "K", suit: "♠", color: "black", rank: "K"}
Setting opening card via setSelectedOpeningCard...
Opening card set in state, phase updated to betting
```

**If not showing:**
- Admin hasn't started the game
- WebSocket message not being received
- Message type mismatch

### Step 4: Check Game State
**In browser console, run:**
```javascript
// Check if opening card is in state
window.__GAME_STATE__ // (if you expose it for debugging)
```

**Or add temporary logging in BettingStrip.tsx:**
```tsx
console.log('Opening card in state:', gameState.selectedOpeningCard);
```

### Step 5: Check Backend State
**Check backend logs for:**
```
Opening card set: K♠
Broadcasting opening_card_confirmed
```

## Common Issues & Solutions

### Issue 1: "?" Shows Instead of Card
**Cause:** `gameState.selectedOpeningCard` is `null`
**Solutions:**
- Admin needs to start a game
- Check WebSocket is connected
- Check message is being received

### Issue 2: Card Shows Briefly Then Disappears
**Cause:** Game state is being reset
**Solutions:**
- Check for `game_reset` messages
- Check for `clear_cards` actions
- Look for state resets in console

### Issue 3: Card Shows on Admin But Not Player
**Cause:** WebSocket broadcast not reaching players
**Solutions:**
- Check player WebSocket connection
- Check backend broadcast logic
- Verify message type matches

### Issue 4: Card Shows Wrong Value
**Cause:** Data structure mismatch
**Solutions:**
- Check Card interface matches backend
- Verify display property exists
- Check suit and color properties

## Quick Test

### Test Opening Card Display:

1. **Start Backend:**
   ```bash
   npm run dev
   ```

2. **Open Admin Panel:**
   ```
   http://localhost:5000/admin-game
   ```

3. **Select Opening Card:**
   - Click any card (e.g., K♠)
   - Should see "Selected: K♠"

4. **Start Game:**
   - Click "Start Round 1"
   - Should see timer start

5. **Open Player Page:**
   ```
   http://localhost:5000
   ```

6. **Check Center of Betting Strip:**
   - Should see the selected card (K♠)
   - Should NOT see "?"

## Debug Mode

### Enable Console Logging

**In WebSocketContext.tsx, the logging is already enabled:**
```typescript
console.log('Opening card received:', openingCard);
console.log('Setting opening card via setSelectedOpeningCard...');
console.log('Opening card set in state, phase updated to betting');
```

**In BettingStrip.tsx, add temporary logging:**
```tsx
useEffect(() => {
  console.log('🎴 Opening card in BettingStrip:', gameState.selectedOpeningCard);
}, [gameState.selectedOpeningCard]);
```

## Expected Behavior

### When Game Starts:
1. ✅ Admin selects card and starts game
2. ✅ Backend broadcasts `opening_card_confirmed`
3. ✅ All players receive message
4. ✅ Opening card appears in center of betting strip
5. ✅ Card shows correct symbol and suit
6. ✅ Card has glow effect (yellow pulse)
7. ✅ Betting timer starts

### Visual Appearance:
```
┌─────────┬────┬─────────┐
│  ANDAR  │ K♠ │  BAHAR  │
│  (Red)  │ ♠  │ (Blue)  │
└─────────┴────┴─────────┘
```

## Data Structure

### Card Object:
```typescript
interface Card {
  id: string;          // "K♠"
  display: string;     // "K♠"
  value: string;       // "K"
  suit: string;        // "♠"
  color: 'red' | 'black';  // "black"
  rank: string;        // "K"
}
```

### Backend Message:
```json
{
  "type": "opening_card_confirmed",
  "data": {
    "openingCard": {
      "id": "K♠",
      "display": "K♠",
      "value": "K",
      "suit": "♠",
      "color": "black",
      "rank": "K"
    },
    "phase": "betting",
    "round": 1,
    "timer": 30
  }
}
```

## Current Status

The code is correctly implemented. The opening card will display when:
1. ✅ Admin starts a game
2. ✅ WebSocket is connected
3. ✅ Message is received and processed

If you're seeing "?" in the center, it means **no game has been started yet**. This is the expected behavior when the game is in idle state.

## Next Steps

1. **Start a game from admin panel**
2. **Check browser console for WebSocket messages**
3. **Verify opening card appears on player page**
4. **If still not working, check the debug steps above**
