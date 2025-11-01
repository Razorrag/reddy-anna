-- ============================================
-- COMPLETE DATABASE SETUP - RUN THIS FIRST
-- This creates ALL missing tables
-- ============================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- ENUM TYPES (Create if not exist)
-- ============================================

DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('player', 'admin', 'super_admin');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE user_status AS ENUM ('active', 'suspended', 'banned', 'inactive');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE game_phase AS ENUM ('idle', 'betting', 'dealing', 'complete');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE game_status AS ENUM ('active', 'completed', 'cancelled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE bet_side AS ENUM ('andar', 'bahar');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE transaction_type AS ENUM ('deposit', 'withdrawal', 'bet', 'win', 'refund', 'bonus', 'commission', 'support');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE transaction_status AS ENUM ('pending', 'completed', 'failed', 'cancelled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE request_status AS ENUM ('pending', 'approved', 'rejected', 'processing', 'processed', 'completed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ============================================
-- CRITICAL MISSING TABLE: BETS
-- ============================================

CREATE TABLE IF NOT EXISTS bets (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id VARCHAR(20) NOT NULL,
  game_id VARCHAR(36) NOT NULL,
  round INTEGER NOT NULL DEFAULT 1,
  side bet_side NOT NULL,
  amount DECIMAL(15, 2) NOT NULL,
  potential_payout DECIMAL(15, 2),
  actual_payout DECIMAL(15, 2),
  payout_amount DECIMAL(15, 2),
  result VARCHAR(20), -- 'win', 'loss', 'pending'
  settled BOOLEAN DEFAULT false,
  settled_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Foreign keys
  CONSTRAINT fk_bets_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_bets_game FOREIGN KEY (game_id) REFERENCES game_sessions(game_id) ON DELETE CASCADE
);

-- Indexes for bets table
CREATE INDEX IF NOT EXISTS idx_bets_user_id ON bets(user_id);
CREATE INDEX IF NOT EXISTS idx_bets_game_id ON bets(game_id);
CREATE INDEX IF NOT EXISTS idx_bets_created_at ON bets(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bets_settled ON bets(settled);
CREATE INDEX IF NOT EXISTS idx_bets_result ON bets(result);

-- ============================================
-- OTHER POTENTIALLY MISSING TABLES
-- ============================================

-- Transactions table
CREATE TABLE IF NOT EXISTS transactions (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id VARCHAR(20) NOT NULL,
  type transaction_type NOT NULL,
  amount DECIMAL(15, 2) NOT NULL,
  balance_before DECIMAL(15, 2),
  balance_after DECIMAL(15, 2),
  status transaction_status DEFAULT 'completed',
  reference VARCHAR(100),
  description TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT fk_transactions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);

-- Daily stats table
CREATE TABLE IF NOT EXISTS daily_stats (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  date DATE NOT NULL UNIQUE,
  total_games INTEGER DEFAULT 0,
  total_bets DECIMAL(15, 2) DEFAULT 0,
  total_payouts DECIMAL(15, 2) DEFAULT 0,
  total_revenue DECIMAL(15, 2) DEFAULT 0,
  profit_loss DECIMAL(15, 2) DEFAULT 0,
  unique_players INTEGER DEFAULT 0,
  peak_bets_hour INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_daily_stats_date ON daily_stats(date DESC);

-- Game statistics table
CREATE TABLE IF NOT EXISTS game_statistics (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  game_id VARCHAR(36) NOT NULL,
  total_bets DECIMAL(15, 2) DEFAULT 0,
  andar_bets DECIMAL(15, 2) DEFAULT 0,
  bahar_bets DECIMAL(15, 2) DEFAULT 0,
  total_players INTEGER DEFAULT 0,
  winner bet_side,
  total_payouts DECIMAL(15, 2) DEFAULT 0,
  house_profit DECIMAL(15, 2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT fk_game_statistics_game FOREIGN KEY (game_id) REFERENCES game_sessions(game_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_game_statistics_game_id ON game_statistics(game_id);
CREATE INDEX IF NOT EXISTS idx_game_statistics_created_at ON game_statistics(created_at);

-- Payment requests table
CREATE TABLE IF NOT EXISTS payment_requests (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id VARCHAR(20) NOT NULL,
  request_type VARCHAR(20) NOT NULL, -- 'deposit' or 'withdrawal'
  amount DECIMAL(15, 2) NOT NULL,
  method_type VARCHAR(50), -- 'upi', 'bank', 'wallet', etc.
  method_details JSONB,
  status request_status DEFAULT 'pending',
  admin_notes TEXT,
  processed_by VARCHAR(36),
  processed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT fk_payment_requests_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_payment_requests_user_id ON payment_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_requests_status ON payment_requests(status);
CREATE INDEX IF NOT EXISTS idx_payment_requests_type ON payment_requests(request_type);
CREATE INDEX IF NOT EXISTS idx_payment_requests_created_at ON payment_requests(created_at DESC);

-- Admin requests table
CREATE TABLE IF NOT EXISTS admin_requests (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id VARCHAR(20) NOT NULL,
  request_type VARCHAR(50) NOT NULL,
  amount DECIMAL(15, 2),
  details JSONB,
  status request_status DEFAULT 'pending',
  priority INTEGER DEFAULT 5,
  whatsapp_message_id VARCHAR(100),
  admin_notes TEXT,
  processed_by VARCHAR(36),
  processed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT fk_admin_requests_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_admin_requests_user_id ON admin_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_requests_status ON admin_requests(status);
CREATE INDEX IF NOT EXISTS idx_admin_requests_type ON admin_requests(request_type);
CREATE INDEX IF NOT EXISTS idx_admin_requests_created_at ON admin_requests(created_at DESC);

-- ============================================
-- FIX REFERRAL TABLE FOREIGN KEYS
-- ============================================

ALTER TABLE user_referrals DROP CONSTRAINT IF EXISTS user_referrals_referrer_user_id_fkey;
ALTER TABLE user_referrals DROP CONSTRAINT IF EXISTS user_referrals_referred_user_id_fkey;

ALTER TABLE user_referrals 
ADD CONSTRAINT user_referrals_referrer_user_id_fkey 
FOREIGN KEY (referrer_user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE user_referrals 
ADD CONSTRAINT user_referrals_referred_user_id_fkey 
FOREIGN KEY (referred_user_id) REFERENCES users(id) ON DELETE CASCADE;

-- ============================================
-- GRANT PERMISSIONS
-- ============================================

GRANT ALL ON bets TO authenticated;
GRANT ALL ON transactions TO authenticated;
GRANT ALL ON daily_stats TO authenticated;
GRANT ALL ON game_statistics TO authenticated;
GRANT ALL ON payment_requests TO authenticated;
GRANT ALL ON admin_requests TO authenticated;
GRANT ALL ON user_referrals TO authenticated;

-- Force schema cache refresh
NOTIFY pgrst, 'reload schema';

-- ============================================
-- VERIFICATION
-- ============================================

DO $$
DECLARE
  missing_tables TEXT := '';
BEGIN
  -- Check all critical tables
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'users') THEN
    missing_tables := missing_tables || 'users, ';
  END IF;
  
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'game_sessions') THEN
    missing_tables := missing_tables || 'game_sessions, ';
  END IF;
  
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'bets') THEN
    missing_tables := missing_tables || 'bets, ';
  END IF;
  
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'transactions') THEN
    missing_tables := missing_tables || 'transactions, ';
  END IF;
  
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'user_referrals') THEN
    missing_tables := missing_tables || 'user_referrals, ';
  END IF;
  
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'daily_stats') THEN
    missing_tables := missing_tables || 'daily_stats, ';
  END IF;
  
  IF missing_tables != '' THEN
    RAISE EXCEPTION 'Missing critical tables: %', missing_tables;
  END IF;
  
  RAISE NOTICE '✅ ALL CRITICAL TABLES EXIST!';
  RAISE NOTICE '✅ Database setup complete!';
  RAISE NOTICE 'You can now restart your Node server.';
END
$$;

-- Success message
SELECT 
  '✅ Database setup complete!' as status,
  'All tables created successfully' as message,
  'Restart your Node server now' as next_step;









