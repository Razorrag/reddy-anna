-- ============================================
-- ANDAR BAHAR GAME - MASTER DATABASE FIX
-- ============================================
-- Version: 1.0
-- Date: November 17, 2025
-- Purpose: Fix all critical database issues in one migration
-- 
-- BEFORE RUNNING:
-- 1. Backup your database
-- 2. Test on staging environment first
-- 3. Review all changes below
-- ============================================

-- ============================================
-- STEP 1: Add Missing Columns to game_history
-- ============================================
DO $$ 
BEGIN
  -- Add winning_round if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'game_history' AND column_name = 'winning_round'
  ) THEN
    ALTER TABLE game_history ADD COLUMN winning_round INTEGER;
    RAISE NOTICE '✅ Added winning_round column to game_history';
  ELSE
    RAISE NOTICE '⚠️  winning_round column already exists';
  END IF;

  -- Add total_bets if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'game_history' AND column_name = 'total_bets'
  ) THEN
    ALTER TABLE game_history ADD COLUMN total_bets NUMERIC DEFAULT 0;
    RAISE NOTICE '✅ Added total_bets column to game_history';
  ELSE
    RAISE NOTICE '⚠️  total_bets column already exists';
  END IF;

  -- Add total_payouts if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'game_history' AND column_name = 'total_payouts'
  ) THEN
    ALTER TABLE game_history ADD COLUMN total_payouts NUMERIC DEFAULT 0;
    RAISE NOTICE '✅ Added total_payouts column to game_history';
  ELSE
    RAISE NOTICE '⚠️  total_payouts column already exists';
  END IF;

  -- Add round_payouts if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'game_history' AND column_name = 'round_payouts'
  ) THEN
    ALTER TABLE game_history ADD COLUMN round_payouts JSONB DEFAULT '{"round1": {"andar": 0, "bahar": 0}, "round2": {"andar": 0, "bahar": 0}}'::JSONB;
    RAISE NOTICE '✅ Added round_payouts column to game_history';
  ELSE
    RAISE NOTICE '⚠️  round_payouts column already exists';
  END IF;
END $$;

-- ============================================
-- STEP 2: Create Atomic Payout Function
-- ============================================
-- This function ensures payouts are processed atomically
-- preventing race conditions and duplicate payouts
-- ============================================

CREATE OR REPLACE FUNCTION apply_payouts_atomic(
  p_payouts JSONB,
  p_winning_bets TEXT[],
  p_losing_bets TEXT[]
) RETURNS TABLE(
  user_id TEXT,
  old_balance NUMERIC,
  new_balance NUMERIC,
  payout_amount NUMERIC,
  success BOOLEAN,
  error_message TEXT
) AS $$
DECLARE
  v_payout RECORD;
  v_user_balance NUMERIC;
  v_new_balance NUMERIC;
BEGIN
  -- Process each payout atomically
  FOR v_payout IN 
    SELECT 
      (value->>'userId')::TEXT as user_id,
      (value->>'amount')::NUMERIC as amount
    FROM jsonb_array_elements(p_payouts)
  LOOP
    BEGIN
      -- Lock row and get current balance (prevents concurrent modifications)
      SELECT balance INTO v_user_balance 
      FROM users 
      WHERE id = v_payout.user_id 
      FOR UPDATE;
      
      IF v_user_balance IS NULL THEN
        -- Return error for this user
        user_id := v_payout.user_id;
        old_balance := 0;
        new_balance := 0;
        payout_amount := v_payout.amount;
        success := FALSE;
        error_message := 'User not found';
        RETURN NEXT;
        CONTINUE;
      END IF;
      
      -- Calculate new balance
      v_new_balance := v_user_balance + v_payout.amount;
      
      -- Update balance
      UPDATE users 
      SET balance = v_new_balance,
          updated_at = NOW()
      WHERE id = v_payout.user_id;
      
      -- Log transaction
      INSERT INTO user_transactions (
        id,
        user_id, 
        transaction_type, 
        amount, 
        balance_before, 
        balance_after, 
        description, 
        created_at
      ) VALUES (
        gen_random_uuid()::TEXT,
        v_payout.user_id, 
        'payout', 
        v_payout.amount,
        v_user_balance, 
        v_new_balance,
        'Game payout - ' || 
          CASE 
            WHEN v_payout.amount > 0 THEN 'Won ₹' || v_payout.amount::TEXT
            ELSE 'Lost bet'
          END,
        NOW()
      );
      
      -- Return success
      user_id := v_payout.user_id;
      old_balance := v_user_balance;
      new_balance := v_new_balance;
      payout_amount := v_payout.amount;
      success := TRUE;
      error_message := NULL;
      RETURN NEXT;
      
    EXCEPTION WHEN OTHERS THEN
      -- Return error for this user
      user_id := v_payout.user_id;
      old_balance := COALESCE(v_user_balance, 0);
      new_balance := COALESCE(v_user_balance, 0);
      payout_amount := v_payout.amount;
      success := FALSE;
      error_message := SQLERRM;
      RETURN NEXT;
    END;
  END LOOP;
  
  -- Mark winning bets
  UPDATE player_bets 
  SET status = 'won', 
      actual_payout = amount * (
        CASE 
          WHEN round = '1' THEN 1.9
          WHEN round = '2' THEN 1.75
          ELSE 1.0  -- Round 3+ is refund only
        END
      ),
      updated_at = NOW()
  WHERE id = ANY(p_winning_bets);
  
  -- Mark losing bets
  UPDATE player_bets 
  SET status = 'lost', 
      actual_payout = 0,
      updated_at = NOW()
  WHERE id = ANY(p_losing_bets);
  
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION apply_payouts_atomic IS 'Atomically process game payouts, update balances, log transactions, and mark bet statuses. Returns detailed results for each payout.';

-- ============================================
-- STEP 3: Create Idempotency Check Function
-- ============================================
-- Prevents duplicate payouts for completed games
-- ============================================

CREATE OR REPLACE FUNCTION check_game_completed(p_game_id TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  v_status TEXT;
BEGIN
  SELECT status INTO v_status
  FROM game_sessions
  WHERE game_id = p_game_id;
  
  -- Return true if game is already completed
  RETURN v_status = 'completed';
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION check_game_completed IS 'Check if a game has already been completed to prevent duplicate payouts';

-- ============================================
-- STEP 4: Create Payout Multiplier Function
-- ============================================
-- Returns correct payout multiplier based on round
-- ============================================

CREATE OR REPLACE FUNCTION get_payout_multiplier(p_round INTEGER)
RETURNS NUMERIC AS $$
BEGIN
  RETURN CASE p_round
    WHEN 1 THEN 1.9   -- Round 1: 1.9x payout (90% profit)
    WHEN 2 THEN 1.75  -- Round 2: 1.75x payout (75% profit)
    ELSE 1.0          -- Round 3+: 1.0x payout (refund only)
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION get_payout_multiplier IS 'Get correct payout multiplier for a given round (1.9x, 1.75x, or 1.0x)';

-- ============================================
-- STEP 5: Create Game State Validation Function
-- ============================================
-- Validates game state transitions
-- ============================================

CREATE OR REPLACE FUNCTION validate_game_state(
  p_game_id TEXT,
  p_phase TEXT,
  p_round INTEGER
) RETURNS BOOLEAN AS $$
BEGIN
  -- Ensure game exists
  IF NOT EXISTS (
    SELECT 1 FROM game_sessions WHERE game_id = p_game_id
  ) THEN
    RAISE EXCEPTION 'Game % does not exist', p_game_id;
  END IF;
  
  -- Validate phase
  IF p_phase NOT IN ('idle', 'betting', 'dealing', 'complete') THEN
    RAISE EXCEPTION 'Invalid phase: %. Must be idle, betting, dealing, or complete', p_phase;
  END IF;
  
  -- Validate round
  IF p_round NOT IN (1, 2, 3) THEN
    RAISE EXCEPTION 'Invalid round: %. Must be 1, 2, or 3', p_round;
  END IF;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION validate_game_state IS 'Validate game state before transitions to prevent invalid states';

-- ============================================
-- STEP 6: Create Bet Cancellation Function
-- ============================================
-- Atomically cancel bet and refund user
-- ============================================

CREATE OR REPLACE FUNCTION cancel_bet_atomic(
  p_bet_id TEXT,
  p_admin_id TEXT
) RETURNS TABLE(
  success BOOLEAN,
  old_balance NUMERIC,
  new_balance NUMERIC,
  refund_amount NUMERIC,
  error_message TEXT
) AS $$
DECLARE
  v_bet RECORD;
  v_user_balance NUMERIC;
  v_new_balance NUMERIC;
BEGIN
  -- Get bet details
  SELECT * INTO v_bet
  FROM player_bets
  WHERE id = p_bet_id
  FOR UPDATE;
  
  IF NOT FOUND THEN
    success := FALSE;
    error_message := 'Bet not found';
    RETURN NEXT;
    RETURN;
  END IF;
  
  -- Check if bet can be cancelled
  IF v_bet.status NOT IN ('pending', 'active') THEN
    success := FALSE;
    error_message := 'Bet cannot be cancelled (status: ' || v_bet.status || ')';
    RETURN NEXT;
    RETURN;
  END IF;
  
  -- Lock user row and get balance
  SELECT balance INTO v_user_balance
  FROM users
  WHERE id = v_bet.user_id
  FOR UPDATE;
  
  IF v_user_balance IS NULL THEN
    success := FALSE;
    error_message := 'User not found';
    RETURN NEXT;
    RETURN;
  END IF;
  
  -- Calculate refund amount
  v_new_balance := v_user_balance + v_bet.amount;
  
  -- Refund user
  UPDATE users
  SET balance = v_new_balance,
      updated_at = NOW()
  WHERE id = v_bet.user_id;
  
  -- Mark bet as cancelled
  UPDATE player_bets
  SET status = 'cancelled',
      updated_at = NOW()
  WHERE id = p_bet_id;
  
  -- Log transaction
  INSERT INTO user_transactions (
    id,
    user_id,
    transaction_type,
    amount,
    balance_before,
    balance_after,
    description,
    created_at
  ) VALUES (
    gen_random_uuid()::TEXT,
    v_bet.user_id,
    'refund',
    v_bet.amount,
    v_user_balance,
    v_new_balance,
    'Bet cancelled by admin - Refund ₹' || v_bet.amount::TEXT,
    NOW()
  );
  
  -- Return success
  success := TRUE;
  old_balance := v_user_balance;
  new_balance := v_new_balance;
  refund_amount := v_bet.amount;
  error_message := NULL;
  RETURN NEXT;
  
EXCEPTION WHEN OTHERS THEN
  success := FALSE;
  old_balance := COALESCE(v_user_balance, 0);
  new_balance := COALESCE(v_user_balance, 0);
  refund_amount := 0;
  error_message := SQLERRM;
  RETURN NEXT;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION cancel_bet_atomic IS 'Atomically cancel a bet and refund the user';

-- ============================================
-- STEP 7: Create Index for Better Performance
-- ============================================

-- Index on game_sessions.status for faster active game queries
CREATE INDEX IF NOT EXISTS idx_game_sessions_status 
  ON game_sessions(status) 
  WHERE status = 'active';

-- Index on player_bets for faster bet lookups
CREATE INDEX IF NOT EXISTS idx_player_bets_game_user 
  ON player_bets(game_id, user_id);

-- Index on player_bets status for faster active bet queries
CREATE INDEX IF NOT EXISTS idx_player_bets_status 
  ON player_bets(status) 
  WHERE status IN ('pending', 'active');

-- ============================================
-- STEP 8: Verification Queries
-- ============================================

-- Test payout multiplier function
DO $$
BEGIN
  ASSERT get_payout_multiplier(1) = 1.9, 'Round 1 multiplier should be 1.9';
  ASSERT get_payout_multiplier(2) = 1.75, 'Round 2 multiplier should be 1.75';
  ASSERT get_payout_multiplier(3) = 1.0, 'Round 3 multiplier should be 1.0';
  RAISE NOTICE '✅ Payout multiplier function working correctly';
END $$;

-- ============================================
-- MIGRATION COMPLETE
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '╔══════════════════════════════════════════════╗';
  RAISE NOTICE '║   DATABASE MIGRATION COMPLETED SUCCESSFULLY   ║';
  RAISE NOTICE '╚══════════════════════════════════════════════╝';
  RAISE NOTICE '';
  RAISE NOTICE '✅ Added missing columns to game_history';
  RAISE NOTICE '✅ Created apply_payouts_atomic function';
  RAISE NOTICE '✅ Created check_game_completed function';
  RAISE NOTICE '✅ Created get_payout_multiplier function';
  RAISE NOTICE '✅ Created validate_game_state function';
  RAISE NOTICE '✅ Created cancel_bet_atomic function';
  RAISE NOTICE '✅ Created performance indexes';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Update server code to use new functions';
  RAISE NOTICE '2. Test on staging environment';
  RAISE NOTICE '3. Deploy to production';
  RAISE NOTICE '';
END $$;
