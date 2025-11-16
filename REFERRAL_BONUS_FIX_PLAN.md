# REFERRAL + BONUS SYSTEM FIX PLAN

## Status: Implementation Started
**Date:** 11/16/2025, 6:00 PM IST

---

## 🎯 PRIORITY FIXES (In Order)

### ✅ Phase 1: Fix `/api/user/referral-data` Response Shape
**Problem:** Field name mismatches (camelCase vs snake_case) causing all numeric stats to be 0
**Files to fix:**
- `server/routes.ts` - `/api/user/referral-data` endpoint (~line 1680)

**Changes:**
1. Map DB snake_case fields to camelCase for client
2. Add user details (phone, fullName) to referred users list
3. Fix field name from `totalBonusEarned` → `totalReferralEarnings`
4. Add proper null checks and defaults

---

### ✅ Phase 2: Expose Referral/Bonus Fields in `/api/user/profile`
**Status:** ✅ COMPLETE (11/16/2025, 6:03 PM)

**Problem:** Profile endpoint missing critical fields (referral_code, referral_code_generated, etc.)
**Files fixed:**
- ✅ `server/user-management.ts` - `getUserDetails()` method updated

**Changes made:**
1. ✅ Added `referralCode` (from `referral_code`) to profile response
2. ✅ Added `referralCodeGenerated` (from `referral_code_generated`) to profile response
3. ✅ Added `depositBonusAvailable` to profile response
4. ✅ Added `referralBonusAvailable` to profile response
5. ✅ Added `totalBonusEarned` to profile response
6. ✅ Proper typing and null handling in place

**Note:** `referred_by` field doesn't exist in DB schema, so not included.

---

### ✅ Phase 3: Update `user_referrals.bonus_applied` Flag
**Problem:** Flag never updated after bonus is credited, causing activeReferrals to always be 0
**Files to fix:**
- `server/storage-supabase.ts` - `creditReferralBonus()` method
- `server/storage-supabase.ts` - `handleReferralForBonus()` method

**Changes:**
1. After successful bonus credit, update `user_referrals.bonus_applied = true`
2. Add proper error handling and logging
3. Ensure atomic update with bonus credit transaction

---

### ✅ Phase 4: Remove/Fix Manual Claim Paths
**Problem:** Server disabled manual claiming but UI still has broken claim buttons
**Files to fix:**
- `server/routes.ts` - Remove duplicate `/api/user/claim-bonus` that returns 400
- `client/src/contexts/UserProfileContext.tsx` - Update `claimBonus()` method
- `client/src/components/MobileTopBar.tsx` - Remove or update claim button
- `client/src/components/WalletModal.tsx` - Remove or update claim button
- `client/src/pages/profile.tsx` - Remove or update claim button

**Options:**
A. **Remove manual claim entirely** (recommended - system is auto-credit)
   - Remove server endpoint
   - Remove UI buttons
   - Show info message "Bonuses are credited automatically"

B. **Implement manual claim** (if needed for specific use case)
   - Fix server endpoint to actually work
   - Update UI to handle success/error properly

**Decision:** Option A (Remove manual claim - system is auto-credit)

---

### ✅ Phase 5: Fix Admin Filters
**Problem:** Admin referral/bonus filters don't actually filter backend data
**Files to fix:**
- `server/controllers/adminAnalyticsController.ts` - `getAdminReferralData()`
- `server/controllers/adminAnalyticsController.ts` - `getAdminBonusTransactions()`

**Changes:**
1. Apply `status` filter in `getAdminReferralData()` query
2. Apply `status` and `type` filters in `getAdminBonusTransactions()` query
3. Return filtered results from backend instead of client-side filtering

---

### ✅ Phase 6: Fix Referral Data Cache Duration
**Problem:** Hard-coded 24h cache ignores `cache_duration` key, hides stale data
**Files to fix:**
- `client/src/contexts/UserProfileContext.tsx` - `fetchReferralData()` method

**Changes:**
1. Read `referral_data_cache_duration` from localStorage
2. Default to 1 hour instead of 24 hours
3. Allow force refresh parameter to bypass cache

---

## 🐛 ADDITIONAL FIXES (Lower Priority)

### Issue 7: Legacy referral handler at signup
**Problem:** Dead code running with bogus amount
**Files to fix:**
- `server/auth.ts` - `registerUser()` method

**Changes:**
1. Remove call to `checkAndApplyReferralBonus(newUser.id, defaultBalance)`
2. Add comment explaining referral linkage happens at first deposit approval

---

### Issue 8: No recovery path for users without codes
**Problem:** Users created before RPC logic have no referral code
**Files to fix:**
- `server/routes.ts` - Add new endpoint `/api/user/regenerate-referral-code`
- `client/src/pages/profile.tsx` - Add "Generate Code" button when missing

**Changes:**
1. Create admin endpoint to regenerate referral codes
2. Add UI button for users without codes
3. Call `generate_referral_code` RPC with error handling

---

## 📊 TESTING CHECKLIST

After each phase:
- [ ] Test user profile page loads with correct data
- [ ] Test referral stats show correct numbers
- [ ] Test referred users list shows names/phones
- [ ] Test copy referral code works
- [ ] Test admin referral page filters work
- [ ] Test admin bonus page filters work
- [ ] Test bonus display matches actual balance
- [ ] Test no manual claim buttons visible (if removed)

---

## 🚀 DEPLOYMENT NOTES

1. Database changes: None required (all fixes are code-level)
2. Cache invalidation: May need to clear `referral_data_cache` in localStorage for existing users
3. Backward compatibility: All fixes maintain existing DB schema
4. Performance impact: Minimal - mainly fixes to existing queries

---

## ✅ COMPLETION CRITERIA

System is fixed when:
1. ✅ Referral code visible and copyable in user profile
2. ✅ Referral stats show correct earnings, deposits, active referrals
3. ✅ Referred users list shows actual names/phones
4. ✅ Admin filters actually filter backend data
5. ✅ No broken "Claim Bonus" buttons
6. ✅ Bonus display matches actual credited amounts
7. ✅ Cache updates within reasonable time (1 hour max)

---

*Implementation started: 11/16/2025, 6:00 PM IST*
*Estimated completion: 2-3 hours*
