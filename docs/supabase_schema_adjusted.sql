-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    balance INTEGER NOT NULL DEFAULT 1000000
);

-- Game settings table
CREATE TABLE IF NOT EXISTS game_settings (
    setting_key VARCHAR(255) PRIMARY KEY,
    setting_value TEXT NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Game sessions table
CREATE TABLE IF NOT EXISTS game_sessions (
    game_id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    opening_card TEXT,
    phase TEXT NOT NULL DEFAULT 'idle',
    current_timer INTEGER DEFAULT 30,
    status TEXT NOT NULL DEFAULT 'active',
    winner TEXT,
    winning_card TEXT,
    round INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Dealt cards table
CREATE TABLE IF NOT EXISTS dealt_cards (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    game_id UUID NOT NULL,
    card TEXT NOT NULL,
    side TEXT NOT NULL,
    position INTEGER NOT NULL,
    is_winning_card BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Player bets table
CREATE TABLE IF NOT EXISTS player_bets (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL,
    game_id UUID NOT NULL,
    round INTEGER NOT NULL,
    side TEXT NOT NULL,
    amount INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Stream settings table
CREATE TABLE IF NOT EXISTS stream_settings (
    setting_key VARCHAR(255) PRIMARY KEY,
    setting_value TEXT NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Game history table
CREATE TABLE IF NOT EXISTS game_history (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    game_id UUID NOT NULL,
    opening_card TEXT NOT NULL,
    winner TEXT NOT NULL,
    winning_card TEXT NOT NULL,
    total_cards INTEGER NOT NULL,
    round INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Insert default game settings
INSERT INTO game_settings (setting_key, setting_value) VALUES
('minBet', '1000'),
('maxBet', '50000'),
('timerDuration', '30'),
('openingCard', 'A♠')
ON CONFLICT (setting_key) DO NOTHING;

-- Insert default stream settings
INSERT INTO stream_settings (setting_key, setting_value) VALUES
('stream_url', '/hero images/uhd_30fps.mp4'),
('stream_title', 'Andar Bahar Live Game'),
('stream_status', 'live'),
('stream_type', 'video')
ON CONFLICT (setting_key) DO NOTHING;