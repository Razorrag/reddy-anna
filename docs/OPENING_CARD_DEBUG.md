# Opening Card Not Showing - Debug Guide

## Issue
Opening card is not displaying in the frontend after starting the game.

## Possible Causes

### 1. WebSocket Message Not Received
**Check**: Open browser console and look for:
```
Opening card received: {id: '6♦', display: '6♦', ...}
Setting opening card via setSelectedOpeningCard...
Opening card set in state, phase updated to betting
```

**If missing**: WebSocket connection issue or backend not broadcasting

### 2. State Not Updating
**Check**: In browser console, type:
```javascript
// Check if opening card is in state
window.__REACT_DEVTOOLS_GLOBAL_HOOK__
```

Or add a console.log in the component that displays the opening card.

### 3. Component Not Rendering
**Check**: The opening card should display in:
- `PersistentSidePanel.tsx` - Shows `{gameState.selectedOpeningCard?.display || '--'}`
- `MobileGameLayout/BettingStrip.tsx` - Shows opening card in mobile view
- `GameAdmin/GameAdmin.tsx` - Shows in admin panel

### 4. CSS/Display Issue
**Check**: Element might be hidden by CSS or z-index issues

## Quick Fix Steps

### Step 1: Check Backend Logs
Look for:
```
✅ Game session created with ID: ...
```

Then after admin clicks "Start Round 1":
```
Broadcasting: opening_card_confirmed
```

### Step 2: Check Frontend Console
Should see:
```
Opening card received: {id: '6♦', display: '6♦', value: '6', suit: '♦', color: 'red', rank: '6'}
Setting opening card via setSelectedOpeningCard...
Opening card set in state, phase updated to betting
```

### Step 3: Check Component Rendering
In `AdminGamePanel.tsx` or wherever the opening card should display, verify:
```typescript
{gameState.selectedOpeningCard && (
  <div>Opening Card: {gameState.selectedOpeningCard.display}</div>
)}
```

### Step 4: Verify Phase
The opening card only shows when `phase === 'betting'` or later.
Check: `console.log('Current phase:', gameState.phase)`

## Manual Test

1. Open browser console
2. Start a game
3. Check for these logs in order:
   ```
   [Backend] Received WebSocket message: game_start
   [Backend] ✅ Game session created with ID: ...
   [Frontend] Opening card received: ...
   [Frontend] Setting opening card via setSelectedOpeningCard...
   [Frontend] Opening card set in state, phase updated to betting
   ```

4. If all logs appear but card doesn't show:
   - Check if the component is mounted
   - Check if CSS is hiding it
   - Check React DevTools for state

## Common Issues

### Issue: Card Shows in Console But Not UI
**Solution**: Component might not be re-rendering. Check if you're using the correct context hook:
```typescript
const { gameState } = useGameState(); // ✅ Correct
// NOT: const gameState = useContext(GameStateContext) // ❌ Wrong
```

### Issue: Card Shows Then Disappears
**Solution**: Something is clearing the state. Check for:
- `CLEAR_CARDS` action being dispatched
- `RESET_GAME` action being dispatched
- Component unmounting/remounting

### Issue: Card Shows in Admin But Not Player View
**Solution**: Different components use different state. Ensure both use the same `GameStateContext`.

## Files to Check

1. **Backend**: `server/routes.ts` line 334-350 (opening_card_confirmed broadcast)
2. **Frontend WebSocket**: `client/src/contexts/WebSocketContext.tsx` line 215-230
3. **Frontend State**: `client/src/contexts/GameStateContext.tsx` line 124 (SET_OPENING_CARD)
4. **Display Components**:
   - `client/src/components/PersistentSidePanel.tsx` line 92
   - `client/src/components/MobileGameLayout/BettingStrip.tsx` line 131
   - `client/src/components/GameAdmin/GameAdmin.tsx` line 142

## Quick Diagnostic Command

Run in browser console:
```javascript
// Check if opening card is in state
console.log('Opening card:', window.gameState?.selectedOpeningCard);

// Force re-render (if using React DevTools)
// Find GameStateProvider component and force update
```

## If Still Not Working

1. **Clear browser cache** and hard refresh (Ctrl+Shift+R)
2. **Restart both servers**: `npm run dev:both`
3. **Check for TypeScript errors**: Look for red squiggly lines in IDE
4. **Verify WebSocket connection**: Should see "✅ WebSocket connected successfully"

## Expected Flow

```
Admin selects card (e.g., 6♦)
  ↓
Admin clicks "Start Round 1"
  ↓
Frontend sends: game_start { openingCard: '6♦', timer: 30 }
  ↓
Backend receives and creates game session
  ↓
Backend broadcasts: opening_card_confirmed { openingCard: {...}, phase: 'betting', round: 1, timer: 30 }
  ↓
Frontend receives message
  ↓
Frontend calls: setSelectedOpeningCard(openingCard)
  ↓
Frontend calls: setPhase('betting')
  ↓
Components re-render with new state
  ↓
Opening card displays in UI ✅
```

---

**Next Steps**: 
1. Start a game
2. Check browser console for the logs mentioned above
3. Share the console output if card still doesn't show
