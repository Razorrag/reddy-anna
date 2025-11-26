-- ============================================================================
-- REFERRAL BONUS SYSTEM UPDATE
-- ============================================================================
-- This migration updates the referral bonus system:
-- 1. Adds linked_deposit_bonus_id column to link referral bonuses to deposit bonuses
-- 2. Referral bonuses are now credited TOGETHER with the linked deposit bonus
-- 3. No separate wagering for referral bonuses
--
-- NEW FLOW:
-- 1. Player A deposits ₹100,000 → Gets ₹5,000 deposit bonus (locked, wagering: ₹30,000)
-- 2. Player B uses A's code, deposits ₹50,000 → A gets ₹2,500 referral bonus (locked, linked to A's deposit bonus)
-- 3. Player A completes wagering → Both ₹5,000 deposit + ₹2,500 referral credited together!
-- ============================================================================

BEGIN;

-- ============================================================================
-- STEP 1: Add linked_deposit_bonus_id column
-- ============================================================================
-- Note: deposit_bonuses.id is VARCHAR, not UUID
ALTER TABLE referral_bonuses 
ADD COLUMN IF NOT EXISTS linked_deposit_bonus_id VARCHAR(36) REFERENCES deposit_bonuses(id);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_referral_bonuses_linked_deposit 
ON referral_bonuses(linked_deposit_bonus_id) 
WHERE linked_deposit_bonus_id IS NOT NULL;

-- ============================================================================
-- STEP 2: Link existing locked referral bonuses to referrer's deposit bonuses
-- ============================================================================

-- For each locked referral bonus, find the referrer's OLDEST locked deposit bonus
-- and link them together (FIFO matching)
WITH referrer_deposit_bonuses AS (
  SELECT DISTINCT ON (user_id) 
    id as deposit_bonus_id,
    user_id as referrer_id
  FROM deposit_bonuses
  WHERE status = 'locked'
  ORDER BY user_id, created_at ASC -- FIFO: oldest first
)
UPDATE referral_bonuses rb
SET linked_deposit_bonus_id = rdb.deposit_bonus_id
FROM referrer_deposit_bonuses rdb
WHERE rb.referrer_user_id = rdb.referrer_id
  AND rb.linked_deposit_bonus_id IS NULL
  AND rb.status = 'locked';

-- ============================================================================
-- STEP 3: Remove separate wagering for referral bonuses
-- ============================================================================
-- Referral bonuses no longer have their own wagering requirement
-- They are credited when the linked deposit bonus is credited
UPDATE referral_bonuses
SET wagering_required = 0,
    wagering_completed = 0
WHERE status = 'locked';

-- ============================================================================
-- STEP 4: Credit referral bonuses that are linked to already-credited deposit bonuses
-- ============================================================================

-- Find referral bonuses linked to deposit bonuses that are already credited
WITH credited_deposit_bonuses AS (
  SELECT id FROM deposit_bonuses WHERE status = 'credited'
)
UPDATE referral_bonuses rb
SET status = 'credited',
    credited_at = NOW(),
    updated_at = NOW()
FROM credited_deposit_bonuses cdb
WHERE rb.linked_deposit_bonus_id = cdb.id
  AND rb.status = 'locked';

-- Add the bonus amounts to user balances
UPDATE users u
SET balance = balance + rb.bonus_amount,
    updated_at = NOW()
FROM referral_bonuses rb
WHERE u.id = rb.referrer_user_id
  AND rb.status = 'credited'
  AND rb.credited_at >= NOW() - INTERVAL '1 minute';

-- ============================================================================
-- VERIFICATION
-- ============================================================================

SELECT '=== REFERRAL BONUS SYSTEM UPDATE COMPLETE ===' as status;

SELECT 'Referral bonuses status' as check_name,
  COUNT(*) as total,
  COUNT(linked_deposit_bonus_id) as linked_to_deposit,
  COUNT(*) - COUNT(linked_deposit_bonus_id) as not_linked,
  COUNT(CASE WHEN status = 'locked' THEN 1 END) as locked,
  COUNT(CASE WHEN status = 'credited' THEN 1 END) as credited,
  SUM(CASE WHEN status = 'locked' THEN bonus_amount ELSE 0 END) as locked_amount,
  SUM(CASE WHEN status = 'credited' THEN bonus_amount ELSE 0 END) as credited_amount
FROM referral_bonuses;

-- Show linked bonuses
SELECT 'Linked referral bonuses' as info,
  rb.referrer_user_id,
  rb.bonus_amount as referral_bonus,
  rb.status as referral_status,
  db.bonus_amount as deposit_bonus,
  db.status as deposit_status,
  db.wagering_required,
  db.wagering_completed
FROM referral_bonuses rb
JOIN deposit_bonuses db ON rb.linked_deposit_bonus_id = db.id
WHERE rb.status = 'locked'
LIMIT 10;

COMMIT;

SELECT '✅ Migration complete!' as status, NOW() as completed_at;
