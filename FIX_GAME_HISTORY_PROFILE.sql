-- ============================================================================
-- FIX: Game History Not Showing in Profile
-- ============================================================================
-- This script creates the required RPC function for user game history
-- Run this in your PostgreSQL database
-- ============================================================================

-- 1. Drop existing function if it exists
DROP FUNCTION IF EXISTS get_user_game_history(TEXT, INT);
DROP FUNCTION IF EXISTS get_user_game_history(TEXT);

-- 2. Create the RPC function to fetch user game history
CREATE OR REPLACE FUNCTION get_user_game_history(
  p_user_id TEXT,
  p_limit INT DEFAULT 100
)
RETURNS TABLE (
  id TEXT,
  game_id TEXT,
  opening_card TEXT,
  winner TEXT,
  winning_card TEXT,
  your_bets JSONB,
  your_total_bet NUMERIC,
  your_total_payout NUMERIC,
  your_net_profit NUMERIC,
  result TEXT,
  total_cards INT,
  round INT,
  dealt_cards JSONB,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    g.game_id::TEXT as id,
    g.game_id::TEXT,
    g.opening_card,
    g.winner::TEXT,
    g.winning_card,
    -- Aggregate all user's bets for this game
    COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', b.id,
            'side', b.side,
            'amount', b.amount,
            'round', b.round,
            'payout', COALESCE(b.actual_payout, 0)
          )
        )
        FROM player_bets b
        WHERE b.game_id = g.game_id AND b.user_id = p_user_id
      ),
      '[]'::jsonb
    ) as your_bets,
    -- Total bet amount
    COALESCE(
      (
        SELECT SUM(b.amount)
        FROM player_bets b
        WHERE b.game_id = g.game_id AND b.user_id = p_user_id
      ),
      0
    )::NUMERIC as your_total_bet,
    -- Total payout amount
    COALESCE(
      (
        SELECT SUM(COALESCE(b.actual_payout, 0))
        FROM player_bets b
        WHERE b.game_id = g.game_id AND b.user_id = p_user_id
      ),
      0
    )::NUMERIC as your_total_payout,
    -- Net profit (payout - bet)
    (
      COALESCE(
        (
          SELECT SUM(COALESCE(b.actual_payout, 0))
          FROM player_bets b
          WHERE b.game_id = g.game_id AND b.user_id = p_user_id
        ),
        0
      ) - COALESCE(
        (
          SELECT SUM(b.amount)
          FROM player_bets b
          WHERE b.game_id = g.game_id AND b.user_id = p_user_id
        ),
        0
      )
    )::NUMERIC as your_net_profit,
    -- Result (win/loss/no_bet)
    CASE
      WHEN NOT EXISTS (SELECT 1 FROM player_bets b WHERE b.game_id = g.game_id AND b.user_id = p_user_id) THEN 'no_bet'
      WHEN (
        COALESCE(
          (SELECT SUM(COALESCE(b.actual_payout, 0)) FROM player_bets b WHERE b.game_id = g.game_id AND b.user_id = p_user_id),
          0
        ) - COALESCE(
          (SELECT SUM(b.amount) FROM player_bets b WHERE b.game_id = g.game_id AND b.user_id = p_user_id),
          0
        )
      ) > 0 THEN 'win'
      WHEN (
        COALESCE(
          (SELECT SUM(COALESCE(b.actual_payout, 0)) FROM player_bets b WHERE b.game_id = g.game_id AND b.user_id = p_user_id),
          0
        ) - COALESCE(
          (SELECT SUM(b.amount) FROM player_bets b WHERE b.game_id = g.game_id AND b.user_id = p_user_id),
          0
        )
      ) < 0 THEN 'loss'
      ELSE 'no_bet'
    END as result,
    -- Total cards dealt
    COALESCE(
      (SELECT COUNT(*) FROM dealt_cards dc WHERE dc.game_id = g.game_id),
      0
    )::INT as total_cards,
    -- Winning round
    COALESCE(g.winning_round, 1)::INT as round,
    -- All dealt cards
    COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'card', dc.card,
            'side', dc.side,
            'position', dc.position
          ) ORDER BY dc.position
        )
        FROM dealt_cards dc
        WHERE dc.game_id = g.game_id
      ),
      '[]'::jsonb
    ) as dealt_cards,
    g.created_at
  FROM game_sessions g
  WHERE g.status = 'completed'
  AND EXISTS (
    SELECT 1 FROM player_bets b WHERE b.game_id = g.game_id AND b.user_id = p_user_id
  )
  ORDER BY g.created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- 3. Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_user_game_history(TEXT, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_game_history(TEXT, INT) TO anon;

-- 4. Test the function with a sample user
-- Replace '9876543210' with an actual user ID from your database
-- SELECT * FROM get_user_game_history('9876543210', 10);

-- 5. Verify function was created
SELECT 
  routine_name,
  routine_type,
  data_type
FROM information_schema.routines
WHERE routine_name = 'get_user_game_history';

-- ============================================================================
-- Expected Results:
-- - Function created successfully ✅
-- - Returns user's game history with bet details ✅
-- - Profile page should now show game history ✅
-- ============================================================================

-- ============================================================================
-- TROUBLESHOOTING
-- ============================================================================

-- If game history is still empty, check:

-- 1. Do you have any completed games?
SELECT COUNT(*) as completed_games FROM game_sessions WHERE status = 'completed';

-- 2. Do you have any bets?
SELECT COUNT(*) as total_bets FROM player_bets;

-- 3. Test with your actual user ID (replace 'YOUR_USER_ID'):
-- SELECT * FROM get_user_game_history('YOUR_USER_ID', 10);

-- 4. Check if user has placed any bets:
-- SELECT COUNT(*) FROM player_bets WHERE user_id = 'YOUR_USER_ID';

-- 5. Check recent completed games with bets:
SELECT 
  g.game_id,
  g.opening_card,
  g.winner,
  g.status,
  COUNT(b.id) as bet_count,
  g.created_at
FROM game_sessions g
LEFT JOIN player_bets b ON g.game_id = b.game_id
WHERE g.status = 'completed'
GROUP BY g.game_id, g.opening_card, g.winner, g.status, g.created_at
ORDER BY g.created_at DESC
LIMIT 10;

-- ============================================================================
