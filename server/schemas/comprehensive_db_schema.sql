-- ============================================
-- REDDY ANNA ANDAR BAHAR GAME - COMPREHENSIVE SUPABASE SCHEMA
-- Complete Database with Admin Requests & WhatsApp Integration
-- ============================================
-- Run this script in your Supabase SQL Editor
-- This will create all tables, indexes, functions, and default data
-- ============================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- ENUM TYPES FOR DATA INTEGRITY
-- ============================================

-- User role enum (prevents typos like "adminn" or "ADMIN")
CREATE TYPE user_role AS ENUM ('player', 'admin', 'super_admin');

-- User status enum
CREATE TYPE user_status AS ENUM ('active', 'suspended', 'banned', 'inactive');

-- Game phase enum
CREATE TYPE game_phase AS ENUM ('idle', 'betting', 'dealing', 'complete');

-- Game status enum
CREATE TYPE game_status AS ENUM ('active', 'completed', 'cancelled');

-- Bet side enum
CREATE TYPE bet_side AS ENUM ('andar', 'bahar');

-- Transaction type enum
CREATE TYPE transaction_type AS ENUM ('deposit', 'withdrawal', 'bet', 'win', 'refund', 'bonus', 'commission', 'support');

-- Transaction status enum
CREATE TYPE transaction_status AS ENUM ('pending', 'completed', 'failed', 'cancelled');

-- Request status enum
CREATE TYPE request_status AS ENUM ('pending', 'approved', 'rejected', 'processing', 'processed', 'completed');

-- ============================================
-- CORE TABLES
-- ============================================

-- Users table (phone-based authentication)
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(20) PRIMARY KEY, -- Phone number as ID
  phone VARCHAR(15) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  full_name TEXT,
  role user_role DEFAULT 'player',
  status user_status DEFAULT 'active',
  balance DECIMAL(15, 2) NOT NULL DEFAULT '100000.00', -- ₹100,000 default
  total_winnings DECIMAL(15, 2) DEFAULT '0.00',
  total_losses DECIMAL(15, 2) DEFAULT '0.00',
  games_played INTEGER DEFAULT 0,
  games_won INTEGER DEFAULT 0,
  phone_verified BOOLEAN DEFAULT false,
  referral_code VARCHAR(50), -- Referral code used during signup
  referral_code_generated VARCHAR(50), -- Auto-generated referral code for sharing
  deposit_bonus_available DECIMAL(15, 2) DEFAULT '0.00',
  referral_bonus_available DECIMAL(15, 2) DEFAULT '0.00',
  original_deposit_amount DECIMAL(15, 2) DEFAULT '0.00',
  total_bonus_earned DECIMAL(15, 2) DEFAULT '0.00',
  last_login TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Admin credentials table
CREATE TABLE IF NOT EXISTS admin_credentials (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  username VARCHAR(50) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role user_role DEFAULT 'admin',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Game settings table
CREATE TABLE IF NOT EXISTS game_settings (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  setting_key VARCHAR(100) NOT NULL UNIQUE,
  setting_value TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Game sessions table
CREATE TABLE IF NOT EXISTS game_sessions (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  game_id VARCHAR(36) NOT NULL UNIQUE,
  opening_card TEXT, -- e.g., "A♠"
  phase game_phase NOT NULL DEFAULT 'idle',
  status game_status NOT NULL DEFAULT 'active',
  current_timer INTEGER DEFAULT 30,
  current_round INTEGER DEFAULT 1,
  andar_cards TEXT[] DEFAULT '{}',
  bahar_cards TEXT[] DEFAULT '{}',
  winner bet_side, -- andar or bahar
  winning_card TEXT,
  winning_round INTEGER,
  total_andar_bets DECIMAL(15, 2) DEFAULT '0.00',
  total_bahar_bets DECIMAL(15, 2) DEFAULT '0.00',
  total_payouts DECIMAL(15, 2) DEFAULT '0.00',
  started_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Dealt cards table
CREATE TABLE IF NOT EXISTS dealt_cards (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  game_id VARCHAR(36) NOT NULL,
  card TEXT NOT NULL, -- e.g., "K♥"
  side bet_side NOT NULL, -- andar or bahar
  position INTEGER NOT NULL, -- 1, 2, 3...
  is_winning_card BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Player bets table
CREATE TABLE IF NOT EXISTS player_bets (
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

-- User transactions table
CREATE TABLE IF NOT EXISTS user_transactions (
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
  
  -- Foreign key constraint
  CONSTRAINT fk_user_transactions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Game statistics table
CREATE TABLE IF NOT EXISTS game_statistics (
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

-- Game history table
CREATE TABLE IF NOT EXISTS game_history (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  game_id VARCHAR(36) NOT NULL,
  opening_card TEXT NOT NULL,
  winner bet_side NOT NULL, -- andar or bahar
  winning_card TEXT NOT NULL,
  total_cards INTEGER NOT NULL,
  round INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Blocked users table
CREATE TABLE IF NOT EXISTS blocked_users (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id VARCHAR(20) NOT NULL,
  reason TEXT,
  blocked_by VARCHAR(36), -- References admin_credentials.id
  blocked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Foreign key constraint
  CONSTRAINT fk_blocked_users_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_blocked_users_admin FOREIGN KEY (blocked_by) REFERENCES admin_credentials(id) ON DELETE SET NULL
);

-- User referrals table
CREATE TABLE IF NOT EXISTS user_referrals (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  referrer_user_id VARCHAR(20) NOT NULL,
  referred_user_id VARCHAR(20) NOT NULL UNIQUE,
  deposit_amount DECIMAL(15, 2),
  bonus_amount DECIMAL(15, 2),
  bonus_applied BOOLEAN DEFAULT false,
  bonus_applied_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Foreign key constraints
  CONSTRAINT fk_user_referrals_referrer FOREIGN KEY (referrer_user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_user_referrals_referred FOREIGN KEY (referred_user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Stream settings table
CREATE TABLE IF NOT EXISTS stream_settings (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  setting_key VARCHAR(100) NOT NULL UNIQUE,
  setting_value TEXT,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User creation log table (for tracking admin-created accounts)
CREATE TABLE IF NOT EXISTS user_creation_log (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  created_by_admin_id VARCHAR(36) NOT NULL,
  user_phone VARCHAR(15) NOT NULL,
  created_user_id VARCHAR(20) NOT NULL,
  initial_balance DECIMAL(15, 2) DEFAULT '0.00',
  created_reason TEXT,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Foreign key constraint
  CONSTRAINT fk_user_creation_log_admin FOREIGN KEY (created_by_admin_id) REFERENCES admin_credentials(id) ON DELETE CASCADE
);

-- ============================================
-- ADMIN REQUESTS & WHATSAPP INTEGRATION TABLES
-- ============================================

-- Enhanced WhatsApp messages table with admin workflow
CREATE TABLE IF NOT EXISTS whatsapp_messages (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id VARCHAR(20),
  user_phone VARCHAR(15) NOT NULL,
  admin_phone VARCHAR(15) NOT NULL,
  request_type VARCHAR(50) NOT NULL, -- withdrawal, deposit, support, balance
  message TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'pending', -- pending, sent, responded
  priority INTEGER DEFAULT 3, -- 1-5, 1 being highest
  is_urgent BOOLEAN DEFAULT FALSE,
  metadata TEXT, -- JSON string for additional data
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  sent_at TIMESTAMP WITH TIME ZONE,
  responded_at TIMESTAMP WITH TIME ZONE,
  response_message TEXT,
  response_by VARCHAR(20),
  -- Admin workflow fields
  request_status request_status DEFAULT 'pending',
  admin_response TEXT,
  admin_id VARCHAR(255),
  balance_updated BOOLEAN DEFAULT FALSE,
  
  -- Foreign key constraint
  CONSTRAINT fk_whatsapp_messages_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Enhanced Admin Requests Table - Central table for managing all types of admin requests
CREATE TABLE IF NOT EXISTS admin_requests (
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

-- Request Audit Trail Table - Complete audit log for all admin actions on requests
CREATE TABLE IF NOT EXISTS request_audit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID NOT NULL,
    admin_id VARCHAR(36),
    action VARCHAR(50) NOT NULL,
    old_status request_status,
    new_status request_status,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Foreign key constraints
    CONSTRAINT fk_request_audit_request FOREIGN KEY (request_id) REFERENCES admin_requests(id) ON DELETE CASCADE,
    CONSTRAINT fk_request_audit_admin FOREIGN KEY (admin_id) REFERENCES admin_credentials(id) ON DELETE SET NULL
);

-- Admin Dashboard Settings Table - Configuration settings for the admin dashboard
CREATE TABLE IF NOT EXISTS admin_dashboard_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT,
    description TEXT,
    updated_by VARCHAR(36),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Foreign key constraint
    CONSTRAINT fk_admin_dashboard_settings_admin FOREIGN KEY (updated_by) REFERENCES admin_credentials(id) ON DELETE SET NULL
);

-- ============================================
-- STREAMING TABLES
-- ============================================

-- Dual streaming configuration supporting both RTMP and WebRTC methods
CREATE TABLE IF NOT EXISTS stream_config (
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

-- Stream sessions table for tracking
CREATE TABLE IF NOT EXISTS stream_sessions (
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

-- ============================================
-- ANALYTICS TABLES
-- ============================================

-- Daily game statistics table
CREATE TABLE IF NOT EXISTS daily_game_statistics (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  date DATE NOT NULL UNIQUE,
  total_games INTEGER DEFAULT 0,
  total_bets DECIMAL(15, 2) DEFAULT '0.00',
  total_payouts DECIMAL(15, 2) DEFAULT '0.00',
  total_revenue DECIMAL(15, 2) DEFAULT '0.00', -- total_bets - total_payouts
  profit_loss DECIMAL(15, 2) DEFAULT '0.00',
  profit_loss_percentage DECIMAL(5, 2) DEFAULT '0.00',
  unique_players INTEGER DEFAULT 0,
  peak_bets_hour INTEGER DEFAULT 0, -- hour of day with most betting
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Monthly game statistics table
CREATE TABLE IF NOT EXISTS monthly_game_statistics (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  month_year VARCHAR(7) NOT NULL UNIQUE, -- Format: YYYY-MM
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
CREATE TABLE IF NOT EXISTS yearly_game_statistics (
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

-- Token blacklist table for logout token invalidation
CREATE TABLE IF NOT EXISTS token_blacklist (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  token_jti VARCHAR(255) NOT NULL UNIQUE, -- JWT ID
  user_id VARCHAR(20) NOT NULL,
  token_type VARCHAR(20) NOT NULL, -- 'access' or 'refresh'
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  blacklisted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  reason VARCHAR(100) DEFAULT 'logout'
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

-- Users indexes
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);
CREATE INDEX IF NOT EXISTS idx_users_referral_code_generated ON users(referral_code_generated);

-- Game sessions indexes
CREATE INDEX IF NOT EXISTS idx_game_sessions_status ON game_sessions(status);
CREATE INDEX IF NOT EXISTS idx_game_sessions_phase ON game_sessions(phase);
CREATE INDEX IF NOT EXISTS idx_game_sessions_created_at ON game_sessions(created_at);
CREATE INDEX IF NOT EXISTS idx_game_sessions_game_id ON game_sessions(game_id);

-- Player bets indexes
CREATE INDEX IF NOT EXISTS idx_player_bets_user_id ON player_bets(user_id);
CREATE INDEX IF NOT EXISTS idx_player_bets_game_id ON player_bets(game_id);
CREATE INDEX IF NOT EXISTS idx_player_bets_status ON player_bets(status);
CREATE INDEX IF NOT EXISTS idx_player_bets_created_at ON player_bets(created_at);
CREATE INDEX IF NOT EXISTS idx_player_bets_user_game ON player_bets(user_id, game_id);

-- Card indexes
CREATE INDEX IF NOT EXISTS idx_dealt_cards_game_id ON dealt_cards(game_id);
CREATE INDEX IF NOT EXISTS idx_dealt_cards_position ON dealt_cards(position);

-- Transaction indexes
CREATE INDEX IF NOT EXISTS idx_user_transactions_user_id ON user_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_transactions_type ON user_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_user_transactions_created_at ON user_transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_user_transactions_user_type ON user_transactions(user_id, transaction_type);
CREATE INDEX IF NOT EXISTS idx_user_transactions_user_date ON user_transactions(user_id, created_at DESC);

-- Game history indexes
CREATE INDEX IF NOT EXISTS idx_game_history_created_at ON game_history(created_at);
CREATE INDEX IF NOT EXISTS idx_game_history_game_id ON game_history(game_id);

-- Game statistics indexes
CREATE INDEX IF NOT EXISTS idx_game_statistics_game_id ON game_statistics(game_id);
CREATE INDEX IF NOT EXISTS idx_game_statistics_created_at ON game_statistics(created_at);

-- Referral indexes
CREATE INDEX IF NOT EXISTS idx_user_referrals_referrer ON user_referrals(referrer_user_id);
CREATE INDEX IF NOT EXISTS idx_user_referrals_referred ON user_referrals(referred_user_id);

-- Admin requests indexes
CREATE INDEX IF NOT EXISTS idx_admin_requests_status ON admin_requests(status);
CREATE INDEX IF NOT EXISTS idx_admin_requests_user_id ON admin_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_requests_created_at ON admin_requests(created_at);
CREATE INDEX IF NOT EXISTS idx_admin_requests_priority ON admin_requests(priority);
CREATE INDEX IF NOT EXISTS idx_admin_requests_whatsapp_id ON admin_requests(whatsapp_message_id);
CREATE INDEX IF NOT EXISTS idx_admin_requests_user_game_status ON admin_requests(user_id, request_type, status);

-- Request audit indexes
CREATE INDEX IF NOT EXISTS idx_request_audit_request_id ON request_audit(request_id);
CREATE INDEX IF NOT EXISTS idx_request_audit_admin_id ON request_audit(admin_id);
CREATE INDEX IF NOT EXISTS idx_request_audit_created_at ON request_audit(created_at);

-- Game session related indexes
CREATE INDEX IF NOT EXISTS idx_player_bets_game_status ON player_bets(game_id, status);

-- Analytics indexes
CREATE INDEX IF NOT EXISTS idx_daily_stats_date ON daily_game_statistics(date);
CREATE INDEX IF NOT EXISTS idx_monthly_stats_month_year ON monthly_game_statistics(month_year);
CREATE INDEX IF NOT EXISTS idx_yearly_stats_year ON yearly_game_statistics(year);

-- Token blacklist indexes
CREATE INDEX IF NOT EXISTS idx_token_blacklist_jti ON token_blacklist(token_jti);
CREATE INDEX IF NOT EXISTS idx_token_blacklist_expires ON token_blacklist(expires_at);

-- Stream configuration indexes
CREATE INDEX IF NOT EXISTS idx_stream_config_method ON stream_config(active_method);
CREATE INDEX IF NOT EXISTS idx_stream_config_status ON stream_config(stream_status);
CREATE INDEX IF NOT EXISTS idx_stream_config_show_stream ON stream_config(show_stream);
CREATE INDEX IF NOT EXISTS idx_stream_sessions_method ON stream_sessions(stream_method);
CREATE INDEX IF NOT EXISTS idx_stream_sessions_admin ON stream_sessions(admin_id);
CREATE INDEX IF NOT EXISTS idx_stream_sessions_start ON stream_sessions(start_time DESC);

-- ============================================
-- DEFAULT DATA - ADMIN ACCOUNT
-- ============================================

-- Insert default admin user
-- Username: admin
-- Password: Admin@123
INSERT INTO admin_credentials (id, username, password_hash, role, created_at, updated_at) 
VALUES (
  gen_random_uuid()::text,
  'admin',
  '$2b$12$7mPOKPBE8jwbvQmqxyjpYeB8cE8enDiB2qKpiJq4HQ.accgeRoaVK', -- Hash for 'Admin@123'
  'admin',
  NOW(),
  NOW()
) ON CONFLICT (username) DO NOTHING;

-- ============================================
-- DEFAULT DATA - GAME SETTINGS
-- ============================================

INSERT INTO game_settings (setting_key, setting_value, description)
SELECT 'betting_timer_duration', '30', 'Duration of betting phase in seconds'
WHERE NOT EXISTS (SELECT 1 FROM game_settings WHERE setting_key = 'betting_timer_duration');

INSERT INTO game_settings (setting_key, setting_value, description)
SELECT 'round_transition_delay', '2', 'Delay between rounds in seconds'
WHERE NOT EXISTS (SELECT 1 FROM game_settings WHERE setting_key = 'round_transition_delay');

INSERT INTO game_settings (setting_key, setting_value, description)
SELECT 'min_bet_amount', '1000', 'Minimum bet amount in rupees'
WHERE NOT EXISTS (SELECT 1 FROM game_settings WHERE setting_key = 'min_bet_amount');

INSERT INTO game_settings (setting_key, setting_value, description)
SELECT 'max_bet_amount', '100000', 'Maximum bet amount in rupees'
WHERE NOT EXISTS (SELECT 1 FROM game_settings WHERE setting_key = 'max_bet_amount');

INSERT INTO game_settings (setting_key, setting_value, description)
SELECT 'default_starting_balance', '100000', 'Default starting balance for new users (₹100,000)'
WHERE NOT EXISTS (SELECT 1 FROM game_settings WHERE setting_key = 'default_starting_balance');

INSERT INTO game_settings (setting_key, setting_value, description)
SELECT 'house_commission_rate', '0.05', 'House commission rate (0.05 = 5%)'
WHERE NOT EXISTS (SELECT 1 FROM game_settings WHERE setting_key = 'house_commission_rate');

INSERT INTO game_settings (setting_key, setting_value, description)
SELECT 'admin_whatsapp_number', '918686886632', 'Admin WhatsApp number for user requests'
WHERE NOT EXISTS (SELECT 1 FROM game_settings WHERE setting_key = 'admin_whatsapp_number');

INSERT INTO game_settings (setting_key, setting_value, description)
SELECT 'default_deposit_bonus_percent', '5', 'Default deposit bonus percentage'
WHERE NOT EXISTS (SELECT 1 FROM game_settings WHERE setting_key = 'default_deposit_bonus_percent');

INSERT INTO game_settings (setting_key, setting_value, description)
SELECT 'referral_bonus_percent', '1', 'Referral bonus percentage'
WHERE NOT EXISTS (SELECT 1 FROM game_settings WHERE setting_key = 'referral_bonus_percent');

INSERT INTO game_settings (setting_key, setting_value, description)
SELECT 'conditional_bonus_threshold', '30', 'Conditional bonus threshold percentage'
WHERE NOT EXISTS (SELECT 1 FROM game_settings WHERE setting_key = 'conditional_bonus_threshold');

-- ============================================
-- DEFAULT DATA - STREAM SETTINGS
-- ============================================

INSERT INTO stream_settings (setting_key, setting_value, description)
SELECT 'stream_provider', 'youtube', 'Stream provider (youtube, restream, custom)'
WHERE NOT EXISTS (SELECT 1 FROM stream_settings WHERE setting_key = 'stream_provider');

INSERT INTO stream_settings (setting_key, setting_value, description)
SELECT 'youtube_video_id', 'z7fyLrTL8ng', 'YouTube Live video ID'
WHERE NOT EXISTS (SELECT 1 FROM stream_settings WHERE setting_key = 'youtube_video_id');

INSERT INTO stream_settings (setting_key, setting_value, description)
SELECT 'stream_title', 'Reddy Anna Andar Bahar Live', 'Title for the stream'
WHERE NOT EXISTS (SELECT 1 FROM stream_settings WHERE setting_key = 'stream_title');

INSERT INTO stream_settings (setting_key, setting_value, description)
SELECT 'stream_status', 'offline', 'Current stream status (online/offline)'
WHERE NOT EXISTS (SELECT 1 FROM stream_settings WHERE setting_key = 'stream_status');

-- ============================================
-- DEFAULT DATA - ADMIN DASHBOARD SETTINGS
-- ============================================

INSERT INTO admin_dashboard_settings (setting_key, setting_value, description)
VALUES
('auto_refresh_interval', '30', 'Auto-refresh interval in seconds for dashboard data'),
('default_request_limit', '50', 'Default number of requests to show per page'),
('enable_real_time_notifications', 'true', 'Enable real-time WebSocket notifications'),
('default_priority', '3', 'Default priority for new requests'),
('require_admin_approval', 'true', 'Require admin approval for balance updates'),
('notification_sound', 'true', 'Play sound for new high-priority requests')
ON CONFLICT (setting_key) DO NOTHING;

-- ============================================
-- STREAM CONFIGURATION DATA
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
-- DATABASE VIEWS
-- ============================================

-- Admin Requests Summary View
CREATE OR REPLACE VIEW admin_requests_summary AS
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
-- DATABASE FUNCTIONS
-- ============================================

-- Function to handle request status changes with audit logging
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
    -- Get current status
    SELECT status INTO v_old_status FROM admin_requests WHERE id = p_request_id;
    
    -- Update the request
    UPDATE admin_requests 
    SET status = p_new_status,
        admin_id = p_admin_id,
        admin_notes = p_notes,
        updated_at = NOW(),
        processed_at = CASE WHEN p_new_status IN ('approved', 'rejected') THEN NOW() ELSE NULL END
    WHERE id = p_request_id
    RETURNING * INTO v_request;
    
    -- Log the audit trail
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

-- Function to update user balance and mark request as processed
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
-- COMPLETION MESSAGE
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '✅ Comprehensive database initialization complete!';
  RAISE NOTICE '📊 All tables created successfully';
  RAISE NOTICE '🔐 Admin account created:';
  RAISE NOTICE '   Username: admin';
  RAISE NOTICE '   Password: Admin@123';
  RAISE NOTICE '🎮 Game settings configured';
  RAISE NOTICE '📺 Stream settings configured';
  RAISE NOTICE '📋 Admin requests system ready';
  RAISE NOTICE '🔄 WhatsApp integration tables created';
  RAISE NOTICE '🎬 Dual streaming (RTMP/WebRTC) configured';
  RAISE NOTICE '📈 Analytics tables ready';
  RAISE NOTICE '🔒 Security features implemented';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  IMPORTANT: Change the admin password after first login!';
  RAISE NOTICE '📝 All database constraints, functions, and views are operational';
END $$;