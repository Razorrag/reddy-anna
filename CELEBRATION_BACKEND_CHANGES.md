# Backend Changes for Celebration + Winnings Fix

## Change 1: Add `winnerDisplay` to `game_complete` Message

**File:** `server/game.ts`  
**Line:** 496-511

### Current Code
```typescript
client.ws.send(JSON.stringify({
  type: 'game_complete',
  data: {
    winner: winningSide,
    winningCard,
    round: actualRound,
    totalBets: totalBetsAmount,
    totalPayouts: totalPayoutsAmount,
    message: `${winningSide.toUpperCase()} wins with ${winningCard}!`,
    userPayout: {
      amount: userPayout,
      totalBet: totalUserBets,
      netProfit
    }
  }
}));
```

### New Code
```typescript
client.ws.send(JSON.stringify({
  type: 'game_complete',
  data: {
    winner: winningSide,
    winningCard,
    round: actualRound,
    totalBets: totalBetsAmount,
    totalPayouts: totalPayoutsAmount,
    message: `${winningSide.toUpperCase()} wins with ${winningCard}!`,
    winnerDisplay, // ✅ ADD THIS LINE
    userPayout: {
      amount: userPayout,
      totalBet: totalUserBets,
      netProfit
    }
  }
}));
```

**Explanation:** The `winnerDisplay` variable is already computed correctly at lines 885-914. We just include it in the message.

---

## Change 2: Add Result Classification (Optional)

**File:** `server/game.ts`  
**Line:** 483-515 (inside per-client loop)

### Add Before Sending Message
```typescript
// Calculate result classification
let result: 'no_bet' | 'refund' | 'mixed' | 'win' | 'loss';
if (totalUserBets === 0) {
  result = 'no_bet';
} else if (userPayout === totalUserBets) {
  result = 'refund';
} else if (userBets) {
  const hasAndar = (userBets.round1.andar + userBets.round2.andar) > 0;
  const hasBahar = (userBets.round1.bahar + userBets.round2.bahar) > 0;
  if (hasAndar && hasBahar) {
    result = 'mixed';
  } else if (netProfit > 0) {
    result = 'win';
  } else {
    result = 'loss';
  }
} else {
  result = netProfit > 0 ? 'win' : 'loss';
}
```

### Update Message
```typescript
userPayout: {
  amount: userPayout,
  totalBet: totalUserBets,
  netProfit,
  result // ✅ ADD THIS
}
```

---

## Change 3: Add Round Validation

**File:** `server/game.ts`  
**Line:** 476 (before game_complete loop)

### Add Validation
```typescript
// Validate round before sending
const actualRound = gameState.currentRound;
if (!actualRound || actualRound < 1 || actualRound > 3) {
  console.error(`❌ CRITICAL: Invalid round: ${actualRound}, defaulting to 1`);
  actualRound = 1;
}
console.log(`🎯 Game complete - Round: ${actualRound}, Winner: ${winningSide}, Display: ${winnerDisplay}`);
```

---

## Summary

**Total Changes:** 3 small additions  
**Lines Modified:** ~15 lines  
**Risk:** Very low (only adding data, not changing logic)  
**Testing:** Verify `winnerDisplay` appears in WebSocket messages
