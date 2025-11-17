-- ============================================================================
-- VERIFY FIX STATUS - Run this in Supabase SQL Editor
-- ============================================================================
-- This query checks if the simplified payout fix was applied correctly
-- ============================================================================

-- Comprehensive status check
SELECT 
  'New Functions' as check_type,
  COUNT(*) as count,
  CASE 
    WHEN COUNT(*) = 3 THEN '✅ PASS'
    ELSE '❌ FAIL - Run migration!'
  END as status,
  STRING_AGG(routine_name, ', ') as details
FROM information_schema.routines 
WHERE routine_schema = 'public'
AND routine_name IN (
  'update_bet_with_payout',
  'add_balance_atomic',
  'create_payout_transaction'
)

UNION ALL

SELECT 
  'Old Broken Function' as check_type,
  COUNT(*) as count,
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ PASS'
    ELSE '❌ FAIL - Drop old function!'
  END as status,
  STRING_AGG(routine_name, ', ') as details
FROM information_schema.routines 
WHERE routine_schema = 'public'
AND routine_name = 'apply_payouts_and_update_bets'

UNION ALL

SELECT 
  'Payout TX ID Column' as check_type,
  COUNT(*) as count,
  CASE 
    WHEN COUNT(*) = 1 THEN '✅ PASS'
    ELSE '❌ FAIL - Run migration!'
  END as status,
  column_name as details
FROM information_schema.columns
WHERE table_name = 'player_bets'
AND column_name = 'payout_transaction_id'

UNION ALL

SELECT 
  'Win Enum Value' as check_type,
  COUNT(*) as count,
  CASE 
    WHEN COUNT(*) = 1 THEN '✅ PASS'
    ELSE '❌ FAIL - Enum broken!'
  END as status,
  'win' as details
FROM pg_enum 
WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'transaction_type')
AND enumlabel = 'win'

UNION ALL

SELECT 
  'Unique Constraint' as check_type,
  COUNT(*) as count,
  CASE 
    WHEN COUNT(*) >= 1 THEN '✅ PASS'
    ELSE '❌ FAIL - Run migration!'
  END as status,
  STRING_AGG(indexname, ', ') as details
FROM pg_indexes
WHERE tablename = 'player_bets'
AND indexname LIKE '%payout%'

ORDER BY check_type;

-- ============================================================================
-- EXPECTED RESULTS (All should show ✅ PASS):
-- ============================================================================
-- check_type              | count | status   | details
-- ------------------------|-------|----------|---------------------------
-- New Functions           | 3     | ✅ PASS  | add_balance_atomic, ...
-- Old Broken Function     | 0     | ✅ PASS  | (empty)
-- Payout TX ID Column     | 1     | ✅ PASS  | payout_transaction_id
-- Unique Constraint       | 1+    | ✅ PASS  | idx_bet_payout_unique
-- Win Enum Value          | 1     | ✅ PASS  | win
-- ============================================================================

-- If any show ❌ FAIL, run the migration: scripts/fix-payout-system-simplified.sql
