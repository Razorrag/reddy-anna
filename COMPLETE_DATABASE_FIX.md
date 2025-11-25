# 🚨 COMPLETE DATABASE AUDIT & FIX

## Your Story Analysis

You created account `9929986743`, deposited ₹3,00,000, got ₹15,000 deposit bonus.
Then you referred and created account `8209093944`, deposited ₹1,00,000, got ₹5,000 deposit bonus.
**BUT** the referral bonus was given to **wrong user** (`9876543210` instead of `9929986743`).

## 🔍 ROOT CAUSE ANALYSIS

### Looking at your `referral_bonuses` data:

```
referrer_user_id | referred_user_id | deposit_amount | bonus_amount | status
9876543210       | 9876543211       | 50000          | 2500         | credited
9876543210       | 9876543211       | 100000         | 5000         | locked
9876543210       | 8209093944       | 100000         | 5000         | locked  ← YOUR REFERRAL!
```

### Looking at your `user_referrals` data:

```
referrer_user_id | referred_user_id | deposit_amount | bonus_amount
9876543210       | 9876543211       | 275000         | 13750
9876543210       | 8209093944       | 100000         | 5000  ← YOUR REFERRAL!
```

## 🚨 THE BUG

**User `8209093944` was referred by `9876543210`, NOT by `9929986743`!**

This means when `8209093944` signed up, they used referral code belonging to `9876543210`, not your code (`9929986743`).

### How Referral Works:

1. User A generates a unique `referral_code_generated` (e.g., `ABC123`)
2. User B signs up using that code → `referral_code` = `ABC123`
3. When User B deposits, system looks up who has `referral_code_generated` = `ABC123`
4. That person (User A) gets the referral bonus

### What Happened:

- `8209093944` signed up with referral code belonging to `9876543210`
- So `9876543210` got the referral bonus, not you (`9929986743`)

---

## 📊 COMPLETE TABLE STRUCTURE ANALYSIS

### 1. `users` Table
```sql
id VARCHAR(20) PRIMARY KEY  -- Phone number as ID
phone VARCHAR(15) NOT NULL UNIQUE
referral_code VARCHAR(50)  -- Code USED during signup (referrer's code)
referral_code_generated VARCHAR(50) UNIQUE  -- Code to SHARE with others
deposit_bonus_available DECIMAL(15, 2)  -- LEGACY: Not used anymore
referral_bonus_available DECIMAL(15, 2)  -- LEGACY: Not used anymore
```

### 2. `user_referrals` Table (Cumulative Stats)
```sql
id VARCHAR(36) PRIMARY KEY
referrer_user_id VARCHAR(20)  -- Person who referred
referred_user_id VARCHAR(20) UNIQUE  -- Person who was referred (1 referrer per user)
deposit_amount DECIMAL(15, 2)  -- CUMULATIVE total deposits by referred user
bonus_amount DECIMAL(15, 2)  -- CUMULATIVE total bonus earned
bonus_applied BOOLEAN  -- LEGACY: Always true now
```

### 3. `referral_bonuses` Table (Per-Deposit Records)
```sql
id UUID PRIMARY KEY
referrer_user_id UUID  -- Person who gets the bonus
referred_user_id UUID  -- Person who deposited
referral_id UUID  -- Links to user_referrals.id
deposit_amount NUMERIC(10,2)  -- THIS deposit amount
bonus_amount NUMERIC(10,2)  -- THIS bonus amount (5% of deposit)
status TEXT  -- 'locked', 'credited', 'expired'
wagering_required DECIMAL(15, 2)  -- Amount to wager (3x bonus)
wagering_completed DECIMAL(15, 2)  -- Amount wagered so far
```

### 4. `deposit_bonuses` Table (Per-Deposit Records)
```sql
id UUID PRIMARY KEY
user_id UUID  -- Person who deposited
deposit_request_id UUID  -- Links to payment_requests.id
deposit_amount NUMERIC(10,2)  -- Deposit amount
bonus_amount NUMERIC(10,2)  -- Bonus amount (5% of deposit)
wagering_required NUMERIC(10,2)  -- Amount to wager
wagering_completed NUMERIC(10,2)  -- Amount wagered
status TEXT  -- 'locked', 'unlocked', 'credited'
```

### 5. `bonus_transactions` Table (History Log)
```sql
id UUID PRIMARY KEY
user_id UUID  -- User this transaction belongs to
bonus_type TEXT  -- 'deposit_bonus', 'referral_bonus'
bonus_source_id UUID  -- Links to deposit_bonuses.id or referral_bonuses.id
amount NUMERIC(10,2)
action TEXT  -- 'added', 'locked', 'unlocked', 'credited', 'wagering_progress'
description TEXT
```

---

## 🔴 CRITICAL ISSUES FOUND

### Issue 1: UUID vs VARCHAR Mismatch
The migration creates tables with `UUID` type:
```sql
user_id UUID NOT NULL REFERENCES users(id)
```

But `users.id` is `VARCHAR(20)` (phone number)!

**This causes foreign key failures and silent insert errors.**

### Issue 2: Referral Code Confusion
Your account `9929986743` needs to have a `referral_code_generated` that `8209093944` used during signup.

### Issue 3: Status Values Mismatch
- `referral_bonuses` migration: `status IN ('pending', 'credited', 'expired')`
- Code inserts: `status = 'locked'`

**'locked' is not in the CHECK constraint!**

### Issue 4: Bonus Auto-Credited Without Wagering
The `checkBonusThresholds` function was checking `status = 'locked'` instead of `status = 'unlocked'`, causing bonuses to be credited immediately.

---

## 🔧 COMPLETE FIX MIGRATION

Run this SQL in Supabase SQL Editor:

```sql
-- ============================================
-- COMPLETE DATABASE FIX MIGRATION
-- Fixes all bonus system issues
-- ============================================

BEGIN;

-- ============================================
-- STEP 1: Fix referral_bonuses table
-- ============================================

-- Drop and recreate with correct types
DROP TABLE IF EXISTS referral_bonuses CASCADE;

CREATE TABLE referral_bonuses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  referrer_user_id VARCHAR(20) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  referred_user_id VARCHAR(20) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  referral_id VARCHAR(36) REFERENCES user_referrals(id),
  
  -- Amounts
  deposit_amount DECIMAL(15, 2) NOT NULL,
  bonus_amount DECIMAL(15, 2) NOT NULL,
  bonus_percentage DECIMAL(5, 2) DEFAULT 5.00,
  
  -- Status (FIXED: includes 'locked')
  status TEXT DEFAULT 'locked' CHECK (status IN ('pending', 'locked', 'unlocked', 'credited', 'expired')),
  credited_at TIMESTAMP WITH TIME ZONE,
  expired_at TIMESTAMP WITH TIME ZONE,
  
  -- Wagering tracking
  wagering_required DECIMAL(15, 2) DEFAULT 0.00,
  wagering_completed DECIMAL(15, 2) DEFAULT 0.00,
  
  -- Metadata
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_referral_bonuses_referrer ON referral_bonuses(referrer_user_id);
CREATE INDEX idx_referral_bonuses_referred ON referral_bonuses(referred_user_id);
CREATE INDEX idx_referral_bonuses_status ON referral_bonuses(status);
CREATE INDEX idx_referral_bonuses_referrer_status ON referral_bonuses(referrer_user_id, status);

-- ============================================
-- STEP 2: Fix deposit_bonuses table
-- ============================================

DROP TABLE IF EXISTS deposit_bonuses CASCADE;

CREATE TABLE deposit_bonuses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id VARCHAR(20) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  deposit_request_id UUID REFERENCES payment_requests(id),
  
  -- Amounts
  deposit_amount DECIMAL(15, 2) NOT NULL,
  bonus_amount DECIMAL(15, 2) NOT NULL,
  bonus_percentage DECIMAL(5, 2) DEFAULT 5.00,
  
  -- Wagering tracking
  wagering_required DECIMAL(15, 2) NOT NULL,
  wagering_completed DECIMAL(15, 2) DEFAULT 0.00,
  wagering_progress DECIMAL(5, 2) DEFAULT 0.00,
  
  -- Status tracking
  status TEXT DEFAULT 'locked' CHECK (status IN ('locked', 'unlocked', 'credited', 'expired', 'forfeited')),
  locked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  unlocked_at TIMESTAMP WITH TIME ZONE,
  credited_at TIMESTAMP WITH TIME ZONE,
  expired_at TIMESTAMP WITH TIME ZONE,
  
  -- Metadata
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_deposit_bonuses_user_id ON deposit_bonuses(user_id);
CREATE INDEX idx_deposit_bonuses_status ON deposit_bonuses(status);
CREATE INDEX idx_deposit_bonuses_created_at ON deposit_bonuses(created_at DESC);
CREATE INDEX idx_deposit_bonuses_user_status ON deposit_bonuses(user_id, status);

-- ============================================
-- STEP 3: Fix bonus_transactions table
-- ============================================

DROP TABLE IF EXISTS bonus_transactions CASCADE;

CREATE TABLE bonus_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id VARCHAR(20) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Type and source
  bonus_type TEXT NOT NULL CHECK (bonus_type IN ('deposit_bonus', 'referral_bonus', 'conditional_bonus', 'promotional_bonus')),
  bonus_source_id UUID,
  
  -- Amounts
  amount DECIMAL(15, 2) NOT NULL,
  balance_before DECIMAL(15, 2),
  balance_after DECIMAL(15, 2),
  
  -- Action tracking
  action TEXT NOT NULL CHECK (action IN ('added', 'locked', 'unlocked', 'credited', 'expired', 'forfeited', 'wagering_progress')),
  description TEXT NOT NULL,
  metadata JSONB,
  
  -- Timestamp
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_bonus_transactions_user_id ON bonus_transactions(user_id);
CREATE INDEX idx_bonus_transactions_type ON bonus_transactions(bonus_type);
CREATE INDEX idx_bonus_transactions_action ON bonus_transactions(action);
CREATE INDEX idx_bonus_transactions_created_at ON bonus_transactions(created_at DESC);
CREATE INDEX idx_bonus_transactions_user_created ON bonus_transactions(user_id, created_at DESC);

-- ============================================
-- STEP 4: Fix user_referrals table
-- ============================================

-- Clear existing data (will be recreated on deposits)
TRUNCATE TABLE user_referrals CASCADE;

-- ============================================
-- STEP 5: Ensure game settings exist
-- ============================================

INSERT INTO game_settings (setting_key, setting_value, description)
VALUES 
  ('referral_wagering_multiplier', '3', 'Wagering requirement multiplier for referral bonuses (3x bonus)'),
  ('default_deposit_bonus_percent', '5', 'Percentage of deposit given as bonus'),
  ('wagering_multiplier', '0.3', 'Wagering requirement multiplier for deposit bonuses (30% of deposit)'),
  ('referral_bonus_percent', '5', 'Referral bonus percentage (5% of deposit)')
ON CONFLICT (setting_key) DO UPDATE 
SET setting_value = EXCLUDED.setting_value,
    description = EXCLUDED.description;

-- ============================================
-- STEP 6: Create triggers for updated_at
-- ============================================

CREATE OR REPLACE FUNCTION update_bonus_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS deposit_bonuses_updated_at ON deposit_bonuses;
CREATE TRIGGER deposit_bonuses_updated_at
  BEFORE UPDATE ON deposit_bonuses
  FOR EACH ROW
  EXECUTE FUNCTION update_bonus_updated_at();

DROP TRIGGER IF EXISTS referral_bonuses_updated_at ON referral_bonuses;
CREATE TRIGGER referral_bonuses_updated_at
  BEFORE UPDATE ON referral_bonuses
  FOR EACH ROW
  EXECUTE FUNCTION update_bonus_updated_at();

COMMIT;
```

---

## 🔧 CODE FIXES NEEDED

### Fix 1: `createDepositBonus` - Use VARCHAR for user_id

The function already uses string IDs, so it should work after the table fix.

### Fix 2: `createReferralBonus` - Already fixed (removed games_required/games_played)

### Fix 3: `checkBonusThresholds` - Already fixed (checks 'unlocked' not 'locked')

---

## 📋 VERIFICATION STEPS

After running the migration:

1. **Check tables exist with correct columns:**
```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'referral_bonuses';
```

2. **Check game settings:**
```sql
SELECT * FROM game_settings 
WHERE setting_key IN ('referral_wagering_multiplier', 'default_deposit_bonus_percent', 'wagering_multiplier', 'referral_bonus_percent');
```

3. **Test a new deposit:**
   - Create a new user with referral code
   - Deposit money
   - Check if referral_bonuses record is created

---

## 🎯 WHAT YOU NEED TO DO

1. **Run the SQL migration above in Supabase SQL Editor**
2. **Restart your server**: `npm run dev:both`
3. **Verify your referral code**:
   ```sql
   SELECT id, phone, referral_code_generated FROM users WHERE id = '9929986743';
   ```
4. **When creating new referred accounts**, make sure they use YOUR `referral_code_generated`

---

## ⚠️ IMPORTANT: Your Referral Code

Check what referral code `8209093944` used during signup:
```sql
SELECT id, phone, referral_code FROM users WHERE id = '8209093944';
```

If it shows `9876543210`'s code, that's why they got the bonus instead of you.

To fix this for future referrals, share YOUR referral code (from `referral_code_generated` column).
