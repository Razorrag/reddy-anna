# 🧪 COMPLETE VERIFICATION TEST PLAN

## After a game completes, verify ALL these pages show correct data:

---

## 1️⃣ `/admin` - Main Admin Dashboard

### **Key Metrics Section:**
- ✅ **Net Profit** = Total bets - Total payouts (if positive)
- ✅ **Net Loss** = Total payouts - Total bets (if negative, shown as positive)

**Expected Values:**
- If house wins: Net Profit > 0, Net Loss = 0
- If players win: Net Profit = 0, Net Loss > 0

**Data Source:** 
- Calculated from `users.total_winnings` and `users.total_losses` for ALL users
- Formula: `netHouseProfit = totalLosses - totalWinnings`

---

## 2️⃣ `/admin/game-history` - Game History Page

### **Summary Cards:**
- ✅ **Total Games** = Count of games
- ✅ **Total Bets** = Sum of all bets placed
- ✅ **Total Payouts** = Sum of all payouts given
- ✅ **Net Profit/Loss** = Total Bets - Total Payouts

### **Game History Table (Per Game):**
Each row should show:
- ✅ **Game ID** = game-XXXXX
- ✅ **Date** = Game completion time
- ✅ **Opening Card** = First card dealt
- ✅ **Winner** = ANDAR or BAHAR
- ✅ **Winning Card** = Card that matched opening card
- ✅ **Andar Bets** = Total bets on Andar side
- ✅ **Bahar Bets** = Total bets on Bahar side
- ✅ **Total Bets** = Andar + Bahar bets
- ✅ **Payout** = Total amount paid to winners
- ✅ **Profit/Loss** = Total Bets - Payout
- ✅ **%** = (Profit/Loss / Total Bets) × 100

**Data Source:**
- `game_statistics` table joined with `game_history` table
- Fields: `total_bets`, `total_winnings` (as payout), `profit_loss`, `profit_loss_percentage`

---

## 3️⃣ `/admin/analytics` - Analytics Dashboard

### **Real-Time Analytics:**
- ✅ **Current Game** stats (live)

### **Monthly Analytics (Nov 2025):**
- ✅ **Games** = Total games this month
- ✅ **Total Bets** = Sum of all bets this month
- ✅ **Total Revenue** = Same as Total Bets
- ✅ **Payouts** = Sum of all payouts this month
- ✅ **Profit/Loss** = Total Bets - Payouts
- ✅ **Profit %** = (Profit/Loss / Total Bets) × 100
- ✅ **Unique Players** = Count of unique players

### **Yearly Analytics (2025):**
- ✅ Same fields as monthly, but for entire year

### **Detailed Breakdown (Today):**
- ✅ **Total Bets (Today)** = Sum of bets today
- ✅ **Total Revenue (Today)** = Same as Total Bets
- ✅ **Total Payouts (Today)** = Sum of payouts today
- ✅ **Net Profit (Today)** = Total Bets - Payouts
- ✅ **Profit % (Today)** = (Net Profit / Total Bets) × 100
- ✅ **Unique Players (Today)** = Count of unique players today
- ✅ **Peak Bets Hour** = Hour with most bets
- ✅ **Games (Today)** = Count of games today

**Data Source:**
- `daily_game_statistics` table (for today)
- `monthly_game_statistics` table (for this month)
- `yearly_game_statistics` table (for this year)

---

## 🎮 TEST SCENARIO

### **Example Game:**
- **Player bets:** ₹10,000 on Andar
- **Winner:** Andar (Round 1)
- **Payout:** ₹20,000 (1:1 payout = 2x bet)
- **House Profit/Loss:** -₹10,000 (house lost)

### **Expected Results:**

#### `/admin` Dashboard:
```
Net Profit: ₹0
Net Loss: ₹10,000
```

#### `/admin/game-history`:
```
Summary:
- Total Games: 1
- Total Bets: ₹10,000
- Total Payouts: ₹20,000
- Net Profit/Loss: -₹10,000

Table Row:
- Total Bets: ₹10,000
- Payout: ₹20,000
- Profit/Loss: -₹10,000
- %: -100.00%
```

#### `/admin/analytics`:
```
Monthly Analytics (Nov 2025):
- Games: 1
- Total Bets: ₹10,000
- Payouts: ₹20,000
- Profit/Loss: -₹10,000
- Profit %: -100.00%

Today's Breakdown:
- Total Bets (Today): ₹10,000
- Total Payouts (Today): ₹20,000
- Net Profit (Today): -₹10,000
- Profit % (Today): -100.00%
```

---

## 🔍 DATABASE VERIFICATION QUERIES

After the game, run these queries to verify data:

```sql
-- 1. Check game_statistics (per-game stats)
SELECT 
  game_id,
  total_bets,
  total_winnings as payout,
  profit_loss,
  profit_loss_percentage,
  house_payout
FROM game_statistics
ORDER BY created_at DESC
LIMIT 1;

-- Expected: total_bets=10000, payout=20000, profit_loss=-10000, %=-100

-- 2. Check daily_game_statistics (today's aggregated stats)
SELECT 
  date,
  total_games,
  total_bets,
  total_payouts,
  profit_loss,
  profit_loss_percentage
FROM daily_game_statistics
WHERE date = CURRENT_DATE;

-- Expected: total_games=1, total_bets=10000, total_payouts=20000, profit_loss=-10000

-- 3. Check monthly_game_statistics (this month's aggregated stats)
SELECT 
  month_year,
  total_games,
  total_bets,
  total_payouts,
  profit_loss,
  profit_loss_percentage
FROM monthly_game_statistics
WHERE month_year = TO_CHAR(CURRENT_DATE, 'YYYY-MM');

-- Expected: Same as daily

-- 4. Check player_bets (individual bet records)
SELECT 
  bet_id,
  user_id,
  side,
  amount,
  status,
  actual_payout
FROM player_bets
WHERE game_id = (SELECT game_id FROM game_sessions ORDER BY created_at DESC LIMIT 1);

-- Expected: status='won', actual_payout=20000 for winning bets

-- 5. Check users table (player stats)
SELECT 
  id,
  balance,
  games_played,
  games_won,
  total_winnings,
  total_losses
FROM users
WHERE id = 'YOUR_PLAYER_ID';

-- Expected: games_played=1, games_won=1, total_winnings=10000 (profit)
```

---

## ✅ CHECKLIST

After playing a test game, verify:

- [ ] Server logs show ALL 5 success messages
- [ ] `/admin` shows correct Net Profit/Loss
- [ ] `/admin/game-history` Summary shows correct totals
- [ ] `/admin/game-history` Table row shows correct per-game stats
- [ ] `/admin/analytics` Monthly stats show correct values
- [ ] `/admin/analytics` Today's breakdown shows correct values
- [ ] Database queries return correct values
- [ ] Player balance updated correctly
- [ ] Player stats (games_played, games_won) updated correctly

---

## 🔴 COMMON ISSUES

### Issue: Payouts showing ₹0
**Cause:** `actual_payout` not set in `player_bets` table
**Fix:** Check RPC function `apply_payouts_and_update_bets` is working

### Issue: Net Profit/Loss showing ₹0 on `/admin`
**Cause:** Frontend not calculating from user stats correctly
**Fix:** Check browser console for calculation logs

### Issue: Game History showing ₹0 for Profit/Loss
**Cause:** `game_statistics` table not populated or frontend not reading `profitLoss` field
**Fix:** Check server logs for "Game statistics saved" message

### Issue: Analytics showing ₹0
**Cause:** Daily/monthly/yearly tables not being updated
**Fix:** Check server logs for "Analytics tables updated" message

---

## 📝 NOTES

- All monetary values should be consistent across all pages
- Profit/Loss should be negative when house loses (players win)
- Profit/Loss should be positive when house wins (players lose)
- Percentages should match: (Profit/Loss / Total Bets) × 100
- All tables should update INSTANTLY when game ends (no manual refresh needed)
