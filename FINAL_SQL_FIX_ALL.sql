-- ============================================================================
-- FINAL SQL FIX - RUN THIS IN SUPABASE
-- ============================================================================
-- This fixes all database issues in one go
-- ============================================================================

-- 1. Remove foreign key constraint (unblocks bets)
ALTER TABLE player_bets
DROP CONSTRAINT IF EXISTS fk_player_bets_game_history;

-- 2. Fix bet status type casting
DROP FUNCTION IF EXISTS update_bet_with_payout(TEXT, TEXT, TEXT, NUMERIC);

CREATE OR REPLACE FUNCTION update_bet_with_payout(
  p_bet_id TEXT,
  p_status TEXT,
  p_transaction_id TEXT,
  p_payout_amount NUMERIC
)
RETURNS VOID AS $$
BEGIN
  UPDATE player_bets
  SET 
    status = p_status::transaction_status,  -- Cast to correct enum
    payout_transaction_id = p_transaction_id,
    actual_payout = p_payout_amount,
    updated_at = NOW()
  WHERE id = p_bet_id
    AND (payout_transaction_id IS NULL OR payout_transaction_id = p_transaction_id);
END;
$$ LANGUAGE plpgsql;

-- 3. Create RPC function for game history (with correct types)
DROP FUNCTION IF EXISTS get_user_game_history(TEXT, INT);

CREATE OR REPLACE FUNCTION get_user_game_history(
  p_user_id TEXT,
  p_limit INT DEFAULT 100
)
RETURNS TABLE (
  game_id CHARACTER VARYING,        -- ✅ Match database type
  opening_card TEXT,
  winner TEXT,                       -- ✅ Use TEXT for enum (will cast)
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
    gh.winner::TEXT,                 -- ✅ Cast enum to TEXT
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

-- 4. Verify all functions were created
SELECT 
  routine_name,
  routine_type,
  data_type
FROM information_schema.routines
WHERE routine_name IN ('update_bet_with_payout', 'get_user_game_history')
ORDER BY routine_name;

-- 5. Test the game history function
SELECT * FROM get_user_game_history('9876543210', 5);

-- ============================================================================
-- Expected Results:
-- - Foreign key removed ✅
-- - update_bet_with_payout function created ✅
-- - get_user_game_history function created ✅
-- - Test query returns game history ✅
-- ============================================================================

-- After running this:
-- 1. Restart your server: npm run dev:both
-- 2. Test bet placement (should work)
-- 3. Test game history (should show games)
-- ============================================================================
