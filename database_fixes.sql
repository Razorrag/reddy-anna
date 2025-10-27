-- ============================================
-- DATABASE FIXES - CRITICAL ISSUES
-- ============================================
-- Run this script in your Supabase SQL Editor
-- ============================================

-- ============================================
-- FIX #1: ATOMIC BALANCE UPDATE FUNCTION
-- Prevents race conditions in balance updates
-- ============================================

CREATE OR REPLACE FUNCTION update_balance_atomic(
  p_user_id VARCHAR(20),
  p_amount_change DECIMAL(15, 2)
) RETURNS TABLE(
  new_balance DECIMAL(15, 2),
  old_balance DECIMAL(15, 2)
) AS $$
DECLARE
  v_old_balance DECIMAL(15, 2);
  v_new_balance DECIMAL(15, 2);
BEGIN
  -- Get current balance and lock the row
  SELECT balance INTO v_old_balance
  FROM users
  WHERE id = p_user_id
  FOR UPDATE;
  
  -- Check if user exists
  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found: %', p_user_id;
  END IF;
  
  -- Calculate new balance
  v_new_balance := v_old_balance + p_amount_change;
  
  -- Prevent negative balance
  IF v_new_balance < 0 THEN
    RAISE EXCEPTION 'Insufficient balance. Current: %, Requested: %', v_old_balance, p_amount_change;
  END IF;
  
  -- Update balance atomically
  UPDATE users 
  SET balance = v_new_balance,
      updated_at = NOW()
  WHERE id = p_user_id;
  
  -- Return old and new balance
  RETURN QUERY SELECT v_new_balance, v_old_balance;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- FIX #2: FOREIGN KEY CONSTRAINTS
-- Ensures data integrity across tables
-- ============================================

-- Add foreign key from player_bets to users
ALTER TABLE player_bets 
DROP CONSTRAINT IF EXISTS fk_player_bets_user;

ALTER TABLE player_bets 
ADD CONSTRAINT fk_player_bets_user 
FOREIGN KEY (user_id) 
REFERENCES users(id) 
ON DELETE CASCADE;

-- Add foreign key from player_bets to game_sessions
ALTER TABLE player_bets 
DROP CONSTRAINT IF EXISTS fk_player_bets_game;

ALTER TABLE player_bets 
ADD CONSTRAINT fk_player_bets_game 
FOREIGN KEY (game_id) 
REFERENCES game_sessions(game_id) 
ON DELETE CASCADE;

-- Add foreign key from dealt_cards to game_sessions
ALTER TABLE dealt_cards 
DROP CONSTRAINT IF EXISTS fk_dealt_cards_game;

ALTER TABLE dealt_cards 
ADD CONSTRAINT fk_dealt_cards_game 
FOREIGN KEY (game_id) 
REFERENCES game_sessions(game_id) 
ON DELETE CASCADE;

-- Add foreign key from user_transactions to users
ALTER TABLE user_transactions 
DROP CONSTRAINT IF EXISTS fk_user_transactions_user;

ALTER TABLE user_transactions 
ADD CONSTRAINT fk_user_transactions_user 
FOREIGN KEY (user_id) 
REFERENCES users(id) 
ON DELETE CASCADE;

-- Add foreign key from user_referrals to users (referrer)
ALTER TABLE user_referrals 
DROP CONSTRAINT IF EXISTS fk_user_referrals_referrer;

ALTER TABLE user_referrals 
ADD CONSTRAINT fk_user_referrals_referrer 
FOREIGN KEY (referrer_user_id) 
REFERENCES users(id) 
ON DELETE CASCADE;

-- Add foreign key from user_referrals to users (referred)
ALTER TABLE user_referrals 
DROP CONSTRAINT IF EXISTS fk_user_referrals_referred;

ALTER TABLE user_referrals 
ADD CONSTRAINT fk_user_referrals_referred 
FOREIGN KEY (referred_user_id) 
REFERENCES users(id) 
ON DELETE CASCADE;

-- Add foreign key from blocked_users to users
ALTER TABLE blocked_users 
DROP CONSTRAINT IF EXISTS fk_blocked_users_user;

ALTER TABLE blocked_users 
ADD CONSTRAINT fk_blocked_users_user 
FOREIGN KEY (user_id) 
REFERENCES users(id) 
ON DELETE CASCADE;

-- Add foreign key from game_statistics to game_sessions
ALTER TABLE game_statistics 
DROP CONSTRAINT IF EXISTS fk_game_statistics_game;

ALTER TABLE game_statistics 
ADD CONSTRAINT fk_game_statistics_game 
FOREIGN KEY (game_id) 
REFERENCES game_sessions(game_id) 
ON DELETE CASCADE;

-- ============================================
-- FIX #3: COMPOSITE INDEXES
-- Improves query performance
-- ============================================

-- Index for common bet queries (user + game)
CREATE INDEX IF NOT EXISTS idx_player_bets_user_game 
ON player_bets(user_id, game_id);

-- Index for bet status queries (game + status)
CREATE INDEX IF NOT EXISTS idx_player_bets_game_status 
ON player_bets(game_id, status);

-- Index for transaction queries (user + type)
CREATE INDEX IF NOT EXISTS idx_user_transactions_user_type 
ON user_transactions(user_id, transaction_type);

-- Index for transaction date range queries
CREATE INDEX IF NOT EXISTS idx_user_transactions_user_date 
ON user_transactions(user_id, created_at DESC);

-- Index for game session queries
CREATE INDEX IF NOT EXISTS idx_game_sessions_status_created 
ON game_sessions(status, created_at DESC);

-- ============================================
-- FIX #4: TOKEN BLACKLIST TABLE
-- For logout token invalidation
-- ============================================

CREATE TABLE IF NOT EXISTS token_blacklist (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  token_jti VARCHAR(255) NOT NULL UNIQUE, -- JWT ID
  user_id VARCHAR(20) NOT NULL,
  token_type VARCHAR(20) NOT NULL, -- 'access' or 'refresh'
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  blacklisted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  reason VARCHAR(100) DEFAULT 'logout'
);

-- Index for quick token lookup
CREATE INDEX IF NOT EXISTS idx_token_blacklist_jti 
ON token_blacklist(token_jti);

-- Index for cleanup of expired tokens
CREATE INDEX IF NOT EXISTS idx_token_blacklist_expires 
ON token_blacklist(expires_at);

-- Function to clean up expired tokens (run periodically)
CREATE OR REPLACE FUNCTION cleanup_expired_tokens()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM token_blacklist
  WHERE expires_at < NOW();
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Verify foreign keys were added
SELECT 
  tc.constraint_name, 
  tc.table_name, 
  kcu.column_name, 
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_name IN ('player_bets', 'dealt_cards', 'user_transactions', 'user_referrals', 'blocked_users', 'game_statistics')
ORDER BY tc.table_name;

-- Verify indexes were created
SELECT 
  tablename, 
  indexname, 
  indexdef
FROM pg_indexes
WHERE tablename IN ('player_bets', 'user_transactions', 'game_sessions', 'token_blacklist')
  AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;

-- ============================================
-- COMPLETION MESSAGE
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '✅ Database fixes applied successfully!';
  RAISE NOTICE '1. ✅ Atomic balance update function created';
  RAISE NOTICE '2. ✅ Foreign key constraints added';
  RAISE NOTICE '3. ✅ Composite indexes created';
  RAISE NOTICE '4. ✅ Token blacklist table created';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  IMPORTANT: Update your application code to use these new features';
  RAISE NOTICE '   - Use update_balance_atomic() for all balance updates';
  RAISE NOTICE '   - Check token_blacklist before accepting tokens';
  RAISE NOTICE '   - Run cleanup_expired_tokens() periodically (daily cron job)';
END $$;
