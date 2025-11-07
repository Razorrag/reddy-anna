# 🎯 COMPLETE GAME COMPLETION DATA FLOW

## When a game ends, here's what happens:

### 1️⃣ **Winner Determination** (game.ts line 85-106)
- Calculates payouts based on Andar Bahar rules
- Round 1: Andar 1:1, Bahar 1:0 (refund)
- Round 2: Andar 1:1 on all, Bahar 1:1 on R1 + 1:0 on R2
- Round 3: Both sides 1:1
- **Result:** `totalPayoutsAmount` = sum of all user payouts

### 2️⃣ **Database Updates** (game.ts line 172-199)
#### A. Apply Payouts & Update Bets (line 172)
```typescript
await storage.applyPayoutsAndupdateBets(payoutArray, winningBetIds, losingBetIds)
```
**Updates:**
- ✅ `users.balance` - Add payout to winner's balance
- ✅ `player_bets.status` - Set to 'won' or 'lost'
- ✅ `player_bets.actual_payout` - Set payout amount for winners
- ✅ `user_transactions` - Create transaction records

#### B. Update User Statistics (line 193)
```typescript
await storage.updateUserGameStats(userId, won, totalUserBets, userPayout)
```
**Updates:**
- ✅ `users.games_played` - Increment by 1
- ✅ `users.games_won` - Increment if won
- ✅ `users.total_winnings` - Add profit (payout - bet)
- ✅ `users.total_losses` - Add loss if lost

### 3️⃣ **Save Game History** (game.ts line 485)
```typescript
await storage.saveGameHistory(historyData)
```
**Updates:**
- ✅ `game_history` table with:
  - gameId, openingCard, winner, winningCard
  - totalCards, round
  - **totalBets** = totalBetsAmount
  - **totalPayouts** = totalPayoutsAmount

### 4️⃣ **Complete Game Session** (game.ts line 491)
```typescript
await storage.completeGameSession(gameId, winningSide, winningCard)
```
**Updates:**
- ✅ `game_sessions.status` = 'completed'
- ✅ `game_sessions.winner` = winningSide
- ✅ `game_sessions.winning_card` = winningCard

### 5️⃣ **Save Game Statistics** (game.ts line 510)
```typescript
await storage.saveGameStatistics({...})
```
**Updates:**
- ✅ `game_statistics` table with:
  - totalPlayers, totalBets, totalWinnings
  - houseEarnings, andarBetsCount, baharBetsCount
  - andarTotalBet, baharTotalBet
  - **profitLoss** = companyProfitLoss
  - **profitLossPercentage**
  - **housePayout** = totalPayoutsAmount
  - gameDuration, uniquePlayers

### 6️⃣ **Update Analytics Tables** (game.ts line 540-570) ✅ NEW!
```typescript
await storage.incrementDailyStats(today, {...})
await storage.incrementMonthlyStats(monthYear, {...})
await storage.incrementYearlyStats(year, {...})
```
**Updates:**
- ✅ `daily_game_statistics` - Today's aggregated stats
- ✅ `monthly_game_statistics` - This month's aggregated stats
- ✅ `yearly_game_statistics` - This year's aggregated stats

## 📊 SUMMARY OF ALL TABLES UPDATED:

| Table | Fields Updated | When |
|-------|---------------|------|
| `users` | balance, games_played, games_won, total_winnings, total_losses | Step 2 |
| `player_bets` | status, actual_payout | Step 2A |
| `user_transactions` | New transaction records | Step 2A |
| `game_history` | All game details, totalBets, totalPayouts | Step 3 |
| `game_sessions` | status, winner, winning_card | Step 4 |
| `game_statistics` | Per-game stats with profitLoss, housePayout | Step 5 |
| `daily_game_statistics` | Today's aggregated stats | Step 6 |
| `monthly_game_statistics` | This month's aggregated stats | Step 6 |
| `yearly_game_statistics` | This year's aggregated stats | Step 6 |

## ✅ VERIFICATION CHECKLIST:

After a game completes, check these queries:

```sql
-- 1. Check player_bets has payouts
SELECT bet_id, user_id, amount, status, actual_payout 
FROM player_bets 
WHERE game_id = 'YOUR_GAME_ID';

-- 2. Check game_statistics
SELECT game_id, total_bets, total_winnings, profit_loss, house_payout
FROM game_statistics
WHERE game_id = 'YOUR_GAME_ID';

-- 3. Check daily stats
SELECT * FROM daily_game_statistics 
WHERE date = CURRENT_DATE;

-- 4. Check monthly stats
SELECT * FROM monthly_game_statistics 
WHERE month_year = TO_CHAR(CURRENT_DATE, 'YYYY-MM');

-- 5. Check user stats
SELECT id, games_played, games_won, total_winnings, total_losses
FROM users
WHERE id = 'YOUR_USER_ID';
```

## 🔴 CRITICAL: Server Logs to Watch

When a game completes, you should see these logs:
```
💰 Game Analytics - Bets: ₹X, Payouts: ₹Y, Profit: ₹Z
✅ Database updated: X payout records, Y winning bets, Z losing bets
✅ Updated stats for user XXX: won=true, bet=X, payout=Y
✅ Game history saved successfully for gameId: XXX
✅ Game session completed in database: XXX
✅ Game statistics saved for gameId: XXX
✅ Analytics tables updated (daily/monthly/yearly) for gameId: XXX
```

If ANY of these logs are missing, that step failed!
