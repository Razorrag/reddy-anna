-- Add Wagering Requirement System for Bonus Unlock
-- This ensures bonuses are only unlocked after user meets betting requirements

-- Add wagering tracking columns to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS wagering_requirement DECIMAL(15, 2) DEFAULT '0.00',
ADD COLUMN IF NOT EXISTS wagering_completed DECIMAL(15, 2) DEFAULT '0.00',
ADD COLUMN IF NOT EXISTS bonus_locked BOOLEAN DEFAULT FALSE;

-- Update existing users to have these fields
UPDATE users 
SET 
  bonus_locked = FALSE,
  wagering_requirement = '0.00',
  wagering_completed = '0.00'
WHERE bonus_locked IS NULL;

-- Add comment to explain fields
COMMENT ON COLUMN users.wagering_requirement IS 'Total amount user must wager to unlock bonus';
COMMENT ON COLUMN users.wagering_completed IS 'Amount already wagered towards requirement';
COMMENT ON COLUMN users.bonus_locked IS 'Whether bonus is currently locked and requires wagering';

-- Update game settings for wagering configuration
INSERT INTO game_settings (setting_key, setting_value, description, created_at, updated_at)
VALUES 
  ('wagering_multiplier', '0.3', 'Wagering requirement multiplier (0.3 = 30% of deposit must be wagered to unlock bonus)', NOW(), NOW()),
  ('show_locked_bonus_separately', 'true', 'Show locked bonus separately from main balance in UI', NOW(), NOW())
ON CONFLICT (setting_key) DO UPDATE 
SET setting_value = EXCLUDED.setting_value,
    description = EXCLUDED.description,
    updated_at = NOW();

-- Disable the old threshold-based auto-credit system
UPDATE game_settings 
SET setting_value = '0'
WHERE setting_key = 'bonus_claim_threshold';

COMMENT ON COLUMN game_settings.setting_value IS 'For bonus_claim_threshold: Set to 0 to disable old auto-credit system and use wagering requirements instead';

-- Create index for faster lookups of users with locked bonuses
CREATE INDEX IF NOT EXISTS idx_users_bonus_locked ON users(bonus_locked) WHERE bonus_locked = TRUE;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Wagering requirement system added successfully!';
  RAISE NOTICE '📊 Configuration:';
  RAISE NOTICE '   - Wagering multiplier: 30%% of deposit (user must wager 30%% of deposit to unlock bonus)';
  RAISE NOTICE '   - Bonus will be shown as LOCKED until requirement met';
  RAISE NOTICE '   - Old auto-credit system disabled (bonus_claim_threshold = 0)';
END $$;

