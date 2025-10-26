# 🚨 FIX YOUR PRODUCTION SITE RIGHT NOW

**Your Site:** http://91.108.110.72:5000  
**Problem:** Security vulnerabilities + old code running  
**Time to Fix:** 5 minutes

---

## 🎯 WHAT YOU NEED TO DO (3 OPTIONS)

### Option 1: Quick Local Fix (If This Is Development)

If you're running on your local machine (Windows):

```powershell
# 1. Stop your server (Ctrl+C in terminal)

# 2. Rebuild frontend
cd client
npm run build

# 3. Start server
cd ..
npm start
```

### Option 2: Remote Server Fix (If Running on 91.108.110.72)

If your app is on the remote server:

```bash
# 1. SSH to server
ssh user@91.108.110.72

# 2. Navigate to project
cd /path/to/andar-bahar

# 3. Rebuild frontend
cd client
npm run build

# 4. Restart backend
cd ..
pm2 restart all
# or
npm start
```

### Option 3: Use Deployment Script

**Windows (Local):**
```powershell
cd "c:\Users\15anu\Desktop\andar bahar\andar bahar"
.\scripts\emergency-deploy.ps1
```

**Linux (Server):**
```bash
cd /path/to/andar-bahar
chmod +x scripts/emergency-deploy.sh
./scripts/emergency-deploy.sh
```

---

## 🔴 CRITICAL: Clear Browser Cache

**AFTER deploying, ALL USERS must:**

### Steps:
1. Press **F12** (opens DevTools)
2. Go to **Application** tab (Chrome) or **Storage** tab (Firefox)
3. Click **Local Storage** → Your domain
4. **Right-click → Clear**
5. Click **Cookies** → Your domain
6. **Right-click → Delete**
7. Close DevTools
8. Press **Ctrl + Shift + R** (hard refresh)

### Or Quick Method:
Press F12, then in Console tab, paste:
```javascript
localStorage.clear();
sessionStorage.clear();
document.cookie.split(";").forEach(c => document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"));
location.reload(true);
```

---

## ✅ HOW TO VERIFY IT'S FIXED

### Test 1: Check Network Tab
1. Press F12 → Network tab
2. Reload page
3. Look at API calls
4. ✅ Should see: `/api/user/profile`
5. ❌ Should NOT see: `/api/api/user/profile`

### Test 2: Check Authentication
1. Open new incognito window
2. Go to: `http://91.108.110.72:5000/admin`
3. ✅ Should redirect to login page
4. ❌ Should NOT show admin panel

### Test 3: Check WebSocket
1. Login as admin
2. Press F12 → Console
3. Look for: "WebSocket authenticated"
4. ✅ Should show: `role: 'admin'`
5. ❌ Should NOT show: `role: 'player'` or `userId: 'anonymous'`

---

## 🆘 IF STILL NOT WORKING

### Issue: Still seeing `/api/api/`

**Cause:** Frontend not rebuilt on server  
**Fix:**
```bash
# On server
cd client
rm -rf dist/
npm run build
pm2 restart all
```

### Issue: Still can access admin without login

**Cause:** Server in development mode  
**Fix:**
```bash
# Check current mode
echo $NODE_ENV

# If it says "development", fix it:
export NODE_ENV=production
pm2 restart all

# Or stop and restart:
pm2 delete all
NODE_ENV=production pm2 start ecosystem.config.cjs
```

### Issue: WebSocket still shows anonymous

**Cause:** Old localStorage in browser  
**Fix:**
1. Press F12 → Console
2. Run: `localStorage.clear(); location.reload();`
3. Login again

---

## 📞 WHAT I FIXED FOR YOU

### 1. API Client Double Prefix ✅
**Before:** `/api/api/user/profile` → 404  
**After:** `/api/user/profile` → 200

### 2. Development Mode Bypass ✅
**Before:** Any request gets admin access in dev mode  
**After:** All requests require proper authentication

### 3. WebSocket Anonymous Fallback ✅
**Before:** Falls back to anonymous if no token  
**After:** Requires valid JWT token, no anonymous access

---

## 🎯 QUICK COMMAND REFERENCE

### Check What's Running
```bash
# Check if server is responding
curl http://91.108.110.72:5000/api/game/current

# Check if auth is required (should return 401)
curl http://91.108.110.72:5000/api/admin/users

# Check PM2 status
pm2 status

# Check Node processes
ps aux | grep node
```

### Rebuild & Restart
```bash
# Full rebuild
cd client && npm run build && cd ..

# Restart with PM2
pm2 restart all

# Restart manually
pkill node && npm start
```

### Check Logs
```bash
# PM2 logs
pm2 logs

# Live logs
pm2 logs --lines 100 --raw

# Save logs to file
pm2 logs > logs.txt
```

---

## 🚀 SUMMARY

**Files Changed:**
- ✅ `client/src/lib/api-client.ts` - Fixed double prefix
- ✅ `client/src/contexts/WebSocketContext.tsx` - Fixed auth
- ✅ `server/routes.ts` - Removed security holes

**What You Need to Do:**
1. Rebuild frontend: `cd client && npm run build`
2. Restart backend: `pm2 restart all`
3. Clear browser cache
4. Test everything

**Expected Result:**
- ✅ No `/api/api/` in network tab
- ✅ Admin requires login
- ✅ WebSocket shows authenticated role
- ✅ API returns 401 without auth

---

**Time:** 5 minutes  
**Difficulty:** Easy  
**Impact:** CRITICAL security fixes

**DO IT NOW!** 🚀
