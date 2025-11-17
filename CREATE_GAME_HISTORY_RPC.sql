-- ============================================================================
-- CREATE RPC FUNCTION FOR USER GAME HISTORY
-- ============================================================================
-- This bypasses the need for foreign key constraints
-- and provides a clean, efficient way to get user game history
-- ============================================================================

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS get_user_game_history(TEXT, INT);

-- Create the RPC function
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
  total_bets NUMERIC,
  total_payout NUMERIC,
  net_profit NUMERIC,
  result TEXT,
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
    SUM(pb.amount)::NUMERIC as total_bets,
    SUM(COALESCE(pb.actual_payout, 0))::NUMERIC as total_payout,
    (SUM(COALESCE(pb.actual_payout, 0)) - SUM(pb.amount))::NUMERIC as net_profit,
    CASE 
      WHEN SUM(COALESCE(pb.actual_payout, 0)) > SUM(pb.amount) THEN 'win'
      WHEN SUM(COALESCE(pb.actual_payout, 0)) = SUM(pb.amount) THEN 'refund'
      ELSE 'loss'
    END as result,
    gh.created_at
  FROM game_history gh
  INNER JOIN player_bets pb ON gh.game_id = pb.game_id
  WHERE pb.user_id = p_user_id
  GROUP BY gh.game_id, gh.opening_card, gh.winner, gh.winning_card, gh.winning_round, gh.total_cards, gh.created_at
  ORDER BY gh.created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Test the function
SELECT * FROM get_user_game_history('9876543210', 10);

-- Verify function was created
SELECT routine_name, routine_definition
FROM information_schema.routines
WHERE routine_name = 'get_user_game_history';

-- ============================================================================
-- After running this, update storage-supabase.ts to use this RPC function
-- ============================================================================
