-- ============================================================================
-- TEST: Game History Function
-- ============================================================================

-- Step 1: Find your user ID (phone number)
-- Replace 'YOUR_PHONE' with your actual phone number
SELECT id, phone, full_name FROM users WHERE phone = 'YOUR_PHONE';

-- Step 2: Check if you have any bets
-- Replace 'YOUR_USER_ID' with the ID from Step 1
SELECT 
  user_id,
  game_id,
  side,
  amount,
  actual_payout,
  created_at
FROM player_bets 
WHERE user_id = 'YOUR_USER_ID'
ORDER BY created_at DESC
LIMIT 10;

-- Step 3: Test the game history function
-- Replace 'YOUR_USER_ID' with your actual user ID
SELECT * FROM get_user_game_history('YOUR_USER_ID', 10);

-- ============================================================================
-- If you don't know your user ID, find all users who have placed bets:
-- ============================================================================

SELECT DISTINCT
  u.id,
  u.phone,
  u.full_name,
  COUNT(pb.id) as total_bets
FROM users u
INNER JOIN player_bets pb ON u.id = pb.user_id
GROUP BY u.id, u.phone, u.full_name
ORDER BY total_bets DESC
LIMIT 20;

-- ============================================================================
-- Quick test with any user who has bets:
-- ============================================================================

-- This will show game history for the user with the most bets
SELECT * FROM get_user_game_history(
  (
    SELECT user_id 
    FROM player_bets 
    GROUP BY user_id 
    ORDER BY COUNT(*) DESC 
    LIMIT 1
  ),
  10
);
