-- ============================================================================
-- SIMPLIFIED PAYOUT SYSTEM FIX
-- ============================================================================
-- This script implements the simplified atomic approach:
-- 1. Adds payout_transaction_id column for idempotency
-- 2. Drops the broken RPC function (we'll use individual atomic operations)
-- 3. Adds unique constraint to prevent duplicate payouts
-- ============================================================================

-- Step 1: Add payout tracking column if it doesn't exist
ALTER TABLE player_bets 
ADD COLUMN IF NOT EXISTS payout_transaction_id TEXT;

-- Step 2: Add unique constraint to prevent double-payouts
-- This ensures that once a bet is paid out with a transaction ID, it can't be paid again
CREATE UNIQUE INDEX IF NOT EXISTS idx_bet_payout_unique 
ON player_bets(id, payout_transaction_id) 
WHERE status = 'won' AND payout_transaction_id IS NOT NULL;

-- Step 3: Drop the broken RPC function
-- We're removing the complex batch operation in favor of simple atomic operations
DROP FUNCTION IF EXISTS apply_payouts_and_update_bets(JSONB, UUID[], UUID[]);
DROP FUNCTION IF EXISTS apply_payouts_and_update_bets(JSONB, TEXT[], TEXT[]);

-- Step 4: Create a simple function to update bet with payout (idempotent)
CREATE OR REPLACE FUNCTION update_bet_with_payout(
  p_bet_id TEXT,
  p_status TEXT,
  p_transaction_id TEXT,
  p_payout_amount NUMERIC
)
RETURNS VOID AS $$
BEGIN
  -- Only update if transaction ID doesn't already exist (idempotency)
  UPDATE player_bets
  SET 
    status = p_status,
    payout_transaction_id = p_transaction_id,
    actual_payout = p_payout_amount,
    updated_at = NOW()
  WHERE id = p_bet_id
    AND (payout_transaction_id IS NULL OR payout_transaction_id = p_transaction_id);
END;
$$ LANGUAGE plpgsql;

-- Step 5: Create a simple function to add balance atomically
CREATE OR REPLACE FUNCTION add_balance_atomic(
  p_user_id TEXT,
  p_amount NUMERIC
)
RETURNS NUMERIC AS $$
DECLARE
  v_new_balance NUMERIC;
BEGIN
  UPDATE users
  SET balance = balance + p_amount,
      updated_at = NOW()
  WHERE id = p_user_id
  RETURNING balance INTO v_new_balance;
  
  RETURN v_new_balance;
END;
$$ LANGUAGE plpgsql;

-- Step 6: Create a function to create transaction record
CREATE OR REPLACE FUNCTION create_payout_transaction(
  p_user_id TEXT,
  p_amount NUMERIC,
  p_game_id TEXT,
  p_transaction_id TEXT,
  p_description TEXT
)
RETURNS VOID AS $$
DECLARE
  v_balance_before NUMERIC;
  v_balance_after NUMERIC;
BEGIN
  -- Get current balance
  SELECT balance INTO v_balance_before FROM users WHERE id = p_user_id;
  
  -- Calculate new balance
  v_balance_after := v_balance_before + p_amount;
  
  -- Insert transaction record
  INSERT INTO user_transactions (
    id,
    user_id,
    transaction_type,
    amount,
    balance_before,
    balance_after,
    reference_id,
    description,
    created_at
  ) VALUES (
    p_transaction_id,
    p_user_id,
    'win',  -- ✅ FIXED: Use 'win' instead of 'game_payout' (enum value)
    p_amount,
    v_balance_before,
    v_balance_after,
    p_game_id,
    p_description,
    NOW()
  )
  ON CONFLICT (id) DO NOTHING; -- Idempotent: ignore if transaction already exists
END;
$$ LANGUAGE plpgsql;

-- Step 7: Add index on payout_transaction_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_player_bets_payout_tx 
ON player_bets(payout_transaction_id) 
WHERE payout_transaction_id IS NOT NULL;

-- Step 8: Add index on user_transactions for game payouts
CREATE INDEX IF NOT EXISTS idx_user_transactions_win 
ON user_transactions(user_id, transaction_type, reference_id) 
WHERE transaction_type = 'win';

COMMENT ON COLUMN player_bets.payout_transaction_id IS 'Unique transaction ID for payout - prevents duplicate payouts';
COMMENT ON FUNCTION update_bet_with_payout IS 'Idempotent function to update bet with payout information';
COMMENT ON FUNCTION add_balance_atomic IS 'Atomic function to add balance to user account';
COMMENT ON FUNCTION create_payout_transaction IS 'Idempotent function to create payout transaction record';
