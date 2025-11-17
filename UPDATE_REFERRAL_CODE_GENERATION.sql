-- ============================================================================
-- UPDATE REFERRAL CODE GENERATION
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
-- REGENERATE REFERRAL CODES FOR ALL EXISTING USERS
-- ============================================================================

-- Drop old function first (in case it exists with different signature)
DROP FUNCTION IF EXISTS regenerate_all_referral_codes();

-- Function to regenerate codes for all users
CREATE OR REPLACE FUNCTION regenerate_all_referral_codes()
RETURNS TABLE (
  user_id VARCHAR(20),
  user_phone VARCHAR(15),
  old_code VARCHAR(50),
  new_code VARCHAR(10)
) AS $$
DECLARE
  user_record RECORD;
  generated_code VARCHAR(10);
BEGIN
  -- Loop through all users
  FOR user_record IN 
    SELECT u.id, u.phone, u.referral_code_generated 
    FROM users u
    WHERE u.role = 'player'
    ORDER BY u.created_at ASC
  LOOP
    -- Generate new code for this user
    generated_code := generate_referral_code(user_record.id);
    
    -- Return the result
    user_id := user_record.id;
    user_phone := user_record.phone;
    old_code := user_record.referral_code_generated;
    new_code := generated_code;
    
    RETURN NEXT;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TESTING & VERIFICATION
-- ============================================================================

-- Test: Generate code for a specific user (replace with actual user ID)
-- SELECT generate_referral_code('9876543210');

-- Verify: Check all users have referral codes
SELECT 
  id,
  phone,
  referral_code_generated,
  CASE 
    WHEN referral_code_generated IS NULL THEN '❌ Missing'
    WHEN referral_code_generated LIKE RIGHT(phone, 4) || '-%' THEN '✅ Correct Format'
    ELSE '⚠️ Old Format'
  END as status
FROM users
WHERE role = 'player'
ORDER BY created_at DESC
LIMIT 20;

-- ============================================================================
-- OPTIONAL: Regenerate codes for all existing users
-- ============================================================================
-- WARNING: This will change all existing referral codes!
-- Only run if you want to update all codes to the new format

-- Uncomment to run:
-- SELECT * FROM regenerate_all_referral_codes();

-- ============================================================================
-- After running this SQL:
-- 1. All new users will get codes like: 5432-A7B9
-- 2. Format: Last 4 digits of phone + dash + 4 random chars
-- 3. Codes are unique and automatically generated on user creation
-- ============================================================================
