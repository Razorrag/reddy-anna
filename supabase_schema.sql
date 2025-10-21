-- Supabase Schema for Andar Bahar Game
-- This schema consolidates all required tables for the Andar Bahar game application

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    balance INTEGER NOT NULL DEFAULT 5000000, -- Default balance ₹50,00,000
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Game settings table
CREATE TABLE game_settings (
    setting_key VARCHAR(255) PRIMARY KEY,
    setting_value TEXT NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Game sessions table
CREATE TABLE game_sessions (
    game_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    opening_card TEXT, -- e.g., "A♠"
    phase TEXT NOT NULL DEFAULT 'idle' CHECK (phase IN ('idle', 'betting', 'dealing', 'complete')), -- idle, betting, dealing, complete
    current_timer INTEGER DEFAULT 30,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed')), -- active, completed
    winner TEXT CHECK (winner IN ('andar', 'bahar')), -- andar or bahar
    winning_card TEXT,
    round INTEGER DEFAULT 1, -- Current round
    winning_round INTEGER, -- Round in which winner was found
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Dealt cards table
CREATE TABLE dealt_cards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    game_id UUID NOT NULL,
    card TEXT NOT NULL, -- e.g., "K♥"
    side TEXT NOT NULL CHECK (side IN ('andar', 'bahar')), -- andar or bahar
    position INTEGER NOT NULL, -- 1, 2, 3...
    is_winning_card BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    FOREIGN KEY (game_id) REFERENCES game_sessions(game_id) ON DELETE CASCADE
);

-- Player bets table
CREATE TABLE player_bets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    game_id UUID NOT NULL,
    round INTEGER NOT NULL CHECK (round IN (1, 2, 3)), -- Added: round number (1, 2, or 3)
    side TEXT NOT NULL CHECK (side IN ('andar', 'bahar')), -- andar or bahar
    amount INTEGER NOT NULL CHECK (amount >= 1000 AND amount <= 50000), -- Bet limits
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'won', 'lost')), -- pending, won, lost
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (game_id) REFERENCES game_sessions(game_id) ON DELETE CASCADE
);

-- Stream settings table
CREATE TABLE stream_settings (
    setting_key VARCHAR(255) PRIMARY KEY,
    setting_value TEXT NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Game history table
CREATE TABLE game_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    game_id UUID NOT NULL,
    opening_card TEXT NOT NULL,
    winner TEXT NOT NULL CHECK (winner IN ('andar', 'bahar')), -- andar or bahar
    winning_card TEXT NOT NULL,
    total_cards INTEGER NOT NULL,
    round INTEGER NOT NULL, -- This is now the winning round
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    FOREIGN KEY (game_id) REFERENCES game_sessions(game_id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_game_sessions_phase ON game_sessions(phase);
CREATE INDEX idx_game_sessions_status ON game_sessions(status);
CREATE INDEX idx_dealt_cards_game_id ON dealt_cards(game_id);
CREATE INDEX idx_dealt_cards_side ON dealt_cards(side);
CREATE INDEX idx_player_bets_user_id ON player_bets(user_id);
CREATE INDEX idx_player_bets_game_id ON player_bets(game_id);
CREATE INDEX idx_player_bets_round ON player_bets(round);
CREATE INDEX idx_player_bets_side ON player_bets(side);
CREATE INDEX idx_player_bets_status ON player_bets(status);
CREATE INDEX idx_game_history_created_at ON game_history(created_at);

-- Enable Row Level Security (RLS) if needed for security
-- This is optional and depends on your application's security requirements
-- ALTER TABLE users ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE game_sessions ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE dealt_cards ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE player_bets ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE game_history ENABLE ROW LEVEL SECURITY;

-- Functions for maintaining updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at columns
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_game_sessions_updated_at BEFORE UPDATE ON game_sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_player_bets_updated_at BEFORE UPDATE ON player_bets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Initial game settings
INSERT INTO game_settings (setting_key, setting_value) VALUES
    ('min_bet_amount', '1000'),
    ('max_bet_amount', '50000'),
    ('betting_timer_round1', '30'),
    ('betting_timer_round2', '30'),
    ('game_start_delay', '5'),
    ('default_balance', '5000000');

-- Initial stream settings
INSERT INTO stream_settings (setting_key, setting_value) VALUES
    ('stream_status', 'offline'),
    ('stream_url', ''),
    ('stream_type', 'video'),
    ('stream_title', 'Andar Bahar Live Game'),
    ('stream_description', 'Live Andar Bahar card game stream');