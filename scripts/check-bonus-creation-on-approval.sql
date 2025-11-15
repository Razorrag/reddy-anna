-- ============================================
-- CHECK WHY BONUSES AREN'T BEING CREATED ON DEPOSIT APPROVAL
-- This script helps diagnose the issue
-- ============================================

-- STEP 1: Check recent deposit approvals
SELECT 
    pr.id,
    pr.user_id,
    pr.amount,
    pr.status,
    pr.created_at,
    pr.processed_at,
    pr.admin_id,
    CASE 
        WHEN db.id IS NULL THEN '❌ NO BONUS'
        ELSE '✅ HAS BONUS'
    END AS bonus_status,
    db.id AS bonus_id,
    db.bonus_amount,
    db.status AS bonus_status
FROM payment_requests pr
LEFT JOIN deposit_bonuses db ON pr.id = db.deposit_request_id
WHERE pr.request_type = 'deposit'
  AND pr.status = 'approved'
ORDER BY pr.processed_at DESC NULLS LAST, pr.created_at DESC
LIMIT 20;

-- STEP 2: Check if approvePaymentRequestAtomic is being called
-- This checks the payment_requests table for recent approvals
SELECT 
    COUNT(*) AS recent_approvals,
    MIN(processed_at) AS first_approval,
    MAX(processed_at) AS last_approval
FROM payment_requests
WHERE request_type = 'deposit'
  AND status = 'approved'
  AND processed_at >= NOW() - INTERVAL '7 days';

-- STEP 3: Check game settings for bonus configuration
SELECT 
    setting_key,
    setting_value,
    description,
    updated_at
FROM game_settings
WHERE setting_key IN (
    'default_deposit_bonus_percent',
    'wagering_multiplier',
    'min_deposit_for_referral',
    'referral_bonus_percent'
)
ORDER BY setting_key;

-- STEP 4: Check if there are any errors in bonus creation
-- Look for deposits approved but no bonus created
SELECT 
    pr.id AS payment_id,
    pr.user_id,
    pr.amount,
    pr.status,
    pr.processed_at,
    pr.admin_id,
    COALESCE(u.full_name, u.phone) AS user_name,
    u.phone,
    CASE 
        WHEN db.id IS NULL THEN 'MISSING BONUS'
        ELSE 'HAS BONUS'
    END AS issue
FROM payment_requests pr
LEFT JOIN deposit_bonuses db ON pr.id = db.deposit_request_id
JOIN users u ON pr.user_id = u.id
WHERE pr.request_type = 'deposit'
  AND pr.status = 'approved'
  AND db.id IS NULL
ORDER BY pr.processed_at DESC NULLS LAST, pr.created_at DESC;

-- STEP 5: Check deposit amounts (to ensure they're valid)
SELECT 
    MIN(amount) AS min_deposit,
    MAX(amount) AS max_deposit,
    AVG(amount) AS avg_deposit,
    COUNT(*) AS total_approved
FROM payment_requests
WHERE request_type = 'deposit'
  AND status = 'approved';

-- STEP 6: Check if bonus creation is failing due to constraints
-- This will show if there are any foreign key or constraint issues
SELECT 
    'Foreign Key Check' AS check_type,
    COUNT(*) AS deposits_with_valid_user_id
FROM payment_requests pr
JOIN users u ON pr.user_id = u.id
WHERE pr.request_type = 'deposit'
  AND pr.status = 'approved';

-- STEP 7: Summary of the issue
SELECT 
    'Diagnosis Summary' AS summary,
    COUNT(DISTINCT pr.id) AS approved_deposits,
    COUNT(DISTINCT db.id) AS bonus_records_created,
    COUNT(DISTINCT pr.id) - COUNT(DISTINCT db.id) AS missing_bonuses,
    ROUND((COUNT(DISTINCT db.id)::numeric / NULLIF(COUNT(DISTINCT pr.id), 0) * 100), 2) AS success_rate_percent
FROM payment_requests pr
LEFT JOIN deposit_bonuses db ON pr.id = db.deposit_request_id
WHERE pr.request_type = 'deposit'
  AND pr.status = 'approved';

