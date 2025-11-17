# 🐛 DEBUG: Double Payout Issue

## What We Need to Find

You're saying balance increases by ₹150,000 when it should increase by ₹100,000.

This means **₹50,000 extra** is being added somewhere.

## Possible Causes

### 1. Old RPC Function Still Exists
Check if `apply_payouts_and_update_bets` still exists:

```sql
SELECT routine_name, routine_definition
FROM information_schema.routines
WHERE routine_name = 'apply_payouts_and_update_bets'
AND routine_schema = 'public';
```

If this returns ANY rows, the old function is still there!

### 2. Database Trigger Adding Balance
Check for triggers that update balance:

```sql
SELECT 
  trigger_name,
  event_object_table,
  action_statement,
  action_timing
FROM information_schema.triggers
WHERE action_statement LIKE '%balance%'
  OR action_statement LIKE '%payout%'
ORDER BY event_object_table, trigger_name;
```

### 3. Multiple Calls to addBalanceAtomic
Check your server logs for duplicate balance additions:

```bash
# Search for how many times balance is added for same user
grep "Added ₹" server.log | grep "9876543210"
```

Expected: ONE line per game
If you see TWO or more: That's the problem!

### 4. Check What Functions Exist
List ALL functions that might add balance:

```sql
SELECT 
  routine_name,
  routine_definition
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND (
    routine_definition LIKE '%UPDATE users%balance%'
    OR routine_definition LIKE '%balance + %'
    OR routine_name LIKE '%balance%'
    OR routine_name LIKE '%payout%'
  )
ORDER BY routine_name;
```

## What to Send Me

Please run these queries and send me:

1. **Result of query #1** (old RPC function check)
2. **Result of query #2** (trigger check)  
3. **Result of query #4** (all balance-related functions)
4. **Your complete server console output** from one game (from bet placement to game complete)

## Quick Test

Run this in Supabase to see EXACTLY what happens to balance:

```sql
-- Get user's current balance
SELECT id, balance FROM users WHERE phone = '9876543210';

-- Check recent transactions
SELECT 
  transaction_type,
  amount,
  balance_before,
  balance_after,
  description,
  created_at
FROM user_transactions
WHERE user_id = '9876543210'
ORDER BY created_at DESC
LIMIT 10;

-- Check recent bets
SELECT 
  id,
  game_id,
  amount as bet_amount,
  actual_payout,
  status,
  payout_transaction_id,
  created_at
FROM player_bets
WHERE user_id = '9876543210'
ORDER BY created_at DESC
LIMIT 5;
```

This will show:
- Current balance
- All recent balance changes
- What payouts were recorded

If you see TWO transactions for the same game, that's the smoking gun!

## Expected vs Actual

### Expected (Correct):
```
1. Bet placed: balance = 1,950,000 (deducted 50,000)
2. Game completes: ONE transaction adding 100,000
3. Final balance: 2,050,000 ✅
```

### Actual (Your Issue):
```
1. Bet placed: balance = 1,950,000 (deducted 50,000)
2. Game completes: TWO transactions?
   - First: +100,000 → balance = 2,050,000
   - Second: +50,000 → balance = 2,100,000 ❌
3. Final balance: 2,100,000 (extra 50,000!)
```

## Action Items

1. **Run the SQL queries above**
2. **Check your server console** for duplicate "Added ₹" messages
3. **Send me the results**
4. **Check if you applied the migration** from `fix-payout-system-simplified.sql`

The double payout is definitely happening, we just need to find WHERE!
