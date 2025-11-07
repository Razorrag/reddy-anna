# 🔍 GAME COMPLETION DEBUG GUIDE

## When a game ends, you will see these logs in SERVER console:

### ✅ **SUCCESS LOGS** (What you SHOULD see):

```
💰 Game Analytics - Bets: ₹X, Payouts: ₹Y, Profit: ₹Z (ZZ%)
✅ Database updated: X payout records, Y winning bets, Z losing bets
✅ Updated stats for user XXX: won=true, bet=X, payout=Y
✅ Game history saved successfully for gameId: game-XXX (attempt 1)
✅ Game session completed in database: game-XXX
✅ Game statistics saved for gameId: game-XXX
📊 Saved stats: { profitLoss: X, housePayout: Y, totalBets: Z, totalWinnings: Y }
✅ Analytics tables updated (daily/monthly/yearly) for gameId: game-XXX
📈 Updated analytics with: { totalGames: 1, totalBets: X, totalPayouts: Y, profitLoss: Z }
```

### ❌ **ERROR LOGS** (What indicates a problem):

```
❌ CRITICAL: Failed to save game statistics: { error: '...', gameId: 'game-XXX', profitLoss: X, ... }
```
**Cause:** game_statistics table insert failed (likely foreign key constraint violation)

```
❌ CRITICAL: Failed to update analytics tables: { error: '...', gameId: 'game-XXX' }
```
**Cause:** daily/monthly/yearly stats update failed (likely incrementDailyStats function error)

---

## 🎯 EXPECTED BEHAVIOR AFTER FIX:

### **After game completes:**

1. **`game_statistics` table** - New row inserted with:
   - `profit_loss` = (totalBets - totalPayouts)
   - `house_payout` = totalPayouts
   - `total_bets`, `total_winnings`, etc.

2. **`daily_game_statistics` table** - Today's row updated/created with:
   - `total_games` += 1
   - `total_bets` += X
   - `total_payouts` += Y
   - `profit_loss` += Z

3. **`monthly_game_statistics` table** - This month's row updated/created

4. **`yearly_game_statistics` table** - This year's row updated/created

---

## 🔍 VERIFICATION QUERIES:

Run these in Supabase SQL Editor after game completes:

```sql
-- 1. Check game_statistics for latest game
SELECT 
  game_id,
  total_bets,
  total_winnings,
  profit_loss,
  house_payout,
  created_at
FROM game_statistics
ORDER BY created_at DESC
LIMIT 1;

-- Expected: profit_loss and house_payout should NOT be NULL or 0

-- 2. Check daily stats for today
SELECT 
  date,
  total_games,
  total_bets,
  total_payouts,
  profit_loss
FROM daily_game_statistics
WHERE date = CURRENT_DATE;

-- Expected: Should have values, not zeros

-- 3. Check monthly stats for this month
SELECT 
  month_year,
  total_games,
  total_bets,
  total_payouts,
  profit_loss
FROM monthly_game_statistics
WHERE month_year = TO_CHAR(CURRENT_DATE, 'YYYY-MM');

-- Expected: Should have values, not zeros

-- 4. Check yearly stats
SELECT 
  year,
  total_games,
  total_bets,
  total_payouts,
  profit_loss
FROM yearly_game_statistics
WHERE year = EXTRACT(YEAR FROM CURRENT_DATE);

-- Expected: Should have values, not zeros
```

---

## 🚨 COMMON FAILURE SCENARIOS:

### **Scenario 1: Foreign Key Constraint Violation**
**Error:** `insert or update on table "game_statistics" violates foreign key constraint`
**Cause:** `game_sessions` doesn't have a row for this game_id
**Fix:** Check if `completeGameSession` is failing before `saveGameStatistics`

### **Scenario 2: incrementDailyStats Function Missing**
**Error:** `function incrementdailystats does not exist`
**Cause:** Function not defined in storage-supabase.ts
**Fix:** Already exists at line 2363, check if it's being called correctly

### **Scenario 3: Table Doesn't Exist**
**Error:** `relation "daily_game_statistics" does not exist`
**Cause:** Tables not created in database
**Fix:** Run `scripts/reset-and-recreate-database.sql` to create all tables

---

## 📝 NEXT STEPS:

1. **Restart server:** `npm run dev:both`
2. **Play ONE test game**
3. **Check server console** for the logs above
4. **If you see ❌ errors:** Share the FULL error message
5. **If you see ✅ success:** Run verification queries above
6. **Check frontend pages:**
   - `/admin/game-history` - Should show profit/loss
   - `/admin/analytics` - Should show monthly/yearly stats

---

## 🎯 FINAL VALIDATION:

All three pages should show CONSISTENT data:

| Page | Field | Expected Value |
|------|-------|---------------|
| `/admin` | Net Profit/Loss | Sum of all game profits |
| `/admin/game-history` | Per-game Profit/Loss | (Total Bets - Payout) |
| `/admin/game-history` | Summary Net Profit/Loss | Sum of all games |
| `/admin/analytics` | Monthly Profit/Loss | Sum for this month |
| `/admin/analytics` | Yearly Profit/Loss | Sum for this year |
| `/admin/analytics` | Today's Profit/Loss | Sum for today |

**All values should match and NO zeros should appear if games have been played!**
