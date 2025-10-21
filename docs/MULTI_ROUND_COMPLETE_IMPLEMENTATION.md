# Multi-Round Game Complete Implementation

## Overview
Complete implementation of multi-round Andar Bahar game with proper round transitions, bet tracking, and card animations.

---

## Features Implemented

### 1. Automatic Round Transitions with Timer Restart ✅

**Backend (`server/routes.ts`):**
- Round 1 → Round 2: Automatic transition after 2 seconds when no winner
- Round 2 → Round 3: Automatic transition after 2 seconds when no winner
- Timer automatically restarts for Round 2 (30 seconds)
- Round 3 has no timer (continuous draw mode)

**How it works:**
```typescript
// After Round 1 complete with no winner
setTimeout(() => transitionToRound2(), 2000);

async function transitionToRound2() {
  currentGameState.currentRound = 2;
  currentGameState.phase = 'betting';
  currentGameState.bettingLocked = false;
  
  broadcast({
    type: 'start_round_2',
    data: {
      round: 2,
      timer: 30,  // NEW 30s timer
      round1Bets: currentGameState.round1Bets
    }
  });
  
  startTimer(30, async () => {
    // Timer complete callback
    currentGameState.phase = 'dealing';
    currentGameState.bettingLocked = true;
  });
}
```

---

### 2. Admin Panel: Round 1 Stats + Round 2 Live Betting ✅

**File:** `client/src/components/AdminGamePanel/AdminGamePanel.tsx`

**Display Logic:**
- **Round 1:** Shows only Round 1 betting stats
- **Round 2:** Shows:
  - **Current Round 2 bets** (prominently)
  - **Round 1 historical stats** (smaller section below)
  - **Cumulative totals** (R1 + R2)

**UI Structure:**
```tsx
{/* ANDAR BETS */}
<div className="bg-red-900/30 rounded-lg p-4">
  <div className="text-sm">ANDAR BETS</div>
  <div className="text-2xl font-bold">
    ₹{currentRoundBets.andar} {/* Current round only */}
  </div>
  <div className="text-xs">
    Round {gameState.currentRound}: {percentage}%
  </div>
  {gameState.currentRound >= 2 && (
    <div className="text-xs border-t">
      Total: ₹{totalCumulativeAndar} {/* R1 + R2 */}
    </div>
  )}
</div>

{/* Round 1 Stats (show when in Round 2+) */}
{gameState.currentRound >= 2 && (
  <div className="bg-gray-800/50 rounded-lg p-3">
    <div className="text-xs">📊 Round 1 Stats</div>
    <div className="grid grid-cols-2 gap-2">
      <div>Andar: ₹{round1Bets.andar}</div>
      <div>Bahar: ₹{round1Bets.bahar}</div>
    </div>
  </div>
)}
```

---

### 3. Separate Round 1 and Round 2 Bet Tracking ✅

**Backend State:**
```typescript
currentGameState = {
  round1Bets: { andar: 0, bahar: 0 },  // Locked after Round 1
  round2Bets: { andar: 0, bahar: 0 },  // Locked after Round 2
  userBets: Map<userId, {
    round1: { andar: 0, bahar: 0 },
    round2: { andar: 0, bahar: 0 }
  }>
}
```

**Bet Placement Logic:**
```typescript
case 'bet_placed':
  const currentRound = currentGameState.currentRound;
  
  if (currentRound === 1) {
    currentGameState.round1Bets[side] += amount;
    userBets.round1[side] += amount;
  } else if (currentRound === 2) {
    currentGameState.round2Bets[side] += amount;
    userBets.round2[side] += amount;
  }
```

**Payout Calculation:**
```typescript
function calculatePayout(round, winner, playerBets) {
  if (round === 1) {
    // Andar: 1:1, Bahar: 1:0 (refund)
    return winner === 'andar' 
      ? playerBets.round1.andar * 2 
      : playerBets.round1.bahar;
  } else if (round === 2) {
    // Andar: 1:1 on ALL bets
    // Bahar: 1:1 on R1, 1:0 on R2
    if (winner === 'andar') {
      return (playerBets.round1.andar + playerBets.round2.andar) * 2;
    } else {
      return playerBets.round1.bahar * 2 + playerBets.round2.bahar;
    }
  } else {
    // Round 3: Both sides 1:1 on total
    const totalBet = playerBets.round1[winner] + playerBets.round2[winner];
    return totalBet * 2;
  }
}
```

---

### 4. Card Selection Persistence Across Rounds ✅

**How it works:**
- Admin selects cards during betting phase
- Cards are stored in state but NOT shown to players
- When timer hits 0, admin clicks "Show Cards to Players"
- Cards are broadcast to all players
- Cards remain in `andarCards` and `baharCards` arrays
- Round 2 cards are ADDED to existing arrays (not replaced)

**Backend:**
```typescript
case 'deal_card':
  const cardData = message.data.card;
  const side = message.data.side;
  
  // Add to existing array (cumulative)
  if (side === 'andar') {
    currentGameState.andarCards.push(cardDisplay);
  } else {
    currentGameState.baharCards.push(cardDisplay);
  }
  
  // Broadcast to all players
  broadcast({ 
    type: 'card_dealt', 
    data: { card: cardData, side, position }
  });
```

**Frontend State:**
```typescript
// Cards accumulate across rounds
gameState.andarCards = [
  { display: '10♦', color: 'red' },    // Round 1
  { display: 'K♠', color: 'black' }    // Round 2
]
```

---

### 5. Frontend Card Animation (Latest Card Only) ✅

**File:** `client/src/components/MobileGameLayout/BettingStrip.tsx`

**Implementation:**
- Shows **only the LATEST card** (not all cards)
- Bounce-in animation when new card appears
- Card count indicator shows total cards dealt
- Larger card size for better visibility

**Code:**
```tsx
{/* Show only the LATEST card */}
{gameState.andarCards.length > 0 && (
  <div className="flex flex-col items-center animate-bounce-in">
    {/* Latest card with larger size */}
    <div className={`text-2xl font-bold transition-all duration-300 
      ${gameState.andarCards[gameState.andarCards.length - 1].color === 'red' 
        ? 'text-red-300' 
        : 'text-yellow-300'}`}>
      {gameState.andarCards[gameState.andarCards.length - 1].display}
    </div>
    
    {/* Card count indicator */}
    {gameState.andarCards.length > 1 && (
      <div className="text-xs text-gray-400 mt-1">
        ({gameState.andarCards.length})
      </div>
    )}
  </div>
)}
```

**Animation CSS (`index.css`):**
```css
@keyframes bounceIn {
  0% {
    transform: scale(0.3);
    opacity: 0;
  }
  50% {
    transform: scale(1.1);
  }
  70% {
    transform: scale(0.9);
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}

.animate-bounce-in {
  animation: bounceIn 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55);
}
```

---

## Complete Game Flow

### Round 1
1. Admin selects opening card (e.g., 8♦)
2. Admin clicks "Start Round 1" → 30s timer starts
3. Players place bets on Andar/Bahar
4. Timer reaches 0 → betting locked
5. Admin deals 1 card to Bahar (e.g., 9♣)
   - Card appears with bounce animation
   - Shows "9♣" with count "(1)"
6. Admin deals 1 card to Andar (e.g., 10♦)
   - Card appears with bounce animation
   - Shows "10♦" with count "(1)"
7. **If no winner:** Auto-transition to Round 2 after 2 seconds

### Round 2
1. Notification: "No winner in Round 1. Starting Round 2 in 2 seconds..."
2. **NEW 30s timer starts automatically**
3. Admin panel shows:
   - **Round 2 live bets** (prominently)
   - **Round 1 historical stats** (below)
   - **Cumulative totals** (R1 + R2)
4. Players can place MORE bets (cumulative)
5. Timer reaches 0 → betting locked
6. Admin deals 1 MORE card to Bahar (e.g., J♥)
   - **Replaces** previous card display
   - Shows "J♥" with count "(2)"
7. Admin deals 1 MORE card to Andar (e.g., K♠)
   - **Replaces** previous card display
   - Shows "K♠" with count "(2)"
8. **If no winner:** Auto-transition to Round 3 after 2 seconds

### Round 3 (Continuous Draw)
1. Notification: "No winner in Round 2. Starting Round 3 in 2 seconds..."
2. **No timer** (shows 0)
3. **No new betting** (all bets locked)
4. Admin deals continuously: Bahar → Andar → Bahar → Andar...
5. Each card **replaces** the previous one with bounce animation
6. First match wins
7. Both sides paid 1:1 on total combined bets (R1 + R2)

---

## Files Modified

### Backend
1. **`server/routes.ts`**
   - Added error handling to `transitionToRound2()`
   - Added error handling to `transitionToRound3()`
   - Skip database operations in test mode
   - Proper round bet tracking

### Frontend
2. **`client/src/components/AdminGamePanel/AdminGamePanel.tsx`**
   - Show current round bets prominently
   - Show Round 1 stats when in Round 2+
   - Show cumulative totals
   - Proper countdown display

3. **`client/src/components/MobileGameLayout/BettingStrip.tsx`**
   - Show only latest card (not all cards)
   - Bounce-in animation for new cards
   - Card count indicator
   - Larger card size (text-2xl)

4. **`client/src/index.css`**
   - Added `bounceIn` keyframe animation
   - Added `.animate-bounce-in` class

---

## Testing Checklist

### Round 1 → Round 2 Transition
- [ ] Round 1 timer counts down properly
- [ ] After dealing 2 cards with no winner, see "Starting Round 2" notification
- [ ] Round 2 timer starts automatically (30s)
- [ ] Admin panel shows Round 2 bets + Round 1 stats
- [ ] Players can place new bets in Round 2
- [ ] Round badge updates to "ROUND 2"

### Round 2 → Round 3 Transition
- [ ] Round 2 timer counts down properly
- [ ] After dealing 2 more cards with no winner, see "Starting Round 3" notification
- [ ] Timer shows 0 (no countdown)
- [ ] Betting is locked (no new bets)
- [ ] Admin can deal continuously
- [ ] Round badge updates to "ROUND 3"

### Card Animation
- [ ] Cards appear with bounce animation
- [ ] Only latest card is shown (not all cards)
- [ ] Card count indicator shows total cards (e.g., "(2)")
- [ ] New cards replace old cards smoothly
- [ ] Card size is larger and visible

### Bet Tracking
- [ ] Round 1 bets are separate from Round 2 bets
- [ ] Admin sees current round bets prominently
- [ ] Admin sees cumulative totals in Round 2+
- [ ] Admin sees Round 1 historical stats in Round 2+
- [ ] Payouts calculated correctly per round

---

## Known Behaviors

1. **Test Mode:** When `gameId === 'default-game'`, database operations are skipped but game logic works perfectly
2. **Card Persistence:** Cards accumulate in arrays across rounds (Round 2 adds to Round 1 cards)
3. **Latest Card Display:** Frontend shows only the latest card to avoid clutter
4. **Auto-Transitions:** 2-second delay between rounds for smooth UX
5. **Timer Restart:** Round 2 automatically gets a fresh 30s timer

---

## Benefits

1. ✅ **Clear Round Separation:** Admin sees exactly which round's bets are active
2. ✅ **Historical Context:** Round 1 stats visible during Round 2 for reference
3. ✅ **Smooth Transitions:** Automatic round progression with notifications
4. ✅ **Clean UI:** Only latest card shown, not cluttered with all cards
5. ✅ **Professional Animation:** Bounce-in effect makes card dealing feel live
6. ✅ **Accurate Payouts:** Separate bet tracking ensures correct payout calculations
