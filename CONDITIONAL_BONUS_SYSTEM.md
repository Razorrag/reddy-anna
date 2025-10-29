# Conditional Bonus System - Auto-Apply Feature

## Overview

The conditional bonus system automatically applies available bonus money to the user's main balance when their balance reaches a specific threshold (±30% by default) from their original deposit amount.

---

## How It Works

### Concept
```
User deposits ₹10,000 (original deposit)
  ↓
Gets 5% bonus = ₹500 (stored separately)
  ↓
User plays and balance changes
  ↓
When balance reaches ₹13,000 (+30%) OR ₹7,000 (-30%)
  ↓
Bonus automatically added to main balance!
```

### Threshold Calculation
```typescript
originalDeposit = ₹10,000
currentBalance = ₹13,500
percentageChange = ((13,500 - 10,000) / 10,000) * 100 = +35%

threshold = 30%
if (Math.abs(percentageChange) >= threshold) {
  // Auto-apply bonus!
}
```

---

## Implementation Details

### 1. Original Deposit Tracking

**When Set:**
- First deposit by user
- Stored in `original_deposit_amount` field

**Code Location:** `server/payment.ts` (lines 119, 139, 157, 176)
```typescript
await storage.updateUserOriginalDeposit(userId, amount);
```

### 2. Conditional Bonus Check

**Trigger Points:**
1. **After Bet Placement** (routes.ts:859-868)
2. **After Game Completion** (routes.ts:3662-3683)

**Logic:** `server/storage-supabase.ts` (lines 2096-2170)

```typescript
async applyConditionalBonus(userId: string): Promise<boolean> {
  // 1. Get user data
  // 2. Get threshold setting (default 30%)
  // 3. Calculate percentage change from original deposit
  // 4. Check if threshold reached (±30%)
  // 5. If yes, auto-apply bonus to main balance
  // 6. Reset bonus fields
  // 7. Log transaction
}
```

### 3. Auto-Application Flow

```
Balance Change Event
  ↓
Check: |currentBalance - originalDeposit| / originalDeposit >= 30%
  ↓
YES → Get available bonus
  ↓
bonus > 0 → Apply to main balance
  ↓
Send WebSocket notification
  ↓
Log transaction
```

---

## Configuration

### Threshold Setting
**Location:** Backend Settings (`/backend-settings`)
**Field:** `conditional_bonus_threshold`
**Default:** 30%
**Range:** 0-100%

**Database:** `game_settings` table
```sql
setting_key: 'conditional_bonus_threshold'
setting_value: '30'
```

---

## Examples

### Example 1: User Wins Big (+30%)
```
Original Deposit: ₹10,000
Bonus Available: ₹500
Threshold: 30%

User plays and wins:
Balance: ₹10,000 → ₹13,000 (+30%)
✅ Threshold reached!
Bonus ₹500 auto-applied
New Balance: ₹13,500
```

### Example 2: User Loses (-30%)
```
Original Deposit: ₹10,000
Bonus Available: ₹500
Threshold: 30%

User plays and loses:
Balance: ₹10,000 → ₹7,000 (-30%)
✅ Threshold reached!
Bonus ₹500 auto-applied
New Balance: ₹7,500
```

### Example 3: Threshold Not Reached
```
Original Deposit: ₹10,000
Bonus Available: ₹500
Threshold: 30%

User plays:
Balance: ₹10,000 → ₹11,500 (+15%)
❌ Threshold not reached
Bonus remains in holding
Balance: ₹11,500
```

---

## Database Fields

### User Table
```sql
original_deposit_amount: decimal(15, 2)  -- First deposit amount
deposit_bonus_available: decimal(15, 2)  -- Bonus waiting to be applied
referral_bonus_available: decimal(15, 2) -- Referral bonus waiting
balance: decimal(15, 2)                  -- Main playable balance
```

### Transactions Table
```sql
transaction_type: 'conditional_bonus_applied'
description: 'Conditional bonus auto-applied (+35.0% from original deposit)'
```

---

## User Notifications

### WebSocket Event
```json
{
  "type": "conditional_bonus_applied",
  "data": {
    "message": "Bonus automatically added to your balance!",
    "timestamp": 1234567890
  }
}
```

### Console Logs
```
✅ Conditional bonus threshold reached! Auto-applying ₹500 for user abc123
Conditional bonus check for user abc123: {
  originalDeposit: 10000,
  currentBalance: 13000,
  percentageChange: '+30.00%',
  threshold: '±30%'
}
✅ Conditional bonus of ₹500 applied to user abc123
```

---

## Benefits

### For Users
1. **Automatic Reward** - No need to manually claim
2. **Timely Boost** - Bonus applied when most needed
3. **Win More** - Bonus added when winning streak
4. **Recover Faster** - Bonus added when losing to help recover

### For Platform
1. **Increased Engagement** - Users play more knowing bonus will auto-apply
2. **Reduced Support** - No manual claim process
3. **Fair System** - Applies equally to winners and losers
4. **Transparent** - Clear threshold rules

---

## Edge Cases Handled

### 1. No Original Deposit
```
if (originalDeposit === 0) {
  return false; // Skip check
}
```

### 2. No Bonus Available
```
if (bonusInfo.totalBonus === 0) {
  return false; // Nothing to apply
}
```

### 3. Threshold Not Reached
```
if (Math.abs(percentageChange) < threshold) {
  return false; // Wait for threshold
}
```

### 4. Multiple Checks
- Check runs after every balance change
- Only applies once (bonus reset to 0 after application)
- Safe to call multiple times

---

## Testing Scenarios

### Scenario 1: Win Streak
```
1. User deposits ₹10,000
2. Bonus: ₹500 available
3. User wins multiple games
4. Balance reaches ₹13,000
5. ✅ Bonus auto-applied
6. Balance: ₹13,500
```

### Scenario 2: Lose Streak
```
1. User deposits ₹10,000
2. Bonus: ₹500 available
3. User loses multiple games
4. Balance drops to ₹7,000
5. ✅ Bonus auto-applied
6. Balance: ₹7,500 (helps recovery!)
```

### Scenario 3: Fluctuating Balance
```
1. User deposits ₹10,000
2. Bonus: ₹500 available
3. Balance: ₹11,000 (+10%) - No apply
4. Balance: ₹12,000 (+20%) - No apply
5. Balance: ₹13,100 (+31%) - ✅ Apply!
6. Balance: ₹13,600
```

---

## Integration Points

### 1. Bet Placement (routes.ts:859-868)
```typescript
await storage.updateUserBalance(client.userId, -betAmount);
await storage.applyConditionalBonus(client.userId);
```

### 2. Game Completion (routes.ts:3662-3683)
```typescript
await storage.updateUserGameStats(userId, userWon, userTotalBet, payout);
await storage.applyConditionalBonus(userId);
```

### 3. Deposit (payment.ts:119, 139, 157, 176)
```typescript
await storage.updateUserOriginalDeposit(userId, amount);
```

---

## Performance Considerations

### Optimization
- Check only runs when balance changes
- Early returns for edge cases
- No database locks
- Async operation (doesn't block game flow)

### Error Handling
- Wrapped in try-catch
- Failures don't break bet/payout
- Logged for debugging
- Graceful degradation

---

## Future Enhancements

1. **Multiple Thresholds** - Different bonuses at 20%, 30%, 50%
2. **Time-Based** - Bonus expires after X days
3. **Tier System** - Higher deposits get better thresholds
4. **Notification UI** - Show popup when bonus applied
5. **History** - Track all conditional bonus applications
6. **Analytics** - Dashboard showing threshold hits

---

## Status: ✅ PRODUCTION READY

The conditional bonus system is fully implemented and automatically applies bonuses when users reach the ±30% threshold from their original deposit!

**Key Features:**
- ✅ Auto-applies on threshold
- ✅ Works for wins and losses
- ✅ Configurable threshold
- ✅ WebSocket notifications
- ✅ Transaction logging
- ✅ Error handling
- ✅ Performance optimized
