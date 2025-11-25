-- ============================================================================
-- COMPLETE REFERRAL SYSTEM FIX
-- ============================================================================
-- This script fixes ALL referral-related issues:
-- 1. Tables: user_referrals, referral_bonuses (ensure correct schema)
-- 2. Triggers: Auto-generate referral codes, track referrals
-- 3. Functions: Generate codes, apply bonuses, track wagering
-- 4. Data fixes: Fix existing corrupted data
-- 5. Settings: Ensure correct referral settings exist
--
-- REFERRAL FLOW:
-- 1. User A generates referral code (auto on signup)
-- 2. User B signs up with User A's code → user_referrals record created
-- 3. User B makes first deposit → referral_bonuses record created (locked)
-- 4. User A plays and completes wagering (30% of User B's deposit)
-- 5. Referral bonus credited to User A's balance
-- ============================================================================

-- ============================================================================
-- DIAGNOSTIC: Run these first to see current state
-- ============================================================================

-- Check users without referral codes
SELECT 'Users without referral codes' as diagnostic,
  COUNT(*) as count
FROM users WHERE referral_code_generated IS NULL OR referral_code_generated = '';

-- Check referral relationships
SELECT 'Referral relationships' as diagnostic,
  COUNT(*) as total,
  COUNT(CASE WHEN deposit_amount > 0 THEN 1 END) as with_deposit,
  COUNT(CASE WHEN bonus_applied THEN 1 END) as bonus_applied
FROM user_referrals;

-- Check referral bonuses status
SELECT 'Referral bonuses by status' as diagnostic,
  status, COUNT(*) as count, SUM(bonus_amount) as total_amount
FROM referral_bonuses
GROUP BY status;

-- Check orphaned referrals (referrer doesn't exist)
SELECT 'Orphaned referrals' as diagnostic,
  COUNT(*) as count
FROM user_referrals ur
LEFT JOIN users u ON ur.referrer_user_id = u.id
WHERE u.id IS NULL;

-- ============================================================================
-- START FIX
-- ============================================================================

BEGIN;

-- ============================================================================
-- STEP 1: ENSURE CORRECT TABLE SCHEMAS
-- ============================================================================

-- 1.1 Fix users table - ensure referral columns exist
ALTER TABLE users ADD COLUMN IF NOT EXISTS referral_code TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS referral_code_generated TEXT;

-- Create unique index on referral_code_generated
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_referral_code_generated 
ON users(referral_code_generated) WHERE referral_code_generated IS NOT NULL;

-- 1.2 Fix user_referrals table
CREATE TABLE IF NOT EXISTS user_referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  referred_user_id TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  deposit_amount NUMERIC(15, 2) DEFAULT 0,
  bonus_amount NUMERIC(15, 2) DEFAULT 0,
  bonus_applied BOOLEAN DEFAULT false,
  bonus_applied_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add missing columns if they don't exist
ALTER TABLE user_referrals ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_referrals_referrer ON user_referrals(referrer_user_id);
CREATE INDEX IF NOT EXISTS idx_user_referrals_referred ON user_referrals(referred_user_id);
CREATE INDEX IF NOT EXISTS idx_user_referrals_bonus_applied ON user_referrals(bonus_applied);

-- 1.3 Fix referral_bonuses table
CREATE TABLE IF NOT EXISTS referral_bonuses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  referred_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  referral_id UUID REFERENCES user_referrals(id),
  deposit_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
  bonus_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
  bonus_percentage NUMERIC(5, 2) DEFAULT 5.00,
  wagering_required NUMERIC(15, 2) DEFAULT 0,
  wagering_completed NUMERIC(15, 2) DEFAULT 0,
  status TEXT DEFAULT 'locked' CHECK (status IN ('locked', 'unlocked', 'credited', 'expired', 'forfeited')),
  credited_at TIMESTAMP WITH TIME ZONE,
  expired_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add missing columns
ALTER TABLE referral_bonuses ADD COLUMN IF NOT EXISTS wagering_required NUMERIC(15, 2) DEFAULT 0;
ALTER TABLE referral_bonuses ADD COLUMN IF NOT EXISTS wagering_completed NUMERIC(15, 2) DEFAULT 0;
ALTER TABLE referral_bonuses ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Update status constraint if needed (drop and recreate)
ALTER TABLE referral_bonuses DROP CONSTRAINT IF EXISTS referral_bonuses_status_check;
ALTER TABLE referral_bonuses ADD CONSTRAINT referral_bonuses_status_check 
  CHECK (status IN ('pending', 'locked', 'unlocked', 'credited', 'expired', 'forfeited'));

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_referral_bonuses_referrer ON referral_bonuses(referrer_user_id);
CREATE INDEX IF NOT EXISTS idx_referral_bonuses_referred ON referral_bonuses(referred_user_id);
CREATE INDEX IF NOT EXISTS idx_referral_bonuses_status ON referral_bonuses(status);
CREATE INDEX IF NOT EXISTS idx_referral_bonuses_referrer_status ON referral_bonuses(referrer_user_id, status);

-- ============================================================================
-- STEP 2: CREATE/UPDATE FUNCTIONS
-- ============================================================================

-- 2.1 Function to generate unique referral code
CREATE OR REPLACE FUNCTION generate_referral_code()
RETURNS TEXT AS $$
DECLARE
  new_code TEXT;
  code_exists BOOLEAN;
BEGIN
  LOOP
    -- Generate 8-character alphanumeric code
    new_code := UPPER(SUBSTRING(MD5(RANDOM()::TEXT || CLOCK_TIMESTAMP()::TEXT) FROM 1 FOR 8));
    
    -- Check if code exists
    SELECT EXISTS(SELECT 1 FROM users WHERE referral_code_generated = new_code) INTO code_exists;
    
    -- Exit loop if code is unique
    EXIT WHEN NOT code_exists;
  END LOOP;
  
  RETURN new_code;
END;
$$ LANGUAGE plpgsql;

-- 2.2 Function to auto-generate referral code on user creation
CREATE OR REPLACE FUNCTION auto_generate_referral_code()
RETURNS TRIGGER AS $$
BEGIN
  -- Only generate if not already set
  IF NEW.referral_code_generated IS NULL OR NEW.referral_code_generated = '' THEN
    NEW.referral_code_generated := generate_referral_code();
    RAISE NOTICE 'Generated referral code % for user %', NEW.referral_code_generated, NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2.3 Create trigger for auto-generating referral codes
DROP TRIGGER IF EXISTS trigger_auto_generate_referral_code ON users;
CREATE TRIGGER trigger_auto_generate_referral_code
  BEFORE INSERT ON users
  FOR EACH ROW
  EXECUTE FUNCTION auto_generate_referral_code();

-- 2.4 Function to track referral relationship when user signs up with referral code
CREATE OR REPLACE FUNCTION track_referral_on_signup()
RETURNS TRIGGER AS $$
DECLARE
  referrer_id TEXT;
BEGIN
  -- Only process if user has a referral_code (used during signup)
  IF NEW.referral_code IS NOT NULL AND NEW.referral_code != '' THEN
    -- Find the referrer
    SELECT id INTO referrer_id FROM users WHERE referral_code_generated = NEW.referral_code;
    
    IF referrer_id IS NOT NULL AND referrer_id != NEW.id THEN
      -- Create referral relationship (without bonus yet - bonus comes after first deposit)
      INSERT INTO user_referrals (referrer_user_id, referred_user_id, deposit_amount, bonus_amount, bonus_applied)
      VALUES (referrer_id, NEW.id, 0, 0, false)
      ON CONFLICT (referred_user_id) DO NOTHING;
      
      RAISE NOTICE 'Tracked referral: % referred by %', NEW.id, referrer_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2.5 Create trigger for tracking referrals on signup
DROP TRIGGER IF EXISTS trigger_track_referral_on_signup ON users;
CREATE TRIGGER trigger_track_referral_on_signup
  AFTER INSERT ON users
  FOR EACH ROW
  EXECUTE FUNCTION track_referral_on_signup();

-- 2.6 Function to apply referral bonus when first deposit is approved
CREATE OR REPLACE FUNCTION apply_referral_bonus_on_deposit()
RETURNS TRIGGER AS $$
DECLARE
  referral_record RECORD;
  referrer_id TEXT;
  bonus_percent NUMERIC;
  bonus_amount NUMERIC;
  wagering_mult NUMERIC;
  wagering_req NUMERIC;
BEGIN
  -- Only process approved deposits
  IF NEW.status = 'approved' AND NEW.request_type = 'deposit' AND 
     (OLD.status IS NULL OR OLD.status != 'approved') THEN
    
    -- Check if user has a referral relationship
    SELECT * INTO referral_record FROM user_referrals 
    WHERE referred_user_id = NEW.user_id AND bonus_applied = false;
    
    IF referral_record IS NOT NULL THEN
      -- Get referral bonus settings
      SELECT COALESCE(setting_value::NUMERIC, 5) INTO bonus_percent 
      FROM game_settings WHERE setting_key = 'referral_bonus_percent';
      
      SELECT COALESCE(setting_value::NUMERIC, 0.3) INTO wagering_mult 
      FROM game_settings WHERE setting_key = 'referral_wagering_multiplier';
      
      -- Calculate bonus (5% of deposit)
      bonus_amount := NEW.amount * (bonus_percent / 100);
      
      -- Calculate wagering requirement (30% of deposit)
      wagering_req := NEW.amount * wagering_mult;
      
      -- Update user_referrals with deposit info
      UPDATE user_referrals
      SET deposit_amount = NEW.amount,
          bonus_amount = bonus_amount,
          bonus_applied = false, -- Will be true when wagering complete
          updated_at = NOW()
      WHERE id = referral_record.id;
      
      -- Create referral_bonus record (locked until wagering complete)
      INSERT INTO referral_bonuses (
        referrer_user_id, referred_user_id, referral_id,
        deposit_amount, bonus_amount, bonus_percentage,
        wagering_required, wagering_completed, status
      ) VALUES (
        referral_record.referrer_user_id, NEW.user_id, referral_record.id,
        NEW.amount, bonus_amount, bonus_percent,
        wagering_req, 0, 'locked'
      );
      
      RAISE NOTICE 'Created referral bonus: ₹% for referrer % (wagering req: ₹%)', 
        bonus_amount, referral_record.referrer_user_id, wagering_req;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2.7 Create trigger for applying referral bonus on deposit
DROP TRIGGER IF EXISTS trigger_apply_referral_bonus_on_deposit ON payment_requests;
CREATE TRIGGER trigger_apply_referral_bonus_on_deposit
  AFTER UPDATE ON payment_requests
  FOR EACH ROW
  EXECUTE FUNCTION apply_referral_bonus_on_deposit();

-- 2.8 Function to update referral bonus wagering
CREATE OR REPLACE FUNCTION update_referral_bonus_wagering(
  p_user_id TEXT,
  p_bet_amount NUMERIC
)
RETURNS VOID AS $$
DECLARE
  bonus_record RECORD;
  new_completed NUMERIC;
BEGIN
  -- Find locked referral bonuses for this referrer (FIFO order)
  FOR bonus_record IN 
    SELECT * FROM referral_bonuses 
    WHERE referrer_user_id = p_user_id AND status = 'locked'
    ORDER BY created_at ASC
  LOOP
    -- Update wagering completed
    new_completed := bonus_record.wagering_completed + p_bet_amount;
    
    UPDATE referral_bonuses
    SET wagering_completed = new_completed,
        updated_at = NOW()
    WHERE id = bonus_record.id;
    
    -- Check if wagering requirement met
    IF new_completed >= bonus_record.wagering_required THEN
      -- Unlock and credit the bonus
      UPDATE referral_bonuses
      SET status = 'credited',
          credited_at = NOW(),
          updated_at = NOW()
      WHERE id = bonus_record.id;
      
      -- Add bonus to referrer's balance
      UPDATE users
      SET balance = balance + bonus_record.bonus_amount,
          referral_bonus_available = COALESCE(referral_bonus_available::NUMERIC, 0) + bonus_record.bonus_amount,
          total_bonus_earned = COALESCE(total_bonus_earned::NUMERIC, 0) + bonus_record.bonus_amount,
          updated_at = NOW()
      WHERE id = p_user_id;
      
      -- Mark user_referrals as bonus applied
      UPDATE user_referrals
      SET bonus_applied = true,
          bonus_applied_at = NOW(),
          updated_at = NOW()
      WHERE id = bonus_record.referral_id;
      
      RAISE NOTICE 'Credited referral bonus ₹% to user %', bonus_record.bonus_amount, p_user_id;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 2.9 Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_referral_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
DROP TRIGGER IF EXISTS trigger_user_referrals_updated_at ON user_referrals;
CREATE TRIGGER trigger_user_referrals_updated_at
  BEFORE UPDATE ON user_referrals
  FOR EACH ROW
  EXECUTE FUNCTION update_referral_updated_at();

DROP TRIGGER IF EXISTS trigger_referral_bonuses_updated_at ON referral_bonuses;
CREATE TRIGGER trigger_referral_bonuses_updated_at
  BEFORE UPDATE ON referral_bonuses
  FOR EACH ROW
  EXECUTE FUNCTION update_referral_updated_at();

-- ============================================================================
-- STEP 3: ENSURE REFERRAL SETTINGS EXIST
-- ============================================================================

INSERT INTO game_settings (setting_key, setting_value, description)
VALUES 
  ('referral_bonus_percent', '5', 'Referral bonus percentage (5% of referred user deposit)'),
  ('referral_wagering_multiplier', '0.3', 'Wagering requirement for referral bonus (30% of deposit)'),
  ('min_deposit_for_referral', '500', 'Minimum deposit amount to qualify for referral bonus'),
  ('max_referrals_per_month', '50', 'Maximum referrals per user per month')
ON CONFLICT (setting_key) DO UPDATE SET 
  setting_value = EXCLUDED.setting_value,
  description = EXCLUDED.description;

-- ============================================================================
-- STEP 4: FIX EXISTING DATA
-- ============================================================================

-- 4.1 Generate missing referral codes for existing users
UPDATE users
SET referral_code_generated = generate_referral_code()
WHERE referral_code_generated IS NULL OR referral_code_generated = '';

-- 4.2 Fix referral_bonuses wagering (30% of deposit)
UPDATE referral_bonuses
SET wagering_required = deposit_amount * 0.3,
    updated_at = NOW()
WHERE wagering_required = 0 OR wagering_required IS NULL;

-- 4.3 Auto-credit referral bonuses that have met wagering requirement
UPDATE referral_bonuses
SET status = 'credited',
    credited_at = NOW(),
    updated_at = NOW()
WHERE status = 'locked' AND wagering_completed >= wagering_required;

-- 4.4 Credit those bonuses to user balances
UPDATE users u
SET balance = balance + rb.bonus_amount,
    referral_bonus_available = COALESCE(referral_bonus_available::NUMERIC, 0) + rb.bonus_amount,
    total_bonus_earned = COALESCE(total_bonus_earned::NUMERIC, 0) + rb.bonus_amount,
    updated_at = NOW()
FROM referral_bonuses rb
WHERE u.id = rb.referrer_user_id
  AND rb.status = 'credited'
  AND rb.credited_at >= NOW() - INTERVAL '1 minute'; -- Only just-credited ones

-- 4.5 Update user_referrals bonus_applied status
UPDATE user_referrals ur
SET bonus_applied = true,
    bonus_applied_at = NOW(),
    updated_at = NOW()
FROM referral_bonuses rb
WHERE ur.id = rb.referral_id
  AND rb.status = 'credited'
  AND ur.bonus_applied = false;

-- ============================================================================
-- STEP 5: CREATE HELPFUL VIEWS
-- ============================================================================

-- 5.1 View for referral summary per user
CREATE OR REPLACE VIEW v_user_referral_summary AS
SELECT 
  u.id as user_id,
  u.phone,
  u.full_name,
  u.referral_code_generated as my_referral_code,
  u.referral_code as used_referral_code,
  
  -- Referrals made (as referrer)
  COALESCE(ref_stats.total_referrals, 0) as total_referrals,
  COALESCE(ref_stats.referrals_with_deposit, 0) as referrals_with_deposit,
  COALESCE(ref_stats.total_bonus_earned, 0) as total_referral_bonus_earned,
  COALESCE(ref_stats.pending_bonus, 0) as pending_referral_bonus,
  
  -- Referral bonuses status
  COALESCE(bonus_stats.locked_bonuses, 0) as locked_referral_bonuses,
  COALESCE(bonus_stats.credited_bonuses, 0) as credited_referral_bonuses
  
FROM users u
LEFT JOIN (
  SELECT 
    referrer_user_id,
    COUNT(*) as total_referrals,
    COUNT(CASE WHEN deposit_amount > 0 THEN 1 END) as referrals_with_deposit,
    SUM(CASE WHEN bonus_applied THEN bonus_amount ELSE 0 END) as total_bonus_earned,
    SUM(CASE WHEN NOT bonus_applied AND deposit_amount > 0 THEN bonus_amount ELSE 0 END) as pending_bonus
  FROM user_referrals
  GROUP BY referrer_user_id
) ref_stats ON u.id = ref_stats.referrer_user_id
LEFT JOIN (
  SELECT 
    referrer_user_id,
    COUNT(CASE WHEN status = 'locked' THEN 1 END) as locked_bonuses,
    COUNT(CASE WHEN status = 'credited' THEN 1 END) as credited_bonuses
  FROM referral_bonuses
  GROUP BY referrer_user_id
) bonus_stats ON u.id = bonus_stats.referrer_user_id;

-- 5.2 View for detailed referral tracking
CREATE OR REPLACE VIEW v_referral_details AS
SELECT 
  ur.id as referral_id,
  ur.referrer_user_id,
  referrer.phone as referrer_phone,
  referrer.full_name as referrer_name,
  ur.referred_user_id,
  referred.phone as referred_phone,
  referred.full_name as referred_name,
  ur.deposit_amount,
  ur.bonus_amount,
  ur.bonus_applied,
  ur.bonus_applied_at,
  ur.created_at as referral_created_at,
  
  -- Bonus status from referral_bonuses
  rb.status as bonus_status,
  rb.wagering_required,
  rb.wagering_completed,
  CASE 
    WHEN rb.wagering_required > 0 
    THEN ROUND((rb.wagering_completed / rb.wagering_required) * 100, 2)
    ELSE 0 
  END as wagering_progress_percent,
  rb.credited_at as bonus_credited_at
  
FROM user_referrals ur
JOIN users referrer ON ur.referrer_user_id = referrer.id
JOIN users referred ON ur.referred_user_id = referred.id
LEFT JOIN referral_bonuses rb ON ur.id = rb.referral_id;

-- ============================================================================
-- STEP 6: VERIFICATION QUERIES
-- ============================================================================

SELECT '=== REFERRAL SYSTEM FIX COMPLETE ===' as status;

-- Check users with referral codes
SELECT 'Users with referral codes' as check_name,
  COUNT(*) as total_users,
  COUNT(referral_code_generated) as with_referral_code,
  COUNT(*) - COUNT(referral_code_generated) as missing_code
FROM users;

-- Check referral relationships
SELECT 'Referral relationships' as check_name,
  COUNT(*) as total_referrals,
  COUNT(CASE WHEN deposit_amount > 0 THEN 1 END) as with_deposit,
  COUNT(CASE WHEN bonus_applied THEN 1 END) as bonus_applied
FROM user_referrals;

-- Check referral bonuses
SELECT 'Referral bonuses' as check_name,
  COUNT(*) as total,
  COUNT(CASE WHEN status = 'locked' THEN 1 END) as locked,
  COUNT(CASE WHEN status = 'credited' THEN 1 END) as credited,
  SUM(bonus_amount) as total_bonus_amount
FROM referral_bonuses;

-- Check settings
SELECT 'Referral settings' as check_name, setting_key, setting_value 
FROM game_settings 
WHERE setting_key LIKE '%referral%';

COMMIT;

SELECT '✅ REFERRAL SYSTEM FIX COMPLETE!' as status, NOW() as completed_at;
