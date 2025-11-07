-- =====================================================
-- FIX TRANSACTION HISTORY - DEPOSIT & WITHDRAWAL
-- =====================================================
-- This script creates the user_transactions table that is
-- required for saving deposit and withdrawal history.
-- The table was referenced in code but never created in DB.
-- =====================================================

-- Drop existing table if it exists (to ensure clean state)
DROP TABLE IF EXISTS user_transactions CASCADE;

-- Create user_transactions table
CREATE TABLE user_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  transaction_type TEXT NOT NULL,
  amount NUMERIC(10, 2) NOT NULL,
  balance_before NUMERIC(10, 2),
  balance_after NUMERIC(10, 2),
  reference_id TEXT,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Add foreign key constraint
  CONSTRAINT fk_user_transactions_user
    FOREIGN KEY (user_id) 
    REFERENCES users(id) 
    ON DELETE CASCADE
);

-- Create indexes for better query performance
CREATE INDEX idx_user_transactions_user_id 
  ON user_transactions(user_id);

CREATE INDEX idx_user_transactions_created_at 
  ON user_transactions(created_at DESC);

CREATE INDEX idx_user_transactions_type 
  ON user_transactions(transaction_type);

CREATE INDEX idx_user_transactions_reference 
  ON user_transactions(reference_id) 
  WHERE reference_id IS NOT NULL;

-- Add composite index for common queries
CREATE INDEX idx_user_transactions_user_date 
  ON user_transactions(user_id, created_at DESC);

-- Add check constraints for data integrity
ALTER TABLE user_transactions
  ADD CONSTRAINT check_transaction_type 
  CHECK (transaction_type IN (
    'deposit',
    'withdrawal_pending',
    'withdrawal_approved',
    'withdrawal_refund',
    'withdrawal_rejected_refund',
    'refund',
    'bonus',
    'bonus_applied',
    'conditional_bonus_applied',
    'bet',
    'win',
    'loss'
  ));

ALTER TABLE user_transactions
  ADD CONSTRAINT check_amount_positive
  CHECK (amount >= 0);

-- Add comments for documentation
COMMENT ON TABLE user_transactions IS 'Stores complete transaction history for all user financial activities including deposits, withdrawals, bonuses, bets, and wins';
COMMENT ON COLUMN user_transactions.transaction_type IS 'Type of transaction: deposit, withdrawal_pending, withdrawal_approved, withdrawal_refund, refund, bonus, bonus_applied, conditional_bonus_applied, bet, win, loss';
COMMENT ON COLUMN user_transactions.reference_id IS 'Reference to related entity (payment_request_id, game_id, bonus_id, etc)';
COMMENT ON COLUMN user_transactions.balance_before IS 'User balance before this transaction';
COMMENT ON COLUMN user_transactions.balance_after IS 'User balance after this transaction';

-- Migrate existing payment_requests data to transaction history
-- This creates historical records from existing payment data
INSERT INTO user_transactions (
  user_id,
  transaction_type,
  amount,
  reference_id,
  description,
  created_at
)
SELECT 
  user_id,
  CASE 
    WHEN payment_type = 'deposit' AND status = 'approved' THEN 'deposit'
    WHEN payment_type = 'withdrawal' AND status = 'approved' THEN 'withdrawal_approved'
    WHEN payment_type = 'withdrawal' AND status = 'rejected' THEN 'withdrawal_refund'
    WHEN payment_type = 'withdrawal' AND status = 'pending' THEN 'withdrawal_pending'
    ELSE payment_type
  END as transaction_type,
  amount,
  id::TEXT as reference_id,
  CASE 
    WHEN status = 'approved' THEN 'Migrated from payment_requests - ' || payment_type || ' approved'
    WHEN status = 'rejected' THEN 'Migrated from payment_requests - ' || payment_type || ' rejected'
    ELSE 'Migrated from payment_requests - ' || payment_type || ' ' || status
  END as description,
  COALESCE(updated_at, created_at) as created_at
FROM payment_requests
WHERE status IN ('approved', 'rejected')
ORDER BY created_at;

-- Grant necessary permissions
GRANT SELECT, INSERT ON user_transactions TO authenticated;
GRANT SELECT ON user_transactions TO anon;

-- Create a view for easier querying of user transaction history
CREATE OR REPLACE VIEW user_transaction_history AS
SELECT 
  ut.id,
  ut.user_id,
  u.username,
  ut.transaction_type,
  ut.amount,
  ut.balance_before,
  ut.balance_after,
  ut.reference_id,
  ut.description,
  ut.created_at,
  -- Add helpful calculated fields
  CASE 
    WHEN ut.transaction_type IN ('deposit', 'bonus', 'bonus_applied', 'conditional_bonus_applied', 'win', 'refund', 'withdrawal_refund', 'withdrawal_rejected_refund') THEN 'credit'
    WHEN ut.transaction_type IN ('withdrawal_approved', 'bet', 'loss') THEN 'debit'
    WHEN ut.transaction_type IN ('withdrawal_pending') THEN 'pending'
    ELSE 'other'
  END as transaction_category,
  -- Link to payment request if applicable
  pr.status as payment_status,
  pr.payment_method
FROM user_transactions ut
LEFT JOIN users u ON ut.user_id = u.id
LEFT JOIN payment_requests pr ON ut.reference_id = pr.id::TEXT
ORDER BY ut.created_at DESC;

-- Grant permissions on the view
GRANT SELECT ON user_transaction_history TO authenticated;

-- Create function to get user transaction summary
CREATE OR REPLACE FUNCTION get_user_transaction_summary(p_user_id TEXT)
RETURNS TABLE (
  total_deposits NUMERIC,
  total_withdrawals NUMERIC,
  total_bonuses NUMERIC,
  total_bets NUMERIC,
  total_wins NUMERIC,
  transaction_count INTEGER,
  last_transaction_date TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(SUM(CASE WHEN transaction_type = 'deposit' THEN amount ELSE 0 END), 0) as total_deposits,
    COALESCE(SUM(CASE WHEN transaction_type = 'withdrawal_approved' THEN amount ELSE 0 END), 0) as total_withdrawals,
    COALESCE(SUM(CASE WHEN transaction_type IN ('bonus', 'bonus_applied', 'conditional_bonus_applied') THEN amount ELSE 0 END), 0) as total_bonuses,
    COALESCE(SUM(CASE WHEN transaction_type = 'bet' THEN amount ELSE 0 END), 0) as total_bets,
    COALESCE(SUM(CASE WHEN transaction_type = 'win' THEN amount ELSE 0 END), 0) as total_wins,
    COUNT(*)::INTEGER as transaction_count,
    MAX(created_at) as last_transaction_date
  FROM user_transactions
  WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql;

-- Verify the fix
DO $$
DECLARE
  table_exists BOOLEAN;
  record_count INTEGER;
BEGIN
  -- Check if table exists
  SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_name = 'user_transactions'
  ) INTO table_exists;
  
  IF table_exists THEN
    -- Get record count
    SELECT COUNT(*) INTO record_count FROM user_transactions;
    
    RAISE NOTICE '✅ SUCCESS: user_transactions table created successfully';
    RAISE NOTICE '📊 Migrated % existing payment records to transaction history', record_count;
    RAISE NOTICE '✅ Indexes created for optimal performance';
    RAISE NOTICE '✅ Constraints added for data integrity';
    RAISE NOTICE '✅ View created: user_transaction_history';
    RAISE NOTICE '✅ Function created: get_user_transaction_summary()';
    RAISE NOTICE '';
    RAISE NOTICE '🎯 Next steps:';
    RAISE NOTICE '   1. Test deposit approval - verify transaction is logged';
    RAISE NOTICE '   2. Test withdrawal request/approval - verify transactions logged';
    RAISE NOTICE '   3. Check frontend transaction history display';
    RAISE NOTICE '   4. Query: SELECT * FROM user_transaction_history LIMIT 10;';
  ELSE
    RAISE EXCEPTION '❌ ERROR: Failed to create user_transactions table';
  END IF;
END $$;