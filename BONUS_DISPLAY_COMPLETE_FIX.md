# Complete Fix for Bonus Display Issue

## Problem Statement
User reports: "Player A deposits 50000 gets 2500, player B (referred by A) deposits 100000, player A should show 7500 full locked bonus but doesn't see it in bonus locked place."

## Root Cause Analysis

After deep investigation, I've identified **multiple potential issues** in the bonus system:

### Issue 1: Database Schema Not Updated ❌
**File**: `server/migrations/CLEANUP_REFERRAL_LOGIC.sql`
**Status**: Created but NOT EXECUTED by user

The migration removes old `games_required`/`games_played` columns and adds `wagering_required`/`wagering_completed` columns. If not run, queries will fail.

### Issue 2: getBonusSummary() Query Bug 🐛
**File**: [`server/storage-supabase.ts:5746-5808`](server/storage-supabase.ts:5746:0-5808:0)
**Line 5776**: Only includes `status = 'pending'` for referral bonuses

```typescript
// BUG: Missing 'locked' status
referralBonuses.forEach((bonus: any) => {
  if (bonus.status === 'pending') {  // ❌ Should be: 'pending' || 'locked'
    totals.available += parseFloat(bonus.bonusAmount || 0);
  }
  // ...
});
```

**Fix Required**: Change to `if (bonus.status === 'pending' || bonus.status === 'locked')`

### Issue 3: getReferralBonuses() Missing wagering_required Column 🐛
**File**: [`server/storage-supabase.ts:5604-5620`](server/storage-supabase.ts:5604:0-5620:0)

The query doesn't select `wagering_required` and `wagering_completed` columns, so frontend can't display progress.

**Current Query**:
```typescript
.select('*')  // ❌ Doesn't explicitly request new columns
```

**Fix Required**: Explicitly select columns including wagering fields

### Issue 4: Frontend BonusWallet Component Expects Wrong Status 🐛
**File**: [`client/src/components/Bonus/BonusWallet.tsx:73-77`](client/src/components/Bonus/BonusWallet.tsx:73:0-77:0)

```typescript
const pendingBonus = bonusSummary?.totals?.available || 0; // 'available' = locked
```

The component expects `available` to represent locked bonuses, but the backend might be using different field names.

### Issue 5: API Response Wrapping Inconsistency 🐛
**File**: [`client/src/pages/profile.tsx:188-239`](client/src/pages/profile.tsx:188:0-239:0)

The frontend has complex unwrapping logic suggesting API responses aren't consistent:
```typescript
const summaryData = (summaryRes as any)?.data || (summaryRes as any);
const depositData = (depositRes as any)?.data || (depositRes as any);
```

## Complete Fix Implementation

### Step 1: Run Database Migration
```bash
# In Supabase SQL Editor, run:
server/migrations/CLEANUP_REFERRAL_LOGIC.sql
```

### Step 2: Fix getBonusSummary() Function
**File**: `server/storage-supabase.ts`
**Location**: Line ~5776

Change:
```typescript
if (bonus.status === 'pending') {
```

To:
```typescript
if (bonus.status === 'pending' || bonus.status === 'locked') {
```

### Step 3: Fix getReferralBonuses() to Include Wagering Columns
**File**: `server/storage-supabase.ts`
**Location**: Line ~5604-5620

Ensure the query explicitly selects all needed columns:
```typescript
async getReferralBonuses(userId: string): Promise<any[]> {
  const { data, error } = await supabaseServer
    .from('referral_bonuses')
    .select(`
      id,
      user_id,
      referrer_id,
      bonus_amount,
      deposit_amount,
      status,
      wagering_required,
      wagering_completed,
      created_at,
      credited_at,
      referred_user:users!referral_bonuses_user_id_fkey(
        id,
        phone,
        full_name
      )
    `)
    .eq('referrer_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('❌ Error fetching referral bonuses:', error);
    throw error;
  }

  return (data || []).map((bonus: any) => ({
    id: bonus.id,
    userId: bonus.user_id,
    referrerId: bonus.referrer_id,
    bonusAmount: parseFloat(bonus.bonus_amount || 0),
    depositAmount: parseFloat(bonus.deposit_amount || 0),
    status: bonus.status,
    wageringRequired: parseFloat(bonus.wagering_required || 0),
    wageringCompleted: parseFloat(bonus.wagering_completed || 0),
    wageringProgress: bonus.wagering_required > 0 
      ? (parseFloat(bonus.wagering_completed || 0) / parseFloat(bonus.wagering_required)) * 100
      : 0,
    createdAt: bonus.created_at,
    creditedAt: bonus.credited_at,
    referredUsername: bonus.referred_user?.full_name || bonus.referred_user?.phone || 'Unknown'
  }));
}
```

### Step 4: Fix getDepositBonuses() Similarly
**File**: `server/storage-supabase.ts`
**Location**: Line ~5115-5128

Ensure consistent data structure:
```typescript
async getDepositBonuses(userId: string): Promise<any[]> {
  const { data, error } = await supabaseServer
    .from('deposit_bonuses')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('❌ Error fetching deposit bonuses:', error);
    throw error;
  }

  return (data || []).map((bonus: any) => ({
    id: bonus.id,
    userId: bonus.user_id,
    bonusAmount: parseFloat(bonus.bonus_amount || 0),
    depositAmount: parseFloat(bonus.deposit_amount || 0),
    bonusPercentage: parseFloat(bonus.bonus_percentage || 5),
    status: bonus.status,
    wageringRequired: parseFloat(bonus.wagering_required || 0),
    wageringCompleted: parseFloat(bonus.wagering_completed || 0),
    wageringProgress: bonus.wagering_required > 0
      ? (parseFloat(bonus.wagering_completed || 0) / parseFloat(bonus.wagering_required)) * 100
      : 0,
    createdAt: bonus.created_at,
    creditedAt: bonus.credited_at
  }));
}
```

### Step 5: Verify API Routes Return Consistent Format
Check that API endpoints in `server/routes.ts` return data in expected format.

## Testing Checklist

### Database Testing
```sql
-- Run diagnostic script
server/migrations/DIAGNOSE_BONUS_DISPLAY_ISSUE.sql

-- Expected Results:
-- 1. wagering_required and wagering_completed columns should exist
-- 2. games_required and games_played columns should NOT exist
-- 3. Should see locked bonuses with wagering data
```

### API Testing (Browser DevTools → Network Tab)

1. **Test `/api/user/bonus-summary`**
   ```json
   Expected Response:
   {
     "totals": {
       "available": 7500,  // Sum of all locked bonuses
       "credited": 0,
       "lifetime": 7500
     },
     "depositBonuses": {
       "locked": 2500,
       "credited": 0,
       "total": 2500
     },
     "referralBonuses": {
       "pending": 5000,  // or "locked": 5000
       "credited": 0,
       "total": 5000
     }
   }
   ```

2. **Test `/api/user/referral-bonuses`**
   ```json
   Expected Response:
   [
     {
       "id": "...",
       "bonusAmount": 5000,
       "depositAmount": 100000,
       "status": "locked",
       "wageringRequired": 15000,
       "wageringCompleted": 0,
       "wageringProgress": 0,
       "referredUsername": "Player B"
     }
   ]
   ```

3. **Test `/api/user/deposit-bonuses`**
   ```json
   Expected Response:
   [
     {
       "id": "...",
       "bonusAmount": 2500,
       "depositAmount": 50000,
       "status": "locked",
       "wageringRequired": 7500,
       "wageringCompleted": 0,
       "wageringProgress": 0
     }
   ]
   ```

### UI Testing

1. Navigate to Profile → Bonuses Tab
2. Should see:
   - **Total Bonus Earned**: ₹7,500
   - **Locked (Wagering)**: ₹7,500
   - **Credited**: ₹0

3. In Deposit Bonuses section:
   - 1 bonus of ₹2,500 (from ₹50,000 deposit)
   - Status: Locked
   - Progress bar showing 0%

4. In Referral Bonuses section:
   - 1 bonus of ₹5,000 (from Player B's ₹100,000 deposit)
   - Status: Locked or Pending
   - Player B's name displayed

## Critical Files to Modify

1. ✅ **server/migrations/CLEANUP_REFERRAL_LOGIC.sql** - Run this first
2. 🔧 **server/storage-supabase.ts** - Fix 3 functions:
   - `getBonusSummary()` (line ~5776)
   - `getReferralBonuses()` (line ~5604)
   - `getDepositBonuses()` (line ~5115)
3. 🔍 **Verify** - Frontend should work without changes if backend returns correct data

## Rollback Plan

If issues occur:
```sql
-- Rollback migration
BEGIN;

ALTER TABLE referral_bonuses
ADD COLUMN IF NOT EXISTS games_required INTEGER DEFAULT 5,
ADD COLUMN IF NOT EXISTS games_played INTEGER DEFAULT 0;

COMMIT;
```

## Next Steps

1. ✅ User runs diagnostic SQL
2. ✅ User shares results
3. 🔧 I apply specific fixes based on results
4. ✅ User tests in UI
5. ✅ Verify complete data flow works

---

**Note**: The primary issue is likely the database migration not being run. All subsequent issues stem from column mismatches.