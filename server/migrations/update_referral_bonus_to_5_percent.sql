-- ============================================
-- UPDATE REFERRAL BONUS FROM 1% TO 5%
-- ============================================
-- This updates the referral_bonus_percent setting in the database
-- from 1% to 5% to match the correct business logic
-- ============================================

-- Update the setting value
UPDATE game_settings 
SET setting_value = '5',
    description = 'Referral bonus percentage (5% of deposit amount)',
    updated_at = NOW()
WHERE setting_key = 'referral_bonus_percent';

-- Verify the update
DO $$
DECLARE
  current_value TEXT;
BEGIN
  SELECT setting_value INTO current_value
  FROM game_settings
  WHERE setting_key = 'referral_bonus_percent';
  
  IF current_value = '5' THEN
    RAISE NOTICE '✅ SUCCESS: Referral bonus percentage updated to 5%%';
  ELSE
    RAISE WARNING '⚠️ WARNING: Referral bonus percentage is still %', current_value;
  END IF;
END $$;