-- ============================================
-- REDDY ANNA ANDAR BAHAR GAME - FIXED SCHEMA WITH ENUM TYPES
-- This schema fixes the fragile TEXT-based role/status columns
-- ============================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- ENUM TYPES FOR DATA INTEGRITY
-- ============================================

-- User role enum (prevents typos like "adminn" or "ADMIN")
CREATE TYPE user_role AS ENUM ('player', 'admin', 'super_admin');

-- User status enum
CREATE TYPE user_status AS ENUM ('active', 'suspended', 'banned', 'inactive');

-- Game phase enum
CREATE TYPE game_phase AS ENUM ('idle', 'betting', 'dealing', 'complete');

-- Game status enum
CREATE TYPE game_status AS ENUM ('active', 'completed', 'cancelled');

-- Bet side enum
CREATE TYPE bet_side AS ENUM ('andar', 'bahar');

-- Transaction type enum
CREATE TYPE transaction_type AS ENUM ('deposit', 'withdrawal', 'bet', 'win', 'refund', 'bonus', 'commission');

-- Transaction status enum
CREATE TYPE transaction_status AS ENUM ('pending', 'completed', 'failed', 'cancelled');

-- Request status enum
CREATE TYPE request_status AS ENUM ('pending', 'approved', 'rejected', 'processing');

-- ============================================
-- CORE TABLES WITH ENUM TYPES
-- ============================================

-- Users table (phone-based authentication)
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(20) PRIMARY KEY, -- Phone number as ID
  phone VARCHAR(15) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  full_name TEXT,
  role user_role DEFAULT 'player', -- ENUM instead of TEXT
  status user_status DEFAULT 'active', -- ENUM instead of TEXT
  balance DECIMAL(15, 2) NOT NULL DEFAULT '100000.00',
  total_winnings DECIMAL(15, 2) DEFAULT '0.00',
  total_losses DECIMAL(15, 2) DEFAULT '0.00',
  games_played INTEGER DEFAULT 0,
  games_won INTEGER DEFAULT 0,
  phone_verified BOOLEAN DEFAULT false,
  referral_code VARCHAR(50),
  referral_code_generated VARCHAR(50),
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
  role user_role DEFAULT 'admin', -- ENUM instead of TEXT
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Game sessions table
CREATE TABLE IF NOT EXISTS game_sessions (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  game_id VARCHAR(36) NOT NULL UNIQUE,
  opening_card TEXT,
  phase game_phase NOT NULL DEFAULT 'idle', -- ENUM instead of TEXT
  status game_status NOT NULL DEFAULT 'active', -- ENUM instead of TEXT
  current_timer INTEGER DEFAULT 30,
  current_round INTEGER DEFAULT 1,
  andar_cards TEXT[] DEFAULT '{}',
  bahar_cards TEXT[] DEFAULT '{}',
  winner bet_side, -- ENUM instead of TEXT
  winning_card TEXT,
  winning_round INTEGER,
  total_andar_bets DECIMAL(15, 2) DEFAULT '0.00',
  total_bahar_bets DECIMAL(15, 2) DEFAULT '0.00',
  total_payouts DECIMAL(15, 2) DEFAULT '0.00',
  started_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Player bets table
CREATE TABLE IF NOT EXISTS player_bets (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id VARCHAR(20) NOT NULL,
  game_id VARCHAR(36) NOT NULL,
  round VARCHAR(10) NOT NULL,
  side bet_side NOT NULL, -- ENUM instead of TEXT
  amount DECIMAL(15, 2) NOT NULL,
  potential_payout DECIMAL(15, 2),
  actual_payout DECIMAL(15, 2) DEFAULT '0.00',
  status transaction_status DEFAULT 'pending', -- ENUM instead of TEXT
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (game_id) REFERENCES game_sessions(game_id) ON DELETE CASCADE
);

-- Transactions table
CREATE TABLE IF NOT EXISTS transactions (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id VARCHAR(20) NOT NULL,
  type transaction_type NOT NULL, -- ENUM instead of TEXT
  amount DECIMAL(15, 2) NOT NULL,
  balance_before DECIMAL(15, 2) NOT NULL,
  balance_after DECIMAL(15, 2) NOT NULL,
  status transaction_status DEFAULT 'completed', -- ENUM instead of TEXT
  reference_id VARCHAR(100),
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Admin requests table (deposit/withdrawal)
CREATE TABLE IF NOT EXISTS admin_requests (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id VARCHAR(20) NOT NULL,
  type transaction_type NOT NULL, -- ENUM: 'deposit' or 'withdrawal'
  amount DECIMAL(15, 2) NOT NULL,
  status request_status DEFAULT 'pending', -- ENUM instead of TEXT
  payment_method TEXT,
  payment_details JSONB,
  admin_notes TEXT,
  processed_by VARCHAR(36),
  processed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (processed_by) REFERENCES admin_credentials(id) ON DELETE SET NULL
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_game_sessions_game_id ON game_sessions(game_id);
CREATE INDEX IF NOT EXISTS idx_game_sessions_status ON game_sessions(status);
CREATE INDEX IF NOT EXISTS idx_player_bets_user_id ON player_bets(user_id);
CREATE INDEX IF NOT EXISTS idx_player_bets_game_id ON player_bets(game_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_admin_requests_user_id ON admin_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_requests_status ON admin_requests(status);

-- ============================================
-- MIGRATION SCRIPT (if upgrading existing database)
-- ============================================

-- To migrate existing data, run these commands:
-- 1. Create the enum types (already done above)
-- 2. Add temporary columns with enum types
-- 3. Copy data from TEXT columns to ENUM columns
-- 4. Drop old TEXT columns
-- 5. Rename ENUM columns to original names

-- Example migration (uncomment if needed):
/*
ALTER TABLE users ADD COLUMN role_new user_role;
UPDATE users SET role_new = role::user_role;
ALTER TABLE users DROP COLUMN role;
ALTER TABLE users RENAME COLUMN role_new TO role;
*/
