# 🔧 **FIX: Game History Not Showing Winnings**

## **THE PROBLEM:**

Game history in profile shows:
- ✅ How much user bet
- ❌ How much user won (shows 0 or nothing)
- ❌ Net profit/loss (not calculated correctly)

---

## **ROOT CAUSE:**

The `actual_payout` column in `player_bets` table is **NULL** or **0** even when player wins.

**Why?**
The PostgreSQL function `apply_payouts_and_update_bets` is updating bet statuses but NOT setting the `actual_payout` field.

---

## **THE FIX:**

### **Step 1: Update PostgreSQL Function**

Run this in **Supabase SQL Editor**:

```sql
-- Drop existing function
DROP FUNCTION IF EXISTS apply_payouts_and_update_bets(jsonb, text[], text[]);

-- Create updated function that sets actual_payout
CREATE OR REPLACE FUNCTION apply_payouts_and_update_bets(
  payouts jsonb,
  winning_bets_ids text[],
  losing_bets_ids text[]
)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  payout_record jsonb;
  user_id_val text;
  amount_val numeric;
BEGIN
  -- Update balance and set actual_payout for each payout
  FOR payout_record IN SELECT * FROM jsonb_array_elements(payouts)
  LOOP
    user_id_val := payout_record->>'userId';
    amount_val := (payout_record->>'amount')::numeric;
    
    -- Add to user balance atomically
    UPDATE users 
    SET balance = balance + amount_val,
        updated_at = NOW()
    WHERE id = user_id_val::uuid;
    
    -- ✅ NEW: Set actual_payout for winning bets
    UPDATE player_bets
    SET actual_payout = amount_val,
        status = 'won',
        updated_at = NOW()
    WHERE user_id = user_id_val::uuid
      AND id = ANY(winning_bets_ids);
  END LOOP;
  
  -- Mark winning bets (already done above, but ensure status is set)
  UPDATE player_bets
  SET status = 'won',
      updated_at = NOW()
  WHERE id = ANY(winning_bets_ids);
  
  -- Mark losing bets with 0 payout
  UPDATE player_bets
  SET status = 'lost',
      actual_payout = 0,
      updated_at = NOW()
  WHERE id = ANY(losing_bets_ids);
END;
$$;
```

---

### **Step 2: Verify Function Works**

Test with a sample:

```sql
-- Check current state
SELECT 
  id, 
  user_id, 
  amount, 
  actual_payout, 
  status 
FROM player_bets 
ORDER BY created_at DESC 
LIMIT 5;

-- If you see NULL in actual_payout, the function needs to be updated
```

---

### **Step 3: Backfill Existing Data (Optional)**

If you have old games with NULL payouts, fix them:

```sql
-- For completed games, calculate and set actual_payout
UPDATE player_bets pb
SET actual_payout = CASE 
  WHEN pb.status = 'won' THEN pb.amount * 1.9  -- Assuming 1.9x payout
  WHEN pb.status = 'lost' THEN 0
  ELSE NULL
END
WHERE pb.actual_payout IS NULL
  AND pb.status IN ('won', 'lost');

-- Verify
SELECT 
  COUNT(*) as total_bets,
  COUNT(actual_payout) as bets_with_payout,
  COUNT(*) - COUNT(actual_payout) as bets_missing_payout
FROM player_bets
WHERE status IN ('won', 'lost');
```

---

## **ALTERNATIVE FIX (If RPC doesn't work):**

Update the fallback code in `server/game.ts` around line 256:

```typescript
// In the fallback section, ensure actual_payout is set
await supabaseServer
  .from('player_bets')
  .update({
    status: 'won',
    actual_payout: notification.payout,  // ← Make sure this is set!
    updated_at: new Date().toISOString()
  })
  .eq('id', bet.id);
```

---

## **VERIFICATION:**

### **1. Check Database After Game:**

```sql
-- After completing a game, check if actual_payout is set
SELECT 
  pb.id,
  pb.user_id,
  pb.amount as bet_amount,
  pb.actual_payout,
  pb.status,
  gs.winner,
  pb.side
FROM player_bets pb
JOIN game_sessions gs ON pb.game_id = gs.game_id
WHERE gs.status = 'completed'
ORDER BY pb.created_at DESC
LIMIT 10;
```

**Expected Result:**
- `actual_payout` should be > 0 for winning bets
- `actual_payout` should be 0 for losing bets
- `actual_payout` should NOT be NULL

### **2. Check Game History API:**

```
GET http://localhost:5000/api/user/game-history
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "games": [
      {
        "gameId": "...",
        "yourTotalBet": 1000,
        "yourTotalPayout": 1900,  ← Should be > 0 for wins
        "yourNetProfit": 900,     ← Should show profit
        "result": "win"
      }
    ]
  }
}
```

### **3. Check Frontend Display:**

Go to profile → Game History tab

**Should show:**
```
Game #abc123 - ANDAR Won
Your Bet: ANDAR ₹1,000

+₹900              ← Net profit in green
Won: ₹1,900        ← Total payout
Bet: ₹1,000        ← Total bet
💰 Net Profit
```

---

## **DEBUGGING:**

If still not working, check these:

### **1. Server Logs:**

Look for:
```
✅ Database updated: X payout records, Y winning bets, Z losing bets
```

### **2. Check Payout Calculation:**

In `server/game.ts` around line 162-164:
```typescript
for (const [userId, payout] of Object.entries(payouts)) {
  payoutArray.push({ userId, amount: payout, actual_payout: payout });
  console.log(`💰 Payout for ${userId}: ₹${payout}`);  // Add this
}
```

### **3. Check RPC Call:**

In `server/storage-supabase.ts` around line 2509:
```typescript
console.log('🔧 Calling RPC with:', {
  payouts: payouts.length,
  winning: winningBets.length,
  losing: losingBets.length
});

const { error } = await supabaseServer.rpc('apply_payouts_and_update_bets', {
  payouts: payouts,
  winning_bets_ids: winningBets,
  losing_bets_ids: losingBets,
});

if (error) {
  console.error('❌ RPC Error:', error);
}
```

---

## **SUMMARY:**

**Problem:** `actual_payout` column is NULL in database
**Solution:** Update PostgreSQL function to set `actual_payout` when updating bet status
**Verification:** Check database, API response, and frontend display

After applying the fix:
1. New games will show correct payouts
2. Old games can be backfilled with SQL query
3. Game history will display winnings and profit correctly
