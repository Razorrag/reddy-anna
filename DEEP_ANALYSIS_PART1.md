# 🔍 DEEP ANALYSIS: Database, Endpoints, Admin & Betting - Part 1

**Date:** October 27, 2025  
**Focus:** Database Schema & API Endpoints  

---

## 🗄️ DATABASE SCHEMA ANALYSIS

### Tables Overview: 20 Total

#### Core Tables (5)
1. ✅ **users** - Phone-based auth, ₹100K default
2. ✅ **admin_credentials** - Separate admin auth
3. ✅ **game_sessions** - Active game tracking
4. ✅ **player_bets** - Bet tracking with rounds
5. ✅ **dealt_cards** - Card history per game

### 🔍 Critical Database Issues

#### ⚠️ Issue 1: Missing Foreign Key Constraints
**Problem:** No FK constraints between tables
```sql
-- MISSING:
ALTER TABLE player_bets ADD CONSTRAINT fk_player_bets_user 
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
```
**Impact:** Orphaned records, data integrity issues  
**Severity:** HIGH

#### ⚠️ Issue 2: Balance Race Condition
**Problem:** Read-modify-write without locking
```typescript
// storage-supabase.ts:341
const user = await this.getUserById(userId); // Read
const currentBalance = parseFloat(user.balance);
const newBalance = (currentBalance + amountChange).toFixed(2);
await supabaseServer.from('users').update({ balance: newBalance }); // Write
```
**Fix:** Use atomic SQL operation
```sql
UPDATE users SET balance = balance + $1 WHERE id = $2;
```
**Severity:** CRITICAL

#### ⚠️ Issue 3: No Composite Indexes
**Problem:** Missing indexes for common queries
```sql
-- ADD THESE:
CREATE INDEX idx_player_bets_user_game ON player_bets(user_id, game_id);
CREATE INDEX idx_player_bets_game_status ON player_bets(game_id, status);
```
**Impact:** Slow queries on bet lookups  
**Severity:** MEDIUM

---

## 🌐 API ENDPOINTS AUDIT (45+ Total)

### Authentication Endpoints (5)

| Endpoint | Method | Auth | Rate Limit | Issue |
|----------|--------|------|------------|-------|
| `/api/auth/register` | POST | ❌ | authLimiter | ✅ OK |
| `/api/auth/login` | POST | ❌ | authLimiter | ✅ OK |
| `/api/auth/admin-login` | POST | ❌ | authLimiter | ✅ Fixed |
| `/api/auth/refresh` | POST | ❌ | ❌ NONE | ⚠️ No rate limit |
| `/api/auth/logout` | POST | ❌ | None | ⚠️ Doesn't invalidate JWT |

### Admin Endpoints (25+)

**All properly protected with `validateAdminAccess` ✅**

Key endpoints:
- `/api/admin/users` - User management
- `/api/admin/users/:userId/balance` - Balance updates
- `/api/admin/bets/:betId` - **⚠️ CRITICAL: Can modify bets anytime**
- `/api/admin/bonus-analytics` - Bonus tracking
- `/api/admin/game-settings` - Game configuration

---

## 🚨 CRITICAL ISSUES

### 1. Admin Can Modify Bets Anytime 🔴
**Location:** `PATCH /api/admin/bets/:betId`  
**Problem:** No validation that game is in betting phase  
**Impact:** Admin could manipulate bets after outcome known  

**Fix:**
```typescript
const game = await storage.getGameSession(currentBet.gameId);
if (game.phase !== 'betting') {
  return res.status(400).json({ error: 'Cannot modify bets after betting phase' });
}
```

### 2. Balance Update Race Condition 🔴
**Location:** `storage-supabase.ts:341`  
**Problem:** Multiple simultaneous bets could corrupt balance  
**Impact:** Double-spending possible  

**Fix:** Use PostgreSQL atomic operation
```sql
CREATE OR REPLACE FUNCTION update_balance_atomic(
  p_user_id VARCHAR(20),
  p_amount_change DECIMAL(15, 2)
) RETURNS void AS $$
BEGIN
  UPDATE users SET balance = balance + p_amount_change WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql;
```

### 3. No Token Blacklist 🟠
**Location:** `/api/auth/logout`  
**Problem:** JWT continues working after logout  
**Impact:** Security risk if token stolen  

**Fix:** Create token blacklist table

---

## 📋 IMMEDIATE ACTIONS REQUIRED

1. ✅ **Add bet modification phase check**
2. ✅ **Fix balance race condition with atomic updates**
3. ✅ **Add foreign key constraints**
4. ✅ **Add rate limiting to refresh endpoint**
5. ✅ **Implement token blacklist**

---

*See DEEP_ANALYSIS_PART2.md for Admin & Betting analysis*
