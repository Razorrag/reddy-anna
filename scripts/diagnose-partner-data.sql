-- =====================================================
-- PARTNER SYSTEM - DATA DIAGNOSIS
-- =====================================================
-- Run this to check why card data is not showing
-- =====================================================

-- 1. Check if partner tables exist
SELECT 'Partner Tables Check' as check_type;
SELECT table_name 
FROM information_schema.tables 
WHERE table_name IN ('partners', 'admin_partner_settings')
ORDER BY table_name;

-- 2. Check if any partners exist
SELECT 'Partners Count' as check_type;
SELECT 
    COUNT(*) as total_partners,
    COUNT(CASE WHEN status = 'active' THEN 1 END) as active_partners,
    COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_partners
FROM partners;

-- 3. Check partner details
SELECT 'Partner Details' as check_type;
SELECT 
    id,
    phone,
    full_name,
    status,
    share_percentage,
    created_at,
    last_login
FROM partners
ORDER BY created_at DESC
LIMIT 5;

-- 4. Check if game_statistics table has data
SELECT 'Game Statistics Count' as check_type;
SELECT COUNT(*) as total_games
FROM game_statistics;

-- 5. Check recent game_statistics entries
SELECT 'Recent Game Statistics' as check_type;
SELECT 
    id,
    game_id,
    created_at,
    total_bets,
    house_earnings,
    profit_loss
FROM game_statistics
ORDER BY created_at DESC
LIMIT 5;

-- 6. Check if game_sessions table exists and has data
SELECT 'Game Sessions Check' as check_type;
SELECT 
    COUNT(*) as total_sessions,
    COUNT(opening_card) as sessions_with_opening_card,
    COUNT(winning_card) as sessions_with_winning_card,
    COUNT(winner) as sessions_with_winner
FROM game_sessions;

-- 7. Check recent game_sessions with card data
SELECT 'Recent Game Sessions with Cards' as check_type;
SELECT 
    game_id,
    opening_card,
    winner,
    winning_card,
    total_cards,
    status,
    created_at
FROM game_sessions
WHERE opening_card IS NOT NULL
ORDER BY created_at DESC
LIMIT 5;

-- 8. Check if game_statistics and game_sessions are linked properly
SELECT 'Statistics vs Sessions Comparison' as check_type;
SELECT 
    (SELECT COUNT(DISTINCT game_id) FROM game_statistics) as stats_game_count,
    (SELECT COUNT(DISTINCT game_id) FROM game_sessions) as sessions_game_count,
    (SELECT COUNT(*) FROM game_statistics gs 
     WHERE EXISTS (
        SELECT 1 FROM game_sessions sess 
        WHERE sess.game_id = gs.game_id
     )) as linked_games_count;

-- 9. Sample joined data (what partner API fetches)
SELECT 'Sample Partner View Data' as check_type;
SELECT 
    gs.game_id,
    gs.created_at,
    gs.total_bets,
    gs.house_earnings,
    gs.profit_loss,
    sess.opening_card,
    sess.winner,
    sess.winning_card
FROM game_statistics gs
LEFT JOIN game_sessions sess ON sess.game_id = gs.game_id
ORDER BY gs.created_at DESC
LIMIT 5;

-- 10. Check admin_partner_settings
SELECT 'Partner Settings' as check_type;
SELECT 
    setting_key,
    setting_value,
    description
FROM admin_partner_settings
ORDER BY setting_key;