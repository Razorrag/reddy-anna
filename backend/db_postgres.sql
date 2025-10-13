-- PostgreSQL schema for Reddy Anna Kossu

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  full_name VARCHAR(150) NOT NULL,
  mobile VARCHAR(20) NOT NULL UNIQUE,
  email VARCHAR(255) UNIQUE,
  referral_code VARCHAR(64),
  password_hash VARCHAR(255) NOT NULL,
  date_of_birth DATE,
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create blocked users table
CREATE TABLE IF NOT EXISTS blocked_users (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
  blocked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Create admins table
CREATE TABLE IF NOT EXISTS admins (
  id BIGSERIAL PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  email VARCHAR(255) NOT NULL UNIQUE,
  full_name VARCHAR(150) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role TEXT CHECK (role IN ('super_admin', 'admin', 'moderator')) DEFAULT 'admin',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_login TIMESTAMP WITH TIME ZONE,
  created_by BIGINT REFERENCES admins(id) ON DELETE SET NULL
);

-- Create game settings table
CREATE TABLE IF NOT EXISTS game_settings (
  id BIGSERIAL PRIMARY KEY,
  setting_key VARCHAR(100) NOT NULL UNIQUE,
  setting_value VARCHAR(255) NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create stream settings table
CREATE TABLE IF NOT EXISTS stream_settings (
  id BIGSERIAL PRIMARY KEY,
  setting_key VARCHAR(100) NOT NULL UNIQUE,
  setting_value TEXT,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default game settings
INSERT INTO game_settings (setting_key, setting_value, description) VALUES
('max_bet_amount', '50000', 'Maximum bet amount allowed in the game'),
('min_bet_amount', '1000', 'Minimum bet amount allowed in the game'),
('game_timer', '30', 'Default game timer in seconds'),
('opening_card', 'A♠', 'Current opening card for the game')
ON CONFLICT (setting_key) DO UPDATE SET
  setting_value = EXCLUDED.setting_value,
  description = EXCLUDED.description,
  updated_at = NOW();

-- Insert default stream settings
INSERT INTO stream_settings (setting_key, setting_value, description) VALUES
('stream_url', 'hero images/uhd_30fps.mp4', 'Default stream URL for offline status'),
('stream_title', 'Andar Bahar Live Game', 'Stream title'),
('stream_status', 'offline', 'Current stream status (live/offline/maintenance)'),
('stream_description', 'Live Andar Bahar game streaming', 'Stream description'),
('stream_quality', '720p', 'Stream quality setting'),
('stream_delay', '0', 'Stream delay in seconds'),
('backup_stream_url', '', 'Backup stream URL'),
('stream_embed_code', '', 'Custom embed code for live streaming')
ON CONFLICT (setting_key) DO UPDATE SET
  setting_value = EXCLUDED.setting_value,
  description = EXCLUDED.description,
  updated_at = NOW();

-- Insert default admin accounts (passwords are already hashed)
INSERT INTO admins (username, email, full_name, password_hash, role, is_active) VALUES
('admin', 'admin@reddyanna.com', 'System Administrator', '$2a$10$NffV80ge6uVdYo5ltJsSk.dLTX8a/NWCkhYohvq1ndx0K3dzelQdG', 'super_admin', TRUE),
('reddy', 'reddy@reddyanna.com', 'Reddy Anna', '$2a$10$zIWYFvKfxiGK8JCeoJt9Y.EOKY3mXQX1C3Bptir7/uJOjJ0hu1VFO', 'admin', TRUE),
('superadmin', 'super@reddyanna.com', 'Super Admin', '$2a$10$NaoVEEgRDeudm23XS3W2geinQIYuAkmbmUI2RrmYTwoY0v1FUK8xq', 'super_admin', TRUE)
ON CONFLICT (username) DO NOTHING;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_mobile ON users(mobile);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_admins_username ON admins(username);
CREATE INDEX IF NOT EXISTS idx_admins_email ON admins(email);
CREATE INDEX IF NOT EXISTS idx_game_settings_key ON game_settings(setting_key);
CREATE INDEX IF NOT EXISTS idx_stream_settings_key ON stream_settings(setting_key);

-- Create function to automatically update updated_at timestamp
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

CREATE TRIGGER update_game_settings_updated_at BEFORE UPDATE ON game_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_stream_settings_updated_at BEFORE UPDATE ON stream_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();