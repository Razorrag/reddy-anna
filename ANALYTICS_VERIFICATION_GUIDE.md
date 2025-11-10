# Analytics & History System - Verification Guide

**Date:** November 10, 2025  
**Status:** ✅ ALL CORE LOGIC IMPLEMENTED

---

## 🎯 Core Implementation Summary

All analytics derive consistent values from canonical calculations:

**Formula Applied Everywhere:**
```
total_revenue = total_bets - total_payouts
profit_loss = total_revenue
profit_loss_percentage = (profit_loss / total_bets) * 100
```

**Implementation Locations:**
- Per-game: `storage-supabase.ts:2233` (upsertGameStatistics)
- Daily: `storage-supabase.ts:2282` (updateDailyStatistics)
- Monthly: `storage-supabase.ts:2335` (updateMonthlyStatistics)
- Yearly: `storage-supabase.ts:2384` (updateYearlyStatistics)
- User history: `storage-supabase.ts:2052` (getUserGameHistory)
- Admin history: `storage-supabase.ts:1913` (getGameHistory)

---

## 1️⃣ User Game History Verification

### Database Check
```sql
SELECT 
  pb.game_id,
  pb.side,
  pb.amount,
  pb.actual_payout,
  gs.winner
FROM player_bets pb
LEFT JOIN game_sessions gs ON pb.game_id = gs.game_id
WHERE pb.user_id = 'YOUR_USER_ID'
ORDER BY pb.created_at DESC
LIMIT 10;
```

### API Test
```bash
curl -X GET http://localhost:5000/api/user/history \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Expected Response
```json
{
  "history": [{
    "gameId": "uuid",
    "yourTotalBet": 100,
    "yourTotalPayout": 195,
    "yourNetProfit": 95,
    "result": "win"
  }]
}
```

---

## 2️⃣ Admin Game History Verification

### Database Check
```sql
SELECT 
  gs.game_id,
  gh.total_bets,
  gh.total_payouts,
  gst.profit_loss,
  gst.profit_loss_percentage
FROM game_sessions gs
LEFT JOIN game_history gh ON gs.game_id = gh.game_id
LEFT JOIN game_statistics gst ON gs.game_id = gst.game_id
WHERE gs.status = 'completed'
ORDER BY gs.created_at DESC
LIMIT 10;
```

### Verify Formula
```sql
-- profit_loss should equal total_bets - total_payouts
SELECT 
  game_id,
  total_bets - total_payouts as calculated,
  profit_loss as stored
FROM game_statistics;
```

---

## 3️⃣ Analytics Dashboard Verification

### Daily Statistics
```sql
SELECT 
  date,
  total_bets,
  total_payouts,
  total_revenue,
  profit_loss,
  profit_loss_percentage
FROM daily_game_statistics
WHERE date = CURRENT_DATE;

-- Verify: total_revenue = total_bets - total_payouts
-- Verify: profit_loss = total_revenue
```

### API Test
```bash
curl -X GET http://localhost:5000/api/admin/analytics/daily \
  -H "Authorization: Bearer ADMIN_JWT_TOKEN"
```

---

## 4️⃣ Bonus System Verification

### Check Bonus Settings
```sql
SELECT * FROM game_settings 
WHERE setting_key IN (
  'default_deposit_bonus_percent',
  'referral_bonus_percent'
);
```

### Test Deposit Bonus
```sql
-- After deposit approval
SELECT * FROM deposit_bonuses 
WHERE user_id = 'USER_ID' 
ORDER BY created_at DESC 
LIMIT 1;

-- Expected: bonus_amount = deposit * bonus_percent
```

---

## 5️⃣ Payment System Verification

### Check Approved Payments
```sql
SELECT 
  id,
  type,
  amount,
  status,
  processed_at
FROM payment_requests
WHERE DATE(processed_at) = CURRENT_DATE
  AND status IN ('approved', 'completed')
ORDER BY processed_at DESC;
```

---

## 6️⃣ End-to-End Test

### Complete Game Flow

1. **Place bets:**
   - User A: ₹100 on Andar
   - User B: ₹200 on Bahar
   - Total: ₹300

2. **Complete game:**
   - Winner: Andar
   - Payouts: ₹190 to User A

3. **Verify all tables updated:**

```sql
-- Player bets
SELECT * FROM player_bets WHERE game_id = 'GAME_ID';

-- Game history
SELECT total_bets, total_payouts FROM game_history WHERE game_id = 'GAME_ID';
-- Expected: 300, 190

-- Game statistics
SELECT profit_loss FROM game_statistics WHERE game_id = 'GAME_ID';
-- Expected: 110 (300 - 190)

-- Daily stats
SELECT profit_loss FROM daily_game_statistics WHERE date = CURRENT_DATE;
-- Should include +110
```

---

## 7️⃣ Common Issues

### Analytics Showing Zero

**Check:**
```sql
SELECT COUNT(*) FROM game_statistics;
SELECT * FROM daily_game_statistics WHERE date = CURRENT_DATE;
```

**Solution:** Verify game completion triggers stats update

### User History Empty

**Check:**
```sql
SELECT COUNT(*) FROM player_bets WHERE user_id = 'USER_ID';
SELECT COUNT(*) FROM game_sessions;
```

**Solution:** Ensure game_sessions exist for completed games

---

## 8️⃣ Final Checklist

- [ ] User history shows correct winnings/net profit
- [ ] Admin history shows accurate house P/L
- [ ] Analytics dashboard displays non-zero values
- [ ] Bonus system creates and tracks bonuses
- [ ] Payment approvals update all tables
- [ ] All formulas match canonical calculation
- [ ] Frontend displays match database values

---

## 🎉 Success Criteria

System is operational when:
1. ✅ All profit/loss calculations use: `total_bets - total_payouts`
2. ✅ User and admin pages display consistent data
3. ✅ No zero values in analytics (when games exist)
4. ✅ Bonuses create, track, and credit correctly
5. ✅ Complete game flow updates all 8 tables
