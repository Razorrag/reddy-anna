-- Add wagering requirement tracking columns for bonus system
-- This migration adds fields to track wagering progress for unlocking bonuses

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS wagering_requirement DECIMAL(15, 2) DEFAULT '0.00',
ADD COLUMN IF NOT EXISTS wagering_completed DECIMAL(15, 2) DEFAULT '0.00',
ADD COLUMN IF NOT EXISTS bonus_locked BOOLEAN DEFAULT FALSE;

-- Update existing users to ensure fields are initialized
UPDATE users 
SET 
    bonus_locked = COALESCE(bonus_locked, FALSE),
    wagering_requirement = COALESCE(wagering_requirement, '0.00'),
    wagering_completed = COALESCE(wagering_completed, '0.00')
WHERE bonus_locked IS NULL OR wagering_requirement IS NULL OR wagering_completed IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN users.wagering_requirement IS 'Total amount user must wager to unlock bonus';
COMMENT ON COLUMN users.wagering_completed IS 'Amount already wagered towards requirement (cumulative bets)';
COMMENT ON COLUMN users.bonus_locked IS 'Whether bonus is currently locked until wagering requirement is met';











