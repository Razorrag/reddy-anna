-- ============================================
-- REFERRAL & BONUS SYSTEM - NEW SETTINGS
-- Adds conditional thresholds and limits
-- ============================================

-- Add new referral-related settings
INSERT INTO game_settings (setting_key, setting_value, description, created_at, updated_at)
VALUES
  ('min_deposit_for_referral', '500', 'Minimum deposit amount (₹) to trigger referral bonus', NOW(), NOW()),
  ('max_referrals_per_month', '50', 'Maximum number of referrals per user per month', NOW(), NOW()),
  ('max_referral_bonus_per_month', '10000', 'Maximum referral bonus amount (₹) per user per month', NOW(), NOW()),
  ('min_bets_for_referral', '5', 'Minimum number of bets required before referral bonus applies', NOW(), NOW()),
  ('referral_wagering_multiplier', '0.1', 'Wagering multiplier for referral bonus (10% of bonus amount)', NOW(), NOW())
ON CONFLICT (setting_key) 
DO UPDATE SET 
  setting_value = EXCLUDED.setting_value,
  description = EXCLUDED.description,
  updated_at = NOW();

-- Verify settings were added
SELECT 
  setting_key,
  setting_value,
  description
FROM game_settings
WHERE setting_key IN (
  'min_deposit_for_referral',
  'max_referrals_per_month',
  'max_referral_bonus_per_month',
  'min_bets_for_referral',
  'referral_wagering_multiplier',
  'referral_bonus_percent',
  'default_deposit_bonus_percent',
  'wagering_multiplier',
  'bonus_claim_threshold'
)
ORDER BY setting_key;

-- ============================================
-- SUCCESS MESSAGE
-- ============================================
DO $$
BEGIN
  RAISE NOTICE 'Referral system settings added successfully!';
  RAISE NOTICE 'Minimum deposit for referral: Rs.500';
  RAISE NOTICE 'Maximum referrals per month: 50';
  RAISE NOTICE 'Maximum referral bonus per month: Rs.10,000';
  RAISE NOTICE 'Minimum bets required: 5';
  RAISE NOTICE 'Referral wagering multiplier: 0.1 (10 percent)';
END $$;
