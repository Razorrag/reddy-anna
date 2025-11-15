# 🚀 DATA FIX QUICK REFERENCE GUIDE

**Quick checklist for fixing data inconsistency issues**

---

## 🔴 CRITICAL FIXES (Do First)

### 1. Fix RPC Function - `actual_payout` Not Set
**File:** `scripts/reset-and-recreate-database.sql`  
**Function:** `apply_payouts_and_update_bets`  
**Issue:** Winners may have `actual_payout = NULL`  
**Fix:** Always set `actual_payout` for winners, add validation

### 2. Add Transaction Support
**File:** `server/storage-supabase.ts`  
**Issue:** Updates are independent, can partially fail  
**Fix:** Add `transaction()` method, wrap all updates

### 3. Create Unified Stats Endpoint
**File:** `server/routes.ts`  
**New Endpoint:** `GET /api/admin/unified-stats`  
**Purpose:** Single source of truth for all stats

---

## 📋 IMPLEMENTATION ORDER

### Step 1: Database (Backend)
1. Update RPC function
2. Add transaction support
3. Add validation function

### Step 2: Backend API
1. Create unified stats endpoint
2. Update game completion to use transaction
3. Add validation after updates

### Step 3: Frontend
1. Update all pages to use unified endpoint
2. Remove dependency on analytics tables
3. Add error handling

---

## 🔍 KEY PROBLEMS

| Problem | Location | Impact |
|---------|----------|--------|
| `actual_payout` NULL | RPC function | Users see wrong win/loss |
| Different tables | Multiple endpoints | Pages show different numbers |
| No transaction | game.ts | Partial updates possible |
| No validation | game.ts | Silent failures |

---

## ✅ TESTING CHECKLIST

- [ ] Complete game with single bet
- [ ] Complete game with multiple bets
- [ ] Check `actual_payout` is set
- [ ] Check all pages show same numbers
- [ ] Test transaction rollback
- [ ] Test validation catches errors

---

**See `DATA_INCONSISTENCY_COMPLETE_FIX_DOCUMENT.md` for full details**









