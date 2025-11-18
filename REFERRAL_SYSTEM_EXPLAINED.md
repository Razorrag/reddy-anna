# Referral System - Complete Flow Explanation

## Overview

The referral system allows users to invite friends and earn bonuses when their referrals make deposits.

---

## How It Works

### 1. **User Registration with Referral Code**

**Flow:**
```
New User Signs Up → Enters Referral Code (Optional) → System Validates Code → Stores in Database
```

**Code Location:** `server/auth.ts` (lines 163-185)

```typescript
// During registration, user provides referralCode
const sanitizedData = {
  name: "New User",
  phone: "9876543210",
  password: "password",
  referralCode: "ABC123" // Optional - the code they received from a friend
};

// System validates the referral code exists
const { data: referrerData } = await supabaseServer
  .from('users')
  .select('id, phone, full_name')
  .eq('referral_code_generated', sanitizedData.referralCode)
  .single();

// If valid, store it in the new user's record
const newUser = await storage.createUser({
  phone: normalizedPhone,
  referral_code: sanitizedData.referralCode, // ← Stored here
  ...
});
```

**Database Fields:**
- `users.referral_code` - The code THIS user entered during signup (who referred them)
- `users.referral_code_generated` - The unique code THIS user can share with others

---

### 2. **Referral Code Generation**

**When:** Immediately after user registration

**Code Location:** `server/storage-supabase.ts` (lines 802-806)

```typescript
// After creating user, generate their unique referral code
const { data: genResult } = await supabaseServer.rpc('generate_referral_code', {
  p_user_id: data.id
});
```

**Database Function:** `generate_referral_code()` in `schemas/comprehensive_db_schema.sql` (lines 879-910)

```sql
CREATE OR REPLACE FUNCTION generate_referral_code(p_user_id VARCHAR(20))
RETURNS VARCHAR(10) AS $$
DECLARE
  referral_code VARCHAR(10);
  temp_code VARCHAR(10);
  code_exists BOOLEAN := TRUE;
BEGIN
  -- Generate random 6-character alphanumeric code
  WHILE code_exists LOOP
    temp_code := UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 6));
    
    -- Check if code already exists
    SELECT EXISTS(
      SELECT 1 FROM users WHERE referral_code_generated = temp_code
    ) INTO code_exists;
    
    IF NOT code_exists THEN
      referral_code := temp_code;
      EXIT;
    END IF;
  END LOOP;
  
  -- Update user with referral code
  UPDATE users
  SET referral_code_generated = referral_code
  WHERE id = p_user_id;
  
  RETURN referral_code;
END;
$$ LANGUAGE plpgsql;
```

**Result:** User gets a unique code like `"A3F9K2"` stored in `referral_code_generated`

---

### 3. **Referral Bonus Trigger**

**When:** When the referred user makes their **FIRST APPROVED DEPOSIT**

**Code Location:** `server/storage-supabase.ts` (lines 4720-4780)

```typescript
// Inside approvePaymentRequestAtomic() - after deposit is approved
if (u && u.referral_code) {
  // Find who referred this user
  const { data: referrer } = await supabaseServer
    .from('users')
    .select('id')
    .eq('referral_code_generated', u.referral_code)
    .single();
    
  if (referrer && referrer.id) {
    // Check if referral bonus already applied
    const { data: existing } = await supabaseServer
      .from('user_referrals')
      .select('id')
      .eq('referred_user_id', userId)
      .single();
      
    if (!existing) {
      // Apply referral bonus!
      await this.checkAndApplyReferralBonus(userId, depositAmount);
    }
  }
}
```

---

### 4. **Referral Bonus Calculation & Validation**

**Code Location:** `server/storage-supabase.ts::checkAndApplyReferralBonus()` (lines 3312-3429)

**Validation Checks:**

1. **User has referral code?**
   ```typescript
   if (!user || !user.referral_code) {
     return; // No referral code used
   }
   ```

2. **Minimum deposit threshold met?**
   ```typescript
   const minDeposit = parseFloat(await this.getGameSetting('min_deposit_for_referral') || '500');
   if (depositAmount < minDeposit) {
     return; // Deposit too small
   }
   ```

3. **Referrer exists?**
   ```typescript
   const { data: referrerData } = await supabaseServer
     .from('users')
     .select('id')
     .eq('referral_code_generated', user.referral_code)
     .single();
   ```

4. **First deposit only?**
   ```typescript
   const { data: previousDeposits } = await supabaseServer
     .from('payment_requests')
     .select('id')
     .eq('user_id', userId)
     .eq('request_type', 'deposit')
     .eq('status', 'approved');
     
   if (previousDeposits && previousDeposits.length >= 1) {
     return; // Not first deposit
   }
   ```

5. **Referrer hasn't hit monthly limit?**
   ```typescript
   const maxReferrals = parseInt(await this.getGameSetting('max_referrals_per_month') || '50');
   const { data: monthlyReferrals } = await supabaseServer
     .from('user_referrals')
     .select('id')
     .eq('referrer_user_id', referrerData.id)
     .gte('created_at', startOfMonth.toISOString());
     
   if (monthlyReferrals && monthlyReferrals.length >= maxReferrals) {
     return; // Monthly limit reached
   }
   ```

**Bonus Calculation:**
```typescript
const bonusPercentage = parseFloat(await this.getGameSetting('referral_bonus_percent') || '1');
const bonusAmount = (depositAmount * bonusPercentage) / 100;

// Example: ₹10,000 deposit × 1% = ₹100 referral bonus
```

---

### 5. **Referral Tracking & Bonus Creation**

**Step 1: Track Referral Relationship** (`user_referrals` table)

```typescript
await this.trackUserReferral(referrerData.id, userId, depositAmount, bonusAmount);
```

Creates record:
```json
{
  "referrer_user_id": "9876543210",
  "referred_user_id": "9988776655",
  "deposit_amount": 10000,
  "bonus_amount": 100,
  "created_at": "2025-11-18T14:30:00Z"
}
```

**Step 2: Create Referral Bonus** (`referral_bonuses` table)

```typescript
await this.createReferralBonus({
  referrerUserId: referrerData.id,
  referredUserId: userId,
  referralId: referralRecord?.id,
  depositAmount: depositAmount,
  bonusAmount: bonusAmount,
  bonusPercentage: bonusPercentage
});
```

Creates record:
```json
{
  "id": "uuid-here",
  "referrer_user_id": "9876543210",
  "referred_user_id": "9988776655",
  "referral_id": "user_referrals_id",
  "deposit_amount": 10000,
  "bonus_amount": 100,
  "bonus_percentage": 1,
  "status": "pending",
  "created_at": "2025-11-18T14:30:00Z"
}
```

**Step 3: Log Transaction** (`bonus_transactions` table)

```typescript
await this.logBonusTransaction({
  userId: referrerData.id,
  bonusType: 'referral_bonus',
  bonusSourceId: bonusId,
  amount: bonusAmount,
  action: 'added',
  description: `Referral bonus for user ${referredUserId}'s deposit`
});
```

---

## Database Tables

### 1. `users` Table
```sql
CREATE TABLE users (
  id VARCHAR(20) PRIMARY KEY,
  phone VARCHAR(20) UNIQUE NOT NULL,
  referral_code VARCHAR(50),              -- Code they entered (who referred them)
  referral_code_generated VARCHAR(50),    -- Their unique code to share
  referral_bonus_available DECIMAL(15,2), -- Pending referral bonuses
  ...
);
```

### 2. `user_referrals` Table
```sql
CREATE TABLE user_referrals (
  id UUID PRIMARY KEY,
  referrer_user_id VARCHAR(20) REFERENCES users(id),
  referred_user_id VARCHAR(20) REFERENCES users(id),
  deposit_amount DECIMAL(15,2),
  bonus_amount DECIMAL(15,2),
  created_at TIMESTAMP
);
```

### 3. `referral_bonuses` Table
```sql
CREATE TABLE referral_bonuses (
  id UUID PRIMARY KEY,
  referrer_user_id UUID REFERENCES users(id),
  referred_user_id UUID REFERENCES users(id),
  referral_id UUID REFERENCES user_referrals(id),
  deposit_amount NUMERIC(10,2),
  bonus_amount NUMERIC(10,2),
  bonus_percentage NUMERIC(5,2),
  status TEXT CHECK (status IN ('pending', 'credited', 'expired')),
  credited_at TIMESTAMP,
  expired_at TIMESTAMP,
  notes TEXT,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

### 4. `bonus_transactions` Table
```sql
CREATE TABLE bonus_transactions (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  bonus_type TEXT CHECK (bonus_type IN ('deposit_bonus', 'referral_bonus', ...)),
  bonus_source_id UUID, -- Links to referral_bonuses.id
  amount NUMERIC(10,2),
  action TEXT CHECK (action IN ('added', 'credited', 'expired', 'claimed')),
  description TEXT,
  created_at TIMESTAMP
);
```

---

## Complete Flow Example

### Scenario: Alice refers Bob

**Step 1: Alice shares her code**
- Alice's `referral_code_generated`: `"ALICE1"`
- Alice shares this code with Bob

**Step 2: Bob signs up**
```typescript
// Bob's registration
{
  name: "Bob",
  phone: "9988776655",
  password: "password",
  referralCode: "ALICE1" // ← Alice's code
}
```

**Database after signup:**
```sql
-- Bob's record
INSERT INTO users (id, phone, referral_code, referral_code_generated)
VALUES ('9988776655', '9988776655', 'ALICE1', 'BOB123');
```

**Step 3: Bob makes first deposit of ₹10,000**

Admin approves deposit → Triggers referral bonus flow:

1. **Find Alice** (referrer):
   ```sql
   SELECT id FROM users WHERE referral_code_generated = 'ALICE1';
   -- Returns: Alice's ID
   ```

2. **Calculate bonus** (1% of ₹10,000):
   ```
   Bonus = ₹10,000 × 1% = ₹100
   ```

3. **Create records**:
   ```sql
   -- user_referrals
   INSERT INTO user_referrals (referrer_user_id, referred_user_id, deposit_amount, bonus_amount)
   VALUES ('9876543210', '9988776655', 10000, 100);
   
   -- referral_bonuses
   INSERT INTO referral_bonuses (referrer_user_id, referred_user_id, deposit_amount, bonus_amount, status)
   VALUES ('9876543210', '9988776655', 10000, 100, 'pending');
   
   -- bonus_transactions
   INSERT INTO bonus_transactions (user_id, bonus_type, amount, action, description)
   VALUES ('9876543210', 'referral_bonus', 100, 'added', 'Referral bonus for user 9988776655 deposit');
   ```

4. **Update Alice's balance**:
   ```sql
   UPDATE users
   SET referral_bonus_available = referral_bonus_available + 100
   WHERE id = '9876543210';
   ```

**Step 4: Alice claims bonus**

When Alice clicks "Claim Bonus" in the UI:
```typescript
await storage.creditReferralBonus(bonusId);
```

This:
1. Moves bonus from `referral_bonus_available` to `balance`
2. Updates `referral_bonuses.status` to `'credited'`
3. Logs transaction in `bonus_transactions`

---

## Settings & Configuration

**Game Settings (configurable in admin panel):**

| Setting | Default | Description |
|---------|---------|-------------|
| `referral_bonus_percent` | 1% | Percentage of deposit given as referral bonus |
| `min_deposit_for_referral` | ₹500 | Minimum deposit to trigger referral bonus |
| `max_referrals_per_month` | 50 | Max referrals per user per month |

**Location:** Admin Panel → Backend Settings → Bonus Settings

---

## API Endpoints

### Player Endpoints

**Get Referral Data:**
```
GET /api/user/referral-data
```
Returns:
```json
{
  "success": true,
  "data": {
    "referralCode": "ALICE1",
    "totalReferrals": 5,
    "activeReferrals": 3,
    "totalDepositsFromReferrals": 50000,
    "totalReferralEarnings": 500
  }
}
```

**Get Referral Bonuses:**
```
GET /api/user/referral-bonuses
```
Returns list of all referral bonuses for the user.

### Admin Endpoints

**Get All Referral Data:**
```
GET /api/admin/referral-data?status=all
```

**Get Player Referral Analytics:**
```
GET /api/admin/player-bonus-analytics
```

---

## Frontend Display

### Player Profile → Bonuses Tab

**Location:** `client/src/pages/profile.tsx`

Shows:
- Referral code to share
- Total referrals count
- Pending referral bonuses
- Credited referral bonuses
- Referral bonus history

### Admin Bonus Page

**Location:** `client/src/pages/admin-bonus.tsx`

Shows:
- All referral relationships
- Referral bonus transactions
- Per-player referral analytics
- Ability to manually process/reject referral bonuses

---

## Key Points

1. **Referral bonus triggers on FIRST APPROVED DEPOSIT only**
2. **Minimum deposit threshold must be met** (default ₹500)
3. **Referrer gets bonus, not the referred user**
4. **Bonus is initially "pending" until claimed**
5. **Monthly referral limit prevents abuse** (default 50)
6. **Each user gets unique referral code automatically**
7. **Referral code is validated during signup**
8. **All transactions are logged for audit trail**

---

## Troubleshooting

### Referral bonus not applied?

**Check:**
1. Was referral code valid during signup?
   ```sql
   SELECT referral_code FROM users WHERE id = 'USER_ID';
   ```

2. Is this the first approved deposit?
   ```sql
   SELECT COUNT(*) FROM payment_requests 
   WHERE user_id = 'USER_ID' AND request_type = 'deposit' AND status = 'approved';
   ```

3. Did deposit meet minimum threshold?
   ```sql
   SELECT * FROM game_settings WHERE key = 'min_deposit_for_referral';
   ```

4. Has referrer hit monthly limit?
   ```sql
   SELECT COUNT(*) FROM user_referrals 
   WHERE referrer_user_id = 'REFERRER_ID' 
   AND created_at >= DATE_TRUNC('month', NOW());
   ```

### Check referral status:

```sql
-- Find all referrals for a user
SELECT * FROM user_referrals WHERE referrer_user_id = 'USER_ID';

-- Find all referral bonuses
SELECT * FROM referral_bonuses WHERE referrer_user_id = 'USER_ID';

-- Check bonus transactions
SELECT * FROM bonus_transactions 
WHERE user_id = 'USER_ID' AND bonus_type = 'referral_bonus';
```

---

## Summary

The referral system is **fully automated**:
1. User signs up with referral code → Code stored
2. User makes first deposit → Admin approves
3. System automatically calculates and applies referral bonus
4. Referrer sees pending bonus in their profile
5. Referrer claims bonus → Moves to balance

**All tracking happens in 4 tables:** `users`, `user_referrals`, `referral_bonuses`, `bonus_transactions`
