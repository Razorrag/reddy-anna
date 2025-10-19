-- =============================================
-- Reddy Anna Andar Bahar Game - Unified Production Schema
-- =============================================
-- This schema consolidates both previous versions with proper structure
-- Run this in your Supabase SQL editor to set up the database

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- USERS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS users (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password TEXT NOT NULL, -- Will be hashed with bcrypt
    full_name VARCHAR(150),
    mobile VARCHAR(20) UNIQUE,
    email VARCHAR(255) UNIQUE,
    balance DECIMAL(15,2) DEFAULT 1000000.00,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_mobile ON users(mobile);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- =============================================
-- GAME SETTINGS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS game_settings (
    setting_key VARCHAR(100) PRIMARY KEY,
    setting_value TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default game settings
INSERT INTO game_settings (setting_key, setting_value, description) VALUES
('minBet', '1000', 'Minimum bet amount required per round'),
('maxBet', '50000', 'Maximum bet amount allowed per round'),
('timerDuration', '30', 'Timer duration for each round in seconds'),
('openingCard', 'A♠', 'Current opening card for the game')
ON CONFLICT (setting_key) DO UPDATE SET
    setting_value = EXCLUDED.setting_value,
    updated_at = NOW();

-- =============================================
-- STREAM SETTINGS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS stream_settings (
    setting_key VARCHAR(100) PRIMARY KEY,
    setting_value TEXT,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default stream settings
INSERT INTO stream_settings (setting_key, setting_value, description) VALUES
('stream_url', '/hero images/uhd_30fps.mp4', 'Default stream URL'),
('stream_title', 'Andar Bahar Live Game', 'Stream title'),
('stream_status', 'live', 'Current stream status (live/offline/maintenance)'),
('stream_type', 'video', 'Stream type: video, rtmp, or embed'),
('stream_description', 'Live Andar Bahar game streaming', 'Stream description')
ON CONFLICT (setting_key) DO UPDATE SET
    setting_value = EXCLUDED.setting_value,
    updated_at = NOW();

-- =============================================
-- GAME SESSIONS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS game_sessions (
    game_id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    opening_card VARCHAR(10),
    phase VARCHAR(20) DEFAULT 'idle' CHECK (phase IN ('idle', 'BETTING_R1', 'DEALING_R1', 'BETTING_R2', 'DEALING_R2', 'CONTINUOUS_DRAW', 'COMPLETE')),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
    current_timer INTEGER DEFAULT 30,
    winner VARCHAR(10) CHECK (winner IN ('andar', 'bahar', NULL)),
    winning_card VARCHAR(10),
    round INTEGER DEFAULT 1,
    winning_round INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_game_sessions_status ON game_sessions(status);
CREATE INDEX IF NOT EXISTS idx_game_sessions_phase ON game_sessions(phase);
CREATE INDEX IF NOT EXISTS idx_game_sessions_created_at ON game_sessions(created_at DESC);

-- =============================================
-- PLAYER BETS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS player_bets (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    game_id UUID NOT NULL REFERENCES game_sessions(game_id) ON DELETE CASCADE,
    round INTEGER NOT NULL CHECK (round IN (1, 2)),
    side VARCHAR(10) NOT NULL CHECK (side IN ('andar', 'bahar')),
    amount DECIMAL(15,2) NOT NULL CHECK (amount > 0),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'won', 'lost', 'refunded')),
    payout_amount DECIMAL(15,2) DEFAULT 0,
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
    game_id UUID NOT NULL REFERENCES game_sessions(game_id) ON DELETE CASCADE,
    card VARCHAR(10) NOT NULL,
    side VARCHAR(10) NOT NULL CHECK (side IN ('andar', 'bahar')),
    position INTEGER NOT NULL,
    is_winning_card BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_dealt_cards_game_id ON dealt_cards(game_id);
CREATE INDEX IF NOT EXISTS idx_dealt_cards_position ON dealt_cards(position);

-- =============================================
-- GAME HISTORY TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS game_history (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    game_id UUID NOT NULL,
    opening_card VARCHAR(10) NOT NULL,
    winner VARCHAR(10) NOT NULL CHECK (winner IN ('andar', 'bahar')),
    winning_card VARCHAR(10) NOT NULL,
    total_cards INTEGER NOT NULL,
    round INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_game_history_winner ON game_history(winner);
CREATE INDEX IF NOT EXISTS idx_game_history_created_at ON game_history(created_at DESC);

-- =============================================
-- USER TRANSACTIONS TABLE (for audit trail)
-- =============================================
CREATE TABLE IF NOT EXISTS user_transactions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('bet', 'win', 'refund', 'deposit', 'withdrawal')),
    amount DECIMAL(15,2) NOT NULL,
    balance_before DECIMAL(15,2) NOT NULL,
    balance_after DECIMAL(15,2) NOT NULL,
    reference_id UUID, -- Links to bet_id or game_id
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_transactions_user_id ON user_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_transactions_type ON user_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_user_transactions_created_at ON user_transactions(created_at DESC);

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
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_game_settings_updated_at ON game_settings;
CREATE TRIGGER update_game_settings_updated_at BEFORE UPDATE ON game_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_stream_settings_updated_at ON stream_settings;
CREATE TRIGGER update_stream_settings_updated_at BEFORE UPDATE ON stream_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_game_sessions_updated_at ON game_sessions;
CREATE TRIGGER update_game_sessions_updated_at BEFORE UPDATE ON game_sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_player_bets_updated_at ON player_bets;
CREATE TRIGGER update_player_bets_updated_at BEFORE UPDATE ON player_bets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================

-- Enable RLS on sensitive tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_bets ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_transactions ENABLE ROW LEVEL SECURITY;

-- Public read access for game data (needed for real-time gameplay)
ALTER TABLE game_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE dealt_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_history ENABLE ROW LEVEL SECURITY;

-- Allow service role to bypass RLS (for server operations)
CREATE POLICY "Service role bypass" ON users FOR ALL USING (true);
CREATE POLICY "Service role bypass bets" ON player_bets FOR ALL USING (true);
CREATE POLICY "Service role bypass transactions" ON user_transactions FOR ALL USING (true);
CREATE POLICY "Service role bypass sessions" ON game_sessions FOR ALL USING (true);
CREATE POLICY "Service role bypass cards" ON dealt_cards FOR ALL USING (true);
CREATE POLICY "Service role bypass history" ON game_history FOR ALL USING (true);

-- =============================================
-- SAMPLE DATA FOR TESTING
-- =============================================

-- Create test users (password: "password123" - will be hashed in application)
INSERT INTO users (username, password, full_name, balance) VALUES
('testplayer1', 'password123', 'Test Player 1', 5000000.00),
('testplayer2', 'password123', 'Test Player 2', 5000000.00),
('admin', 'admin123', 'Admin User', 10000000.00)
ON CONFLICT (username) DO NOTHING;

-- =============================================
-- SUCCESS MESSAGE
-- =============================================
SELECT '🎉 Unified Reddy Anna Database Schema Created Successfully!' as status;
