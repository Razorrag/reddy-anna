# Auto-Restart & Game Completion Message

## Features Implemented

### 1. **Detailed Game Completion Message** ✅
Shows winner, payout rules, and betting totals

### 2. **Auto-Restart After 5 Seconds** ✅
Automatically resets to opening card selection

---

## Backend Changes (`server/routes.ts`)

### Enhanced Game Completion Message (Lines 1585-1614)

```typescript
// Determine payout message based on winner and round
let payoutMessage = '';
if (currentGameState.currentRound === 1) {
  if (winner === 'andar') {
    payoutMessage = 'Andar wins! Payout: 1:1 (Double money) 💰';
  } else {
    payoutMessage = 'Bahar wins! Payout: 1:0 (Refund only) 💵';
  }
} else if (currentGameState.currentRound === 2) {
  if (winner === 'andar') {
    payoutMessage = 'Andar wins! Payout: 1:1 on ALL bets (R1+R2) 💰💰';
  } else {
    payoutMessage = 'Bahar wins! R1 bets: 1:1, R2 bets: 1:0 (Refund) 💵';
  }
} else {
  payoutMessage = 'Winner! Payout: 1:1 on ALL bets (Both sides) 💰💰💰';
}

broadcast({
  type: 'game_complete',
  data: {
    winner: currentGameState.winner,
    winningCard: currentGameState.winningCard,
    round: currentGameState.currentRound,
    andarTotal: currentGameState.round1Bets.andar + currentGameState.round2Bets.andar,
    baharTotal: currentGameState.round1Bets.bahar + currentGameState.round2Bets.bahar,
    payoutMessage,
    message: `🎉 Game Complete! ${winner.toUpperCase()} WINS with ${winningCard}!`
  }
});
```

### Auto-Restart Logic (Lines 1632-1673)

```typescript
// Auto-restart: Reset to idle after 5 seconds
console.log('⏰ Auto-restarting game in 5 seconds...');
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
  currentGameState.userBets = new Map();
  currentGameState.bettingLocked = false;
  currentGameState.timer = 0;
  currentGameState.preSelectedBaharCard = null;
  currentGameState.preSelectedAndarCard = null;
  
  // Broadcast reset to all clients
  broadcast({
    type: 'game_reset',
    data: {
      message: '🔄 Game reset. Ready for new game!',
      gameState: {
        gameId: currentGameState.gameId,
        phase: 'idle',
        currentRound: 1,
        timer: 0,
        openingCard: null,
        andarCards: [],
        baharCards: [],
        winner: null,
        winningCard: null
      }
    }
  });
  
  console.log('✅ Game auto-restarted successfully');
}, 5000);
```

---

## Frontend Changes (`client/src/contexts/WebSocketContext.tsx`)

### Game Complete Handler (Lines 267-300)

```typescript
case 'game_complete':
  console.log('🎉 Game complete:', data.data);
  setPhase('complete');
  setWinner(data.data.winner);
  
  // Show detailed completion message
  const completionMessage = `
    ${data.data.message}
    
    ${data.data.payoutMessage}
    
    Round: ${data.data.round}
    Winning Card: ${data.data.winningCard}
    
    Total Bets:
    Andar: ₹${data.data.andarTotal}
    Bahar: ₹${data.data.baharTotal}
    
    Game will restart in 5 seconds...
  `;
  
  showNotification(completionMessage, 'success');
  
  // Trigger confetti or celebration animation
  const celebrationEvent = new CustomEvent('game-complete-celebration', {
    detail: {
      winner: data.data.winner,
      winningCard: data.data.winningCard,
      round: data.data.round,
      payoutMessage: data.data.payoutMessage
    }
  });
  window.dispatchEvent(celebrationEvent);
  break;
```

---

## Game Flow

### Complete Game Cycle

```
1. Admin selects opening card
   ↓
2. Game starts (Round 1 betting)
   ↓
3. Timer counts down
   ↓
4. Cards revealed
   ↓
5. Winner determined
   ↓
6. 🎉 GAME COMPLETE MESSAGE SHOWN
   - Winner announcement
   - Payout rules displayed
   - Total bets shown
   - Winning card displayed
   ↓
7. ⏰ 5 Second Countdown
   ↓
8. 🔄 AUTO-RESTART
   - All state cleared
   - Back to opening card selection
   - Ready for next game
   ↓
9. Repeat from step 1
```

---

## Payout Messages by Round

### Round 1

**Andar Wins**:
```
🎉 Game Complete! ANDAR WINS with 7♠!
Andar wins! Payout: 1:1 (Double money) 💰
```

**Bahar Wins**:
```
🎉 Game Complete! BAHAR WINS with 6♠!
Bahar wins! Payout: 1:0 (Refund only) 💵
```

### Round 2

**Andar Wins**:
```
🎉 Game Complete! ANDAR WINS with 9♥!
Andar wins! Payout: 1:1 on ALL bets (R1+R2) 💰💰
```

**Bahar Wins**:
```
🎉 Game Complete! BAHAR WINS with 4♦!
Bahar wins! R1 bets: 1:1, R2 bets: 1:0 (Refund) 💵
```

### Round 3

**Either Side Wins**:
```
🎉 Game Complete! ANDAR WINS with K♣!
Winner! Payout: 1:1 on ALL bets (Both sides) 💰💰💰
```

---

## Console Logs

### Backend

```
Game complete! Winner: bahar, Card: 6♠, Round: 1
⏰ Auto-restarting game in 5 seconds...
🔄 Auto-restart: Resetting game to idle state
✅ Game auto-restarted successfully
```

### Frontend

```
🎉 Game complete: {winner: 'bahar', winningCard: '6♠', round: 1, ...}
🔄 Game reset received: {message: '🔄 Game reset. Ready for new game!', ...}
```

---

## Notification Display

The notification will show:

```
🎉 Game Complete! BAHAR WINS with 6♠!

Bahar wins! Payout: 1:0 (Refund only) 💵

Round: 1
Winning Card: 6♠

Total Bets:
Andar: ₹0
Bahar: ₹0

Game will restart in 5 seconds...
```

---

## Customization Options

### Change Auto-Restart Delay

In `server/routes.ts` line 1634:
```typescript
setTimeout(() => {
  // ... reset logic
}, 5000); // Change 5000 to desired milliseconds
```

### Disable Auto-Restart

Comment out or remove lines 1632-1673 in `server/routes.ts`

### Add Celebration Animation

Listen for the `game-complete-celebration` event:
```typescript
window.addEventListener('game-complete-celebration', (event) => {
  const { winner, winningCard, payoutMessage } = event.detail;
  // Trigger confetti, animations, sound effects, etc.
});
```

---

## Testing

### Test 1: Round 1 Andar Win
1. Start game with opening card 7♠
2. Pre-select: Bahar=6♥, Andar=7♠
3. Wait for timer
4. **Expected**: "ANDAR WINS! Payout: 1:1 (Double money) 💰"
5. **Expected**: Auto-restart after 5 seconds

### Test 2: Round 1 Bahar Win
1. Start game with opening card 6♠
2. Pre-select: Bahar=6♠, Andar=7♥
3. Wait for timer
4. **Expected**: "BAHAR WINS! Payout: 1:0 (Refund only) 💵"
5. **Expected**: Auto-restart after 5 seconds

### Test 3: Round 2 Transition
1. Start game with no match in Round 1
2. **Expected**: "No winner! Round 2 starting..."
3. Complete Round 2 with winner
4. **Expected**: Correct payout message for Round 2
5. **Expected**: Auto-restart after 5 seconds

---

## Summary

**Features Added**:
- ✅ Detailed game completion message with payout rules
- ✅ Winner announcement with winning card
- ✅ Total bets display
- ✅ Auto-restart after 5 seconds
- ✅ Celebration event trigger
- ✅ Smooth transition back to opening card selection

**Impact**:
- Admin sees clear winner and payout information
- Players know exactly what they won/lost
- Game automatically restarts for continuous play
- No manual reset needed
- Professional live-game experience

**Status**: ✅ **COMPLETE - READY TO TEST**

---

**Date**: October 22, 2025  
**Feature**: Auto-restart and game completion message  
**Priority**: HIGH - User experience enhancement
