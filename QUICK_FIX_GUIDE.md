# 🚨 QUICK FIX GUIDE - CRITICAL DATABASE ERROR

## Error You're Seeing
```
ERROR: P0001: Critical table "bets" does not exist!
```

## Root Cause
Your database schema has a table called `player_bets` but the backend code is looking for `bets`.

## IMMEDIATE FIX - Choose ONE:

---

### **OPTION A: Run Simple Fix (RECOMMENDED)** ⚡

1. **Open Supabase Dashboard** → SQL Editor
2. **Copy and paste this:**

```sql
-- Create 'bets' table
CREATE TABLE IF NOT EXISTS bets (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id VARCHAR(20) NOT NULL,
  game_id VARCHAR(36) NOT NULL,
  round INTEGER NOT NULL DEFAULT 1,
  side VARCHAR(10) NOT NULL,
  amount DECIMAL(15, 2) NOT NULL,
  potential_payout DECIMAL(15, 2),
  actual_payout DECIMAL(15, 2),
  payout_amount DECIMAL(15, 2),
  result VARCHAR(20),
  settled BOOLEAN DEFAULT false,
  settled_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT fk_bets_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_bets_game FOREIGN KEY (game_id) REFERENCES game_sessions(game_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_bets_user_id ON bets(user_id);
CREATE INDEX IF NOT EXISTS idx_bets_game_id ON bets(game_id);

GRANT ALL ON bets TO authenticated;
NOTIFY pgrst, 'reload schema';
```

3. **Click RUN**
4. **Restart your Node server**

---

### **OPTION B: Run Complete Script** 📋

If you want to be thorough:

1. **Open Supabase Dashboard** → SQL Editor
2. **Copy entire contents of `FIX_MISSING_BETS_TABLE.sql`**
3. **Click RUN**
4. **Wait 30 seconds**
5. **Restart Node server**

---

### **OPTION C: Use Full Schema Reset** 🔄

If tables are really messed up:

1. **Backup your data first!**
2. **Open Supabase Dashboard** → SQL Editor  
3. **Run `COMPLETE_DATABASE_SETUP.sql`** (I just created it)
4. **Wait 30 seconds**
5. **Restart Node server**

---

## After Running SQL Fix

```bash
# 1. Stop current server
Ctrl+C

# 2. Clear any caches
rm -rf client/node_modules/.vite

# 3. Restart
npm run dev:both

# 4. Check logs for success
# Should see: ✅ WebSocket authenticated
# Should NOT see: Critical table "bets" does not exist
```

---

## Verify It Worked

After restarting, check the logs:

**✅ GOOD:**
```
[0] ✅ WebSocket authenticated: 9876543218 (player)
[0] [GAME_STATE] Synchronized state for user 9876543218
```

**❌ STILL BROKEN:**
```
[0] ERROR: Critical table "bets" does not exist!
```

If still broken:
1. Check you ran the SQL in the correct Supabase project
2. Wait 30 more seconds (schema cache takes time)
3. Restart server again
4. Check Supabase Table Editor → verify `bets` table exists

---

## Why This Happened

Your schema file (`comprehensive_db_schema.sql`) creates:
- ✅ `player_bets` table
- ❌ No `bets` table

But your backend code (`server/routes.ts`) uses:
- ❌ `bets` table
- ✅ Expects this to exist

**Solution:** Create the `bets` table that the code expects.

---

## Alternative: Rename in Code (NOT RECOMMENDED)

If you want to change the code instead of database:

```typescript
// In server/storage-supabase.ts
// Find all references to 'bets'
// Replace with 'player_bets'

// Example:
const { data, error } = await this.supabase
  .from('player_bets')  // Changed from 'bets'
  .select('*')
```

**But this is tedious and error-prone.** Better to just create the `bets` table.

---

## TL;DR - Copy/Paste This Now

```sql
CREATE TABLE IF NOT EXISTS bets (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id VARCHAR(20) NOT NULL,
  game_id VARCHAR(36) NOT NULL,
  round INTEGER NOT NULL DEFAULT 1,
  side VARCHAR(10) NOT NULL,
  amount DECIMAL(15, 2) NOT NULL,
  result VARCHAR(20),
  settled BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT fk_bets_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_bets_game FOREIGN KEY (game_id) REFERENCES game_sessions(game_id) ON DELETE CASCADE
);
GRANT ALL ON bets TO authenticated;
NOTIFY pgrst, 'reload schema';
```

**Run this in Supabase SQL Editor, then restart your server!** ✅









