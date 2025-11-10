# Analytics System - Problems & Fixes Summary

**Date:** November 10, 2025  
**Status:** ✅ COMPLETE - All Core Logic Implemented

---

## 📋 Problems Fixed

### 1. User Game History: Winnings and Net Profit Not Showing

**Problem:**
- History endpoints didn't aggregate user bets and payouts per game
- Display logic relied only on stake, not actual payout
- Missing dealt_cards and game_history context

**Fix:** `server/storage-supabase.ts:2052` (getUserGameHistory)
- Fetch all bets joined with game_sessions
- Group by game_id and compute:
  - `yourTotalBet = sum(amount)`
  - `yourTotalPayout = sum(actual_payout)`
  - `yourNetProfit = yourTotalPayout - yourTotalBet`
- Determine result: 'win' if payout > 0, 'loss' if winner exists and payout == 0
- Attach openingCard, winner, winningCard, winningRound, dealtCards

**Outcome:** User profile/history shows correct winnings and per-game net profit

---

### 2. Admin Game History: Missing House Profit / Game Metrics

**Problem:**
- Inconsistent joins between game_history, game_sessions, game_statistics
- No canonical per-game profitLoss field

**Fix:** `server/storage-supabase.ts:1913` (getGameHistory)
- For each game, combine game_history with game_statistics
- Derive canonical values:
  - `profitLoss = totalBets - totalPayouts`
  - `profitLossPercentage = (profitLoss / totalBets) * 100`
- Include andarTotalBet, baharTotalBet, bets counts, total players
- Include dealtCards for complete context

**Outcome:** Admin Game History table shows per-game house P/L and proper breakdowns

---

### 3. Daily / Monthly / Yearly Analytics: Net Profit / Loss and Revenue Wrong or Zero

**Problem:**
- Stats rows didn't set total_revenue consistently
- profit_loss and profit_loss_percentage not maintained
- Readers assumed correct data, UI showed zeros

**Core Rule Enforced:**
```javascript
total_revenue = total_bets - total_payouts
profit_loss = total_revenue
profit_loss_percentage = (profit_loss / total_bets) * 100
```

**Fixes:**

**Per-game:** `storage-supabase.ts:2233` (upsertGameStatistics)
- Writes profit_loss and profit_loss_percentage correctly

**Daily:** `storage-supabase.ts:2282` (updateDailyStatistics)
- Reads existing row by date
- Accumulates total_games, total_bets, total_payouts
- Computes total_revenue, profit_loss, profit_loss_percentage
- Upserts with updated_at

**Monthly:** `storage-supabase.ts:2335` (updateMonthlyStatistics)
- Same pattern with month_year key

**Yearly:** `storage-supabase.ts:2384` (updateYearlyStatistics)
- Same pattern with year key

**Outcome:** /admin/analytics shows non-zero, mathematically consistent values

---

### 4. Bonus Pages: No Data for User or Admin

**Problems:**
- Mixed, legacy implementations
- No canonical source for bonus settings
- Bonus analytics using vague descriptions

**Fixes:**

**Canonical Settings:** `storage-supabase.ts:5331-5450`
- getBonusSettings: Reads from game_settings
  - default_deposit_bonus_percent
  - referral_bonus_percent
  - conditional_bonus_threshold
  - bonus_claim_threshold
  - admin_whatsapp_number
- updateBonusSettings: Upserts with flat keys

**Structured Tracking:**
- New tables: deposit_bonuses, referral_bonuses, bonus_transactions, user_bonus_summary
- Methods: createDepositBonus, updateDepositBonusWagering, unlockDepositBonus
- Methods: createReferralBonus, creditReferralBonus
- Methods: logBonusTransaction, getBonusTransactions, getBonusSummary

**Outcome:**
- User bonus pages call /api/user/bonus-summary, /api/user/bonus-transactions
- Admin bonus pages use getAllBonusTransactions, getAllReferralData, getPlayerBonusAnalytics
- Data flows from real bonus tables, not guessed values

---

### 5. Payments: "Approved Today" / Totals Inconsistent

**Core Expectation:**
- "Approved today" metrics must filter by status in ['approved', 'completed']
- Use processed_at (not just created_at) as effective approval time

**Fix:** `storage-supabase.ts:4316` (updatePaymentRequest)
- Sets status, processed_at, processed_by/admin_id
- Logs into request_audit when status changes
- approvePaymentRequest: Updates balance, writes user_transactions, marks as approved

**Outcome:**
- Admin payments/stats pages use processed_at and status filters
- Compute total approved deposits/withdrawals today accurately

---

## 🔧 Implementation Details

### Canonical Formula (Applied Everywhere)

```typescript
const revenue = totalBets - totalPayouts;
const profitLoss = revenue;
const profitLossPercentage = totalBets > 0 ? (profitLoss / totalBets) * 100 : 0;
```

### Key Files Modified

**server/storage-supabase.ts:**
- Lines 1913-2050: getGameHistory (admin)
- Lines 2052-2230: getUserGameHistory (user)
- Lines 2233-2277: upsertGameStatistics (per-game)
- Lines 2282-2330: updateDailyStatistics
- Lines 2335-2382: updateMonthlyStatistics
- Lines 2384-2432: updateYearlyStatistics
- Lines 4316-4600: Payment approval flow
- Lines 4700-5100: Deposit/referral bonus methods
- Lines 5100-5300: Bonus transaction tracking
- Lines 5331-5450: Bonus settings management

### Database Tables Updated

**Game Flow:**
1. player_bets (bets with actual_payout)
2. game_history (total_bets, total_payouts)
3. game_statistics (profit_loss, profit_loss_percentage)
4. daily_game_statistics (aggregated daily)
5. monthly_game_statistics (aggregated monthly)
6. yearly_game_statistics (aggregated yearly)
7. game_sessions (game state)
8. dealt_cards (card history)

**Bonus Flow:**
1. deposit_bonuses (per-deposit tracking)
2. referral_bonuses (per-referral tracking)
3. bonus_transactions (all bonus events)
4. user_bonus_summary (per-user aggregates)
5. game_settings (bonus configuration)

**Payment Flow:**
1. payment_requests (with processed_at)
2. user_transactions (ledger)
3. request_audit (status changes)
4. users (balance updates)

---

## ✅ Verification Checklist

### Quick Tests

**1. User History:**
```bash
curl -X GET http://localhost:5000/api/user/history \
  -H "Authorization: Bearer USER_TOKEN"
# Check: yourNetProfit = yourTotalPayout - yourTotalBet
```

**2. Admin History:**
```bash
curl -X GET http://localhost:5000/api/admin/game-history \
  -H "Authorization: Bearer ADMIN_TOKEN"
# Check: profitLoss = totalBets - totalPayouts
```

**3. Analytics:**
```bash
curl -X GET http://localhost:5000/api/admin/analytics/daily \
  -H "Authorization: Bearer ADMIN_TOKEN"
# Check: profitLoss = totalBets - totalPayouts
```

**4. Bonus Summary:**
```bash
curl -X GET http://localhost:5000/api/user/bonus-summary \
  -H "Authorization: Bearer USER_TOKEN"
# Check: Shows pending and claimed bonuses
```

### Database Verification

```sql
-- Check daily stats formula
SELECT 
  date,
  total_bets,
  total_payouts,
  total_revenue,
  profit_loss,
  (total_bets - total_payouts) as calculated_profit
FROM daily_game_statistics
WHERE date = CURRENT_DATE;
-- Verify: profit_loss = calculated_profit

-- Check game statistics
SELECT 
  game_id,
  total_bets,
  total_winnings as total_payouts,
  profit_loss,
  (total_bets - total_winnings) as calculated
FROM game_statistics
ORDER BY created_at DESC
LIMIT 5;
-- Verify: profit_loss = calculated

-- Check user game history
SELECT 
  pb.game_id,
  SUM(pb.amount) as total_bet,
  SUM(pb.actual_payout) as total_payout,
  SUM(pb.actual_payout) - SUM(pb.amount) as net_profit
FROM player_bets pb
WHERE pb.user_id = 'USER_ID'
GROUP BY pb.game_id
ORDER BY MAX(pb.created_at) DESC
LIMIT 5;
-- Verify: Matches API response
```

---

## 🎯 Success Criteria

System is fully operational when:

1. ✅ User game history shows correct winnings and net profit
2. ✅ Admin game history shows accurate house P/L per game
3. ✅ Analytics dashboard displays non-zero, consistent values
4. ✅ Daily/monthly/yearly stats use canonical calculations
5. ✅ Bonus system creates, tracks, and credits bonuses
6. ✅ Payment approvals update all related tables
7. ✅ All formulas match: `profit_loss = total_bets - total_payouts`
8. ✅ Frontend displays match database values exactly
9. ✅ No console errors or API failures

---

## 📝 Final Notes

- All critical aggregation code centralized in `server/storage-supabase.ts`
- /analytics and related pages only consume these values; no extra frontend math required
- Snake_case field access fixed throughout (e.g., `(existing as any).total_games`)
- Retry logic added for critical operations (3 attempts with 500ms delays)
- Complete logging for debugging and monitoring
- Backward-compatible with existing data

**With these changes, game history, bonus pages, and analytics (net profit/loss, revenue) are correctly wired end-to-end based on your current schema.**
