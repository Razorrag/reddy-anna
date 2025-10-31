# 🧪 LOGIN TESTING & DEBUGGING GUIDE

## 🎯 STEP-BY-STEP TESTING PROCEDURE

### Phase 1: Database Setup ✅

#### 1.1 Open Supabase SQL Editor
1. Go to https://supabase.com/dashboard
2. Select your project: `rfwhpsuahpxbeqbfgbrp`
3. Click on "SQL Editor" in the left sidebar

#### 1.2 Run Quick Fix Script
```sql
-- Copy and paste the entire QUICK_FIX_LOGIN.sql file
-- Then click "Run" or press Ctrl+Enter
```

#### 1.3 Verify Output
You should see messages like:
```
✅ Admin account exists: username=admin, password=admin123
✅ Total users in database: 2
```

---

### Phase 2: Server Testing 🖥️

#### 2.1 Start the Server
```bash
# In your project root directory
npm run dev
```

#### 2.2 Check Server Logs
Look for these messages:
```
✅ All required environment variables are set
✅ CORS configured
✅ Session middleware configured
serving on http://0.0.0.0:5000
```

#### 2.3 Test Database Connection
Open a new terminal and run:
```bash
curl http://localhost:5000/api/health
```

Expected response:
```json
{"status":"ok","timestamp":"..."}
```

---

### Phase 3: API Testing 🔌

#### 3.1 Test Admin Login API
```bash
# Windows PowerShell
$body = @{
    username = "admin"
    password = "admin123"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:5000/api/auth/admin-login" `
    -Method POST `
    -Body $body `
    -ContentType "application/json"
```

**Expected Response:**
```json
{
  "success": true,
  "admin": {
    "id": "...",
    "username": "admin",
    "role": "admin",
    "token": "eyJhbGc...",
    "refreshToken": "eyJhbGc..."
  }
}
```

**Error Response (if failed):**
```json
{
  "success": false,
  "error": "Admin not found" // or "Invalid password"
}
```

#### 3.2 Test User Login API
```bash
# Windows PowerShell
$body = @{
    phone = "9876543210"
    password = "admin123"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:5000/api/auth/login" `
    -Method POST `
    -Body $body `
    -ContentType "application/json"
```

**Expected Response:**
```json
{
  "success": true,
  "user": {
    "id": "9876543210",
    "phone": "9876543210",
    "balance": 100000,
    "role": "player",
    "token": "eyJhbGc..."
  }
}
```

---

### Phase 4: Browser Testing 🌐

#### 4.1 Open Browser DevTools
1. Press F12 to open DevTools
2. Go to "Console" tab
3. Go to "Network" tab

#### 4.2 Test User Login
1. Navigate to: http://localhost:5173/login
2. Enter credentials:
   - Phone: `9876543210`
   - Password: `admin123`
3. Click "Sign In"

#### 4.3 Check Console Logs
Look for these messages:
```
Sending login request for: 9876543210
Making request to: /api/auth/login
Response status: 200 for /api/auth/login
✅ Token stored successfully
```

#### 4.4 Check Network Tab
1. Find the `login` request
2. Check Status: Should be `200 OK`
3. Check Response:
```json
{
  "success": true,
  "user": {...}
}
```

#### 4.5 Check Local Storage
In Console, run:
```javascript
console.log('User:', localStorage.getItem('user'));
console.log('Token:', localStorage.getItem('token'));
console.log('Is Logged In:', localStorage.getItem('isLoggedIn'));
```

Should show:
```
User: {"id":"9876543210","phone":"9876543210","balance":100000,"role":"player"}
Token: eyJhbGc...
Is Logged In: true
```

#### 4.6 Test Admin Login
1. Navigate to: http://localhost:5173/admin-login
2. Enter credentials:
   - Username: `admin`
   - Password: `admin123`
3. Click "Sign In"
4. Should redirect to admin dashboard

---

## 🐛 COMMON ERRORS & SOLUTIONS

### Error 1: "User not found"
**Cause:** No user exists in database with that phone number

**Solution:**
```sql
-- Run in Supabase SQL Editor
SELECT * FROM users WHERE phone = '9876543210';
-- If no results, run QUICK_FIX_LOGIN.sql again
```

---

### Error 2: "Admin not found"
**Cause:** No admin exists in admin_credentials table

**Solution:**
```sql
-- Run in Supabase SQL Editor
SELECT * FROM admin_credentials WHERE username = 'admin';
-- If no results, run QUICK_FIX_LOGIN.sql again
```

---

### Error 3: "Invalid password"
**Cause:** Password hash doesn't match or bcrypt comparison failed

**Debug Steps:**
1. Check server logs for bcrypt errors
2. Verify password hash in database:
```sql
SELECT username, password_hash FROM admin_credentials WHERE username = 'admin';
-- Should be: $2b$12$ZAn9noQkk7Adv.efdK/77e8BZark6rSz5I5PfoZUo3rjmeegIbg8K
```

**Solution:**
```sql
-- Reset password hash
UPDATE admin_credentials 
SET password_hash = '$2b$12$ZAn9noQkk7Adv.efdK/77e8BZark6rSz5I5PfoZUo3rjmeegIbg8K'
WHERE username = 'admin';
```

---

### Error 4: "CORS Error" or "Network Error"
**Cause:** CORS configuration or server not running

**Debug Steps:**
1. Check if server is running: `curl http://localhost:5000/api/health`
2. Check CORS_ORIGIN in .env file
3. Check browser console for CORS errors

**Solution:**
```env
# In .env file
CORS_ORIGIN=http://localhost:5173
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000,http://localhost:5000
```

---

### Error 5: "Missing Supabase credentials"
**Cause:** .env file missing or incorrect Supabase credentials

**Debug Steps:**
1. Check .env file exists in project root
2. Verify SUPABASE_URL and SUPABASE_SERVICE_KEY are set

**Solution:**
```env
# In .env file
SUPABASE_URL=https://rfwhpsuahpxbeqbfgbrp.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

### Error 6: "Invalid or expired token"
**Cause:** JWT token validation failed

**Debug Steps:**
1. Check JWT_SECRET in .env file
2. Check token in localStorage
3. Check server logs for JWT errors

**Solution:**
```env
# In .env file
JWT_SECRET=your-very-secure-jwt-secret-key-at-least-32-characters-long-for-production
JWT_EXPIRES_IN=1h
```

---

### Error 7: "Database connection error"
**Cause:** Cannot connect to Supabase

**Debug Steps:**
1. Check Supabase project status
2. Verify SUPABASE_URL is correct
3. Verify SUPABASE_SERVICE_KEY is correct
4. Check network connectivity

**Solution:**
1. Go to Supabase dashboard
2. Check if project is active
3. Regenerate service key if needed
4. Update .env file

---

## 🔍 DEBUGGING CHECKLIST

### Before Testing:
- [ ] Server is running on port 5000
- [ ] Client is running on port 5173
- [ ] .env file exists with all required variables
- [ ] Supabase project is active
- [ ] Database tables exist

### During Testing:
- [ ] Browser DevTools is open
- [ ] Console tab is visible
- [ ] Network tab is recording
- [ ] Server terminal is visible

### After Failed Login:
- [ ] Check browser console for errors
- [ ] Check server logs for errors
- [ ] Check Network tab for failed requests
- [ ] Check localStorage for stored data
- [ ] Check database for user/admin records

---

## 📊 VERIFICATION QUERIES

Run these in Supabase SQL Editor to verify everything:

```sql
-- 1. Check admin exists
SELECT id, username, role, created_at 
FROM admin_credentials 
WHERE username = 'admin';

-- 2. Check users exist
SELECT id, phone, full_name, role, status, balance 
FROM users 
ORDER BY created_at DESC;

-- 3. Check table structure
SELECT table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_name IN ('users', 'admin_credentials')
ORDER BY table_name, ordinal_position;

-- 4. Check ENUM types (if using database_schema_fixed.sql)
SELECT typname, typtype 
FROM pg_type 
WHERE typtype = 'e';

-- 5. Test password hash
SELECT 
  username,
  CASE 
    WHEN password_hash = '$2b$12$ZAn9noQkk7Adv.efdK/77e8BZark6rSz5I5PfoZUo3rjmeegIbg8K' 
    THEN '✅ Correct hash for admin123'
    ELSE '❌ Wrong hash'
  END as password_status
FROM admin_credentials 
WHERE username = 'admin';
```

---

## 🎯 SUCCESS CRITERIA

Login is working when:

✅ **Admin Login:**
- Can login with username: `admin`, password: `admin123`
- Redirects to admin dashboard
- Token stored in localStorage
- Session created on server

✅ **User Login:**
- Can login with phone: `9876543210`, password: `admin123`
- Redirects to game page
- Token stored in localStorage
- Session created on server
- Balance shows ₹100,000

✅ **Registration:**
- Can create new user account
- User stored in database
- Auto-login after registration
- Redirects to game page

---

## 🚨 EMERGENCY RESET

If everything fails, run this complete reset:

```sql
-- ⚠️ WARNING: This will delete ALL data!

-- Drop all tables
DROP TABLE IF EXISTS admin_requests CASCADE;
DROP TABLE IF EXISTS request_audit CASCADE;
DROP TABLE IF EXISTS admin_dashboard_settings CASCADE;
DROP TABLE IF EXISTS whatsapp_messages CASCADE;
DROP TABLE IF EXISTS user_referrals CASCADE;
DROP TABLE IF EXISTS blocked_users CASCADE;
DROP TABLE IF EXISTS game_history CASCADE;
DROP TABLE IF EXISTS game_statistics CASCADE;
DROP TABLE IF EXISTS user_transactions CASCADE;
DROP TABLE IF EXISTS player_bets CASCADE;
DROP TABLE IF EXISTS dealt_cards CASCADE;
DROP TABLE IF EXISTS game_sessions CASCADE;
DROP TABLE IF EXISTS game_settings CASCADE;
DROP TABLE IF EXISTS stream_settings CASCADE;
DROP TABLE IF EXISTS user_creation_log CASCADE;
DROP TABLE IF EXISTS admin_credentials CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS daily_game_statistics CASCADE;
DROP TABLE IF EXISTS monthly_game_statistics CASCADE;
DROP TABLE IF EXISTS yearly_game_statistics CASCADE;

-- Drop ENUM types
DROP TYPE IF EXISTS user_role CASCADE;
DROP TYPE IF EXISTS user_status CASCADE;
DROP TYPE IF EXISTS game_phase CASCADE;
DROP TYPE IF EXISTS game_status CASCADE;
DROP TYPE IF EXISTS bet_side CASCADE;
DROP TYPE IF EXISTS transaction_type CASCADE;
DROP TYPE IF EXISTS transaction_status CASCADE;
DROP TYPE IF EXISTS request_status CASCADE;
```

Then run the entire `supabase_schema_complete.sql` file.

---

## 📞 NEXT STEPS IF STILL FAILING

1. **Share Error Messages:**
   - Browser console errors
   - Server terminal errors
   - Network tab response

2. **Share Query Results:**
   - Run verification queries above
   - Share the output

3. **Check Environment:**
   - Node.js version: `node --version`
   - npm version: `npm --version`
   - OS: Windows/Mac/Linux

4. **Verify Files:**
   - .env file contents (hide sensitive keys)
   - package.json dependencies
   - Database schema used

---

Generated: $(Get-Date)
