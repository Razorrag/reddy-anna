-- Migration: Update bet limit from 50,000 to 1,00,000
-- Date: 2025-10-22
-- Description: Increases maximum bet amount to 1 lakh (100,000)

-- Step 1: Drop the existing constraint
ALTER TABLE bets DROP CONSTRAINT IF EXISTS bets_amount_check;

-- Step 2: Add new constraint with updated limit
ALTER TABLE bets ADD CONSTRAINT bets_amount_check 
CHECK (amount >= 1000 AND amount <= 100000);

-- Step 3: Update system settings for max bet amount
UPDATE system_settings 
SET value = '100000' 
WHERE key = 'max_bet_amount';

-- Verify the changes
SELECT constraint_name, check_clause 
FROM information_schema.check_constraints 
WHERE constraint_name = 'bets_amount_check';

SELECT key, value, description 
FROM system_settings 
WHERE key = 'max_bet_amount';
