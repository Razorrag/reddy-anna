-- ============================================
-- FIX REFERRAL SYSTEM - Complete Fix
-- ============================================
-- This migration fixes the referral system by:
-- 1. Adding UNIQUE constraint to referral_code_generated
-- 2. Fixing any duplicate referral codes
-- 3. Ensuring referral_bonuses table exists with correct types
-- 4. Ensuring user_referrals table exists with correct types
-- 5. Setting referral_bonus_percent to 5%
-- ============================================

-- ============================================
-- PART 0: Ensure referral_bonus_percent is set to 5%
-- ============================================
INSERT INTO game_settings (setting_key, setting_value, description)
VALUES ('referral_bonus_percent', '5', 'Percentage of deposit given as referral bonus')
ON CONFLICT (setting_key) DO UPDATE SET setting_value = '5';

-- ============================================
-- PART 1: Ensure user_referrals table exists
-- ============================================
CREATE TABLE IF NOT EXISTS user_referrals (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  referrer_user_id VARCHAR(20) NOT NULL,
  referred_user_id VARCHAR(20) NOT NULL UNIQUE,
  deposit_amount DECIMAL(15, 2),
  bonus_amount DECIMAL(15, 2),
  bonus_applied BOOLEAN DEFAULT false,
  bonus_applied_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- PART 2: Ensure referral_bonuses table exists with VARCHAR types
-- ============================================
CREATE TABLE IF NOT EXISTS referral_bonuses (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  referrer_user_id VARCHAR(20) NOT NULL,
  referred_user_id VARCHAR(20) NOT NULL,
  referral_id VARCHAR(36),
  deposit_amount DECIMAL(15, 2) NOT NULL,
  bonus_amount DECIMAL(15, 2) NOT NULL,
  bonus_percentage DECIMAL(5, 2) DEFAULT 5.00,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'credited', 'expired')),
  credited_at TIMESTAMP WITH TIME ZONE,
  expired_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for referral_bonuses
CREATE INDEX IF NOT EXISTS idx_referral_bonuses_referrer ON referral_bonuses(referrer_user_id);
CREATE INDEX IF NOT EXISTS idx_referral_bonuses_referred ON referral_bonuses(referred_user_id);
CREATE INDEX IF NOT EXISTS idx_referral_bonuses_status ON referral_bonuses(status);

-- ============================================
-- PART 3: Fix duplicate referral codes
-- ============================================

-- Step 1: Find and list duplicate referral codes
DO $$
DECLARE
  duplicate_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO duplicate_count
  FROM (
    SELECT referral_code_generated, COUNT(*) as cnt
    FROM users
    WHERE referral_code_generated IS NOT NULL
    GROUP BY referral_code_generated
    HAVING COUNT(*) > 1
  ) duplicates;
  
  IF duplicate_count > 0 THEN
    RAISE NOTICE '⚠️ Found % duplicate referral codes that need to be fixed', duplicate_count;
    
    -- Display the duplicates using a cursor
    DECLARE
      rec RECORD;
    BEGIN
      RAISE NOTICE 'Duplicate referral codes:';
      FOR rec IN (
        SELECT u.id, u.phone, u.referral_code_generated, u.created_at
        FROM users u
        WHERE referral_code_generated IN (
          SELECT referral_code_generated
          FROM users
          WHERE referral_code_generated IS NOT NULL
          GROUP BY referral_code_generated
          HAVING COUNT(*) > 1
        )
        ORDER BY referral_code_generated, created_at
      ) LOOP
        RAISE NOTICE 'User: %, Phone: %, Code: %, Created: %', rec.id, rec.phone, rec.referral_code_generated, rec.created_at;
      END LOOP;
    END;
  ELSE
    RAISE NOTICE '✅ No duplicate referral codes found';
  END IF;
END $$;

-- Step 2: Fix duplicate codes by generating new unique codes
-- We keep the code for the oldest user and regenerate for newer ones
DO $$
DECLARE
  user_rec RECORD;
  new_code VARCHAR(50);
  code_exists BOOLEAN;
BEGIN
  -- For each duplicate (excluding the oldest user with that code)
  FOR user_rec IN (
    SELECT u.id, u.referral_code_generated, u.created_at,
           ROW_NUMBER() OVER (PARTITION BY u.referral_code_generated ORDER BY u.created_at) as rn
    FROM users u
    WHERE referral_code_generated IN (
      SELECT referral_code_generated
      FROM users
      WHERE referral_code_generated IS NOT NULL
      GROUP BY referral_code_generated
      HAVING COUNT(*) > 1
    )
  )
  LOOP
    -- Skip the first (oldest) user with this code
    IF user_rec.rn > 1 THEN
      -- Generate a new unique 8-character code
      code_exists := TRUE;
      WHILE code_exists LOOP
        new_code := upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 8));
        
        -- Check if this code already exists
        SELECT EXISTS(
          SELECT 1 FROM users WHERE referral_code_generated = new_code
        ) INTO code_exists;
      END LOOP;
      
      -- Update the user with the new code
      UPDATE users 
      SET referral_code_generated = new_code
      WHERE id = user_rec.id;
      
      RAISE NOTICE '✅ Updated user % from code % to %', user_rec.id, user_rec.referral_code_generated, new_code;
    END IF;
  END LOOP;
END $$;

-- Step 3: Add UNIQUE constraint to prevent future duplicates
DO $$
BEGIN
  -- Check if constraint already exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'users_referral_code_generated_unique'
  ) THEN
    ALTER TABLE users ADD CONSTRAINT users_referral_code_generated_unique UNIQUE (referral_code_generated);
    RAISE NOTICE '✅ Added UNIQUE constraint to referral_code_generated column';
  ELSE
    RAISE NOTICE 'ℹ️ UNIQUE constraint already exists on referral_code_generated column';
  END IF;
END $$;

-- Step 4: Verify the fix
DO $$
DECLARE
  duplicate_count INTEGER;
  total_codes INTEGER;
BEGIN
  -- Count duplicates
  SELECT COUNT(*) INTO duplicate_count
  FROM (
    SELECT referral_code_generated, COUNT(*) as cnt
    FROM users
    WHERE referral_code_generated IS NOT NULL
    GROUP BY referral_code_generated
    HAVING COUNT(*) > 1
  ) duplicates;
  
  -- Count total codes
  SELECT COUNT(DISTINCT referral_code_generated) INTO total_codes
  FROM users
  WHERE referral_code_generated IS NOT NULL;
  
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'REFERRAL SYSTEM FIX COMPLETE';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Total unique referral codes: %', total_codes;
  RAISE NOTICE 'Remaining duplicates: %', duplicate_count;
  
  IF duplicate_count = 0 THEN
    RAISE NOTICE ' SUCCESS: All referral codes are now unique!';
  ELSE
    RAISE WARNING ' WARNING: Still have % duplicate codes - manual intervention required', duplicate_count;
  END IF;
  RAISE NOTICE '========================================';
END $$;

-- ============================================
-- PART 4: Verify referral_bonus_percent setting
-- ============================================
SELECT 
  setting_key, 
  setting_value,
  description
FROM game_settings 
WHERE setting_key = 'referral_bonus_percent';

-- ============================================
-- PART 5: Show existing referrals and bonuses
-- ============================================
SELECT 'user_referrals' as table_name, COUNT(*) as count FROM user_referrals
UNION ALL
SELECT 'referral_bonuses' as table_name, COUNT(*) as count FROM referral_bonuses;