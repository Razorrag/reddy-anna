-- ============================================================================
-- CRITICAL DATA FIX - RUN THIS IMMEDIATELY
-- ============================================================================
-- This fixes ALL data inconsistencies found in diagnostic:
-- 1. Wagering settings (3 → 0.3)
-- 2. Deposit/Referral bonus wagering requirements
-- 3. Player stats (total_winnings, total_losses, games_played, games_won)
-- 4. Game history payouts
-- 5. Game statistics
-- 6. Daily/Monthly/Yearly analytics (completely rebuild)
-- ============================================================================

BEGIN;

-- ============================================================================
-- STEP 1: FIX WAGERING SETTINGS
-- ============================================================================
UPDATE game_settings SET setting_value = '0.3', description = 'Wagering = 30% of deposit' WHERE setting_key = 'wagering_multiplier';
UPDATE game_settings SET setting_value = '0.3', description = 'Referral wagering = 30% of deposit' WHERE setting_key = 'referral_wagering_multiplier';

-- Verify
SELECT 'STEP 1: Settings' as step, setting_key, setting_value FROM game_settings WHERE setting_key LIKE '%wager%';

-- ============================================================================
-- STEP 2: FIX ALL DEPOSIT BONUSES (30% of deposit)
-- ============================================================================
UPDATE deposit_bonuses
SET wagering_required = deposit_amount * 0.3,
    updated_at = NOW();

-- Auto-unlock bonuses that now meet requirements
UPDATE deposit_bonuses
SET status = 'unlocked', unlocked_at = NOW()
WHERE status = 'locked' AND wagering_completed >= deposit_amount * 0.3;

SELECT 'STEP 2: Deposit Bonuses Fixed' as step, COUNT(*) as total FROM deposit_bonuses;

-- ============================================================================
-- STEP 3: FIX ALL REFERRAL BONUSES (30% of deposit)
-- ============================================================================
UPDATE referral_bonuses
SET wagering_required = deposit_amount * 0.3,
    updated_at = NOW();

-- Auto-unlock referral bonuses that now meet requirements
UPDATE referral_bonuses
SET status = 'credited', credited_at = NOW()
WHERE status = 'locked' AND wagering_completed >= deposit_amount * 0.3;

SELECT 'STEP 3: Referral Bonuses Fixed' as step, COUNT(*) as total FROM referral_bonuses;

-- ============================================================================
-- STEP 4: CREDIT UNLOCKED BONUSES TO USER BALANCES
-- ============================================================================
-- Credit deposit bonuses that are unlocked but not credited
UPDATE users u
SET balance = balance + db.bonus_amount,
    updated_at = NOW()
FROM deposit_bonuses db
WHERE u.id = db.user_id
  AND db.status = 'unlocked'
  AND db.credited_at IS NULL;

UPDATE deposit_bonuses
SET status = 'credited', credited_at = NOW()
WHERE status = 'unlocked' AND credited_at IS NULL;

SELECT 'STEP 4: Bonuses Credited' as step, COUNT(*) as credited FROM deposit_bonuses WHERE status = 'credited';

-- ============================================================================
-- STEP 5: FIX CORRUPTED actual_payout IN player_bets
-- ============================================================================
-- The bug assigned total user payout to EACH bet instead of per-bet payout
-- We need to recalculate based on game rules:
-- - Winning bet on Andar: 2x bet amount (1:1 payout)
-- - Winning bet on Bahar R1: 2x bet amount (1:1 payout)  
-- - Winning bet on Bahar R2: 1x bet amount (refund only)

-- First, get game winners
WITH game_winners AS (
  SELECT game_id, winner, winning_round
  FROM game_history
  WHERE winner IS NOT NULL
)
UPDATE player_bets pb
SET actual_payout = CASE
  -- Lost bet = 0 payout
  WHEN pb.side != gw.winner THEN 0
  -- Won on Andar = 2x (always 1:1)
  WHEN pb.side = 'andar' AND gw.winner = 'andar' THEN pb.amount * 2
  -- Won on Bahar Round 1 = 2x (1:1)
  WHEN pb.side = 'bahar' AND gw.winner = 'bahar' AND pb.round = '1' THEN pb.amount * 2
  -- Won on Bahar Round 2 = 1x (refund only when game ends in R2)
  WHEN pb.side = 'bahar' AND gw.winner = 'bahar' AND pb.round = '2' AND gw.winning_round = 2 THEN pb.amount
  -- Won on Bahar Round 2 but game ended in R1 = 0 (bet wasn't active)
  WHEN pb.side = 'bahar' AND gw.winner = 'bahar' AND pb.round = '2' AND gw.winning_round = 1 THEN 0
  -- Default: 2x for any other winning scenario
  WHEN pb.side = gw.winner THEN pb.amount * 2
  ELSE 0
END,
status = CASE
  WHEN pb.side = gw.winner THEN 'won'
  ELSE 'lost'
END
FROM game_winners gw
WHERE pb.game_id = gw.game_id;

SELECT 'STEP 5: Fixed player_bets.actual_payout' as step, 
  COUNT(*) as total_bets,
  SUM(actual_payout) as total_payouts
FROM player_bets;

-- ============================================================================
-- STEP 6: RECALCULATE ALL PLAYER STATS FROM player_bets
-- ============================================================================
-- Now player_bets.actual_payout is correct, use it as SOURCE OF TRUTH

UPDATE users u
SET 
  total_winnings = COALESCE(calc.winnings, 0),
  total_losses = COALESCE(calc.losses, 0),
  games_played = COALESCE(calc.games_played, 0),
  games_won = COALESCE(calc.games_won, 0),
  updated_at = NOW()
FROM (
  SELECT 
    user_id,
    SUM(CASE WHEN status = 'won' THEN actual_payout ELSE 0 END) as winnings,
    SUM(CASE WHEN status = 'lost' THEN amount ELSE 0 END) as losses,
    COUNT(DISTINCT game_id) as games_played,
    COUNT(DISTINCT CASE WHEN status = 'won' THEN game_id END) as games_won
  FROM player_bets
  WHERE status IN ('won', 'lost', 'completed')
  GROUP BY user_id
) calc
WHERE u.id = calc.user_id;

-- Also reset stats for users with no bets
UPDATE users
SET total_winnings = 0, total_losses = 0, games_played = 0, games_won = 0, updated_at = NOW()
WHERE id NOT IN (SELECT DISTINCT user_id FROM player_bets WHERE status IN ('won', 'lost', 'completed'));

SELECT 'STEP 6: Player Stats' as step, id, phone, total_winnings, total_losses, games_played, games_won
FROM users WHERE games_played > 0 ORDER BY total_winnings DESC LIMIT 10;

-- ============================================================================
-- STEP 7: RECALCULATE GAME_HISTORY FROM player_bets
-- ============================================================================
UPDATE game_history gh
SET 
  total_bets = COALESCE(calc.total_bets, 0),
  total_payouts = COALESCE(calc.total_payouts, 0)
FROM (
  SELECT 
    game_id,
    SUM(amount) as total_bets,
    SUM(actual_payout) as total_payouts
  FROM player_bets
  GROUP BY game_id
) calc
WHERE gh.game_id = calc.game_id;

SELECT 'STEP 7: Game History' as step, COUNT(*) as games_updated FROM game_history;

-- ============================================================================
-- STEP 8: RECALCULATE GAME_STATISTICS FROM player_bets
-- ============================================================================
UPDATE game_statistics gs
SET 
  total_bets = COALESCE(calc.total_bets, 0),
  total_winnings = COALESCE(calc.total_payouts, 0),
  house_payout = COALESCE(calc.total_payouts, 0),
  profit_loss = COALESCE(calc.total_bets, 0) - COALESCE(calc.total_payouts, 0),
  profit_loss_percentage = CASE 
    WHEN COALESCE(calc.total_bets, 0) > 0 
    THEN ((COALESCE(calc.total_bets, 0) - COALESCE(calc.total_payouts, 0)) / calc.total_bets) * 100
    ELSE 0
  END,
  total_players = COALESCE(calc.player_count, 0),
  unique_players = COALESCE(calc.player_count, 0),
  andar_total_bet = COALESCE(calc.andar_bets, 0),
  bahar_total_bet = COALESCE(calc.bahar_bets, 0),
  andar_bets_count = COALESCE(calc.andar_count, 0),
  bahar_bets_count = COALESCE(calc.bahar_count, 0)
FROM (
  SELECT 
    game_id,
    SUM(amount) as total_bets,
    SUM(actual_payout) as total_payouts,
    COUNT(DISTINCT user_id) as player_count,
    SUM(CASE WHEN side = 'andar' THEN amount ELSE 0 END) as andar_bets,
    SUM(CASE WHEN side = 'bahar' THEN amount ELSE 0 END) as bahar_bets,
    COUNT(CASE WHEN side = 'andar' THEN 1 END) as andar_count,
    COUNT(CASE WHEN side = 'bahar' THEN 1 END) as bahar_count
  FROM player_bets
  GROUP BY game_id
) calc
WHERE gs.game_id = calc.game_id;

SELECT 'STEP 8: Game Statistics' as step, COUNT(*) as games_updated FROM game_statistics;

-- ============================================================================
-- STEP 9: COMPLETELY REBUILD DAILY ANALYTICS
-- ============================================================================
TRUNCATE daily_game_statistics;

INSERT INTO daily_game_statistics (
  date, total_games, total_bets, total_payouts, total_revenue,
  profit_loss, profit_loss_percentage, unique_players,
  total_player_winnings, total_player_losses, net_house_profit,
  created_at, updated_at
)
SELECT 
  DATE(gs.created_at) as date,
  COUNT(*) as total_games,
  SUM(gs.total_bets) as total_bets,
  SUM(gs.house_payout) as total_payouts,
  SUM(gs.total_bets) as total_revenue,
  SUM(gs.profit_loss) as profit_loss,
  CASE WHEN SUM(gs.total_bets) > 0 THEN (SUM(gs.profit_loss) / SUM(gs.total_bets)) * 100 ELSE 0 END as profit_loss_percentage,
  SUM(gs.unique_players) as unique_players,
  SUM(gs.total_winnings) as total_player_winnings,
  SUM(gs.total_bets) - SUM(gs.total_winnings) as total_player_losses,
  SUM(gs.profit_loss) as net_house_profit,
  NOW(), NOW()
FROM game_statistics gs
GROUP BY DATE(gs.created_at);

SELECT 'STEP 9: Daily Analytics' as step, date, total_games, total_bets, total_payouts, profit_loss FROM daily_game_statistics;

-- ============================================================================
-- STEP 10: COMPLETELY REBUILD MONTHLY ANALYTICS
-- ============================================================================
TRUNCATE monthly_game_statistics;

INSERT INTO monthly_game_statistics (
  month_year, total_games, total_bets, total_payouts, total_revenue,
  profit_loss, profit_loss_percentage, unique_players,
  total_player_winnings, total_player_losses, net_house_profit,
  created_at, updated_at
)
SELECT 
  TO_CHAR(date, 'YYYY-MM') as month_year,
  SUM(total_games), SUM(total_bets), SUM(total_payouts), SUM(total_revenue),
  SUM(profit_loss),
  CASE WHEN SUM(total_bets) > 0 THEN (SUM(profit_loss) / SUM(total_bets)) * 100 ELSE 0 END,
  SUM(unique_players),
  SUM(total_player_winnings), SUM(total_player_losses), SUM(net_house_profit),
  NOW(), NOW()
FROM daily_game_statistics
GROUP BY TO_CHAR(date, 'YYYY-MM');

SELECT 'STEP 10: Monthly Analytics' as step, month_year, total_games, total_bets, profit_loss FROM monthly_game_statistics;

-- ============================================================================
-- STEP 11: COMPLETELY REBUILD YEARLY ANALYTICS
-- ============================================================================
TRUNCATE yearly_game_statistics;

INSERT INTO yearly_game_statistics (
  year, total_games, total_bets, total_payouts, total_revenue,
  profit_loss, profit_loss_percentage, unique_players,
  total_player_winnings, total_player_losses, net_house_profit,
  created_at, updated_at
)
SELECT 
  CAST(SUBSTRING(month_year FROM 1 FOR 4) AS INTEGER) as year,
  SUM(total_games), SUM(total_bets), SUM(total_payouts), SUM(total_revenue),
  SUM(profit_loss),
  CASE WHEN SUM(total_bets) > 0 THEN (SUM(profit_loss) / SUM(total_bets)) * 100 ELSE 0 END,
  SUM(unique_players),
  SUM(total_player_winnings), SUM(total_player_losses), SUM(net_house_profit),
  NOW(), NOW()
FROM monthly_game_statistics
GROUP BY SUBSTRING(month_year FROM 1 FOR 4);

SELECT 'STEP 11: Yearly Analytics' as step, year, total_games, total_bets, profit_loss FROM yearly_game_statistics;

-- ============================================================================
-- STEP 12: FINAL VERIFICATION
-- ============================================================================

-- Check wagering settings
SELECT '=== VERIFICATION ===' as section;
SELECT 'Settings' as check_name, setting_key, setting_value FROM game_settings WHERE setting_key LIKE '%wager%';

-- Check deposit bonuses
SELECT 'Deposit Bonuses' as check_name, 
  COUNT(*) as total,
  SUM(CASE WHEN status = 'locked' THEN 1 ELSE 0 END) as locked,
  SUM(CASE WHEN status = 'credited' THEN 1 ELSE 0 END) as credited,
  SUM(CASE WHEN wagering_required = deposit_amount * 0.3 THEN 1 ELSE 0 END) as correct_wagering
FROM deposit_bonuses;

-- Check player stats match player_bets
SELECT 'Player Stats Accuracy' as check_name,
  u.id, u.phone,
  u.total_winnings as user_winnings,
  COALESCE(pb.winnings, 0) as calculated_winnings,
  u.total_winnings - COALESCE(pb.winnings, 0) as diff
FROM users u
LEFT JOIN (
  SELECT user_id, SUM(CASE WHEN status = 'won' THEN actual_payout ELSE 0 END) as winnings
  FROM player_bets WHERE status IN ('won', 'lost', 'completed')
  GROUP BY user_id
) pb ON u.id = pb.user_id
WHERE u.games_played > 0
ORDER BY ABS(u.total_winnings - COALESCE(pb.winnings, 0)) DESC
LIMIT 5;

-- Check game_history matches player_bets
SELECT 'Game History Accuracy' as check_name,
  gh.game_id,
  gh.total_payouts as history_payouts,
  COALESCE(pb.actual_payouts, 0) as calculated_payouts,
  gh.total_payouts - COALESCE(pb.actual_payouts, 0) as diff
FROM game_history gh
LEFT JOIN (
  SELECT game_id, SUM(actual_payout) as actual_payouts
  FROM player_bets GROUP BY game_id
) pb ON gh.game_id = pb.game_id
ORDER BY ABS(gh.total_payouts - COALESCE(pb.actual_payouts, 0)) DESC
LIMIT 5;

-- Summary
SELECT 'SUMMARY' as section,
  (SELECT COUNT(*) FROM game_history) as total_games,
  (SELECT SUM(total_bets) FROM game_history) as total_bets,
  (SELECT SUM(total_payouts) FROM game_history) as total_payouts,
  (SELECT SUM(total_bets) - SUM(total_payouts) FROM game_history) as house_profit;

COMMIT;

SELECT '✅ DATABASE FIX COMPLETE!' as status, NOW() as completed_at;
