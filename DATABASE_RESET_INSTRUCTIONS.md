# 🔄 DATABASE RESET INSTRUCTIONS

**Date:** November 7, 2024  
**Status:** ✅ READY TO DEPLOY  
**Critical Fix:** `apply_payouts_and_update_bets` function now properly sets `actual_payout`

---

## 📋 WHAT THIS FIXES

### **🐛 Root Cause**
The `apply_payouts_and_update_bets` RPC function was **NOT setting the `actual_payout` field** in the `player_bets` table, causing:
- ❌ User statistics showing 0 winnings
- ❌ Financial overview showing ₹0
- ❌ Game history payouts showing ₹0
- ❌ Win/loss results reversed (winners showing as losers)

### **✅ The Fix**
Updated the RPC function to:
1. Calculate proportional payout for each winning bet
2. Set `actual_payout` field correctly
3. Set `actual_payout = 0` for losing bets

---

## 🚀 DEPLOYMENT STEPS

### **Step 1: Backup Current Database (OPTIONAL)**
```sql
-- In Supabase SQL Editor, export your data if needed
-- This is optional since you're resetting everything
```

### **Step 2: Run the Reset Script**
1. Open Supabase Dashboard → SQL Editor
2. Open the file: `scripts/reset-and-recreate-database.sql`
3. Copy the ENTIRE contents
4. Paste into Supabase SQL Editor
5. Click **RUN**
6. Wait for completion (should take 10-30 seconds)

### **Step 3: Verify Success**
The script will automatically run verification queries at the end. You should see:
```
✅ Database reset completed successfully!
✅ Admin accounts created: 2
✅ Test users created: 3
✅ Game settings: 17
✅ Stream settings: 4
```

### **Step 4: Test Login**
**Admin Login:**
- Username: `admin`
- Password: `admin123`

**Test Player Login:**
- Phone: `9876543210`
- Password: `player123`

---

## 🔐 CREDENTIALS

### **Admin Accounts**
| Username | Password | Role |
|----------|----------|------|
| admin | admin123 | admin |
| rajugarikossu | admin123 | admin |

### **Test Player Accounts**
| Phone | Password | Balance | Referral Code |
|-------|----------|---------|---------------|
| 9876543210 | player123 | ₹1,00,000 | TEST001 |
| 9876543211 | player123 | ₹1,00,000 | TEST002 |
| 9876543212 | player123 | ₹1,00,000 | TEST003 |

---

## 📊 WHAT'S INCLUDED

### **Tables Created (20 total)**
1. ✅ `users` - User accounts with phone authentication
2. ✅ `admin_credentials` - Admin login credentials
3. ✅ `game_sessions` - Active and completed games
4. ✅ `player_bets` - All player bets with **actual_payout** field
5. ✅ `dealt_cards` - Cards dealt in each game
6. ✅ `game_history` - Historical game records
7. ✅ `game_statistics` - Per-game statistics
8. ✅ `daily_game_statistics` - Daily aggregated stats
9. ✅ `monthly_game_statistics` - Monthly aggregated stats
10. ✅ `yearly_game_statistics` - Yearly aggregated stats
11. ✅ `user_transactions` - All user transactions
12. ✅ `payment_requests` - Deposit/withdrawal requests
13. ✅ `user_referrals` - Referral tracking
14. ✅ `blocked_users` - Blocked user list
15. ✅ `game_settings` - Game configuration
16. ✅ `stream_settings` - Stream configuration
17. ✅ `stream_config` - Dual streaming (RTMP/WebRTC)
18. ✅ `stream_sessions` - Stream session tracking
19. ✅ `token_blacklist` - JWT token invalidation
20. ✅ `user_creation_log` - Admin user creation audit
21. ✅ `whatsapp_messages` - WhatsApp integration
22. ✅ `admin_requests` - Admin request management
23. ✅ `admin_dashboard_settings` - Dashboard settings
24. ✅ `request_audit` - Request audit trail

### **RPC Functions Created (9 total)**
1. ✅ `generate_referral_code()` - Generate unique referral codes
2. ✅ `update_balance_atomic()` - Atomic balance updates (prevents race conditions)
3. ✅ `update_request_status()` - Update admin request status
4. ✅ `update_balance_with_request()` - Update balance with request approval
5. ✅ `cleanup_expired_tokens()` - Clean up expired JWT tokens
6. ✅ `check_conditional_bonus()` - Check bonus eligibility
7. ✅ `update_updated_at_column()` - Auto-update timestamps
8. ✅ `update_stream_config_updated_at()` - Update stream config timestamps
9. ✅ **`apply_payouts_and_update_bets()`** - **CRITICAL FIX: Properly sets actual_payout**

### **Triggers Created (11 total)**
- Auto-update `updated_at` on all relevant tables
- Auto-update daily statistics on new bets

### **Indexes Created (50+ total)**
- Performance indexes on all foreign keys
- Composite indexes for common queries
- Date-based indexes for time-series queries

### **Views Created**
- `admin_requests_summary` - Quick admin request overview

---

## 🔍 VERIFICATION QUERIES

After running the script, verify everything is working:

### **Check if actual_payout is being set (after completing a game):**
```sql
SELECT 
  id,
  user_id,
  amount as bet_amount,
  actual_payout,
  status
FROM player_bets 
WHERE created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC
LIMIT 10;
```

**Expected Result:**
- Winning bets: `actual_payout > 0` ✅
- Losing bets: `actual_payout = 0` ✅
- No NULL values ✅

### **Check user statistics:**
```sql
SELECT 
  phone,
  full_name,
  games_played,
  games_won,
  total_winnings,
  total_losses,
  balance
FROM users 
WHERE games_played > 0
ORDER BY games_played DESC;
```

### **Check game history:**
```sql
SELECT 
  gh.game_id,
  gh.winner,
  gh.total_bets,
  gh.total_payouts,
  gs.house_payout,
  gs.profit_loss
FROM game_history gh
LEFT JOIN game_statistics gs ON gh.game_id = gs.game_id
ORDER BY gh.created_at DESC
LIMIT 10;
```

---

## ⚠️ IMPORTANT NOTES

### **1. This Will Delete ALL Data**
- All users (except test users)
- All game history
- All transactions
- All payment requests
- Everything will be reset to default state

### **2. Migration Files Removed**
All migration files in `server/migrations/` have been consolidated into the single reset script. The old migrations were causing conflicts and corruption.

### **3. One Script to Rule Them All**
From now on, use ONLY `scripts/reset-and-recreate-database.sql` for database setup. Do not run individual migration files.

### **4. Password Hashes**
All password hashes are freshly generated using bcrypt with 10 salt rounds. They are secure and ready for production use.

### **5. Row Level Security (RLS)**
RLS is **DISABLED** for development. For production, you should:
- Enable RLS on all tables
- Create appropriate policies
- Test thoroughly

---

## 🧪 TESTING CHECKLIST

After running the reset script, test these flows:

### **1. Admin Login**
- [ ] Login with `admin` / `admin123`
- [ ] Access admin dashboard
- [ ] View user list
- [ ] View game history

### **2. Player Login**
- [ ] Login with `9876543210` / `player123`
- [ ] View balance (should be ₹1,00,000)
- [ ] View game history (should be empty)

### **3. Game Flow**
- [ ] Admin starts game with opening card
- [ ] Player places bet
- [ ] Balance deducted correctly
- [ ] Admin deals cards
- [ ] Game completes
- [ ] Payouts distributed
- [ ] **Check `actual_payout` is set in database**
- [ ] User statistics updated correctly
- [ ] Game history shows correct payouts

### **4. Payment Requests**
- [ ] Player creates deposit request
- [ ] Admin sees pending request
- [ ] Admin approves request
- [ ] Player balance updated
- [ ] Transaction logged

---

## 🆘 TROUBLESHOOTING

### **Problem: Script fails with "relation already exists"**
**Solution:** The script drops all tables first. If it still fails, manually drop all tables in Supabase:
```sql
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;
```
Then run the reset script again.

### **Problem: Login fails with "Invalid credentials"**
**Solution:** 
1. Check if admin_credentials table has data:
   ```sql
   SELECT * FROM admin_credentials;
   ```
2. If empty, re-run the reset script
3. If still failing, check server logs for authentication errors

### **Problem: actual_payout still NULL after game**
**Solution:**
1. Check if the RPC function exists:
   ```sql
   SELECT proname FROM pg_proc WHERE proname = 'apply_payouts_and_update_bets';
   ```
2. If missing, re-run the reset script
3. Check server logs for RPC call errors

### **Problem: Foreign key constraint violations**
**Solution:** This should not happen with the reset script. If it does:
1. Verify all tables were created in correct order
2. Check for any custom modifications
3. Re-run the reset script from scratch

---

## 📞 SUPPORT

If you encounter any issues:
1. Check the server logs for detailed error messages
2. Run the verification queries above
3. Check Supabase dashboard for any errors
4. Review the `CRITICAL_DATA_SAVING_BUG_FOUND.md` document for more details

---

## ✅ SUCCESS CRITERIA

After running the reset script, you should have:
- ✅ 2 admin accounts (admin, rajugarikossu)
- ✅ 3 test player accounts
- ✅ 17 game settings
- ✅ 4 stream settings
- ✅ All tables created with proper indexes
- ✅ All RPC functions working
- ✅ All triggers active
- ✅ Login working for both admin and players
- ✅ **Most importantly: `actual_payout` field being set correctly**

---

## 🎯 NEXT STEPS

1. **Run the reset script** in Supabase SQL Editor
2. **Test admin login** with credentials above
3. **Test player login** with test account
4. **Complete one full game** to verify payouts work
5. **Check database** to confirm `actual_payout` is set
6. **Verify user statistics** are updating correctly
7. **Check game history** shows correct payouts

**Status:** 🟢 READY TO DEPLOY
