-- Check if game data exists with card information

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