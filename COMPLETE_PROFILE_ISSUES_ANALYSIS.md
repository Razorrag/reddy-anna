# 🔍 COMPLETE PROFILE & CALCULATION ISSUES ANALYSIS

## Issues Found

### 1. 🚨 CRITICAL: Game History Not Showing (Foreign Key Error)

**Error:**
```
Could not find a relationship between 'player_bets' and 'game_history'
Hint: Perhaps you meant 'game_sessions' instead of 'game_history'
```

**Root Cause:**
- Added foreign key constraint `fk_player_bets_game_history`
- But `game_history` doesn't exist when bet is placed!
- Game history is only saved AFTER game completes
- Foreign key blocks bet placement

**Fix Required:**
```sql
-- Remove the foreign key constraint
ALTER TABLE player_bets
DROP CONSTRAINT IF EXISTS fk_player_bets_game_history;
```

**Alternative Solution:**
Use a different query approach that doesn't require foreign key:

```typescript
// Option 1: Manual JOIN without foreign key
const { data, error } = await supabaseServer
  .from('player_bets')
  .select('*')
  .eq('user_id', userId);

// Then manually fetch game_history for each game_id
const gameIds = [...new Set(data.map(bet => bet.game_id))];
const { data: history } = await supabaseServer
  .from('game_history')
  .select('*')
  .in('game_id', gameIds);

// Merge the data manually
```

**Option 2: Use RPC function:**
```sql
CREATE OR REPLACE FUNCTION get_user_game_history(p_user_id TEXT)
RETURNS TABLE (
  game_id TEXT,
  opening_card TEXT,
  winner TEXT,
  winning_card TEXT,
  total_bets NUMERIC,
  total_payout NUMERIC,
  net_profit NUMERIC,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    gh.game_id,
    gh.opening_card,
    gh.winner,
    gh.winning_card,
    SUM(pb.amount) as total_bets,
    SUM(pb.actual_payout) as total_payout,
    SUM(pb.actual_payout) - SUM(pb.amount) as net_profit,
    gh.created_at
  FROM game_history gh
  INNER JOIN player_bets pb ON gh.game_id = pb.game_id
  WHERE pb.user_id = p_user_id
  GROUP BY gh.game_id, gh.opening_card, gh.winner, gh.winning_card, gh.created_at
  ORDER BY gh.created_at DESC;
END;
$$ LANGUAGE plpgsql;
```

---

### 2. ⚠️ Player Profile Stats Not Updating

**Issue:**
- `games_played`, `games_won`, `total_winnings`, `total_losses` not updating

**Current Code:**
```typescript
// server/storage-supabase.ts line 1135-1183
async updateUserGameStats(userId: string, won: boolean, betAmount: number, payoutAmount: number)
```

**Verification Needed:**
1. Is this function being called?
2. Are the calculations correct?
3. Is the database update succeeding?

**Check:**
```sql
-- Verify user stats are being updated
SELECT 
  id,
  phone,
  games_played,
  games_won,
  total_winnings,
  total_losses,
  balance,
  updated_at
FROM users
WHERE id = '9876543210'
ORDER BY updated_at DESC;
```

---

### 3. ⚠️ Admin Analytics Not Updating

**Issue:**
- Admin dashboard shows stale/incorrect data
- Daily/monthly/yearly stats not updating

**Files to Check:**
- `server/game.ts` - Analytics update after game complete
- `server/storage-supabase.ts` - `updateDailyAnalytics`, `updateMonthlyAnalytics`, `updateYearlyAnalytics`
- `server/controllers/adminAnalyticsController.ts` - Admin analytics endpoints

**Verification:**
```sql
-- Check if analytics tables are being updated
SELECT * FROM daily_analytics ORDER BY date DESC LIMIT 5;
SELECT * FROM monthly_analytics ORDER BY month_year DESC LIMIT 5;
SELECT * FROM yearly_analytics ORDER BY year DESC LIMIT 5;
```

---

### 4. ⚠️ Player Profile Game History Empty

**Issue:**
- Player profile shows no game history
- Even though games were played

**Root Causes:**
1. Foreign key constraint blocking query
2. Query using wrong table (game_sessions vs game_history)
3. No data in game_history table

**Debug Steps:**
```sql
-- 1. Check if game_history has data
SELECT COUNT(*) FROM game_history;

-- 2. Check if player_bets has data for user
SELECT COUNT(*) FROM player_bets WHERE user_id = '9876543210';

-- 3. Check if game_ids match
SELECT DISTINCT pb.game_id, gh.game_id
FROM player_bets pb
LEFT JOIN game_history gh ON pb.game_id = gh.game_id
WHERE pb.user_id = '9876543210'
LIMIT 10;

-- 4. Check for orphaned bets (bets without game_history)
SELECT pb.game_id, COUNT(*) as bet_count
FROM player_bets pb
LEFT JOIN game_history gh ON pb.game_id = gh.game_id
WHERE pb.user_id = '9876543210'
  AND gh.game_id IS NULL
GROUP BY pb.game_id;
```

---

### 5. ⚠️ Calculations Incorrect

**Potential Issues:**

#### A. Net Profit Calculation
```typescript
// Current: server/controllers/userDataController.ts line 85
const netProfit = totalWinnings - totalLosses;
```

**Problem:** This assumes `totalWinnings` and `totalLosses` are NET values, but they might be GROSS.

**Fix:**
```typescript
// totalWinnings should be NET profit (payout - bet)
// totalLosses should be NET loss (bet - payout)
// So netProfit = totalWinnings - totalLosses is correct IF the values are NET
```

#### B. Win Rate Calculation
```typescript
// Missing in current code
const winRate = gamesPlayed > 0 ? (gamesWon / gamesPlayed) * 100 : 0;
```

#### C. Average Bet Calculation
```typescript
// Missing in current code
const totalBetAmount = await getTotalBetAmount(userId);
const averageBet = gamesPlayed > 0 ? totalBetAmount / gamesPlayed : 0;
```

---

## 🔧 FIXES REQUIRED

### Fix #1: Remove Foreign Key (URGENT)

**File:** `REMOVE_FOREIGN_KEY.sql`

```sql
ALTER TABLE player_bets
DROP CONSTRAINT IF EXISTS fk_player_bets_game_history;
```

**Run this immediately to unblock bet placement!**

---

### Fix #2: Create RPC Function for Game History

**File:** `CREATE_GAME_HISTORY_RPC.sql`

```sql
CREATE OR REPLACE FUNCTION get_user_game_history(p_user_id TEXT, p_limit INT DEFAULT 20)
RETURNS TABLE (
  game_id TEXT,
  opening_card TEXT,
  winner TEXT,
  winning_card TEXT,
  winning_round INT,
  total_cards INT,
  total_bets NUMERIC,
  total_payout NUMERIC,
  net_profit NUMERIC,
  result TEXT,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    gh.game_id,
    gh.opening_card,
    gh.winner,
    gh.winning_card,
    gh.winning_round,
    gh.total_cards,
    SUM(pb.amount) as total_bets,
    SUM(COALESCE(pb.actual_payout, 0)) as total_payout,
    SUM(COALESCE(pb.actual_payout, 0)) - SUM(pb.amount) as net_profit,
    CASE 
      WHEN SUM(COALESCE(pb.actual_payout, 0)) > SUM(pb.amount) THEN 'win'
      WHEN SUM(COALESCE(pb.actual_payout, 0)) = SUM(pb.amount) THEN 'refund'
      ELSE 'loss'
    END as result,
    gh.created_at
  FROM game_history gh
  INNER JOIN player_bets pb ON gh.game_id = pb.game_id
  WHERE pb.user_id = p_user_id
  GROUP BY gh.game_id, gh.opening_card, gh.winner, gh.winning_card, gh.winning_round, gh.total_cards, gh.created_at
  ORDER BY gh.created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;
```

---

### Fix #3: Update Client to Use RPC Function

**File:** `server/storage-supabase.ts` line 2126

```typescript
async getUserGameHistory(userId: string): Promise<any[]> {
  try {
    // Use RPC function instead of JOIN
    const { data, error } = await supabaseServer
      .rpc('get_user_game_history', {
        p_user_id: userId,
        p_limit: 100
      });

    if (error) {
      console.error('❌ Error getting user game history:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('❌ getUserGameHistory error:', error);
    return [];
  }
}
```

---

### Fix #4: Add Missing Analytics Calculations

**File:** `server/controllers/userDataController.ts`

Add these calculations to `getUserAnalytics`:

```typescript
// Calculate win rate
const winRate = gamesPlayed > 0 ? (gamesWon / gamesPlayed) * 100 : 0;

// Calculate average bet (need to query player_bets)
const { data: bets } = await supabaseServer
  .from('player_bets')
  .select('amount')
  .eq('user_id', req.user.id);

const totalBetAmount = bets?.reduce((sum, bet) => sum + parseFloat(bet.amount || '0'), 0) || 0;
const averageBet = gamesPlayed > 0 ? totalBetAmount / gamesPlayed : 0;

// Find biggest win
const biggestWin = bets?.reduce((max, bet) => {
  const payout = parseFloat(bet.actual_payout || '0');
  const betAmount = parseFloat(bet.amount || '0');
  const profit = payout - betAmount;
  return profit > max ? profit : max;
}, 0) || 0;

// Add to response
res.json({
  success: true,
  data: {
    totalDeposits,
    totalWithdrawals,
    totalWins: totalWinnings,
    totalLosses,
    netProfit,
    gamesPlayed,
    gamesWon,
    winRate,           // ✅ NEW
    averageBet,        // ✅ NEW
    biggestWin,        // ✅ NEW
    currentBalance: parseFloat(user.balance || '0')
  }
});
```

---

## 🚀 IMPLEMENTATION ORDER

1. **URGENT:** Run `REMOVE_FOREIGN_KEY.sql` to unblock bets
2. **HIGH:** Run `CREATE_GAME_HISTORY_RPC.sql` to fix game history
3. **HIGH:** Update `storage-supabase.ts` to use RPC function
4. **MEDIUM:** Add missing analytics calculations
5. **LOW:** Verify all stats are updating correctly

---

## 🧪 TESTING CHECKLIST

### Test Game History
- [ ] Place bet
- [ ] Complete game
- [ ] Check player profile → Game History tab
- [ ] Should show completed game with correct data

### Test Player Stats
- [ ] Play multiple games (win some, lose some)
- [ ] Check player profile → Overview tab
- [ ] Verify: games_played, games_won, total_winnings, total_losses
- [ ] Verify: win rate, average bet, biggest win

### Test Admin Analytics
- [ ] Complete multiple games
- [ ] Check admin dashboard → Analytics tab
- [ ] Verify: daily stats, monthly stats, yearly stats
- [ ] Verify: profit/loss, total bets, total payouts

---

**Next Steps:** Let me know which fix to implement first!
