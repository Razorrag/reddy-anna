# 🔧 FIX VITE/HMR CRASHING ISSUES

## Problem
Vite is crashing with HMR (Hot Module Reload) updates, especially when editing CSS files.

## Root Causes
1. **CSS Import Cycles** - Multiple components importing the same CSS
2. **Memory Issues** - Too many active WebSocket connections during dev
3. **File Watcher Overload** - Large number of files being watched

## Solutions

### **Solution 1: Restart Dev Server**
```bash
# Stop current server (Ctrl+C)
# Clear any port locks
npx kill-port 3000 5000

# Restart
npm run dev:both
```

### **Solution 2: Disable HMR for Problematic Files**
Add to `client/vite.config.ts`:

```typescript
export default defineConfig({
  // ... existing config
  server: {
    hmr: {
      overlay: false, // Disable error overlay
    },
    watch: {
      // Reduce file watching
      ignored: ['**/node_modules/**', '**/.git/**']
    }
  }
})
```

### **Solution 3: Clear Vite Cache**
```bash
# From project root
rm -rf client/node_modules/.vite
rm -rf client/dist

# Restart
npm run dev:both
```

### **Solution 4: Reduce WebSocket Connections**
The issue might be too many WebSocket connections. Each browser tab creates:
- 1 WebSocket for game state
- 1 WebSocket for WebRTC signaling

**Close unnecessary browser tabs** before development.

### **Solution 5: Use Production Build for Testing**
If HMR keeps crashing during development:

```bash
# Build production version
cd client
npm run build

# Serve it
cd ..
npm run dev:server

# In another terminal
cd client
npx serve dist -p 3000
```

## Specific Fix for Your Error

The log shows:
```
[1] 2:41:10 PM [vite] (client) hmr update /src/index.css, /src/pages/player-game.tsx
```

This means **editing `index.css` triggered a cascade**. 

### **Immediate Fix:**
1. Stop the dev server
2. Clear the cache:
   ```bash
   cd client
   rm -rf node_modules/.vite
   ```
3. Restart:
   ```bash
   cd ..
   npm run dev:both
   ```

### **Prevention:**
- Don't edit `index.css` while the server is running
- Make CSS changes, stop server, then restart
- Or use the production build method above

## Database Error Fix

The error:
```
Cannot coerce the result to a single JSON object
```

Means the `daily_stats` query is malformed or the table doesn't exist.

**Run the SQL script:**
1. Go to Supabase Dashboard → SQL Editor
2. Paste contents of `FIX_CRITICAL_DATABASE_ISSUES.sql`
3. Run it
4. Restart your Node server

## Referral Error Fix

The error:
```
Could not find a relationship between 'user_referrals' and 'users' in the schema cache
```

This is a **Supabase schema cache issue**.

**Fix:**
1. Run the SQL script above (it refreshes the cache)
2. Wait 30 seconds for Supabase to propagate
3. Restart your Node server

If still not working:
1. Go to Supabase Dashboard → Table Editor
2. Find `user_referrals` table
3. Click on "Foreign Keys" tab
4. Verify both foreign keys exist:
   - `user_referrals_referrer_user_id_fkey` → `users(id)`
   - `user_referrals_referred_user_id_fkey` → `users(id)`
5. If missing, run the SQL script again

## Quick Fix Checklist

✅ **Step 1:** Stop dev server (Ctrl+C twice)
✅ **Step 2:** Clear Vite cache: `rm -rf client/node_modules/.vite`
✅ **Step 3:** Run SQL fix in Supabase
✅ **Step 4:** Wait 30 seconds
✅ **Step 5:** Restart: `npm run dev:both`
✅ **Step 6:** Close extra browser tabs
✅ **Step 7:** Test in ONE browser tab first

## Monitoring

After restart, watch for these logs:

**Good Signs:**
- `✅ WebSocket authenticated: xxx`
- `[GAME_STATE] Synchronized state for user`
- No schema cache errors

**Bad Signs (means need to re-run SQL):**
- `Could not find a relationship between 'user_referrals' and 'users'`
- `Cannot coerce the result to a single JSON object`

## Alternative: Use Stable Version

If development is too unstable:

```bash
# Switch to last stable commit
git stash  # Save your changes
git log --oneline -20  # Find last working commit
git checkout <commit-hash>

# Test if it works
npm run dev:both

# If it works, bring back your changes
git stash pop
```

---

**TL;DR:**
1. Run `FIX_CRITICAL_DATABASE_ISSUES.sql` in Supabase
2. Clear Vite cache: `rm -rf client/node_modules/.vite`
3. Close extra browser tabs
4. Restart server: `npm run dev:both`









