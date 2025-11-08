-- ============================================
-- BONUS & REFERRAL HISTORY TABLES
-- Creates dedicated tables for tracking bonus history
-- ============================================

-- 1. Create deposit_bonuses table
CREATE TABLE IF NOT EXISTS deposit_bonuses (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id VARCHAR(36) NOT NULL,
  deposit_request_id VARCHAR(36),
  deposit_amount DECIMAL(15, 2) NOT NULL,
  bonus_amount DECIMAL(15, 2) NOT NULL,
  bonus_percentage DECIMAL(5, 2) NOT NULL,
  wagering_required DECIMAL(15, 2) DEFAULT 0.00,
  wagering_completed DECIMAL(15, 2) DEFAULT 0.00,
  status VARCHAR(20) DEFAULT 'pending', -- pending, locked, unlocked, credited, expired, forfeited
  credited_at TIMESTAMP WITH TIME ZONE,
  expired_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT fk_deposit_bonuses_user
    FOREIGN KEY (user_id) 
    REFERENCES users(id) 
    ON DELETE CASCADE,
    
  CONSTRAINT fk_deposit_bonuses_request
    FOREIGN KEY (deposit_request_id) 
    REFERENCES payment_requests(id) 
    ON DELETE SET NULL
);

-- 2. Create referral_bonuses table
CREATE TABLE IF NOT EXISTS referral_bonuses (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  referrer_user_id VARCHAR(36) NOT NULL,
  referred_user_id VARCHAR(36) NOT NULL,
  referral_id VARCHAR(36), -- Link to user_referrals table
  deposit_amount DECIMAL(15, 2) NOT NULL,
  bonus_amount DECIMAL(15, 2) NOT NULL,
  bonus_percentage DECIMAL(5, 2) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending', -- pending, credited, expired, forfeited
  credited_at TIMESTAMP WITH TIME ZONE,
  expired_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT fk_referral_bonuses_referrer
    FOREIGN KEY (referrer_user_id) 
    REFERENCES users(id) 
    ON DELETE CASCADE,
    
  CONSTRAINT fk_referral_bonuses_referred
    FOREIGN KEY (referred_user_id) 
    REFERENCES users(id) 
    ON DELETE CASCADE,
    
  CONSTRAINT fk_referral_bonuses_referral
    FOREIGN KEY (referral_id) 
    REFERENCES user_referrals(id) 
    ON DELETE SET NULL
);

-- 3. Create bonus_transactions table
CREATE TABLE IF NOT EXISTS bonus_transactions (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id VARCHAR(36) NOT NULL,
  bonus_type VARCHAR(50) NOT NULL, -- deposit_bonus, referral_bonus, conditional_bonus
  bonus_source_id VARCHAR(36), -- ID from deposit_bonuses or referral_bonuses
  amount DECIMAL(15, 2) NOT NULL,
  balance_before DECIMAL(15, 2),
  balance_after DECIMAL(15, 2),
  action VARCHAR(50) NOT NULL, -- added, locked, unlocked, credited, expired, forfeited, wagering_progress
  description TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT fk_bonus_transactions_user
    FOREIGN KEY (user_id) 
    REFERENCES users(id) 
    ON DELETE CASCADE
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

-- deposit_bonuses indexes
CREATE INDEX IF NOT EXISTS idx_deposit_bonuses_user_id 
  ON deposit_bonuses(user_id);

CREATE INDEX IF NOT EXISTS idx_deposit_bonuses_status 
  ON deposit_bonuses(status);

CREATE INDEX IF NOT EXISTS idx_deposit_bonuses_created_at 
  ON deposit_bonuses(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_deposit_bonuses_user_status 
  ON deposit_bonuses(user_id, status);

-- referral_bonuses indexes
CREATE INDEX IF NOT EXISTS idx_referral_bonuses_referrer 
  ON referral_bonuses(referrer_user_id);

CREATE INDEX IF NOT EXISTS idx_referral_bonuses_referred 
  ON referral_bonuses(referred_user_id);

CREATE INDEX IF NOT EXISTS idx_referral_bonuses_status 
  ON referral_bonuses(status);

CREATE INDEX IF NOT EXISTS idx_referral_bonuses_created_at 
  ON referral_bonuses(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_referral_bonuses_referrer_status 
  ON referral_bonuses(referrer_user_id, status);

-- bonus_transactions indexes
CREATE INDEX IF NOT EXISTS idx_bonus_transactions_user_id 
  ON bonus_transactions(user_id);

CREATE INDEX IF NOT EXISTS idx_bonus_transactions_bonus_type 
  ON bonus_transactions(bonus_type);

CREATE INDEX IF NOT EXISTS idx_bonus_transactions_created_at 
  ON bonus_transactions(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_bonus_transactions_user_type 
  ON bonus_transactions(user_id, bonus_type);

CREATE INDEX IF NOT EXISTS idx_bonus_transactions_source 
  ON bonus_transactions(bonus_source_id);

-- ============================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================

-- Trigger for deposit_bonuses
CREATE OR REPLACE FUNCTION update_deposit_bonuses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_deposit_bonuses_updated_at
  BEFORE UPDATE ON deposit_bonuses
  FOR EACH ROW
  EXECUTE FUNCTION update_deposit_bonuses_updated_at();

-- Trigger for referral_bonuses
CREATE OR REPLACE FUNCTION update_referral_bonuses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_referral_bonuses_updated_at
  BEFORE UPDATE ON referral_bonuses
  FOR EACH ROW
  EXECUTE FUNCTION update_referral_bonuses_updated_at();

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check if tables were created
SELECT 
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_name IN ('deposit_bonuses', 'referral_bonuses', 'bonus_transactions')
ORDER BY table_name;

-- Check indexes
SELECT 
  tablename, 
  indexname
FROM pg_indexes
WHERE tablename IN ('deposit_bonuses', 'referral_bonuses', 'bonus_transactions')
ORDER BY tablename, indexname;

-- ============================================
-- SUCCESS MESSAGE
-- ============================================
DO $$
BEGIN
  RAISE NOTICE 'Bonus history tables created successfully!';
  RAISE NOTICE 'Created: deposit_bonuses table';
  RAISE NOTICE 'Created: referral_bonuses table';
  RAISE NOTICE 'Created: bonus_transactions table';
  RAISE NOTICE 'Created: All indexes and triggers';
END $$;
