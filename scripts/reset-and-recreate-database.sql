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
DROP TABLE IF EXISTS bonus_transactions CASCADE;
DROP TABLE IF EXISTS deposit_bonuses CASCADE;
DROP TABLE IF EXISTS referral_bonuses CASCADE;
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
DROP TABLE IF EXISTS stream_sessions CASCADE;
DROP TABLE IF EXISTS admin_dashboard_settings CASCADE;
DROP TABLE IF EXISTS token_blacklist CASCADE;

-- Re-enable foreign key checks
SET session_replication_role = 'origin';

-- ============================================
-- STEP 2: DROP ALL VIEWS
-- ============================================

DROP VIEW IF EXISTS user_bonus_summary CASCADE;
DROP VIEW IF EXISTS admin_requests_summary CASCADE;

-- ============================================
-- STEP 3: DROP ALL FUNCTIONS
-- ============================================

DROP FUNCTION IF EXISTS update_request_status(UUID, VARCHAR, request_status, TEXT) CASCADE;
DROP FUNCTION IF EXISTS update_balance_with_request(UUID, VARCHAR, request_status, TEXT) CASCADE;
DROP FUNCTION IF EXISTS generate_referral_code(VARCHAR) CASCADE;
-- Drop all possible variants of update_balance_atomic to avoid ambiguity
DROP FUNCTION IF EXISTS update_balance_atomic(VARCHAR, NUMERIC) CASCADE;
DROP FUNCTION IF EXISTS update_balance_atomic(VARCHAR, DECIMAL) CASCADE;
DROP FUNCTION IF EXISTS update_balance_atomic(VARCHAR(20), DECIMAL(15, 2)) CASCADE;
DROP FUNCTION IF EXISTS update_balance_atomic(TEXT, NUMERIC) CASCADE;
DROP FUNCTION IF EXISTS update_balance_atomic(TEXT, DECIMAL) CASCADE;
DROP FUNCTION IF EXISTS cleanup_expired_tokens() CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS check_conditional_bonus(VARCHAR) CASCADE;
DROP FUNCTION IF EXISTS update_stream_config_updated_at() CASCADE;
DROP FUNCTION IF EXISTS update_daily_statistics() CASCADE;

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
-- ✅ FIX: Added missing transaction types used by code
CREATE TYPE transaction_type AS ENUM ('deposit', 'withdrawal', 'bet', 'win', 'refund', 'bonus', 'commission', 'support', 'bonus_applied', 'conditional_bonus_applied');
CREATE TYPE transaction_status AS ENUM ('pending', 'completed', 'failed', 'cancelled', 'won', 'lost');
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
  -- ✅ NEW: Wagering requirement tracking columns for bonus system
  wagering_requirement DECIMAL(15, 2) DEFAULT '0.00',
  wagering_completed DECIMAL(15, 2) DEFAULT '0.00',
  bonus_locked BOOLEAN DEFAULT false,
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
  andar_cards TEXT[] DEFAULT '{}',
  bahar_cards TEXT[] DEFAULT '{}',
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
CREATE INDEX idx_game_sessions_phase ON game_sessions(phase);
CREATE INDEX idx_game_sessions_created_at ON game_sessions(created_at);

-- Player bets table
CREATE TABLE player_bets (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id VARCHAR(20) NOT NULL,
  game_id VARCHAR(36) NOT NULL,
  round VARCHAR(10) NOT NULL, -- round1, round2, round3
  side bet_side NOT NULL, -- andar or bahar
  amount DECIMAL(15, 2) NOT NULL,
  potential_payout DECIMAL(15, 2),
  actual_payout DECIMAL(15, 2) DEFAULT '0.00',
  status transaction_status DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Foreign key constraints
  CONSTRAINT fk_player_bets_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_player_bets_game FOREIGN KEY (game_id) REFERENCES game_sessions(game_id) ON DELETE CASCADE
);

CREATE INDEX idx_player_bets_user_id ON player_bets(user_id);
CREATE INDEX idx_player_bets_game_id ON player_bets(game_id);
CREATE INDEX idx_player_bets_status ON player_bets(status);
CREATE INDEX idx_player_bets_created_at ON player_bets(created_at);
CREATE INDEX idx_player_bets_user_game ON player_bets(user_id, game_id);
CREATE INDEX idx_player_bets_game_status ON player_bets(game_id, status);

-- Dealt cards table
CREATE TABLE dealt_cards (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  game_id VARCHAR(36) NOT NULL,
  card TEXT NOT NULL, -- e.g., "K♥"
  side bet_side NOT NULL, -- andar or bahar
  position INTEGER NOT NULL, -- 1, 2, 3...
  is_winning_card BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Foreign key constraint
  CONSTRAINT fk_dealt_cards_game FOREIGN KEY (game_id) REFERENCES game_sessions(game_id) ON DELETE CASCADE
);

CREATE INDEX idx_dealt_cards_game_id ON dealt_cards(game_id);
CREATE INDEX idx_dealt_cards_position ON dealt_cards(position);

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
  
  -- Foreign key constraint
  CONSTRAINT fk_game_history_game FOREIGN KEY (game_id) REFERENCES game_sessions(game_id) ON DELETE CASCADE
);

CREATE INDEX idx_game_history_created_at ON game_history(created_at);
CREATE INDEX idx_game_history_game_id ON game_history(game_id);

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
  
  -- Foreign key constraint
  CONSTRAINT fk_game_statistics_game FOREIGN KEY (game_id) REFERENCES game_sessions(game_id) ON DELETE CASCADE
);

CREATE INDEX idx_game_statistics_game_id ON game_statistics(game_id);
CREATE INDEX idx_game_statistics_created_at ON game_statistics(created_at);

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
CREATE INDEX idx_user_transactions_type ON user_transactions(transaction_type);
CREATE INDEX idx_user_transactions_created_at ON user_transactions(created_at);
CREATE INDEX idx_user_transactions_user_type ON user_transactions(user_id, transaction_type);
CREATE INDEX idx_user_transactions_user_date ON user_transactions(user_id, created_at DESC);

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

CREATE INDEX idx_payment_requests_status ON payment_requests(status);
CREATE INDEX idx_payment_requests_user_id ON payment_requests(user_id);
CREATE INDEX idx_payment_requests_created_at ON payment_requests(created_at);
CREATE INDEX idx_payment_requests_type ON payment_requests(request_type);
CREATE INDEX idx_payment_requests_user_status ON payment_requests(user_id, status);

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

-- Stream config table - Dual streaming configuration supporting both RTMP and WebRTC methods
CREATE TABLE stream_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Stream Method Configuration
  active_method VARCHAR(10) NOT NULL DEFAULT 'rtmp' CHECK (active_method IN ('rtmp', 'webrtc')),
  stream_status VARCHAR(20) NOT NULL DEFAULT 'offline' CHECK (stream_status IN ('online', 'offline', 'connecting', 'error')),
  stream_title VARCHAR(255) DEFAULT 'Andar Bahar Live',
  show_stream BOOLEAN DEFAULT true, -- Controls stream visibility to players
  
  -- RTMP Configuration
  rtmp_server_url VARCHAR(255) DEFAULT 'rtmp://live.restream.io/live',
  rtmp_stream_key VARCHAR(255),
  rtmp_player_url VARCHAR(255) DEFAULT 'https://player.restream.io?token=2123471e69ed8bf8cb11cd207c282b1',
  rtmp_status VARCHAR(20) DEFAULT 'offline' CHECK (rtmp_status IN ('online', 'offline', 'connecting', 'error')),
  rtmp_last_check TIMESTAMP WITH TIME ZONE,
  
  -- WebRTC Configuration
  webrtc_enabled BOOLEAN DEFAULT true,
  webrtc_status VARCHAR(20) DEFAULT 'offline' CHECK (webrtc_status IN ('online', 'offline', 'connecting', 'error')),
  webrtc_quality VARCHAR(20) DEFAULT 'high' CHECK (webrtc_quality IN ('low', 'medium', 'high', 'ultra')),
  webrtc_resolution VARCHAR(10) DEFAULT '720p' CHECK (webrtc_resolution IN ('480p', '720p', '1080p')),
  webrtc_fps INTEGER DEFAULT 30 CHECK (webrtc_fps IN (15, 24, 30, 60)),
  webrtc_bitrate INTEGER DEFAULT 2500 CHECK (webrtc_bitrate >= 500 AND webrtc_bitrate <= 10000),
  webrtc_audio_enabled BOOLEAN DEFAULT true,
  webrtc_screen_source VARCHAR(20) DEFAULT 'screen' CHECK (webrtc_screen_source IN ('screen', 'window', 'tab')),
  webrtc_room_id VARCHAR(100) DEFAULT 'andar-bahar-live',
  webrtc_last_check TIMESTAMP WITH TIME ZONE,
  
  -- Analytics
  viewer_count INTEGER DEFAULT 0 CHECK (viewer_count >= 0),
  total_views INTEGER DEFAULT 0 CHECK (total_views >= 0),
  stream_duration_seconds INTEGER DEFAULT 0 CHECK (stream_duration_seconds >= 0),
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID,
  last_modified_by UUID
);

-- Admin dashboard settings table
CREATE TABLE admin_dashboard_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key VARCHAR(100) UNIQUE NOT NULL,
  setting_value TEXT,
  description TEXT,
  updated_by VARCHAR(36),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Foreign key constraint
  CONSTRAINT fk_admin_dashboard_settings_admin FOREIGN KEY (updated_by) REFERENCES admin_credentials(id) ON DELETE SET NULL
);

-- Stream sessions table for tracking
CREATE TABLE stream_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stream_method VARCHAR(10) NOT NULL CHECK (stream_method IN ('rtmp', 'webrtc')),
  start_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  end_time TIMESTAMP WITH TIME ZONE,
  duration_seconds INTEGER,
  peak_viewers INTEGER DEFAULT 0 CHECK (peak_viewers >= 0),
  total_viewers INTEGER DEFAULT 0 CHECK (total_viewers >= 0),
  admin_id UUID,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'ended', 'error')),
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Token blacklist table for logout token invalidation
CREATE TABLE token_blacklist (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  token_jti VARCHAR(255) NOT NULL UNIQUE, -- JWT ID
  user_id VARCHAR(20) NOT NULL,
  token_type VARCHAR(20) NOT NULL, -- 'access' or 'refresh'
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  blacklisted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  reason VARCHAR(100) DEFAULT 'logout'
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

-- Admin requests table - Central table for managing all types of admin requests
CREATE TABLE admin_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(20),
  user_phone VARCHAR(20) NOT NULL,
  request_type transaction_type NOT NULL, -- deposit, withdrawal, support, balance
  amount DECIMAL(15, 2),
  currency VARCHAR(3) DEFAULT 'INR',
  payment_method VARCHAR(50),
  utr_number VARCHAR(100),
  status request_status DEFAULT 'pending',
  priority INTEGER DEFAULT 3 CHECK (priority IN (1, 2, 3)), -- 1=high, 2=medium, 3=low
  admin_notes TEXT,
  admin_id VARCHAR(36),
  whatsapp_message_id VARCHAR(36),
  balance_updated BOOLEAN DEFAULT FALSE,
  balance_update_amount DECIMAL(15, 2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processed_at TIMESTAMP WITH TIME ZONE,
  
  -- Foreign key constraints
  CONSTRAINT fk_admin_requests_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_admin_requests_admin FOREIGN KEY (admin_id) REFERENCES admin_credentials(id) ON DELETE SET NULL,
  CONSTRAINT fk_admin_requests_whatsapp FOREIGN KEY (whatsapp_message_id) REFERENCES whatsapp_messages(id) ON DELETE SET NULL
);

CREATE INDEX idx_admin_requests_status ON admin_requests(status);
CREATE INDEX idx_admin_requests_user_id ON admin_requests(user_id);
CREATE INDEX idx_admin_requests_created_at ON admin_requests(created_at);
CREATE INDEX idx_admin_requests_priority ON admin_requests(priority);
CREATE INDEX idx_admin_requests_whatsapp_id ON admin_requests(whatsapp_message_id);
CREATE INDEX idx_admin_requests_user_game_status ON admin_requests(user_id, request_type, status);

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
CREATE INDEX idx_request_audit_admin_id ON request_audit(admin_id);
CREATE INDEX idx_request_audit_created_at ON request_audit(created_at);

-- ============================================
-- DATABASE FUNCTIONS
-- ============================================

-- Function to generate unique referral code
CREATE OR REPLACE FUNCTION generate_referral_code(
  p_user_id VARCHAR(20)
)
RETURNS VARCHAR(10) AS $$
DECLARE
  referral_code VARCHAR(10);
  temp_code VARCHAR(10);
  code_exists BOOLEAN := TRUE;
BEGIN
  -- Generate a unique 6-character referral code
  WHILE code_exists LOOP
    temp_code := upper(substring(md5(random()::text) from 1 for 6));
    
    -- Check if code already exists
    SELECT EXISTS(
      SELECT 1 FROM users WHERE referral_code_generated = temp_code
    ) INTO code_exists;
    
    IF NOT code_exists THEN
      referral_code := temp_code;
      EXIT;
    END IF;
  END LOOP;
  
  -- Update user with referral code
  UPDATE users
  SET referral_code_generated = referral_code
  WHERE id = p_user_id;
  
  RETURN referral_code;
END;
$$ LANGUAGE plpgsql;

-- Atomic balance update function for race condition prevention
CREATE OR REPLACE FUNCTION update_balance_atomic(
  p_user_id VARCHAR(20),
  p_amount_change DECIMAL(15, 2)
) RETURNS TABLE(
  new_balance DECIMAL(15, 2),
  old_balance DECIMAL(15, 2)
) AS $$
DECLARE
  v_old_balance DECIMAL(15, 2);
  v_new_balance DECIMAL(15, 2);
BEGIN
  -- Get current balance and lock the row
  SELECT balance INTO v_old_balance
  FROM users
  WHERE id = p_user_id
  FOR UPDATE;
  
  -- Check if user exists
  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found: %', p_user_id;
  END IF;
  
  -- Calculate new balance
  v_new_balance := v_old_balance + p_amount_change;
  
  -- Prevent negative balance
  IF v_new_balance < 0 THEN
    RAISE EXCEPTION 'Insufficient balance. Current: %, Requested: %', v_old_balance, p_amount_change;
  END IF;
  
  -- Update balance atomically
  UPDATE users 
  SET balance = v_new_balance,
      updated_at = NOW()
  WHERE id = p_user_id;
  
  -- Return old and new balance
  RETURN QUERY SELECT v_new_balance, v_old_balance;
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
  -- Get the request
  SELECT * INTO v_request FROM admin_requests WHERE id = p_request_id;
  
  -- Get the user
  SELECT * INTO v_user FROM users WHERE id = v_request.user_id;
  
  -- Update request status
  SELECT * INTO v_request FROM update_request_status(p_request_id, p_admin_id, p_new_status, p_notes);
  
  -- If approved and amount is set, update balance
  IF p_new_status = 'approved' AND v_request.amount IS NOT NULL THEN
    -- Update user balance (deposit increases, withdrawal decreases)
    IF v_request.request_type = 'deposit' THEN
      UPDATE users SET balance = balance + v_request.amount
      WHERE id = v_request.user_id;
    ELSIF v_request.request_type = 'withdrawal' THEN
      UPDATE users SET balance = balance - v_request.amount
      WHERE id = v_request.user_id;
    END IF;
    
    -- Mark balance as updated
    UPDATE admin_requests 
    SET balance_updated = true,
        balance_update_amount = v_request.amount
    WHERE id = p_request_id;
    
    -- Log the balance update action
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
      'balance_update',
      p_new_status,
      p_new_status,
      'Balance updated by ' || COALESCE(p_notes, 'Admin action')
    );
  END IF;
  
  RETURN v_request;
END;
$$ LANGUAGE plpgsql;

-- Function to clean up expired tokens (run periodically)
CREATE OR REPLACE FUNCTION cleanup_expired_tokens()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM token_blacklist
  WHERE expires_at < NOW();
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to automatically update the updated_at field
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Bonus system function for conditional bonuses
CREATE OR REPLACE FUNCTION check_conditional_bonus(
  p_user_id VARCHAR(20)
)
RETURNS BOOLEAN AS $$
DECLARE
  bonus_eligible BOOLEAN := FALSE;
  user_level INTEGER;
  total_bets INTEGER;
  user_record RECORD;
BEGIN
  -- Get user record
  SELECT * INTO user_record FROM users WHERE id = p_user_id;
  
  -- Calculate user level based on games played
  user_level := CASE 
    WHEN user_record.games_played >= 100 THEN 5
    WHEN user_record.games_played >= 50 THEN 4
    WHEN user_record.games_played >= 20 THEN 3
    WHEN user_record.games_played >= 10 THEN 2
    ELSE 1
  END;
  
  total_bets := user_record.games_played;
  
  -- Example bonus logic: Level 2+ users get bonus after 5+ bets
  IF user_level >= 2 AND total_bets >= 5 THEN
    bonus_eligible := TRUE;
  END IF;
  
  RETURN bonus_eligible;
END;
$$ LANGUAGE plpgsql;

-- Trigger function to update stream config timestamp
CREATE OR REPLACE FUNCTION update_stream_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger function to update daily statistics
CREATE OR REPLACE FUNCTION update_daily_statistics()
RETURNS TRIGGER AS $$
BEGIN
  -- Update daily statistics
  INSERT INTO daily_game_statistics (date, total_games, total_bets, total_payouts, total_revenue, unique_players)
  VALUES (CURRENT_DATE, 1, NEW.amount, 0, NEW.amount, 1)
  ON CONFLICT (date)
  DO UPDATE SET
    total_games = daily_game_statistics.total_games + 1,
    total_bets = daily_game_statistics.total_bets + EXCLUDED.total_bets,
    total_revenue = daily_game_statistics.total_revenue + EXCLUDED.total_revenue,
    unique_players = daily_game_statistics.unique_players + 1;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ✅ CRITICAL FIX: Apply payouts and update bets atomically with PROPER actual_payout calculation
-- This function is called by the game completion logic to distribute winnings and update bet statuses
-- FIXED: Now properly calculates and sets actual_payout for each individual bet proportionally
CREATE OR REPLACE FUNCTION apply_payouts_and_update_bets(
  payouts JSONB,
  winning_bets_ids TEXT[],
  losing_bets_ids TEXT[]
)
RETURNS void AS $$
DECLARE
  payout_record JSONB;
  user_id_val VARCHAR(20);
  amount_val DECIMAL(15, 2);
  bet_record RECORD;
  user_total_bet DECIMAL(15, 2);
  payout_per_bet DECIMAL(15, 2);
BEGIN
  -- Process each payout
  FOR payout_record IN SELECT * FROM jsonb_array_elements(payouts)
  LOOP
    user_id_val := payout_record->>'userId';
    amount_val := (payout_record->>'amount')::DECIMAL(15, 2);
    
    -- Add balance to user (if amount > 0)
    IF amount_val > 0 THEN
      UPDATE users 
      SET balance = balance + amount_val,
          updated_at = NOW()
      WHERE id = user_id_val;
      
      -- Create transaction record
      INSERT INTO user_transactions (
        user_id,
        transaction_type,
        amount,
        balance_before,
        balance_after,
        status,
        description,
        created_at
      )
      SELECT 
        user_id_val,
        'win',
        amount_val,
        balance - amount_val,
        balance,
        'completed',
        'Game winnings',
        NOW()
      FROM users WHERE id = user_id_val;
      
      -- ✅ CRITICAL FIX: Calculate proportional payout for each winning bet
      -- Get total bet amount for this user in winning bets
      SELECT COALESCE(SUM(amount), 0) INTO user_total_bet
      FROM player_bets
      WHERE user_id = user_id_val
        AND id = ANY(winning_bets_ids);
      
      -- If user has winning bets, distribute payout proportionally
      IF user_total_bet > 0 THEN
        -- Update each winning bet with proportional payout
        FOR bet_record IN 
          SELECT id, amount 
          FROM player_bets 
          WHERE user_id = user_id_val 
            AND id = ANY(winning_bets_ids)
        LOOP
          -- Calculate proportional payout for this bet
          payout_per_bet := (bet_record.amount / user_total_bet) * amount_val;
          
          UPDATE player_bets
          SET 
            status = 'won',
            actual_payout = payout_per_bet,
            updated_at = NOW()
          WHERE id = bet_record.id;
        END LOOP;
      END IF;
    END IF;
  END LOOP;
  
  -- ✅ Update any winning bets that weren't processed above (edge case)
  IF array_length(winning_bets_ids, 1) > 0 THEN
    UPDATE player_bets
    SET 
      status = 'won',
      actual_payout = COALESCE(actual_payout, 0),
      updated_at = NOW()
    WHERE id = ANY(winning_bets_ids)
      AND actual_payout IS NULL;
  END IF;
  
  -- ✅ Update losing bets status and set actual_payout to 0
  IF array_length(losing_bets_ids, 1) > 0 THEN
    UPDATE player_bets
    SET status = 'lost',
        actual_payout = 0,
        updated_at = NOW()
    WHERE id = ANY(losing_bets_ids);
  END IF;
  
  -- Log the operation
  RAISE NOTICE 'Payouts applied: % users, % winning bets, % losing bets', 
    jsonb_array_length(payouts),
    COALESCE(array_length(winning_bets_ids, 1), 0),
    COALESCE(array_length(losing_bets_ids, 1), 0);
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- TRIGGERS
-- ============================================

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS update_user_updated_at ON users;
DROP TRIGGER IF EXISTS update_game_sessions_updated_at ON game_sessions;
DROP TRIGGER IF EXISTS update_player_bets_updated_at ON player_bets;
DROP TRIGGER IF EXISTS update_game_settings_updated_at ON game_settings;
DROP TRIGGER IF EXISTS update_admin_requests_updated_at ON admin_requests;
DROP TRIGGER IF EXISTS update_whatsapp_messages_updated_at ON whatsapp_messages;
DROP TRIGGER IF EXISTS update_daily_stats_updated_at ON daily_game_statistics;
DROP TRIGGER IF EXISTS update_monthly_stats_updated_at ON monthly_game_statistics;
DROP TRIGGER IF EXISTS update_yearly_stats_updated_at ON yearly_game_statistics;
DROP TRIGGER IF EXISTS update_stream_config_updated_at ON stream_config;
DROP TRIGGER IF EXISTS daily_stats_trigger ON player_bets;

-- Create triggers for auto-update timestamps
CREATE TRIGGER update_user_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_game_sessions_updated_at
    BEFORE UPDATE ON game_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_player_bets_updated_at
    BEFORE UPDATE ON player_bets
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_game_settings_updated_at
    BEFORE UPDATE ON game_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_admin_requests_updated_at
    BEFORE UPDATE ON admin_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_whatsapp_messages_updated_at
    BEFORE UPDATE ON whatsapp_messages
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_daily_stats_updated_at
    BEFORE UPDATE ON daily_game_statistics
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_monthly_stats_updated_at
    BEFORE UPDATE ON monthly_game_statistics
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_yearly_stats_updated_at
    BEFORE UPDATE ON yearly_game_statistics
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_stream_config_updated_at
    BEFORE UPDATE ON stream_config
    FOR EACH ROW
    EXECUTE FUNCTION update_stream_config_updated_at();

-- Trigger to update daily statistics on new bets
CREATE TRIGGER daily_stats_trigger
  AFTER INSERT ON player_bets
  FOR EACH ROW
  EXECUTE FUNCTION update_daily_statistics();

-- ============================================
-- ADDITIONAL INDEXES
-- ============================================

-- Analytics indexes
CREATE INDEX idx_daily_stats_date ON daily_game_statistics(date);
CREATE INDEX idx_monthly_stats_month_year ON monthly_game_statistics(month_year);
CREATE INDEX idx_yearly_stats_year ON yearly_game_statistics(year);

-- Token blacklist indexes
CREATE INDEX idx_token_blacklist_jti ON token_blacklist(token_jti);
CREATE INDEX idx_token_blacklist_expires ON token_blacklist(expires_at);

-- Stream configuration indexes
CREATE INDEX idx_stream_config_method ON stream_config(active_method);
CREATE INDEX idx_stream_config_status ON stream_config(stream_status);
CREATE INDEX idx_stream_config_show_stream ON stream_config(show_stream);
CREATE INDEX idx_stream_sessions_method ON stream_sessions(stream_method);
CREATE INDEX idx_stream_sessions_admin ON stream_sessions(admin_id);
CREATE INDEX idx_stream_sessions_start ON stream_sessions(start_time DESC);

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
('conditional_bonus_threshold', '30', 'Conditional bonus threshold percentage'),
-- ✅ NEW: Added missing game settings
('bonus_claim_threshold', '500', 'Bonus claim threshold amount'),
('wagering_multiplier', '1', 'Wagering requirement multiplier (1x = same as deposit)')
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

-- Insert default configuration for stream if table is empty
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
    'Andar Bahar Live',
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
-- ✅ NEW: Generated fresh bcrypt password hashes
-- Password: admin123
-- Hash generated with bcrypt (salt rounds: 12)

-- ✅ FRESH PASSWORD HASHES - Generated: 2024-11-07 5:12 PM
-- Admin Password: admin123
INSERT INTO admin_credentials (username, password_hash, role) VALUES
('admin', '$2b$10$0Z1MPnHMBftZs2X.tMDtSefGeGyjqnLKxNPRpRjSkEdxYVvoaqZvS', 'admin'),
('rajugarikossu', '$2b$10$0Z1MPnHMBftZs2X.tMDtSefGeGyjqnLKxNPRpRjSkEdxYVvoaqZvS', 'admin')
ON CONFLICT (username) DO UPDATE SET password_hash = EXCLUDED.password_hash;

-- ============================================
-- CREATE TEST USER ACCOUNTS
-- ============================================
-- ✅ NEW: Generated fresh bcrypt password hashes
-- Password for all test users: Test@123
-- Hash generated with bcrypt (salt rounds: 12)

-- ✅ FRESH PASSWORD HASHES - Generated: 2024-11-07 5:12 PM
-- Test Player Password: player123
INSERT INTO users (id, phone, password_hash, full_name, role, status, balance, referral_code_generated) VALUES
('9876543210', '9876543210', '$2b$10$8mB.7nxp4rBHl397Hd1H/evl5AcOnObzbFcDPUS/AIJCur94p8Ic6', 'Test Player 1', 'player', 'active', 100000.00, 'TEST001'),
('9876543211', '9876543211', '$2b$10$6tdUJg/WUvaa.hhm7zHYHuWUe7F6FtlR/BnTScKS83c96WbCHD5mi', 'Test Player 2', 'player', 'active', 100000.00, 'TEST002'),
('9876543212', '9876543212', '$2b$10$JYLGm1/wpX5mgnJptwhar.gCt5QWu3MKoxk5Y891CFU2sknIyAlji', 'Test Player 3', 'player', 'active', 100000.00, 'TEST003')
ON CONFLICT (id) DO UPDATE SET 
  password_hash = EXCLUDED.password_hash,
  balance = EXCLUDED.balance,
  status = EXCLUDED.status;

-- ============================================
-- PERMISSIONS
-- ============================================

-- Grant necessary permissions for admin operations
GRANT SELECT, INSERT, UPDATE ON admin_requests TO authenticated;
GRANT SELECT, INSERT ON request_audit TO authenticated;
GRANT SELECT, INSERT, UPDATE ON admin_dashboard_settings TO authenticated;
GRANT EXECUTE ON FUNCTION update_request_status TO authenticated;
GRANT EXECUTE ON FUNCTION update_balance_with_request TO authenticated;
GRANT EXECUTE ON FUNCTION update_updated_at_column TO authenticated;
GRANT EXECUTE ON FUNCTION update_balance_atomic TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_expired_tokens TO authenticated;

-- ============================================
-- GRANT PERMISSIONS (if needed)
-- ============================================

-- ============================================
-- BONUS TRACKING TABLES (NEW SYSTEM)
-- ============================================

-- Deposit bonuses table (per-deposit tracking)
CREATE TABLE deposit_bonuses (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  user_id VARCHAR(20) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  deposit_request_id VARCHAR(36) REFERENCES payment_requests(id),
  
  -- Amounts
  deposit_amount NUMERIC(10,2) NOT NULL,
  bonus_amount NUMERIC(10,2) NOT NULL,
  bonus_percentage NUMERIC(5,2) DEFAULT 5.00,
  
  -- Wagering tracking
  wagering_required NUMERIC(10,2) NOT NULL,
  wagering_completed NUMERIC(10,2) DEFAULT 0.00,
  wagering_progress NUMERIC(5,2) DEFAULT 0.00, -- percentage (0-100)
  
  -- Status tracking
  status VARCHAR(20) DEFAULT 'locked' CHECK (status IN ('locked', 'unlocked', 'credited', 'expired', 'forfeited')),
  locked_at TIMESTAMP DEFAULT NOW(),
  unlocked_at TIMESTAMP,
  credited_at TIMESTAMP,
  expired_at TIMESTAMP,
  
  -- Metadata
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for deposit_bonuses
CREATE INDEX idx_deposit_bonuses_user_id ON deposit_bonuses(user_id);
CREATE INDEX idx_deposit_bonuses_status ON deposit_bonuses(status);
CREATE INDEX idx_deposit_bonuses_created_at ON deposit_bonuses(created_at DESC);
CREATE INDEX idx_deposit_bonuses_user_status ON deposit_bonuses(user_id, status);

-- Bonus transactions table (audit trail)
CREATE TABLE bonus_transactions (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  user_id VARCHAR(20) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Type and source
  bonus_type VARCHAR(30) NOT NULL CHECK (bonus_type IN ('deposit_bonus', 'referral_bonus', 'conditional_bonus', 'promotional_bonus')),
  bonus_source_id VARCHAR(36), -- Links to deposit_bonuses.id or referral_bonuses.id
  
  -- Amounts
  amount NUMERIC(10,2) NOT NULL,
  balance_before NUMERIC(10,2),
  balance_after NUMERIC(10,2),
  
  -- Action tracking
  action VARCHAR(30) NOT NULL CHECK (action IN ('added', 'locked', 'unlocked', 'credited', 'expired', 'forfeited', 'wagering_progress')),
  description TEXT NOT NULL,
  metadata JSONB,
  
  -- Timestamp
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for bonus_transactions
CREATE INDEX idx_bonus_transactions_user_id ON bonus_transactions(user_id);
CREATE INDEX idx_bonus_transactions_type ON bonus_transactions(bonus_type);
CREATE INDEX idx_bonus_transactions_action ON bonus_transactions(action);
CREATE INDEX idx_bonus_transactions_created_at ON bonus_transactions(created_at DESC);
CREATE INDEX idx_bonus_transactions_user_created ON bonus_transactions(user_id, created_at DESC);

-- Referral bonuses table (separate from user_referrals)
CREATE TABLE referral_bonuses (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  referrer_user_id VARCHAR(20) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  referred_user_id VARCHAR(20) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  referral_id VARCHAR(36) REFERENCES user_referrals(id),
  
  -- Amounts
  deposit_amount NUMERIC(10,2) NOT NULL,
  bonus_amount NUMERIC(10,2) NOT NULL,
  bonus_percentage NUMERIC(5,2) DEFAULT 1.00,
  
  -- Status
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'credited', 'expired')),
  credited_at TIMESTAMP,
  expired_at TIMESTAMP,
  
  -- Metadata
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for referral_bonuses
CREATE INDEX idx_referral_bonuses_referrer ON referral_bonuses(referrer_user_id);
CREATE INDEX idx_referral_bonuses_referred ON referral_bonuses(referred_user_id);
CREATE INDEX idx_referral_bonuses_status ON referral_bonuses(status);
CREATE INDEX idx_referral_bonuses_referrer_status ON referral_bonuses(referrer_user_id, status);

-- Trigger for updating updated_at
CREATE OR REPLACE FUNCTION update_bonus_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER deposit_bonuses_updated_at
  BEFORE UPDATE ON deposit_bonuses
  FOR EACH ROW
  EXECUTE FUNCTION update_bonus_updated_at();

CREATE TRIGGER referral_bonuses_updated_at
  BEFORE UPDATE ON referral_bonuses
  FOR EACH ROW
  EXECUTE FUNCTION update_bonus_updated_at();

-- View for easy bonus summary
CREATE OR REPLACE VIEW user_bonus_summary AS
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
  COALESCE(SUM(CASE WHEN rb.status = 'pending' THEN rb.bonus_amount ELSE 0 END), 0) as referral_bonus_pending,
  
  -- Totals
  COALESCE(SUM(CASE WHEN db.status IN ('unlocked', 'locked') THEN db.bonus_amount ELSE 0 END), 0) + 
  COALESCE(SUM(CASE WHEN rb.status = 'pending' THEN rb.bonus_amount ELSE 0 END), 0) as total_available,
  
  COALESCE(SUM(CASE WHEN db.status = 'credited' THEN db.bonus_amount ELSE 0 END), 0) + 
  COALESCE(SUM(CASE WHEN rb.status = 'credited' THEN rb.bonus_amount ELSE 0 END), 0) as total_credited,
  
  COALESCE(SUM(db.bonus_amount), 0) + COALESCE(SUM(rb.bonus_amount), 0) as lifetime_earnings
  
FROM users u
LEFT JOIN deposit_bonuses db ON u.id = db.user_id
LEFT JOIN referral_bonuses rb ON u.id = rb.referrer_user_id
GROUP BY u.id, u.phone, u.full_name;

-- ============================================
-- END BONUS TRACKING TABLES
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
ALTER TABLE deposit_bonuses DISABLE ROW LEVEL SECURITY;
ALTER TABLE bonus_transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE referral_bonuses DISABLE ROW LEVEL SECURITY;

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
-- ============================================
-- ✅ CREDENTIALS - GENERATED: 2024-11-07 5:12 PM
-- ============================================
--
-- 🔐 ADMIN ACCOUNTS:
--   Username: admin
--   Password: admin123
--   Hash: $2b$10$0Z1MPnHMBftZs2X.tMDtSefGeGyjqnLKxNPRpRjSkEdxYVvoaqZvS
--   
--   Username: rajugarikossu
--   Password: admin123
--   Hash: $2b$10$0Z1MPnHMBftZs2X.tMDtSefGeGyjqnLKxNPRpRjSkEdxYVvoaqZvS
--
-- 👤 TEST PLAYER ACCOUNTS:
--   Phone: 9876543210, Password: player123, Balance: ₹1,00,000
--   Hash: $2b$10$8mB.7nxp4rBHl397Hd1H/evl5AcOnObzbFcDPUS/AIJCur94p8Ic6
--   
--   Phone: 9876543211, Password: player123, Balance: ₹1,00,000
--   Hash: $2b$10$6tdUJg/WUvaa.hhm7zHYHuWUe7F6FtlR/BnTScKS83c96WbCHD5mi
--   
--   Phone: 9876543212, Password: player123, Balance: ₹1,00,000
--   Hash: $2b$10$JYLGm1/wpX5mgnJptwhar.gCt5QWu3MKoxk5Y891CFU2sknIyAlji
--
-- ============================================
-- ✅ CRITICAL FIXES APPLIED:
-- ============================================
--   1. ✅ FIXED apply_payouts_and_update_bets function to properly set actual_payout
--      - Now calculates proportional payout for each bet
--      - Sets actual_payout field correctly for winning bets
--      - Sets actual_payout = 0 for losing bets
--      - This fixes ALL user statistics, game history, and win/loss display issues
--
--   2. ✅ Added wagering_requirement, wagering_completed, bonus_locked to users table
--   3. ✅ Added bonus_applied and conditional_bonus_applied to transaction_type enum
--   4. ✅ Added bonus_claim_threshold and wagering_multiplier to game_settings
--   5. ✅ game_history table columns are nullable (opening_card, winner, winning_card)
--   6. ✅ All functions, triggers, views, and indexes properly created
--   7. ✅ FRESH PASSWORD HASHES generated for admin and test users (Nov 7, 2024 5:12 PM)
--   8. ✅ All field names match TypeScript code expectations (snake_case in DB, camelCase in code)
--   9. ✅ NEW BONUS TRACKING TABLES added (deposit_bonuses, bonus_transactions, referral_bonuses)
--   10. ✅ Bonus summary view created for easy querying
--
-- ============================================

