-- ============================================
-- DATA INTEGRITY VERIFICATION SCRIPT
-- Comprehensive checks for data consistency
-- ============================================

-- ============================================
-- 1. BONUS SYSTEM INTEGRITY
-- ============================================

-- Check for bonuses with invalid wagering progress (> 100% or < 0%)
SELECT 
    'Invalid Wagering Progress' AS issue_type,
    id,
    user_id,
    bonus_amount,
    wagering_required,
    wagering_completed,
    wagering_progress,
    status
FROM deposit_bonuses
WHERE wagering_progress > 100 
   OR wagering_progress < 0
   OR (wagering_completed > wagering_required AND status = 'locked');

-- Check for bonuses that should be unlocked
SELECT 
    'Should Be Unlocked' AS issue_type,
    id,
    user_id,
    bonus_amount,
    wagering_required,
    wagering_completed,
    wagering_progress,
    status,
    locked_at
FROM deposit_bonuses
WHERE wagering_completed >= wagering_required 
  AND status = 'locked';

-- Check for bonuses with missing transaction logs
SELECT 
    'Missing Transaction Log' AS issue_type,
    db.id,
    db.user_id,
    db.bonus_amount,
    db.status,
    db.unlocked_at,
    db.credited_at
FROM deposit_bonuses db
LEFT JOIN bonus_transactions bt ON bt.bonus_source_id = db.id
WHERE db.status IN ('unlocked', 'credited')
  AND bt.id IS NULL;

-- ============================================
-- 2. PAYMENT REQUESTS INTEGRITY
-- ============================================

-- Check for approved deposits without bonus records
SELECT 
    'Missing Bonus Record' AS issue_type,
    pr.id,
    pr.user_id,
    pr.amount,
    pr.status,
    pr.created_at
FROM payment_requests pr
LEFT JOIN deposit_bonuses db ON pr.id = db.deposit_request_id
WHERE pr.request_type = 'deposit'
  AND pr.status = 'approved'
  AND db.id IS NULL
ORDER BY pr.created_at DESC;

-- Check for deposits with multiple bonus records (should be one per deposit)
SELECT 
    'Multiple Bonus Records' AS issue_type,
    deposit_request_id,
    COUNT(*) AS bonus_count
FROM deposit_bonuses
WHERE deposit_request_id IS NOT NULL
GROUP BY deposit_request_id
HAVING COUNT(*) > 1;

-- ============================================
-- 3. REFERRAL SYSTEM INTEGRITY
-- ============================================

-- Check for multiple referral bonuses per user (should be one)
SELECT 
    'Multiple Referral Bonuses' AS issue_type,
    referred_user_id,
    COUNT(*) AS referral_count
FROM referral_bonuses
GROUP BY referred_user_id
HAVING COUNT(*) > 1;

-- Check for referral bonuses without user_referrals record
SELECT 
    'Missing Referral Record' AS issue_type,
    rb.id,
    rb.referrer_user_id,
    rb.referred_user_id,
    rb.referral_id
FROM referral_bonuses rb
LEFT JOIN user_referrals ur ON rb.referral_id = ur.id
WHERE rb.referral_id IS NOT NULL
  AND ur.id IS NULL;

-- ============================================
-- 4. GAME HISTORY INTEGRITY
-- ============================================

-- Check for game history entries with null or invalid winning_round
SELECT 
    'Invalid Round' AS issue_type,
    id,
    game_id,
    winner,
    winning_round,
    total_cards,
    created_at
FROM game_history
WHERE winning_round IS NULL
   OR winning_round < 1
   OR winning_round > 3;

-- Check for game history without game_session
SELECT 
    'Missing Game Session' AS issue_type,
    gh.id,
    gh.game_id,
    gh.winner,
    gh.created_at
FROM game_history gh
LEFT JOIN game_sessions gs ON gh.game_id = gs.game_id
WHERE gs.id IS NULL;

-- Check for game sessions without history
SELECT 
    'Missing Game History' AS issue_type,
    gs.id,
    gs.game_id,
    gs.winner,
    gs.status,
    gs.created_at
FROM game_sessions gs
LEFT JOIN game_history gh ON gs.game_id = gh.game_id
WHERE gs.status = 'completed'
  AND gs.winner IS NOT NULL
  AND gh.id IS NULL;

-- ============================================
-- 5. USER STATS INTEGRITY
-- ============================================

-- Check for users with inconsistent game stats
SELECT 
    'Inconsistent Stats' AS issue_type,
    id,
    COALESCE(full_name, phone) AS user_identifier,
    phone,
    games_played,
    games_won,
    total_winnings,
    total_losses,
    CASE 
        WHEN games_won > games_played THEN 'More wins than games'
        WHEN total_winnings < 0 THEN 'Negative winnings'
        WHEN total_losses < 0 THEN 'Negative losses'
        ELSE 'OK'
    END AS issue_description
FROM users
WHERE games_won > games_played
   OR total_winnings < 0
   OR total_losses < 0;

-- ============================================
-- 6. BALANCE INTEGRITY
-- ============================================

-- Check for negative balances (if not allowed)
SELECT 
    'Negative Balance' AS issue_type,
    id,
    COALESCE(full_name, phone) AS user_identifier,
    phone,
    balance,
    deposit_bonus_available,
    referral_bonus_available
FROM users
WHERE balance < 0;

-- Check for users with bonus but no deposit
SELECT 
    'Bonus Without Deposit' AS issue_type,
    u.id,
    COALESCE(u.full_name, u.phone) AS user_identifier,
    u.phone,
    u.deposit_bonus_available,
    COUNT(pr.id) AS deposit_count
FROM users u
LEFT JOIN payment_requests pr ON u.id = pr.user_id 
    AND pr.request_type = 'deposit' 
    AND pr.status = 'approved'
WHERE u.deposit_bonus_available > 0
GROUP BY u.id, u.full_name, u.phone, u.deposit_bonus_available
HAVING COUNT(pr.id) = 0;

-- ============================================
-- 7. SUMMARY REPORT
-- ============================================

-- Count issues by type
SELECT 
    issue_type,
    COUNT(*) AS issue_count
FROM (
    SELECT 'Invalid Wagering Progress' AS issue_type FROM deposit_bonuses
    WHERE wagering_progress > 100 OR wagering_progress < 0
    UNION ALL
    SELECT 'Should Be Unlocked' FROM deposit_bonuses
    WHERE wagering_completed >= wagering_required AND status = 'locked'
    UNION ALL
    SELECT 'Missing Bonus Record' FROM payment_requests pr
    LEFT JOIN deposit_bonuses db ON pr.id = db.deposit_request_id
    WHERE pr.request_type = 'deposit' AND pr.status = 'approved' AND db.id IS NULL
    UNION ALL
    SELECT 'Invalid Round' FROM game_history
    WHERE winning_round IS NULL OR winning_round < 1 OR winning_round > 3
    UNION ALL
    SELECT 'Inconsistent Stats' FROM users
    WHERE games_won > games_played OR total_winnings < 0 OR total_losses < 0
) AS all_issues
GROUP BY issue_type
ORDER BY issue_count DESC;

