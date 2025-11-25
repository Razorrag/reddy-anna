-- ============================================================================
-- COMPLETE DATABASE FIX AND AUDIT SCRIPT
-- ============================================================================
-- This script addresses:
-- 1. Wrong calculations in user management, analytics, admin pages
-- 2. Bonus wagering calculation bug (was using 3x DEPOSIT instead of 30% of DEPOSIT)
-- 3. Data inconsistency between tables (player_bets vs users vs game_statistics)
-- 4. Payout calculation bug (total user payout was assigned to each bet, causing 2x-3x inflation)
--
-- CORRECT FORMULA: Wagering = Deposit × 0.3 (30% of deposit)
-- Example: Deposit ₹100,000 → Wagering required = ₹30,000
-- ============================================================================

-- ============================================================================
-- STEP 1: DIAGNOSTIC QUERIES - RUN THESE FIRST TO UNDERSTAND THE ISSUES
-- ============================================================================

-- 1.1 Check current game_settings for bonus/wagering configuration
SELECT 
  setting_key, 
  setting_value,
  description,
  CASE 
    WHEN setting_key = 'wagering_multiplier' THEN 
      'CRITICAL: This should be 3 (3x bonus) or 0.3 (30% of deposit). Current logic uses this as multiplier of DEPOSIT, not BONUS!'
    WHEN setting_key = 'default_deposit_bonus_percent' THEN 
      'Deposit bonus percentage (e.g., 5 = 5%)'
    WHEN setting_key = 'referral_bonus_percent' THEN 
      'Referral bonus percentage (e.g., 5 = 5%)'
    ELSE ''
  END as notes
FROM game_settings
WHERE setting_key IN (
  'wagering_multiplier', 
  'default_deposit_bonus_percent', 
  'referral_bonus_percent',
  'referral_wagering_multiplier'
)
ORDER BY setting_key;

-- 1.2 Check deposit_bonuses table for wrong wagering calculations
SELECT 
  db.id,
  db.user_id,
  u.phone,
  db.deposit_amount,
  db.bonus_amount,
  db.bonus_percentage,
  db.wagering_required,
  db.wagering_completed,
  db.status,
  -- Calculate what wagering SHOULD be (3x bonus, not 3x deposit)
  db.bonus_amount * 3 as correct_wagering_3x_bonus,
  db.deposit_amount * 0.3 as correct_wagering_30pct_deposit,
  -- Check if current wagering is wrong
  CASE 
    WHEN db.wagering_required = db.deposit_amount * 3 THEN 'BUG: Using 3x DEPOSIT instead of 3x BONUS'
    WHEN db.wagering_required = db.bonus_amount * 3 THEN 'CORRECT: Using 3x BONUS'
    WHEN db.wagering_required = db.deposit_amount * 0.3 THEN 'CORRECT: Using 30% of DEPOSIT'
    ELSE 'UNKNOWN formula'
  END as diagnosis,
  db.created_at
FROM deposit_bonuses db
JOIN users u ON db.user_id = u.id
ORDER BY db.created_at DESC
LIMIT 20;

-- 1.3 Check referral_bonuses for same issue
SELECT 
  rb.id,
  rb.referrer_user_id,
  u.phone as referrer_phone,
  rb.deposit_amount,
  rb.bonus_amount,
  rb.bonus_percentage,
  rb.wagering_required,
  rb.wagering_completed,
  rb.status,
  -- Calculate what wagering SHOULD be
  rb.bonus_amount * 3 as correct_wagering_3x_bonus,
  CASE 
    WHEN rb.wagering_required = rb.deposit_amount * 3 THEN 'BUG: Using 3x DEPOSIT'
    WHEN rb.wagering_required = rb.bonus_amount * 3 THEN 'CORRECT: Using 3x BONUS'
    ELSE 'UNKNOWN formula'
  END as diagnosis,
  rb.created_at
FROM referral_bonuses rb
JOIN users u ON rb.referrer_user_id = u.id
ORDER BY rb.created_at DESC
LIMIT 20;

-- 1.4 Compare player_bets totals with users table stats
SELECT 
  u.id,
  u.phone,
  u.total_winnings as user_table_winnings,
  u.total_losses as user_table_losses,
  u.games_played as user_table_games_played,
  u.games_won as user_table_games_won,
  -- Calculate from player_bets
  COALESCE(pb_stats.actual_winnings, 0) as calculated_winnings,
  COALESCE(pb_stats.actual_losses, 0) as calculated_losses,
  COALESCE(pb_stats.games_played, 0) as calculated_games_played,
  COALESCE(pb_stats.games_won, 0) as calculated_games_won,
  -- Differences
  u.total_winnings - COALESCE(pb_stats.actual_winnings, 0) as winnings_diff,
  u.total_losses - COALESCE(pb_stats.actual_losses, 0) as losses_diff,
  u.games_played - COALESCE(pb_stats.games_played, 0) as games_played_diff,
  u.games_won - COALESCE(pb_stats.games_won, 0) as games_won_diff
FROM users u
LEFT JOIN (
  SELECT 
    user_id,
    SUM(CASE WHEN status = 'won' THEN actual_payout ELSE 0 END) as actual_winnings,
    SUM(CASE WHEN status = 'lost' THEN amount ELSE 0 END) as actual_losses,
    COUNT(DISTINCT game_id) as games_played,
    COUNT(DISTINCT CASE WHEN status = 'won' THEN game_id END) as games_won
  FROM player_bets
  WHERE status IN ('won', 'lost', 'completed')
  GROUP BY user_id
) pb_stats ON u.id = pb_stats.user_id
WHERE u.games_played > 0 OR pb_stats.games_played > 0
ORDER BY ABS(u.total_winnings - COALESCE(pb_stats.actual_winnings, 0)) DESC;

-- 1.5 Check game_statistics vs game_history consistency
SELECT 
  gh.game_id,
  gh.total_bets as history_total_bets,
  gh.total_payouts as history_total_payouts,
  gs.total_bets as stats_total_bets,
  gs.house_payout as stats_house_payout,
  gs.profit_loss as stats_profit_loss,
  -- Calculate from player_bets
  pb_calc.actual_total_bets,
  pb_calc.actual_total_payouts,
  -- Differences
  gh.total_bets - COALESCE(pb_calc.actual_total_bets, 0) as bets_diff,
  gh.total_payouts - COALESCE(pb_calc.actual_total_payouts, 0) as payouts_diff
FROM game_history gh
LEFT JOIN game_statistics gs ON gh.game_id = gs.game_id
LEFT JOIN (
  SELECT 
    game_id,
    SUM(amount) as actual_total_bets,
    SUM(actual_payout) as actual_total_payouts
  FROM player_bets
  GROUP BY game_id
) pb_calc ON gh.game_id = pb_calc.game_id
ORDER BY gh.created_at DESC
LIMIT 20;

-- 1.6 Check daily_game_statistics accuracy
SELECT 
  dgs.date,
  dgs.total_games,
  dgs.total_bets,
  dgs.total_payouts,
  dgs.profit_loss,
  -- Calculate from game_statistics
  calc.actual_games,
  calc.actual_bets,
  calc.actual_payouts,
  calc.actual_profit,
  -- Differences
  dgs.total_games - COALESCE(calc.actual_games, 0) as games_diff,
  dgs.total_bets - COALESCE(calc.actual_bets, 0) as bets_diff
FROM daily_game_statistics dgs
LEFT JOIN (
  SELECT 
    DATE(created_at) as stat_date,
    COUNT(*) as actual_games,
    SUM(total_bets) as actual_bets,
    SUM(house_payout) as actual_payouts,
    SUM(profit_loss) as actual_profit
  FROM game_statistics
  GROUP BY DATE(created_at)
) calc ON dgs.date = calc.stat_date
ORDER BY dgs.date DESC;

-- ============================================================================
-- STEP 2: FIX WAGERING MULTIPLIER SETTING
-- ============================================================================
-- The bug: wagering_multiplier is being applied to DEPOSIT amount
-- But it should be applied to BONUS amount for the 3x rule
-- 
-- Current code: wageringRequirement = amount * wageringMultiplier (WRONG if multiplier=3)
-- Should be: wageringRequirement = bonusAmount * 3 (for 3x bonus rule)
-- OR: wageringRequirement = amount * 0.3 (for 30% of deposit rule)

-- ✅ CORRECT: Set wagering_multiplier to 0.3 (meaning 30% of DEPOSIT)
-- Formula: wageringRequirement = deposit × 0.3
-- Example: Deposit 100k → Wagering = 100k × 0.3 = 30k
UPDATE game_settings 
SET setting_value = '0.3', 
    description = 'Wagering requirement as percentage of DEPOSIT (0.3 = 30%). E.g., 100k deposit requires 30k wagering.'
WHERE setting_key = 'wagering_multiplier';

-- If wagering_multiplier doesn't exist, create it
INSERT INTO game_settings (setting_key, setting_value, description)
VALUES ('wagering_multiplier', '0.3', 'Wagering requirement as percentage of DEPOSIT (0.3 = 30%)')
ON CONFLICT (setting_key) DO NOTHING;

-- Add referral wagering multiplier (also 30% of the referred user's deposit)
INSERT INTO game_settings (setting_key, setting_value, description)
VALUES ('referral_wagering_multiplier', '0.3', 'Wagering multiplier for referral bonus (0.3 = 30% of deposit)')
ON CONFLICT (setting_key) DO UPDATE SET setting_value = '0.3';

-- ============================================================================
-- STEP 3: FIX EXISTING DEPOSIT BONUSES WITH WRONG WAGERING
-- ============================================================================

-- First, let's see what needs to be fixed
SELECT 
  id,
  user_id,
  deposit_amount,
  bonus_amount,
  wagering_required as current_wagering,
  deposit_amount * 0.3 as correct_wagering_30pct,
  status
FROM deposit_bonuses
WHERE wagering_required != deposit_amount * 0.3
  AND status = 'locked';

-- Fix deposit bonuses: wagering should be 30% of DEPOSIT
UPDATE deposit_bonuses
SET 
  wagering_required = deposit_amount * 0.3,
  updated_at = NOW()
WHERE wagering_required != deposit_amount * 0.3
  AND status = 'locked';

-- Also fix referral bonuses (30% of the referred user's deposit)
UPDATE referral_bonuses
SET 
  wagering_required = deposit_amount * 0.3,
  updated_at = NOW()
WHERE wagering_required != deposit_amount * 0.3
  AND status = 'locked';

-- ============================================================================
-- STEP 4: RECALCULATE ALL PLAYER STATS FROM player_bets
-- ============================================================================

-- Create function to recalculate all player stats
CREATE OR REPLACE FUNCTION recalculate_all_player_stats()
RETURNS TABLE(
  user_id TEXT,
  games_played INTEGER,
  games_won INTEGER,
  total_winnings NUMERIC,
  total_losses NUMERIC,
  status TEXT
) AS $$
DECLARE
  v_user RECORD;
  v_stats RECORD;
  v_updated INTEGER := 0;
BEGIN
  FOR v_user IN SELECT id FROM users LOOP
    -- Calculate stats from player_bets
    SELECT 
      COUNT(DISTINCT pb.game_id) as games_played,
      COUNT(DISTINCT CASE WHEN pb.status = 'won' THEN pb.game_id END) as games_won,
      COALESCE(SUM(CASE WHEN pb.status = 'won' THEN pb.actual_payout ELSE 0 END), 0) as total_winnings,
      COALESCE(SUM(CASE WHEN pb.status = 'lost' THEN pb.amount ELSE 0 END), 0) as total_losses
    INTO v_stats
    FROM player_bets pb
    WHERE pb.user_id = v_user.id
      AND pb.status IN ('won', 'lost', 'completed');
    
    -- Update user record
    UPDATE users u
    SET 
      games_played = v_stats.games_played,
      games_won = v_stats.games_won,
      total_winnings = v_stats.total_winnings,
      total_losses = v_stats.total_losses,
      updated_at = NOW()
    WHERE u.id = v_user.id
      AND (
        u.games_played != v_stats.games_played OR
        u.games_won != v_stats.games_won OR
        u.total_winnings != v_stats.total_winnings OR
        u.total_losses != v_stats.total_losses
      );
    
    IF FOUND THEN
      v_updated := v_updated + 1;
      user_id := v_user.id;
      games_played := v_stats.games_played;
      games_won := v_stats.games_won;
      total_winnings := v_stats.total_winnings;
      total_losses := v_stats.total_losses;
      status := 'UPDATED';
      RETURN NEXT;
    END IF;
  END LOOP;
  
  RAISE NOTICE 'Recalculated stats for % users', v_updated;
END;
$$ LANGUAGE plpgsql;

-- Run the recalculation
SELECT * FROM recalculate_all_player_stats();

-- ============================================================================
-- STEP 5: RECALCULATE GAME_HISTORY FROM player_bets
-- ============================================================================

-- Update game_history with correct totals from player_bets
UPDATE game_history gh
SET 
  total_bets = COALESCE(pb_calc.total_bets, 0),
  total_payouts = COALESCE(pb_calc.total_payouts, 0)
FROM (
  SELECT 
    game_id,
    SUM(amount) as total_bets,
    SUM(actual_payout) as total_payouts
  FROM player_bets
  GROUP BY game_id
) pb_calc
WHERE gh.game_id = pb_calc.game_id
  AND (gh.total_bets != pb_calc.total_bets OR gh.total_payouts != pb_calc.total_payouts);

-- ============================================================================
-- STEP 6: RECALCULATE GAME_STATISTICS FROM player_bets
-- ============================================================================

-- Update game_statistics with correct values
UPDATE game_statistics gs
SET 
  total_bets = COALESCE(pb_calc.total_bets, 0),
  total_winnings = COALESCE(pb_calc.total_payouts, 0),
  house_payout = COALESCE(pb_calc.total_payouts, 0),
  profit_loss = COALESCE(pb_calc.total_bets, 0) - COALESCE(pb_calc.total_payouts, 0),
  profit_loss_percentage = CASE 
    WHEN COALESCE(pb_calc.total_bets, 0) > 0 
    THEN ((COALESCE(pb_calc.total_bets, 0) - COALESCE(pb_calc.total_payouts, 0)) / pb_calc.total_bets) * 100
    ELSE 0
  END,
  total_players = COALESCE(pb_calc.player_count, 0),
  unique_players = COALESCE(pb_calc.player_count, 0),
  andar_total_bet = COALESCE(pb_calc.andar_bets, 0),
  bahar_total_bet = COALESCE(pb_calc.bahar_bets, 0),
  andar_bets_count = COALESCE(pb_calc.andar_count, 0),
  bahar_bets_count = COALESCE(pb_calc.bahar_count, 0)
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
) pb_calc
WHERE gs.game_id = pb_calc.game_id;

-- ============================================================================
-- STEP 7: RECALCULATE DAILY ANALYTICS
-- ============================================================================

-- Truncate and rebuild daily_game_statistics from game_statistics
TRUNCATE daily_game_statistics;

INSERT INTO daily_game_statistics (
  date,
  total_games,
  total_bets,
  total_payouts,
  total_revenue,
  profit_loss,
  profit_loss_percentage,
  unique_players,
  total_player_winnings,
  total_player_losses,
  net_house_profit,
  created_at,
  updated_at
)
SELECT 
  DATE(gs.created_at) as date,
  COUNT(*) as total_games,
  SUM(gs.total_bets) as total_bets,
  SUM(gs.house_payout) as total_payouts,
  SUM(gs.total_bets) as total_revenue,
  SUM(gs.profit_loss) as profit_loss,
  CASE 
    WHEN SUM(gs.total_bets) > 0 
    THEN (SUM(gs.profit_loss) / SUM(gs.total_bets)) * 100
    ELSE 0
  END as profit_loss_percentage,
  SUM(gs.unique_players) as unique_players,
  SUM(gs.total_winnings) as total_player_winnings,
  SUM(gs.total_bets) - SUM(gs.total_winnings) as total_player_losses,
  SUM(gs.profit_loss) as net_house_profit,
  NOW(),
  NOW()
FROM game_statistics gs
GROUP BY DATE(gs.created_at)
ORDER BY DATE(gs.created_at);

-- ============================================================================
-- STEP 8: RECALCULATE MONTHLY ANALYTICS
-- ============================================================================

TRUNCATE monthly_game_statistics;

INSERT INTO monthly_game_statistics (
  month_year,
  total_games,
  total_bets,
  total_payouts,
  total_revenue,
  profit_loss,
  profit_loss_percentage,
  unique_players,
  total_player_winnings,
  total_player_losses,
  net_house_profit,
  created_at,
  updated_at
)
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
  SUM(unique_players) as unique_players,
  SUM(total_player_winnings) as total_player_winnings,
  SUM(total_player_losses) as total_player_losses,
  SUM(net_house_profit) as net_house_profit,
  NOW(),
  NOW()
FROM daily_game_statistics
GROUP BY TO_CHAR(date, 'YYYY-MM')
ORDER BY month_year;

-- ============================================================================
-- STEP 9: RECALCULATE YEARLY ANALYTICS
-- ============================================================================

TRUNCATE yearly_game_statistics;

INSERT INTO yearly_game_statistics (
  year,
  total_games,
  total_bets,
  total_payouts,
  total_revenue,
  profit_loss,
  profit_loss_percentage,
  unique_players,
  total_player_winnings,
  total_player_losses,
  net_house_profit,
  created_at,
  updated_at
)
SELECT 
  CAST(SUBSTRING(month_year FROM 1 FOR 4) AS INTEGER) as year,
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
  SUM(unique_players) as unique_players,
  SUM(total_player_winnings) as total_player_winnings,
  SUM(total_player_losses) as total_player_losses,
  SUM(net_house_profit) as net_house_profit,
  NOW(),
  NOW()
FROM monthly_game_statistics
GROUP BY SUBSTRING(month_year FROM 1 FOR 4)
ORDER BY year;

-- ============================================================================
-- STEP 10: VERIFICATION QUERIES
-- ============================================================================

-- 10.1 Verify player stats are now correct
SELECT 
  'PLAYER STATS CHECK' as check_type,
  COUNT(*) as total_users,
  SUM(CASE WHEN u.total_winnings = COALESCE(pb.winnings, 0) THEN 1 ELSE 0 END) as correct_winnings,
  SUM(CASE WHEN u.total_losses = COALESCE(pb.losses, 0) THEN 1 ELSE 0 END) as correct_losses
FROM users u
LEFT JOIN (
  SELECT 
    user_id,
    SUM(CASE WHEN status = 'won' THEN actual_payout ELSE 0 END) as winnings,
    SUM(CASE WHEN status = 'lost' THEN amount ELSE 0 END) as losses
  FROM player_bets
  WHERE status IN ('won', 'lost', 'completed')
  GROUP BY user_id
) pb ON u.id = pb.user_id;

-- 10.2 Verify deposit bonus wagering is correct (30% of deposit)
SELECT 
  'DEPOSIT BONUS CHECK' as check_type,
  COUNT(*) as total_bonuses,
  SUM(CASE WHEN wagering_required = deposit_amount * 0.3 THEN 1 ELSE 0 END) as correct_wagering,
  SUM(CASE WHEN wagering_required != deposit_amount * 0.3 THEN 1 ELSE 0 END) as wrong_wagering
FROM deposit_bonuses
WHERE status = 'locked';

-- 10.3 Verify referral bonus wagering is correct (30% of deposit)
SELECT 
  'REFERRAL BONUS CHECK' as check_type,
  COUNT(*) as total_bonuses,
  SUM(CASE WHEN wagering_required = deposit_amount * 0.3 THEN 1 ELSE 0 END) as correct_wagering,
  SUM(CASE WHEN wagering_required != deposit_amount * 0.3 THEN 1 ELSE 0 END) as wrong_wagering
FROM referral_bonuses
WHERE status = 'locked';

-- 10.4 Show current settings
SELECT setting_key, setting_value, description 
FROM game_settings 
WHERE setting_key LIKE '%bonus%' OR setting_key LIKE '%wager%'
ORDER BY setting_key;

-- 10.5 Summary of all analytics
SELECT 'DAILY' as period, COUNT(*) as records, SUM(total_games) as games, SUM(total_bets) as bets, SUM(profit_loss) as profit FROM daily_game_statistics
UNION ALL
SELECT 'MONTHLY', COUNT(*), SUM(total_games), SUM(total_bets), SUM(profit_loss) FROM monthly_game_statistics
UNION ALL
SELECT 'YEARLY', COUNT(*), SUM(total_games), SUM(total_bets), SUM(profit_loss) FROM yearly_game_statistics;

-- ============================================================================
-- DONE! All data should now be consistent.
-- ============================================================================
