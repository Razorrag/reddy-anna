# Root Cause Analysis: Bonus Display Issue

## Problem
Player A deposits ₹50,000 (gets ₹2,500 locked bonus) + Player B (referred by A) deposits ₹100,000 → Player A should see ₹7,500 total locked bonus, but **sees nothing in UI**.

## Root Cause Identified ✅

After deep investigation, I found **THE PRIMARY ISSUE**:

### Issue: Database Migration Not Executed ❌

**File**: [`server/migrations/CLEANUP_REFERRAL_LOGIC.sql`](server/migrations/CLEANUP_REFERRAL_LOGIC.sql:1:0-27:0)

**Status**: Created but **NEVER RUN** by user

The `referral_bonuses` table still has the old columns:
- `games_required` ✅ (old system)
- `games_played` ✅ (old system)

But is **MISSING** the new columns:
- `wagering_required` ❌ (new system)
- `wagering_completed` ❌ (new system)

### Why This Breaks Everything

1. **[getReferralBonuses()](server/storage-supabase.ts:5604:2-5620:3)** uses `.select('*')` which returns ALL columns
2. When it tries to access `bonus.bonus_amount`, it gets `undefined` because the column might be named differently in raw DB
3. **[getBonusSummary()](server/storage-supabase.ts:5746:2-5808:3)** calculates:
   ```typescript
   const amount = parseFloat(bonus.bonus_amount || '0');  // Returns 0 if undefined!
   ```
4. Frontend receives `{ available: 0, credited: 0, lifetime: 0 }`
5. UI shows "No Bonuses Yet"

## Backend Code Analysis

### ✅ [getBonusSummary()](server/storage-supabase.ts:5746:2-5808:3) - CORRECT
```typescript
// Line 5776: Already handles both 'pending' and 'locked' status
} else if (bonus.status === 'pending' || bonus.status === 'locked') {
  referralBonusPending += amount;
}
```

### ✅ API Route `/api/user/bonus-summary` - CORRECT
```typescript
// Returns proper structure matching frontend expectations
data: {
  depositBonuses: { unlocked, locked, credited, total },
  referralBonuses: { pending, credited, total },
  totals: { available, credited, lifetime }
}
```

### ⚠️ [getReferralBonuses()](server/storage-supabase.ts:5604:2-5620:3) - NEEDS ENHANCEMENT
```typescript
// Current: Returns raw database data
.select(`
  *,
  referred_user:users!referral_bonuses_referred_user_id_fkey(phone, full_name)
`)

// Problem: Column names might not match (bonus_amount vs bonusAmount)
// Solution: Explicitly map columns to ensure consistency
```

### ⚠️ [getDepositBonuses()](server/storage-supabase.ts:5115:2-5128:3) - SAME ISSUE
```typescript
// Current: Returns raw database data
.select('*')

// Same problem as referral bonuses
```

## Complete Fix Steps

### Step 1: Run Database Migration (CRITICAL) 🔥
```bash
# Open Supabase SQL Editor
# Paste and execute: server/migrations/CLEANUP_REFERRAL_LOGIC.sql
```

This will:
1. Remove `games_required` and `games_played` columns
2. Add `wagering_required` and `wagering_completed` columns
3. Set default values for `referral_wagering_multiplier = 3`

### Step 2: Enhance getReferralBonuses() for Robustness

**File**: `server/storage-supabase.ts`
**Line**: ~5604

**Current Code**:
```typescript
async getReferralBonuses(userId: string): Promise<any[]> {
  const { data, error } = await supabaseServer
    .from('referral_bonuses')
    .select(`
      *,
      referred_user:users!referral_bonuses_referred_user_id_fkey(phone, full_name)
    `)
    .eq('referrer_user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching referral bonuses:', error);
    return [];
  }

  return data || [];
}
```

**Fixed Code**:
```typescript
async getReferralBonuses(userId: string): Promise<any[]> {
  const { data, error} = await supabaseServer
    .from('referral_bonuses')
    .select(`
      id,
      user_id,
      referrer_user_id,
      bonus_amount,
      deposit_amount,
      status,
      wagering_required,
      wagering_completed,
      created_at,
      credited_at,
      referred_user:users!referral_bonuses_referred_user_id_fkey(
        phone,
        full_name
      )
    `)
    .eq('referrer_user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('❌ Error fetching referral bonuses:', error);
    return [];
  }

  // Map to consistent camelCase format
  return (data || []).map((bonus: any) => ({
    id: bonus.id,
    userId: bonus.user_id,
    referrerUserId: bonus.referrer_user_id,
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

### Step 3: Enhance getDepositBonuses() Similarly

**File**: `server/storage-supabase.ts`
**Line**: ~5115

**Fixed Code**:
```typescript
async getDepositBonuses(userId: string): Promise<any[]> {
  const { data, error } = await supabaseServer
    .from('deposit_bonuses')
    .select(`
      id,
      user_id,
      bonus_amount,
      deposit_amount,
      bonus_percentage,
      status,
      wagering_required,
      wagering_completed,
      created_at,
      credited_at
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false});

  if (error) {
    console.error('❌ Error fetching deposit bonuses:', error);
    return [];
  }

  // Map to consistent camelCase format
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

### Step 4: Update getBonusSummary() to Use New Format

**File**: `server/storage-supabase.ts`
**Line**: ~5760

**Current Code**:
```typescript
depositBonuses.forEach((bonus: any) => {
  const amount = parseFloat(bonus.bonus_amount || '0');
  // ...
});

referralBonuses.forEach((bonus: any) => {
  const amount = parseFloat(bonus.bonus_amount || '0');
  // ...
});
```

**Fixed Code**:
```typescript
depositBonuses.forEach((bonus: any) => {
  const amount = bonus.bonusAmount; // Already parsed in getDepositBonuses()
  // ...
});

referralBonuses.forEach((bonus: any) => {
  const amount = bonus.bonusAmount; // Already parsed in getReferralBonuses()
  // ...
});
```

## Testing Plan

### 1. Database Verification
```sql
-- Run diagnostic
\i server/migrations/DIAGNOSE_BONUS_DISPLAY_ISSUE.sql

-- Expected: wagering columns exist, games columns gone
```

### 2. API Testing (DevTools → Network)
```bash
GET /api/user/bonus-summary
GET /api/user/referral-bonuses
GET /api/user/deposit-bonuses
```

**Expected Response** (`/api/user/bonus-summary`):
```json
{
  "success": true,
  "data": {
    "depositBonuses": {
      "unlocked": 0,
      "locked": 2500,
      "credited": 0,
      "total": 2500
    },
    "referralBonuses": {
      "pending": 5000,
      "credited": 0,
      "total": 5000
    },
    "totals": {
      "available": 7500,
      "credited": 0,
      "lifetime": 7500
    }
  }
}
```

### 3. UI Verification
Profile → Bonuses Tab should show:
- **Locked (Wagering)**: ₹7,500
- **Deposit Bonuses (1)**: ₹2,500 locked
- **Referral Bonuses (1)**: ₹5,000 locked

## Priority Order

1. **CRITICAL** 🔥: Run `CLEANUP_REFERRAL_LOGIC.sql` migration
2. **HIGH** ⚠️: Update `getReferralBonuses()` with explicit column mapping
3. **HIGH** ⚠️: Update `getDepositBonuses()` with explicit column mapping  
4. **MEDIUM** ℹ️: Update `getBonusSummary()` to use pre-parsed values
5. **LOW** ✅: Test and verify

## Expected Outcome

After fixes:
- Player A deposits ₹50,000 → sees ₹2,500 locked deposit bonus
- Player B (referred by A) deposits ₹100,000 → Player A sees +₹5,000 locked referral bonus
- **Total shown in UI: ₹7,500 locked bonuses** ✅

---

## Files to Modify

1. ✅ Run: [`server/migrations/CLEANUP_REFERRAL_LOGIC.sql`](server/migrations/CLEANUP_REFERRAL_LOGIC.sql:1:0-27:0)
2. 🔧 Edit: [`server/storage-supabase.ts:5604-5620`](server/storage-supabase.ts:5604:2-5620:3) - getReferralBonuses()
3. 🔧 Edit: [`server/storage-supabase.ts:5115-5128`](server/storage-supabase.ts:5115:2-5128:3) - getDepositBonuses()
4. 🔧 Edit: [`server/storage-supabase.ts:5760-5779`](server/storage-supabase.ts:5760:8-5779:8) - getBonusSummary()