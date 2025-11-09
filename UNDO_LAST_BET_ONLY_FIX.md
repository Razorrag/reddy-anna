# ✅ UNDO LAST BET ONLY - IMPLEMENTATION COMPLETE

## **Problem**
Previously, clicking "Undo" would cancel **ALL bets** for the current round. If a user bet ₹10,000 four times (total ₹40,000), clicking undo would refund all ₹40,000.

## **Solution**
Changed undo logic to cancel **ONLY the most recent bet**. Now if user bets ₹10,000 four times, clicking undo will refund only the last ₹10,000.

---

## **Changes Made**

### **1. Server-Side (`server/routes.ts` lines 4833-4950)**

#### **Before:**
```typescript
// Got ALL active bets for current round
const activeBets = allUserBets.filter(bet => 
  bet.status === 'pending' && betRoundNum === currentRound
);

// Cancelled ALL bets
for (const bet of activeBets) {
  await storage.updateBetDetails(bet.id, { status: 'cancelled' });
}

// Refunded total amount
const totalRefundAmount = activeBets.reduce((sum, bet) => sum + amount, 0);
await storage.addBalanceAtomic(userId, totalRefundAmount);
```

#### **After:**
```typescript
// Get active bets and sort by timestamp (most recent first)
activeBets.sort((a, b) => {
  const aTime = new Date(a.created_at || a.createdAt || 0).getTime();
  const bTime = new Date(b.created_at || b.createdAt || 0).getTime();
  return bTime - aTime; // Most recent first
});

// Take ONLY the first (most recent) bet
const lastBet = activeBets[0];
const betAmount = parseFloat(lastBet.amount);
const betSide = lastBet.side as 'andar' | 'bahar';
const betRound = parseInt(lastBet.round);

// Cancel ONLY this bet
await storage.updateBetDetails(lastBet.id, { status: 'cancelled' });

// Refund ONLY this amount
const newBalance = await storage.addBalanceAtomic(userId, betAmount);
```

#### **State Update:**
```typescript
// Subtract ONLY the cancelled bet amount from game state
if (betRound === 1) {
  userBetsState.round1[betSide] -= betAmount;
  currentGameState.round1Bets[betSide] -= betAmount;
} else {
  userBetsState.round2[betSide] -= betAmount;
  currentGameState.round2Bets[betSide] -= betAmount;
}
```

---

### **2. Client-Side (`client/src/pages/player-game.tsx` lines 288-302)**

#### **Before:**
```typescript
// Cleared ALL bets for the round
clearRoundBets(round as 1 | 2);

showNotification(
  `Round ${round} bets cancelled. ₹${refundedAmount} refunded.`,
  'success'
);
```

#### **After:**
```typescript
// Remove ONLY the last bet (uses existing removeLastBet function)
if (side) {
  removeLastBet(round as 1 | 2, side as 'andar' | 'bahar');
}

showNotification(
  `Last bet cancelled: ₹${refundedAmount} on ${side?.toUpperCase()} refunded.`,
  'success'
);
```

---

### **3. WebSocket Handler (`client/src/contexts/WebSocketContext.tsx` lines 533-536)**

#### **Before:**
```typescript
// Cleared all bets for the round
if (data.data.round) {
  clearRoundBets(data.data.round as 1 | 2);
}
```

#### **After:**
```typescript
// Remove only the last bet
if (data.data.round && data.data.side) {
  removeLastBet(data.data.round as 1 | 2, data.data.side as 'andar' | 'bahar');
}
```

---

## **How It Works**

### **User Flow:**
1. User bets ₹10,000 on Andar (Bet #1)
2. User bets ₹10,000 on Andar (Bet #2)
3. User bets ₹10,000 on Andar (Bet #3)
4. User bets ₹10,000 on Bahar (Bet #4)
5. **User clicks UNDO**

### **What Happens:**
- Server finds all 4 active bets
- Sorts by `created_at` timestamp (descending)
- Takes ONLY Bet #4 (most recent - ₹10,000 on Bahar)
- Cancels Bet #4 in database
- Refunds ₹10,000 to user
- Updates game state: subtracts ₹10,000 from Bahar total
- Broadcasts to admin: instant update showing ₹10,000 removed from Bahar
- Client removes last bet chip from UI

### **Result:**
- User now has 3 bets remaining: ₹30,000 on Andar, ₹0 on Bahar
- Balance increased by ₹10,000
- Admin dashboard instantly shows updated totals

---

## **Admin Dashboard Updates**

### **Instant Real-Time Updates:**
The admin dashboard receives instant updates via WebSocket broadcast:

```typescript
broadcastToRole({
  type: 'admin_bet_update',
  data: {
    action: 'undo',
    round: betRound,
    side: betSide,
    amount: betAmount,
    round1Bets: currentGameState.round1Bets,
    round2Bets: currentGameState.round2Bets,
    totalAndar,
    totalBahar
  }
}, 'admin');
```

**Components that auto-update:**
- ✅ `AdminGamePanelSimplified.tsx` - Main game panel
- ✅ `PersistentSidePanel.tsx` - Side panel with bet totals
- ✅ `LiveBetMonitoring.tsx` - Live bet monitoring

**No delay** - updates happen instantly when user clicks undo.

---

## **Example Scenario**

### **Before Fix:**
```
User bets:
- Round 1 Andar: ₹10,000 (Bet #1)
- Round 1 Andar: ₹10,000 (Bet #2)
- Round 1 Andar: ₹10,000 (Bet #3)
- Round 1 Bahar: ₹10,000 (Bet #4)

Total: ₹40,000 deducted from balance

User clicks UNDO → ALL ₹40,000 refunded
Result: 0 bets remaining
```

### **After Fix:**
```
User bets:
- Round 1 Andar: ₹10,000 (Bet #1) - timestamp: 14:00:01
- Round 1 Andar: ₹10,000 (Bet #2) - timestamp: 14:00:03
- Round 1 Andar: ₹10,000 (Bet #3) - timestamp: 14:00:05
- Round 1 Bahar: ₹10,000 (Bet #4) - timestamp: 14:00:07 ← MOST RECENT

Total: ₹40,000 deducted from balance

User clicks UNDO → ONLY ₹10,000 refunded (Bet #4)
Result: 3 bets remaining (₹30,000 on Andar)

User clicks UNDO again → ₹10,000 refunded (Bet #3)
Result: 2 bets remaining (₹20,000 on Andar)
```

---

## **Security & Validation**

### **Timestamp-Based Ordering:**
- Uses `created_at` field from database
- Ensures correct chronological order
- Prevents manipulation

### **State Validation:**
```typescript
// Verify bet exists in game state before refunding
if (stateAmount < betAmount - 0.01) {
  return 400 "Bet amount mismatch. Please refresh."
}
```

### **Rate Limiting:**
- Max 3 undo requests per minute per user
- Prevents abuse

---

## **Testing Checklist**

- [x] User bets multiple times on same side → Undo removes last bet only
- [x] User bets on both sides → Undo removes most recent (regardless of side)
- [x] Admin dashboard updates instantly (no delay)
- [x] Balance updates correctly
- [x] Game state totals update correctly
- [x] Multiple undos work in sequence (LIFO - Last In First Out)
- [x] Rate limiting prevents spam
- [x] Phase validation prevents undo after betting closes

---

## **Files Modified**

1. **`server/routes.ts`** (lines 4833-4950)
   - Changed from "cancel all" to "cancel last only"
   - Added timestamp sorting
   - Updated broadcast data to include side

2. **`client/src/pages/player-game.tsx`** (lines 277-302)
   - Changed from `clearRoundBets()` to `removeLastBet()`
   - Updated notification message
   - Added `side` field to TypeScript interface

3. **`client/src/contexts/WebSocketContext.tsx`** (lines 533-536)
   - Changed from `clearRoundBets()` to `removeLastBet()`
   - Uses side from server response

---

## **Status: ✅ PRODUCTION READY**

All changes implemented and tested. Admin dashboard updates instantly with zero delay.
