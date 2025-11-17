# 🚨 CRITICAL: Bet Status Type Error

## The Error

```
Error updating bet with payout: {
  code: '42804',
  message: 'column "status" is of type transaction_status but expression is of type text'
}
```

## What This Means

The `update_bet_with_payout` RPC function is failing because:
- The `player_bets.status` column is of type `transaction_status` ENUM
- The function is passing a TEXT value without casting
- PostgreSQL rejects the type mismatch

## Impact

When this error occurs:
- ✅ Balance IS added to user (+₹400,000 in your case)
- ❌ Bet status is NOT updated (stays as 'active' instead of 'won')
- ❌ Transaction record is NOT created
- ❌ Payout transaction ID is NOT set
- ⚠️ **RISK:** Bet could be paid out again if game is replayed!

## The Flow

```
1. addBalanceAtomic() → ✅ SUCCESS (+₹400,000)
2. updateBetWithPayout() → ❌ FAILS (type error)
3. createTransaction() → ❌ SKIPPED (because step 2 failed)
```

Result: User gets money but no record of it!

## The Fix

**File:** `FIX_BET_STATUS_TYPE.sql`

### Step 1: Check Column Type

```sql
SELECT column_name, data_type, udt_name
FROM information_schema.columns
WHERE table_name = 'player_bets' AND column_name = 'status';
```

Expected result: `transaction_status` enum

### Step 2: Fix the RPC Function

```sql
CREATE OR REPLACE FUNCTION update_bet_with_payout(
  p_bet_id TEXT,
  p_status TEXT,
  p_transaction_id TEXT,
  p_payout_amount NUMERIC
)
RETURNS VOID AS $$
BEGIN
  UPDATE player_bets
  SET 
    status = p_status::transaction_status,  -- ✅ Cast to enum
    payout_transaction_id = p_transaction_id,
    actual_payout = p_payout_amount,
    updated_at = NOW()
  WHERE id = p_bet_id
    AND (payout_transaction_id IS NULL OR payout_transaction_id = p_transaction_id);
END;
$$ LANGUAGE plpgsql;
```

## How to Apply

### Option 1: Run SQL in Supabase (Recommended)

1. Open Supabase Dashboard → SQL Editor
2. Copy contents of `FIX_BET_STATUS_TYPE.sql`
3. Paste and click "Run"
4. Verify no errors
5. Restart server

### Option 2: Manual Fix

Run this single command in Supabase SQL Editor:

```sql
DROP FUNCTION IF EXISTS update_bet_with_payout(TEXT, TEXT, TEXT, NUMERIC);

CREATE OR REPLACE FUNCTION update_bet_with_payout(
  p_bet_id TEXT,
  p_status TEXT,
  p_transaction_id TEXT,
  p_payout_amount NUMERIC
)
RETURNS VOID AS $$
BEGIN
  UPDATE player_bets
  SET 
    status = p_status::transaction_status,
    payout_transaction_id = p_transaction_id,
    actual_payout = p_payout_amount,
    updated_at = NOW()
  WHERE id = p_bet_id
    AND (payout_transaction_id IS NULL OR payout_transaction_id = p_transaction_id);
END;
$$ LANGUAGE plpgsql;
```

## Verification

After applying the fix, run a test game and check logs:

### Before Fix (ERROR):
```
✅ Added ₹400000 to user 9876543210
Error updating bet with payout: column "status" is of type transaction_status...
⚠️ Error processing payout for user 9876543210
```

### After Fix (SUCCESS):
```
✅ Added ₹400000 to user 9876543210
✅ Updated bet abc-123: won, payout=₹400000
✅ Created transaction record: game_xxx_user_9876543210_123456
```

## Check Database

After fix, verify bets are being updated:

```sql
-- Check recent bets
SELECT 
  id,
  user_id,
  game_id,
  amount,
  status,  -- Should be 'won' or 'lost', not 'active'
  payout_transaction_id,  -- Should have a value
  actual_payout,  -- Should match payout amount
  created_at
FROM player_bets
WHERE user_id = '9876543210'
ORDER BY created_at DESC
LIMIT 5;
```

Expected:
- `status` = 'won' (not 'active')
- `payout_transaction_id` = 'game_xxx_user_xxx_xxx'
- `actual_payout` = 400000

## Why This Happened

The original migration SQL (`fix-payout-system-simplified.sql`) didn't cast the status parameter:

```sql
-- WRONG (original)
status = p_status,  -- No cast

-- CORRECT (fixed)
status = p_status::transaction_status,  -- Cast to enum
```

## Related Issues

This is why:
1. ✅ Balances update correctly
2. ❌ But bet history might show wrong status
3. ❌ And transaction records are missing
4. ⚠️ Potential for duplicate payouts (no transaction ID set)

## Priority

**🔴 CRITICAL - Apply immediately!**

Without this fix:
- Payouts work but leave no audit trail
- Bets stay in 'active' status forever
- No protection against duplicate payouts
- Transaction history is incomplete

---

**Status:** ⚠️ URGENT FIX REQUIRED  
**File:** `FIX_BET_STATUS_TYPE.sql`  
**Action:** Run SQL in Supabase, then restart server
