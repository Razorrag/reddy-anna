-- ============================================
-- GENERATE MISSING REFERRAL CODES
-- ============================================
-- This script generates referral codes for users who don't have one
-- Run this in Supabase SQL Editor

-- Step 1: Check current state
SELECT 
  'Before Migration' as status,
  COUNT(*) as total_users,
  COUNT(referral_code_generated) as users_with_code,
  COUNT(*) - COUNT(referral_code_generated) as missing_codes
FROM users
WHERE role = 'player';

-- Step 2: Verify generate_referral_code function exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.routines 
    WHERE routine_name = 'generate_referral_code'
  ) THEN
    RAISE EXCEPTION 'generate_referral_code function does not exist! Create it first.';
  END IF;
END $$;

-- Step 3: Generate codes for users without one
DO $$
DECLARE
  user_record RECORD;
  generated_code VARCHAR(10);
  success_count INTEGER := 0;
  error_count INTEGER := 0;
BEGIN
  RAISE NOTICE '🔄 Starting referral code generation...';
  RAISE NOTICE '';
  
  FOR user_record IN 
    SELECT id, phone, full_name
    FROM users 
    WHERE role = 'player' 
      AND referral_code_generated IS NULL
    ORDER BY created_at ASC
  LOOP
    BEGIN
      -- Call the generate_referral_code function
      SELECT generate_referral_code(user_record.id) INTO generated_code;
      
      success_count := success_count + 1;
      RAISE NOTICE '✅ Generated code % for user: % (%)', 
        generated_code, 
        user_record.phone, 
        COALESCE(user_record.full_name, 'No name');
        
    EXCEPTION WHEN OTHERS THEN
      error_count := error_count + 1;
      RAISE NOTICE '❌ Failed for user: % - Error: %', 
        user_record.phone, 
        SQLERRM;
    END;
  END LOOP;
  
  RAISE NOTICE '';
  RAISE NOTICE '✅ Migration complete!';
  RAISE NOTICE '   Success: % users', success_count;
  RAISE NOTICE '   Errors: % users', error_count;
END $$;

-- Step 4: Verify results
SELECT 
  'After Migration' as status,
  COUNT(*) as total_users,
  COUNT(referral_code_generated) as users_with_code,
  COUNT(*) - COUNT(referral_code_generated) as missing_codes
FROM users
WHERE role = 'player';

-- Step 5: Show sample of generated codes
SELECT 
  phone,
  full_name,
  referral_code_generated,
  created_at
FROM users
WHERE role = 'player'
  AND referral_code_generated IS NOT NULL
ORDER BY created_at DESC
LIMIT 10;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check if any users used referral codes
SELECT 
  'Users who used referral codes' as metric,
  COUNT(*) as count
FROM users
WHERE role = 'player' 
  AND referral_code IS NOT NULL;

-- Check referral relationships
SELECT 
  'Referral relationships tracked' as metric,
  COUNT(*) as count
FROM user_referrals;

-- Check referral bonuses created
SELECT 
  'Referral bonuses created' as metric,
  COUNT(*) as count
FROM referral_bonuses;

-- ============================================
-- NEXT STEPS
-- ============================================
-- After running this script:
-- 1. All players should have referral_code_generated
-- 2. Share referral codes with test users
-- 3. Test signup with referral code
-- 4. Test deposit to trigger referral bonus
-- 5. Check frontend displays data correctly
-- ============================================
