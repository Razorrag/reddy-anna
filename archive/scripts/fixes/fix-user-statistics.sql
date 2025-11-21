-- Fix User Statistics: Ensure all statistics fields have proper default values
-- This script will update NULL values to 0 for all statistics fields

-- Update games_played: Set NULL to 0
UPDATE users 
SET games_played = 0 
WHERE games_played IS NULL;

-- Update games_won: Set NULL to 0
UPDATE users 
SET games_won = 0 
WHERE games_won IS NULL;

-- Update total_winnings: Set NULL to 0.00
UPDATE users 
SET total_winnings = '0.00' 
WHERE total_winnings IS NULL;

-- Update total_losses: Set NULL to 0.00
UPDATE users 
SET total_losses = '0.00' 
WHERE total_losses IS NULL;

-- Verify the update
SELECT 
  id,
  phone,
  full_name,
  games_played,
  games_won,
  total_winnings,
  total_losses,
  balance
FROM users
ORDER BY created_at DESC
LIMIT 10;

-- Add constraints to prevent NULL values in the future (optional)
-- ALTER TABLE users ALTER COLUMN games_played SET DEFAULT 0;
-- ALTER TABLE users ALTER COLUMN games_played SET NOT NULL;

-- ALTER TABLE users ALTER COLUMN games_won SET DEFAULT 0;
-- ALTER TABLE users ALTER COLUMN games_won SET NOT NULL;

-- ALTER TABLE users ALTER COLUMN total_winnings SET DEFAULT '0.00';
-- ALTER TABLE users ALTER COLUMN total_losses SET DEFAULT '0.00';

COMMIT;
