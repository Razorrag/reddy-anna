-- Backfill Game Statistics for Historical Games
-- This script calculates and inserts missing game_statistics records from existing game_history and player_bets data

-- Create temporary table to calculate statistics for games missing them
CREATE TEMP TABLE temp_game_stats AS
SELECT 
  gh.game_id,
  gh.created_at,
  -- Count unique players
  COUNT(DISTINCT pb.user_id) as unique_players,
  COUNT(DISTINCT pb.user_id) as total_players,
  -- Count total bets
  COUNT(pb.id) as total_bets_count,
  -- Sum bet amounts by side
  COALESCE(SUM(CASE WHEN pb.side = 'andar' THEN pb.amount ELSE 0 END), 0) as andar_total_bet,
  COALESCE(SUM(CASE WHEN pb.side = 'bahar' THEN pb.amount ELSE 0 END), 0) as bahar_total_bet,
  -- Count bets by side
  COUNT(CASE WHEN pb.side = 'andar' THEN 1 END) as andar_bets_count,
  COUNT(CASE WHEN pb.side = 'bahar' THEN 1 END) as bahar_bets_count,
  -- Total bet amount
  COALESCE(SUM(pb.amount), 0) as total_bets,
  -- Total winnings (payouts)
  COALESCE(SUM(pb.actual_payout), 0) as total_winnings,
  -- Calculate house profit/loss (total bets - total payouts)
  COALESCE(SUM(pb.amount) - SUM(pb.actual_payout), 0) as profit_loss,
  -- Calculate percentage
  CASE 
    WHEN SUM(pb.amount) > 0 THEN 
      ((SUM(pb.amount) - SUM(pb.actual_payout)) / SUM(pb.amount)) * 100
    ELSE 0
  END as profit_loss_percentage
FROM game_history gh
LEFT JOIN player_bets pb ON gh.game_id = pb.game_id
WHERE NOT EXISTS (
  -- Only process games that don't have statistics yet
  SELECT 1 FROM game_statistics gs WHERE gs.game_id = gh.game_id
)
GROUP BY gh.game_id, gh.created_at;

-- Display what we're about to insert
SELECT 
  COUNT(*) as games_to_backfill,
  SUM(total_bets) as total_bet_amount,
  SUM(total_winnings) as total_payout_amount,
  SUM(profit_loss) as total_profit_loss
FROM temp_game_stats;

-- Insert calculated statistics into game_statistics table
INSERT INTO game_statistics (
  game_id,
  total_players,
  total_bets,
  total_winnings,
  house_earnings,
  andar_bets_count,
  bahar_bets_count,
  andar_total_bet,
  bahar_total_bet,
  profit_loss,
  profit_loss_percentage,
  house_payout,
  game_duration,
  unique_players,
  created_at
)
SELECT 
  game_id,
  total_players,
  total_bets,
  total_winnings,
  profit_loss as house_earnings,
  andar_bets_count,
  bahar_bets_count,
  andar_total_bet,
  bahar_total_bet,
  profit_loss,
  profit_loss_percentage,
  total_winnings as house_payout,
  0 as game_duration,
  unique_players,
  created_at
FROM temp_game_stats;

-- Verify the insert
SELECT 
  'Backfill completed' as status,
  COUNT(*) as records_inserted
FROM game_statistics gs
WHERE gs.game_id IN (SELECT game_id FROM temp_game_stats);

-- Show sample of backfilled data
SELECT 
  game_id,
  total_players,
  total_bets,
  total_winnings,
  profit_loss,
  profit_loss_percentage,
  created_at
FROM game_statistics
WHERE game_id IN (SELECT game_id FROM temp_game_stats)
ORDER BY created_at DESC
LIMIT 10;

-- Clean up
DROP TABLE IF EXISTS temp_game_stats;

COMMIT;
