-- ============================================================================
-- GENERATE REFERRAL CODES FOR ALL EXISTING USERS
-- ============================================================================
-- Run this AFTER running RUN_THIS_REFERRAL_FIX.sql
-- This will generate codes for all users who don't have one
-- ============================================================================

-- Generate codes for all users missing them
DO $$
DECLARE
  user_record RECORD;
  new_code VARCHAR(10);
  total_users INT := 0;
  codes_generated INT := 0;
BEGIN
  -- Count total users without codes
  SELECT COUNT(*) INTO total_users
  FROM users 
  WHERE role = 'player' 
    AND (referral_code_generated IS NULL OR referral_code_generated = '');
  
  RAISE NOTICE 'Found % users without referral codes', total_users;
  
  -- Generate codes for each user
  FOR user_record IN 
    SELECT id, phone
    FROM users 
    WHERE role = 'player' 
      AND (referral_code_generated IS NULL OR referral_code_generated = '')
    ORDER BY created_at ASC
  LOOP
    BEGIN
      new_code := generate_referral_code(user_record.id);
      codes_generated := codes_generated + 1;
      RAISE NOTICE '[%/%] Generated code % for user % (phone: %)', 
        codes_generated, total_users, new_code, user_record.id, user_record.phone;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'ERROR: Failed to generate code for user % - %', user_record.id, SQLERRM;
    END;
  END LOOP;
  
  RAISE NOTICE '✅ COMPLETE: Generated % referral codes', codes_generated;
END $$;

-- ============================================================================
-- VERIFY ALL USERS NOW HAVE CODES
-- ============================================================================

SELECT 
  COUNT(*) as total_players,
  COUNT(referral_code_generated) as players_with_codes,
  COUNT(*) - COUNT(referral_code_generated) as players_still_missing_codes,
  COUNT(CASE WHEN referral_code_generated LIKE '%-%' THEN 1 END) as new_format_codes,
  COUNT(CASE WHEN referral_code_generated NOT LIKE '%-%' AND referral_code_generated IS NOT NULL THEN 1 END) as old_format_codes
FROM users
WHERE role = 'player';

-- Show sample of generated codes
SELECT 
  id,
  phone,
  referral_code_generated,
  CASE 
    WHEN referral_code_generated LIKE RIGHT(phone, 4) || '-%' THEN '✅ Correct Format'
    ELSE '⚠️ Check Format'
  END as status
FROM users
WHERE role = 'player'
  AND referral_code_generated IS NOT NULL
ORDER BY created_at DESC
LIMIT 10;

-- ============================================================================
-- DONE!
-- ============================================================================
