-- ============================================
-- RAJU GARI KOSSU - COMPLETE DATABASE RESET & RECREATION SCRIPT
-- ============================================
-- This script completely drops all database objects and recreates everything from scratch
-- ⚠️  WARNING: THIS WILL DELETE ALL DATA PERMANENTLY!
-- ============================================

-- ============================================
-- STEP 1: DROP ALL EXISTING TABLES (in correct order due to foreign keys)
-- ============================================

-- Disable foreign key checks temporarily
SET session_replication_role = 'replica';

-- Drop all tables that have foreign key dependencies first
DROP TABLE IF EXISTS request_audit CASCADE;
DROP TABLE IF EXISTS whatsapp_messages CASCADE;
DROP TABLE IF EXISTS admin_requests CASCADE;
DROP TABLE IF EXISTS user_creation_log CASCADE;
DROP TABLE IF EXISTS blocked_users CASCADE;
DROP TABLE IF EXISTS user_referrals CASCADE;
DROP TABLE IF EXISTS user_transactions CASCADE;
DROP TABLE IF EXISTS payment_requests CASCADE;
DROP TABLE IF EXISTS game_statistics CASCADE;
DROP TABLE IF EXISTS daily_game_statistics CASCADE;
DROP TABLE IF EXISTS monthly_game_statistics CASCADE;
DROP TABLE IF EXISTS yearly_game_statistics CASCADE;
DROP TABLE IF EXISTS dealt_cards CASCADE;
DROP TABLE IF EXISTS player_bets CASCADE;
DROP TABLE IF EXISTS game_history CASCADE;
DROP TABLE IF EXISTS game_sessions CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS admin_credentials CASCADE;
DROP TABLE IF EXISTS game_settings CASCADE;
DROP TABLE IF EXISTS stream_settings CASCADE;
DROP TABLE IF EXISTS stream_config CASCADE;
DROP TABLE IF EXISTS admin_dashboard_settings CASCADE;

-- Re-enable foreign key checks
SET session_replication_role = 'origin';

-- ============================================
-- STEP 2: DROP ALL VIEWS
-- ============================================

DROP VIEW IF EXISTS admin_requests_summary CASCADE;

-- ============================================
-- STEP 3: DROP ALL FUNCTIONS
-- ============================================

DROP FUNCTION IF EXISTS update_request_status(UUID, VARCHAR, request_status, TEXT) CASCADE;
DROP FUNCTION IF EXISTS update_balance_with_request(UUID, VARCHAR, request_status, TEXT) CASCADE;
DROP FUNCTION IF EXISTS generate_referral_code(TEXT) CASCADE;
DROP FUNCTION IF EXISTS update_balance_atomic(TEXT, NUMERIC) CASCADE;

-- ============================================
-- STEP 4: DROP ALL CUSTOM TYPES (ENUMS)
-- ============================================

DROP TYPE IF EXISTS user_role CASCADE;
DROP TYPE IF EXISTS user_status CASCADE;
DROP TYPE IF EXISTS game_phase CASCADE;
DROP TYPE IF EXISTS game_status CASCADE;
DROP TYPE IF EXISTS bet_side CASCADE;
DROP TYPE IF EXISTS transaction_type CASCADE;
DROP TYPE IF EXISTS transaction_status CASCADE;
DROP TYPE IF EXISTS request_status CASCADE;

-- ============================================
-- STEP 5: RECREATE EVERYTHING FROM COMPREHENSIVE SCHEMA
-- ============================================
-- Now run the comprehensive_db_schema.sql file
-- This section includes all the schema definitions

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- ENUM TYPES FOR DATA INTEGRITY
-- ============================================

CREATE TYPE user_role AS ENUM ('player', 'admin', 'super_admin');
CREATE TYPE user_status AS ENUM ('active', 'suspended', 'banned', 'inactive');
CREATE TYPE game_phase AS ENUM ('idle', 'betting', 'dealing', 'complete');
CREATE TYPE game_status AS ENUM ('active', 'completed', 'cancelled');
CREATE TYPE bet_side AS ENUM ('andar', 'bahar');
CREATE TYPE transaction_type AS ENUM ('deposit', 'withdrawal', 'bet', 'win', 'refund', 'bonus', 'commission', 'support');
CREATE TYPE transaction_status AS ENUM ('pending', 'completed', 'failed', 'cancelled');
CREATE TYPE request_status AS ENUM ('pending', 'approved', 'rejected', 'processing', 'processed', 'completed');

-- ============================================
-- CORE TABLES
-- ============================================

-- Users table (phone-based authentication)
CREATE TABLE users (
  id VARCHAR(20) PRIMARY KEY,
  phone VARCHAR(15) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  full_name TEXT,
  role user_role DEFAULT 'player',
  status user_status DEFAULT 'active',
  balance DECIMAL(15, 2) NOT NULL DEFAULT '0.00',
  total_winnings DECIMAL(15, 2) DEFAULT '0.00',
  total_losses DECIMAL(15, 2) DEFAULT '0.00',
  games_played INTEGER DEFAULT 0,
  games_won INTEGER DEFAULT 0,
  phone_verified BOOLEAN DEFAULT false,
  referral_code VARCHAR(50),
  referral_code_generated VARCHAR(50),
  deposit_bonus_available DECIMAL(15, 2) DEFAULT '0.00',
  referral_bonus_available DECIMAL(15, 2) DEFAULT '0.00',
  original_deposit_amount DECIMAL(15, 2) DEFAULT '0.00',
  total_bonus_earned DECIMAL(15, 2) DEFAULT '0.00',
  last_login TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Performance indexes for frequent queries
CREATE INDEX idx_users_created_at ON users(created_at DESC);
CREATE INDEX idx_users_balance ON users(balance);
CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_users_referral_code_generated ON users(referral_code_generated);
CREATE INDEX idx_users_status ON users(status);

-- Admin credentials table
CREATE TABLE admin_credentials (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  username VARCHAR(50) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role user_role DEFAULT 'admin',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_admin_credentials_username ON admin_credentials(username);

-- Game settings table
CREATE TABLE game_settings (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  setting_key VARCHAR(100) NOT NULL UNIQUE,
  setting_value TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Game sessions table
CREATE TABLE game_sessions (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  game_id VARCHAR(36) NOT NULL UNIQUE,
  opening_card TEXT,
  phase game_phase NOT NULL DEFAULT 'idle',
  status game_status NOT NULL DEFAULT 'active',
  current_timer INTEGER DEFAULT 30,
  current_round INTEGER DEFAULT 1,
  andar_cards TEXT[] DEFAULT ARRAY[]::TEXT[],
  bahar_cards TEXT[] DEFAULT ARRAY[]::TEXT[],
  winner bet_side,
  winning_card TEXT,
  winning_round INTEGER,
  total_andar_bets DECIMAL(15, 2) DEFAULT '0.00',
  total_bahar_bets DECIMAL(15, 2) DEFAULT '0.00',
  total_payouts DECIMAL(15, 2) DEFAULT '0.00',
  started_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_game_sessions_game_id ON game_sessions(game_id);
CREATE INDEX idx_game_sessions_status ON game_sessions(status);

-- Player bets table
CREATE TABLE player_bets (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id VARCHAR(20) NOT NULL,
  game_id VARCHAR(36) NOT NULL,
  round INTEGER DEFAULT 1,
  side bet_side NOT NULL,
  amount DECIMAL(15, 2) NOT NULL,
  status transaction_status DEFAULT 'pending',
  payout DECIMAL(15, 2) DEFAULT '0.00',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT fk_player_bets_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_player_bets_game FOREIGN KEY (game_id) REFERENCES game_sessions(id) ON DELETE CASCADE
);

CREATE INDEX idx_player_bets_user_id ON player_bets(user_id);
CREATE INDEX idx_player_bets_game_id ON player_bets(game_id);
CREATE INDEX idx_player_bets_created_at ON player_bets(created_at DESC);

-- Dealt cards table
CREATE TABLE dealt_cards (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  game_id VARCHAR(36) NOT NULL,
  card TEXT NOT NULL,
  side bet_side NOT NULL,
  position INTEGER NOT NULL,
  is_winning_card BOOLEAN DEFAULT false,
  dealt_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT fk_dealt_cards_game FOREIGN KEY (game_id) REFERENCES game_sessions(id) ON DELETE CASCADE
);

CREATE INDEX idx_dealt_cards_game_id ON dealt_cards(game_id);

-- Game history table
CREATE TABLE game_history (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  game_id VARCHAR(36) NOT NULL,
  opening_card TEXT,
  winner bet_side,
  winning_card TEXT,
  winning_round INTEGER,
  total_cards INTEGER DEFAULT 0,
  total_bets DECIMAL(15, 2) DEFAULT '0.00',
  total_payouts DECIMAL(15, 2) DEFAULT '0.00',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT fk_game_history_game FOREIGN KEY (game_id) REFERENCES game_sessions(id) ON DELETE CASCADE
);

CREATE INDEX idx_game_history_created_at ON game_history(created_at DESC);

-- Game statistics table
CREATE TABLE game_statistics (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  game_id VARCHAR(36) NOT NULL,
  total_players INTEGER DEFAULT 0,
  total_bets DECIMAL(15, 2) DEFAULT '0.00',
  total_winnings DECIMAL(15, 2) DEFAULT '0.00',
  house_earnings DECIMAL(15, 2) DEFAULT '0.00',
  andar_bets_count INTEGER DEFAULT 0,
  bahar_bets_count INTEGER DEFAULT 0,
  andar_total_bet DECIMAL(15, 2) DEFAULT '0.00',
  bahar_total_bet DECIMAL(15, 2) DEFAULT '0.00',
  profit_loss DECIMAL(15, 2) DEFAULT '0.00',
  profit_loss_percentage DECIMAL(5, 2) DEFAULT '0.00',
  house_payout DECIMAL(15, 2) DEFAULT '0.00',
  game_duration INTEGER DEFAULT 0,
  unique_players INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT fk_game_statistics_game FOREIGN KEY (game_id) REFERENCES game_sessions(id) ON DELETE CASCADE
);

-- Daily game statistics table
CREATE TABLE daily_game_statistics (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  date DATE NOT NULL UNIQUE,
  total_games INTEGER DEFAULT 0,
  total_bets DECIMAL(15, 2) DEFAULT '0.00',
  total_payouts DECIMAL(15, 2) DEFAULT '0.00',
  total_revenue DECIMAL(15, 2) DEFAULT '0.00',
  profit_loss DECIMAL(15, 2) DEFAULT '0.00',
  profit_loss_percentage DECIMAL(5, 2) DEFAULT '0.00',
  unique_players INTEGER DEFAULT 0,
  peak_bets_hour INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Monthly game statistics table
CREATE TABLE monthly_game_statistics (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  month_year VARCHAR(7) NOT NULL UNIQUE,
  total_games INTEGER DEFAULT 0,
  total_bets DECIMAL(15, 2) DEFAULT '0.00',
  total_payouts DECIMAL(15, 2) DEFAULT '0.00',
  total_revenue DECIMAL(15, 2) DEFAULT '0.00',
  profit_loss DECIMAL(15, 2) DEFAULT '0.00',
  profit_loss_percentage DECIMAL(5, 2) DEFAULT '0.00',
  unique_players INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Yearly game statistics table
CREATE TABLE yearly_game_statistics (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  year INTEGER NOT NULL UNIQUE,
  total_games INTEGER DEFAULT 0,
  total_bets DECIMAL(15, 2) DEFAULT '0.00',
  total_payouts DECIMAL(15, 2) DEFAULT '0.00',
  total_revenue DECIMAL(15, 2) DEFAULT '0.00',
  profit_loss DECIMAL(15, 2) DEFAULT '0.00',
  profit_loss_percentage DECIMAL(5, 2) DEFAULT '0.00',
  unique_players INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User transactions table
CREATE TABLE user_transactions (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id VARCHAR(20) NOT NULL,
  transaction_type transaction_type NOT NULL,
  amount DECIMAL(15, 2) NOT NULL,
  balance_before DECIMAL(15, 2) NOT NULL,
  balance_after DECIMAL(15, 2) NOT NULL,
  status transaction_status DEFAULT 'completed',
  reference_id VARCHAR(100),
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT fk_user_transactions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_user_transactions_user_id ON user_transactions(user_id);
CREATE INDEX idx_user_transactions_created_at ON user_transactions(created_at DESC);

-- Payment requests table
CREATE TABLE payment_requests (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id VARCHAR(20) NOT NULL,
  request_type transaction_type NOT NULL,
  amount DECIMAL(15, 2) NOT NULL,
  payment_method VARCHAR(100),
  utr_number VARCHAR(100),
  status request_status DEFAULT 'pending',
  admin_id VARCHAR(36),
  admin_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processed_at TIMESTAMP WITH TIME ZONE,
  
  CONSTRAINT fk_payment_requests_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_payment_requests_admin FOREIGN KEY (admin_id) REFERENCES admin_credentials(id) ON DELETE SET NULL
);

CREATE INDEX idx_payment_requests_user_id ON payment_requests(user_id);
CREATE INDEX idx_payment_requests_status ON payment_requests(status);
CREATE INDEX idx_payment_requests_created_at ON payment_requests(created_at DESC);

-- User referrals table
CREATE TABLE user_referrals (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  referrer_user_id VARCHAR(20) NOT NULL,
  referred_user_id VARCHAR(20) NOT NULL UNIQUE,
  deposit_amount DECIMAL(15, 2),
  bonus_amount DECIMAL(15, 2),
  bonus_applied BOOLEAN DEFAULT false,
  bonus_applied_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT fk_user_referrals_referrer FOREIGN KEY (referrer_user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_user_referrals_referred FOREIGN KEY (referred_user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_user_referrals_referrer ON user_referrals(referrer_user_id);
CREATE INDEX idx_user_referrals_referred ON user_referrals(referred_user_id);

-- Blocked users table
CREATE TABLE blocked_users (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id VARCHAR(20) NOT NULL,
  reason TEXT,
  blocked_by VARCHAR(36),
  blocked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT fk_blocked_users_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_blocked_users_admin FOREIGN KEY (blocked_by) REFERENCES admin_credentials(id) ON DELETE SET NULL
);

-- Stream settings table
CREATE TABLE stream_settings (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  setting_key VARCHAR(100) NOT NULL UNIQUE,
  setting_value TEXT,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Stream config table
CREATE TABLE stream_config (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  active_method VARCHAR(50) DEFAULT 'youtube',
  rtmp_server_url TEXT,
  rtmp_stream_key TEXT,
  youtube_video_id VARCHAR(100),
  stream_title TEXT,
  stream_status VARCHAR(20) DEFAULT 'offline',
  show_stream BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Admin dashboard settings table
CREATE TABLE admin_dashboard_settings (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  setting_key VARCHAR(100) NOT NULL UNIQUE,
  setting_value TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User creation log table
CREATE TABLE user_creation_log (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  created_by_admin_id VARCHAR(36) NOT NULL,
  user_phone VARCHAR(15) NOT NULL,
  created_user_id VARCHAR(20) NOT NULL,
  initial_balance DECIMAL(15, 2) DEFAULT '0.00',
  created_reason TEXT,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT fk_user_creation_log_admin FOREIGN KEY (created_by_admin_id) REFERENCES admin_credentials(id) ON DELETE CASCADE
);

-- WhatsApp messages table
CREATE TABLE whatsapp_messages (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id VARCHAR(20),
  user_phone VARCHAR(15) NOT NULL,
  admin_phone VARCHAR(15) NOT NULL,
  request_type VARCHAR(50) NOT NULL,
  message TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  priority INTEGER DEFAULT 3,
  is_urgent BOOLEAN DEFAULT false,
  metadata TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  sent_at TIMESTAMP WITH TIME ZONE,
  responded_at TIMESTAMP WITH TIME ZONE,
  response_message TEXT,
  response_by VARCHAR(20),
  request_status request_status DEFAULT 'pending',
  admin_response TEXT,
  admin_id VARCHAR(255),
  balance_updated BOOLEAN DEFAULT false,
  
  CONSTRAINT fk_whatsapp_messages_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Admin requests table
CREATE TABLE admin_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(20),
  user_phone VARCHAR(20) NOT NULL,
  request_type transaction_type NOT NULL,
  amount DECIMAL(15, 2),
  currency VARCHAR(3) DEFAULT 'INR',
  payment_method VARCHAR(50),
  utr_number VARCHAR(100),
  status request_status DEFAULT 'pending',
  priority INTEGER DEFAULT 3 CHECK (priority IN (1, 2, 3)),
  admin_notes TEXT,
  admin_id VARCHAR(36),
  whatsapp_message_id VARCHAR(36),
  balance_updated BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processed_at TIMESTAMP WITH TIME ZONE,
  
  CONSTRAINT fk_admin_requests_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_admin_requests_admin FOREIGN KEY (admin_id) REFERENCES admin_credentials(id) ON DELETE SET NULL
);

CREATE INDEX idx_admin_requests_status ON admin_requests(status);
CREATE INDEX idx_admin_requests_priority ON admin_requests(priority);
CREATE INDEX idx_admin_requests_created_at ON admin_requests(created_at DESC);
CREATE INDEX idx_admin_requests_user_id ON admin_requests(user_id);

-- Request audit table
CREATE TABLE request_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL,
  admin_id VARCHAR(36),
  action VARCHAR(50) NOT NULL,
  old_status request_status,
  new_status request_status,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT fk_request_audit_request FOREIGN KEY (request_id) REFERENCES admin_requests(id) ON DELETE CASCADE,
  CONSTRAINT fk_request_audit_admin FOREIGN KEY (admin_id) REFERENCES admin_credentials(id) ON DELETE SET NULL
);

CREATE INDEX idx_request_audit_request_id ON request_audit(request_id);
CREATE INDEX idx_request_audit_created_at ON request_audit(created_at DESC);

-- ============================================
-- DATABASE FUNCTIONS
-- ============================================

-- Function to generate unique referral code
CREATE OR REPLACE FUNCTION generate_referral_code(p_user_id TEXT)
RETURNS TEXT AS $$
DECLARE
  referral_code TEXT;
  code_exists BOOLEAN;
  temp_code TEXT;
BEGIN
  LOOP
    temp_code := UPPER(SUBSTRING(MD5(RANDOM()::TEXT || p_user_id || NOW()::TEXT) FROM 1 FOR 8));
    
    SELECT EXISTS(
      SELECT 1 FROM users WHERE referral_code_generated = temp_code
    ) INTO code_exists;
    
    IF NOT code_exists THEN
      referral_code := temp_code;
      EXIT;
    END IF;
  END LOOP;
  
  UPDATE users
  SET referral_code_generated = referral_code
  WHERE id = p_user_id;
  
  RETURN referral_code;
END;
$$ LANGUAGE plpgsql;

-- Function for atomic balance updates
CREATE OR REPLACE FUNCTION update_balance_atomic(
  p_user_id TEXT,
  p_amount_change NUMERIC
)
RETURNS TABLE(
  success BOOLEAN,
  new_balance NUMERIC,
  error_message TEXT
) AS $$
DECLARE
  v_current_balance NUMERIC;
  v_new_balance NUMERIC;
BEGIN
  SELECT balance INTO v_current_balance
  FROM users
  WHERE id = p_user_id
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 0::NUMERIC, 'User not found'::TEXT;
    RETURN;
  END IF;
  
  v_new_balance := v_current_balance + p_amount_change;
  
  IF v_new_balance < 0 THEN
    RETURN QUERY SELECT FALSE, v_current_balance, 'Insufficient balance'::TEXT;
    RETURN;
  END IF;
  
  UPDATE users
  SET balance = v_new_balance,
      updated_at = NOW()
  WHERE id = p_user_id;
  
  RETURN QUERY SELECT TRUE, v_new_balance, NULL::TEXT;
END;
$$ LANGUAGE plpgsql;

-- Function to update request status
CREATE OR REPLACE FUNCTION update_request_status(
  p_request_id UUID,
  p_admin_id VARCHAR(36),
  p_new_status request_status,
  p_notes TEXT DEFAULT NULL
) RETURNS admin_requests AS $$
DECLARE
  v_old_status request_status;
  v_request admin_requests%ROWTYPE;
BEGIN
  SELECT status INTO v_old_status FROM admin_requests WHERE id = p_request_id;
  
  UPDATE admin_requests 
  SET status = p_new_status,
      admin_id = p_admin_id,
      admin_notes = p_notes,
      updated_at = NOW(),
      processed_at = CASE WHEN p_new_status IN ('approved', 'rejected') THEN NOW() ELSE NULL END
  WHERE id = p_request_id
  RETURNING * INTO v_request;
  
  INSERT INTO request_audit (
    request_id,
    admin_id,
    action,
    old_status,
    new_status,
    notes
  ) VALUES (
    p_request_id,
    p_admin_id,
    'status_update',
    v_old_status,
    p_new_status,
    p_notes
  );
  
  RETURN v_request;
END;
$$ LANGUAGE plpgsql;

-- Function to update balance with request
CREATE OR REPLACE FUNCTION update_balance_with_request(
  p_request_id UUID,
  p_admin_id VARCHAR(36),
  p_new_status request_status,
  p_notes TEXT DEFAULT NULL
) RETURNS admin_requests AS $$
DECLARE
  v_request admin_requests%ROWTYPE;
  v_user users%ROWTYPE;
BEGIN
  SELECT * INTO v_request FROM admin_requests WHERE id = p_request_id;
  
  SELECT * INTO v_user FROM users WHERE id = v_request.user_id;
  
  IF v_request.request_type = 'deposit' AND p_new_status = 'approved' THEN
    UPDATE users
    SET balance = balance + v_request.amount,
        updated_at = NOW()
    WHERE id = v_request.user_id;
    
    INSERT INTO user_transactions (
      user_id,
      transaction_type,
      amount,
      balance_before,
      balance_after,
      status,
      reference_id,
      description
    ) VALUES (
      v_request.user_id,
      'deposit',
      v_request.amount,
      v_user.balance,
      v_user.balance + v_request.amount,
      'completed',
      v_request.id::TEXT,
      'Deposit via admin request'
    );
  ELSIF v_request.request_type = 'withdrawal' AND p_new_status = 'approved' THEN
    UPDATE users
    SET balance = balance - v_request.amount,
        updated_at = NOW()
    WHERE id = v_request.user_id;
    
    INSERT INTO user_transactions (
      user_id,
      transaction_type,
      amount,
      balance_before,
      balance_after,
      status,
      reference_id,
      description
    ) VALUES (
      v_request.user_id,
      'withdrawal',
      v_request.amount,
      v_user.balance,
      v_user.balance - v_request.amount,
      'completed',
      v_request.id::TEXT,
      'Withdrawal via admin request'
    );
  END IF;
  
  UPDATE admin_requests
  SET balance_updated = true,
      updated_at = NOW()
  WHERE id = p_request_id;
  
  RETURN update_request_status(p_request_id, p_admin_id, p_new_status, p_notes);
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- DATABASE VIEWS
-- ============================================

CREATE VIEW admin_requests_summary AS
SELECT 
  COUNT(*) as total_requests,
  COUNT(*) FILTER (WHERE status = 'pending') as pending_requests,
  COUNT(*) FILTER (WHERE status = 'pending' AND priority = 1) as high_priority_requests,
  COUNT(*) FILTER (WHERE status = 'approved') as approved_requests,
  COUNT(*) FILTER (WHERE status = 'rejected') as rejected_requests,
  SUM(amount) FILTER (WHERE status = 'pending') as pending_amount,
  SUM(amount) FILTER (WHERE status = 'approved') as approved_amount
FROM admin_requests
WHERE created_at >= NOW() - INTERVAL '24 hours';

-- ============================================
-- DEFAULT DATA - GAME SETTINGS
-- ============================================

INSERT INTO game_settings (setting_key, setting_value, description) VALUES
('min_bet_amount', '1000', 'Minimum bet amount'),
('max_bet_amount', '100000', 'Maximum bet amount'),
('betting_timer_duration', '30', 'Betting timer duration in seconds'),
('round_transition_delay', '2', 'Round transition delay in seconds'),
('default_starting_balance', '100000', 'Default starting balance for new users'),
('house_commission_rate', '0.05', 'House commission rate (5%)'),
('site_title', 'RAJU GARI KOSSU - Andar Bahar Game', 'Site title'),
('contact_email', 'support@raju-gari-kossu.com', 'Contact email'),
('whatsapp_number', '+91 8686886632', 'WhatsApp number'),
('admin_whatsapp_number', '918686886632', 'Admin WhatsApp number'),
('min_deposit_amount', '100', 'Minimum deposit amount'),
('max_deposit_amount', '100000', 'Maximum deposit amount'),
('min_withdraw_amount', '500', 'Minimum withdrawal amount'),
('max_withdraw_amount', '50000', 'Maximum withdrawal amount'),
('deposit_bonus', '10', 'Default deposit bonus percentage'),
('referral_commission', '5', 'Referral commission percentage'),
('default_deposit_bonus_percent', '5', 'Default deposit bonus percentage'),
('referral_bonus_percent', '1', 'Referral bonus percentage'),
('conditional_bonus_threshold', '30', 'Conditional bonus threshold percentage')
ON CONFLICT (setting_key) DO UPDATE SET setting_value = EXCLUDED.setting_value;

-- ============================================
-- DEFAULT DATA - STREAM SETTINGS
-- ============================================

INSERT INTO stream_settings (setting_key, setting_value, description) VALUES
('stream_provider', 'youtube', 'Stream provider (youtube, restream, custom)'),
('youtube_video_id', 'z7fyLrTL8ng', 'YouTube Live video ID'),
('stream_title', 'RAJU GARI KOSSU Andar Bahar Live', 'Title for the stream'),
('stream_status', 'offline', 'Current stream status (online/offline)')
ON CONFLICT (setting_key) DO UPDATE SET setting_value = EXCLUDED.setting_value;

-- ============================================
-- DEFAULT DATA - STREAM CONFIG
-- ============================================

INSERT INTO stream_config (
  active_method,
  rtmp_server_url,
  rtmp_stream_key,
  stream_title,
  stream_status,
  show_stream
)
SELECT
  'rtmp',
  'rtmp://live.restream.io/live',
  're_10541509_eventd4960ba1734c49369fc0d114295801a0',
  'RAJU GARI KOSSU Andar Bahar Live',
  'offline',
  true
WHERE NOT EXISTS (SELECT 1 FROM stream_config LIMIT 1);

-- ============================================
-- DEFAULT DATA - ADMIN DASHBOARD SETTINGS
-- ============================================

INSERT INTO admin_dashboard_settings (setting_key, setting_value, description) VALUES
('auto_refresh_interval', '30', 'Auto-refresh interval in seconds for dashboard data'),
('default_request_limit', '50', 'Default number of requests to show per page'),
('enable_real_time_notifications', 'true', 'Enable real-time WebSocket notifications'),
('default_priority', '3', 'Default priority for new requests'),
('require_admin_approval', 'true', 'Require admin approval for balance updates'),
('notification_sound', 'true', 'Play sound for new high-priority requests')
ON CONFLICT (setting_key) DO UPDATE SET setting_value = EXCLUDED.setting_value;

-- ============================================
-- CREATE ADMIN ACCOUNTS
-- ============================================
-- Password: admin123
-- Hash: $2b$12$Vc738883Bz.Rn6y4N5pP.eNl93jBQ.aJ5sXK3v3jVcQFpNQ7vZ5XW

INSERT INTO admin_credentials (username, password_hash, role) VALUES
('admin', '$2b$12$Vc738883Bz.Rn6y4N5pP.eNl93jBQ.aJ5sXK3v3jVcQFpNQ7vZ5XW', 'admin'),
('rajugarikossu', '$2b$12$Vc738883Bz.Rn6y4N5pP.eNl93jBQ.aJ5sXK3v3jVcQFpNQ7vZ5XW', 'admin')
ON CONFLICT (username) DO UPDATE SET password_hash = EXCLUDED.password_hash;

-- ============================================
-- CREATE TEST USER ACCOUNTS
-- ============================================
-- Password for all test users: Test@123
-- Hash: $2b$12$ivq6eChnB.SBEjfpxQSG0./mLY05R.IQnt.q0mobK9ZX6pXpu9pV.

INSERT INTO users (id, phone, password_hash, full_name, role, status, balance, referral_code_generated) VALUES
('9876543210', '9876543210', '$2b$12$ivq6eChnB.SBEjfpxQSG0./mLY05R.IQnt.q0mobK9ZX6pXpu9pV.', 'Test Player 1', 'player', 'active', 100000.00, 'RAJUGARIKOSSU0001'),
('9876543211', '9876543211', '$2b$12$ivq6eChnB.SBEjfpxQSG0./mLY05R.IQnt.q0mobK9ZX6pXpu9pV.', 'Test Player 2', 'player', 'active', 50000.00, 'RAJUGARIKOSSU0002'),
('9876543212', '9876543212', '$2b$12$ivq6eChnB.SBEjfpxQSG0./mLY05R.IQnt.q0mobK9ZX6pXpu9pV.', 'Test Player 3', 'player', 'active', 75000.00, 'RAJUGARIKOSSU0003'),
('9876543213', '9876543213', '$2b$12$ivq6eChnB.SBEjfpxQSG0./mLY05R.IQnt.q0mobK9ZX6pXpu9pV.', 'Test Player 4', 'player', 'active', 25000.00, 'RAJUGARIKOSSU0004'),
('9876543214', '9876543214', '$2b$12$ivq6eChnB.SBEjfpxQSG0./mLY05R.IQnt.q0mobK9ZX6pXpu9pV.', 'Test Player 5', 'player', 'active', 10000.00, 'RAJUGARIKOSSU0005')
ON CONFLICT (id) DO UPDATE SET 
  password_hash = EXCLUDED.password_hash,
  balance = EXCLUDED.balance,
  status = EXCLUDED.status;

-- ============================================
-- GRANT PERMISSIONS (if needed)
-- ============================================

-- Disable Row Level Security for development (remove in production!)
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE admin_credentials DISABLE ROW LEVEL SECURITY;
ALTER TABLE game_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE player_bets DISABLE ROW LEVEL SECURITY;
ALTER TABLE dealt_cards DISABLE ROW LEVEL SECURITY;
ALTER TABLE game_history DISABLE ROW LEVEL SECURITY;
ALTER TABLE stream_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE game_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE game_statistics DISABLE ROW LEVEL SECURITY;
ALTER TABLE daily_game_statistics DISABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_game_statistics DISABLE ROW LEVEL SECURITY;
ALTER TABLE yearly_game_statistics DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_referrals DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE payment_requests DISABLE ROW LEVEL SECURITY;
ALTER TABLE admin_requests DISABLE ROW LEVEL SECURITY;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

SELECT 'Database reset completed successfully!' as status;
SELECT COUNT(*) as admin_count FROM admin_credentials;
SELECT COUNT(*) as user_count FROM users;
SELECT COUNT(*) as game_settings_count FROM game_settings;
SELECT COUNT(*) as stream_settings_count FROM stream_settings;

-- Display admin accounts
SELECT username, role, created_at FROM admin_credentials ORDER BY created_at;

-- Display test user accounts
SELECT id, phone, full_name, balance, status FROM users ORDER BY created_at;

-- ============================================
-- SCRIPT COMPLETED
-- ============================================
-- 
-- Admin Accounts Created:
--   Username: admin
--   Password: admin123
--   
--   Username: rajugarikossu
--   Password: admin123
--
-- Test User Accounts Created:
--   Phone: 9876543210, Password: Test@123, Balance: ₹1,00,000
--   Phone: 9876543211, Password: Test@123, Balance: ₹50,000
--   Phone: 9876543212, Password: Test@123, Balance: ₹75,000
--   Phone: 9876543213, Password: Test@123, Balance: ₹25,000
--   Phone: 9876543214, Password: Test@123, Balance: ₹10,000
--
-- ============================================

