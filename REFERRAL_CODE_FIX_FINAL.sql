-- ============================================================================
-- REFERRAL CODE AUTO-GENERATION - FINAL VERSION
-- ============================================================================
-- Generate referral code using last 4 digits of phone + 4 random characters
-- Format: XXXX-YYYY (e.g., 5432-A7B9)
-- ============================================================================

-- Drop old function
DROP FUNCTION IF EXISTS generate_referral_code(VARCHAR);

-- Create new function with phone-based code generation
CREATE OR REPLACE FUNCTION generate_referral_code(
  p_user_id VARCHAR(20)
)
RETURNS VARCHAR(10) AS $$
DECLARE
  referral_code VARCHAR(10);
  temp_code VARCHAR(10);
  code_exists BOOLEAN := TRUE;
  user_phone VARCHAR(15);
  last_four VARCHAR(4);
  random_part VARCHAR(4);
BEGIN
  -- Get user's phone number
  SELECT phone INTO user_phone FROM users WHERE id = p_user_id;
  
  IF user_phone IS NULL THEN
    RAISE EXCEPTION 'User not found: %', p_user_id;
  END IF;
  
  -- Extract last 4 digits of phone number
  last_four := RIGHT(user_phone, 4);
  
  -- Generate unique code with last 4 digits + random 4 characters
  WHILE code_exists LOOP
    -- Generate 4 random alphanumeric characters (uppercase)
    random_part := upper(substring(md5(random()::text) from 1 for 4));
    
    -- Combine: XXXX-YYYY format (last 4 digits - random 4 chars)
    temp_code := last_four || '-' || random_part;
    
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
  SET referral_code_generated = referral_code,
      updated_at = NOW()
  WHERE id = p_user_id;
  
  RETURN referral_code;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Check function was created
SELECT 
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_name = 'generate_referral_code';

-- Expected: Should show 'generate_referral_code' as FUNCTION

-- ============================================================================
-- TESTING
-- ============================================================================

-- Test: Check current referral codes format
SELECT 
  id,
  phone,
  referral_code_generated,
  CASE 
    WHEN referral_code_generated IS NULL THEN '❌ Missing'
    WHEN referral_code_generated LIKE RIGHT(phone, 4) || '-%' THEN '✅ New Format'
    ELSE '⚠️ Old Format'
  END as format_status
FROM users
WHERE role = 'player'
ORDER BY created_at DESC
LIMIT 10;

-- ============================================================================
-- DONE!
-- ============================================================================
-- All new users will automatically get codes like: 5432-A7B9
-- Format: Last 4 digits of phone + dash + 4 random uppercase chars
-- ============================================================================
