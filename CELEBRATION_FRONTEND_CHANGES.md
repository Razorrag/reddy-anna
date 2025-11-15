# Frontend Changes for Celebration + Winnings Fix

## Change 1: Update CelebrationData Interface

**File:** `client/src/components/MobileGameLayout/GlobalWinnerCelebration.tsx`  
**Line:** 17-30

### Add winnerDisplay Field
```typescript
interface CelebrationData {
  winner: 'andar' | 'bahar';
  winningCard: any;
  round: number;
  winnerDisplay?: string; // ✅ ADD THIS
  payoutAmount: number;
  totalBetAmount: number;
  netProfit: number;
  playerBets?: {
    round1: { andar: number; bahar: number };
    round2: { andar: number; bahar: number };
  };
  result: 'no_bet' | 'refund' | 'mixed' | 'win' | 'loss';
  dataSource?: 'game_complete_direct' | 'payout_received_websocket' | 'local_calculation' | 'none';
}
```

---

## Change 2: Use Server's winnerDisplay

**File:** `client/src/components/MobileGameLayout/GlobalWinnerCelebration.tsx`  
**Line:** 113-121

### Current Code
```typescript
const getWinnerText = () => {
  if (data.winner === 'andar') {
    return 'ANDAR WON';
  } else {
    return data.round >= 3 ? 'BAHAR WON' : 'BABA WON';
  }
};
```

### New Code
```typescript
const getWinnerText = () => {
  // Prefer server's winner text
  if (data.winnerDisplay) {
    return data.winnerDisplay;
  }
  
  // Fallback to local calculation
  console.warn('⚠️ winnerDisplay missing, computing locally');
  if (data.winner === 'andar') {
    return 'ANDAR WON';
  } else {
    return data.round >= 3 ? 'BAHAR WON' : 'BABA WON';
  }
};
```

---

## Change 3: Simplify game_complete Handler

**File:** `client/src/contexts/WebSocketContext.tsx`  
**Line:** 821-912 (payout resolution section)

### Key Changes
1. Remove REST API fallback (line 857-884)
2. Add consistency check between sources
3. Pass winnerDisplay to celebration event

### Simplified Payout Resolution
```typescript
// Primary: Use game_complete.userPayout
if (userPayout && typeof userPayout.amount === 'number') {
  payoutAmount = userPayout.amount || 0;
  totalBetAmount = userPayout.totalBet || 0;
  netProfit = userPayout.netProfit ?? (payoutAmount - totalBetAmount);
  result = userPayout.result || (totalBetAmount === 0 ? 'no_bet' : netProfit > 0 ? 'win' : 'loss');
  dataSource = 'game_complete_direct';
} else {
  // Backup: Use payout_received
  const hasRecentPayout =
    lastPayoutRef.current &&
    (Date.now() - lastPayoutRef.current.timestamp < 10000) &&
    lastPayoutRef.current.winner === winner;

  if (hasRecentPayout) {
    payoutAmount = lastPayoutRef.current!.amount;
    totalBetAmount = lastPayoutRef.current!.totalBetAmount;
    netProfit = lastPayoutRef.current!.netProfit;
    result = lastPayoutRef.current!.result || 'no_bet';
    dataSource = 'payout_received_websocket';
  } else {
    // Last resort: Local calculation
    // ... existing local calculation code ...
  }
}

// Consistency check
if (lastPayoutRef.current && dataSource === 'game_complete_direct') {
  const diff = Math.abs(payoutAmount - lastPayoutRef.current.amount);
  if (diff > 0.01) {
    console.warn('⚠️ MISMATCH:', {
      gameComplete: payoutAmount,
      payoutReceived: lastPayoutRef.current.amount,
      difference: diff
    });
  }
}
```

### Update Celebration Event
```typescript
const celebrationData = {
  winner,
  winningCard,
  round: round || gameState.currentRound,
  winnerDisplay, // ✅ ADD THIS
  payoutAmount,
  totalBetAmount,
  netProfit,
  playerBets,
  result,
  dataSource
};
```

---

## Change 4: Enhanced Logging

**File:** `client/src/components/MobileGameLayout/GlobalWinnerCelebration.tsx`  
**Line:** 49-79

### Add Winner Display Source Logging
```typescript
console.group('🎉 GlobalWinnerCelebration: Game Complete');
console.log('📊 Data:', {
  winner: detail.winner,
  round: detail.round,
  winnerDisplay: detail.winnerDisplay || 'not provided', // ✅ ADD
  dataSource: detail.dataSource
});

if (detail.winnerDisplay) {
  console.log('✅ WINNER TEXT: Server (Authoritative)');
} else {
  console.warn('⚠️ WINNER TEXT: Client Fallback');
}

if (detail.dataSource === 'game_complete_direct') {
  console.log('✅ PAYOUT: Server (Authoritative)');
} else if (detail.dataSource === 'local_calculation') {
  console.error('❌ PAYOUT: Local Fallback');
}
console.groupEnd();
```

---

## Summary

**Total Changes:** 4 modifications  
**Files Changed:** 2 files  
**Lines Modified:** ~50 lines  
**Risk:** Low (mostly simplification + new field)  
**Testing:** Verify celebration shows correct winner text for all rounds
