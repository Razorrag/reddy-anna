# 🗄️ DATABASE SETUP GUIDE - COMPLETE RESET & RECREATION

**Date:** November 7, 2024 7:32 PM  
**Status:** ✅ **PRODUCTION READY**

---

## 🎯 WHAT THIS DOES

The `reset-and-recreate-database.sql` file will:

1. ✅ **DROP** all existing tables, views, functions, triggers (DELETES ALL DATA!)
2. ✅ **CREATE** 36 tables with proper schema
3. ✅ **CREATE** 2 views for easy querying
4. ✅ **CREATE** 10 database functions
5. ✅ **CREATE** 12 triggers for auto-updates
6. ✅ **INSERT** default game settings
7. ✅ **INSERT** admin accounts (username: `admin`, password: `admin123`)
8. ✅ **INSERT** 3 test player accounts (phone: `9876543210`, password: `player123`)
9. ✅ **VERIFY** everything was created successfully

---

## ⚠️ WARNING

**THIS WILL DELETE ALL EXISTING DATA PERMANENTLY!**

Only run this script if you want to:
- Start fresh with a clean database
- Reset everything to default state
- Fix database corruption issues
- Apply latest schema changes

**DO NOT RUN IN PRODUCTION WITH REAL USER DATA!**

---

## 📋 PREREQUISITES

1. **Supabase Project** - You need access to Supabase SQL Editor
2. **Database URL** - Must be configured in `.env` file
3. **Backup** - If you have important data, back it up first!

---

## 🚀 HOW TO RUN

### **Method 1: Supabase SQL Editor (Recommended)**

1. **Open Supabase Dashboard**
   - Go to https://app.supabase.com
   - Select your project

2. **Open SQL Editor**
   - Click "SQL Editor" in left sidebar
   - Click "New Query"

3. **Copy & Paste Script**
   - Open `scripts/reset-and-recreate-database.sql`
   - Copy ALL contents (1,441 lines)
   - Paste into SQL Editor

4. **Run Script**
   - Click "Run" button (or press Ctrl+Enter)
   - Wait for completion (~10-30 seconds)

5. **Verify Success**
   - Scroll to bottom of results
   - Should see:
     ```
     Database reset completed successfully!
     admin_count: 2
     user_count: 3
     game_settings_count: 18
     stream_settings_count: 4
     ```

---

### **Method 2: Command Line (psql)**

```bash
# Connect to your Supabase database
psql "postgresql://postgres:[YOUR-PASSWORD]@[YOUR-PROJECT-REF].supabase.co:5432/postgres"

# Run the script
\i scripts/reset-and-recreate-database.sql

# Exit
\q
```

---

### **Method 3: Node.js Script**

```javascript
// run-database-reset.js
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const sql = fs.readFileSync('scripts/reset-and-recreate-database.sql', 'utf8');

const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });

if (error) {
  console.error('❌ Error:', error);
} else {
  console.log('✅ Database reset complete!');
}
```

---

## 📊 WHAT GETS CREATED

### **Tables (36 total):**

**Core Tables:**
- `users` - User accounts (phone-based auth)
- `admin_credentials` - Admin accounts
- `game_sessions` - Active and completed games
- `player_bets` - All bets placed
- `dealt_cards` - Cards dealt in each game
- `game_history` - Completed game records

**Statistics Tables:**
- `game_statistics` - Per-game stats
- `daily_game_statistics` - Daily aggregates
- `monthly_game_statistics` - Monthly aggregates
- `yearly_game_statistics` - Yearly aggregates

**Transaction Tables:**
- `user_transactions` - All balance changes
- `payment_requests` - Deposit/withdrawal requests

**Bonus Tables (NEW!):**
- `deposit_bonuses` - Per-deposit bonus tracking
- `bonus_transactions` - Bonus audit trail
- `referral_bonuses` - Referral bonus records

**Referral Tables:**
- `user_referrals` - Referral relationships

**Admin Tables:**
- `admin_requests` - Admin request queue
- `request_audit` - Admin action audit trail
- `whatsapp_messages` - WhatsApp integration
- `user_creation_log` - User creation tracking
- `blocked_users` - Banned users

**Stream Tables:**
- `stream_settings` - Stream configuration
- `stream_config` - Dual streaming setup
- `stream_sessions` - Stream session tracking

**Security Tables:**
- `token_blacklist` - Invalidated JWT tokens

**Settings Tables:**
- `game_settings` - Game configuration
- `admin_dashboard_settings` - Dashboard config

---

### **Views (2 total):**

1. **`user_bonus_summary`** - Easy bonus querying
   - Shows total available, locked, credited bonuses per user
   - Aggregates deposit and referral bonuses

2. **`admin_requests_summary`** - Admin dashboard stats
   - Shows pending, approved, rejected request counts
   - Last 24 hours summary

---

### **Functions (10 total):**

1. **`generate_referral_code(user_id)`** - Generate unique referral codes
2. **`update_balance_atomic(user_id, amount_change)`** - Atomic balance updates
3. **`update_request_status(request_id, admin_id, status, notes)`** - Update request status
4. **`update_balance_with_request(request_id, admin_id, status, notes)`** - Update balance from request
5. **`cleanup_expired_tokens()`** - Remove expired JWT tokens
6. **`update_updated_at_column()`** - Auto-update timestamps
7. **`check_conditional_bonus(user_id)`** - Check bonus eligibility
8. **`update_stream_config_updated_at()`** - Update stream config timestamp
9. **`update_daily_statistics()`** - Update daily stats on bet
10. **`apply_payouts_and_update_bets(payouts, winning_bets, losing_bets)`** - Distribute winnings

---

### **Triggers (12 total):**

Auto-update `updated_at` timestamps on:
- users
- game_sessions
- player_bets
- game_settings
- admin_requests
- whatsapp_messages
- daily_game_statistics
- monthly_game_statistics
- yearly_game_statistics
- stream_config
- deposit_bonuses (NEW!)
- referral_bonuses (NEW!)

Plus:
- `daily_stats_trigger` - Update daily stats on new bet

---

## 🔐 DEFAULT CREDENTIALS

### **Admin Accounts:**

| Username | Password | Role |
|----------|----------|------|
| admin | admin123 | admin |
| rajugarikossu | admin123 | admin |

**Password Hash:** `$2b$10$0Z1MPnHMBftZs2X.tMDtSefGeGyjqnLKxNPRpRjSkEdxYVvoaqZvS`

---

### **Test Player Accounts:**

| Phone | Password | Balance | Referral Code |
|-------|----------|---------|---------------|
| 9876543210 | player123 | ₹1,00,000 | TEST001 |
| 9876543211 | player123 | ₹1,00,000 | TEST002 |
| 9876543212 | player123 | ₹1,00,000 | TEST003 |

**Password Hashes:**
- User 1: `$2b$10$8mB.7nxp4rBHl397Hd1H/evl5AcOnObzbFcDPUS/AIJCur94p8Ic6`
- User 2: `$2b$10$6tdUJg/WUvaa.hhm7zHYHuWUe7F6FtlR/BnTScKS83c96WbCHD5mi`
- User 3: `$2b$10$JYLGm1/wpX5mgnJptwhar.gCt5QWu3MKoxk5Y891CFU2sknIyAlji`

---

## ⚙️ DEFAULT GAME SETTINGS

| Setting | Value | Description |
|---------|-------|-------------|
| min_bet_amount | 1000 | Minimum bet (₹1,000) |
| max_bet_amount | 100000 | Maximum bet (₹1,00,000) |
| betting_timer_duration | 30 | Betting timer (30 seconds) |
| default_starting_balance | 100000 | New user balance (₹1,00,000) |
| house_commission_rate | 0.05 | House commission (5%) |
| deposit_bonus | 10 | Deposit bonus (10%) |
| referral_commission | 5 | Referral commission (5%) |
| **default_deposit_bonus_percent** | **5** | **New bonus system (5%)** |
| **wagering_multiplier** | **1** | **Wagering requirement (1x)** |
| **bonus_claim_threshold** | **500** | **Min claim amount (₹500)** |

---

## ✅ VERIFICATION QUERIES

After running the script, verify everything was created:

### **Check Table Counts:**
```sql
SELECT 
  (SELECT COUNT(*) FROM users) as users,
  (SELECT COUNT(*) FROM admin_credentials) as admins,
  (SELECT COUNT(*) FROM game_settings) as settings,
  (SELECT COUNT(*) FROM deposit_bonuses) as bonuses;
```

**Expected:**
- users: 3
- admins: 2
- settings: 18
- bonuses: 0 (empty, will populate on first deposit)

---

### **Check Admin Accounts:**
```sql
SELECT username, role, created_at 
FROM admin_credentials 
ORDER BY created_at;
```

**Expected:**
- admin | admin | [timestamp]
- rajugarikossu | admin | [timestamp]

---

### **Check Test Users:**
```sql
SELECT id, phone, full_name, balance, status 
FROM users 
ORDER BY created_at;
```

**Expected:**
- 9876543210 | Test Player 1 | 100000.00 | active
- 9876543211 | Test Player 2 | 100000.00 | active
- 9876543212 | Test Player 3 | 100000.00 | active

---

### **Check Bonus Tables:**
```sql
SELECT 
  (SELECT COUNT(*) FROM deposit_bonuses) as deposit_bonuses,
  (SELECT COUNT(*) FROM bonus_transactions) as bonus_transactions,
  (SELECT COUNT(*) FROM referral_bonuses) as referral_bonuses;
```

**Expected:**
- deposit_bonuses: 0
- bonus_transactions: 0
- referral_bonuses: 0

(These will populate when users make deposits and referrals)

---

## 🧪 TESTING AFTER RESET

### **1. Test Admin Login:**
```bash
# Login endpoint
POST http://localhost:5000/api/auth/admin-login
Content-Type: application/json

{
  "username": "admin",
  "password": "admin123"
}
```

**Expected:** JWT token returned

---

### **2. Test User Login:**
```bash
# Login endpoint
POST http://localhost:5000/api/auth/login
Content-Type: application/json

{
  "phone": "9876543210",
  "password": "player123"
}
```

**Expected:** JWT token returned

---

### **3. Test Bonus Creation:**

1. Login as user `9876543210`
2. Create deposit request for ₹10,000
3. Login as admin
4. Approve deposit
5. Check database:

```sql
SELECT * FROM deposit_bonuses WHERE user_id = '9876543210';
```

**Expected:**
- 1 record
- deposit_amount: 10000.00
- bonus_amount: 500.00 (5%)
- wagering_required: 5000.00 (10x)
- status: 'locked'

---

## 🔧 TROUBLESHOOTING

### **Error: "relation does not exist"**
**Cause:** Table wasn't created  
**Fix:** Check for errors in script output, re-run script

---

### **Error: "permission denied"**
**Cause:** Insufficient database permissions  
**Fix:** Use service role key, not anon key

---

### **Error: "duplicate key value"**
**Cause:** Script run twice without dropping tables first  
**Fix:** Script handles this with `DROP TABLE IF EXISTS`

---

### **Error: "function does not exist"**
**Cause:** Function creation failed  
**Fix:** Check PostgreSQL version (requires 12+)

---

## 📝 IMPORTANT NOTES

1. **Row Level Security (RLS) is DISABLED** in development
   - For production, enable RLS and create policies
   - See Supabase docs for RLS setup

2. **Password Hashes are FRESH**
   - Generated on Nov 7, 2024 5:12 PM
   - Use bcrypt with 10 salt rounds

3. **Foreign Keys are ENFORCED**
   - Deleting a user cascades to all related records
   - Be careful with deletions!

4. **Indexes are OPTIMIZED**
   - All frequent queries have indexes
   - Performance should be excellent

5. **Triggers are ACTIVE**
   - `updated_at` fields auto-update
   - Daily stats auto-increment on bets

---

## 🎉 SUCCESS!

If you see this output at the end:

```
Database reset completed successfully!
admin_count: 2
user_count: 3
game_settings_count: 18
stream_settings_count: 4
```

**Your database is ready!** 🚀

You can now:
- ✅ Start the backend server
- ✅ Login with test accounts
- ✅ Test the bonus system
- ✅ Test payment requests
- ✅ Play games and place bets

---

## 📚 RELATED DOCUMENTATION

- `COMPLETE_DATA_FLOW_AUDIT.md` - Full data flow analysis
- `BONUS_INTEGRATION_COMPLETE.md` - Bonus system details
- `PAYMENT_HISTORY_COMPLETE.md` - Payment history details
- `SESSION_COMPLETE_SUMMARY.md` - Overall session summary

---

**Status:** 🟢 **READY TO RUN**  
**Next Step:** Execute the SQL script in Supabase!
