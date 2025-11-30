-- =====================================================
-- FIX PARTNER FINANCIAL SYSTEM DATA ISSUES
-- Execute this in Supabase SQL Editor
-- =====================================================
-- This fixes column name mismatches and missing columns
-- discovered during deep analysis
-- =====================================================

-- ==================================================
-- FIX 1: ADD MISSING UTR_NUMBER COLUMN
-- ==================================================

ALTER TABLE partner_withdrawal_requests 
ADD COLUMN IF NOT EXISTS utr_number TEXT;

COMMENT ON COLUMN partner_withdrawal_requests.utr_number IS 'UTR/Reference number for completed payment';

-- ==================================================
-- FIX 2: ADD MISSING REFERENCE_ID COLUMN
-- ==================================================

ALTER TABLE partner_wallet_transactions
ADD COLUMN IF NOT EXISTS reference_id TEXT;

COMMENT ON COLUMN partner_wallet_transactions.reference_id IS 'Reference to withdrawal request or other related record';

-- ==================================================
-- FIX 3: CREATE INDEX FOR NEW COLUMNS
-- ==================================================

CREATE INDEX IF NOT EXISTS idx_partner_withdrawal_utr 
  ON partner_withdrawal_requests(utr_number) 
  WHERE utr_number IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_partner_wallet_trans_reference 
  ON partner_wallet_transactions(reference_id) 
  WHERE reference_id IS NOT NULL;

-- ==================================================
-- FIX 4: MIGRATE EXISTING payment_reference TO utr_number
-- ==================================================

-- If there's existing data in payment_reference, copy it to utr_number
UPDATE partner_withdrawal_requests 
SET utr_number = payment_reference
WHERE payment_reference IS NOT NULL 
  AND utr_number IS NULL
  AND status = 'completed';

-- ==================================================
-- FIX 5: MIGRATE EXISTING withdrawal_request_id TO reference_id
-- ==================================================

-- Copy withdrawal_request_id to reference_id for consistency
UPDATE partner_wallet_transactions
SET reference_id = withdrawal_request_id
WHERE withdrawal_request_id IS NOT NULL
  AND reference_id IS NULL
  AND transaction_type = 'withdrawal';

-- ==================================================
-- VERIFICATION QUERIES
-- ==================================================

-- Check partner_withdrawal_requests structure
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns
WHERE table_name = 'partner_withdrawal_requests'
  AND column_name IN ('utr_number', 'payment_reference', 'status')
ORDER BY ordinal_position;

-- Check partner_wallet_transactions structure
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns
WHERE table_name = 'partner_wallet_transactions'
  AND column_name IN ('reference_id', 'withdrawal_request_id', 'transaction_type')
ORDER BY ordinal_position;

-- Verify data integrity
SELECT 
  'partner_withdrawal_requests' as table_name,
  COUNT(*) as total_rows,
  COUNT(utr_number) as has_utr,
  COUNT(CASE WHEN status = 'completed' AND utr_number IS NULL THEN 1 END) as completed_without_utr
FROM partner_withdrawal_requests

UNION ALL

SELECT 
  'partner_wallet_transactions' as table_name,
  COUNT(*) as total_rows,
  COUNT(reference_id) as has_reference,
  COUNT(CASE WHEN transaction_type = 'withdrawal' AND reference_id IS NULL THEN 1 END) as withdrawals_without_reference
FROM partner_wallet_transactions;

-- Show sample data
SELECT 
  'Sample Withdrawal Requests' as info,
  id,
  amount,
  status,
  utr_number,
  created_at
FROM partner_withdrawal_requests
ORDER BY created_at DESC
LIMIT 3;

SELECT 
  'Sample Wallet Transactions' as info,
  id,
  transaction_type,
  amount,
  reference_id,
  created_at
FROM partner_wallet_transactions
ORDER BY created_at DESC
LIMIT 3;

-- ==================================================
-- SUCCESS MESSAGE
-- ==================================================

DO $$
BEGIN
  RAISE NOTICE '=====================================================';
  RAISE NOTICE '  PARTNER FINANCIAL DATA ISSUES FIXED';
  RAISE NOTICE '=====================================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Columns added:';
  RAISE NOTICE '  ✓ partner_withdrawal_requests.utr_number';
  RAISE NOTICE '  ✓ partner_wallet_transactions.reference_id';
  RAISE NOTICE '';
  RAISE NOTICE 'Data migrated:';
  RAISE NOTICE '  ✓ payment_reference → utr_number';
  RAISE NOTICE '  ✓ withdrawal_request_id → reference_id';
  RAISE NOTICE '';
  RAISE NOTICE 'Next step: Update backend code to fix API responses';
  RAISE NOTICE '';
  RAISE NOTICE '=====================================================';
END $$;