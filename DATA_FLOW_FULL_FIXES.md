# Andar Bahar Platform - Full Data Flow & Fixes Document

This document defines ALL required fixes for:

- User game history (showing correct winnings/losses)
- Admin game history
- Bonus system (user + admin)
- Analytics (daily/monthly/yearly/all-time)
- User-level net profit/loss
- Response shape consistency

Apply this end-to-end so every number on frontend matches the database.

---

## 1. Global Conventions (MUST FOLLOW)

1. Response envelope (all APIs):
   - Always:
     - `{ success: true, data: ... }` on success
     - `{ success: false, error: "message" }` on failure
   - Never mix `user:`/`result:`/`stats:` top-level keys.

2. Date/time fields:
   - Use `created_at` / `updated_at` in DB.
   - In API response, you MAY map to `createdAt` / `updatedAt` (camelCase) but keep consistent.

3. Money fields:
   - Always numeric in API (no strings).
   - Frontend is responsible for formatting (₹, commas).

4. Enums:
   - Use canonical enums everywhere and map to UI:
     - request_status: `pending | approved | rejected | completed`
     - transaction_status: `pending | completed | failed`
     - bet status: `pending | won | lost | cancelled`
     - bonus status (deposit_bonuses / referral_bonuses):
       - `locked | unlocked | credited | expired | forfeited` (for deposit)
       - `pending | credited | expired` (for referral)

---

## 2. User Game History - FIXES

Goal:
- For each game a user participated in, show:
  - Their total bet, total payout, net profit/loss
  - Winner, opening card, timestamp
- This must match `player_bets` + `game_history`.

### 2.1 Backend: Implement canonical user game history

Endpoint:
- `GET /api/user/game-history?limit=&offset=`

Responsibilities:
- Auth required.
- For `user_id = req.user.id`:
  - Find distinct `game_id` from `player_bets` where this user has at least one bet
  - Join with `game_history` by `game_id`
  - For each (user, game):
    - `yourTotalBet` = `SUM(amount)` from `player_bets`
    - `yourTotalPayout` = `SUM(actual_payout)` from `player_bets`
    - `yourNetProfit` = `yourTotalPayout - yourTotalBet`
    - `result`:
      - `"win"` if `yourNetProfit > 0`
      - `"loss"` if `yourNetProfit < 0`
      - `"no_bet"` if `yourTotalBet = 0`
      - `"even"` if `yourNetProfit = 0` and bet exists
- Use `game_history`:
  - `winner`
  - `opening_card`
  - `created_at`
  - `winning_card`, `winning_round` if needed.

Suggested response shape:

```json
{
  "success": true,
  "data": [
    {
      "id": "game_history_row_id",
      "gameId": "AB-2025-000123",
      "openingCard": "7♠",
      "winner": "andar",
      "winningCard": "7♦",
      "winningRound": 12,
      "yourTotalBet": 1000,
      "yourTotalPayout": 1900,
      "yourNetProfit": 900,
      "result": "win",
      "createdAt": "2025-11-09T10:20:00.000Z"
    }
  ],
  "pagination": {
    "limit": 20,
    "offset": 0,
    "hasMore": true
  }
}
```

Implementation notes:
- Build SQL on top of:
  - `player_bets` (filtered by user_id)
  - `LEFT JOIN game_history ON game_history.game_id = player_bets.game_id`
- Important: Do NOT rely on any stale or precomputed `yourNetProfit` in DB; compute in query.

### 2.2 Frontend: Profile game history tab

File:
- `[client/src/pages/Profile.tsx](client/src/pages/Profile.tsx:1324)`

Requirements:
- `useUserProfile().fetchGameHistory` must call `/api/user/game-history`.
- Expect `response.data` as described above.
- Render:
  - Use `game.yourNetProfit`:
    - > 0: green "+₹X Net Profit"
    - < 0: red "-₹X Net Loss"
    - = 0 and bet exists: neutral "Break even"
  - Winner/opening card from `game.winner`, `game.openingCard`.
- Do NOT hardcode zeros if values exist.
- Ensure key usage:
  - If backend sends `createdAt`, UI uses that; or normalize it once in context.

---

## 3. Admin Game History - FIXES

Goal:
- Admin must see:
  - Per game: bets, payouts, house profit/loss
  - Per-round breakdown (andar/bahar)

### 3.1 Backend: /api/admin/game-history

Endpoint:
- `GET /api/admin/game-history?limit=&offset=&dateFrom=&dateTo=`

Data source:
- `game_history` + `game_statistics`

Per row:
- `gameId` = `game_history.game_id`
- `openingCard`, `winner`, `winningCard`, `winningRound`
- `totalBets`:
  - from `game_statistics.total_bets` OR recompute from `player_bets` if needed
- `totalPayouts`:
  - from `game_history.total_payouts` OR `game_statistics.total_winnings` (if defined as payouts)
- `profitLoss`:
  - from `game_statistics.profit_loss`
- `roundPayouts`:
  - from `game_history.round_payouts` JSONB:
    - structure per BETTING_SYSTEM_FIXES_COMPLETE:  
      `{"round1":{"andar":X,"bahar":Y},"round2":{"andar":A,"bahar":B}}`

Response:

```json
{
  "success": true,
  "data": [
    {
      "gameId": "AB-2025-000123",
      "openingCard": "7♠",
      "winner": "andar",
      "totalBets": 50000,
      "totalPayouts": 41000,
      "profitLoss": 9000,
      "roundPayouts": {
        "round1": { "andar": 10000, "bahar": 0 },
        "round2": { "andar": 5000, "bahar": 26000 }
      },
      "createdAt": "2025-11-09T10:20:00.000Z"
    }
  ]
}
```

### 3.2 Game settlement logic

On each game completion:
- Steps (MUST be atomic/logically grouped):
  1. Update `player_bets`:
     - Set `status` to `won`/`lost`
     - Set `actual_payout`
  2. Update `users`:
     - Balance
     - `games_played`, `games_won`
     - `total_winnings`, `total_losses`
  3. Insert `game_history`:
     - `total_payouts` = `SUM(actual_payout)`
     - `round_payouts` JSONB as specified
  4. Insert `game_statistics`:
     - `total_bets`, `total_winnings` (payouts), `profit_loss` (house)
  5. Update analytics tables (see section 4)

---

## 4. Analytics (Admin) - FIXES

Goal:
- `/admin` and `/admin-analytics` show correct:
  - Today, this month, this year, all-time
  - Total bets, payouts, profit/loss, net house profit
- All computed on backend with analytics tables.

Tables:
- `daily_game_statistics`
- `monthly_game_statistics`
- `yearly_game_statistics`

These already have:
- `total_games`
- `total_bets`
- `total_payouts`
- `profit_loss`
- `net_house_profit`
- `total_player_winnings`
- `total_player_losses`

### 4.1 Backend: /api/admin/statistics

Endpoint:
- `GET /api/admin/statistics`

Data:
- Aggregate from:
  - `users` (total_users, active_users, etc.)
  - `daily_game_statistics`, `monthly_game_statistics`, `yearly_game_statistics`
  - Or from `user_transactions` and `game_statistics` if consistent.

Return:

```json
{
  "success": true,
  "data": {
    "totalUsers": 1234,
    "activeUsers": 456,
    "totalBetsAllTime": 1000000,
    "totalPayoutsAllTime": 850000,
    "netHouseProfitAllTime": 150000
  }
}
```

Rules:
- `netHouseProfitAllTime` = reliable:
  - Prefer `SUM(net_house_profit)` from `daily_game_statistics`.
- Use this endpoint ONLY for high-level totals and counts.

### 4.2 Backend: /api/admin/analytics

Endpoint:
- `GET /api/admin/analytics?period=daily|monthly|yearly`

Implementation:

- `period=daily`:
  - Use today’s row from `daily_game_statistics`.
- `period=monthly`:
  - Current month row from `monthly_game_statistics`.
- `period=yearly`:
  - Current year row from `yearly_game_statistics`.

Response:

```json
{
  "success": true,
  "data": {
    "totalGames": 120,
    "totalBets": 500000,
    "totalPayouts": 430000,
    "profitLoss": 70000,
    "netHouseProfit": 70000,
    "totalPlayerWinnings": 430000,
    "totalPlayerLosses": 500000
  }
}
```

### 4.3 Backend: /api/admin/analytics/all-time

Endpoint:
- `GET /api/admin/analytics/all-time`

Implementation:
- SUM over `daily_game_statistics`:
  - `totalGames`, `totalBets`, `totalPayouts`, `profit_loss`, `net_house_profit`, etc.

Response:

```json
{
  "success": true,
  "data": {
    "totalGames": 12345,
    "totalBets": 10000000,
    "totalPayouts": 8600000,
    "profitLoss": 1400000,
    "netHouseProfit": 1400000
  }
}
```

### 4.4 Frontend: AdminAnalytics and main Admin

Files:
- `[client/src/pages/admin-analytics.tsx](client/src/pages/admin-analytics.tsx:1)`
- `AnalyticsDashboard` component
- Admin main dashboard page (routes to AdminAnalytics)

Rules:
- On `/admin`:
  - Fetch:
    - `/api/admin/statistics`
    - `/api/admin/analytics?period=daily`
  - Show:
    - High-level totals from `/admin/statistics`
    - Today metrics from daily analytics.
- On `/admin-analytics`:
  - Fetch:
    - `/api/admin/analytics?period=daily|monthly|yearly`
    - `/api/admin/analytics/all-time`
    - `/api/admin/realtime-stats` (if needed)
  - Use backend values directly (no recomputing profit/loss).

---

## 5. Bonus System (User + Admin) - FIXES

Goal:
- User:
  - Sees bonus summary, bonus lists, bonus history.
- Admin:
  - Sees global bonus stats, per-player analytics, referral data.

### 5.1 User Bonus APIs

1) `GET /api/user/bonus-summary`

Logic:
- For auth user:
  - From `users` table:
    - `deposit_bonus_available`
    - `referral_bonus_available`
    - `total_bonus_earned`
  - From `deposit_bonuses` / `referral_bonuses`:
    - Totals by status.

Response:

```json
{
  "success": true,
  "data": {
    "totals": {
      "available": 500,         // current claimable
      "credited": 2000,         // already credited to balance
      "lifetime": 2500          // total bonus ever
    },
    "depositBonuses": {
      "locked": 300,
      "credited": 1500
    },
    "referralBonuses": {
      "locked": 200,
      "credited": 500
    }
  }
}
```

2) `GET /api/user/deposit-bonuses`

- From `deposit_bonuses` where `user_id = currentUser`.
- Map each row:
  - `id`, `depositAmount`, `bonusAmount`, `bonusPercentage`, `wageringRequired`, `wageringCompleted`, `status`, `createdAt`, `unlockedAt`, `creditedAt`.

3) `GET /api/user/referral-bonuses`

- From `referral_bonuses` where `referrer_user_id = currentUser` or `referred_user_id = currentUser` depending on UI.
- Return `depositAmount`, `bonusAmount`, `status`, `credited_at`, etc.

4) `GET /api/user/bonus-transactions?limit=&offset=`

- From `bonus_transactions` where `user_id = currentUser`.
- Each:
  - `id`, `bonusType`, `bonusSourceId`, `amount`, `action`, `description`, `createdAt`, etc.
- Response:
  - `{ success: true, data: [...], hasMore: boolean }`

5) `POST /api/user/claim-bonus`

- Apply available bonus from `users.deposit_bonus_available` / `referral_bonus_available` to main balance.
- Insert into `bonus_transactions` and `user_transactions` (type `bonus_applied`).
- Update `users` accordingly.

### 5.2 Frontend: Profile.tsx Bonuses Tab

File:
- `[client/src/pages/Profile.tsx](client/src/pages/Profile.tsx:1438)`

Fixes:
- Fetch:

```ts
const [summaryRes, depositRes, referralRes, transactionsRes] = await Promise.all([
  apiClient.get('/api/user/bonus-summary'),
  apiClient.get('/api/user/deposit-bonuses'),
  apiClient.get('/api/user/referral-bonuses'),
  apiClient.get('/api/user/bonus-transactions?limit=20&offset=0')
]);
```

- Set state:

```ts
setBonusSummary(summaryRes.data || summaryRes);
setDepositBonuses(depositRes.data || depositRes);
setReferralBonuses(referralRes.data || referralRes);
setBonusTransactions(transactionsRes.data || transactionsRes);
setBonusHasMore(transactionsRes.hasMore || false);
```

- Fix the bug:
  - Replace `setBonusTransactions(transactionsRes.data || transactionsRes.data || []);` with correct version above.

### 5.3 Admin Bonus APIs

1) `GET /api/admin/bonus-transactions`

- From `bonus_transactions bt`
- Join `users u` on `bt.user_id = u.id`
- Map:

```json
{
  "success": true,
  "data": [
    {
      "id": "txn-id",
      "userId": "user-id",
      "username": "9876543210",
      "type": "deposit_bonus",
      "amount": 500,
      "status": "applied",
      "timestamp": "2025-11-09T10:00:00.000Z",
      "description": "Deposit bonus 5% of ₹10000",
      "relatedAmount": 10000
    }
  ]
}
```

2) `GET /api/admin/referral-data`

- From `user_referrals ur`
- Join `users` for usernames.
- Map to:

```json
{
  "success": true,
  "data": [
    {
      "id": "ref-id",
      "referrerId": "u1",
      "referrerUsername": "9000000000",
      "referredId": "u2",
      "referredUsername": "9000000001",
      "depositAmount": 10000,
      "bonusAmount": 100,
      "status": "completed",
      "createdAt": "...",
      "bonusAppliedAt": "..."
    }
  ]
}
```

3) `GET /api/admin/player-bonus-analytics`

- Aggregated per `user_id` from:
  - `users` (current available)
  - `deposit_bonuses`, `referral_bonuses`
  - `bonus_transactions`
- Response for each user:

```json
{
  "userId": "u1",
  "username": "9000000000",
  "phone": "9000000000",
  "fullName": "Test User",
  "currentDepositBonus": 300,
  "currentReferralBonus": 200,
  "currentTotalPending": 500,
  "totalDepositBonusReceived": 1500,
  "totalReferralBonusReceived": 500,
  "totalBonusApplied": 1800,
  "totalBonusEarned": 2000,
  "depositBonusCount": 5,
  "referralBonusCount": 3,
  "totalBonusTransactions": 20,
  "firstBonusDate": "2025-10-01T...",
  "lastBonusDate": "2025-11-09T...",
  "userCreatedAt": "2025-09-15T...",
  "recentTransactions": [
    {
      "id": "txn-id",
      "amount": 200,
      "type": "deposit_bonus",
      "description": "Deposit bonus for ₹4000",
      "timestamp": "2025-11-09T10:00:00.000Z",
      "status": "applied"
    }
  ]
}
```

4) `GET /api/admin/bonus-settings` / `PUT /api/admin/bonus-settings`

- Backed by `game_settings` or dedicated `stream_settings/bonus_settings`.
- Keys:
  - `depositBonusPercent`
  - `referralBonusPercent`
  - `conditionalBonusThreshold`
  - `bonusClaimThreshold`
  - `adminWhatsappNumber`

### 5.4 Frontend: AdminBonus.tsx

File:
- `[client/src/pages/admin-bonus.tsx](client/src/pages/admin-bonus.tsx:1)`

Ensure:
- `/admin/bonus-transactions` returns array matching `BonusTransaction` interface.
- `/admin/referral-data` matches `ReferralData`.
- `/admin/player-bonus-analytics` matches `PlayerBonusAnalytics`.
- `/admin/bonus-settings` maps its keys correctly into `BonusSettings`.

---

## 6. User-Level Analytics (Net Profit/Loss) - FIXES

Goal:
- On user profile, show correct net profit/loss and summary.

### 6.1 Backend: /api/user/analytics

Endpoint:
- `GET /api/user/analytics`

Implementation:
- For auth user:
  - From `user_transactions`:
    - `totalDeposits` (deposit)
    - `totalWithdrawals` (withdrawal)
    - `totalBets`
    - `totalWins` (win / payout)
  - OR from `users` aggregates if maintained:
    - `total_winnings`, `total_losses`, `games_played`, `games_won`
- Compute:
  - `netProfit = total_winnings - total_losses`

Response:

```json
{
  "success": true,
  "data": {
    "totalDeposits": 50000,
    "totalWithdrawals": 10000,
    "totalWins": 30000,
    "totalLosses": 25000,
    "netProfit": 5000,
    "gamesPlayed": 200,
    "gamesWon": 90
  }
}
```

### 6.2 Frontend: Profile.tsx using analytics

- `useUserProfile` should:
  - Load `/api/user/analytics`
  - Set `profileState.analytics`
- Profile UI:
  - Show summary cards using `analytics` instead of recomputing.

---

## 7. Verification Checklist

After implementing all above:

1) Schema sanity
- Confirm all listed tables and columns exist (including `round_payouts`, `net_house_profit`, bonus tables).

2) Game history validation
- Play a test game where user bets and wins.
- Check:
  - `player_bets` has correct `actual_payout`.
  - `game_history.total_payouts` = SUM(actual_payout).
  - `/api/user/game-history` for that user:
    - Shows correct `yourTotalBet`, `yourTotalPayout`, `yourNetProfit`, `result="win"`.

3) Bonus validation
- Approve deposit with bonus:
  - `deposit_bonuses` row created.
  - `bonus_transactions` records created.
  - `/api/user/bonus-summary` reflects available/credited.
  - `/admin/bonus-transactions` shows the entry.
  - `/admin/player-bonus-analytics` aggregates reflect it.

4) Analytics validation
- End multiple games.
- Run:
  - `SELECT * FROM daily_game_statistics ORDER BY date DESC LIMIT 1;`
  - `SELECT SUM(net_house_profit) FROM daily_game_statistics;`
- Check:
  - `/api/admin/analytics?period=daily` matches today’s row.
  - `/api/admin/analytics/all-time` matches SUM.

5) User analytics validation
- For a test user:
  - Manually compute deposits, withdrawals, wins, losses.
  - Confirm `/api/user/analytics` matches.
  - Confirm Profile page displays same numbers.

6) Response contract
- Grep project for endpoints:
  - Ensure all use `{ success, data }`.
  - Fix any usage returning `user:`, `stats:`, etc.

Once this document is implemented exactly, all missing/incorrect data issues for:
- game history
- bonus pages (user + admin)
- net loss/net profit in analytics
will be resolved in a consistent, auditable way.