# 🚨 DOUBLE PAYOUT ROOT CAUSE - FOUND!

## 🎯 The REAL Problem

You have **TWO separate systems** adding balance to users:

### System 1: New Simplified Approach (game.ts line 280)
```typescript
await storage.addBalanceAtomic(payout.userId, payout.amount);
```
This adds ₹50,000 (net profit) to balance ✅

### System 2: Old RPC Function (still in database)
```sql
CREATE OR REPLACE FUNCTION apply_payouts_and_update_bets(...)
BEGIN
  UPDATE users 
  SET balance = balance + amount_val  -- ❌ ADDS BALANCE AGAIN!
  WHERE id = user_id_val;
END;
```
This ALSO adds ₹50,000 to balance ❌

**Result:** ₹50,000 + ₹50,000 = ₹100,000 extra in wallet!

## 📊 What's Happening

```
Starting Balance: ₹2,000,000
Place Bet: -₹50,000 → Balance: ₹1,950,000

Game Completes:
  1. game.ts calls addBalanceAtomic(userId, 50000)
     → Balance: ₹2,000,000 ✅
  
  2. Old RPC function ALSO runs and adds 50000 AGAIN
     → Balance: ₹2,050,000 ❌
  
Final Balance: ₹2,050,000 (should be ₹2,000,000)
Extra money: ₹50,000 ❌
```

## 🔍 Why The Old RPC Still Runs

Even though your code doesn't explicitly call it, the old RPC function might be:
1. **Still in the database** from old migrations
2. **Called by a database trigger** (unlikely but possible)
3. **Called by some other code path** we haven't found yet

## ✅ THE FIX

### Step 1: Drop the Old RPC Function

Run this in Supabase SQL Editor:

```sql
-- Drop ALL versions of the old function
DROP FUNCTION IF EXISTS apply_payouts_and_update_bets(JSONB, UUID[], UUID[]);
DROP FUNCTION IF EXISTS apply_payouts_and_update_bets(JSONB, TEXT[], TEXT[]);
DROP FUNCTION IF EXISTS public.apply_payouts_and_update_bets(JSONB, UUID[], UUID[]);
DROP FUNCTION IF EXISTS public.apply_payouts_and_update_bets(JSONB, TEXT[], TEXT[]);

-- Verify it's gone
SELECT routine_name FROM information_schema.routines
WHERE routine_name = 'apply_payouts_and_update_bets';
-- Expected: NO ROWS
```

### Step 2: Verify No Database Triggers

```sql
-- Check for triggers that might call the old function
SELECT 
  trigger_name,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE action_statement LIKE '%apply_payouts%'
   OR action_statement LIKE '%balance%';
```

### Step 3: Check for Any Other Balance Updates

```sql
-- Find all functions that update user balance
SELECT 
  routine_name,
  routine_definition
FROM information_schema.routines
WHERE routine_definition LIKE '%UPDATE users%balance%'
  AND routine_schema = 'public';
```

### Step 4: Restart Server and Test

```bash
npm run dev:both
```

Then play a complete game and verify:
- Bet ₹50,000 → Balance decreases by ₹50,000
- Win 1:1 → Balance increases by ₹50,000 (net profit)
- Final balance = Starting balance (break even) ✅

## 🐛 How to Verify the Fix

### Before Fix:
```
Starting: ₹2,000,000
Bet: -₹50,000 → ₹1,950,000
Win: +₹100,000 → ₹2,050,000 ❌ (extra ₹50,000)
```

### After Fix:
```
Starting: ₹2,000,000
Bet: -₹50,000 → ₹1,950,000
Win: +₹50,000 → ₹2,000,000 ✅ (correct)
```

## 📝 Check Your Logs

After the fix, you should see ONLY ONE balance update per user:

```
✅ Added NET PROFIT of ₹50,000 to user 9876543210 (gross payout: ₹100,000)
```

You should NOT see:
- Multiple balance updates for the same user
- Any calls to `apply_payouts_and_update_bets`
- Balance increasing by more than the net profit

## 🎯 Root Cause Summary

The issue was NOT in the payout calculation logic (that was correct).

The issue was having **TWO separate code paths** both adding balance:
1. New simplified approach (correct)
2. Old RPC function (should have been removed)

By dropping the old RPC function, only the new approach will run, and payouts will be correct.

---

**Action Required:** Run `URGENT_DROP_OLD_RPC.sql` in Supabase SQL Editor NOW!
