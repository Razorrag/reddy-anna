-- Check if game data exists with card information

-- ====================================
-- REFERRAL DATA DIAGNOSTIC QUERIES
-- ====================================

-- 1. Check user_referrals table
SELECT 
    'user_referrals count' as info,
    COUNT(*) as count
FROM user_referrals;

-- 2. Check referral_bonuses table
SELECT 
    'referral_bonuses count' as info,
    COUNT(*) as count
FROM referral_bonuses;

-- 3. Check referral bonuses by status
SELECT 
    status,
    COUNT(*) as count,
    SUM(bonus_amount) as total_amount
FROM referral_bonuses
GROUP BY status;

-- 4. Find referral bonuses for 'jack' (example user)
SELECT 
    rb.id,
    rb.bonus_amount,
    rb.status,
    rb.credited_at,
    u_referred.phone as referred_phone,
    u_referrer.phone as referrer_phone
FROM referral_bonuses rb
LEFT JOIN users u_referred ON rb.referred_user_id = u_referred.id
LEFT JOIN users u_referrer ON rb.referrer_user_id = u_referrer.id
WHERE u_referred.phone LIKE '%jack%' OR u_referrer.phone LIKE '%jack%'
ORDER BY rb.created_at DESC;

-- 5. Check recent referral activity
SELECT 
    ur.id,
    ur.deposit_amount,
    ur.bonus_amount,
    ur.bonus_applied,
    u_referrer.phone as referrer_phone,
    u_referred.phone as referred_phone,
    ur.created_at
FROM user_referrals ur
LEFT JOIN users u_referrer ON ur.referrer_user_id = u_referrer.id
LEFT JOIN users u_referred ON ur.referred_user_id = u_referred.id
WHERE ur.created_at >= NOW() - INTERVAL '7 days'
ORDER BY ur.created_at DESC;

-- 6. Check if anyone used referral code 3161E17D
SELECT 
    u.id,
    u.phone,
    u.referral_code,
    u.created_at
FROM users u
WHERE u.referral_code = (
    SELECT referral_code_generated 
    FROM users 
    WHERE id = '8209093944'
);

-- 7. Check specifically for referral code 3161E17D
SELECT 
    u.id,
    u.phone,
    u.referral_code,
    u.created_at,
    'Used referral code 3161E17D' as info
FROM users u
WHERE u.referral_code = '3161E17D';

-- 8. Check if there are any user_referrals for this referrer
SELECT 
    ur.id,
    ur.referred_user_id,
    ur.deposit_amount,
    ur.bonus_amount,
    ur.bonus_applied,
    ur.created_at,
    u_referred.phone as referred_phone
FROM user_referrals ur
LEFT JOIN users u_referred ON ur.referred_user_id = u_referred.id
WHERE ur.referrer_user_id = '8209093944';

-- 9. Check if there are any referral_bonuses for this referrer
SELECT 
    rb.id,
    rb.referred_user_id,
    rb.bonus_amount,
    rb.status,
    rb.created_at,
    rb.credited_at,
    u_referred.phone as referred_phone
FROM referral_bonuses rb
LEFT JOIN users u_referred ON rb.referred_user_id = u_referred.id
WHERE rb.referrer_user_id = '8209093944';

-- ====================================
-- GAME DATA DIAGNOSTIC QUERIES
-- ====================================

-- 1. Count total games in game_sessions
SELECT 
    'Total Games in game_sessions' as info,
    COUNT(*) as count
FROM game_sessions;

-- 2. Count games WITH card data
SELECT 
    'Games WITH card data' as info,
    COUNT(*) as count
FROM game_sessions
WHERE opening_card IS NOT NULL 
  AND winning_card IS NOT NULL 
  AND winner IS NOT NULL;

-- 3. Show recent games with their card data
SELECT 
    game_id,
    opening_card,
    winner,
    winning_card,
    status,
    created_at
FROM game_sessions
ORDER BY created_at DESC
LIMIT 10;

-- 4. Check game_statistics table
SELECT 
    'Total Games in game_statistics' as info,
    COUNT(*) as count
FROM game_statistics;

-- 5. Show recent game statistics
SELECT 
    game_id,
    total_bets,
    house_earnings,
    profit_loss,
    created_at
FROM game_statistics
ORDER BY created_at DESC
LIMIT 10;

-- 6. JOIN to see what partner API would return
SELECT 
    gs.game_id,
    gs.created_at,
    gs.total_bets,
    gs.profit_loss,
    sess.opening_card,
    sess.winner::text as winner,
    sess.winning_card
FROM game_statistics gs
LEFT JOIN game_sessions sess ON sess.game_id = gs.game_id
ORDER BY gs.created_at DESC
LIMIT 10;