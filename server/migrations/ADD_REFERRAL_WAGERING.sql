-- ============================================
-- UPDATE REFERRAL BONUS TO WAGERING SYSTEM
-- Switch from game count to wagering requirement
-- ============================================

BEGIN;

-- 1. Add wagering columns to referral_bonuses
ALTER TABLE referral_bonuses
ADD COLUMN IF NOT EXISTS wagering_required DECIMAL(15, 2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS wagering_completed DECIMAL(15, 2) DEFAULT 0.00;

-- 2. Add referral_wagering_multiplier setting (Default 3x)
INSERT INTO game_settings (setting_key, setting_value, description)
VALUES ('referral_wagering_multiplier', '3', 'Wagering requirement multiplier for referral bonuses (e.g. 3 = 3x bonus amount)')
ON CONFLICT (setting_key) DO NOTHING;

COMMIT;
