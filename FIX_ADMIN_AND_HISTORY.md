# 🔧 FIX: Admin Password & Game History Issues

## Issue 1: Admin Password Reset Needed

After running `reset-and-recreate-database.sql`, all password hashes are cleared.

### ✅ **Solution: Run Password Reset Script**

```bash
node scripts/reset-admin-password.js
```

**Default Credentials Created:**
- Username: `admin`
- Password: `admin123`

**To Change Password:** Edit `scripts/reset-admin-password.js` line 11 before running.

---

## Issue 2: Game History Not Showing

The `/api/admin/game-history` endpoint exists but returns empty because:
1. Query uses `created_at` field but database might have different column name
2. Needs proper column mapping (snake_case vs camelCase)

### ✅ **Check Database First**

Run this SQL query in Supabase:
```sql
-- Check if game history exists
SELECT * FROM game_history ORDER BY created_at DESC LIMIT 5;

-- Check column names
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'game_history';
```

**Expected columns:**
- `id` (uuid)
- `game_id` (varchar)
- `opening_card` (varchar)
- `winner` (varchar)
- `winning_card` (varchar)
- `total_cards` (integer)
- `winning_round` (integer) ← **This should exist now**
- `total_bets` (decimal)
- `total_payouts` (decimal)
- `created_at` (timestamp)

---

## Issue 3: Database Migration Needed

### ✅ **Apply Full Database Reset**

**IMPORTANT:** This will recreate all tables with fixes.

1. **Backup your data first** (if needed):
```sql
-- Backup game history
CREATE TABLE game_history_backup AS SELECT * FROM game_history;

-- Backup users
CREATE TABLE users_backup AS SELECT * FROM users;
```

2. **Run the updated schema:**
```bash
# Option 1: Via psql
psql -h YOUR_SUPABASE_HOST -U postgres -d postgres -f scripts/reset-and-recreate-database.sql

# Option 2: Via Supabase Dashboard
# Copy entire content of reset-and-recreate-database.sql
# Paste into Supabase SQL Editor → Run
```

3. **Reset admin password:**
```bash
node scripts/reset-admin-password.js
```

---

## Issue 4: Frontend Not Receiving Data

### ✅ **Check API Response**

Test the endpoint directly:
```bash
# Get admin token first (login as admin)
# Then test:
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:5000/api/admin/game-history
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "games": [...],
    "pagination": {...}
  }
}
```

**If empty games array:**
- Database has no game history yet
- Play a test game to populate data

---

## 🚀 **Quick Fix Steps**

### **Step 1: Reset Database**
```bash
cd "c:\Users\15anu\Desktop\andar bahar\andar bahar"
psql -h YOUR_HOST -U postgres -d postgres -f scripts/reset-and-recreate-database.sql
```

### **Step 2: Reset Admin Password**
```bash
node scripts/reset-admin-password.js
```

### **Step 3: Restart Server**
```bash
npm run dev:both
```

### **Step 4: Test**
1. Login as admin (username: `admin`, password: `admin123`)
2. Start a game
3. Deal cards until winner
4. Check `/admin/game-history` page
5. Should see the completed game

---

## 📊 **Verify Everything Works**

### **1. Check RPC Function Exists**
```sql
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_name = 'apply_payouts_and_update_bets';
```
**Should return 1 row.**

### **2. Check Enum Values**
```sql
SELECT unnest(enum_range(NULL::transaction_status));
```
**Should include: 'won', 'lost'**

### **3. Check Admin Password**
```sql
SELECT username, role, length(password_hash) as hash_length
FROM admin_credentials;
```
**Should show admin with 60-character hash.**

### **4. Check Game History**
```sql
SELECT game_id, winner, winning_round, total_bets, total_payouts
FROM game_history
ORDER BY created_at DESC
LIMIT 5;
```
**Should show completed games.**

---

## ⚠️ **Common Issues**

### **Issue: "Cannot find module 'bcryptjs'"**
```bash
npm install bcryptjs @supabase/supabase-js dotenv
```

### **Issue: "Connection refused to Supabase"**
Check `.env` file has correct credentials:
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=eyJhbG...your-service-key
```

### **Issue: "Admin login fails after password reset"**
1. Clear browser cookies
2. Hard refresh (Ctrl+Shift+R)
3. Try login again

### **Issue: "Game history still empty"**
1. Complete at least one game
2. Check database has the record
3. Check API returns data
4. Check frontend console for errors

---

## ✅ **Success Criteria**

After applying all fixes:
- ✅ Admin can login with `admin` / `admin123`
- ✅ Game completes without RPC errors
- ✅ Game history saves to database
- ✅ `/api/admin/game-history` returns game data
- ✅ Admin panel shows game history table
- ✅ Bet statuses are 'won' or 'lost' (not 'pending')
- ✅ User stats update after games

---

## 📞 **Still Having Issues?**

1. Check server logs for errors
2. Check browser console for errors
3. Verify database migration ran successfully
4. Test with fresh browser session (incognito mode)
5. Restart server after database changes

---

## 🎉 **After Fix**

Your system will have:
- ✅ Working admin authentication
- ✅ Complete game history tracking
- ✅ Proper payout processing
- ✅ User statistics updates
- ✅ Full audit trail

**Status:** Ready for production use!
