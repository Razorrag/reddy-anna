-- Migration: Add payment_request_id column to user_transactions table
-- This links transactions to their originating payment requests for better audit trail

-- Add payment_request_id column if it doesn't exist
ALTER TABLE user_transactions 
ADD COLUMN IF NOT EXISTS payment_request_id UUID;

-- Add foreign key constraint
ALTER TABLE user_transactions
ADD CONSTRAINT IF NOT EXISTS fk_user_transactions_payment 
  FOREIGN KEY (payment_request_id) 
  REFERENCES payment_requests(id) 
  ON DELETE SET NULL;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_transactions_payment_request 
ON user_transactions(payment_request_id);

-- Verify the column was added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'user_transactions'
AND column_name = 'payment_request_id';

COMMENT ON COLUMN user_transactions.payment_request_id IS 'Links transaction to originating payment request for audit trail';
