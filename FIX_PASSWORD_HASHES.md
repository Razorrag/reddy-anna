# 🔧 Fix Password Hashes - Login Issue

## ✅ Issue Identified

**Test Results:**
- ✅ Server is running correctly
- ✅ Database connection works
- ❌ Login fails: "Invalid password"
- ❌ Admin login fails: "Invalid password"

**Root Cause:** The password hashes in the database don't match the test passwords.

---

## 🔧 Solution: Update Password Hashes

You have **2 options** to fix this:

### Option 1: Update Password Hashes Only (Quick Fix)

**Step 1:** Go to your **Supabase Dashboard**
- Open your project
- Go to **SQL Editor**

**Step 2:** Run this SQL script:

```sql
-- Update Admin Accounts
-- Password: admin123
UPDATE admin_credentials 
SET password_hash = '$2b$12$kboT2aS9EqAQjfbcAGL3GOYSBtrJsgq2eLPxonASwnnUjeNfNZ9ZW',
    updated_at = NOW()
WHERE username IN ('admin', 'rajugarikossu');

-- Update Test User Accounts  
-- Password: Test@123
UPDATE users 
SET password_hash = '$2b$12$tRhJv.A9JJ2rKdJp2rCmcePr.QDZTtAxLZTbILHFsuLYUhxshkaKu',
    updated_at = NOW()
WHERE phone IN ('9876543210', '9876543211', '9876543212', '9876543213', '9876543214');
```

**Step 3:** Click **Run** to execute the SQL

**Step 4:** Test login again

---

### Option 2: Complete Database Reset (Full Fix)

**Step 1:** Go to your **Supabase Dashboard**
- Open your project
- Go to **SQL Editor**

**Step 2:** Copy the entire contents of `scripts/reset-and-recreate-database.sql`

**Step 3:** Paste it into the SQL Editor

**Step 4:** Click **Run** to execute

**Note:** This will:
- ✅ Reset all tables
- ✅ Create fresh password hashes
- ✅ Create admin and test user accounts
- ✅ Set up all game settings

---

## ✅ Test Credentials (After Fix)

After running either option above, you can login with:

### User Login:
- **Phone:** `9876543210`
- **Password:** `Test@123`

### Admin Login:
- **Username:** `admin`
- **Password:** `admin123`

---

## 🧪 Verify Fix

After updating the password hashes, run:

```bash
node scripts/test-login-signup.js
```

You should see:
- ✅ User login successful
- ✅ Admin login successful

---

## 📝 Quick Reference

**File to run in Supabase:**
- Quick fix: `scripts/update-password-hashes.sql`
- Full reset: `scripts/reset-and-recreate-database.sql`

**Password Hashes:**
- Admin password: `admin123`
- User password: `Test@123`

---

**Status:** Password hashes need to be updated in database. Once updated, login will work correctly.







