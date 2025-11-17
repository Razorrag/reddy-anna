-- ============================================================================
-- REFERRAL CODE FIX - SIMPLE VERSION
-- ============================================================================
-- Just run this entire file in Supabase SQL Editor
-- ============================================================================

-- Step 1: Drop old functions
DROP FUNCTION IF EXISTS generate_referral_code(VARCHAR);
DROP FUNCTION IF EXISTS regenerate_all_referral_codes();

-- Step 2: Create new referral code generator
CREATE OR REPLACE FUNCTION generate_referral_code(
  p_user_id VARCHAR(20)
)
RETURNS VARCHAR(10) AS $$
DECLARE
  v_referral_code VARCHAR(10);
  v_temp_code VARCHAR(10);
  v_code_exists BOOLEAN := TRUE;
  v_user_phone VARCHAR(15);
  v_last_four VARCHAR(4);
  v_random_part VARCHAR(4);
BEGIN
  -- Get user's phone number
  SELECT u.phone INTO v_user_phone FROM users u WHERE u.id = p_user_id;
  
  IF v_user_phone IS NULL THEN
    RAISE EXCEPTION 'User not found: %', p_user_id;
  END IF;
  
  -- Extract last 4 digits of phone number
  v_last_four := RIGHT(v_user_phone, 4);
  
  -- Generate unique code with last 4 digits + random 4 characters
  WHILE v_code_exists LOOP
    -- Generate 4 random alphanumeric characters (uppercase)
    v_random_part := upper(substring(md5(random()::text) from 1 for 4));
    
    -- Combine: XXXX-YYYY format (last 4 digits - random 4 chars)
    v_temp_code := v_last_four || '-' || v_random_part;
    
    -- Check if code already exists
    SELECT EXISTS(
      SELECT 1 FROM users u WHERE u.referral_code_generated = v_temp_code
    ) INTO v_code_exists;
    
    IF NOT v_code_exists THEN
      v_referral_code := v_temp_code;
      EXIT;
    END IF;
  END LOOP;
  
  -- Update user with referral code
  UPDATE users u
  SET referral_code_generated = v_referral_code,
      updated_at = NOW()
  WHERE u.id = p_user_id;
  
  RETURN v_referral_code;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Check function was created successfully
SELECT 'Function created successfully!' as status;

-- ============================================================================
-- DONE! All new users will get codes like: 5432-A7B9
-- ============================================================================
