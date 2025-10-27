-- Andar Bahar Database Schema Setup
-- Run these queries in your Supabase SQL Editor

-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    phone TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    full_name TEXT,
    role TEXT DEFAULT 'player',
    status TEXT DEFAULT 'active',
    balance TEXT DEFAULT '100000.00',
    total_winnings TEXT DEFAULT '0.00',
    total_losses TEXT DEFAULT '0.00',
    games_played INTEGER DEFAULT 0,
    games_won INTEGER DEFAULT 0,
    phone_verified BOOLEAN DEFAULT false,
    referral_code TEXT,
    original_deposit_amount TEXT DEFAULT '0.00',
    deposit_bonus_available TEXT DEFAULT '0.00',
    referral_bonus_available TEXT DEFAULT '0.00',
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create admin_credentials table
CREATE TABLE IF NOT EXISTS admin_credentials (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role VARCHAR(50) DEFAULT 'admin',
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create game_sessions table
CREATE TABLE IF NOT EXISTS game_sessions (
    game_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    opening_card TEXT,
    phase TEXT DEFAULT 'idle',
    current_timer INTEGER DEFAULT 30,
    current_round INTEGER DEFAULT 1,
    andar_cards TEXT[] DEFAULT '{}',
    bahar_cards TEXT[] DEFAULT '{}',
    status TEXT DEFAULT 'active',
    winner TEXT,
    winning_card TEXT,
    winning_round INTEGER,
    total_andar_bets NUMERIC DEFAULT 0,
    total_bahar_bets NUMERIC DEFAULT 0,
    total_payouts NUMERIC DEFAULT 0,
    started_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create player_bets table
CREATE TABLE IF NOT EXISTS player_bets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT REFERENCES users(id),
    game_id UUID REFERENCES game_sessions(game_id),
    round TEXT,
    side TEXT CHECK (side IN ('andar', 'bahar')),
    amount NUMERIC,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create dealt_cards table
CREATE TABLE IF NOT EXISTS dealt_cards (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    game_id UUID REFERENCES game_sessions(game_id),
    card TEXT,
    side TEXT CHECK (side IN ('andar', 'bahar')),
    position INTEGER,
    is_winning_card BOOLEAN DEFAULT FALSE,
    dealt_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create game_history table
CREATE TABLE IF NOT EXISTS game_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    game_id UUID REFERENCES game_sessions(game_id),
    opening_card TEXT,
    winner TEXT,
    winning_card TEXT,
    total_cards INTEGER DEFAULT 0,
    round INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create stream_settings table
CREATE TABLE IF NOT EXISTS stream_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    setting_key TEXT UNIQUE NOT NULL,
    setting_value TEXT,
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create game_settings table
CREATE TABLE IF NOT EXISTS game_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    setting_key TEXT UNIQUE NOT NULL,
    setting_value TEXT,
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create game_statistics table
CREATE TABLE IF NOT EXISTS game_statistics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    game_id UUID REFERENCES game_sessions(game_id),
    total_players INTEGER DEFAULT 0,
    total_bets NUMERIC DEFAULT 0,
    total_winnings NUMERIC DEFAULT 0,
    house_earnings NUMERIC DEFAULT 0,
    andar_bets_count INTEGER DEFAULT 0,
    bahar_bets_count INTEGER DEFAULT 0,
    andar_total_bet NUMERIC DEFAULT 0,
    bahar_total_bet NUMERIC DEFAULT 0,
    profit_loss NUMERIC DEFAULT 0,
    profit_loss_percentage NUMERIC DEFAULT 0,
    house_payout NUMERIC DEFAULT 0,
    game_duration INTEGER DEFAULT 0,
    unique_players INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create daily_game_statistics table
CREATE TABLE IF NOT EXISTS daily_game_statistics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    date DATE UNIQUE,
    total_games INTEGER DEFAULT 0,
    total_bets NUMERIC DEFAULT 0,
    total_payouts NUMERIC DEFAULT 0,
    total_revenue NUMERIC DEFAULT 0,
    profit_loss NUMERIC DEFAULT 0,
    profit_loss_percentage NUMERIC DEFAULT 0,
    unique_players INTEGER DEFAULT 0,
    peak_bets_hour INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create monthly_game_statistics table
CREATE TABLE IF NOT EXISTS monthly_game_statistics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    month_year TEXT UNIQUE, -- Format: YYYY-MM
    total_games INTEGER DEFAULT 0,
    total_bets NUMERIC DEFAULT 0,
    total_payouts NUMERIC DEFAULT 0,
    total_revenue NUMERIC DEFAULT 0,
    profit_loss NUMERIC DEFAULT 0,
    profit_loss_percentage NUMERIC DEFAULT 0,
    unique_players INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create yearly_game_statistics table
CREATE TABLE IF NOT EXISTS yearly_game_statistics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    year INTEGER UNIQUE,
    total_games INTEGER DEFAULT 0,
    total_bets NUMERIC DEFAULT 0,
    total_payouts NUMERIC DEFAULT 0,
    total_revenue NUMERIC DEFAULT 0,
    profit_loss NUMERIC DEFAULT 0,
    profit_loss_percentage NUMERIC DEFAULT 0,
    unique_players INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create user_referrals table
CREATE TABLE IF NOT EXISTS user_referrals (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    referrer_user_id TEXT REFERENCES users(id),
    referred_user_id TEXT REFERENCES users(id),
    deposit_amount NUMERIC,
    bonus_amount NUMERIC,
    bonus_applied BOOLEAN DEFAULT FALSE,
    bonus_applied_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create user_transactions table
CREATE TABLE IF NOT EXISTS user_transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT REFERENCES users(id),
    transaction_type TEXT,
    amount NUMERIC,
    balance_before NUMERIC,
    balance_after NUMERIC,
    reference_id TEXT,
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Insert default game settings
INSERT INTO game_settings (setting_key, setting_value, description) VALUES
('minBet', '1000', 'Minimum bet amount'),
('maxBet', '100000', 'Maximum bet amount'),
('timerDuration', '30', 'Timer duration in seconds'),
('default_deposit_bonus_percent', '5', 'Default deposit bonus percentage'),
('referral_bonus_percent', '1', 'Referral bonus percentage'),
('conditional_bonus_threshold', '30', 'Conditional bonus threshold')
ON CONFLICT (setting_key) DO NOTHING;

-- Insert default stream settings
INSERT INTO stream_settings (setting_key, setting_value, description) VALUES
('restream_rtmp_url', '', 'Restream RTMP URL'),
('restream_stream_key', '', 'Restream stream key'),
('stream_title', 'Andar Bahar Live', 'Stream title'),
('stream_status', 'offline', 'Stream status (live/offline)'),
('last_stream_check', NOW(), 'Last stream check timestamp')
ON CONFLICT (setting_key) DO NOTHING;

-- Create an initial admin user (username: admin, password: admin123 - hash below)
-- Password hash for "admin123": $2b$12$Vc738883Bz.Rn6y4N5pP.eNl93jBQ.aJ5sXK3v3jVcQFpNQ7vZ5XW
INSERT INTO admin_credentials (username, password_hash, role) VALUES
('admin', '$2b$12$Vc738883Bz.Rn6y4N5pP.eNl93jBQ.aJ5sXK3v3jVcQFpNQ7vZ5XW', 'admin')
ON CONFLICT (username) DO NOTHING;

-- Disable Row Level Security for development (remove this in production!)
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

-- Grant all privileges to service role (for development only)
GRANT ALL PRIVILEGES ON TABLE users TO service_role;
GRANT ALL PRIVILEGES ON TABLE admin_credentials TO service_role;
GRANT ALL PRIVILEGES ON TABLE game_sessions TO service_role;
GRANT ALL PRIVILEGES ON TABLE player_bets TO service_role;
GRANT ALL PRIVILEGES ON TABLE dealt_cards TO service_role;
GRANT ALL PRIVILEGES ON TABLE game_history TO service_role;
GRANT ALL PRIVILEGES ON TABLE stream_settings TO service_role;
GRANT ALL PRIVILEGES ON TABLE game_settings TO service_role;
GRANT ALL PRIVILEGES ON TABLE game_statistics TO service_role;
GRANT ALL PRIVILEGES ON TABLE daily_game_statistics TO service_role;
GRANT ALL PRIVILEGES ON TABLE monthly_game_statistics TO service_role;
GRANT ALL PRIVILEGES ON TABLE yearly_game_statistics TO service_role;
GRANT ALL PRIVILEGES ON TABLE user_referrals TO service_role;
GRANT ALL PRIVILEGES ON TABLE user_transactions TO service_role;