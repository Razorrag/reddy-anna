-- ============================================
-- FIX BONUSES THAT SHOULD BE UNLOCKED
-- Auto-unlock bonuses that meet wagering requirement
-- ============================================

-- STEP 1: Check bonuses that should be unlocked
SELECT 
    id,
    user_id,
    deposit_amount,
    bonus_amount,
    wagering_required,
    wagering_completed,
    wagering_progress,
    status,
    locked_at,
    ROUND((wagering_completed / wagering_required) * 100, 2) AS calculated_progress
FROM deposit_bonuses
WHERE wagering_completed >= wagering_required 
  AND status = 'locked'
ORDER BY locked_at DESC;

-- STEP 2: Unlock bonuses that meet requirement
UPDATE deposit_bonuses
SET 
    status = 'unlocked',
    unlocked_at = NOW(),
    updated_at = NOW()
WHERE wagering_completed >= wagering_required 
  AND status = 'locked'
  AND unlocked_at IS NULL;

-- STEP 3: Log the unlock transactions
INSERT INTO bonus_transactions (
    id,
    user_id,
    bonus_type,
    bonus_source_id,
    amount,
    action,
    description,
    created_at
)
SELECT 
    gen_random_uuid()::TEXT,
    user_id,
    'deposit_bonus',
    id,
    bonus_amount,
    'unlocked',
    'Auto-unlocked: Wagering requirement met (₹' || wagering_completed || ' / ₹' || wagering_required || ')',
    NOW()
FROM deposit_bonuses
WHERE status = 'unlocked'
  AND unlocked_at >= NOW() - INTERVAL '5 minutes'
  AND NOT EXISTS (
      SELECT 1 
      FROM bonus_transactions bt 
      WHERE bt.bonus_source_id = deposit_bonuses.id 
        AND bt.action = 'unlocked'
  );

-- STEP 4: Auto-credit unlocked bonuses to balance
-- This should be done by the application, but if needed manually:

-- First, check which bonuses should be credited
SELECT 
    db.id,
    db.user_id,
    db.bonus_amount,
    u.balance AS current_balance,
    (u.balance + db.bonus_amount) AS new_balance
FROM deposit_bonuses db
JOIN users u ON db.user_id = u.id
WHERE db.status = 'unlocked'
  AND db.credited_at IS NULL;

-- Then credit them (if application isn't doing it automatically)
-- ⚠️ WARNING: Only run this if auto-credit isn't working in application
/*
UPDATE users
SET balance = balance + db.bonus_amount
FROM deposit_bonuses db
WHERE users.id = db.user_id
  AND db.status = 'unlocked'
  AND db.credited_at IS NULL;

UPDATE deposit_bonuses
SET 
    status = 'credited',
    credited_at = NOW(),
    updated_at = NOW()
WHERE status = 'unlocked'
  AND credited_at IS NULL;

INSERT INTO bonus_transactions (
    id,
    user_id,
    bonus_type,
    bonus_source_id,
    amount,
    action,
    description,
    created_at
)
SELECT 
    gen_random_uuid()::TEXT,
    user_id,
    'deposit_bonus',
    id,
    bonus_amount,
    'credited',
    'Bonus credited to balance: ₹' || bonus_amount,
    NOW()
FROM deposit_bonuses
WHERE status = 'credited'
  AND credited_at >= NOW() - INTERVAL '5 minutes';
*/

-- STEP 5: Verify fixes
SELECT 
    status,
    COUNT(*) AS count,
    SUM(bonus_amount) AS total_bonus
FROM deposit_bonuses
GROUP BY status
ORDER BY status;

