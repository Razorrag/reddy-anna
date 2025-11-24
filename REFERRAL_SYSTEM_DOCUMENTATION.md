# 🔄 Referral System Architecture - Complete Documentation

## ✅ System Status: UNIFIED & CONSISTENT

**Referral Bonus Percentage**: Now defaults to **5%** everywhere (matches database setting)
**Last Updated**: 2025-11-24

---

## 📊 How The Referral System Works

### **Step 1: User Signs Up With Referral Code**

**File**: [`server/auth.ts:166-226`](server/auth.ts)

1. User provides a `referralCode` during signup
2. System validates the code by finding the referrer:
   ```typescript
   const { data: referrerData } = await supabaseServer
     .select('id, phone, full_name')
     .eq('referral_code_generated', sanitizedData.referralCode)
     .single();
   ```
3. New user is created with `referral_code` field set to the referrer's code
4. After user creation, `checkAndApplyReferralBonus()` is called to track the relationship

---

### **Step 2: Referral Relationship Tracking**

**File**: [`server/storage-supabase.ts:3472-3570`](server/storage-supabase.ts)

**Function**: `checkAndApplyReferralBonus(userId, depositAmount)`

**What It Does:**
- ✅ Checks if user has a referral code
- ✅ Finds the referrer by `referral_code_generated`
- ✅ Validates minimum deposit threshold (₹500 default)
- ✅ Checks if referral bonus already applied (prevents duplicates)
- ✅ Validates referrer's monthly referral limit (50 default)
- ✅ **ONLY tracks the relationship** in `user_referrals` table
- ❌ **DOES NOT create bonus yet** - bonus is created later when deposit bonus is credited

**Important**: This function calculates expected bonus using:
```typescript
const referralBonusPercent = await this.getGameSetting('referral_bonus_percent') || '5';
const expectedBonusAmount = (depositAmount * parseFloat(referralBonusPercent)) / 100;
```

**Database Record Created:**
```sql
INSERT INTO user_referrals (
  referrer_user_id,
  referred_user_id,
  deposit_amount,
  bonus_amount,  -- Expected amount, not yet credited
  bonus_applied  -- FALSE initially
)
```

---

### **Step 3: Deposit Bonus Creation (On Admin Approval)**

**File**: [`server/storage-supabase.ts:4842-4892`](server/storage-supabase.ts)

**Function**: `approvePaymentRequestAtomic()`

When admin approves a deposit:
1. ✅ Deposit amount is added to user's balance
2. ✅ Deposit bonus record is created in `deposit_bonuses` table
3. ✅ Bonus is initially **locked** (requires wagering)

**Key Code:**
```typescript
const bonusAmount = depositAmount * (parseFloat(bonusPercent) / 100);
await supabaseServer.from('deposit_bonuses').insert({
  user_id: userId,
  deposit_amount: depositAmount,
  bonus_amount: bonusAmount,
  bonus_percentage: parseFloat(bonusPercent),
  status: 'locked',  // Requires wagering to unlock
  wagering_requirement: depositAmount * 0.30  // 30% wagering
});
```

---

### **Step 4: Deposit Bonus Gets Credited (Wagering Complete)**

**File**: [`server/storage-supabase.ts:5328-5364`](server/storage-supabase.ts)

**Function**: `creditDepositBonus(depositBonusId)`

When user completes wagering:
1. ✅ Deposit bonus status changes from 'locked' → 'credited'
2. ✅ Bonus amount is added to user's main balance
3. ✅ **TRIGGERS REFERRAL BONUS CREATION** ← This is the key!

**Key Code:**
```typescript
await this.handleReferralForBonus(depositBonusId);  // ← Creates referral bonus
```

---

### **Step 5: Referral Bonus Creation (THE MAIN SYSTEM)**

**File**: [`server/storage-supabase.ts:5367-5399`](server/storage-supabase.ts)

**Function**: `handleReferralForBonus(depositBonusId)` ← **THIS IS THE ACTUAL REFERRAL BONUS CREATOR**

**What It Does:**
1. ✅ Gets the deposit bonus that was just credited
2. ✅ Finds the referral relationship in `user_referrals` table
3. ✅ Reads referral percentage from database:
   ```typescript
   const setting = await this.getGameSetting('referral_bonus_percent');
   const percent = parseFloat(setting || '5');  // Now defaults to 5%!
   ```
4. ✅ Calculates referral bonus: `depositAmount × (percent / 100)`
5. ✅ Creates referral bonus via `createReferralBonus()`

**Example Calculation:**
- Referred user deposits: ₹10,000
- Deposit bonus (5%): ₹500
- When ₹500 deposit bonus is credited, referrer gets:
  - Referral bonus (5% of ₹10,000): ₹500 ← **PAID TO REFERRER**

---

### **Step 6: Referral Bonus Credit (Auto-Credited Immediately)**

**File**: [`server/storage-supabase.ts:5192-5233`](server/storage-supabase.ts)

**Function**: `createReferralBonus()` and `creditReferralBonus()`

**What It Does:**
1. ✅ Creates record in `referral_bonuses` table with status 'pending'
2. ✅ **AUTO-CREDITS immediately** (no wagering required for referral bonuses!)
3. ✅ Adds amount to referrer's main balance
4. ✅ Updates status to 'credited'
5. ✅ Updates `user_referrals.bonus_applied = true`

**Key Difference:**
- **Deposit Bonus**: Requires 30% wagering before credit
- **Referral Bonus**: Credited immediately, no wagering!

---

## 🗄️ Database Tables Used

### 1. `users` table
- `referral_code` - Code used when signing up (if referred)
- `referral_code_generated` - User's own code to share with others
- `referral_bonus_available` - Current pending referral bonus amount

### 2. `user_referrals` table (Relationship Tracking)
- `referrer_user_id` - Who referred
- `referred_user_id` - Who was referred
- `deposit_amount` - How much the referred user deposited
- `bonus_amount` - Expected referral bonus amount
- `bonus_applied` - Whether bonus has been paid (FALSE until credited)
- `bonus_applied_at` - When bonus was credited

### 3. `deposit_bonuses` table (Deposit Bonus Records)
- `user_id` - User who made the deposit
- `deposit_amount` - Amount deposited
- `bonus_amount` - Deposit bonus amount (5% default)
- `status` - 'locked', 'unlocked', 'credited', 'forfeited'
- `wagering_requirement` - How much to wager before unlocking

### 4. `referral_bonuses` table (Referral Bonus Records)
- `referrer_user_id` - Who receives the bonus
- `referred_user_id` - Who was referred
- `referral_id` - Links to `user_referrals` record
- `deposit_amount` - Referred user's deposit
- `bonus_amount` - Referral bonus amount (5% of deposit)
- `status` - 'pending', 'credited'

---

## 🔧 Configuration: `game_settings` Table

**Key**: `referral_bonus_percent`
**Current Value**: `'5'` (5%)
**Used In**: All referral bonus calculations

**Fallback Values** (if database read fails):
- ✅ **NOW**: Falls back to `'5'` (5%) everywhere
- ❌ **BEFORE**: Was falling back to `'1'` (1%) causing the bug

---

## 🚫 Legacy System (Deprecated - NOT USED)

**File**: [`server/payment.ts:301-312`](server/payment.ts)

```typescript
export const applyReferralBonus = async (...) => {
  console.log('applyReferralBonus legacy path called; ignored...');
  return false;  // ← Returns false, does nothing
}
```

This function is **NEVER USED** in the current system. All comments point to the new system.

---

## ✅ Complete Flow Summary

```
1. User signs up with referral code
   ↓
2. checkAndApplyReferralBonus() tracks relationship in user_referrals
   ↓
3. User makes deposit → Admin approves
   ↓
4. approvePaymentRequestAtomic() creates deposit_bonuses (locked)
   ↓
5. User completes 30% wagering
   ↓
6. creditDepositBonus() unlocks & credits deposit bonus
   ↓
7. handleReferralForBonus() calculates referral bonus (5% of deposit)
   ↓
8. createReferralBonus() creates referral_bonuses record
   ↓
9. creditReferralBonus() AUTO-CREDITS to referrer's balance (instant!)
   ↓
10. user_referrals.bonus_applied = TRUE
```

---

## 🎯 Key Points

1. **Only ONE system is active** - the new bonus engine in `storage-supabase.ts`
2. **Referral bonus is tied to deposit bonus being credited** - not just deposit approval
3. **Referral bonuses are auto-credited immediately** - no wagering required
4. **All calculations now use 5% default** - matching your database setting
5. **No redundancy** - old `applyReferralBonus()` in `payment.ts` is disabled

---

## 🔍 How to Verify It's Working

1. **Check Database Setting:**
   ```sql
   SELECT * FROM game_settings WHERE setting_key = 'referral_bonus_percent';
   -- Should show: setting_value = '5'
   ```

2. **Test Referral Flow:**
   - User A signs up (gets referral code)
   - User B signs up with User A's referral code
   - User B deposits ₹10,000
   - Admin approves deposit
   - User B completes 30% wagering (₹3,000)
   - Deposit bonus (₹500) gets credited to User B
   - **Referral bonus (₹500) should auto-credit to User A**

3. **Check Logs:**
   - Look for: `"✅ Referral bonus created for referrer"`
   - Should show: `bonusAmount: 500` (5% of ₹10,000)

---

## 📝 Files Modified (2025-11-24)

All referral bonus percentage fallbacks changed from `'1'` to `'5'`:

- ✅ `server/storage-supabase.ts` (4 locations)
- ✅ `server/routes.ts` (1 location)
- ✅ `server/content-management.ts` (1 location)
- ✅ `client/src/pages/admin-bonus.tsx` (2 locations)
- ✅ `client/src/pages/backend-settings.tsx` (2 locations)

---

## 🚀 System is Now Fully Consistent!

All fallbacks now default to **5%**, ensuring that even if the database setting fails to load, the system will use the correct percentage matching your configuration.