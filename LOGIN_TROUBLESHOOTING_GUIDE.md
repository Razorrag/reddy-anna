# 🔧 Login Troubleshooting Guide

## ✅ Issue Summary

You're experiencing login issues. Based on diagnostics:

### Current Status:
- ✅ Environment variables are set correctly
- ✅ Database connection is working
- ❌ **Server is NOT running** (this is the main issue)

---

## 🚀 Step-by-Step Solution

### Step 1: Start the Server

**Option A: Start both server and client together (Recommended)**
```bash
npm run dev:both
```

**Option B: Start server and client separately**
```bash
# Terminal 1: Start backend server
npm run dev

# Terminal 2: Start frontend client  
npm run dev:client
```

**Option C: Start just the server**
```bash
npm run dev
```

### Step 2: Verify Server is Running

After starting the server, you should see:
```
✅ Server started on port 5000
✅ JWT Authentication enabled
✅ Supabase connection configured
```

If you see errors, check the sections below.

---

## 🔍 Common Issues & Solutions

### Issue 1: Server Won't Start

**Symptoms:**
- Error messages in terminal
- Port 5000 already in use
- Missing dependencies

**Solutions:**

**Port 5000 already in use:**
```bash
# Windows: Find and kill process on port 5000
netstat -ano | findstr :5000
taskkill /PID <PID_NUMBER> /F

# Or change port in .env file
PORT=5001
```

**Missing dependencies:**
```bash
npm install
```

**Environment variables not loading:**
- Check `.env` file exists in root directory
- Verify `.env` has: `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `JWT_SECRET`

### Issue 2: Database Connection Errors

**Symptoms:**
- "Missing Supabase credentials" error
- "Database connection failed" error

**Solutions:**

1. **Verify .env file:**
   ```env
   SUPABASE_URL=your_supabase_url
   SUPABASE_SERVICE_KEY=your_supabase_service_key
   JWT_SECRET=your_jwt_secret
   ```

2. **Test database connection:**
   ```bash
   node scripts/diagnose-supabase-connection.js
   ```

3. **If database is not set up:**
   - Go to Supabase Dashboard
   - Open SQL Editor
   - Run: `scripts/reset-and-recreate-database.sql`

### Issue 3: Login Fails After Server Starts

**Symptoms:**
- Server is running
- Login request fails
- "Invalid credentials" error

**Solutions:**

1. **Test login endpoint:**
   ```bash
   node scripts/test-login-signup.js
   ```

2. **Verify test credentials:**
   - **User Login:**
     - Phone: `9876543210`
     - Password: `Test@123`
   
   - **Admin Login:**
     - Username: `admin`
     - Password: `admin123`

3. **If credentials don't work:**
   - Run database reset script in Supabase
   - This will create fresh password hashes

### Issue 4: Browser Can't Connect to Server

**Symptoms:**
- "Network Error" in browser
- "Cannot reach server" message
- CORS errors

**Solutions:**

1. **Check server is running:**
   - Open browser: `http://localhost:5000/health`
   - Should see server response

2. **Check CORS settings:**
   - Server should allow requests from `http://localhost:3000`
   - Check `server/index.ts` for CORS configuration

3. **Check proxy settings:**
   - Client should proxy `/api` requests to `http://localhost:5000`
   - Check `client/vite.config.ts` for proxy configuration

---

## 🧪 Testing Commands

### Test Server Health
```bash
node scripts/test-login-signup.js
```

### Test Database Connection
```bash
node scripts/diagnose-supabase-connection.js
```

### Test Login Endpoints
```bash
node scripts/diagnose-login-issue.js
```

---

## 📋 Quick Checklist

Before trying to login, verify:

- [ ] Server is running (`npm run dev`)
- [ ] Server started without errors
- [ ] Environment variables are set in `.env`
- [ ] Database is accessible (run diagnostic script)
- [ ] Using correct credentials:
  - User: Phone `9876543210`, Password `Test@123`
  - Admin: Username `admin`, Password `admin123`

---

## 🎯 Expected Login Flow

### User Login:
1. Open browser: `http://localhost:3000/login`
2. Enter phone: `9876543210`
3. Enter password: `Test@123`
4. Click "Sign In"
5. Should redirect to `/game`

### Admin Login:
1. Open browser: `http://localhost:3000/admin-login`
2. Enter username: `admin`
3. Enter password: `admin123`
4. Click "Admin Login"
5. Should redirect to `/admin`

---

## 🐛 Debug Steps

If login still doesn't work:

1. **Check Browser Console:**
   - Open DevTools (F12)
   - Check Console tab for errors
   - Check Network tab for failed requests

2. **Check Server Logs:**
   - Look at terminal where server is running
   - Check for error messages
   - Look for "Login attempt" messages

3. **Check Authentication:**
   - After login, check localStorage:
     - `localStorage.getItem('token')` should have a token
     - `localStorage.getItem('user')` should have user data
     - `localStorage.getItem('isLoggedIn')` should be `'true'`

4. **Verify Password Hashes:**
   - If login fails, password hashes might be wrong
   - Run database reset script to fix

---

## 📝 Next Steps

1. **Start the server:**
   ```bash
   npm run dev
   ```

2. **Wait for server to start** (should see "Server started on port 5000")

3. **Open browser** to `http://localhost:3000`

4. **Try logging in** with test credentials

5. **If still failing**, run diagnostic:
   ```bash
   node scripts/diagnose-login-issue.js
   ```

6. **Share the diagnostic output** for further help

---

## 🔗 Related Files

- Server startup: `server/index.ts`
- User login: `server/routes.ts` (line ~1825)
- Admin login: `server/routes.ts` (line ~1861)
- Client login: `client/src/pages/login.tsx`
- Client admin login: `client/src/pages/admin-login.tsx`
- Database reset: `scripts/reset-and-recreate-database.sql`

---

**Status**: Server needs to be started for login to work. Once server is running, login should work with the test credentials provided.




