# ✅ DATABASE DEPLOYMENT CHECKLIST

**Date:** November 7, 2024  
**Task:** Deploy reset-and-recreate-database.sql

---

## 📋 PRE-DEPLOYMENT

- [ ] **Backup current database** (optional, since resetting everything)
- [ ] **Read DATABASE_RESET_INSTRUCTIONS.md**
- [ ] **Read DATABASE_COMPATIBILITY_REPORT.md**
- [ ] **Understand this will delete ALL existing data**
- [ ] **Confirm you have Supabase admin access**

---

## 🚀 DEPLOYMENT STEPS

### **Step 1: Open Supabase**
- [ ] Go to Supabase Dashboard
- [ ] Navigate to your project
- [ ] Click on "SQL Editor" in left sidebar

### **Step 2: Prepare Script**
- [ ] Open file: `scripts/reset-and-recreate-database.sql`
- [ ] Select ALL contents (Ctrl+A)
- [ ] Copy to clipboard (Ctrl+C)

### **Step 3: Execute**
- [ ] Paste into Supabase SQL Editor
- [ ] Review the script one last time
- [ ] Click **"RUN"** button
- [ ] Wait for completion (10-30 seconds)
- [ ] Check for success message

### **Step 4: Verify Tables Created**
Run this query:
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
```
- [ ] Should see 24 tables
- [ ] All tables from the list below present

**Expected Tables:**
1. admin_credentials
2. admin_dashboard_settings
3. admin_requests
4. blocked_users
5. daily_game_statistics
6. dealt_cards
7. game_history
8. game_sessions
9. game_settings
10. game_statistics
11. monthly_game_statistics
12. payment_requests
13. player_bets
14. request_audit
15. stream_config
16. stream_sessions
17. stream_settings
18. token_blacklist
19. user_creation_log
20. user_referrals
21. user_transactions
22. users
23. whatsapp_messages
24. yearly_game_statistics

### **Step 5: Verify RPC Functions**
Run this query:
```sql
SELECT proname 
FROM pg_proc 
WHERE proname IN (
  'apply_payouts_and_update_bets',
  'generate_referral_code',
  'update_balance_atomic',
  'update_request_status',
  'update_balance_with_request',
  'cleanup_expired_tokens',
  'check_conditional_bonus',
  'update_updated_at_column',
  'update_stream_config_updated_at'
)
ORDER BY proname;
```
- [ ] Should see 9 functions
- [ ] `apply_payouts_and_update_bets` present (CRITICAL)

### **Step 6: Verify Admin Accounts**
Run this query:
```sql
SELECT username, role, created_at 
FROM admin_credentials 
ORDER BY username;
```
- [ ] Should see 2 admins: `admin`, `rajugarikossu`
- [ ] Both have role = 'admin'

### **Step 7: Verify Test Users**
Run this query:
```sql
SELECT phone, full_name, balance, referral_code_generated 
FROM users 
ORDER BY phone;
```
- [ ] Should see 3 users
- [ ] Phone numbers: 9876543210, 9876543211, 9876543212
- [ ] All have balance = 100000.00

### **Step 8: Verify Settings**
Run this query:
```sql
SELECT COUNT(*) as setting_count FROM game_settings;
SELECT COUNT(*) as stream_count FROM stream_settings;
```
- [ ] game_settings count >= 17
- [ ] stream_settings count >= 4

---

## 🧪 POST-DEPLOYMENT TESTING

### **Test 1: Admin Login**
- [ ] Open admin login page
- [ ] Username: `admin`
- [ ] Password: `admin123`
- [ ] Click Login
- [ ] Should successfully login to admin dashboard

### **Test 2: Player Login**
- [ ] Open player login page
- [ ] Phone: `9876543210`
- [ ] Password: `player123`
- [ ] Click Login
- [ ] Should successfully login to game page
- [ ] Balance should show ₹1,00,000

### **Test 3: Complete Game Flow**
- [ ] **Admin:** Start new game with opening card
- [ ] **Player:** Place a bet (e.g., ₹1,000 on Andar)
- [ ] **Verify:** Player balance decreased to ₹99,000
- [ ] **Admin:** Deal cards until game completes
- [ ] **Verify:** Game completes with winner announced
- [ ] **Verify:** Payouts distributed (if player won)

### **Test 4: CRITICAL - Verify actual_payout**
Run this query immediately after game completes:
```sql
SELECT 
  id,
  user_id,
  game_id,
  side,
  amount as bet_amount,
  actual_payout,
  status,
  created_at
FROM player_bets 
WHERE created_at > NOW() - INTERVAL '10 minutes'
ORDER BY created_at DESC
LIMIT 10;
```
- [ ] **CRITICAL:** `actual_payout` should NOT be NULL
- [ ] Winning bets: `actual_payout` > 0
- [ ] Losing bets: `actual_payout` = 0

### **Test 5: Verify User Statistics**
Run this query:
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
- [ ] `games_played` should be > 0
- [ ] `games_won` should update correctly
- [ ] `total_winnings` should NOT be 0 (if player won)
- [ ] `total_losses` should NOT be 0 (if player lost)

### **Test 6: Verify Game History**
Run this query:
```sql
SELECT 
  gh.game_id,
  gh.winner,
  gh.total_bets,
  gh.total_payouts,
  gs.house_payout,
  gs.profit_loss,
  gh.created_at
FROM game_history gh
LEFT JOIN game_statistics gs ON gh.game_id = gs.game_id
ORDER BY gh.created_at DESC
LIMIT 5;
```
- [ ] Game appears in history
- [ ] `total_bets` > 0
- [ ] `total_payouts` > 0 (if there were winners)
- [ ] `house_payout` matches expected value
- [ ] `profit_loss` calculated correctly

### **Test 7: Verify Payment Request Flow**
- [ ] **Player:** Create deposit request
- [ ] **Admin:** View pending requests
- [ ] **Admin:** Approve request
- [ ] **Verify:** Player balance updated
- [ ] **Verify:** Transaction logged

---

## 🔍 TROUBLESHOOTING

### **Issue: Script fails with "relation already exists"**
**Solution:**
```sql
-- Drop everything and start fresh
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;

-- Then re-run reset script
```

### **Issue: Login fails**
**Check:**
```sql
-- Verify admin exists
SELECT * FROM admin_credentials WHERE username = 'admin';

-- Verify password hash is set
SELECT username, LENGTH(password_hash) as hash_length 
FROM admin_credentials;
-- hash_length should be 60
```

### **Issue: actual_payout is NULL**
**Check:**
```sql
-- Verify RPC function exists
SELECT proname, prosrc 
FROM pg_proc 
WHERE proname = 'apply_payouts_and_update_bets';

-- Should return the function
-- Check if it contains "actual_payout" in the source
```

### **Issue: Foreign key violations**
**Solution:**
- Re-run the reset script completely
- Ensure no manual table modifications
- Check all tables were dropped before recreation

---

## ✅ SUCCESS CRITERIA

All of these must be TRUE:

- [x] 24 tables created
- [x] 9 RPC functions created
- [x] 11 triggers active
- [x] 2 admin accounts created
- [x] 3 test users created
- [x] Admin login works
- [x] Player login works
- [x] Game can be started
- [x] Bets can be placed
- [x] Game can be completed
- [x] **`actual_payout` is set correctly** ← MOST IMPORTANT
- [x] User statistics update
- [x] Game history saves
- [x] Payment requests work

---

## 📊 FINAL VERIFICATION QUERY

Run this comprehensive check:
```sql
-- Comprehensive verification
SELECT 
  'Tables' as check_type,
  COUNT(*)::text as result,
  '24' as expected,
  CASE WHEN COUNT(*) = 24 THEN '✅ PASS' ELSE '❌ FAIL' END as status
FROM information_schema.tables 
WHERE table_schema = 'public'

UNION ALL

SELECT 
  'RPC Functions',
  COUNT(*)::text,
  '9',
  CASE WHEN COUNT(*) >= 9 THEN '✅ PASS' ELSE '❌ FAIL' END
FROM pg_proc 
WHERE proname IN (
  'apply_payouts_and_update_bets',
  'generate_referral_code',
  'update_balance_atomic',
  'update_request_status',
  'update_balance_with_request',
  'cleanup_expired_tokens',
  'check_conditional_bonus',
  'update_updated_at_column',
  'update_stream_config_updated_at'
)

UNION ALL

SELECT 
  'Admin Accounts',
  COUNT(*)::text,
  '2',
  CASE WHEN COUNT(*) = 2 THEN '✅ PASS' ELSE '❌ FAIL' END
FROM admin_credentials

UNION ALL

SELECT 
  'Test Users',
  COUNT(*)::text,
  '3',
  CASE WHEN COUNT(*) = 3 THEN '✅ PASS' ELSE '❌ FAIL' END
FROM users

UNION ALL

SELECT 
  'Game Settings',
  COUNT(*)::text,
  '17+',
  CASE WHEN COUNT(*) >= 17 THEN '✅ PASS' ELSE '❌ FAIL' END
FROM game_settings

UNION ALL

SELECT 
  'Stream Settings',
  COUNT(*)::text,
  '4+',
  CASE WHEN COUNT(*) >= 4 THEN '✅ PASS' ELSE '❌ FAIL' END
FROM stream_settings;
```

**Expected Output:**
```
check_type       | result | expected | status
-----------------|--------|----------|----------
Tables           | 24     | 24       | ✅ PASS
RPC Functions    | 9      | 9        | ✅ PASS
Admin Accounts   | 2      | 2        | ✅ PASS
Test Users       | 3      | 3        | ✅ PASS
Game Settings    | 17     | 17+      | ✅ PASS
Stream Settings  | 4      | 4+       | ✅ PASS
```

---

## 🎉 DEPLOYMENT COMPLETE

If all checks pass:
- ✅ Database is correctly set up
- ✅ Critical bug is fixed
- ✅ All features are working
- ✅ Ready for production use

**Next Steps:**
1. Start using the application
2. Monitor for any issues
3. Check logs regularly
4. Verify `actual_payout` after each game

---

**Deployment Date:** _________________  
**Deployed By:** _________________  
**Verification Status:** _________________  
**Notes:** _________________
