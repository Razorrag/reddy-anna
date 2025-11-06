-- Migration: Add bonus tracking table for per-deposit bonus management
-- This allows tracking multiple bonuses with individual wagering requirements

-- Create bonus_tracking table
CREATE TABLE IF NOT EXISTS bonus_tracking (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  bonus_type VARCHAR(50) NOT NULL, -- 'deposit_bonus' or 'referral_bonus'
  bonus_amount DECIMAL(15, 2) NOT NULL,
  deposit_amount DECIMAL(15, 2), -- Original deposit amount (for deposit bonuses)
  wagering_requirement DECIMAL(15, 2) NOT NULL,
  wagering_completed DECIMAL(15, 2) DEFAULT 0.00,
  status VARCHAR(20) DEFAULT 'locked', -- 'locked', 'unlocked', 'claimed'
  created_at TIMESTAMP DEFAULT NOW(),
  unlocked_at TIMESTAMP,
  claimed_at TIMESTAMP,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_bonus_tracking_user_id ON bonus_tracking(user_id);
CREATE INDEX IF NOT EXISTS idx_bonus_tracking_status ON bonus_tracking(status);
CREATE INDEX IF NOT EXISTS idx_bonus_tracking_user_status ON bonus_tracking(user_id, status);

-- Add comment
COMMENT ON TABLE bonus_tracking IS 'Tracks individual bonuses with separate wagering requirements';
COMMENT ON COLUMN bonus_tracking.bonus_type IS 'Type of bonus: deposit_bonus or referral_bonus';
COMMENT ON COLUMN bonus_tracking.deposit_amount IS 'Original deposit amount that generated this bonus';
COMMENT ON COLUMN bonus_tracking.wagering_requirement IS 'Amount user must wager to unlock this specific bonus';
COMMENT ON COLUMN bonus_tracking.wagering_completed IS 'Amount wagered towards this specific bonus';
COMMENT ON COLUMN bonus_tracking.status IS 'locked = not claimable, unlocked = claimable, claimed = already claimed';
