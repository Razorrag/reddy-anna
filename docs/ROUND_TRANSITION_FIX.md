# Round Transition & UI Fixes

## Issues Fixed

### 1. Duplicate "ROUND 1" Text Display
**Problem:** Two separate round indicators were showing:
- "ROUND 1 Dealing" badge at top-left
- "Round 1 - Dealing" text at top-center

**Root Cause:** `VideoArea.tsx` had two separate components displaying round information:
- Lines 90-97: Dealing animation with "Round X - Dealing" text
- Lines 144-158: Phase indicator badge with "ROUND X"

**Solution:** Removed the duplicate dealing animation text (lines 90-97), keeping only the left-side badge.

**File Modified:** `client/src/components/MobileGameLayout/VideoArea.tsx`

---

### 2. Round Transitions Not Working (Timer at 0, No Round 2)
**Problem:** When Round 1 timer reached 0 with no winner, the game didn't transition to Round 2.

**Root Cause:** The `transitionToRound2()` and `transitionToRound3()` functions in `server/routes.ts` were attempting database operations without error handling. In test mode (with `gameId: 'default-game'`), these operations were failing and throwing errors, preventing the round transitions from completing.

**Solution:** Added error handling to both transition functions:

#### Changes to `transitionToRound2()` (Lines 1108-1163)
```typescript
async function transitionToRound2() {
  console.log('Auto-transitioning to Round 2...');
  
  currentGameState.currentRound = 2;
  currentGameState.phase = 'betting';
  currentGameState.bettingLocked = false;
  
  // Only update database if not in test mode
  if (currentGameState.gameId && currentGameState.gameId !== 'default-game') {
    try {
      await storage.updateGameSession(currentGameState.gameId, {
        phase: 'betting',
        round: 2,
        currentTimer: 30
      });
    } catch (error) {
      console.error('⚠️ Error updating game session for Round 2:', error);
    }
  }
  
  broadcast({
    type: 'start_round_2',
    data: {
      gameId: currentGameState.gameId,
      round: 2,
      timer: 30,
      round1Bets: currentGameState.round1Bets,
      message: 'Round 2 betting started!'
    }
  });
  
  startTimer(30, async () => {
    currentGameState.phase = 'dealing';
    currentGameState.bettingLocked = true;
    
    // Only update database if not in test mode
    if (currentGameState.gameId && currentGameState.gameId !== 'default-game') {
      try {
        await storage.updateGameSession(currentGameState.gameId, {
          phase: 'dealing',
          round: 2
        });
      } catch (error) {
        console.error('⚠️ Error updating game session for Round 2 dealing:', error);
      }
    }
    
    broadcast({
      type: 'phase_change',
      data: { 
        phase: 'dealing', 
        round: 2,
        message: 'Round 2 betting closed. Admin will deal cards.' 
      }
    });
  });
}
```

#### Changes to `transitionToRound3()` (Lines 1166-1196)
```typescript
async function transitionToRound3() {
  console.log('Auto-transitioning to Round 3 (Continuous Draw)...');
  
  currentGameState.currentRound = 3;
  currentGameState.phase = 'dealing';
  currentGameState.bettingLocked = true;
  currentGameState.timer = 0;
  
  // Only update database if not in test mode
  if (currentGameState.gameId && currentGameState.gameId !== 'default-game') {
    try {
      await storage.updateGameSession(currentGameState.gameId, {
        phase: 'dealing',
        round: 3,
        currentTimer: 0
      });
    } catch (error) {
      console.error('⚠️ Error updating game session for Round 3:', error);
    }
  }
  
  broadcast({
    type: 'start_final_draw',
    data: {
      gameId: currentGameState.gameId,
      round: 3,
      round1Bets: currentGameState.round1Bets,
      round2Bets: currentGameState.round2Bets,
      message: 'Round 3: Continuous draw started!'
    }
  });
}
```

**File Modified:** `server/routes.ts`

---

## How Round Transitions Work

### Round 1 → Round 2
1. Admin deals 1 card to Bahar, 1 card to Andar
2. Backend checks for winner after each card
3. If no winner after both cards dealt:
   - `roundComplete` condition triggers (line 548-549)
   - Notification sent to players
   - `setTimeout(() => transitionToRound2(), 2000)` called (line 575)
   - After 2 seconds, Round 2 starts with new 30s betting timer

### Round 2 → Round 3
1. Admin deals 1 more card to Bahar, 1 more card to Andar
2. Backend checks for winner after each card
3. If no winner after both cards dealt:
   - `roundComplete` condition triggers (line 548-549)
   - Notification sent to players
   - `setTimeout(() => transitionToRound3(), 2000)` called (line 577)
   - After 2 seconds, Round 3 starts (continuous draw, no timer)

### Frontend Handlers
The frontend listens for these WebSocket messages:
- `start_round_2`: Updates UI to Round 2, starts 30s timer
- `start_final_draw`: Updates UI to Round 3, sets timer to 0
- `phase_change`: Updates phase (betting/dealing)

**Files:** 
- `client/src/contexts/WebSocketContext.tsx` (lines 289-303)

---

## Testing the Fix

### Test Round 1 → Round 2 Transition
1. Start game with opening card (e.g., 8♦)
2. Start Round 1 betting (30s timer)
3. Wait for timer to reach 0
4. Deal 1 card to Bahar (not matching opening card)
5. Deal 1 card to Andar (not matching opening card)
6. **Expected:** After 2 seconds, see notification "No winner in Round 1. Starting Round 2 in 2 seconds..."
7. **Expected:** Round badge updates to "ROUND 2", new 30s timer starts
8. **Expected:** Both admin and player screens show Round 2

### Test Round 2 → Round 3 Transition
1. Continue from Round 2
2. Wait for timer to reach 0
3. Deal 1 more card to Bahar (not matching)
4. Deal 1 more card to Andar (not matching)
5. **Expected:** After 2 seconds, see notification "No winner in Round 2. Starting Round 3 in 2 seconds..."
6. **Expected:** Round badge updates to "ROUND 3"
7. **Expected:** Timer shows 0 (no countdown in Round 3)
8. **Expected:** Admin can continuously deal cards until match

---

## Benefits

1. **Clean UI**: No duplicate round text
2. **Reliable Transitions**: Works even without database
3. **Test Mode Support**: Full game flow works in development
4. **Better Error Handling**: Database failures don't break game flow
5. **Consistent Experience**: Both admin and players see same round state

---

## Files Modified

1. `client/src/components/MobileGameLayout/VideoArea.tsx`
   - Removed duplicate round text display

2. `server/routes.ts`
   - Added error handling to `transitionToRound2()`
   - Added error handling to `transitionToRound3()`
   - Skip database operations in test mode
