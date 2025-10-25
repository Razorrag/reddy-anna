-- Add bonus and referral system to Andar Bahar game
-- This migration adds support for deposit bonuses, referral bonuses, and conditional bonuses

-- Add new columns to users table for bonus tracking
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS deposit_bonus_available DECIMAL(15,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS referral_bonus_available DECIMAL(15,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS original_deposit_amount DECIMAL(15,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS total_bonus_earned DECIMAL(15,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS referral_code_generated VARCHAR(10) UNIQUE;

-- Create user_referrals table to track referral relationships
CREATE TABLE IF NOT EXISTS user_referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_user_id VARCHAR(20) NOT NULL,
  referred_user_id VARCHAR(20) NOT NULL,
  deposit_amount DECIMAL(15,2),
  bonus_amount DECIMAL(15,2),
  bonus_applied BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  bonus_applied_at TIMESTAMP WITH TIME ZONE,
  FOREIGN KEY (referrer_user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (referred_user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(referred_user_id)
);

-- Add bonus settings to game_settings table
INSERT INTO game_settings (setting_key, setting_value, description) VALUES
('default_deposit_bonus_percent', '5', 'Default deposit bonus percentage'),
('referral_bonus_percent', '1', 'Referral bonus percentage'),
('conditional_bonus_threshold', '30', 'Threshold for conditional bonus (30 means 70/130%)')
ON CONFLICT (setting_key) DO NOTHING;

-- Create user_transactions table for tracking all transactions
CREATE TABLE IF NOT EXISTS user_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(20) NOT NULL,
  transaction_type VARCHAR(20) NOT NULL, -- 'deposit', 'withdrawal', 'bet', 'win', 'loss', 'bonus', 'bonus_applied'
  amount DECIMAL(15,2) NOT NULL,
  balance_before DECIMAL(15,2) NOT NULL,
  balance_after DECIMAL(15,2) NOT NULL,
  reference_id VARCHAR(100),
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_user_transactions_user_id ON user_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_transactions_type ON user_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_user_transactions_created_at ON user_transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_user_referrals_referrer ON user_referrals(referrer_user_id);
CREATE INDEX IF NOT EXISTS idx_user_referrals_referred ON user_referrals(referred_user_id);

-- Function to generate unique referral codes
CREATE OR REPLACE FUNCTION generate_referral_code()
RETURNS TEXT AS $$
DECLARE
  code TEXT;
  code_exists BOOLEAN;
BEGIN
  LOOP
    -- Generate 6-character alphanumeric code
    code := upper(substring(encode(gen_random_bytes(6), 'hex'), 1, 6));
    
    -- Check if code already exists
    SELECT EXISTS(SELECT 1 FROM users WHERE referral_code_generated = code) INTO code_exists;
    
    IF NOT code_exists THEN
      EXIT;
    END IF;
  END LOOP;
  
  RETURN code;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically generate referral code for new users
CREATE OR REPLACE FUNCTION generate_referral_code_trigger()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.referral_code_generated IS NULL OR NEW.referral_code_generated = '' THEN
    NEW.referral_code_generated := generate_referral_code();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic referral code generation
DROP TRIGGER IF EXISTS auto_generate_referral_code ON users;
CREATE TRIGGER auto_generate_referral_code
  BEFORE INSERT ON users
  FOR EACH ROW
  EXECUTE FUNCTION generate_referral_code_trigger();

-- Function to check and apply conditional bonus
CREATE OR REPLACE FUNCTION check_conditional_bonus(user_id_param VARCHAR)
RETURNS BOOLEAN AS $$
DECLARE
  user_record RECORD;
  threshold DECIMAL;
  upper_threshold DECIMAL;
  lower_threshold DECIMAL;
  current_balance DECIMAL;
  original_deposit DECIMAL;
  total_available_bonus DECIMAL;
BEGIN
  -- Get user data
  SELECT * INTO user_record FROM users WHERE id = user_id_param;
  
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- Get threshold from settings
  SELECT CAST(setting_value AS DECIMAL) INTO threshold 
  FROM game_settings 
  WHERE setting_key = 'conditional_bonus_threshold';
  
  IF threshold IS NULL THEN
    threshold := 30; -- Default threshold
  END IF;
  
  -- Get values
  current_balance := CAST(user_record.balance AS DECIMAL);
  original_deposit := CAST(user_record.original_deposit_amount AS DECIMAL);
  total_available_bonus := COALESCE(CAST(user_record.deposit_bonus_available AS DECIMAL), 0) + 
                         COALESCE(CAST(user_record.referral_bonus_available AS DECIMAL), 0);
  
  -- Skip if no original deposit or no available bonus
  IF original_deposit = 0 OR total_available_bonus = 0 THEN
    RETURN FALSE;
  END IF;
  
  -- Calculate thresholds
  upper_threshold := original_deposit * (1 + (threshold / 100));
  lower_threshold := original_deposit * (1 - (threshold / 100));
  
  -- Check if balance is outside threshold range
  IF current_balance >= upper_threshold OR current_balance <= lower_threshold THEN
    -- Apply bonus to main balance
    UPDATE users SET
      balance = CAST(balance AS DECIMAL) + total_available_bonus,
      deposit_bonus_available = 0,
      referral_bonus_available = 0,
      total_bonus_earned = COALESCE(CAST(total_bonus_earned AS DECIMAL), 0) + total_available_bonus,
      updated_at = NOW()
    WHERE id = user_id_param;
    
    -- Add transaction record
    INSERT INTO user_transactions (
      user_id, transaction_type, amount, balance_before, balance_after, description
    ) VALUES (
      user_id_param, 
      'bonus_applied', 
      total_available_bonus, 
      current_balance, 
      current_balance + total_available_bonus,
      'Conditional bonus applied (balance outside ' || (100 - threshold) || '%-' || (100 + threshold) || '% range)'
    );
    
    RETURN TRUE;
  END IF;
  
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- Function to apply available bonus to main balance
CREATE OR REPLACE FUNCTION apply_available_bonus(user_id_param VARCHAR)
RETURNS BOOLEAN AS $$
DECLARE
  user_record RECORD;
  current_balance DECIMAL;
  total_available_bonus DECIMAL;
BEGIN
  -- Get user data
  SELECT * INTO user_record FROM users WHERE id = user_id_param;
  
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- Get values
  current_balance := CAST(user_record.balance AS DECIMAL);
  total_available_bonus := COALESCE(CAST(user_record.deposit_bonus_available AS DECIMAL), 0) + 
                         COALESCE(CAST(user_record.referral_bonus_available AS DECIMAL), 0);
  
  -- Skip if no available bonus
  IF total_available_bonus = 0 THEN
    RETURN FALSE;
  END IF;
  
  -- Apply bonus to main balance
  UPDATE users SET
    balance = CAST(balance AS DECIMAL) + total_available_bonus,
    deposit_bonus_available = 0,
    referral_bonus_available = 0,
    total_bonus_earned = COALESCE(CAST(total_bonus_earned AS DECIMAL), 0) + total_available_bonus,
    updated_at = NOW()
  WHERE id = user_id_param;
  
  -- Add transaction record
  INSERT INTO user_transactions (
    user_id, transaction_type, amount, balance_before, balance_after, description
  ) VALUES (
    user_id_param, 
    'bonus_applied', 
    total_available_bonus, 
    current_balance, 
    current_balance + total_available_bonus,
    'Bonus applied to main balance'
  );
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Generate referral codes for existing users
UPDATE users SET referral_code_generated = generate_referral_code() 
WHERE referral_code_generated IS NULL OR referral_code_generated = '';

-- Add comments for documentation
COMMENT ON COLUMN users.deposit_bonus_available IS 'Available deposit bonus amount that can be claimed';
COMMENT ON COLUMN users.referral_bonus_available IS 'Available referral bonus amount that can be claimed';
COMMENT ON COLUMN users.original_deposit_amount IS 'Original deposit amount for conditional bonus calculation';
COMMENT ON COLUMN users.total_bonus_earned IS 'Total bonus amount earned by user';
COMMENT ON COLUMN users.referral_code_generated IS 'Unique referral code generated for user';
COMMENT ON TABLE user_referrals IS 'Tracks referral relationships between users';
COMMENT ON TABLE user_transactions IS 'Tracks all user transactions including deposits, withdrawals, bets, wins, and bonuses';