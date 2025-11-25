-- ================================================================
-- EMERGENCY SIGNUP FIX - Run This First
-- ================================================================
-- This is the ABSOLUTE MINIMUM needed to fix signup
-- Takes 5 seconds to run
-- ================================================================

-- Add UNIQUE constraint to referral_code_generated
ALTER TABLE users 
ADD CONSTRAINT users_referral_code_generated_unique 
UNIQUE (referral_code_generated);

-- That's it! Signup should work now.

-- Verify it worked:
SELECT 
    conname as constraint_name,
    'SIGNUP FIXED! ✅' as status
FROM pg_constraint 
WHERE conname = 'users_referral_code_generated_unique';