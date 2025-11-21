-- ============================================================================
-- QUICK FIX FOR GAME HISTORY SHOWING 0 DATA
-- ============================================================================
-- Run this script to fix game history issues immediately
-- ============================================================================

-- Step 1: Drop and recreate the RPC function with correct signature
DROP FUNCTION IF EXISTS get_user_game_history(TEXT, INT, INT);
DROP FUNCTION IF EXISTS get_user_game_history(TEXT, INT);
DROP FUNCTION IF EXISTS get_user_game_history(TEXT);

-- Create the function with all possible parameter combinations
CREATE OR REPLACE FUNCTION get_user_game_history(
  p_user_id TEXT,
  p_limit INT DEFAULT 100,
  p_offset INT DEFAULT 0
)
RETURNS TABLE (
  game_id TEXT,
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
    gh.game_id,
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

COMMENT ON FUNCTION get_user_game_history IS 'Returns game history for a specific user with aggregated bet data';

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Check function was created
SELECT 
  proname as function_name,
  pg_get_function_arguments(oid) as arguments
FROM pg_proc
WHERE proname = 'get_user_game_history';

-- Expected output: Should show the function with 3 parameters

-- ============================================================================
-- TEST THE FUNCTION
-- ============================================================================

-- Get a user ID who has placed bets
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
    RAISE NOTICE '❌ No users with bets found. Place at least one bet first.';
    RETURN;
  END IF;
  
  RAISE NOTICE '✅ Testing with user ID: %', v_test_user_id;
  
  -- Test the function
  SELECT COUNT(*) INTO v_result_count
  FROM get_user_game_history(v_test_user_id, 10);
  
  RAISE NOTICE '✅ Function returned % game history records', v_result_count;
  
  IF v_result_count = 0 THEN
    RAISE NOTICE '⚠️ No game history found. Possible reasons:';
    RAISE NOTICE '   1. Games not saved to game_history table';
    RAISE NOTICE '   2. Bets not linked to completed games';
    RAISE NOTICE '   3. User bets are still pending';
  ELSE
    RAISE NOTICE '🎉 Game history is working correctly!';
  END IF;
END $$;

-- ============================================================================
-- MANUAL TEST (uncomment and replace user ID)
-- ============================================================================

-- Replace 'your-user-id-here' with an actual user ID from your database
-- SELECT * FROM get_user_game_history('your-user-id-here', 20);

-- ============================================================================
-- NEXT STEPS
-- ============================================================================
-- 
-- 1. ✅ Function created successfully
-- 2. Restart your server: npm run dev:both
-- 3. Check browser console for debug logs
-- 4. If still showing 0 data, run DIAGNOSE_GAME_HISTORY_ISSUE.sql
-- 
-- ============================================================================
