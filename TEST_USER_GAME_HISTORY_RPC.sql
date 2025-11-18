-- ============================================================================
-- TEST USER GAME HISTORY RPC FUNCTION
-- ============================================================================
-- This script helps you verify the RPC function is working correctly
-- ============================================================================

-- Step 1: Find a user who has placed bets
SELECT DISTINCT 
  pb.user_id,
  u.username,
  COUNT(DISTINCT pb.game_id) as games_played,
  COUNT(*) as total_bets,
  SUM(pb.amount) as total_bet_amount
FROM player_bets pb
LEFT JOIN users u ON u.id = pb.user_id
GROUP BY pb.user_id, u.username
ORDER BY games_played DESC
LIMIT 10;

-- Step 2: Test the RPC function with the first user from above
-- Replace 'USER_ID_HERE' with an actual user_id from Step 1
-- SELECT * FROM get_user_game_history('USER_ID_HERE', 10);

-- Step 3: Verify the output structure
-- The function should return:
-- - game_id: VARCHAR
-- - opening_card: TEXT
-- - winner: TEXT (andar/bahar)
-- - winning_card: TEXT
-- - winning_round: INT
-- - total_cards: INT
-- - your_bets: JSONB array of bet objects
-- - your_total_bet: NUMERIC
-- - your_total_payout: NUMERIC
-- - your_net_profit: NUMERIC
-- - result: TEXT (win/loss/refund/no_bet)
-- - dealt_cards: JSONB array of card objects
-- - created_at: TIMESTAMPTZ

-- Step 4: Check if function exists
SELECT 
  routine_name,
  routine_type,
  data_type,
  routine_definition
FROM information_schema.routines
WHERE routine_name = 'get_user_game_history'
  AND routine_schema = 'public';

-- Step 5: Check function parameters
SELECT 
  parameter_name,
  data_type,
  parameter_mode
FROM information_schema.parameters
WHERE specific_name IN (
  SELECT specific_name
  FROM information_schema.routines
  WHERE routine_name = 'get_user_game_history'
    AND routine_schema = 'public'
)
ORDER BY ordinal_position;

-- ============================================================================
-- TROUBLESHOOTING
-- ============================================================================

-- If function doesn't exist, run: CREATE_USER_GAME_HISTORY_RPC_FIXED.sql

-- If function returns empty results, check:
-- 1. User has placed bets: SELECT * FROM player_bets WHERE user_id = 'USER_ID';
-- 2. Games exist: SELECT * FROM game_history WHERE game_id IN (SELECT DISTINCT game_id FROM player_bets WHERE user_id = 'USER_ID');
-- 3. Bets are linked to games: SELECT pb.*, gh.* FROM player_bets pb LEFT JOIN game_history gh ON pb.game_id = gh.game_id WHERE pb.user_id = 'USER_ID';

-- If function returns error, check:
-- 1. Column names match: SELECT column_name FROM information_schema.columns WHERE table_name IN ('game_history', 'player_bets', 'dealt_cards');
-- 2. Data types match: SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'game_history';

-- ============================================================================
