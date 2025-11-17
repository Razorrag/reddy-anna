-- ============================================================================
-- FIX: Bet status type casting error in update_bet_with_payout
-- ============================================================================
-- Error: column "status" is of type transaction_status but expression is of type text
-- Solution: Cast the status parameter to the correct enum type
-- ============================================================================

-- First, check what type the status column actually is
SELECT 
  column_name,
  data_type,
  udt_name
FROM information_schema.columns
WHERE table_name = 'player_bets' AND column_name = 'status';

-- Drop and recreate the function with proper type casting
DROP FUNCTION IF EXISTS update_bet_with_payout(TEXT, TEXT, TEXT, NUMERIC);

CREATE OR REPLACE FUNCTION update_bet_with_payout(
  p_bet_id TEXT,
  p_status TEXT,
  p_transaction_id TEXT,
  p_payout_amount NUMERIC
)
RETURNS VOID AS $$
BEGIN
  -- Only update if transaction ID doesn't already exist (idempotency)
  -- ✅ FIX: Cast status to transaction_status enum if that's what the column uses
  UPDATE player_bets
  SET 
    status = p_status::transaction_status,  -- ✅ Cast to transaction_status enum
    payout_transaction_id = p_transaction_id,
    actual_payout = p_payout_amount,
    updated_at = NOW()
  WHERE id = p_bet_id
    AND (payout_transaction_id IS NULL OR payout_transaction_id = p_transaction_id);
END;
$$ LANGUAGE plpgsql;

-- Verify the function was created
SELECT routine_name, routine_definition
FROM information_schema.routines
WHERE routine_name = 'update_bet_with_payout';

-- ============================================================================
-- After running this, restart your server and test again
-- ============================================================================
