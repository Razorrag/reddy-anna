-- ============================================
-- FIX BONUS STATUS: Change 'pending' to 'locked'
-- This fixes bonuses that were created with wrong status
-- ============================================

-- STEP 1: Check for bonuses with wrong status
SELECT 
    id,
    user_id,
    deposit_amount,
    bonus_amount,
    wagering_required,
    wagering_completed,
    status,
    created_at
FROM deposit_bonuses
WHERE status = 'pending'
  AND wagering_completed < wagering_required
ORDER BY created_at DESC;

-- STEP 2: Update status from 'pending' to 'locked'
UPDATE deposit_bonuses
SET 
    status = 'locked',
    updated_at = NOW()
WHERE status = 'pending'
  AND wagering_completed < wagering_required;

-- STEP 3: Verify the fix
SELECT 
    status,
    COUNT(*) AS count,
    SUM(bonus_amount) AS total_bonus
FROM deposit_bonuses
GROUP BY status
ORDER BY status;

-- STEP 4: Check if wagering can now be tracked
SELECT 
    db.id,
    db.user_id,
    db.bonus_amount,
    db.wagering_required,
    db.wagering_completed,
    db.wagering_progress,
    db.status,
    CASE 
        WHEN db.status = 'locked' THEN '✅ Can be tracked'
        WHEN db.status = 'pending' THEN '❌ Cannot be tracked'
        ELSE '⚠️ Unknown status'
    END AS wagering_tracking_status
FROM deposit_bonuses db
WHERE db.wagering_completed < db.wagering_required
ORDER BY db.created_at DESC;

