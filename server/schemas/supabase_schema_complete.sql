-- ============================================
-- REDDY ANNA ANDAR BAHAR GAME - COMPLETE SUPABASE SCHEMA
-- Enhanced Database with Admin Requests & WhatsApp Integration
-- ============================================
-- Run this script in your Supabase SQL Editor
-- This will create all tables, indexes, functions, and default data
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

-- ============================================
-- ADMIN REQUESTS & WHATSAPP INTEGRATION TABLES
-- ============================================

-- Enhanced WhatsApp messages table with admin workflow
CREATE TABLE IF NOT EXISTS whatsapp_messages (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id VARCHAR(20) REFERENCES users(id),
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
  request_status VARCHAR(20) DEFAULT 'pending' CHECK (request_status IN ('pending', 'approved', 'rejected', 'processed')),
  admin_response TEXT,
  admin_id VARCHAR(255),
  balance_updated BOOLEAN DEFAULT FALSE
);

-- Enhanced Admin Requests Table - Central table for managing all types of admin requests
CREATE TABLE IF NOT EXISTS admin_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(20) REFERENCES users(id),
    user_phone VARCHAR(20) NOT NULL,
    request_type VARCHAR(20) NOT NULL 
        CHECK (request_type IN ('deposit', 'withdrawal', 'support', 'balance')),
    amount DECIMAL(15, 2),
    currency VARCHAR(3) DEFAULT 'INR',
    payment_method VARCHAR(50),
    utr_number VARCHAR(100),
    status VARCHAR(20) DEFAULT 'pending'
        CHECK (status IN ('pending', 'approved', 'rejected', 'processing', 'completed')),
    priority INTEGER DEFAULT 3 
        CHECK (priority IN (1, 2, 3)), -- 1=high, 2=medium, 3=low
    admin_notes TEXT,
    admin_id VARCHAR(36) REFERENCES admin_credentials(id),
    whatsapp_message_id VARCHAR(36) REFERENCES whatsapp_messages(id),
    balance_updated BOOLEAN DEFAULT FALSE,
    balance_update_amount DECIMAL(15, 2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE
);

-- Request Audit Trail Table - Complete audit log for all admin actions on requests
CREATE TABLE IF NOT EXISTS request_audit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID REFERENCES admin_requests(id) ON DELETE CASCADE,
    admin_id VARCHAR(36) REFERENCES admin_credentials(id),
    action VARCHAR(50) NOT NULL,
    old_status VARCHAR(20),
    new_status VARCHAR(20),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Admin Dashboard Settings Table - Configuration settings for the admin dashboard
CREATE TABLE IF NOT EXISTS admin_dashboard_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT,
    description TEXT,
    updated_by VARCHAR(36) REFERENCES admin_credentials(id),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
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

-- Admin Requests Indexes
CREATE INDEX IF NOT EXISTS idx_admin_requests_status ON admin_requests(status);
CREATE INDEX IF NOT EXISTS idx_admin_requests_user_id ON admin_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_requests_created_at ON admin_requests(created_at);
CREATE INDEX IF NOT EXISTS idx_admin_requests_priority ON admin_requests(priority);
CREATE INDEX IF NOT EXISTS idx_admin_requests_whatsapp_id ON admin_requests(whatsapp_message_id);

CREATE INDEX IF NOT EXISTS idx_request_audit_request_id ON request_audit(request_id);
CREATE INDEX IF NOT EXISTS idx_request_audit_admin_id ON request_audit(admin_id);
CREATE INDEX IF NOT EXISTS idx_request_audit_created_at ON request_audit(created_at);

CREATE INDEX IF NOT EXISTS idx_daily_stats_date ON daily_game_statistics(date);
CREATE INDEX IF NOT EXISTS idx_monthly_stats_month_year ON monthly_game_statistics(month_year);
CREATE INDEX IF NOT EXISTS idx_yearly_stats_year ON yearly_game_statistics(year);

-- ============================================
-- DEFAULT DATA - ADMIN ACCOUNT
-- ============================================

-- Insert default admin user
-- Username: admin
-- Password: admin123
-- Password hash generated using bcrypt with 12 rounds
-- Hash for 'admin123': $2b$12$ZAn9noQkk7Adv.efdK/77e8BZark6rSz5I5PfoZUo3rjmeegIbg8K
INSERT INTO admin_credentials (id, username, password_hash, role, created_at, updated_at) 
SELECT 
  gen_random_uuid()::text,
  'admin',
  '$2b$12$ZAn9noQkk7Adv.efdK/77e8BZark6rSz5I5PfoZUo3rjmeegIbg8K',
  'admin',
  NOW(),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM admin_credentials WHERE username = 'admin');

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
    p_new_status VARCHAR(20),
    p_notes TEXT DEFAULT NULL
) RETURNS admin_requests AS $$
DECLARE
    v_old_status VARCHAR(20);
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
    p_new_status VARCHAR(20),
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

-- Function to automatically update the updated_at field
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for auto-update timestamps
DROP TRIGGER IF EXISTS update_admin_requests_updated_at ON admin_requests;
CREATE TRIGGER update_admin_requests_updated_at
    BEFORE UPDATE ON admin_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_whatsapp_messages_updated_at ON whatsapp_messages;
CREATE TRIGGER update_whatsapp_messages_updated_at
    BEFORE UPDATE ON whatsapp_messages
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- PERMISSIONS
-- ============================================

-- Grant necessary permissions for admin operations
GRANT SELECT, INSERT, UPDATE ON admin_requests TO supabase_auth_admin;
GRANT SELECT, INSERT ON request_audit TO supabase_auth_admin;
GRANT SELECT, INSERT, UPDATE ON admin_dashboard_settings TO supabase_auth_admin;
GRANT EXECUTE ON FUNCTION update_request_status TO supabase_auth_admin;
GRANT EXECUTE ON FUNCTION update_balance_with_request TO supabase_auth_admin;
GRANT EXECUTE ON FUNCTION update_updated_at_column TO supabase_auth_admin;

-- ============================================
-- COMPLETION MESSAGE
-- ============================================

DO $
BEGIN
  RAISE NOTICE '✅ Database initialization complete!';
  RAISE NOTICE '📊 All tables created successfully';
  RAISE NOTICE '🔐 Admin account created:';
  RAISE NOTICE '   Username: admin';
  RAISE NOTICE '   Password: admin123';
  RAISE NOTICE '🎮 Game settings configured';
  RAISE NOTICE '📺 Stream settings configured';
  RAISE NOTICE '📋 Admin requests system ready';
  RAISE NOTICE '🔄 WhatsApp integration tables created';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  IMPORTANT: Change the admin password after first login!';
  RAISE NOTICE '📝 Sample data can be inserted using admin-requests.sql for testing';
END $;