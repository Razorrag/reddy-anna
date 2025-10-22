# Opening Card Not Visible - Quick Fix

## TL;DR
**The opening card shows "?" because no game has been started yet.** This is normal behavior.

## To Make Opening Card Visible:

### Step 1: Open Admin Panel
```
http://localhost:5000/admin-game
```
OR
```
http://localhost:5000/game
```

### Step 2: Select Opening Card
- You'll see a grid of all 52 cards
- Click any card (e.g., K♠, A♥, 7♣, etc.)
- The card will be highlighted

### Step 3: Start Round 1
- Click the **"Start Round 1"** button
- Timer will start counting down from 30 seconds
- Opening card will broadcast to all players

### Step 4: Check Player Page
```
http://localhost:5000
```
- The opening card should now appear in the center of the betting strip
- It will show the card symbol and suit
- It will have a yellow glow effect

## Visual Guide

### Before Game Starts (Current State):
```
┌─────────┬────┬─────────┐
│  ANDAR  │ ?  │  BAHAR  │
│  (Red)  │CARD│ (Blue)  │
└─────────┴────┴─────────┘
```

### After Game Starts:
```
┌─────────┬────┬─────────┐
│  ANDAR  │ K♠ │  BAHAR  │
│  (Red)  │ ♠  │ (Blue)  │
└─────────┴────┴─────────┘
     ↑      ↑      ↑
   (glow effect on opening card)
```

## Why "?" Shows

The "?" is a **placeholder** that displays when:
- ✅ Game is in idle state (no game started)
- ✅ No opening card has been selected
- ✅ `gameState.selectedOpeningCard` is `null`

This is **correct behavior** - it's not a bug!

## Verification

### Check Browser Console (F12):
When admin starts game, you should see:
```
✅ WebSocket connected successfully
Opening card received: {id: "K♠", display: "K♠", ...}
Setting opening card via setSelectedOpeningCard...
Opening card set in state, phase updated to betting
```

### Check Backend Logs:
```
Opening card set: K♠
Broadcasting opening_card_confirmed
```

## If Still Not Working

### 1. Check WebSocket Connection
**Player page console should show:**
```
✅ WebSocket connected successfully to: ws://localhost:5000/ws
```

### 2. Refresh Player Page
After admin starts game, refresh the player page to sync state.

### 3. Check Both Servers Running
```bash
# Terminal should show:
[0] serving on http://0.0.0.0:5000  (Backend)
[1] vite dev server running         (Frontend)
```

### 4. Clear Browser Cache
Sometimes cached state can cause issues:
- Press Ctrl+Shift+R (hard refresh)
- Or clear browser cache

## Code is Working Correctly

The opening card display logic is implemented correctly in:
- ✅ `BettingStrip.tsx` - Display component
- ✅ `WebSocketContext.tsx` - Message handler
- ✅ `GameStateContext.tsx` - State management
- ✅ `server/routes.ts` - Backend broadcast

**The "?" is expected behavior when no game is active.**

## Summary

**To see the opening card:**
1. Go to admin panel
2. Select a card
3. Click "Start Round 1"
4. Opening card will appear on player page

That's it! The system is working as designed.
