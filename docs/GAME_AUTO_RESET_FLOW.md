# Game Auto-Reset Flow

## Overview

The game **automatically resets** to the opening card selection phase after a winner is found in ANY round (Round 1, 2, or 3).

---

## 🔄 Auto-Reset Behavior

### When Winner is Found

**In ANY Round (1, 2, or 3)**:
1. Winner is detected (card matches opening card)
2. `completeGame()` function is called
3. Payouts are calculated and credited to winners
4. Game phase changes to `'complete'`
5. Winner celebration shown on all screens
6. **5-second countdown starts**
7. Game automatically resets to `'idle'` phase
8. Opening card selection becomes available again

---

## 📊 Reset Flow by Round

### Round 1 Winner Found
```
Round 1 Betting (30s)
  ↓
Admin Deals Cards (Bahar + Andar)
  ↓
Winner Detected ✅
  ↓
completeGame('andar' or 'bahar', winningCard)
  ↓
Phase: 'complete'
  ↓
Payouts Calculated & Credited
  ↓
Winner Celebration (5 seconds)
  ↓
Auto-Reset: Phase → 'idle'
  ↓
Opening Card Selection Available
```

### Round 2 Winner Found
```
Round 2 Betting (30s)
  ↓
Admin Deals Cards (Bahar + Andar)
  ↓
Winner Detected ✅
  ↓
completeGame('andar' or 'bahar', winningCard)
  ↓
Phase: 'complete'
  ↓
Payouts Calculated & Credited (R1+R2 bets)
  ↓
Winner Celebration (5 seconds)
  ↓
Auto-Reset: Phase → 'idle'
  ↓
Opening Card Selection Available
```

### Round 3 Winner Found
```
Round 3 Continuous Draw (No betting)
  ↓
Admin Deals Cards One by One
  ↓
Winner Detected ✅
  ↓
completeGame('andar' or 'bahar', winningCard)
  ↓
Phase: 'complete'
  ↓
Payouts Calculated & Credited (R1+R2 bets, 1:1 both sides)
  ↓
Winner Celebration (5 seconds)
  ↓
Auto-Reset: Phase → 'idle'
  ↓
Opening Card Selection Available
```

---

## 🔧 Technical Implementation

### Backend Code (server/routes.ts)

#### completeGame Function
```typescript
async function completeGame(winner: 'andar' | 'bahar', winningCard: string) {
  console.log(`Game complete! Winner: ${winner}, Card: ${winningCard}`);
  
  // Set winner
  currentGameState.winner = winner;
  currentGameState.winningCard = winningCard;
  currentGameState.phase = 'complete';
  
  // Calculate and credit payouts
  await calculateAndCreditPayouts(winner);
  
  // Broadcast winner to all clients
  broadcast({
    type: 'game_complete',
    data: {
      winner,
      winningCard,
      round: currentGameState.currentRound,
      payoutMessage: 'Payouts credited!'
    }
  });
  
  // Auto-restart after 5 seconds
  setTimeout(() => {
    console.log('🔄 Auto-restart: Resetting game to idle state');
    
    // Reset game state
    currentGameState.phase = 'idle';
    currentGameState.currentRound = 1;
    currentGameState.openingCard = null;
    currentGameState.andarCards = [];
    currentGameState.baharCards = [];
    currentGameState.winner = null;
    currentGameState.winningCard = null;
    currentGameState.round1Bets = { andar: 0, bahar: 0 };
    currentGameState.round2Bets = { andar: 0, bahar: 0 };
    currentGameState.userBets.clear();
    
    // Broadcast reset
    broadcast({
      type: 'game_reset',
      data: {
        message: '🔄 Game reset. Ready for new game!',
        gameState: {
          phase: 'idle',
          currentRound: 1,
          openingCard: null
        }
      }
    });
  }, 5000); // 5 seconds delay
}
```

---

## 🎯 What Gets Reset

### Game State Reset
- ✅ `phase` → `'idle'`
- ✅ `currentRound` → `1`
- ✅ `openingCard` → `null`
- ✅ `andarCards` → `[]`
- ✅ `baharCards` → `[]`
- ✅ `winner` → `null`
- ✅ `winningCard` → `null`
- ✅ `round1Bets` → `{ andar: 0, bahar: 0 }`
- ✅ `round2Bets` → `{ andar: 0, bahar: 0 }`
- ✅ `userBets` → `cleared`

### What Stays
- ✅ User balances (updated with winnings)
- ✅ Game history (saved to database)
- ✅ User accounts
- ✅ WebSocket connections

---

## 👥 User Experience

### For Players

**After Winner is Found**:
1. See winner celebration animation
2. See payout amount (if they won)
3. Balance updates automatically
4. After 5 seconds, game resets
5. Opening card selection appears
6. Can place bets in new game

### For Admin

**After Winner is Found**:
1. See winner announcement
2. See payout summary
3. After 5 seconds, game resets
4. Opening card selector appears
5. Can select new opening card
6. Start new game immediately

---

## ⏱️ Timing

### Complete Flow Timeline
```
Winner Found (0s)
  ↓
Payouts Credited (0.5s)
  ↓
Winner Celebration Shown (0.5s - 5s)
  ↓
Auto-Reset Triggered (5s)
  ↓
Opening Card Selection Available (5s)
```

### Customizable Delay
The 5-second delay can be adjusted in the code:
```typescript
setTimeout(() => {
  // Reset logic
}, 5000); // Change this value (in milliseconds)
```

**Recommended delays**:
- 3 seconds: Fast-paced games
- 5 seconds: Standard (current)
- 10 seconds: Slower, more time to see results

---

## 🎮 Manual Reset Option

Admins can also manually reset the game at any time:

### Via Admin Panel
1. Click "Reset Game" button
2. Confirm reset
3. Game immediately resets to idle
4. No waiting for auto-reset

### Via WebSocket
```typescript
sendWebSocketMessage({
  type: 'game_reset',
  data: { gameId: currentGameState.gameId }
});
```

---

## 📊 Database Updates

### On Game Complete
1. **Game Session Updated**:
   - Status: 'completed'
   - Winner: 'andar' or 'bahar'
   - Winning card: Card display string
   - Completed at: Timestamp

2. **User Balances Updated**:
   - Winners: Balance increased by payout
   - Losers: No change (already deducted)

3. **Bet Records Updated**:
   - Status: 'won' or 'lost'
   - Payout amount recorded

---

## 🔍 Verification

### How to Test

1. **Start a game**:
   - Select opening card
   - Start Round 1

2. **Test Round 1 Reset**:
   - Deal cards that match opening card
   - Winner found
   - Wait 5 seconds
   - Verify: Opening card selection appears

3. **Test Round 2 Reset**:
   - Play through Round 1 (no winner)
   - Deal cards in Round 2 that match
   - Winner found
   - Wait 5 seconds
   - Verify: Opening card selection appears

4. **Test Round 3 Reset**:
   - Play through Rounds 1 & 2 (no winners)
   - Deal cards in Round 3 until match
   - Winner found
   - Wait 5 seconds
   - Verify: Opening card selection appears

---

## ✅ Current Status

**Implementation**: ✅ **COMPLETE**

The auto-reset functionality is **already implemented** and working:
- ✅ Triggers after winner in Round 1
- ✅ Triggers after winner in Round 2
- ✅ Triggers after winner in Round 3
- ✅ 5-second delay for celebration
- ✅ Complete state reset
- ✅ Opening card selection available
- ✅ Ready for new game

---

## 🎉 Summary

### Auto-Reset Features
✅ Automatic reset after ANY round winner
✅ 5-second celebration period
✅ Complete game state reset
✅ Immediate opening card selection
✅ Seamless game flow
✅ No manual intervention needed

### Benefits
- **For Players**: Continuous gameplay, no waiting
- **For Admin**: Automatic flow, less management
- **For System**: Clean state, no memory leaks

**The game automatically cycles through: Opening Card → Betting → Dealing → Winner → Reset → Opening Card** 🔄
