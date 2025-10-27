-- ============================================
-- REDDY ANNA ANDAR BAHAR GAME - SUPABASE SCHEMA
-- Complete Database Initialization Script
-- ============================================
-- Run this script in your Supabase SQL Editor
-- This will create all tables, indexes, and default data
-- ============================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- CORE TABLES
-- ============================================

-- Users table (phone-based authentication)
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(20) PRIMARY KEY, -- Phone number as ID
  phone VARCHAR(15) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  full_name TEXT,
  role TEXT DEFAULT 'player',
  status TEXT DEFAULT 'active',
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
  role TEXT DEFAULT 'admin',
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
  phase TEXT NOT NULL DEFAULT 'idle', -- idle, betting, dealing, complete
  status TEXT NOT NULL DEFAULT 'active', -- active, completed, cancelled
  current_timer INTEGER DEFAULT 30,
  current_round INTEGER DEFAULT 1,
  andar_cards TEXT[] DEFAULT '{}',
  bahar_cards TEXT[] DEFAULT '{}',
  winner TEXT, -- andar or bahar
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
  side TEXT NOT NULL, -- andar or bahar
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
  side TEXT NOT NULL, -- andar or bahar
  amount DECIMAL(15, 2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, active, won, lost, cancelled
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User transactions table
CREATE TABLE IF NOT EXISTS user_transactions (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id VARCHAR(20) NOT NULL,
  transaction_type TEXT NOT NULL, -- deposit, withdrawal, bet, win, loss, bonus
  amount DECIMAL(15, 2) NOT NULL,
  balance_before DECIMAL(15, 2) NOT NULL,
  balance_after DECIMAL(15, 2) NOT NULL,
  reference_id VARCHAR(50),
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
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
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Game history table
CREATE TABLE IF NOT EXISTS game_history (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  game_id VARCHAR(36) NOT NULL,
  opening_card TEXT NOT NULL,
  winner TEXT NOT NULL, -- andar or bahar
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
  blocked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
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
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
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
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- WhatsApp messages table (for tracking user requests to admin)
CREATE TABLE IF NOT EXISTS whatsapp_messages (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id VARCHAR(20) NOT NULL,
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
  response_by VARCHAR(20)
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

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);
CREATE INDEX IF NOT EXISTS idx_users_referral_code_generated ON users(referral_code_generated);

CREATE INDEX IF NOT EXISTS idx_game_sessions_status ON game_sessions(status);
CREATE INDEX IF NOT EXISTS idx_game_sessions_phase ON game_sessions(phase);
CREATE INDEX IF NOT EXISTS idx_game_sessions_created_at ON game_sessions(created_at);
CREATE INDEX IF NOT EXISTS idx_game_sessions_game_id ON game_sessions(game_id);

CREATE INDEX IF NOT EXISTS idx_player_bets_user_id ON player_bets(user_id);
CREATE INDEX IF NOT EXISTS idx_player_bets_game_id ON player_bets(game_id);
CREATE INDEX IF NOT EXISTS idx_player_bets_status ON player_bets(status);
CREATE INDEX IF NOT EXISTS idx_player_bets_created_at ON player_bets(created_at);

CREATE INDEX IF NOT EXISTS idx_dealt_cards_game_id ON dealt_cards(game_id);
CREATE INDEX IF NOT EXISTS idx_dealt_cards_position ON dealt_cards(position);

CREATE INDEX IF NOT EXISTS idx_user_transactions_user_id ON user_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_transactions_type ON user_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_user_transactions_created_at ON user_transactions(created_at);

CREATE INDEX IF NOT EXISTS idx_game_history_created_at ON game_history(created_at);
CREATE INDEX IF NOT EXISTS idx_game_history_game_id ON game_history(game_id);

CREATE INDEX IF NOT EXISTS idx_game_statistics_game_id ON game_statistics(game_id);
CREATE INDEX IF NOT EXISTS idx_game_statistics_created_at ON game_statistics(created_at);

CREATE INDEX IF NOT EXISTS idx_user_referrals_referrer ON user_referrals(referrer_user_id);
CREATE INDEX IF NOT EXISTS idx_user_referrals_referred ON user_referrals(referred_user_id);

CREATE INDEX IF NOT EXISTS idx_daily_stats_date ON daily_game_statistics(date);
CREATE INDEX IF NOT EXISTS idx_monthly_stats_month_year ON monthly_game_statistics(month_year);
CREATE INDEX IF NOT EXISTS idx_yearly_stats_year ON yearly_game_statistics(year);

-- ============================================
-- DEFAULT DATA - ADMIN ACCOUNT
-- ============================================

-- Insert default admin user
-- Username: admin
-- Password: Admin@123
-- Password hash generated using bcrypt with 10 rounds
INSERT INTO admin_credentials (id, username, password_hash, role, created_at, updated_at) 
VALUES (
  gen_random_uuid()::text,
  'admin',
  '$2b$10$GFwpBgUccj3Al4OqMLMTmukHeQoVymRbog99qaXDKiY6lrm/46iIu',
  'admin',
  NOW(),
  NOW()
) ON CONFLICT (username) DO NOTHING;

-- ============================================
-- DEFAULT DATA - GAME SETTINGS
-- ============================================

INSERT INTO game_settings (setting_key, setting_value, description)
VALUES 
  ('betting_timer_duration', '30', 'Duration of betting phase in seconds'),
  ('round_transition_delay', '2', 'Delay between rounds in seconds'),
  ('min_bet_amount', '1000', 'Minimum bet amount in rupees'),
  ('max_bet_amount', '100000', 'Maximum bet amount in rupees'),
  ('default_starting_balance', '100000', 'Default starting balance for new users (₹100,000)'),
  ('house_commission_rate', '0.05', 'House commission rate (0.05 = 5%)'),
  ('admin_whatsapp_number', '918686886632', 'Admin WhatsApp number for user requests'),
  ('default_deposit_bonus_percent', '5', 'Default deposit bonus percentage'),
  ('referral_bonus_percent', '1', 'Referral bonus percentage'),
  ('conditional_bonus_threshold', '30', 'Conditional bonus threshold percentage')
ON CONFLICT (setting_key) DO NOTHING;

-- ============================================
-- DEFAULT DATA - STREAM SETTINGS
-- ============================================

INSERT INTO stream_settings (setting_key, setting_value, description)
VALUES 
  ('stream_provider', 'youtube', 'Stream provider (youtube, restream, custom)'),
  ('youtube_video_id', 'z7fyLrTL8ng', 'YouTube Live video ID'),
  ('stream_title', 'Reddy Anna Andar Bahar Live', 'Title for the stream'),
  ('stream_status', 'offline', 'Current stream status (online/offline)')
ON CONFLICT (setting_key) DO NOTHING;

-- ============================================
-- COMPLETION MESSAGE
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '✅ Database initialization complete!';
  RAISE NOTICE '📊 All tables created successfully';
  RAISE NOTICE '🔐 Admin account created:';
  RAISE NOTICE '   Username: admin';
  RAISE NOTICE '   Password: Admin@123';
  RAISE NOTICE '🎮 Game settings configured';
  RAISE NOTICE '📺 Stream settings configured';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  IMPORTANT: Change the admin password after first login!';
END $$;
