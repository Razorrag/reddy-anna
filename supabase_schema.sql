-- Supabase Database Schema for Andar Bahar Game

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Users table (updated for phone-based authentication)
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
  last_login TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Admin credentials table
CREATE TABLE IF NOT EXISTS admin_credentials (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(50) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT DEFAULT 'admin',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Game settings table
CREATE TABLE IF NOT EXISTS game_settings (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key VARCHAR(100) NOT NULL UNIQUE,
  setting_value TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Game sessions table
CREATE TABLE IF NOT EXISTS game_sessions (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id VARCHAR(36) NOT NULL UNIQUE,
  opening_card TEXT, -- e.g., "A♠"
  phase TEXT NOT NULL DEFAULT 'waiting', -- waiting, betting, dealing, completed
  status TEXT NOT NULL DEFAULT 'active', -- active, completed, cancelled
  current_timer INTEGER DEFAULT 0,
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
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id VARCHAR(36) NOT NULL,
  card TEXT NOT NULL, -- e.g., "K♥"
  side TEXT NOT NULL, -- andar or bahar
  position INTEGER NOT NULL, -- 1, 2, 3...
  is_winning_card BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Player bets table
CREATE TABLE IF NOT EXISTS player_bets (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(20) NOT NULL,
  game_id VARCHAR(36) NOT NULL,
  round VARCHAR(10) NOT NULL, -- round1, round2
  side TEXT NOT NULL, -- andar or bahar
  amount DECIMAL(15, 2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'active', -- active, won, lost, cancelled
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User transactions table
CREATE TABLE IF NOT EXISTS user_transactions (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
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
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id VARCHAR(36) NOT NULL,
  total_players INTEGER DEFAULT 0,
  total_bets DECIMAL(15, 2) DEFAULT '0.00',
  total_winnings DECIMAL(15, 2) DEFAULT '0.00',
  house_earnings DECIMAL(15, 2) DEFAULT '0.00',
  andar_bets_count INTEGER DEFAULT 0,
  bahar_bets_count INTEGER DEFAULT 0,
  andar_total_bet DECIMAL(15, 2) DEFAULT '0.00',
  bahar_total_bet DECIMAL(15, 2) DEFAULT '0.00',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Game history table
CREATE TABLE IF NOT EXISTS game_history (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
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
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(20) NOT NULL,
  reason TEXT,
  blocked_by VARCHAR(36), -- References admin_credentials.id
  blocked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Stream settings table
CREATE TABLE IF NOT EXISTS stream_settings (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key VARCHAR(100) NOT NULL UNIQUE,
  setting_value TEXT,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User creation log table (for tracking admin-created accounts)
CREATE TABLE IF NOT EXISTS user_creation_log (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
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
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
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

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);
CREATE INDEX IF NOT EXISTS idx_game_sessions_status ON game_sessions(status);
CREATE INDEX IF NOT EXISTS idx_game_sessions_created_at ON game_sessions(created_at);
CREATE INDEX IF NOT EXISTS idx_player_bets_user_id ON player_bets(user_id);
CREATE INDEX IF NOT EXISTS idx_player_bets_game_id ON player_bets(game_id);
CREATE INDEX IF NOT EXISTS idx_player_bets_created_at ON player_bets(created_at);
CREATE INDEX IF NOT EXISTS idx_dealt_cards_game_id ON dealt_cards(game_id);
CREATE INDEX IF NOT EXISTS idx_user_transactions_user_id ON user_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_transactions_created_at ON user_transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_game_history_created_at ON game_history(created_at);

-- Insert default admin user (username: admin, password: admin123)
-- Password 'admin123' hashed using bcrypt: $2a$12$66m93u7Z5M6.y5UyWj0K2e0VWYzQ5Q2vQ5Q2vQ5Q2vQ5Q2vQ5Q2vQ
INSERT INTO admin_credentials (username, password_hash, role) 
SELECT 'admin', '$2a$12$66m93u7Z5M6.y5UyWj0K2e0VWYzQ5Q2vQ5Q2vQ5Q2vQ5Q2vQ5Q2vQ', 'admin'
WHERE NOT EXISTS (SELECT 1 FROM admin_credentials WHERE username = 'admin');

-- Insert default game settings
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
SELECT 'default_starting_balance', '100000', 'Default starting balance for new users'
WHERE NOT EXISTS (SELECT 1 FROM game_settings WHERE setting_key = 'default_starting_balance');

INSERT INTO game_settings (setting_key, setting_value, description)
SELECT 'house_commission_rate', '0.05', 'House commission rate (0.05 = 5%)'
WHERE NOT EXISTS (SELECT 1 FROM game_settings WHERE setting_key = 'house_commission_rate');

INSERT INTO game_settings (setting_key, setting_value, description)
SELECT 'admin_whatsapp_number', '918686886632', 'Admin WhatsApp number for user requests'
WHERE NOT EXISTS (SELECT 1 FROM game_settings WHERE setting_key = 'admin_whatsapp_number');

-- Insert default stream settings
INSERT INTO stream_settings (setting_key, setting_value, description)
SELECT 'restream_rtmp_url', '', 'RTMP URL for Restream.io'
WHERE NOT EXISTS (SELECT 1 FROM stream_settings WHERE setting_key = 'restream_rtmp_url');

INSERT INTO stream_settings (setting_key, setting_value, description)
SELECT 'restream_stream_key', '', 'Stream key for Restream.io'
WHERE NOT EXISTS (SELECT 1 FROM stream_settings WHERE setting_key = 'restream_stream_key');

INSERT INTO stream_settings (setting_key, setting_value, description)
SELECT 'stream_title', 'Andar Bahar Live', 'Title for the stream'
WHERE NOT EXISTS (SELECT 1 FROM stream_settings WHERE setting_key = 'stream_title');

INSERT INTO stream_settings (setting_key, setting_value, description)
SELECT 'stream_status', 'offline', 'Current stream status'
WHERE NOT EXISTS (SELECT 1 FROM stream_settings WHERE setting_key = 'stream_status');

-- Enhanced game_statistics table with profit/loss fields
ALTER TABLE game_statistics ADD COLUMN IF NOT EXISTS profit_loss DECIMAL(15, 2) DEFAULT '0.00';
ALTER TABLE game_statistics ADD COLUMN IF NOT EXISTS profit_loss_percentage DECIMAL(5, 2) DEFAULT '0.00';
ALTER TABLE game_statistics ADD COLUMN IF NOT EXISTS house_payout DECIMAL(15, 2) DEFAULT '0.00';
ALTER TABLE game_statistics ADD COLUMN IF NOT EXISTS game_duration INTEGER DEFAULT 0;
ALTER TABLE game_statistics ADD COLUMN IF NOT EXISTS unique_players INTEGER DEFAULT 0;

-- Daily game statistics table
CREATE TABLE IF NOT EXISTS daily_game_statistics (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
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
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  month_year VARCHAR(7) NOT NULL, -- Format: YYYY-MM
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
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  year INTEGER NOT NULL,
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

-- Additional indexes for analytics performance
CREATE INDEX IF NOT EXISTS idx_daily_stats_date ON daily_game_statistics(date);
CREATE INDEX IF NOT EXISTS idx_monthly_stats_month_year ON monthly_game_statistics(month_year);
CREATE INDEX IF NOT EXISTS idx_yearly_stats_year ON yearly_game_statistics(year);
CREATE INDEX IF NOT EXISTS idx_game_stats_created_at ON game_statistics(created_at);
CREATE INDEX IF NOT EXISTS idx_game_stats_profit_loss ON game_statistics(profit_loss);