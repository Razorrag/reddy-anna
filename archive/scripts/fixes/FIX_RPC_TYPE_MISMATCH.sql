-- ============================================================================
-- FIX RPC FUNCTION TYPE MISMATCH - CRITICAL FIX
-- ============================================================================
-- This fixes the varchar(36) vs TEXT type mismatch causing RPC failures
-- Error: "Returned type varchar(36) does not match expected type text"
-- ============================================================================

-- Drop existing function
DROP FUNCTION IF EXISTS get_user_game_history(TEXT, INT, INT);

-- Create function with correct return types matching database schema
CREATE OR REPLACE FUNCTION get_user_game_history(
  p_user_id TEXT,
  p_limit INT DEFAULT 100,
  p_offset INT DEFAULT 0
)
RETURNS TABLE (
  game_id VARCHAR(36),  -- ✅ FIXED: Changed from TEXT to VARCHAR(36)
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
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    gh.game_id::VARCHAR(36),  -- ✅ FIXED: Explicit cast to VARCHAR(36)
    gh.opening_card,
    gh.winner::TEXT,
    gh.winning_card,
    gh.winning_round,
    gh.total_cards,
    
    -- Aggregate all bets for this user in this game
    COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'id', pb.id,
          'round', pb.round,
          'side', pb.side::TEXT,
          'amount', pb.amount,
          'payout', pb.actual_payout,
          'status', pb.status::TEXT
        ) ORDER BY pb.created_at
      ) FILTER (WHERE pb.id IS NOT NULL),
      '[]'::jsonb
    ) as your_bets,
    
    -- Sum of all bets
    COALESCE(SUM(pb.amount), 0) as your_total_bet,
    
    -- Sum of all payouts
    COALESCE(SUM(pb.actual_payout), 0) as your_total_payout,
    
    -- Net profit = payouts - bets
    COALESCE(SUM(pb.actual_payout), 0) - COALESCE(SUM(pb.amount), 0) as your_net_profit,
    
    -- Result classification
    CASE 
      WHEN COALESCE(SUM(pb.actual_payout), 0) > COALESCE(SUM(pb.amount), 0) THEN 'win'
      WHEN COALESCE(SUM(pb.actual_payout), 0) < COALESCE(SUM(pb.amount), 0) THEN 'loss'
      WHEN COALESCE(SUM(pb.actual_payout), 0) = COALESCE(SUM(pb.amount), 0) AND COALESCE(SUM(pb.amount), 0) > 0 THEN 'refund'
      ELSE 'no_bet'
    END as result,
    
    -- Get all dealt cards for this game
    COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'card', dc.card,
            'side', dc.side::TEXT,
            'position', dc.position,
            'isWinningCard', dc.is_winning_card
          ) ORDER BY dc.position
        )
        FROM dealt_cards dc
        WHERE dc.game_id = gh.game_id
      ),
      '[]'::jsonb
    ) as dealt_cards,
    
    gh.created_at
    
  FROM game_history gh
  LEFT JOIN player_bets pb ON pb.game_id = gh.game_id AND pb.user_id = p_user_id
  WHERE EXISTS (
    SELECT 1 FROM player_bets pb2 
    WHERE pb2.game_id = gh.game_id AND pb2.user_id = p_user_id
  )
  GROUP BY gh.game_id, gh.opening_card, gh.winner, gh.winning_card, 
           gh.winning_round, gh.total_cards, gh.created_at
  ORDER BY gh.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_user_game_history IS 'Returns game history for a specific user with aggregated bet data - FIXED type mismatch';

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_player_bets_user_game 
  ON player_bets(user_id, game_id);

CREATE INDEX IF NOT EXISTS idx_player_bets_created 
  ON player_bets(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_game_history_created 
  ON game_history(created_at DESC);

-- Verify function creation
SELECT 
  proname as function_name,
  pg_get_function_arguments(oid) as arguments,
  pg_get_function_result(oid) as return_type
FROM pg_proc
WHERE proname = 'get_user_game_history';

-- ============================================================================
-- TEST THE FUNCTION
-- ============================================================================
DO $$
DECLARE
  v_test_user_id TEXT;
  v_result_count INT;
BEGIN
  -- Find a user with bets
  SELECT DISTINCT user_id INTO v_test_user_id
  FROM player_bets
  LIMIT 1;
  
  IF v_test_user_id IS NULL THEN
    RAISE NOTICE '❌ No users with bets found.';
    RETURN;
  END IF;
  
  RAISE NOTICE '✅ Testing with user ID: %', v_test_user_id;
  
  -- Test the function
  SELECT COUNT(*) INTO v_result_count
  FROM get_user_game_history(v_test_user_id, 10);
  
  RAISE NOTICE '✅ Function returned % game history records', v_result_count;
  RAISE NOTICE '🎉 RPC function type mismatch FIXED!';
END $$;