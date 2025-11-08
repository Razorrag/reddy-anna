-- ============================================
-- MIGRATION: Add payment_details column to payment_requests
-- ============================================
-- Purpose: Store payment method details (UPI ID, bank account info)
-- Date: 2024-11-08
-- ============================================

BEGIN;

-- Step 1: Add payment_details column
ALTER TABLE payment_requests 
ADD COLUMN IF NOT EXISTS payment_details TEXT;

-- Step 2: Add comment for documentation
COMMENT ON COLUMN payment_requests.payment_details IS 
'JSON string containing payment details. For UPI: {"upiId": "user@upi"}. For Bank: {"accountNumber": "123", "ifscCode": "SBIN001", "accountName": "John Doe"}';

-- Step 3: Verify column added
SELECT 
  'Migration Complete' as status,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'payment_requests'
  AND column_name = 'payment_details';

COMMIT;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Query 1: Check existing payment requests
SELECT 
  id,
  user_id,
  request_type,
  amount,
  payment_method,
  payment_details,
  status,
  created_at
FROM payment_requests
ORDER BY created_at DESC
LIMIT 5;

-- Query 2: Count requests with/without payment details
SELECT 
  'Payment Details Status' as report,
  COUNT(*) as total_requests,
  COUNT(CASE WHEN payment_details IS NOT NULL THEN 1 END) as with_details,
  COUNT(CASE WHEN payment_details IS NULL THEN 1 END) as without_details
FROM payment_requests;

-- ============================================
-- ROLLBACK SCRIPT (if needed)
-- ============================================
-- Uncomment and run if you need to rollback this migration:
--
-- BEGIN;
-- ALTER TABLE payment_requests DROP COLUMN IF EXISTS payment_details;
-- COMMIT;
