-- 🗄️ SUPABASE DATABASE SCHEMA FOR REDDY ANNA ANDAR BAHAR GAME
-- Run this in Supabase SQL Editor or via supabase db push

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create custom types
CREATE TYPE user_role AS ENUM ('admin', 'player');
CREATE TYPE user_status AS ENUM ('active', 'suspended', 'banned');
CREATE TYPE game_phase AS ENUM ('idle', 'betting', 'dealing', 'complete');
CREATE TYPE bet_side AS ENUM ('andar', 'bahar');
CREATE TYPE bet_status AS ENUM ('pending', 'won', 'lost', 'refunded');
CREATE TYPE payment_type AS ENUM ('deposit', 'withdrawal', 'bet', 'win', 'refund');
CREATE TYPE payment_status AS ENUM ('pending', 'completed', 'failed', 'cancelled');

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    phone VARCHAR(20),
    role user_role DEFAULT 'player',
    status user_status DEFAULT 'active',
    balance DECIMAL(15,2) DEFAULT 10000.00,
    total_winnings DECIMAL(15,2) DEFAULT 0.00,
    total_losses DECIMAL(15,2) DEFAULT 0.00,
    games_played INTEGER DEFAULT 0,
    games_won INTEGER DEFAULT 0,
    referral_code VARCHAR(20) UNIQUE,
    referred_by UUID REFERENCES users(id),
    avatar_url TEXT,
    last_login TIMESTAMP WITH TIME ZONE,
    email_verified BOOLEAN DEFAULT FALSE,
    phone_verified BOOLEAN DEFAULT FALSE,
    two_factor_enabled BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Game sessions table
CREATE TABLE game_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    game_id VARCHAR(100) UNIQUE NOT NULL,
    opening_card VARCHAR(10) NOT NULL,
    phase game_phase DEFAULT 'idle',
    current_round INTEGER DEFAULT 1,
    current_timer INTEGER DEFAULT 0,
    andar_cards TEXT[] DEFAULT '{}',
    bahar_cards TEXT[] DEFAULT '{}',
    winner bet_side,
    winning_card VARCHAR(10),
    winning_round INTEGER,
    total_andar_bets DECIMAL(15,2) DEFAULT 0.00,
    total_bahar_bets DECIMAL(15,2) DEFAULT 0.00,
    total_payouts DECIMAL(15,2) DEFAULT 0.00,
    status VARCHAR(20) DEFAULT 'active',
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Bets table
CREATE TABLE bets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    game_id UUID NOT NULL REFERENCES game_sessions(id) ON DELETE CASCADE,
    round INTEGER NOT NULL CHECK (round >= 1 AND round <= 3),
    side bet_side NOT NULL,
    amount DECIMAL(15,2) NOT NULL CHECK (amount >= 1000 AND amount <= 100000),
    status bet_status DEFAULT 'pending',
    payout_amount DECIMAL(15,2) DEFAULT 0.00,
    placed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    settled_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Dealt cards table
CREATE TABLE dealt_cards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    game_id UUID NOT NULL REFERENCES game_sessions(id) ON DELETE CASCADE,
    card VARCHAR(10) NOT NULL,
    side bet_side NOT NULL,
    position INTEGER NOT NULL,
    is_winning_card BOOLEAN DEFAULT FALSE,
    dealt_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Game history table
CREATE TABLE game_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    game_id VARCHAR(100) NOT NULL,
    opening_card VARCHAR(10) NOT NULL,
    winner bet_side NOT NULL,
    winning_card VARCHAR(10) NOT NULL,
    total_cards INTEGER NOT NULL,
    round INTEGER NOT NULL,
    total_andar_bets DECIMAL(15,2) DEFAULT 0.00,
    total_bahar_bets DECIMAL(15,2) DEFAULT 0.00,
    total_payouts DECIMAL(15,2) DEFAULT 0.00,
    house_profit DECIMAL(15,2) DEFAULT 0.00,
    played_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Transactions table
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type payment_type NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    status payment_status DEFAULT 'pending',
    method VARCHAR(50),
    reference_id VARCHAR(100),
    description TEXT,
    metadata JSONB DEFAULT '{}',
    balance_before DECIMAL(15,2),
    balance_after DECIMAL(15,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User sessions table
CREATE TABLE user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_token VARCHAR(255) UNIQUE NOT NULL,
    refresh_token VARCHAR(255) UNIQUE,
    ip_address INET,
    user_agent TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- System settings table
CREATE TABLE system_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key VARCHAR(100) UNIQUE NOT NULL,
    value TEXT,
    description TEXT,
    is_public BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Site content table
CREATE TABLE site_content (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    page VARCHAR(100) NOT NULL,
    section VARCHAR(100) NOT NULL,
    content TEXT,
    metadata JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(page, section)
);

-- Audit log table
CREATE TABLE audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50),
    resource_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_referral_code ON users(referral_code);

CREATE INDEX idx_game_sessions_game_id ON game_sessions(game_id);
CREATE INDEX idx_game_sessions_phase ON game_sessions(phase);
CREATE INDEX idx_game_sessions_status ON game_sessions(status);
CREATE INDEX idx_game_sessions_created_at ON game_sessions(created_at);

CREATE INDEX idx_bets_user_id ON bets(user_id);
CREATE INDEX idx_bets_game_id ON bets(game_id);
CREATE INDEX idx_bets_status ON bets(status);
CREATE INDEX idx_bets_round ON bets(round);
CREATE INDEX idx_bets_side ON bets(side);
CREATE INDEX idx_bets_created_at ON bets(created_at);

CREATE INDEX idx_dealt_cards_game_id ON dealt_cards(game_id);
CREATE INDEX idx_dealt_cards_side ON dealt_cards(side);
CREATE INDEX idx_dealt_cards_position ON dealt_cards(position);

CREATE INDEX idx_game_history_played_at ON game_history(played_at);
CREATE INDEX idx_game_history_winner ON game_history(winner);

CREATE INDEX idx_transactions_user_id ON transactions(user_id);
CREATE INDEX idx_transactions_type ON transactions(type);
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_transactions_created_at ON transactions(created_at);

CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_session_token ON user_sessions(session_token);
CREATE INDEX idx_user_sessions_expires_at ON user_sessions(expires_at);

CREATE INDEX idx_audit_log_user_id ON audit_log(user_id);
CREATE INDEX idx_audit_log_action ON audit_log(action);
CREATE INDEX idx_audit_log_created_at ON audit_log(created_at);

-- Create updated_at trigger function
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

CREATE TRIGGER update_game_sessions_updated_at BEFORE UPDATE ON game_sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bets_updated_at BEFORE UPDATE ON bets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON transactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_sessions_updated_at BEFORE UPDATE ON user_sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_system_settings_updated_at BEFORE UPDATE ON system_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_site_content_updated_at BEFORE UPDATE ON site_content
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE bets ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

-- Users RLS policies
CREATE POLICY "Users can view own profile" ON users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON users
    FOR UPDATE USING (auth.uid() = id);

-- Bets RLS policies
CREATE POLICY "Users can view own bets" ON bets
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all bets" ON bets
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND role = 'admin'
        )
    );

-- Transactions RLS policies
CREATE POLICY "Users can view own transactions" ON transactions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all transactions" ON transactions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND role = 'admin'
        )
    );

-- User sessions RLS policies
CREATE POLICY "Users can view own sessions" ON user_sessions
    FOR SELECT USING (auth.uid() = user_id);

-- Insert default system settings
INSERT INTO system_settings (key, value, description, is_public) VALUES
('site_name', 'Reddy Anna Andar Bahar', 'Site name', true),
('site_description', 'Play Andar Bahar with Reddy Anna', 'Site description', true),
('min_bet_amount', '1000', 'Minimum bet amount', false),
('max_bet_amount', '100000', 'Maximum bet amount', false),
('house_commission', '0.05', 'House commission rate', false),
('maintenance_mode', 'false', 'Maintenance mode status', true),
('registration_enabled', 'true', 'Allow new registrations', true),
('auto_game_start', 'false', 'Auto start games', false),
('game_timer_duration', '30', 'Game timer duration in seconds', false);

-- Insert default site content
INSERT INTO site_content (page, section, content, is_active) VALUES
('home', 'hero_title', 'Welcome to Reddy Anna Andar Bahar', true),
('home', 'hero_subtitle', 'Experience the thrill of traditional Indian card game', true),
('home', 'about', 'Reddy Anna Andar Bahar is a premier online gaming platform offering authentic Andar Bahar experience with secure transactions and fair gameplay.', true),
('game', 'rules', 'Andar Bahar is a simple yet exciting card game where players bet on which side (Andar or Bahar) will receive a card matching the opening card.', true),
('contact', 'email', 'support@reddyanna.com', true),
('contact', 'phone', '+91-XXXXXXXXXX', true),
('contact', 'address', 'Mumbai, India', true);

-- Create function to generate referral codes
CREATE OR REPLACE FUNCTION generate_referral_code()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.referral_code IS NULL THEN
        NEW.referral_code := 'RA' || upper(substring(md5(random()::text), 1, 8));
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for referral code generation
CREATE TRIGGER generate_user_referral_code
    BEFORE INSERT ON users
    FOR EACH ROW EXECUTE FUNCTION generate_referral_code();

-- Create function to update user statistics
CREATE OR REPLACE FUNCTION update_user_statistics()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- Update user balance for bets
        UPDATE users 
        SET balance = balance - NEW.amount,
            games_played = games_played + 1
        WHERE id = NEW.user_id;
        
        -- Create transaction record
        INSERT INTO transactions (user_id, type, amount, status, description, balance_before, balance_after)
        SELECT NEW.user_id, 'bet', NEW.amount, 'completed', 
               'Bet placed on ' || NEW.side || ' round ' || NEW.round,
               balance, balance - NEW.amount
        FROM users WHERE id = NEW.user_id;
        
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.status != NEW.status THEN
            IF NEW.status = 'won' THEN
                -- User won, add payout
                UPDATE users 
                SET balance = balance + NEW.payout_amount,
                    total_winnings = total_winnings + NEW.payout_amount,
                    games_won = games_won + 1
                WHERE id = NEW.user_id;
                
                -- Create transaction record
                INSERT INTO transactions (user_id, type, amount, status, description, balance_before, balance_after)
                SELECT NEW.user_id, 'win', NEW.payout_amount, 'completed',
                       'Won bet on ' || NEW.side || ' round ' || NEW.round,
                       balance, balance + NEW.payout_amount
                FROM users WHERE id = NEW.user_id;
                
            ELSIF NEW.status = 'lost' THEN
                -- User lost, update losses
                UPDATE users 
                SET total_losses = total_losses + (
                    SELECT amount FROM bets WHERE id = NEW.id
                )
                WHERE id = NEW.user_id;
            END IF;
        END IF;
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for user statistics
CREATE TRIGGER update_user_stats_trigger
    AFTER INSERT OR UPDATE ON bets
    FOR EACH ROW EXECUTE FUNCTION update_user_statistics();

-- Create view for user statistics
CREATE VIEW user_stats AS
SELECT 
    u.id,
    u.username,
    u.email,
    u.balance,
    u.total_winnings,
    u.total_losses,
    u.games_played,
    u.games_won,
    CASE 
        WHEN u.games_played > 0 THEN ROUND((u.games_won::decimal / u.games_played::decimal) * 100, 2)
        ELSE 0
    END as win_rate,
    u.created_at,
    u.last_login
FROM users u;

-- Create view for game statistics
CREATE VIEW game_stats AS
SELECT 
    gs.game_id,
    gs.opening_card,
    gs.winner,
    gs.winning_card,
    gs.total_andar_bets,
    gs.total_bahar_bets,
    gs.total_payouts,
    (gs.total_andar_bets + gs.total_bahar_bets - gs.total_payouts) as house_profit,
    gs.completed_at,
    COUNT(b.id) as total_bets,
    COUNT(DISTINCT b.user_id) as unique_players
FROM game_sessions gs
LEFT JOIN bets b ON gs.id = b.game_id
WHERE gs.status = 'completed'
GROUP BY gs.id, gs.game_id, gs.opening_card, gs.winner, gs.winning_card, 
         gs.total_andar_bets, gs.total_bahar_bets, gs.total_payouts, 
         gs.completed_at;

-- Grant permissions to authenticated users
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON users TO authenticated;
GRANT ALL ON bets TO authenticated;
GRANT ALL ON transactions TO authenticated;
GRANT ALL ON user_sessions TO authenticated;
GRANT SELECT ON game_sessions TO authenticated;
GRANT SELECT ON dealt_cards TO authenticated;
GRANT SELECT ON game_history TO authenticated;
GRANT SELECT ON system_settings TO authenticated;
GRANT SELECT ON site_content TO authenticated;
GRANT SELECT ON user_stats TO authenticated;
GRANT SELECT ON game_stats TO authenticated;

-- Grant permissions to service role (for backend operations)
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO service_role;

-- Create function to clean up expired sessions
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS void AS $$
BEGIN
    DELETE FROM user_sessions 
    WHERE expires_at < NOW() OR is_active = false;
END;
$$ LANGUAGE plpgsql;

-- Create function to get user game history
CREATE OR REPLACE FUNCTION get_user_game_history(
    p_user_id UUID,
    p_limit INTEGER DEFAULT 50,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    game_id VARCHAR,
    opening_card VARCHAR,
    winner bet_side,
    winning_card VARCHAR,
    round INTEGER,
    bet_side bet_side,
    bet_amount DECIMAL,
    bet_status bet_status,
    payout_amount DECIMAL,
    played_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        gs.game_id,
        gs.opening_card,
        gs.winner,
        gs.winning_card,
        gs.round,
        b.side,
        b.amount,
        b.status,
        b.payout_amount,
        gs.completed_at
    FROM game_sessions gs
    INNER JOIN bets b ON gs.id = b.game_id
    WHERE b.user_id = p_user_id
    AND gs.status = 'completed'
    ORDER BY gs.completed_at DESC
    LIMIT p_limit OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

-- Create function to get active game
CREATE OR REPLACE FUNCTION get_active_game()
RETURNS TABLE (
    game_id VARCHAR,
    opening_card VARCHAR,
    phase game_phase,
    current_round INTEGER,
    current_timer INTEGER,
    andar_cards TEXT[],
    bahar_cards TEXT[],
    total_andar_bets DECIMAL,
    total_bahar_bets DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        gs.game_id,
        gs.opening_card,
        gs.phase,
        gs.current_round,
        gs.current_timer,
        gs.andar_cards,
        gs.bahar_cards,
        gs.total_andar_bets,
        gs.total_bahar_bets
    FROM game_sessions gs
    WHERE gs.status = 'active'
    ORDER BY gs.created_at DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Stream settings table for streaming configuration
CREATE TABLE IF NOT EXISTS stream_settings (
    id SERIAL PRIMARY KEY,
    setting_key VARCHAR(255) UNIQUE NOT NULL,
    setting_value TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for stream_settings
CREATE INDEX IF NOT EXISTS idx_stream_settings_key ON stream_settings(setting_key);

-- Create trigger for stream_settings updated_at
CREATE TRIGGER update_stream_settings_updated_at BEFORE UPDATE ON stream_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default stream settings
INSERT INTO stream_settings (setting_key, setting_value) VALUES
('rtmp_port', '1935'),
('hls_port', '8000'),
('stream_path', '/live/stream'),
('hls_fragment_time', '4'),
('hls_list_size', '6'),
('hls_window_size', '60'),
('enable_adaptive_bitrate', 'false'),
('max_viewers', '1000'),
('stream_quality', '720p'),
('enable_recording', 'false'),
('recording_path', '/recordings'),
('stream_title', 'Reddy Anna Andar Bahar Live'),
('stream_description', 'Live Andar Bahar Game Stream')
ON CONFLICT (setting_key) DO NOTHING;

-- Grant permissions for stream_settings
GRANT ALL ON stream_settings TO authenticated;
GRANT ALL ON stream_settings TO service_role;
GRANT SELECT ON stream_settings TO anon;

COMMIT;
