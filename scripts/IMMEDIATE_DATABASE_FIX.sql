-- ============================================================================
-- IMMEDIATE DATABASE FIX - RUN THIS NOW
-- ============================================================================
-- Fixes:
-- 1. Wagering requirement: 30% of DEPOSIT (not 3x deposit)
-- 2. Player stats recalculation from player_bets
-- 3. Game statistics recalculation from player_bets
-- 4. Analytics rebuild (daily/monthly/yearly)
-- ============================================================================

-- ============================================================================
-- STEP 1: FIX WAGERING SETTINGS
-- ============================================================================

-- Set wagering_multiplier to 0.3 (30% of deposit)
UPDATE game_settings 
SET setting_value = '0.3', 
    description = 'Wagering requirement as percentage of DEPOSIT (0.3 = 30%)'
WHERE setting_key = 'wagering_multiplier';

-- Set referral wagering multiplier to 0.3 (30% of deposit)
UPDATE game_settings 
SET setting_value = '0.3', 
    description = 'Wagering requirement for referral bonus (0.3 = 30% of deposit)'
WHERE setting_key = 'referral_wagering_multiplier';

-- ============================================================================
-- STEP 2: FIX ALL LOCKED DEPOSIT BONUSES
-- ============================================================================

-- Fix deposit bonuses: wagering = 30% of deposit
UPDATE deposit_bonuses
SET wagering_required = deposit_amount * 0.3,
    updated_at = NOW()
WHERE status = 'locked';

-- Show what was fixed
SELECT 
  id,
  user_id,
  deposit_amount,
  bonus_amount,
  wagering_required as new_wagering,
  wagering_completed,
  CASE WHEN wagering_completed >= wagering_required THEN 'SHOULD UNLOCK!' ELSE 'In Progress' END as status_check
FROM deposit_bonuses
WHERE status = 'locked'
ORDER BY created_at DESC;

-- ============================================================================
-- STEP 3: FIX ALL LOCKED REFERRAL BONUSES
-- ============================================================================

UPDATE referral_bonuses
SET wagering_required = deposit_amount * 0.3,
    updated_at = NOW()
WHERE status = 'locked';

-- ============================================================================
-- STEP 4: AUTO-UNLOCK BONUSES THAT NOW MEET REQUIREMENTS
-- ============================================================================

-- Unlock deposit bonuses where wagering is now complete
UPDATE deposit_bonuses
SET status = 'unlocked',
    unlocked_at = NOW(),
    updated_at = NOW()
WHERE status = 'locked'
  AND wagering_completed >= wagering_required;

-- Credit unlocked deposit bonuses to user balance
DO $$
DECLARE
  bonus_record RECORD;
BEGIN
  FOR bonus_record IN 
    SELECT id, user_id, bonus_amount 
    FROM deposit_bonuses 
    WHERE status = 'unlocked' AND credited_at IS NULL
  LOOP
    -- Add bonus to user balance
    UPDATE users 
    SET balance = balance + bonus_record.bonus_amount,
        updated_at = NOW()
    WHERE id = bonus_record.user_id;
    
    -- Mark bonus as credited
    UPDATE deposit_bonuses
    SET status = 'credited',
        credited_at = NOW(),
        updated_at = NOW()
    WHERE id = bonus_record.id;
    
    RAISE NOTICE 'Credited bonus % to user %: ₹%', bonus_record.id, bonus_record.user_id, bonus_record.bonus_amount;
  END LOOP;
END $$;

-- Same for referral bonuses
UPDATE referral_bonuses
SET status = 'credited',
    credited_at = NOW(),
    updated_at = NOW()
WHERE status = 'locked'
  AND wagering_completed >= wagering_required;

-- ============================================================================
-- STEP 5: RECALCULATE ALL PLAYER STATS FROM player_bets
-- ============================================================================

-- Update each user's stats based on actual player_bets data
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

-- ============================================================================
-- STEP 6: RECALCULATE GAME_HISTORY FROM player_bets
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

-- ============================================================================
-- STEP 7: RECALCULATE GAME_STATISTICS FROM player_bets
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

-- ============================================================================
-- STEP 8: REBUILD DAILY ANALYTICS
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
  CASE WHEN SUM(gs.total_bets) > 0 THEN (SUM(gs.profit_loss) / SUM(gs.total_bets)) * 100 ELSE 0 END,
  SUM(gs.unique_players) as unique_players,
  SUM(gs.total_winnings) as total_player_winnings,
  SUM(gs.total_bets) - SUM(gs.total_winnings) as total_player_losses,
  SUM(gs.profit_loss) as net_house_profit,
  NOW(), NOW()
FROM game_statistics gs
GROUP BY DATE(gs.created_at);

-- ============================================================================
-- STEP 9: REBUILD MONTHLY ANALYTICS
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

-- ============================================================================
-- STEP 10: REBUILD YEARLY ANALYTICS
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

-- ============================================================================
-- STEP 11: VERIFICATION
-- ============================================================================

-- Check wagering settings
SELECT '1. WAGERING SETTINGS' as check_name;
SELECT setting_key, setting_value FROM game_settings 
WHERE setting_key LIKE '%wager%';

-- Check deposit bonuses
SELECT '2. DEPOSIT BONUSES' as check_name;
SELECT 
  COUNT(*) as total,
  SUM(CASE WHEN status = 'locked' THEN 1 ELSE 0 END) as locked,
  SUM(CASE WHEN status = 'credited' THEN 1 ELSE 0 END) as credited,
  SUM(CASE WHEN wagering_required = deposit_amount * 0.3 THEN 1 ELSE 0 END) as correct_wagering
FROM deposit_bonuses;

-- Check player stats accuracy
SELECT '3. PLAYER STATS ACCURACY' as check_name;
SELECT 
  COUNT(*) as total_users,
  SUM(CASE WHEN u.total_winnings = COALESCE(pb.winnings, 0) THEN 1 ELSE 0 END) as correct_winnings,
  SUM(CASE WHEN u.total_losses = COALESCE(pb.losses, 0) THEN 1 ELSE 0 END) as correct_losses
FROM users u
LEFT JOIN (
  SELECT user_id,
    SUM(CASE WHEN status = 'won' THEN actual_payout ELSE 0 END) as winnings,
    SUM(CASE WHEN status = 'lost' THEN amount ELSE 0 END) as losses
  FROM player_bets WHERE status IN ('won', 'lost', 'completed')
  GROUP BY user_id
) pb ON u.id = pb.user_id
WHERE u.games_played > 0 OR pb.winnings > 0;

-- Check analytics consistency
SELECT '4. ANALYTICS SUMMARY' as check_name;
SELECT 'DAILY' as period, COUNT(*) as records, SUM(total_games) as games, SUM(total_bets) as bets FROM daily_game_statistics
UNION ALL
SELECT 'MONTHLY', COUNT(*), SUM(total_games), SUM(total_bets) FROM monthly_game_statistics
UNION ALL
SELECT 'YEARLY', COUNT(*), SUM(total_games), SUM(total_bets) FROM yearly_game_statistics;

-- ============================================================================
-- DONE! All data should now be consistent.
-- ============================================================================
SELECT 'DATABASE FIX COMPLETE!' as status, NOW() as completed_at;
