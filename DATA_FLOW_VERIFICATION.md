# Data Flow Verification: Database → Backend → Frontend

## 🎯 Focus: Game History & Analytics Data Flow

This document traces every step of data flow from database storage to frontend display.

---

## 1. 🎮 Game Completion → History Saved

### Step 1: Game Completes
**Location:** `server/routes.ts` lines 4051-4406 (`completeGame()`)

**When this happens:**
- Admin deals a card that matches the opening card
- System calls `completeGame(winner, winningCard)`

**What gets saved:**

#### A. Game Session Update
```typescript
await storage.updateGameSession(currentGameState.gameId, {
  phase: 'complete',
  winner,
  winningCard,
  status: 'completed'
});
```

**Database:** `game_sessions` table
```sql
UPDATE game_sessions SET
  phase = 'complete',
  winner = 'andar' (or 'bahar'),
  winning_card = '8♦',
  status = 'completed',
  updated_at = NOW()
WHERE game_id = '...';
```

#### B. Game Statistics Saved
**Code:** `server/routes.ts` lines 4208-4223
```typescript
await storage.saveGameStatistics({
  gameId: currentGameState.gameId,
  totalPlayers: uniquePlayers,
  totalBets: totalBetsAmount,
  totalWinnings: totalPayoutsAmount,
  houseEarnings: companyProfitLoss,
  profitLoss: companyProfitLoss,
  profitLossPercentage: profitLossPercentage,
  housePayout: totalPayoutsAmount,
  andarBetsCount: getBetCountForSide('andar'),
  baharBetsCount: getBetCountForSide('bahar'),
  andarTotalBet: currentGameState.round1Bets.andar + currentGameState.round2Bets.andar,
  baharTotalBet: currentGameState.round1Bets.bahar + currentGameState.round2Bets.bahar,
  uniquePlayers: uniquePlayers,
  gameDuration: 0
});
```

**Database:** `game_statistics` table
```sql
INSERT INTO game_statistics (
  game_id, total_players, total_bets, total_winnings,
  house_earnings, andar_bets_count, bahar_bets_count,
  andar_total_bet, bahar_total_bet, profit_loss,
  profit_loss_percentage, house_payout, game_duration
) VALUES (...);
```

**⚠️ CRITICAL:** Uses snake_case in database!

#### C. Game History Saved
**Code:** `server/routes.ts` lines 4311-4321
```typescript
await storage.saveGameHistory({
  gameId: currentGameState.gameId,
  openingCard: currentGameState.openingCard!,
  winner,
  winningCard,
  totalCards: currentGameState.andarCards.length + currentGameState.baharCards.length
});
```

**Database:** `game_history` table
```sql
INSERT INTO game_history (
  id, game_id, opening_card, winner, winning_card, total_cards, created_at
) VALUES (...);
```

#### D. Daily Statistics Updated
**Code:** `server/routes.ts` lines 4228-4235
```typescript
const today = new Date();
today.setHours(0, 0, 0, 0);
await storage.incrementDailyStats(today, {
  totalGames: 1,
  totalBets: totalBetsAmount,
  totalPayouts: totalPayoutsAmount,
  totalRevenue: companyProfitLoss,
  profitLoss: companyProfitLoss,
  uniquePlayers: uniquePlayers
});
```

**Database:** `daily_game_statistics` table
```sql
-- If record exists for today
UPDATE daily_game_statistics SET
  total_games = total_games + 1,
  total_bets = total_bets + X,
  total_payouts = total_payouts + Y,
  ...
WHERE date = '2025-11-01';

-- If no record exists for today
INSERT INTO daily_game_statistics (
  date, total_games, total_bets, total_payouts, ...
) VALUES ('2025-11-01', 1, X, Y, ...);
```

---

## 2. 📊 Analytics Data Retrieval

### Backend: Get Analytics Data

#### A. Admin Analytics Endpoint
**Location:** `server/routes.ts` lines 3822-3917

```typescript
app.get("/api/admin/analytics", generalLimiter, requireAuth, requireRole(['admin', 'super_admin']), 
  async (req, res) => {
    try {
      // Get daily stats
      const dailyStats = await storage.getDailyStats(todayDate);
      
      // Get monthly stats
      const monthlyStats = await storage.getMonthlyStats(monthYear);
      
      // Get yearly stats
      const yearlyStats = await storage.getYearlyStats(year);
      
      res.json({
        success: true,
        daily: dailyStats || defaultDailyStats,
        monthly: monthlyStats || defaultMonthlyStats,
        yearly: yearlyStats || defaultYearlyStats
      });
    }
  }
);
```

#### B. Storage Layer: Get Daily Stats
**Location:** `server/storage-supabase.ts` lines 1818-1843

```typescript
async getDailyStats(date: Date): Promise<DailyGameStatistics | null> {
  const dateStr = date.toISOString().split('T')[0]; // '2025-11-01'
  
  const { data, error } = await supabaseServer
    .from('daily_game_statistics')
    .select('*')
    .eq('date', dateStr)
    .single();

  if (error || !data) {
    return null;
  }

  // CRITICAL: Transform snake_case to camelCase
  return this.transformDailyStats(data);
}
```

#### C. Data Transformation
**Location:** `server/storage-supabase.ts` lines 1777-1816

```typescript
private transformDailyStats(data: any): DailyGameStatistics | null {
  if (!data) return null;
  
  return {
    id: data.id,
    date: data.date ? new Date(data.date) : new Date(),
    totalGames: Number(data.total_games ?? data.totalGames ?? 0),      // ← snake_case → camelCase
    totalBets: Number(data.total_bets ?? data.totalBets ?? 0),         // ← snake_case → camelCase
    totalPayouts: Number(data.total_payouts ?? data.totalPayouts ?? 0),// ← snake_case → camelCase
    totalRevenue: Number(data.total_revenue ?? data.totalRevenue ?? 0),// ← snake_case → camelCase
    profitLoss: Number(data.profit_loss ?? data.profitLoss ?? 0),      // ← snake_case → camelCase
    profitLossPercentage: Number(data.profit_loss_percentage ?? data.profitLossPercentage ?? 0),
    uniquePlayers: Number(data.unique_players ?? data.uniquePlayers ?? 0),
    peakBetsHour: Number(data.peak_bets_hour ?? data.peakBetsHour ?? 0),
    createdAt: data.created_at ? new Date(data.created_at) : new Date(),
    updatedAt: data.updated_at ? new Date(data.updated_at) : new Date()
  };
}
```

**⚠️ KEY POINT:** 
- Database stores: `total_games` (snake_case)
- Frontend expects: `totalGames` (camelCase)
- Transformation uses fallback: `data.total_games ?? data.totalGames`

---

## 3. 🌐 Frontend: Display Analytics

### A. Admin Dashboard Component
**Location:** `client/src/components/AnalyticsDashboard.tsx`

```typescript
const AnalyticsDashboard: React.FC = () => {
  const { dailyStats, monthlyStats, yearlyStats, realtimeData, loading } = useAdminStats();
  
  return (
    <>
      {/* Daily Stats */}
      <div>Total Games: {dailyStats?.totalGames || 0}</div>
      <div>Total Bets: {formatCurrency(dailyStats?.totalBets || 0)}</div>
      <div>Total Payouts: {formatCurrency(dailyStats?.totalPayouts || 0)}</div>
      <div>Profit/Loss: {formatCurrency(dailyStats?.profitLoss || 0)}</div>
    </>
  );
};
```

### B. useAdminStats Hook
**Location:** `client/src/hooks/useAdminStats.ts`

```typescript
export const useAdminStats = () => {
  const [dailyStats, setDailyStats] = useState<DailyStats | null>(null);
  
  const fetchAnalytics = async () => {
    const data = await apiClient.get<AnalyticsResponse>('/api/admin/analytics');
    
    setDailyStats(data.daily);
    setMonthlyStats(data.monthly);
    setYearlyStats(data.yearly);
  };
  
  useEffect(() => {
    fetchAnalytics();
  }, []);
  
  return { dailyStats, monthlyStats, yearlyStats };
};
```

---

## 4. 🎯 Game History Retrieval

### A. Backend: Get Game History
**Location:** `server/routes.ts` lines 3653-3676

```typescript
app.get("/api/game/history", async (req, res) => {
  try {
    const { limit = 50 } = req.query;
    const limitNum = parseInt(limit as string) || 50;
    
    const history = await storage.getGameHistory(limitNum);
    
    // Ensure all required fields have defaults
    const formattedHistory = (history || []).map(game => ({
      ...game,
      totalBets: game.totalBets || 0,
      andarTotalBet: game.andarTotalBet || 0,
      baharTotalBet: game.baharTotalBet || 0,
      totalWinnings: game.totalWinnings || 0,
      andarBetsCount: game.andarBetsCount || 0,
      baharBetsCount: game.baharBetsCount || 0,
      totalPlayers: game.totalPlayers || 0,
      round: game.round || 1
    }));
    
    res.json(formattedHistory);
  }
});
```

### B. Storage Layer: Get Game History
**Location:** `server/storage-supabase.ts` lines 1448-1508

```typescript
async getGameHistory(limit: number = 50): Promise<any[]> {
  // Step 1: Get game history records
  const { data: historyData, error: historyError } = await supabaseServer
    .from('game_history')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (historyError || !historyData || historyData.length === 0) {
    return [];
  }

  // Step 2: Get game statistics for each game
  const gameIds = historyData.map((h: any) => h.game_id);
  
  const { data: statsData, error: statsError } = await supabaseServer
    .from('game_statistics')
    .select('*')
    .in('game_id', gameIds);

  // Step 3: Create a map of game_id → statistics
  const statsMap = new Map();
  if (statsData) {
    statsData.forEach((stat: any) => {
      statsMap.set(stat.game_id, stat);
    });
  }

  // Step 4: Combine history with statistics and transform
  const enhancedHistory = historyData.map((history: any) => {
    const stats = statsMap.get(history.game_id);
    
    return {
      id: history.id,
      gameId: history.game_id,
      openingCard: history.opening_card,        // ← snake_case → camelCase
      winner: history.winner,
      winningCard: history.winning_card,        // ← snake_case → camelCase
      totalCards: history.total_cards,          // ← snake_case → camelCase
      round: history.round || 1,
      createdAt: history.created_at,            // ← snake_case → camelCase
      
      // Statistics data (with defaults if not available)
      totalBets: stats ? parseFloat(stats.total_bets || '0') : 0,           // ← snake_case → camelCase
      andarTotalBet: stats ? parseFloat(stats.andar_total_bet || '0') : 0,  // ← snake_case → camelCase
      baharTotalBet: stats ? parseFloat(stats.bahar_total_bet || '0') : 0,  // ← snake_case → camelCase
      totalWinnings: stats ? parseFloat(stats.total_winnings || '0') : 0,   // ← snake_case → camelCase
      andarBetsCount: stats ? (stats.andar_bets_count || 0) : 0,           // ← snake_case → camelCase
      baharBetsCount: stats ? (stats.bahar_bets_count || 0) : 0,           // ← snake_case → camelCase
      totalPlayers: stats ? (stats.total_players || 0) : 0,                // ← snake_case → camelCase
    };
  });

  return enhancedHistory;
}
```

**⚠️ CRITICAL STEPS:**
1. Fetch from `game_history` table (has basic info: winner, cards)
2. Fetch from `game_statistics` table (has betting amounts)
3. **JOIN them together** using `game_id`
4. Transform all snake_case → camelCase
5. Return enhanced history with both history + statistics

### C. Frontend: Display Game History
**Location:** `client/src/pages/GameHistoryPage.tsx`

```typescript
const GameHistoryPage: React.FC = () => {
  const [history, setHistory] = useState<EnhancedGameHistoryEntry[]>([]);
  
  useEffect(() => {
    const fetchHistory = async () => {
      const data = await apiClient.get<EnhancedGameHistoryEntry[]>('/api/game/history');
      setHistory(data);
    };
    fetchHistory();
  }, []);
  
  return (
    <table>
      {history.map(game => (
        <tr key={game.id}>
          <td>{game.gameId}</td>
          <td>{game.winner}</td>
          <td>{game.winningCard}</td>
          <td>{formatCurrency(game.andarTotalBet)}</td>
          <td>{formatCurrency(game.baharTotalBet)}</td>
          <td>{formatCurrency(game.totalBets)}</td>
        </tr>
      ))}
    </table>
  );
};
```

---

## 5. ✅ Verification Checklist

### Database Verification

```sql
-- 1. Check if game history is being saved
SELECT COUNT(*) FROM game_history;
SELECT * FROM game_history ORDER BY created_at DESC LIMIT 5;

-- 2. Check if game statistics are being saved
SELECT COUNT(*) FROM game_statistics;
SELECT * FROM game_statistics ORDER BY created_at DESC LIMIT 5;

-- 3. Check if they're linked (same game_id)
SELECT 
  gh.game_id,
  gh.winner,
  gh.winning_card,
  gs.total_bets,
  gs.andar_total_bet,
  gs.bahar_total_bet
FROM game_history gh
LEFT JOIN game_statistics gs ON gh.game_id = gs.game_id
ORDER BY gh.created_at DESC
LIMIT 5;

-- 4. Check daily statistics
SELECT * FROM daily_game_statistics 
WHERE date = CURRENT_DATE;

-- 5. Check if daily stats are being incremented
SELECT 
  date,
  total_games,
  total_bets,
  total_payouts,
  profit_loss
FROM daily_game_statistics
ORDER BY date DESC
LIMIT 7;
```

### Backend API Verification

```bash
# Test analytics endpoint
curl -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  http://localhost:5000/api/admin/analytics

# Expected response:
{
  "success": true,
  "daily": {
    "totalGames": 5,
    "totalBets": 12500,
    "totalPayouts": 10000,
    "profitLoss": 2500,
    ...
  },
  "monthly": { ... },
  "yearly": { ... }
}

# Test game history endpoint
curl http://localhost:5000/api/game/history?limit=10

# Expected response:
[
  {
    "id": "...",
    "gameId": "...",
    "openingCard": "8♠",
    "winner": "andar",
    "winningCard": "8♦",
    "andarTotalBet": 5000,
    "baharTotalBet": 2500,
    "totalBets": 7500,
    "totalWinnings": 5000,
    "totalPlayers": 3,
    ...
  }
]
```

### Frontend Verification

**Open Browser Console:**
```javascript
// Check if analytics data is received
// In Admin Dashboard
console.log('Daily Stats:', dailyStats);
console.log('Monthly Stats:', monthlyStats);

// In Game History Page
console.log('Game History:', history);

// Check data structure
console.log('First game:', history[0]);
console.log('Has andarTotalBet?', history[0]?.andarTotalBet);
console.log('Has totalBets?', history[0]?.totalBets);
```

---

## 6. 🐛 Common Issues & Debugging

### Issue 1: Analytics Showing 0
**Symptoms:** Dashboard shows "Total Games: 0" even after games played

**Debugging Steps:**

1. **Check Database:**
```sql
-- Are records being saved?
SELECT * FROM daily_game_statistics WHERE date = CURRENT_DATE;
```

If NO records:
- Problem: Game completion not saving stats
- Check: `server/routes.ts` → `completeGame()` → `incrementDailyStats()`
- Verify: No errors in server logs during game completion

If records exist but values are 0:
- Problem: Stats calculation or update logic
- Check: Are bets actually being placed? (check `player_bets` table)

2. **Check API Response:**
```bash
curl -H "Authorization: Bearer TOKEN" http://localhost:5000/api/admin/analytics
```

If returns null or undefined:
- Problem: Database query failing
- Check: `storage.getDailyStats()` implementation
- Verify: Date format matches database (YYYY-MM-DD)

If returns data but wrong format:
- Problem: Transformation not working
- Check: `transformDailyStats()` function
- Verify: Field names match (snake_case vs camelCase)

3. **Check Frontend:**
```javascript
// In browser console on admin page
console.log('useAdminStats result:', { dailyStats, monthlyStats, yearlyStats });
```

If null/undefined:
- Problem: API call failing or data not returned
- Check: Network tab in DevTools
- Verify: Token valid and endpoint accessible

If data exists but not displaying:
- Problem: Component rendering issue
- Check: Component is reading correct field names
- Verify: Using `dailyStats?.totalGames` not `dailyStats?.total_games`

---

### Issue 2: Game History Empty
**Symptoms:** Game history page shows no games

**Debugging Steps:**

1. **Check Database:**
```sql
-- Are history records being saved?
SELECT COUNT(*) FROM game_history;
SELECT * FROM game_history ORDER BY created_at DESC LIMIT 5;

-- Are statistics being saved?
SELECT COUNT(*) FROM game_statistics;
SELECT * FROM game_statistics ORDER BY created_at DESC LIMIT 5;
```

If NO records in game_history:
- Problem: `saveGameHistory()` not being called
- Check: `server/routes.ts` → `completeGame()` line 4311
- Verify: Game is actually completing (check server logs)
- Verify: `gameId` is valid (not 'default-game')

If records exist in game_history but not in game_statistics:
- Problem: `saveGameStatistics()` failing
- Check: Server logs for errors during game completion
- Verify: All required fields are being provided

2. **Check API Response:**
```bash
curl http://localhost:5000/api/game/history?limit=10
```

If returns empty array `[]`:
- Problem: Database has no records OR query failing
- Check: Database directly (see SQL above)
- Verify: No errors in server logs

If returns data but wrong format:
- Problem: Transformation issue
- Check: Field names in response
- Verify: Has both history data (winner, cards) AND statistics data (bet amounts)

3. **Check Frontend:**
```javascript
// In browser console on game history page
console.log('History data:', history);
console.log('First game:', history[0]);
```

If empty array:
- Problem: API not returning data
- Check: Network tab, verify request successful
- Verify: Response body contains data

If data exists but not displaying:
- Problem: Component rendering issue
- Check: Component mapping over history array correctly
- Verify: Using correct field names

---

### Issue 3: Wrong Values in Analytics
**Symptoms:** Total bets shows $0 even though games were played with bets

**Root Cause Analysis:**

**Scenario 1: Game completed with 0 bets**
```
Admin starts game → No players place bets → Admin deals winning card
Result: Game saves with totalBets = 0, uniquePlayers = 0
```

**Solution:** Check if players actually placed bets:
```sql
SELECT 
  g.game_id,
  g.winner,
  COUNT(pb.id) as bet_count,
  SUM(pb.amount) as total_bet_amount
FROM game_sessions g
LEFT JOIN player_bets pb ON g.game_id = pb.game_id
WHERE g.status = 'completed'
GROUP BY g.game_id
ORDER BY g.created_at DESC
LIMIT 10;
```

**Scenario 2: Transformation not working**
```typescript
// Database returns: { total_bets: "12500.00" }
// But code tries to access: data.totalBets
// Result: undefined → 0
```

**Solution:** Check transformation function has fallback:
```typescript
totalBets: Number(data.total_bets ?? data.totalBets ?? 0)
```

**Scenario 3: Decimal stored as string**
```typescript
// Database: total_bets = "12500.00" (string)
// Frontend expects: totalBets = 12500 (number)
```

**Solution:** Ensure parseFloat/Number conversion:
```typescript
totalBets: parseFloat(stats.total_bets || '0')
```

---

## 7. 🔍 Step-by-Step Trace Example

### Complete Data Flow for One Game

**Starting Point:** Admin starts game with opening card 8♠

#### Step 1: Game Start
- **Storage:** `game_sessions` INSERT with game_id, opening_card = '8♠'
- **Memory:** `currentGameState.gameId` = generated UUID

#### Step 2: Player Places Bet
- **Action:** Player clicks Andar, ₹2500
- **Storage:** `player_bets` INSERT with game_id, user_id, amount = 2500, side = 'andar'
- **Storage:** `users` UPDATE balance = balance - 2500
- **Memory:** `currentGameState.round1Bets.andar` += 2500

#### Step 3: Game Completes (Andar wins)
- **Action:** Admin deals 8♦ to Andar (matching card)
- **Storage:** Multiple writes happen:

```typescript
// A. Update game session
UPDATE game_sessions SET
  winner = 'andar',
  winning_card = '8♦',
  status = 'completed'
WHERE game_id = currentGameState.gameId;

// B. Save game statistics
INSERT INTO game_statistics (
  game_id,
  total_bets,        -- 2500
  andar_total_bet,   -- 2500
  bahar_total_bet,   -- 0
  total_winnings,    -- 5000 (2500 * 2 for 1:1 payout)
  house_earnings,    -- -2500 (lost money)
  profit_loss,       -- -2500
  total_players,     -- 1
  andar_bets_count,  -- 1
  bahar_bets_count   -- 0
) VALUES (...);

// C. Save game history
INSERT INTO game_history (
  game_id,
  opening_card,  -- '8♠'
  winner,        -- 'andar'
  winning_card,  -- '8♦'
  total_cards    -- 2
) VALUES (...);

// D. Update daily stats
UPDATE daily_game_statistics SET
  total_games = total_games + 1,        -- +1
  total_bets = total_bets + 2500,       -- +2500
  total_payouts = total_payouts + 5000, -- +5000
  profit_loss = profit_loss - 2500      -- -2500
WHERE date = '2025-11-01';

// E. Update user balance (winner)
UPDATE users SET
  balance = balance + 5000,           -- Gets back 2500 bet + 2500 winnings
  total_winnings = total_winnings + 2500,
  games_played = games_played + 1,
  games_won = games_won + 1
WHERE id = user_id;

// F. Update bet status
UPDATE player_bets SET
  status = 'won',
  actual_payout = 5000
WHERE game_id = currentGameState.gameId AND user_id = user_id;
```

#### Step 4: Analytics Retrieval (Admin)
**Frontend calls:** `GET /api/admin/analytics`

**Backend executes:**
```typescript
// Get daily stats
SELECT * FROM daily_game_statistics WHERE date = '2025-11-01';
// Returns: { total_games: 1, total_bets: '2500.00', ... }

// Transform to camelCase
{
  totalGames: 1,
  totalBets: 2500,
  totalPayouts: 5000,
  profitLoss: -2500
}

// Send to frontend
res.json({ success: true, daily: { ... } });
```

**Frontend displays:**
```
Total Games: 1
Total Bets: ₹2,500
Total Payouts: ₹5,000
Profit/Loss: -₹2,500
```

#### Step 5: History Retrieval (Anyone)
**Frontend calls:** `GET /api/game/history`

**Backend executes:**
```typescript
// Get history
SELECT * FROM game_history ORDER BY created_at DESC LIMIT 50;
// Returns: [{ game_id: '...', winner: 'andar', ... }]

// Get statistics for those games
SELECT * FROM game_statistics WHERE game_id IN (...);
// Returns: [{ game_id: '...', total_bets: '2500.00', ... }]

// Combine and transform
[
  {
    gameId: '...',
    winner: 'andar',
    winningCard: '8♦',
    openingCard: '8♠',
    totalBets: 2500,
    andarTotalBet: 2500,
    baharTotalBet: 0,
    totalWinnings: 5000,
    ...
  }
]
```

**Frontend displays in table:**
```
| Game ID | Winner | Opening | Winning | Andar Bets | Bahar Bets | Total |
|---------|--------|---------|---------|------------|------------|-------|
| abc123  | ANDAR  | 8♠      | 8♦      | ₹2,500     | ₹0         | ₹2,500|
```

---

## 8. 🎯 Quick Verification Commands

### Run these in order to verify everything is working:

```bash
# 1. Check if database has data
psql $DATABASE_URL -c "SELECT COUNT(*) as game_count FROM game_history;"
psql $DATABASE_URL -c "SELECT COUNT(*) as stats_count FROM game_statistics;"
psql $DATABASE_URL -c "SELECT COUNT(*) as daily_count FROM daily_game_statistics;"

# 2. Check latest game
psql $DATABASE_URL -c "
  SELECT 
    gh.game_id,
    gh.winner,
    gh.winning_card,
    gs.total_bets,
    gs.andar_total_bet,
    gs.bahar_total_bet
  FROM game_history gh
  LEFT JOIN game_statistics gs ON gh.game_id = gs.game_id
  ORDER BY gh.created_at DESC
  LIMIT 1;
"

# 3. Test API endpoints
curl http://localhost:5000/api/game/history?limit=1 | jq '.[0]'
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
  http://localhost:5000/api/admin/analytics | jq '.daily'

# 4. Check logs for any errors during game completion
grep -i "error.*game" logs/server.log
grep -i "save.*statistics" logs/server.log
```

---

## ✅ Final Checklist

- [ ] Game history records created in `game_history` table
- [ ] Game statistics saved in `game_statistics` table  
- [ ] Both linked by same `game_id`
- [ ] Daily stats incremented in `daily_game_statistics`
- [ ] Backend transforms snake_case → camelCase correctly
- [ ] API endpoints return data in correct format
- [ ] Frontend receives and displays data
- [ ] Analytics calculated from actual saved history
- [ ] No "0" values when data exists in database

**If any checkbox fails, use the debugging steps above to identify and fix the issue!**

