# 🔧 Critical Fixes Applied - Update VPS Now

## Issues Fixed ✅

1. **Double `/api/api` prefix** - API calls were going to `/api/api/admin/users` instead of `/api/admin/users`
2. **CSP Font Policy** - Added Google Fonts to Content Security Policy
3. **401 Unauthorized errors** - Will be resolved after rebuild

---

## Quick Update Commands for VPS

```bash
# 1. Navigate to project
cd ~/reddy-anna

# 2. Stop the app
pm2 stop andar-bahar

# 3. Pull latest fixes
git pull

# 4. Install dependencies (if needed)
npm install

# 5. Rebuild with fixes
npm run build

# 6. Restart the app
pm2 restart andar-bahar

# 7. Check logs
pm2 logs andar-bahar --lines 30
```

---

## What to Expect After Update

### ✅ Should Work:
- Admin panel user management
- API calls to `/api/admin/users` (no more 404)
- Google Fonts loading without CSP errors
- Authentication working properly

### 🔍 Verify Success:
```bash
# Check PM2 status
pm2 status

# Watch logs in real-time
pm2 logs andar-bahar

# Test API endpoint
curl http://localhost:5000/api/health
```

### 📊 Browser Console Should Show:
```
✅ API Client initialized with baseURL: /api
✅ Requests will be made to: http://91.108.110.72:5000/api
✅ Making request to: /api/admin/users
✅ Response status: 200 for /api/admin/users
```

**No more:**
- ❌ `/api/api/admin/users` (double prefix)
- ❌ 404 errors on admin endpoints
- ❌ CSP font violations

---

## If You Still See Issues

### Check Build Output:
```bash
ls -la dist/
ls -la dist/public/

# Should see:
# dist/index.js (server)
# dist/public/index.html (frontend)
# dist/public/assets/ (JS/CSS)
```

### Clear Browser Cache:
- Hard refresh: `Ctrl + Shift + R` (Windows/Linux) or `Cmd + Shift + R` (Mac)
- Or open in incognito/private window

### Restart Everything:
```bash
pm2 restart andar-bahar
pm2 logs andar-bahar --lines 50
```

---

## Changes Made

### 1. Fixed `client/src/lib/api-client.ts`
**Before:**
```typescript
async get<T>(endpoint: string, params?: Record<string, any>): Promise<T> {
  let url = `${this.baseURL}${endpoint}`; // ❌ Double prefix!
  // ...
}
```

**After:**
```typescript
async get<T>(endpoint: string, params?: Record<string, any>): Promise<T> {
  let url = endpoint; // ✅ Let request() add baseURL
  // ...
}
```

### 2. Fixed `server/index.ts` CSP
**Before:**
```typescript
"font-src 'self' data:;" // ❌ Missing Google Fonts
```

**After:**
```typescript
"font-src 'self' data: https://fonts.gstatic.com;" // ✅ Allows Google Fonts
```

---

## Success Indicators

After update, you should see:

1. **PM2 Status:** `online` with uptime increasing
2. **Logs:** No 404 or 401 errors for admin endpoints
3. **Browser:** Admin panel loads and shows user list
4. **Console:** Clean, no CSP violations

---

## Timeline

- **Build time:** ~30-40 seconds
- **Restart time:** ~2-3 seconds
- **Total downtime:** < 1 minute

Run the commands above and your app will be fully functional! 🚀
