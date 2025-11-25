-- ============================================
-- UPDATE REFERRAL BONUS LOGIC
-- Switch from instant credit to game-based unlocking
-- ============================================

BEGIN;

-- 1. Add game tracking columns to referral_bonuses
ALTER TABLE referral_bonuses
ADD COLUMN IF NOT EXISTS games_required INTEGER DEFAULT 5,
ADD COLUMN IF NOT EXISTS games_played INTEGER DEFAULT 0;

-- 2. Update existing 'pending' bonuses to 'locked' if any
UPDATE referral_bonuses
SET status = 'locked'
WHERE status = 'pending';

-- 3. Add 'locked' to allowed status check if needed
-- Note: If status check constraint exists, we might need to drop and recreate it
-- But usually text columns don't have hard constraints unless explicitly added
-- Let's try to add a check constraint if it doesn't exist

DO $$
BEGIN
  -- Drop existing constraint if it exists to update allowed values
  ALTER TABLE referral_bonuses DROP CONSTRAINT IF EXISTS referral_bonuses_status_check;
  
  -- Add new constraint with 'locked' status
  ALTER TABLE referral_bonuses 
  ADD CONSTRAINT referral_bonuses_status_check 
  CHECK (status IN ('pending', 'locked', 'credited', 'expired'));
END $$;

COMMIT;
