-- ================================================================
-- SIMPLE FIX FOR SIGNUP ERROR
-- ================================================================
-- This is a minimal script that fixes ONLY the signup issue
-- Run this if the full cleanup script fails
-- ================================================================

BEGIN;

-- ================================================================
-- STEP 1: Add UNIQUE Constraint to referral_code_generated
-- ================================================================
-- This is THE critical fix that allows signups to work

DO $$ 
BEGIN
    -- Check if constraint already exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'users_referral_code_generated_unique'
    ) THEN
        ALTER TABLE users 
        ADD CONSTRAINT users_referral_code_generated_unique 
        UNIQUE (referral_code_generated);
        
        RAISE NOTICE '✅ Added UNIQUE constraint to referral_code_generated';
    ELSE
        RAISE NOTICE 'ℹ️ UNIQUE constraint already exists on referral_code_generated';
    END IF;
END $$;

-- ================================================================
-- STEP 2: Fix Referral Bonus Percentage (1% → 5%)
-- ================================================================

DO $$
BEGIN
    -- Update default for new records
    ALTER TABLE referral_bonuses 
    ALTER COLUMN bonus_percentage SET DEFAULT 5.00;
    
    RAISE NOTICE '✅ Updated referral_bonuses.bonus_percentage default to 5.00';
END $$;

-- ================================================================
-- STEP 3: Add Essential Indexes (Optional but Recommended)
-- ================================================================

DO $$
BEGIN
    -- Index on referral_code_generated for fast lookups
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'idx_users_referral_code_generated'
    ) THEN
        CREATE INDEX idx_users_referral_code_generated 
        ON users(referral_code_generated) 
        WHERE referral_code_generated IS NOT NULL;
        
        RAISE NOTICE '✅ Created index on referral_code_generated';
    END IF;
    
    -- Index on user_referrals for fast queries
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'idx_user_referrals_referrer'
    ) THEN
        CREATE INDEX idx_user_referrals_referrer 
        ON user_referrals(referrer_user_id);
        
        RAISE NOTICE '✅ Created index on user_referrals.referrer_user_id';
    END IF;
END $$;

COMMIT;

-- ================================================================
-- VERIFICATION
-- ================================================================

SELECT 
    '✅ SIGNUP FIX COMPLETE' as status,
    COUNT(*) as constraint_count
FROM pg_constraint 
WHERE conname = 'users_referral_code_generated_unique';

-- Should show: status: ✅ SIGNUP FIX COMPLETE, constraint_count: 1

RAISE NOTICE '================================================================';
RAISE NOTICE '✅ SIMPLE SIGNUP FIX COMPLETE!';
RAISE NOTICE '';
RAISE NOTICE 'What was fixed:';
RAISE NOTICE '  ✅ Added UNIQUE constraint to referral_code_generated';
RAISE NOTICE '  ✅ Fixed referral bonus percentage to 5%';
RAISE NOTICE '  ✅ Added performance indexes';
RAISE NOTICE '';
RAISE NOTICE 'You can now:';
RAISE NOTICE '  ✅ Sign up new users';
RAISE NOTICE '  ✅ Use referral codes';
RAISE NOTICE '  ✅ Track referrals';
RAISE NOTICE '';
RAISE NOTICE 'Test by creating a new user in the signup page!';
RAISE NOTICE '================================================================';