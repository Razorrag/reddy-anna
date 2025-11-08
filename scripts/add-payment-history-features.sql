-- ============================================
-- PAYMENT HISTORY SYSTEM - DATABASE MIGRATION
-- Adds missing features for complete payment tracking
-- ============================================

-- 1. Add payment_request_id to user_transactions table
-- ✅ FIX: Use VARCHAR to match payment_requests.id type (not UUID)
ALTER TABLE user_transactions 
ADD COLUMN IF NOT EXISTS payment_request_id VARCHAR(36);

-- Add foreign key constraint
ALTER TABLE user_transactions
ADD CONSTRAINT fk_user_transactions_payment_request
FOREIGN KEY (payment_request_id) 
REFERENCES payment_requests(id) 
ON DELETE SET NULL;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_user_transactions_request_id 
ON user_transactions(payment_request_id);

-- 2. Ensure request_audit table exists (for tracking status changes)
-- ✅ FIX: Use VARCHAR(36) for request_id to match payment_requests.id type
CREATE TABLE IF NOT EXISTS request_audit (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  request_id VARCHAR(36) NOT NULL,
  admin_id VARCHAR(36),
  action VARCHAR(50) NOT NULL,
  previous_status VARCHAR(20),
  new_status VARCHAR(20),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT fk_request_audit_request 
  FOREIGN KEY (request_id) 
  REFERENCES payment_requests(id) 
  ON DELETE CASCADE
);

-- Add indexes for request_audit
CREATE INDEX IF NOT EXISTS idx_request_audit_request_id 
ON request_audit(request_id);

CREATE INDEX IF NOT EXISTS idx_request_audit_created_at 
ON request_audit(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_request_audit_admin_id 
ON request_audit(admin_id);

-- 3. Add processed_at and processed_by columns to payment_requests (if not exists)
ALTER TABLE payment_requests 
ADD COLUMN IF NOT EXISTS processed_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE payment_requests 
ADD COLUMN IF NOT EXISTS processed_by VARCHAR(36);

-- Add index for processed_by
CREATE INDEX IF NOT EXISTS idx_payment_requests_processed_by 
ON payment_requests(processed_by);

-- 4. Add payment_details column to user_transactions (for better tracking)
ALTER TABLE user_transactions 
ADD COLUMN IF NOT EXISTS payment_details JSONB;

-- Add index for JSONB queries
CREATE INDEX IF NOT EXISTS idx_user_transactions_payment_details 
ON user_transactions USING GIN (payment_details);

-- 5. Verify all necessary indexes exist
CREATE INDEX IF NOT EXISTS idx_payment_requests_user_status_type 
ON payment_requests(user_id, status, request_type);

CREATE INDEX IF NOT EXISTS idx_payment_requests_status_created 
ON payment_requests(status, created_at DESC);

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check if columns were added successfully
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns
WHERE table_name = 'user_transactions' 
  AND column_name IN ('payment_request_id', 'payment_details');

SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns
WHERE table_name = 'payment_requests' 
  AND column_name IN ('processed_at', 'processed_by');

-- Check if request_audit table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_name = 'request_audit'
) AS request_audit_exists;

-- Check indexes
SELECT 
  tablename, 
  indexname, 
  indexdef
FROM pg_indexes
WHERE tablename IN ('user_transactions', 'payment_requests', 'request_audit')
ORDER BY tablename, indexname;

-- ============================================
-- SUCCESS MESSAGE
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '✅ Payment history database migration completed successfully!';
  RAISE NOTICE '📊 Added payment_request_id to user_transactions';
  RAISE NOTICE '📊 Created request_audit table for audit trail';
  RAISE NOTICE '📊 Added processed_at and processed_by to payment_requests';
  RAISE NOTICE '📊 Created all necessary indexes';
END $$;
