-- =============================================
-- Reddy Anna Andar Bahar Game - Supabase Schema
-- =============================================
-- Clean, comprehensive database schema for the Andar Bahar game
-- Run this in your Supabase SQL editor to set up the database

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- USERS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS users (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    full_name VARCHAR(150) NOT NULL,
    mobile VARCHAR(20) NOT NULL UNIQUE,
    email VARCHAR(255) UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    referral_code VARCHAR(64),
    date_of_birth DATE,
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    balance DECIMAL(15,2) DEFAULT 0.00,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_mobile ON users(mobile);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_referral_code ON users(referral_code);

-- =============================================
-- ADMINS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS admins (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    full_name VARCHAR(150) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'admin' CHECK (role IN ('super_admin', 'admin', 'moderator')),
    is_active BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_admins_username ON admins(username);
CREATE INDEX IF NOT EXISTS idx_admins_email ON admins(email);

-- =============================================
-- GAME SETTINGS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS game_settings (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    setting_key VARCHAR(100) NOT NULL UNIQUE,
    setting_value TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default game settings
INSERT INTO game_settings (setting_key, setting_value, description) VALUES
('max_bet_amount', '50000', 'Maximum bet amount allowed per round'),
('min_bet_amount', '1000', 'Minimum bet amount required per round'),
('game_timer', '30', 'Timer duration for each round in seconds'),
('opening_card', 'A♠', 'Current opening card for the game')
ON CONFLICT (setting_key) DO UPDATE SET
    setting_value = EXCLUDED.setting_value,
    updated_at = NOW();

-- =============================================
-- STREAM SETTINGS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS stream_settings (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    setting_key VARCHAR(100) NOT NULL UNIQUE,
    setting_value TEXT,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default stream settings
INSERT INTO stream_settings (setting_key, setting_value, description) VALUES
('stream_url', 'hero images/uhd_30fps.mp4', 'Default stream URL for offline status'),
('stream_title', 'Andar Bahar Live Game', 'Stream title'),
('stream_status', 'offline', 'Current stream status (live/offline/maintenance)'),
('stream_description', 'Live Andar Bahar game streaming', 'Stream description'),
('stream_quality', '720p', 'Stream quality setting'),
('stream_delay', '0', 'Stream delay in seconds'),
('backup_stream_url', '', 'Backup stream URL'),
('stream_embed_code', '', 'Custom embed code for live streaming'),
('rtmp_url', 'rtmps://live.restream.io:1937/live', 'RTMP server URL for streaming'),
('rtmp_stream_key', 're_10541509_eventd4960ba1734c49369fc0d114295801a0', 'RTMP stream key for live streaming'),
('stream_type', 'video', 'Stream type: video, rtmp, or embed')
ON CONFLICT (setting_key) DO UPDATE SET
    setting_value = EXCLUDED.setting_value,
    updated_at = NOW();

-- =============================================
-- GAME SESSIONS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS game_sessions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    game_id VARCHAR(100) NOT NULL UNIQUE,
    opening_card VARCHAR(10),
    phase VARCHAR(20) DEFAULT 'waiting' CHECK (phase IN ('waiting', 'betting', 'dealing', 'completed')),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
    current_timer INTEGER DEFAULT 0,
    winner VARCHAR(10),
    winning_card VARCHAR(10),
    total_cards INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_game_sessions_game_id ON game_sessions(game_id);
CREATE INDEX IF NOT EXISTS idx_game_sessions_phase ON game_sessions(phase);
CREATE INDEX IF NOT EXISTS idx_game_sessions_status ON game_sessions(status);

-- =============================================
-- PLAYER BETS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS player_bets (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    game_id VARCHAR(100) NOT NULL,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    round VARCHAR(10) NOT NULL CHECK (round IN ('round1', 'round2')),
    side VARCHAR(10) NOT NULL CHECK (side IN ('andar', 'bahar')),
    amount DECIMAL(15,2) NOT NULL,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'won', 'lost', 'cancelled')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_player_bets_game_id ON player_bets(game_id);
CREATE INDEX IF NOT EXISTS idx_player_bets_user_id ON player_bets(user_id);
CREATE INDEX IF NOT EXISTS idx_player_bets_round ON player_bets(round);
CREATE INDEX IF NOT EXISTS idx_player_bets_side ON player_bets(side);
CREATE INDEX IF NOT EXISTS idx_player_bets_status ON player_bets(status);

-- =============================================
-- DEALT CARDS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS dealt_cards (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    game_id VARCHAR(100) NOT NULL,
    card VARCHAR(10) NOT NULL,
    side VARCHAR(10) NOT NULL CHECK (side IN ('andar', 'bahar')),
    position INTEGER NOT NULL,
    is_winning_card BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_dealt_cards_game_id ON dealt_cards(game_id);
CREATE INDEX IF NOT EXISTS idx_dealt_cards_side ON dealt_cards(side);
CREATE INDEX IF NOT EXISTS idx_dealt_cards_position ON dealt_cards(position);

-- =============================================
-- USER TRANSACTIONS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS user_transactions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('deposit', 'withdrawal', 'bet', 'win', 'loss', 'bonus')),
    amount DECIMAL(15,2) NOT NULL,
    balance_before DECIMAL(15,2) NOT NULL,
    balance_after DECIMAL(15,2) NOT NULL,
    reference_id VARCHAR(100),
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_transactions_user_id ON user_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_transactions_type ON user_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_user_transactions_created_at ON user_transactions(created_at);

-- =============================================
-- GAME STATISTICS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS game_statistics (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    game_id VARCHAR(100) NOT NULL,
    total_players INTEGER DEFAULT 0,
    total_bets DECIMAL(15,2) DEFAULT 0,
    total_winnings DECIMAL(15,2) DEFAULT 0,
    house_earnings DECIMAL(15,2) DEFAULT 0,
    andar_bets_count INTEGER DEFAULT 0,
    bahar_bets_count INTEGER DEFAULT 0,
    andar_total_bet DECIMAL(15,2) DEFAULT 0,
    bahar_total_bet DECIMAL(15,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_game_statistics_game_id ON game_statistics(game_id);
CREATE INDEX IF NOT EXISTS idx_game_statistics_created_at ON game_statistics(created_at);

-- =============================================
-- GAME HISTORY TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS game_history (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    game_id VARCHAR(100) NOT NULL,
    opening_card VARCHAR(10) NOT NULL,
    winner VARCHAR(10) NOT NULL CHECK (winner IN ('andar', 'bahar')),
    winning_card VARCHAR(10) NOT NULL,
    total_cards INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_game_history_game_id ON game_history(game_id);
CREATE INDEX IF NOT EXISTS idx_game_history_winner ON game_history(winner);
CREATE INDEX IF NOT EXISTS idx_game_history_created_at ON game_history(created_at);

-- =============================================
-- BLOCKED USERS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS blocked_users (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reason TEXT,
    blocked_by UUID REFERENCES admins(id),
    blocked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_blocked_users_user_id ON blocked_users(user_id);
CREATE INDEX IF NOT EXISTS idx_blocked_users_blocked_at ON blocked_users(blocked_at);

-- =============================================
-- DEFAULT ADMIN ACCOUNTS
-- =============================================
-- Insert default admin accounts (passwords are already hashed)
INSERT INTO admins (username, email, full_name, password_hash, role, is_active) VALUES
('admin', 'admin@reddyanna.com', 'System Administrator', '$2a$10$NffV80ge6uVdYo5ltJsSk.dLTX8a/NWCkhYohvq1ndx0K3dzelQdG', 'super_admin', TRUE),
('reddy', 'reddy@reddyanna.com', 'Reddy Anna', '$2a$10$zIWYFvKfxiGK8JCeoJt9Y.EOKY3mXQX1C3Bptir7/uJOjJ0hu1VFO', 'admin', TRUE),
('superadmin', 'super@reddyanna.com', 'Super Admin', '$2a$10$NaoVEEgRDeudm23XS3W2geinQIYuAkmbmUI2RrmYTwoY0v1FUK8xq', 'super_admin', TRUE)
ON CONFLICT (username) DO UPDATE SET
    email = EXCLUDED.email,
    is_active = TRUE,
    updated_at = NOW();

-- =============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_bets ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE dealt_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_statistics ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_history ENABLE ROW LEVEL SECURITY;

-- Users can only see their own data
CREATE POLICY "Users can view own profile" ON users
    FOR SELECT USING (auth.uid()::text = id::text);

CREATE POLICY "Users can update own profile" ON users
    FOR UPDATE USING (auth.uid()::text = id::text);

-- Users can only see their own bets
CREATE POLICY "Users can view own bets" ON player_bets
    FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can insert own bets" ON player_bets
    FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

-- Users can only see their own transactions
CREATE POLICY "Users can view own transactions" ON user_transactions
    FOR SELECT USING (auth.uid()::text = user_id::text);

-- Everyone can view game sessions (for live game data)
CREATE POLICY "Anyone can view game sessions" ON game_sessions
    FOR SELECT USING (true);

-- Everyone can view dealt cards (for live game data)
CREATE POLICY "Anyone can view dealt cards" ON dealt_cards
    FOR SELECT USING (true);

-- Everyone can view game statistics
CREATE POLICY "Anyone can view game statistics" ON game_statistics
    FOR SELECT USING (true);

-- Everyone can view game history
CREATE POLICY "Anyone can view game history" ON game_history
    FOR SELECT USING (true);

-- Only admins can modify game settings
CREATE POLICY "Admins can manage game settings" ON game_settings
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM admins
            WHERE id::text = auth.uid()::text
            AND is_active = TRUE
        )
    );

-- Only admins can manage stream settings
CREATE POLICY "Admins can manage stream settings" ON stream_settings
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM admins
            WHERE id::text = auth.uid()::text
            AND is_active = TRUE
        )
    );

-- Only admins can manage game sessions
CREATE POLICY "Admins can manage game sessions" ON game_sessions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM admins
            WHERE id::text = auth.uid()::text
            AND is_active = TRUE
        )
    );

-- Only admins can manage dealt cards
CREATE POLICY "Admins can manage dealt cards" ON dealt_cards
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM admins
            WHERE id::text = auth.uid()::text
            AND is_active = TRUE
        )
    );

-- =============================================
-- FUNCTIONS AND TRIGGERS
-- =============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_admins_updated_at BEFORE UPDATE ON admins
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_game_settings_updated_at BEFORE UPDATE ON game_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_stream_settings_updated_at BEFORE UPDATE ON stream_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_game_sessions_updated_at BEFORE UPDATE ON game_sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_player_bets_updated_at BEFORE UPDATE ON player_bets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- SAMPLE DATA (Optional)
-- =============================================

-- Create a sample user for testing
-- Password: "password123"
INSERT INTO users (full_name, mobile, email, password_hash, balance) VALUES
('Test User', '9999999999', 'test@reddyanna.com', '$2a$10$NffV80ge6uVdYo5ltJsSk.dLTX8a/NWCkhYohvq1ndx0K3dzelQdG', 10000.00)
ON CONFLICT (mobile) DO NOTHING;

-- =============================================
-- SUCCESS MESSAGE
-- =============================================
-- If you see this message, the schema has been created successfully!
SELECT '🎉 Reddy Anna Andar Bahar Database Schema Created Successfully!' as status;
