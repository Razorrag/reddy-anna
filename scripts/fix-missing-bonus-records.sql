-- ============================================
-- FIX MISSING BONUS RECORDS FOR APPROVED DEPOSITS
-- This script creates bonus records for deposits that were approved
-- but don't have corresponding deposit_bonuses records
-- ============================================

-- STEP 1: Check which approved deposits are missing bonus records
SELECT 
    pr.id AS payment_request_id,
    pr.user_id,
    pr.amount AS deposit_amount,
    pr.status,
    pr.created_at AS deposit_date,
    pr.admin_id,
    COALESCE(u.full_name, u.phone) AS user_identifier,
    u.phone
FROM payment_requests pr
LEFT JOIN deposit_bonuses db ON pr.id = db.deposit_request_id
JOIN users u ON pr.user_id = u.id
WHERE pr.request_type = 'deposit'
  AND pr.status = 'approved'
  AND db.id IS NULL
ORDER BY pr.created_at DESC;

-- STEP 2: Get game settings for bonus calculation
-- Default values if settings don't exist:
-- bonus_percentage: 5% (0.05)
-- wagering_multiplier: 0.3 (30% of deposit)
SELECT 
    setting_key,
    setting_value
FROM game_settings
WHERE setting_key IN ('default_deposit_bonus_percent', 'wagering_multiplier');

-- STEP 3: Create bonus records for missing deposits
-- This uses default values of 5% bonus and 30% wagering requirement
-- Adjust if your settings are different

INSERT INTO deposit_bonuses (
    id,
    user_id,
    deposit_request_id,
    deposit_amount,
    bonus_amount,
    bonus_percentage,
    wagering_required,
    wagering_completed,
    wagering_progress,
    status,
    locked_at,
    created_at,
    updated_at
)
SELECT 
    gen_random_uuid()::TEXT AS id,
    pr.user_id,
    pr.id AS deposit_request_id,
    pr.amount AS deposit_amount,
    -- Calculate bonus: 5% of deposit amount
    ROUND((pr.amount * 0.05)::numeric, 2) AS bonus_amount,
    5.00 AS bonus_percentage,
    -- Calculate wagering: 30% of deposit amount
    ROUND((pr.amount * 0.30)::numeric, 2) AS wagering_required,
    0.00 AS wagering_completed,
    0.00 AS wagering_progress,
    'locked' AS status,
    pr.processed_at AS locked_at, -- Use processed_at if available, otherwise created_at
    pr.created_at AS created_at,
    NOW() AS updated_at
FROM payment_requests pr
LEFT JOIN deposit_bonuses db ON pr.id = db.deposit_request_id
WHERE pr.request_type = 'deposit'
  AND pr.status = 'approved'
  AND db.id IS NULL
  AND pr.amount > 0;

-- STEP 4: Log bonus creation transactions
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
    gen_random_uuid()::TEXT AS id,
    db.user_id,
    'deposit_bonus',
    db.id AS bonus_source_id,
    db.bonus_amount,
    'added',
    'Bonus created retroactively for deposit of ₹' || db.deposit_amount || ' (5% bonus, ₹' || db.wagering_required || ' wagering required)',
    db.created_at
FROM deposit_bonuses db
WHERE db.created_at >= NOW() - INTERVAL '5 minutes'
  AND NOT EXISTS (
      SELECT 1 
      FROM bonus_transactions bt 
      WHERE bt.bonus_source_id = db.id 
        AND bt.action = 'added'
  );

-- STEP 5: Verify the fix
SELECT 
    'After Fix' AS status,
    COUNT(*) AS total_deposit_bonuses,
    SUM(bonus_amount) AS total_bonus_amount,
    SUM(wagering_required) AS total_wagering_required
FROM deposit_bonuses;

-- STEP 6: Check if all approved deposits now have bonus records
SELECT 
    'Verification' AS check_type,
    COUNT(DISTINCT pr.id) AS approved_deposits,
    COUNT(DISTINCT db.id) AS bonus_records,
    CASE 
        WHEN COUNT(DISTINCT pr.id) = COUNT(DISTINCT db.id) THEN '✅ All deposits have bonus records'
        ELSE '⚠️ Some deposits still missing bonus records'
    END AS status
FROM payment_requests pr
LEFT JOIN deposit_bonuses db ON pr.id = db.deposit_request_id
WHERE pr.request_type = 'deposit'
  AND pr.status = 'approved';

-- STEP 7: Show created bonus records
SELECT 
    db.id,
    db.user_id,
    COALESCE(u.full_name, u.phone) AS user_identifier,
    db.deposit_amount,
    db.bonus_amount,
    db.bonus_percentage,
    db.wagering_required,
    db.wagering_completed,
    db.wagering_progress,
    db.status,
    db.created_at
FROM deposit_bonuses db
JOIN users u ON db.user_id = u.id
WHERE db.created_at >= NOW() - INTERVAL '5 minutes'
ORDER BY db.created_at DESC;

