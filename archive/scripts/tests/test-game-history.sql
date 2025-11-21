-- Test queries to diagnose game history issues

-- 1. Check if game_history table exists and has data
SELECT 
    COUNT(*) as total_games,
    MAX(created_at) as last_game
FROM game_history;

-- 2. Get last 5 games with details
SELECT 
    game_id,
    opening_card,
    winner,
    winning_card,
    winning_round,
    total_cards,
    total_bets,
    total_payouts,
    created_at
FROM game_history
ORDER BY created_at DESC
LIMIT 5;

-- 3. Check game_statistics table
SELECT 
    game_id,
    total_players,
    total_bets,
    total_winnings,
    house_earnings,
    created_at
FROM game_statistics
ORDER BY created_at DESC
LIMIT 5;

-- 4. Check dealt_cards for last game
SELECT 
    gc.game_id,
    gh.winner,
    dc.card,
    dc.side,
    dc.position,
    dc.is_winning_card
FROM game_history gh
LEFT JOIN dealt_cards dc ON gh.game_id = dc.game_id
ORDER BY gh.created_at DESC, dc.position ASC
LIMIT 20;

-- 5. Check if RPC function exists
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_name = 'apply_payouts_and_update_bets';

-- 6. Check transaction_status enum values
SELECT unnest(enum_range(NULL::transaction_status)) as status_value;

-- 7. Check admin credentials
SELECT 
    id,
    username,
    role,
    LENGTH(password_hash) as hash_length,
    created_at
FROM admin_credentials;

-- 8. Check recent bets
SELECT 
    id,
    user_id,
    game_id,
    side,
    round,
    amount,
    status,
    actual_payout,
    created_at
FROM player_bets
ORDER BY created_at DESC
LIMIT 10;

-- 9. Verify column names in game_history
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'game_history'
ORDER BY ordinal_position;

-- 10. Check if there are any games in game_sessions
SELECT 
    game_id,
    phase,
    status,
    opening_card,
    winner,
    winning_card,
    created_at
FROM game_sessions
ORDER BY created_at DESC
LIMIT 5;
