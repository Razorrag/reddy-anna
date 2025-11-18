-- ============================================================================
-- CREATE COMPLETE RPC FUNCTION FOR USER GAME HISTORY
-- ============================================================================
-- This function returns ALL data needed by the frontend including:
-- - Game history details (winner, cards, etc.)
-- - User's bets for each game (as JSON array)
-- - User's dealt cards for each game (as JSON array)
-- - Aggregated totals (total bet, total payout, net profit)
-- ============================================================================

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS get_user_game_history(TEXT, INT);

-- Create the complete RPC function
CREATE OR REPLACE FUNCTION get_user_game_history(
  p_user_id TEXT,
  p_limit INT DEFAULT 100
)
RETURNS TABLE (
  game_id CHARACTER VARYING,
  opening_card TEXT,
  winner TEXT,
  winning_card TEXT,
  winning_round INT,
  total_cards INT,
  your_bets JSONB,
  your_total_bet NUMERIC,
  your_total_payout NUMERIC,
  your_net_profit NUMERIC,
  result TEXT,
  dealt_cards JSONB,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    gh.game_id,
    gh.opening_card,
    gh.winner::TEXT,
    gh.winning_card,
    gh.winning_round,
    gh.total_cards,
    -- Aggregate user's bets as JSON array
    COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'id', pb.id,
          'amount', pb.amount,
          'side', pb.side,
          'round', pb.round,
          'actual_payout', COALESCE(pb.actual_payout, 0),
          'status', pb.status
        ) ORDER BY pb.round, pb.created_at
      ) FILTER (WHERE pb.id IS NOT NULL),
      '[]'::jsonb
    ) as your_bets,
    -- Total bet amount
    COALESCE(SUM(pb.amount), 0)::NUMERIC as your_total_bet,
    -- Total payout amount
    COALESCE(SUM(pb.actual_payout), 0)::NUMERIC as your_total_payout,
    -- Net profit (payout - bet)
    (COALESCE(SUM(pb.actual_payout), 0) - COALESCE(SUM(pb.amount), 0))::NUMERIC as your_net_profit,
    -- Result classification
    CASE 
      WHEN COALESCE(SUM(pb.actual_payout), 0) > COALESCE(SUM(pb.amount), 0) THEN 'win'
      WHEN COALESCE(SUM(pb.actual_payout), 0) = COALESCE(SUM(pb.amount), 0) AND COALESCE(SUM(pb.amount), 0) > 0 THEN 'refund'
      WHEN COALESCE(SUM(pb.amount), 0) > 0 THEN 'loss'
      ELSE 'no_bet'
    END as result,
    -- Get dealt cards for this game as JSON array
    COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'card', dc.card,
            'side', dc.side,
            'position', dc.position,
            'round', dc.round
          ) ORDER BY dc.position
        )
        FROM dealt_cards dc
        WHERE dc.game_id = gh.game_id
      ),
      '[]'::jsonb
    ) as dealt_cards,
    gh.created_at
  FROM game_history gh
  LEFT JOIN player_bets pb ON gh.game_id = pb.game_id AND pb.user_id = p_user_id
  WHERE EXISTS (
    SELECT 1 FROM player_bets pb2 
    WHERE pb2.game_id = gh.game_id AND pb2.user_id = p_user_id
  )
  GROUP BY gh.game_id, gh.opening_card, gh.winner, gh.winning_card, gh.winning_round, gh.total_cards, gh.created_at
  ORDER BY gh.created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================
-- Allow authenticated users to call this function
GRANT EXECUTE ON FUNCTION get_user_game_history(TEXT, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_game_history(TEXT, INT) TO anon;

-- ============================================================================
-- TEST THE FUNCTION
-- ============================================================================
-- Replace '9876543210' with an actual user ID from your database
-- SELECT * FROM get_user_game_history('9876543210', 10);

-- ============================================================================
-- VERIFY FUNCTION WAS CREATED
-- ============================================================================
SELECT 
  routine_name, 
  routine_type,
  data_type
FROM information_schema.routines
WHERE routine_name = 'get_user_game_history'
  AND routine_schema = 'public';

-- ============================================================================
-- USAGE INSTRUCTIONS
-- ============================================================================
-- 1. Run this SQL in your Supabase SQL Editor
-- 2. Verify the function was created (check output above)
-- 3. Test with a real user ID that has game history
-- 4. The frontend code in storage-supabase.ts is already configured to use this
-- 5. Restart your Node.js server to apply changes
-- ============================================================================
