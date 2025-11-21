-- Diagnose why some games have zero winnings
-- This checks if payouts were actually set in player_bets

-- Check the problem game
SELECT 
  '🔍 CHECKING GAME: game-1762538893010-5g3vzcgw0' as info;

-- Check all bets for this game
SELECT 
  pb.id,
  pb.user_id,
  pb.game_id,
  pb.side,
  pb.amount as bet_amount,
  pb.payout,
  CASE 
    WHEN pb.payout IS NULL THEN '❌ PAYOUT NOT SET'
    WHEN pb.payout = 0 THEN '⚠️ PAYOUT IS ZERO'
    WHEN pb.payout > 0 THEN '✅ PAYOUT SET'
  END as payout_status,
  pb.created_at
FROM player_bets pb
WHERE pb.game_id = 'game-1762538893010-5g3vzcgw0'
ORDER BY pb.created_at;

-- Check game history
SELECT 
  gh.game_id,
  gh.winner,
  gh.winning_card,
  gh.opening_card,
  gh.created_at
FROM game_history gh
WHERE gh.game_id = 'game-1762538893010-5g3vzcgw0';

-- Summary: Count payouts by status
SELECT 
  COUNT(*) FILTER (WHERE payout IS NULL) as null_payouts,
  COUNT(*) FILTER (WHERE payout = 0) as zero_payouts,
  COUNT(*) FILTER (WHERE payout > 0) as successful_payouts,
  SUM(amount) as total_bet_amount,
  SUM(payout) as total_payout_amount,
  COUNT(*) as total_bets
FROM player_bets
WHERE game_id = 'game-1762538893010-5g3vzcgw0';

-- Check ALL recent games for this pattern
SELECT 
  gh.game_id,
  gh.winner,
  gh.created_at,
  COUNT(pb.id) as bet_count,
  SUM(pb.amount) as total_bets,
  SUM(pb.payout) as total_payouts,
  COUNT(*) FILTER (WHERE pb.payout IS NULL) as null_payouts,
  COUNT(*) FILTER (WHERE pb.payout > 0) as successful_payouts,
  CASE 
    WHEN SUM(pb.payout) = 0 THEN '❌ NO PAYOUTS DISTRIBUTED'
    WHEN COUNT(*) FILTER (WHERE pb.payout IS NULL) > 0 THEN '⚠️ SOME PAYOUTS MISSING'
    ELSE '✅ ALL PAYOUTS DISTRIBUTED'
  END as status
FROM game_history gh
LEFT JOIN player_bets pb ON gh.game_id = pb.game_id
WHERE gh.created_at >= NOW() - INTERVAL '7 days'
GROUP BY gh.game_id, gh.winner, gh.created_at
ORDER BY gh.created_at DESC
LIMIT 20;

-- If payouts are NULL, it means the payout distribution code didn't run
-- Check server logs for errors during game completion
