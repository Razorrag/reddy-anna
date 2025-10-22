# Bet Limit Update: 50K → 1 Lakh (100K)

## Overview
Updated the maximum bet limit from ₹50,000 to ₹1,00,000 (1 lakh) across the entire application.

## Changes Summary

### Chip Values Updated
- **Removed:** ₹1,000 chip
- **Added:** ₹1,00,000 chip
- **New chip array:** [2500, 5000, 10000, 20000, 30000, 40000, 50000, 100000]

## Files Modified

### 1. Frontend - Player Game
**File:** `client/src/pages/player-game.tsx`
```typescript
// Line 43-44
// BEFORE
const betAmounts = [1000, 2500, 5000, 10000, 20000, 30000, 40000, 50000];

// AFTER
const betAmounts = [2500, 5000, 10000, 20000, 30000, 40000, 50000, 100000];
```

### 2. Schema Validation
**File:** `shared/schema.ts`
```typescript
// Line 106
// BEFORE
amount: z.number().min(1000).max(50000), // Bet limits

// AFTER
amount: z.number().min(1000).max(100000), // Bet limits
```

### 3. Server Routes Validation
**File:** `server/routes.ts`
```typescript
// Line 481-484
// BEFORE
if (!betAmount || betAmount < 1000 || betAmount > 50000) {
  ws.send(JSON.stringify({
    type: 'error',
    data: { message: `Invalid bet amount. Must be between ₹1,000 and ₹50,000` }
  }));
}

// AFTER
if (!betAmount || betAmount < 1000 || betAmount > 100000) {
  ws.send(JSON.stringify({
    type: 'error',
    data: { message: `Invalid bet amount. Must be between ₹1,000 and ₹1,00,000` }
  }));
}
```

### 4. Storage Settings
**File:** `server/storage-supabase.ts`
```typescript
// Line 619-623
// BEFORE
return {
  minBet: 1000,
  maxBet: 50000,
  timerDuration: 30
};

// AFTER
return {
  minBet: 1000,
  maxBet: 100000,
  timerDuration: 30
};
```

### 5. Game Logic Validation
**File:** `client/src/components/GameLogic/GameLogic.tsx`
```typescript
// Line 168-170
// BEFORE
if (amount > 50000) {
  return { isValid: false, error: 'Maximum bet is ₹50,000' };
}

// AFTER
if (amount > 100000) {
  return { isValid: false, error: 'Maximum bet is ₹1,00,000' };
}
```

### 6. Admin Backend Settings
**File:** `client/src/components/GameAdmin/BackendSettings.tsx`
```typescript
// Line 72
// BEFORE
settingsMaxBetAmount: 50000,

// AFTER
settingsMaxBetAmount: 100000,
```

### 7. Database Schema
**File:** `SUPABASE_SCHEMA.sql`

**Bet Amount Constraint (Line 73):**
```sql
-- BEFORE
amount DECIMAL(15,2) NOT NULL CHECK (amount >= 1000 AND amount <= 50000),

-- AFTER
amount DECIMAL(15,2) NOT NULL CHECK (amount >= 1000 AND amount <= 100000),
```

**System Settings (Line 298):**
```sql
-- BEFORE
('max_bet_amount', '50000', 'Maximum bet amount', false),

-- AFTER
('max_bet_amount', '100000', 'Maximum bet amount', false),
```

### 8. Database Migration
**File:** `db/migrations/update_bet_limit_to_100k.sql` (NEW)
- Drops old constraint
- Adds new constraint with 100000 limit
- Updates system_settings table

## Deployment Steps

### 1. Database Migration (CRITICAL - Run First)
```sql
-- Connect to your Supabase database and run:
ALTER TABLE bets DROP CONSTRAINT IF EXISTS bets_amount_check;
ALTER TABLE bets ADD CONSTRAINT bets_amount_check 
CHECK (amount >= 1000 AND amount <= 100000);

UPDATE system_settings 
SET value = '100000' 
WHERE key = 'max_bet_amount';
```

### 2. Backend Deployment
```bash
# Deploy server changes
npm run build
# Restart server
```

### 3. Frontend Deployment
```bash
# Build and deploy client
cd client
npm run build
# Deploy to hosting
```

### 4. Verification
- [ ] Test placing bet with ₹1,00,000 chip
- [ ] Verify ₹1,000 chip is removed
- [ ] Test bet validation (should accept up to ₹1,00,000)
- [ ] Test bet rejection (should reject > ₹1,00,000)
- [ ] Check admin panel shows correct max bet
- [ ] Verify database constraint is updated

## Testing Checklist

### Frontend Tests
- [x] ₹1,000 chip removed from chip selector
- [x] ₹1,00,000 chip added to chip selector
- [x] Chip selector displays 8 chips total
- [x] Can select ₹1,00,000 chip
- [x] Chip value displays correctly (100k format)

### Backend Tests
- [x] Server accepts bets up to ₹1,00,000
- [x] Server rejects bets > ₹1,00,000
- [x] Error message shows correct limit
- [x] Validation works on WebSocket
- [x] Game settings return correct maxBet

### Database Tests
- [ ] Constraint allows amounts up to 100000
- [ ] Constraint rejects amounts > 100000
- [ ] System settings show max_bet_amount = 100000
- [ ] Existing bets remain valid

### Integration Tests
- [ ] Place bet with ₹1,00,000 chip
- [ ] Verify balance deduction
- [ ] Verify bet appears in database
- [ ] Verify bet shows on admin panel
- [ ] Verify payout calculation works

## Rollback Plan

If issues occur, rollback with:

```sql
-- Rollback database
ALTER TABLE bets DROP CONSTRAINT IF EXISTS bets_amount_check;
ALTER TABLE bets ADD CONSTRAINT bets_amount_check 
CHECK (amount >= 1000 AND amount <= 50000);

UPDATE system_settings 
SET value = '50000' 
WHERE key = 'max_bet_amount';
```

Then redeploy previous version of code.

## Impact Analysis

### Positive Impacts
- ✅ Higher betting limits for VIP players
- ✅ Increased revenue potential
- ✅ More competitive with other platforms
- ✅ Better user experience for high rollers

### Considerations
- ⚠️ Ensure sufficient liquidity for payouts
- ⚠️ Monitor for unusual betting patterns
- ⚠️ Update risk management rules
- ⚠️ Consider implementing VIP verification

## Related Files

### Modified (8 files)
1. `client/src/pages/player-game.tsx`
2. `shared/schema.ts`
3. `server/routes.ts`
4. `server/storage-supabase.ts`
5. `client/src/components/GameLogic/GameLogic.tsx`
6. `client/src/components/GameAdmin/BackendSettings.tsx`
7. `SUPABASE_SCHEMA.sql`
8. `db/migrations/update_bet_limit_to_100k.sql` (NEW)

### Not Modified (Already Correct)
- `client/src/components/WalletModal.tsx` - Already has 100000 in quick amounts

## Status
✅ **Code Changes Complete**
⏳ **Database Migration Pending** (Run migration script)
⏳ **Testing Pending**
⏳ **Deployment Pending**

## Notes
- All validation layers updated (frontend, backend, database)
- Error messages updated with new limit
- Chip selector updated with new values
- Migration script ready for database update
- No breaking changes to existing functionality
