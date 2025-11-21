-- ============================================
-- DATABASE VERIFICATION & FIXES SCRIPT
-- Comprehensive checks and fixes for critical issues
-- ============================================

-- ============================================
-- 1. CHECK FOR DUPLICATE FUNCTIONS
-- ============================================
-- This checks for the "function ambiguity" error mentioned

-- Check for duplicate apply_payouts_and_update_bets functions
SELECT 
    proname AS function_name,
    pg_get_function_arguments(oid) AS arguments,
    pg_get_functiondef(oid) AS definition,
    oid
FROM pg_proc
WHERE proname = 'apply_payouts_and_update_bets'
ORDER BY oid;

-- If duplicates found, list them with their schemas
SELECT 
    n.nspname AS schema_name,
    p.proname AS function_name,
    pg_get_function_arguments(p.oid) AS arguments,
    p.oid
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.proname = 'apply_payouts_and_update_bets'
ORDER BY n.nspname, p.oid;

-- ============================================
-- 2. DROP DUPLICATE FUNCTIONS (if found)
-- ============================================
-- ⚠️ WARNING: Only run this if duplicates are found!
-- Replace 'schema_name' and 'oid' with actual values from query above

-- Example (DO NOT RUN WITHOUT CHECKING FIRST):
-- DROP FUNCTION IF EXISTS schema_name.apply_payouts_and_update_bets(...);
-- Keep only the correct version

-- ============================================
-- 3. VERIFY BONUS SYSTEM TABLES
-- ============================================

-- Check if deposit_bonuses table exists and has correct structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'deposit_bonuses'
ORDER BY ordinal_position;

-- Check if referral_bonuses table exists
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'referral_bonuses'
ORDER BY ordinal_position;

-- Check if bonus_transactions table exists
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'bonus_transactions'
ORDER BY ordinal_position;

-- ============================================
-- 4. VERIFY GAME HISTORY TABLE
-- ============================================

-- Check game_history table structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'game_history'
ORDER BY ordinal_position;

-- Check if winning_round column exists and has data
SELECT 
    COUNT(*) AS total_games,
    COUNT(winning_round) AS games_with_round,
    MIN(winning_round) AS min_round,
    MAX(winning_round) AS max_round,
    COUNT(CASE WHEN winning_round IS NULL THEN 1 END) AS null_rounds
FROM game_history;

-- Check recent game history entries
SELECT 
    id,
    game_id,
    opening_card,
    winner,
    winning_card,
    winning_round,
    total_bets,
    total_payouts,
    created_at
FROM game_history
ORDER BY created_at DESC
LIMIT 10;

-- ============================================
-- 5. VERIFY BONUS DATA INTEGRITY
-- ============================================

-- Check deposit bonuses status distribution
SELECT 
    status,
    COUNT(*) AS count,
    SUM(bonus_amount) AS total_bonus,
    SUM(wagering_completed) AS total_wagered,
    SUM(wagering_required) AS total_required
FROM deposit_bonuses
GROUP BY status;

-- Check for bonuses with invalid wagering progress
SELECT 
    id,
    user_id,
    bonus_amount,
    wagering_required,
    wagering_completed,
    wagering_progress,
    status,
    CASE 
        WHEN wagering_progress > 100 THEN 'OVER 100%'
        WHEN wagering_progress < 0 THEN 'NEGATIVE'
        WHEN wagering_completed > wagering_required AND status = 'locked' THEN 'SHOULD BE UNLOCKED'
        ELSE 'OK'
    END AS issue
FROM deposit_bonuses
WHERE wagering_progress > 100 
   OR wagering_progress < 0
   OR (wagering_completed >= wagering_required AND status = 'locked');

-- Check for bonuses that should be unlocked but aren't
SELECT 
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
  AND status = 'locked'
ORDER BY locked_at DESC;

-- ============================================
-- 6. FIX BONUSES THAT SHOULD BE UNLOCKED
-- ============================================

-- Auto-unlock bonuses that meet wagering requirement
UPDATE deposit_bonuses
SET 
    status = 'unlocked',
    unlocked_at = NOW(),
    updated_at = NOW()
WHERE wagering_completed >= wagering_required 
  AND status = 'locked'
  AND unlocked_at IS NULL;

-- Log the unlock action
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
WHERE wagering_completed >= wagering_required 
  AND status = 'unlocked'
  AND unlocked_at >= NOW() - INTERVAL '1 minute';

-- ============================================
-- 7. VERIFY REFERRAL BONUS DATA
-- ============================================

-- Check referral bonuses status
SELECT 
    status,
    COUNT(*) AS count,
    SUM(bonus_amount) AS total_bonus
FROM referral_bonuses
GROUP BY status;

-- Check for duplicate referral bonuses (should only be one per referred user)
SELECT 
    referred_user_id,
    COUNT(*) AS duplicate_count
FROM referral_bonuses
GROUP BY referred_user_id
HAVING COUNT(*) > 1;

-- Check referral bonuses that should be credited but aren't
SELECT 
    rb.id,
    rb.referrer_user_id,
    rb.referred_user_id,
    rb.bonus_amount,
    rb.status,
    rb.created_at,
    ur.deposit_amount
FROM referral_bonuses rb
JOIN user_referrals ur ON rb.referral_id = ur.id
WHERE rb.status = 'pending'
  AND ur.bonus_applied = false
ORDER BY rb.created_at DESC;

-- ============================================
-- 8. VERIFY PAYMENT REQUESTS
-- ============================================

-- Check payment requests status distribution
SELECT 
    status,
    request_type,
    COUNT(*) AS count,
    SUM(amount) AS total_amount
FROM payment_requests
GROUP BY status, request_type
ORDER BY status, request_type;

-- Check for deposits without bonus records
SELECT 
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

-- ============================================
-- 9. VERIFY USER STATS
-- ============================================

-- Check if user stats are being updated
SELECT 
    COUNT(*) AS total_users,
    SUM(games_played) AS total_games_played,
    SUM(games_won) AS total_games_won,
    SUM(total_winnings) AS total_winnings,
    SUM(total_losses) AS total_losses
FROM users;

-- Check users with inconsistent stats
SELECT 
    id,
    COALESCE(full_name, phone) AS user_identifier,
    phone,
    games_played,
    games_won,
    total_winnings,
    total_losses,
    CASE 
        WHEN games_won > games_played THEN 'MORE WINS THAN GAMES'
        WHEN total_winnings < 0 THEN 'NEGATIVE WINNINGS'
        WHEN total_losses < 0 THEN 'NEGATIVE LOSSES'
        ELSE 'OK'
    END AS issue
FROM users
WHERE games_won > games_played
   OR total_winnings < 0
   OR total_losses < 0;

-- ============================================
-- 10. VERIFY GAME SESSIONS
-- ============================================

-- Check game sessions status
SELECT 
    status,
    phase,
    COUNT(*) AS count
FROM game_sessions
GROUP BY status, phase
ORDER BY status, phase;

-- Check for incomplete game sessions
SELECT 
    id,
    game_id,
    phase,
    status,
    winner,
    created_at,
    updated_at
FROM game_sessions
WHERE status = 'active'
  AND phase = 'complete'
ORDER BY updated_at DESC;

-- ============================================
-- 11. FIX INCOMPLETE GAME SESSIONS
-- ============================================

-- Mark game sessions as completed if they have a winner
UPDATE game_sessions
SET 
    status = 'completed',
    updated_at = NOW()
WHERE status = 'active'
  AND phase = 'complete'
  AND winner IS NOT NULL;

-- ============================================
-- 12. VERIFY INDEXES
-- ============================================

-- Check indexes on deposit_bonuses
SELECT 
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'deposit_bonuses';

-- Check indexes on referral_bonuses
SELECT 
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'referral_bonuses';

-- Check indexes on game_history
SELECT 
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'game_history';

-- ============================================
-- 13. SUMMARY REPORT
-- ============================================

-- Generate summary report
SELECT 
    'Total Users' AS metric,
    COUNT(*)::TEXT AS value
FROM users
UNION ALL
SELECT 
    'Total Deposit Bonuses',
    COUNT(*)::TEXT
FROM deposit_bonuses
UNION ALL
SELECT 
    'Locked Bonuses',
    COUNT(*)::TEXT
FROM deposit_bonuses
WHERE status = 'locked'
UNION ALL
SELECT 
    'Unlocked Bonuses',
    COUNT(*)::TEXT
FROM deposit_bonuses
WHERE status = 'unlocked'
UNION ALL
SELECT 
    'Credited Bonuses',
    COUNT(*)::TEXT
FROM deposit_bonuses
WHERE status = 'credited'
UNION ALL
SELECT 
    'Total Referral Bonuses',
    COUNT(*)::TEXT
FROM referral_bonuses
UNION ALL
SELECT 
    'Total Game History',
    COUNT(*)::TEXT
FROM game_history
UNION ALL
SELECT 
    'Pending Deposits',
    COUNT(*)::TEXT
FROM payment_requests
WHERE request_type = 'deposit' AND status = 'pending'
UNION ALL
SELECT 
    'Approved Deposits',
    COUNT(*)::TEXT
FROM payment_requests
WHERE request_type = 'deposit' AND status = 'approved'
UNION ALL
SELECT 
    'Active Game Sessions',
    COUNT(*)::TEXT
FROM game_sessions
WHERE status = 'active';

-- ============================================
-- END OF SCRIPT
-- ============================================

