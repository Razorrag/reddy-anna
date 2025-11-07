# ✅ COMPLETE DATABASE UPDATES ON GAME END

## 🎯 THE MOMENT WINNER IS ANNOUNCED - ALL THESE TABLES MUST UPDATE:

---

## 1️⃣ **`player_bets` Table** - Individual Bet Records
**UPDATED BY:** `storage.applyPayoutsAndupdateBets()` (line 172 in game.ts)

**What changes:**
- `status` = 'won' OR 'lost'
- `actual_payout` = payout amount (for winners only)

**Example:**
```sql
-- Before game ends:
bet_id | user_id | game_id | side | amount | status | actual_payout
123    | user1   | game-X  | andar| 10000  | placed | NULL

-- After game ends (Andar wins):
bet_id | user_id | game_id | side | amount | status | actual_payout
123    | user1   | game-X  | andar| 10000  | won    | 20000
```

---

## 2️⃣ **`users` Table** - Player Balance & Statistics
**UPDATED BY:** 
- `storage.applyPayoutsAndupdateBets()` for balance (line 172)
- `storage.updateUserGameStats()` for statistics (line 193)

**What changes:**
- `balance` += payout amount
- `games_played` += 1
- `games_won` += 1 (if won)
- `total_winnings` += profit (payout - bet)
- `total_losses` += loss amount (if lost)

**Example:**
```sql
-- Before:
id    | balance | games_played | games_won | total_winnings | total_losses
user1 | 50000   | 0            | 0         | 0              | 0

-- After (won ₹10,000 profit on ₹10,000 bet):
id    | balance | games_played | games_won | total_winnings | total_losses
user1 | 70000   | 1            | 1         | 10000          | 0
```

---

## 3️⃣ **`game_history` Table** - Game Record
**UPDATED BY:** `storage.saveGameHistory()` (line 485 in game.ts)

**What inserts:**
- `game_id` = unique game identifier
- `opening_card` = first card dealt
- `winner` = 'andar' OR 'bahar'
- `winning_card` = card that matched opening card
- `total_cards` = number of cards dealt
- `round` = winning round (1, 2, or 3)
- `total_bets` = sum of all bets
- `total_payouts` = sum of all payouts
- `created_at` = timestamp

**Example:**
```sql
INSERT INTO game_history VALUES (
  'uuid-xxx',
  'game-1762537443705',
  '7♥',
  'andar',
  '7♣',
  6,
  3,
  152500.00,
  0.00,  -- No payout if house won
  '2025-11-07 23:40:00'
);
```

---

## 4️⃣ **`game_sessions` Table** - Session Status
**UPDATED BY:** `storage.completeGameSession()` (line 491 in game.ts)

**What changes:**
- `status` = 'completed'
- `winner` = 'andar' OR 'bahar'
- `winning_card` = winning card value

**Example:**
```sql
-- Before:
game_id              | status  | winner | winning_card
game-1762537443705   | active  | NULL   | NULL

-- After:
game_id              | status    | winner | winning_card
game-1762537443705   | completed | bahar  | 7♦
```

---

## 5️⃣ **`game_statistics` Table** - Per-Game Analytics
**UPDATED BY:** `storage.saveGameStatistics()` (line 510 in game.ts)

**What inserts:**
- `game_id` = game identifier
- `total_players` = unique player count
- `total_bets` = sum of all bets
- `total_winnings` = sum of all payouts
- `house_earnings` = profit/loss amount
- `andar_bets_count` = number of andar bets
- `bahar_bets_count` = number of bahar bets
- `andar_total_bet` = sum of andar bets
- `bahar_total_bet` = sum of bahar bets
- **`profit_loss`** = totalBets - totalPayouts
- **`profit_loss_percentage`** = (profit_loss / totalBets) × 100
- **`house_payout`** = total amount paid to winners
- `game_duration` = game length in seconds
- `unique_players` = unique player count

**Example:**
```sql
INSERT INTO game_statistics VALUES (
  'uuid-xxx',
  'game-1762537443705',
  1,            -- total_players
  152500.00,    -- total_bets
  0.00,         -- total_winnings (house won)
  152500.00,    -- house_earnings
  1,            -- andar_bets_count
  0,            -- bahar_bets_count
  152500.00,    -- andar_total_bet
  0.00,         -- bahar_total_bet
  152500.00,    -- profit_loss (positive = house won)
  100.00,       -- profit_loss_percentage
  0.00,         -- house_payout (no winners)
  0,            -- game_duration
  1,            -- unique_players
  NOW()
);
```

---

## 6️⃣ **`daily_game_statistics` Table** - Today's Aggregated Stats
**UPDATED BY:** `storage.incrementDailyStats()` (line 540 in game.ts)

**What updates/inserts:**
- `date` = today's date
- `total_games` += 1
- `total_bets` += game's total bets
- `total_payouts` += game's total payouts
- `total_revenue` += game's total bets
- `profit_loss` += game's profit/loss
- `profit_loss_percentage` = recalculated
- `unique_players` = count of unique players today

**Example:**
```sql
-- Before today's first game:
date       | total_games | total_bets | total_payouts | profit_loss
2025-11-07 | 0           | 0.00       | 0.00          | 0.00

-- After game 1 (house won ₹152,500):
date       | total_games | total_bets | total_payouts | profit_loss
2025-11-07 | 1           | 152500.00  | 0.00          | 152500.00

-- After game 2 (house lost ₹17,500):
date       | total_games | total_bets | total_payouts | profit_loss
2025-11-07 | 2           | 170000.00  | 35000.00      | 135000.00
```

---

## 7️⃣ **`monthly_game_statistics` Table** - This Month's Aggregated Stats
**UPDATED BY:** `storage.incrementMonthlyStats()` (line 551 in game.ts)

**What updates/inserts:**
- `month_year` = 'YYYY-MM' (e.g., '2025-11')
- `total_games` += 1
- `total_bets` += game's total bets
- `total_payouts` += game's total payouts
- `total_revenue` += game's total bets
- `profit_loss` += game's profit/loss
- `profit_loss_percentage` = recalculated
- `unique_players` = count of unique players this month

---

## 8️⃣ **`yearly_game_statistics` Table** - This Year's Aggregated Stats
**UPDATED BY:** `storage.incrementYearlyStats()` (line 562 in game.ts)

**What updates/inserts:**
- `year` = 2025
- `total_games` += 1
- `total_bets` += game's total bets
- `total_payouts` += game's total payouts
- `total_revenue` += game's total bets
- `profit_loss` += game's profit/loss
- `profit_loss_percentage` = recalculated
- `unique_players` = count of unique players this year

---

## 9️⃣ **`user_transactions` Table** - Transaction History (OPTIONAL)
**UPDATED BY:** Currently only for deposits/withdrawals, NOT for game payouts

**What SHOULD insert (future enhancement):**
- `user_id` = player ID
- `transaction_type` = 'bet' OR 'win'
- `amount` = bet amount OR payout amount
- `reference_id` = game_id
- `created_at` = timestamp

---

## 🔍 VERIFICATION AFTER GAME ENDS:

### **Immediate Check (Within 1 second of winner announcement):**

```sql
-- 1. Check game_statistics was inserted
SELECT game_id, total_bets, profit_loss, house_payout, created_at
FROM game_statistics
WHERE game_id = 'YOUR_GAME_ID';
-- Should return 1 row with correct values

-- 2. Check daily stats were updated
SELECT date, total_games, total_bets, total_payouts, profit_loss
FROM daily_game_statistics
WHERE date = CURRENT_DATE;
-- Should show incremented values

-- 3. Check monthly stats were updated
SELECT month_year, total_games, total_bets, profit_loss
FROM monthly_game_statistics
WHERE month_year = TO_CHAR(CURRENT_DATE, 'YYYY-MM');
-- Should show incremented values

-- 4. Check player balance was updated
SELECT id, balance, games_played, games_won, total_winnings
FROM users
WHERE id = 'YOUR_USER_ID';
-- Balance should include payout, stats should increment
```

---

## 📊 COMPLETE EXECUTION ORDER:

```
Winner Announced
    ↓
1. Calculate payouts for all players
    ↓
2. Update player_bets (status, actual_payout)
    ↓
3. Update users (balance, games_played, games_won, total_winnings, total_losses)
    ↓
4. Insert into game_history
    ↓
5. Update game_sessions (status=completed, winner, winning_card)
    ↓
6. Insert into game_statistics (with profit_loss, house_payout)
    ↓
7. Update/Insert daily_game_statistics
    ↓
8. Update/Insert monthly_game_statistics
    ↓
9. Update/Insert yearly_game_statistics
    ↓
ALL DONE - Frontend should now show correct data everywhere!
```

---

## 🚨 CRITICAL SERVER LOGS TO WATCH:

When game ends, you MUST see these logs in order:

```
1. ✅ Database updated: X payout records, Y winning bets, Z losing bets
2. ✅ Updated stats for user XXX: won=true, bet=X, payout=Y
3. ✅ Game history saved successfully for gameId: game-XXX
4. ✅ Game session completed in database: game-XXX
5. ✅ Game statistics saved for gameId: game-XXX
6. 📊 Saved stats: { profitLoss: X, housePayout: Y, totalBets: Z, totalWinnings: Y }
7. ✅ Analytics tables updated (daily/monthly/yearly) for gameId: game-XXX
8. 📈 Updated analytics with: { totalGames: 1, totalBets: X, totalPayouts: Y, profitLoss: Z }
```

**If ANY log is missing, that step failed!**

---

## ✅ FINAL RESULT:

After game ends, ALL these pages should immediately show correct data:

- `/admin` - Net Profit/Loss updated
- `/admin/game-history` - New game appears with correct profit/loss
- `/admin/analytics` - Today's/Monthly/Yearly stats updated

**NO MANUAL REFRESH NEEDED - DATA IS SAVED INSTANTLY!**
