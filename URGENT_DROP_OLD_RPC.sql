-- ============================================================================
-- URGENT: DROP OLD RPC FUNCTION THAT'S CAUSING DOUBLE PAYOUTS
-- ============================================================================
-- This old function adds balance, but your new code ALSO adds balance
-- Result: Balance gets added TWICE (double payout)
-- ============================================================================

-- Drop ALL versions of the old function
DROP FUNCTION IF EXISTS apply_payouts_and_update_bets(JSONB, UUID[], UUID[]);
DROP FUNCTION IF EXISTS apply_payouts_and_update_bets(JSONB, TEXT[], TEXT[]);
DROP FUNCTION IF EXISTS public.apply_payouts_and_update_bets(JSONB, UUID[], UUID[]);
DROP FUNCTION IF EXISTS public.apply_payouts_and_update_bets(JSONB, TEXT[], TEXT[]);

-- Verify it's gone
SELECT routine_name, routine_schema
FROM information_schema.routines
WHERE routine_name = 'apply_payouts_and_update_bets';

-- Expected result: NO ROWS (function should be completely removed)

-- ============================================================================
-- After running this, restart your server and test again
-- ============================================================================
