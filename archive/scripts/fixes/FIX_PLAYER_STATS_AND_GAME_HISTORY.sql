-- ============================================================================
-- FIX PLAYER STATS AND GAME HISTORY
-- ============================================================================
-- This script fixes critical issues with player statistics and game history:
-- 1. Creates proper get_user_game_history RPC function
-- 2. Creates reconciliation function for analytics
-- 3. Creates trigger to auto-update player stats
-- 4. Provides migration to recalculate existing player stats
-- ============================================================================

-- ============================================================================
-- PART 1: CREATE/UPDATE get_user_game_history RPC FUNCTION
-- ============================================================================

DROP FUNCTION IF EXISTS get_user_game_history(TEXT, INT);

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
-- PART 2: CREATE ANALYTICS RECONCILIATION FUNCTION
-- ============================================================================

DROP FUNCTION IF EXISTS reconcile_analytics();

CREATE OR REPLACE FUNCTION reconcile_analytics()
RETURNS TABLE (
  table_name TEXT,
  records_updated INT,
  status TEXT
) AS $$
DECLARE
  daily_count INT := 0;
  monthly_count INT := 0;
  yearly_count INT := 0;
BEGIN
  -- Recalculate daily_game_statistics from game_statistics
  WITH daily_aggregates AS (
    SELECT 
      DATE(gs.created_at) as stat_date,
      COUNT(DISTINCT gs.game_id) as total_games,
      COALESCE(SUM(gs.total_bets), 0) as total_bets,
      COALESCE(SUM(gs.house_payout), 0) as total_payouts,
      COALESCE(SUM(gs.total_bets), 0) as total_revenue,
      COALESCE(SUM(gs.profit_loss), 0) as profit_loss,
      CASE 
        WHEN COALESCE(SUM(gs.total_bets), 0) > 0 
        THEN (COALESCE(SUM(gs.profit_loss), 0) / COALESCE(SUM(gs.total_bets), 1)) * 100
        ELSE 0
      END as profit_loss_percentage,
      COUNT(DISTINCT gs.unique_players) as unique_players
    FROM game_statistics gs
    GROUP BY DATE(gs.created_at)
  )
  INSERT INTO daily_game_statistics (
    date, total_games, total_bets, total_payouts, total_revenue,
    profit_loss, profit_loss_percentage, unique_players, created_at, updated_at
  )
  SELECT 
    stat_date, total_games, total_bets, total_payouts, total_revenue,
    profit_loss, profit_loss_percentage, unique_players, NOW(), NOW()
  FROM daily_aggregates
  ON CONFLICT (date) DO UPDATE SET
    total_games = EXCLUDED.total_games,
    total_bets = EXCLUDED.total_bets,
    total_payouts = EXCLUDED.total_payouts,
    total_revenue = EXCLUDED.total_revenue,
    profit_loss = EXCLUDED.profit_loss,
    profit_loss_percentage = EXCLUDED.profit_loss_percentage,
    unique_players = EXCLUDED.unique_players,
    updated_at = NOW();
  
  GET DIAGNOSTICS daily_count = ROW_COUNT;
  
  -- Recalculate monthly_game_statistics from daily_game_statistics
  WITH monthly_aggregates AS (
    SELECT 
      TO_CHAR(date, 'YYYY-MM') as month_year,
      SUM(total_games) as total_games,
      SUM(total_bets) as total_bets,
      SUM(total_payouts) as total_payouts,
      SUM(total_revenue) as total_revenue,
      SUM(profit_loss) as profit_loss,
      CASE 
        WHEN SUM(total_bets) > 0 
        THEN (SUM(profit_loss) / SUM(total_bets)) * 100
        ELSE 0
      END as profit_loss_percentage,
      SUM(unique_players) as unique_players
    FROM daily_game_statistics
    GROUP BY TO_CHAR(date, 'YYYY-MM')
  )
  INSERT INTO monthly_game_statistics (
    month_year, total_games, total_bets, total_payouts, total_revenue,
    profit_loss, profit_loss_percentage, unique_players, created_at, updated_at
  )
  SELECT 
    month_year, total_games, total_bets, total_payouts, total_revenue,
    profit_loss, profit_loss_percentage, unique_players, NOW(), NOW()
  FROM monthly_aggregates
  ON CONFLICT (month_year) DO UPDATE SET
    total_games = EXCLUDED.total_games,
    total_bets = EXCLUDED.total_bets,
    total_payouts = EXCLUDED.total_payouts,
    total_revenue = EXCLUDED.total_revenue,
    profit_loss = EXCLUDED.profit_loss,
    profit_loss_percentage = EXCLUDED.profit_loss_percentage,
    unique_players = EXCLUDED.unique_players,
    updated_at = NOW();
  
  GET DIAGNOSTICS monthly_count = ROW_COUNT;
  
  -- Recalculate yearly_game_statistics from monthly_game_statistics
  WITH yearly_aggregates AS (
    SELECT 
      CAST(SUBSTRING(month_year FROM 1 FOR 4) AS INT) as year,
      SUM(total_games) as total_games,
      SUM(total_bets) as total_bets,
      SUM(total_payouts) as total_payouts,
      SUM(total_revenue) as total_revenue,
      SUM(profit_loss) as profit_loss,
      CASE 
        WHEN SUM(total_bets) > 0 
        THEN (SUM(profit_loss) / SUM(total_bets)) * 100
        ELSE 0
      END as profit_loss_percentage,
      SUM(unique_players) as unique_players
    FROM monthly_game_statistics
    GROUP BY CAST(SUBSTRING(month_year FROM 1 FOR 4) AS INT)
  )
  INSERT INTO yearly_game_statistics (
    year, total_games, total_bets, total_payouts, total_revenue,
    profit_loss, profit_loss_percentage, unique_players, created_at, updated_at
  )
  SELECT 
    year, total_games, total_bets, total_payouts, total_revenue,
    profit_loss, profit_loss_percentage, unique_players, NOW(), NOW()
  FROM yearly_aggregates
  ON CONFLICT (year) DO UPDATE SET
    total_games = EXCLUDED.total_games,
    total_bets = EXCLUDED.total_bets,
    total_payouts = EXCLUDED.total_payouts,
    total_revenue = EXCLUDED.total_revenue,
    profit_loss = EXCLUDED.profit_loss,
    profit_loss_percentage = EXCLUDED.profit_loss_percentage,
    unique_players = EXCLUDED.unique_players,
    updated_at = NOW();
  
  GET DIAGNOSTICS yearly_count = ROW_COUNT;
  
  -- Return results
  RETURN QUERY
  SELECT 'daily_game_statistics'::TEXT, daily_count, 'success'::TEXT
  UNION ALL
  SELECT 'monthly_game_statistics'::TEXT, monthly_count, 'success'::TEXT
  UNION ALL
  SELECT 'yearly_game_statistics'::TEXT, yearly_count, 'success'::TEXT;
  
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION reconcile_analytics IS 'Recalculates all analytics tables from source data';

-- ============================================================================
-- PART 3: CREATE TRIGGER TO AUTO-UPDATE PLAYER STATS
-- ============================================================================

-- Function to update player stats when bet is completed
CREATE OR REPLACE FUNCTION update_player_stats_on_bet_complete()
RETURNS TRIGGER AS $$
DECLARE
  v_user RECORD;
  v_new_winnings NUMERIC;
  v_new_losses NUMERIC;
BEGIN
  -- Only process if status changed to 'won' or 'lost'
  IF NEW.status IN ('won', 'lost') AND (OLD.status IS NULL OR OLD.status = 'pending') THEN
    
    -- Get current user stats
    SELECT total_winnings, total_losses, games_played, games_won
    INTO v_user
    FROM users
    WHERE id = NEW.user_id;
    
    -- Calculate new stats based on GROSS amounts
    v_new_winnings := COALESCE(v_user.total_winnings, 0);
    v_new_losses := COALESCE(v_user.total_losses, 0);
    
    IF NEW.status = 'won' AND NEW.actual_payout > 0 THEN
      -- Add GROSS payout to winnings
      v_new_winnings := v_new_winnings + NEW.actual_payout;
    ELSIF NEW.status = 'lost' AND NEW.actual_payout = 0 THEN
      -- Add GROSS bet amount to losses
      v_new_losses := v_new_losses + NEW.amount;
    ELSIF NEW.actual_payout > 0 AND NEW.actual_payout < NEW.amount THEN
      -- Partial loss - track both
      v_new_winnings := v_new_winnings + NEW.actual_payout;
      v_new_losses := v_new_losses + (NEW.amount - NEW.actual_payout);
    END IF;
    
    -- Update user stats (don't update games_played/games_won here - that's done in updateUserGameStats)
    UPDATE users
    SET 
      total_winnings = v_new_winnings,
      total_losses = v_new_losses,
      updated_at = NOW()
    WHERE id = NEW.user_id;
    
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_update_player_stats_on_bet_complete ON player_bets;

-- Create trigger
CREATE TRIGGER trigger_update_player_stats_on_bet_complete
  AFTER UPDATE ON player_bets
  FOR EACH ROW
  EXECUTE FUNCTION update_player_stats_on_bet_complete();

COMMENT ON TRIGGER trigger_update_player_stats_on_bet_complete ON player_bets 
IS 'Automatically updates player total_winnings and total_losses when bet status changes';

-- ============================================================================
-- PART 4: MIGRATION TO RECALCULATE EXISTING PLAYER STATS
-- ============================================================================

-- Function to recalculate all player stats from scratch
CREATE OR REPLACE FUNCTION recalculate_all_player_stats()
RETURNS TABLE (
  user_id TEXT,
  games_played INT,
  games_won INT,
  total_winnings NUMERIC,
  total_losses NUMERIC,
  status TEXT
) AS $$
BEGIN
  RETURN QUERY
  WITH player_stats AS (
    SELECT 
      pb.user_id,
      COUNT(DISTINCT pb.game_id) as games_played,
      COUNT(DISTINCT CASE WHEN pb.actual_payout > pb.amount THEN pb.game_id END) as games_won,
      -- GROSS winnings = sum of all payouts
      COALESCE(SUM(CASE WHEN pb.actual_payout > 0 THEN pb.actual_payout ELSE 0 END), 0) as total_winnings,
      -- GROSS losses = sum of all lost bets
      COALESCE(SUM(CASE WHEN pb.actual_payout = 0 THEN pb.amount 
                       WHEN pb.actual_payout < pb.amount THEN pb.amount - pb.actual_payout
                       ELSE 0 END), 0) as total_losses
    FROM player_bets pb
    WHERE pb.status IN ('won', 'lost', 'completed')
    GROUP BY pb.user_id
  )
  UPDATE users u
  SET 
    games_played = ps.games_played,
    games_won = ps.games_won,
    total_winnings = ps.total_winnings,
    total_losses = ps.total_losses,
    updated_at = NOW()
  FROM player_stats ps
  WHERE u.id = ps.user_id
  RETURNING u.id, u.games_played, u.games_won, u.total_winnings, u.total_losses, 'updated'::TEXT;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION recalculate_all_player_stats IS 'Recalculates all player statistics from player_bets table (GROSS amounts)';

-- ============================================================================
-- PART 5: VERIFICATION QUERIES
-- ============================================================================

-- Test get_user_game_history function
-- SELECT * FROM get_user_game_history('your-user-id-here', 10);

-- Test reconcile_analytics function
-- SELECT * FROM reconcile_analytics();

-- Test recalculate_all_player_stats function
-- SELECT * FROM recalculate_all_player_stats();

-- Verify player stats
-- SELECT id, phone, games_played, games_won, total_winnings, total_losses
-- FROM users
-- WHERE games_played > 0
-- ORDER BY total_winnings DESC
-- LIMIT 10;

-- ============================================================================
-- EXECUTION INSTRUCTIONS
-- ============================================================================
-- 
-- 1. Run this entire script to create all functions and triggers
-- 
-- 2. To recalculate existing player stats (RECOMMENDED):
--    SELECT * FROM recalculate_all_player_stats();
-- 
-- 3. To reconcile analytics tables:
--    SELECT * FROM reconcile_analytics();
-- 
-- 4. To test game history for a specific user:
--    SELECT * FROM get_user_game_history('user-id-here', 20);
-- 
-- ============================================================================
