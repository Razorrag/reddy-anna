# 🎯 VISUAL GUIDE: Reset Database in Supabase

## Step-by-Step with Screenshots Instructions

---

## 📍 STEP 1: Login to Supabase

```
🌐 Go to: https://app.supabase.com
```

**Actions:**
1. Enter your Supabase credentials
2. Click "Sign In"
3. You'll see your dashboard with list of projects

---

## 📍 STEP 2: Select Your Project

**Look for:**
- Your project name (e.g., "andar-bahar", "raju-gari-kossu")
- Click on it to open

**You should see:**
```
Left Sidebar with options:
├── Table Editor
├── SQL Editor       ← WE NEED THIS ONE
├── Database
├── Authentication
└── ...
```

---

## 📍 STEP 3: Open SQL Editor

**Click on "SQL Editor" in the left sidebar**

You'll see:
```
┌─────────────────────────────────────────┐
│  + New query                            │
│                                         │
│  Recent queries:                        │
│  (empty or previous queries)            │
└─────────────────────────────────────────┘
```

**Click "+ New query" button**

---

## 📍 STEP 4: Open SQL File on Your Computer

**In your project folder, navigate to:**
```
andar bahar/
└── scripts/
    └── supabase-reset-database.sql  ← OPEN THIS FILE
```

**Open with any text editor:**
- VS Code
- Notepad
- Notepad++
- Any text editor

---

## 📍 STEP 5: Copy ALL Content

**In the SQL file:**
1. Press `Ctrl + A` (Select All)
2. Press `Ctrl + C` (Copy)

**You should copy 1000+ lines starting with:**
```sql
-- ============================================
-- RAJU GARI KOSSU - SUPABASE DATABASE RESET SCRIPT
-- ============================================
```

**And ending with:**
```sql
-- ============================================
-- RESET SCRIPT COMPLETED SUCCESSFULLY
-- ============================================
```

---

## 📍 STEP 6: Paste in Supabase SQL Editor

**In the Supabase SQL Editor:**

1. Click in the editor area (large text box)
2. Press `Ctrl + V` (Paste)

**You should see:**
```
┌─────────────────────────────────────────┐
│  Untitled query                [RUN] ←  │
├─────────────────────────────────────────┤
│ 1  -- ============================...   │
│ 2  -- RAJU GARI KOSSU - SUPABASE...    │
│ 3  -- ============================...   │
│ 4  -- Complete database reset wi...     │
│ 5  -- Generated: November 1, 202...     │
│ 6  -- ⚠️  WARNING: THIS WILL DE...     │
│ 7  -- ============================...   │
│ 8                                        │
│ 9  -- ============================...   │
│ 10 -- STEP 1: CLEAN SLATE - DR...      │
│ ... (1000+ more lines)                  │
└─────────────────────────────────────────┘
```

---

## 📍 STEP 7: RUN THE SCRIPT

**Look for the "RUN" button:**
- Usually in top-right corner of editor
- Or press `Ctrl + Enter`

**Click "RUN"**

---

## 📍 STEP 8: Watch Progress

**You'll see output appearing below:**

```
┌─────────────────────────────────────────┐
│  Results                                │
├─────────────────────────────────────────┤
│  ⏳ Running query...                    │
│                                         │
│  DROP TABLE IF EXISTS...                │
│  DROP TYPE IF EXISTS...                 │
│  CREATE EXTENSION...                    │
│  CREATE TYPE...                         │
│  CREATE TABLE users...                  │
│  CREATE TABLE admin_credentials...      │
│  ...                                    │
└─────────────────────────────────────────┘
```

**Wait 30-60 seconds...**

---

## 📍 STEP 9: Verify Success

**Scroll to the BOTTOM of output, you should see:**

```sql
✅ Database reset completed successfully!
📊 Verification Results:
2 admin accounts created
8 test users created
19 game settings configured
4 stream settings configured
8 test transactions recorded

👤 Admin Accounts:
username          | role         | created_at
admin            | admin        | 2025-11-01 ...
rajugarikossu    | super_admin  | 2025-11-01 ...

👥 Test User Accounts:
phone        | full_name           | balance    | status
8686886632   | Owner Test Account  | 500000.00  | active
8888888888   | High Roller        | 250000.00  | active
9876543210   | Test Player 1 - VIP| 100000.00  | active
...
```

**If you see this = SUCCESS! ✅**

---

## 📍 STEP 10: Test Login

### Test Admin Login:

1. Go to your app: `http://localhost:5000/admin/login`
2. Enter:
   ```
   Username: admin
   Password: admin123
   ```
3. Click Login
4. Should redirect to admin dashboard ✅

### Test Player Login:

1. Go to: `http://localhost:5000/login`
2. Enter:
   ```
   Phone: 9876543210
   Password: Test@123
   ```
3. Click Login
4. Should see game interface with ₹1,00,000 balance ✅

---

## ❌ Common Errors & Solutions

### Error: "permission denied for table"
**Solution:** You need to be project owner/admin in Supabase

### Error: "syntax error at or near"
**Solution:** Make sure you copied the ENTIRE file, not just parts

### Error: "relation already exists"
**Solution:** Script drops tables first - this shouldn't happen. Run again.

### Error: "function does not exist"
**Solution:** Run the COMPLETE script, not individual parts

---

## 🎯 Visual Checklist

```
☐ 1. Logged into Supabase
☐ 2. Selected correct project
☐ 3. Opened SQL Editor
☐ 4. Clicked "New query"
☐ 5. Opened supabase-reset-database.sql file
☐ 6. Selected ALL content (Ctrl+A)
☐ 7. Copied content (Ctrl+C)
☐ 8. Pasted in Supabase editor (Ctrl+V)
☐ 9. Clicked RUN button
☐ 10. Waited for completion (30-60 sec)
☐ 11. Verified success message
☐ 12. Tested admin login
☐ 13. Tested player login
```

---

## 🔍 What Each Section Does

```sql
-- STEP 1: DROP EVERYTHING
→ Removes all old tables, functions, triggers

-- STEP 2: ENABLE EXTENSIONS  
→ Enables PostgreSQL extensions needed

-- STEP 3: CREATE ENUM TYPES
→ Creates custom types (user_role, game_phase, etc.)

-- STEP 4: CREATE CORE TABLES
→ Creates all 27 tables

-- STEP 5: CREATE DATABASE FUNCTIONS
→ Creates utility functions

-- STEP 6: CREATE TRIGGERS
→ Sets up automatic triggers

-- STEP 7: CREATE INDEXES
→ Creates indexes for performance

-- STEP 8: CREATE VIEWS
→ Creates database views

-- STEP 9-12: INSERT DEFAULT DATA
→ Inserts game settings, stream settings

-- STEP 13: CREATE ADMIN ACCOUNTS
→ Creates 2 admin accounts with fresh hashes

-- STEP 14: CREATE TEST USERS
→ Creates 8 test users with fresh hashes

-- STEP 15: INSERT TEST TRANSACTIONS
→ Creates initial deposit transactions

-- STEP 16-17: GRANT PERMISSIONS
→ Sets up database permissions

-- STEP 18: VERIFICATION
→ Runs verification queries
```

---

## 💡 Pro Tips

### Tip 1: Save Query
After pasting, give your query a name:
```
Click on "Untitled query" → Rename to "Database Reset"
```
This saves it for future use.

### Tip 2: Check Tables Created
After reset, go to:
```
Left Sidebar → Table Editor
```
You should see 27 tables listed.

### Tip 3: Verify Data
Run this query to check data:
```sql
SELECT COUNT(*) FROM users;
-- Should return: 8

SELECT COUNT(*) FROM admin_credentials;
-- Should return: 2
```

---

## 🎉 Success Indicators

You know it worked when:

✅ No red error messages  
✅ See "Database reset completed successfully!"  
✅ See verification results with counts  
✅ Admin login works  
✅ Player login works  
✅ Balances show correctly  

---

## 📱 Quick Reference

**SQL File Location:**
```
scripts/supabase-reset-database.sql
```

**Admin Login:**
```
Username: admin
Password: admin123
```

**Test Player Login:**
```
Phone: 9876543210
Password: Test@123
```

---

## 🆘 Still Stuck?

1. Check `SUPABASE_RESET_GUIDE.md` for detailed troubleshooting
2. Verify you're using the correct Supabase project
3. Check you have admin/owner permissions
4. Make sure you copied the ENTIRE SQL file
5. Check Supabase logs for specific errors

---

**Last Updated:** November 1, 2025  
**Ready to Use:** ✅ YES  
**Fresh Hashes:** ✅ YES  
**Tested:** ✅ YES  

---

## 🚀 GO DO IT NOW!

You have everything you need. Just follow the steps above!



