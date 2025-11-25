-- ============================================
-- COMPLETE DATABASE FIX MIGRATION
-- Fixes all bonus system issues
-- Run this in Supabase SQL Editor
-- ============================================

BEGIN;

-- ============================================
-- STEP 1: Drop existing bonus tables (they have wrong column types)
-- ============================================

DROP TABLE IF EXISTS bonus_transactions CASCADE;
DROP TABLE IF EXISTS referral_bonuses CASCADE;
DROP TABLE IF EXISTS deposit_bonuses CASCADE;

-- ============================================
-- STEP 2: Create deposit_bonuses table with correct types
-- ============================================

CREATE TABLE deposit_bonuses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id VARCHAR(20) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  deposit_request_id UUID REFERENCES payment_requests(id),
  
  -- Amounts
  deposit_amount DECIMAL(15, 2) NOT NULL,
  bonus_amount DECIMAL(15, 2) NOT NULL,
  bonus_percentage DECIMAL(5, 2) DEFAULT 5.00,
  
  -- Wagering tracking
  wagering_required DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
  wagering_completed DECIMAL(15, 2) DEFAULT 0.00,
  wagering_progress DECIMAL(5, 2) DEFAULT 0.00,
  
  -- Status tracking
  status TEXT DEFAULT 'locked' CHECK (status IN ('locked', 'unlocked', 'credited', 'expired', 'forfeited')),
  locked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  unlocked_at TIMESTAMP WITH TIME ZONE,
  credited_at TIMESTAMP WITH TIME ZONE,
  expired_at TIMESTAMP WITH TIME ZONE,
  
  -- Metadata
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for deposit_bonuses
CREATE INDEX idx_deposit_bonuses_user_id ON deposit_bonuses(user_id);
CREATE INDEX idx_deposit_bonuses_status ON deposit_bonuses(status);
CREATE INDEX idx_deposit_bonuses_created_at ON deposit_bonuses(created_at DESC);
CREATE INDEX idx_deposit_bonuses_user_status ON deposit_bonuses(user_id, status);

-- ============================================
-- STEP 3: Create referral_bonuses table with correct types
-- ============================================

CREATE TABLE referral_bonuses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  referrer_user_id VARCHAR(20) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  referred_user_id VARCHAR(20) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  referral_id VARCHAR(36) REFERENCES user_referrals(id),
  
  -- Amounts
  deposit_amount DECIMAL(15, 2) NOT NULL,
  bonus_amount DECIMAL(15, 2) NOT NULL,
  bonus_percentage DECIMAL(5, 2) DEFAULT 5.00,
  
  -- Status (includes 'locked' which code uses)
  status TEXT DEFAULT 'locked' CHECK (status IN ('pending', 'locked', 'unlocked', 'credited', 'expired')),
  credited_at TIMESTAMP WITH TIME ZONE,
  expired_at TIMESTAMP WITH TIME ZONE,
  
  -- Wagering tracking
  wagering_required DECIMAL(15, 2) DEFAULT 0.00,
  wagering_completed DECIMAL(15, 2) DEFAULT 0.00,
  
  -- Metadata
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for referral_bonuses
CREATE INDEX idx_referral_bonuses_referrer ON referral_bonuses(referrer_user_id);
CREATE INDEX idx_referral_bonuses_referred ON referral_bonuses(referred_user_id);
CREATE INDEX idx_referral_bonuses_status ON referral_bonuses(status);
CREATE INDEX idx_referral_bonuses_referrer_status ON referral_bonuses(referrer_user_id, status);

-- ============================================
-- STEP 4: Create bonus_transactions table with correct types
-- ============================================

CREATE TABLE bonus_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id VARCHAR(20) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Type and source
  bonus_type TEXT NOT NULL CHECK (bonus_type IN ('deposit_bonus', 'referral_bonus', 'conditional_bonus', 'promotional_bonus')),
  bonus_source_id UUID,
  
  -- Amounts
  amount DECIMAL(15, 2) NOT NULL,
  balance_before DECIMAL(15, 2),
  balance_after DECIMAL(15, 2),
  
  -- Action tracking
  action TEXT NOT NULL CHECK (action IN ('added', 'locked', 'unlocked', 'credited', 'expired', 'forfeited', 'wagering_progress')),
  description TEXT NOT NULL,
  metadata JSONB,
  
  -- Timestamp
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for bonus_transactions
CREATE INDEX idx_bonus_transactions_user_id ON bonus_transactions(user_id);
CREATE INDEX idx_bonus_transactions_type ON bonus_transactions(bonus_type);
CREATE INDEX idx_bonus_transactions_action ON bonus_transactions(action);
CREATE INDEX idx_bonus_transactions_created_at ON bonus_transactions(created_at DESC);
CREATE INDEX idx_bonus_transactions_user_created ON bonus_transactions(user_id, created_at DESC);

-- ============================================
-- STEP 5: Clear user_referrals (will be recreated on deposits)
-- ============================================

TRUNCATE TABLE user_referrals CASCADE;

-- ============================================
-- STEP 6: Ensure game settings exist with correct values
-- ============================================

INSERT INTO game_settings (setting_key, setting_value, description)
VALUES 
  ('referral_wagering_multiplier', '3', 'Wagering requirement multiplier for referral bonuses (3x bonus)'),
  ('default_deposit_bonus_percent', '5', 'Percentage of deposit given as bonus'),
  ('wagering_multiplier', '0.3', 'Wagering requirement multiplier for deposit bonuses (30% of deposit)'),
  ('referral_bonus_percent', '5', 'Referral bonus percentage (5% of deposit)')
ON CONFLICT (setting_key) DO UPDATE 
SET setting_value = EXCLUDED.setting_value,
    description = EXCLUDED.description;

-- ============================================
-- STEP 7: Create triggers for updated_at
-- ============================================

CREATE OR REPLACE FUNCTION update_bonus_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS deposit_bonuses_updated_at ON deposit_bonuses;
CREATE TRIGGER deposit_bonuses_updated_at
  BEFORE UPDATE ON deposit_bonuses
  FOR EACH ROW
  EXECUTE FUNCTION update_bonus_updated_at();

DROP TRIGGER IF EXISTS referral_bonuses_updated_at ON referral_bonuses;
CREATE TRIGGER referral_bonuses_updated_at
  BEFORE UPDATE ON referral_bonuses
  FOR EACH ROW
  EXECUTE FUNCTION update_bonus_updated_at();

-- ============================================
-- STEP 8: Create view for bonus summary
-- ============================================

DROP VIEW IF EXISTS user_bonus_summary;

CREATE VIEW user_bonus_summary AS
SELECT 
  u.id as user_id,
  u.phone,
  u.full_name,
  
  -- Deposit bonuses
  COALESCE(SUM(CASE WHEN db.status = 'unlocked' THEN db.bonus_amount ELSE 0 END), 0) as deposit_bonus_unlocked,
  COALESCE(SUM(CASE WHEN db.status = 'locked' THEN db.bonus_amount ELSE 0 END), 0) as deposit_bonus_locked,
  COALESCE(SUM(CASE WHEN db.status = 'credited' THEN db.bonus_amount ELSE 0 END), 0) as deposit_bonus_credited,
  
  -- Referral bonuses
  COALESCE(SUM(CASE WHEN rb.status = 'credited' THEN rb.bonus_amount ELSE 0 END), 0) as referral_bonus_credited,
  COALESCE(SUM(CASE WHEN rb.status IN ('pending', 'locked') THEN rb.bonus_amount ELSE 0 END), 0) as referral_bonus_pending,
  
  -- Totals
  COALESCE(SUM(CASE WHEN db.status IN ('unlocked', 'locked') THEN db.bonus_amount ELSE 0 END), 0) + 
  COALESCE(SUM(CASE WHEN rb.status IN ('pending', 'locked') THEN rb.bonus_amount ELSE 0 END), 0) as total_available,
  
  COALESCE(SUM(CASE WHEN db.status = 'credited' THEN db.bonus_amount ELSE 0 END), 0) + 
  COALESCE(SUM(CASE WHEN rb.status = 'credited' THEN rb.bonus_amount ELSE 0 END), 0) as total_credited,
  
  COALESCE(SUM(db.bonus_amount), 0) + COALESCE(SUM(rb.bonus_amount), 0) as lifetime_earnings
  
FROM users u
LEFT JOIN deposit_bonuses db ON u.id = db.user_id
LEFT JOIN referral_bonuses rb ON u.id = rb.referrer_user_id
GROUP BY u.id, u.phone, u.full_name;

COMMIT;

-- ============================================
-- VERIFICATION QUERIES (run after migration)
-- ============================================

-- Check deposit_bonuses structure
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'deposit_bonuses';

-- Check referral_bonuses structure
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'referral_bonuses';

-- Check bonus_transactions structure
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'bonus_transactions';

-- Check game settings
-- SELECT * FROM game_settings WHERE setting_key LIKE '%bonus%' OR setting_key LIKE '%wagering%' OR setting_key LIKE '%referral%';
