# 🔍 Is My Server Using the New Code?

## Quick Test

### Method 1: Check Server Logs

When your server starts, you should see:
```
✅ Server running on port 5000
```

When a game completes, you should see:
```
💾 Processing 3 payouts individually (atomic + idempotent)...
🔍 VALIDATION: Total payout = ₹225,000
✅ Added ₹100,000 to user 1234567890
✅ Updated bet abc-123: won, payout=₹100,000
✅ Created transaction record: game_xxx_user_yyy_zzz
✅ All payouts processed: 3 users, 5 bets updated (487ms)
```

**If you see this instead:**
```
💾 Calling storage.applyPayoutsAndupdateBets with:
❌ Error applying payouts and updating bets
```
→ **Server is using OLD code** - Restart it!

---

### Method 2: Check the Running Process

```bash
# Find the Node.js process
ps aux | grep node

# Or on Windows:
tasklist | findstr node
```

**If you see a process** → Server is running with old code  
**Solution:** Kill it and restart

```bash
# Kill the process (replace PID with actual process ID)
kill -9 <PID>

# Or on Windows:
taskkill /F /PID <PID>

# Then restart
npm run dev
```

---

### Method 3: Check File Modification Time

```bash
# Check when game.ts was last modified
ls -la server/game.ts

# Or on Windows:
dir server\game.ts
```

**If modified recently** → File has changes, but server needs restart

---

### Method 4: Force Restart

```bash
# Stop ALL Node processes
pkill -9 node

# Or on Windows:
taskkill /F /IM node.exe

# Clear any cached modules
rm -rf node_modules/.cache

# Restart
npm run dev
```

---

## 🎯 Definitive Test

Run a complete game and check the database:

### Step 1: Complete a Game

1. Start game as admin
2. Place bet as player (₹1,000)
3. Complete game

### Step 2: Check Database

```sql
-- Check if transaction was created with 'win' type
SELECT 
  id,
  user_id,
  transaction_type,
  amount,
  description,
  created_at
FROM user_transactions
WHERE transaction_type = 'win'
ORDER BY created_at DESC
LIMIT 5;
```

**If you see results** → ✅ New code is working!  
**If empty** → ❌ Old code still running OR migration not applied

---

## 🚨 Common Issues

### Issue 1: "Port already in use"
```
Error: listen EADDRINUSE: address already in use :::5000
```

**Solution:**
```bash
# Find process using port 5000
lsof -i :5000

# Or on Windows:
netstat -ano | findstr :5000

# Kill it
kill -9 <PID>

# Restart
npm run dev
```

---

### Issue 2: Server Restarts But Still Shows Old Logs

**Problem:** Your terminal is showing cached logs  
**Solution:** Clear terminal and restart

```bash
# Clear terminal
clear

# Or on Windows:
cls

# Restart server
npm run dev
```

---

### Issue 3: Changes Not Taking Effect

**Problem:** Node.js is caching modules  
**Solution:**

```bash
# Stop server
# Delete cache
rm -rf node_modules/.cache
rm -rf dist

# Rebuild
npm run build

# Restart
npm run dev
```

---

## ✅ Confirmation Checklist

Your server is using the new code if:

- [ ] Server logs show "Processing X payouts individually"
- [ ] No "applyPayoutsAndupdateBets" in logs
- [ ] Database has transactions with type='win'
- [ ] No "game_payout" errors
- [ ] Payouts complete in < 1 second

---

## 🔧 Nuclear Option (If Nothing Works)

```bash
# 1. Stop everything
pkill -9 node

# 2. Clean everything
rm -rf node_modules
rm -rf dist
rm -rf .cache

# 3. Reinstall
npm install

# 4. Rebuild
npm run build

# 5. Restart
npm run dev
```

---

## 📞 Still Not Working?

If you've tried everything above:

1. **Copy the EXACT error message** you're seeing
2. **Check which file** the error is coming from
3. **Verify the SQL migration** was applied (run verify-fix-status.sql)
4. **Check Supabase logs** in the dashboard

The issue is likely one of:
- ❌ Server not restarted
- ❌ SQL migration not applied
- ❌ Old function still in database
- ❌ Node.js caching old code
