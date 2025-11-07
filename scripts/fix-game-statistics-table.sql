-- ============================================
-- FIX GAME STATISTICS TABLE
-- ============================================
-- This script deletes incorrect game_statistics and repopulates with correct data from player_bets

-- Step 1: Delete existing game_statistics (they have wrong values)
DELETE FROM game_statistics;

-- Step 2: Repopulate game_statistics with CORRECT data from player_bets
INSERT INTO game_statistics (
  id,
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
  gen_random_uuid()::text as id,
  gs.game_id,
  COUNT(DISTINCT pb.user_id) as total_players,
  SUM(pb.amount) as total_bets,
  SUM(CASE WHEN pb.status = 'won' THEN pb.actual_payout ELSE 0 END) as total_winnings,
  SUM(pb.amount) - SUM(CASE WHEN pb.status = 'won' THEN pb.actual_payout ELSE 0 END) as house_earnings,
  COUNT(CASE WHEN pb.side = 'andar' THEN 1 END) as andar_bets_count,
  COUNT(CASE WHEN pb.side = 'bahar' THEN 1 END) as bahar_bets_count,
  SUM(CASE WHEN pb.side = 'andar' THEN pb.amount ELSE 0 END) as andar_total_bet,
  SUM(CASE WHEN pb.side = 'bahar' THEN pb.amount ELSE 0 END) as bahar_total_bet,
  SUM(pb.amount) - SUM(CASE WHEN pb.status = 'won' THEN pb.actual_payout ELSE 0 END) as profit_loss,
  CASE 
    WHEN SUM(pb.amount) > 0 
    THEN ((SUM(pb.amount) - SUM(CASE WHEN pb.status = 'won' THEN pb.actual_payout ELSE 0 END)) / SUM(pb.amount) * 100)
    ELSE 0 
  END as profit_loss_percentage,
  SUM(CASE WHEN pb.status = 'won' THEN pb.actual_payout ELSE 0 END) as house_payout,
  0 as game_duration,
  COUNT(DISTINCT pb.user_id) as unique_players,
  gs.created_at
FROM game_sessions gs
INNER JOIN player_bets pb ON gs.game_id = pb.game_id
WHERE gs.status = 'completed'
GROUP BY gs.game_id, gs.created_at;

-- Step 3: Verify the fix
SELECT 
  '✅ GAME STATISTICS FIXED' as status,
  COUNT(*) as total_games,
  SUM(total_bets::numeric) as total_bets,
  SUM(total_winnings::numeric) as total_payouts,
  SUM(profit_loss::numeric) as net_profit_loss
FROM game_statistics;

-- Step 4: Show detailed breakdown per game
SELECT 
  game_id,
  total_bets,
  total_winnings as payouts,
  profit_loss,
  andar_total_bet,
  bahar_total_bet,
  created_at
FROM game_statistics
ORDER BY created_at DESC;
