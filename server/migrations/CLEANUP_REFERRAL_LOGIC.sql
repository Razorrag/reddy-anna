-- ============================================
-- CLEANUP REFERRAL BONUS LOGIC
-- Remove "games played" system in favor of wagering system
-- ============================================

BEGIN;

-- Remove columns used for the old "5 games" logic
ALTER TABLE referral_bonuses
DROP COLUMN IF EXISTS games_required,
DROP COLUMN IF EXISTS games_played;

-- Ensure wagering columns exist (in case previous migration wasn't run)
ALTER TABLE referral_bonuses
ADD COLUMN IF NOT EXISTS wagering_required DECIMAL(15, 2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS wagering_completed DECIMAL(15, 2) DEFAULT 0.00;

-- Ensure correct game settings exist
INSERT INTO game_settings (setting_key, setting_value, description)
VALUES 
  ('referral_wagering_multiplier', '3', 'Wagering requirement multiplier for referral bonuses'),
  ('default_deposit_bonus_percent', '5', 'Percentage of deposit given as bonus'),
  ('wagering_multiplier', '3', 'Wagering requirement multiplier for deposit bonuses')
ON CONFLICT (setting_key) DO UPDATE 
SET description = EXCLUDED.description;

COMMIT;
