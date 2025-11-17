# 🔍 Database Status Check

## ❓ Why Am I Still Seeing Errors?

There are **3 possible reasons**:

### 1️⃣ Server Not Restarted (Most Common)
**Problem:** Your server is still running old code  
**Solution:** 
```bash
# Stop server: Ctrl+C
npm run dev
```

### 2️⃣ SQL Migration Not Applied
**Problem:** The database functions haven't been created yet  
**Solution:** Run the SQL migration in Supabase

### 3️⃣ Old Function Still Exists
**Problem:** The broken RPC function is still in the database  
**Solution:** Drop it manually

---

## 🔧 Step-by-Step Fix

### Step 1: Check if SQL Migration Was Applied

Open Supabase SQL Editor and run:

```sql
-- Check if new functions exist
SELECT routine_name, routine_type 
FROM information_schema.routines 
WHERE routine_schema = 'public'
AND routine_name IN (
  'update_bet_with_payout',
  'add_balance_atomic',
  'create_payout_transaction',
  'apply_payouts_and_update_bets'
)
ORDER BY routine_name;
```

**Expected Result:**
```
routine_name                  | routine_type
------------------------------|-------------
add_balance_atomic            | FUNCTION     ✅
create_payout_transaction     | FUNCTION     ✅
update_bet_with_payout        | FUNCTION     ✅
```

**If you see `apply_payouts_and_update_bets`** → That's the OLD broken function, drop it!

---

### Step 2: If Functions Don't Exist, Apply Migration

1. Open Supabase Dashboard: https://nliiasrfkenkkdlzkcum.supabase.co
2. Go to **SQL Editor**
3. Copy the ENTIRE contents of `scripts/fix-payout-system-simplified.sql`
4. Paste and click **Run**

---

### Step 3: Verify Column Was Added

```sql
-- Check if payout_transaction_id column exists
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'player_bets'
AND column_name = 'payout_transaction_id';
```

**Expected Result:**
```
column_name              | data_type | is_nullable
-------------------------|-----------|------------
payout_transaction_id    | text      | YES         ✅
```

**If empty** → Column doesn't exist, run the migration!

---

### Step 4: Check Transaction Type Enum

```sql
-- Check valid transaction_type values
SELECT enumlabel 
FROM pg_enum 
WHERE enumtypid = (
  SELECT oid FROM pg_type WHERE typname = 'transaction_type'
)
ORDER BY enumlabel;
```

**Expected Result:**
```
enumlabel
-----------------
bet
bonus
bonus_applied
commission
conditional_bonus_applied
deposit
refund
support
win              ✅ (This is what we use)
withdrawal
```

**If 'win' is missing** → Your enum is outdated!

---

### Step 5: Drop Old Broken Function (If It Exists)

```sql
-- Drop the old broken RPC function
DROP FUNCTION IF EXISTS apply_payouts_and_update_bets(JSONB, UUID[], UUID[]);
DROP FUNCTION IF EXISTS apply_payouts_and_update_bets(JSONB, TEXT[], TEXT[]);
```

---

### Step 6: Restart Server

```bash
# In your terminal where the server is running:
# Press Ctrl+C to stop

# Then restart:
npm run dev
```

---

## 🎯 Quick Diagnostic

Run this **ONE query** to check everything:

```sql
-- Comprehensive status check
SELECT 
  'Functions' as check_type,
  COUNT(*) as count,
  STRING_AGG(routine_name, ', ') as details
FROM information_schema.routines 
WHERE routine_schema = 'public'
AND routine_name IN (
  'update_bet_with_payout',
  'add_balance_atomic',
  'create_payout_transaction'
)

UNION ALL

SELECT 
  'Old Function' as check_type,
  COUNT(*) as count,
  STRING_AGG(routine_name, ', ') as details
FROM information_schema.routines 
WHERE routine_schema = 'public'
AND routine_name = 'apply_payouts_and_update_bets'

UNION ALL

SELECT 
  'Column' as check_type,
  COUNT(*) as count,
  column_name as details
FROM information_schema.columns
WHERE table_name = 'player_bets'
AND column_name = 'payout_transaction_id'

UNION ALL

SELECT 
  'Win Enum' as check_type,
  COUNT(*) as count,
  'win' as details
FROM pg_enum 
WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'transaction_type')
AND enumlabel = 'win';
```

**Expected Result:**
```
check_type    | count | details
--------------|-------|------------------------------------------
Functions     | 3     | add_balance_atomic, create_payout_tra... ✅
Old Function  | 0     | (empty)                                  ✅
Column        | 1     | payout_transaction_id                    ✅
Win Enum      | 1     | win                                      ✅
```

**If any count is wrong:**
- Functions ≠ 3 → Run migration
- Old Function ≠ 0 → Drop old function
- Column ≠ 1 → Run migration
- Win Enum ≠ 1 → Your enum is broken

---

## 🚨 Common Errors & Solutions

### Error: "Function does not exist"
```
ERROR: function update_bet_with_payout(...) does not exist
```
**Solution:** Run the SQL migration in Supabase

---

### Error: "Column does not exist"
```
ERROR: column "payout_transaction_id" does not exist
```
**Solution:** Run the SQL migration in Supabase

---

### Error: "invalid input value for enum"
```
ERROR: invalid input value for enum transaction_type: "game_payout"
```
**Solution:** Restart your server (old code is still running)

---

### Error: "ambiguous column reference"
```
ERROR: column reference "payout_record" is ambiguous
```
**Solution:** Drop the old RPC function:
```sql
DROP FUNCTION IF EXISTS apply_payouts_and_update_bets(JSONB, TEXT[], TEXT[]);
```

---

## 📝 Checklist

Before testing, verify:

- [ ] SQL migration applied in Supabase
- [ ] New functions exist (3 functions)
- [ ] Old function dropped (0 functions)
- [ ] Column added (payout_transaction_id)
- [ ] Server restarted
- [ ] No TypeScript errors

---

## 🧪 Test After Fix

1. Start a game
2. Place a bet (₹1,000)
3. Complete the game
4. Check server logs:

**Should see:**
```
✅ Added ₹2,000 to user 1234567890
✅ Updated bet abc-123: won, payout=₹2,000
✅ Created transaction record: game_xxx_user_yyy_zzz
✅ All payouts processed: 1 users, 1 bets updated (487ms)
```

**Should NOT see:**
```
❌ Error: invalid input value for enum transaction_type: "game_payout"
❌ Error: column reference "payout_record" is ambiguous
❌ Error: function update_bet_with_payout does not exist
```

---

## 💡 Still Having Issues?

If you've done all the above and still see errors:

1. **Check which error you're seeing** (copy the exact error message)
2. **Check server logs** for the full stack trace
3. **Verify database connection** is working
4. **Check Supabase logs** in the dashboard

---

**Most likely issue:** You haven't restarted the server yet! 😊
