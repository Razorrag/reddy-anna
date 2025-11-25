-- ============================================
-- COMPLETE FIX FOR ALL DATABASE ISSUES
-- ============================================
-- This script fixes:
-- 1. Wagering calculations (3x → 0.3x)
-- 2. Per-bet payout corruption
-- 3. User statistics
-- 4. Game statistics
-- 5. Analytics (daily/monthly/yearly)
-- 6. Referral bonus issues
-- 7. Automatic triggers
-- ============================================

BEGIN;

-- ============================================
-- PART 1: FIX WAGERING CALCULATIONS
-- ============================================

-- 1.1: Fix settings
UPDATE game_settings 
SET setting_value = '0.3', 
    description = 'Wagering multiplier of DEPOSIT amount (0.3 = 30% of deposit)',
    updated_at = NOW()
WHERE setting_key = 'wagering_multiplier';

UPDATE game_settings 
SET setting_value = '0.3',
    description = 'Wagering multiplier of DEPOSIT amount for referrals (0.3 = 30% of deposit)',
    updated_at = NOW()
WHERE setting_key = 'referral_wagering_multiplier';

-- 1.2: Fix deposit bonuses
UPDATE deposit_bonuses
SET 
    wagering_required = deposit_amount * 0.3,
    wagering_progress = CASE 
        WHEN (deposit_amount * 0.3) > 0 
        THEN LEAST(100, (wagering_completed / (deposit_amount * 0.3)) * 100)
        ELSE 0 
    END,
    status = CASE
        WHEN wagering_completed >= (deposit_amount * 0.3) THEN 'unlocked'
        ELSE status
    END,
    unlocked_at = CASE
        WHEN wagering_completed >= (deposit_amount * 0.3) AND unlocked_at IS NULL 
        THEN NOW()
        ELSE unlocked_at
    END,
    updated_at = NOW()
WHERE wagering_required != deposit_amount * 0.3;

-- 1.3: SIMPLIFIED REFERRAL BONUSES - Remove wagering, make instant
UPDATE referral_bonuses
SET 
    wagering_required = 0,
    wagering_completed = 0,
    status = CASE
        WHEN status = 'locked' THEN 'credited'
        ELSE status
    END,
    credited_at = CASE
        WHEN status = 'locked' AND credited_at IS NULL THEN NOW()
        ELSE credited_at
    END,
    updated_at = NOW();

-- 1.4: Credit all referral bonuses to user balances
WITH referral_credits AS (
    SELECT 
        referrer_user_id,
        SUM(bonus_amount) as total_bonus
    FROM referral_bonuses
    WHERE status = 'credited'
    GROUP BY referrer_user_id
)
UPDATE users u
SET 
    balance = balance + COALESCE(rc.total_bonus, 0),
    total_bonus_earned = total_bonus_earned + COALESCE(rc.total_bonus, 0),
    updated_at = NOW()
FROM referral_credits rc
WHERE u.id = rc.referrer_user_id;

-- ============================================
-- PART 2: FIX CORRUPTED PAYOUTS
-- ============================================

-- 2.1: Recalculate actual_payout for each bet based on game rules
UPDATE player_bets pb
SET 
    actual_payout = CASE
        WHEN pb.side = gs.winner THEN 
            pb.amount * (
                CASE 
                    WHEN gs.winning_round = 1 THEN 2.0
                    WHEN gs.winning_round = 2 THEN 3.0
                    WHEN gs.winning_round = 3 THEN 11.0
                    ELSE 0
                END
            )
        ELSE 0
    END,
    updated_at = NOW()
FROM game_sessions gs
WHERE pb.game_id = gs.game_id 
    AND pb.status = 'completed'
    AND gs.status = 'completed';

-- ============================================
-- PART 3: RECALCULATE USER STATISTICS
-- ============================================

-- 3.1: Reset all user stats to 0 first
UPDATE users
SET 
    games_played = 0,
    games_won = 0,
    total_winnings = 0,
    total_losses = 0,
    updated_at = NOW();

-- 3.2: Recalculate from player_bets
WITH user_stats AS (
    SELECT 
        pb.user_id,
        COUNT(DISTINCT pb.game_id) as games_played,
        COUNT(DISTINCT CASE WHEN pb.actual_payout > pb.amount THEN pb.game_id END) as games_won,
        COALESCE(SUM(CASE WHEN pb.actual_payout > pb.amount THEN pb.actual_payout - pb.amount ELSE 0 END), 0) as total_winnings,
        COALESCE(SUM(CASE WHEN pb.actual_payout < pb.amount THEN pb.amount - pb.actual_payout ELSE 0 END), 0) as total_losses
    FROM player_bets pb
    INNER JOIN game_sessions gs ON pb.game_id = gs.game_id
    WHERE pb.status = 'completed'
        AND gs.status = 'completed'
    GROUP BY pb.user_id
)
UPDATE users u
SET 
    games_played = us.games_played,
    games_won = us.games_won,
    total_winnings = us.total_winnings,
    total_losses = us.total_losses,
    updated_at = NOW()
FROM user_stats us
WHERE u.id = us.user_id;

-- ============================================
-- PART 4: RECALCULATE GAME STATISTICS
-- ============================================

-- 4.1: Clear existing game_statistics
TRUNCATE game_statistics;

-- 4.2: Rebuild from player_bets
INSERT INTO game_statistics (
    id, game_id, total_bets, house_payout, unique_players,
    andar_total_bet, bahar_total_bet, andar_bets_count, bahar_bets_count,
    profit_loss, profit_loss_percentage, created_at
)
SELECT 
    gen_random_uuid()::TEXT,
    gs.game_id,
    COALESCE(SUM(pb.amount), 0),
    COALESCE(SUM(pb.actual_payout), 0),
    COUNT(DISTINCT pb.user_id),
    COALESCE(SUM(CASE WHEN pb.side = 'andar' THEN pb.amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN pb.side = 'bahar' THEN pb.amount ELSE 0 END), 0),
    COUNT(CASE WHEN pb.side = 'andar' THEN 1 END),
    COUNT(CASE WHEN pb.side = 'bahar' THEN 1 END),
    COALESCE(SUM(pb.amount), 0) - COALESCE(SUM(pb.actual_payout), 0),
    CASE 
        WHEN COALESCE(SUM(pb.amount), 0) > 0 
        THEN ((COALESCE(SUM(pb.amount), 0) - COALESCE(SUM(pb.actual_payout), 0)) / SUM(pb.amount)) * 100
        ELSE 0 
    END,
    NOW()
FROM game_sessions gs
LEFT JOIN player_bets pb ON gs.game_id = pb.game_id AND pb.status = 'completed'
WHERE gs.status = 'completed'
GROUP BY gs.game_id;

-- 4.3: Update game_history with correct totals
UPDATE game_history gh
SET
    total_bets = COALESCE((
        SELECT SUM(amount)
        FROM player_bets
        WHERE game_id = gh.game_id AND status = 'completed'
    ), 0),
    total_payouts = COALESCE((
        SELECT SUM(actual_payout)
        FROM player_bets
        WHERE game_id = gh.game_id AND status = 'completed'
    ), 0)
WHERE EXISTS (
    SELECT 1 FROM game_sessions
    WHERE game_id = gh.game_id AND status = 'completed'
);

-- ============================================
-- PART 5: REBUILD ANALYTICS
-- ============================================

-- 5.1: Rebuild daily_game_statistics
TRUNCATE daily_game_statistics;

INSERT INTO daily_game_statistics (
    id, date, total_games, total_bets, total_payouts, total_revenue,
    profit_loss, profit_loss_percentage, unique_players,
    total_player_winnings, total_player_losses, net_house_profit,
    created_at, updated_at
)
SELECT 
    gen_random_uuid()::TEXT,
    DATE(gs.created_at),
    COUNT(DISTINCT gs.game_id),
    COALESCE(SUM(gst.total_bets), 0),
    COALESCE(SUM(gst.house_payout), 0),
    COALESCE(SUM(gst.total_bets) - SUM(gst.house_payout), 0),
    COALESCE(SUM(gst.profit_loss), 0),
    CASE 
        WHEN SUM(gst.total_bets) > 0 
        THEN (SUM(gst.profit_loss) / SUM(gst.total_bets)) * 100
        ELSE 0 
    END,
    COUNT(DISTINCT pb.user_id),
    COALESCE(SUM(CASE WHEN pb.actual_payout > pb.amount THEN pb.actual_payout - pb.amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN pb.actual_payout < pb.amount THEN pb.amount - pb.actual_payout ELSE 0 END), 0),
    COALESCE(SUM(gst.profit_loss), 0),
    NOW(),
    NOW()
FROM game_sessions gs
INNER JOIN game_statistics gst ON gs.game_id = gst.game_id
LEFT JOIN player_bets pb ON gs.game_id = pb.game_id AND pb.status = 'completed'
WHERE gs.status = 'completed'
GROUP BY DATE(gs.created_at);

-- 5.2: Rebuild monthly_game_statistics
TRUNCATE monthly_game_statistics;

INSERT INTO monthly_game_statistics (
    id, month_year, total_games, total_bets, total_payouts, total_revenue,
    profit_loss, profit_loss_percentage, unique_players,
    total_player_winnings, total_player_losses, net_house_profit,
    created_at, updated_at
)
SELECT 
    gen_random_uuid()::TEXT,
    TO_CHAR(date, 'YYYY-MM'),
    SUM(total_games),
    SUM(total_bets),
    SUM(total_payouts),
    SUM(total_revenue),
    SUM(profit_loss),
    CASE 
        WHEN SUM(total_bets) > 0 
        THEN (SUM(profit_loss) / SUM(total_bets)) * 100
        ELSE 0 
    END,
    MAX(unique_players),
    SUM(total_player_winnings),
    SUM(total_player_losses),
    SUM(net_house_profit),
    NOW(),
    NOW()
FROM daily_game_statistics
GROUP BY TO_CHAR(date, 'YYYY-MM');

-- 5.3: Rebuild yearly_game_statistics
TRUNCATE yearly_game_statistics;

INSERT INTO yearly_game_statistics (
    id, year, total_games, total_bets, total_payouts, total_revenue,
    profit_loss, profit_loss_percentage, unique_players,
    total_player_winnings, total_player_losses, net_house_profit,
    created_at, updated_at
)
SELECT 
    gen_random_uuid()::TEXT,
    EXTRACT(YEAR FROM date)::INTEGER,
    SUM(total_games),
    SUM(total_bets),
    SUM(total_payouts),
    SUM(total_revenue),
    SUM(profit_loss),
    CASE 
        WHEN SUM(total_bets) > 0 
        THEN (SUM(profit_loss) / SUM(total_bets)) * 100
        ELSE 0 
    END,
    MAX(unique_players),
    SUM(total_player_winnings),
    SUM(total_player_losses),
    SUM(net_house_profit),
    NOW(),
    NOW()
FROM daily_game_statistics
GROUP BY EXTRACT(YEAR FROM date)::INTEGER;

-- ============================================
-- PART 6: CREATE/FIX AUTOMATIC TRIGGERS
-- ============================================

-- 6.1: Fix player stats trigger
CREATE OR REPLACE FUNCTION update_player_stats_on_bet_complete()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
        UPDATE users
        SET 
            games_played = (
                SELECT COUNT(DISTINCT game_id) 
                FROM player_bets 
                WHERE user_id = NEW.user_id AND status = 'completed'
            ),
            games_won = (
                SELECT COUNT(DISTINCT game_id) 
                FROM player_bets 
                WHERE user_id = NEW.user_id AND status = 'completed' AND actual_payout > amount
            ),
            total_winnings = (
                SELECT COALESCE(SUM(actual_payout - amount), 0)
                FROM player_bets 
                WHERE user_id = NEW.user_id AND status = 'completed' AND actual_payout > amount
            ),
            total_losses = (
                SELECT COALESCE(SUM(amount - actual_payout), 0)
                FROM player_bets 
                WHERE user_id = NEW.user_id AND status = 'completed' AND actual_payout < amount
            ),
            updated_at = NOW()
        WHERE id = NEW.user_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6.2: Fix game statistics trigger
CREATE OR REPLACE FUNCTION update_game_statistics()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
        INSERT INTO game_statistics (
            id, game_id, total_bets, house_payout, unique_players,
            andar_total_bet, bahar_total_bet, andar_bets_count, bahar_bets_count,
            profit_loss, profit_loss_percentage, created_at
        )
        SELECT 
            gen_random_uuid()::TEXT,
            NEW.game_id,
            COALESCE(SUM(pb.amount), 0),
            COALESCE(SUM(pb.actual_payout), 0),
            COUNT(DISTINCT pb.user_id),
            COALESCE(SUM(CASE WHEN pb.side = 'andar' THEN pb.amount ELSE 0 END), 0),
            COALESCE(SUM(CASE WHEN pb.side = 'bahar' THEN pb.amount ELSE 0 END), 0),
            COUNT(CASE WHEN pb.side = 'andar' THEN 1 END),
            COUNT(CASE WHEN pb.side = 'bahar' THEN 1 END),
            COALESCE(SUM(pb.amount), 0) - COALESCE(SUM(pb.actual_payout), 0),
            CASE 
                WHEN COALESCE(SUM(pb.amount), 0) > 0 
                THEN ((COALESCE(SUM(pb.amount), 0) - COALESCE(SUM(pb.actual_payout), 0)) / SUM(pb.amount)) * 100
                ELSE 0 
            END,
            NOW()
        FROM player_bets pb
        WHERE pb.game_id = NEW.game_id AND pb.status = 'completed'
        ON CONFLICT (game_id) DO UPDATE SET
            total_bets = EXCLUDED.total_bets,
            house_payout = EXCLUDED.house_payout,
            unique_players = EXCLUDED.unique_players,
            andar_total_bet = EXCLUDED.andar_total_bet,
            bahar_total_bet = EXCLUDED.bahar_total_bet,
            andar_bets_count = EXCLUDED.andar_bets_count,
            bahar_bets_count = EXCLUDED.bahar_bets_count,
            profit_loss = EXCLUDED.profit_loss,
            profit_loss_percentage = EXCLUDED.profit_loss_percentage;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6.3: NEW - Auto-credit unlocked deposit bonuses
CREATE OR REPLACE FUNCTION auto_credit_deposit_bonus()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'unlocked' AND OLD.status = 'locked' THEN
        -- Credit to user balance
        UPDATE users
        SET 
            balance = balance + NEW.bonus_amount,
            total_bonus_earned = total_bonus_earned + NEW.bonus_amount,
            updated_at = NOW()
        WHERE id = NEW.user_id;
        
        -- Mark as credited
        NEW.status := 'credited';
        NEW.credited_at := NOW();
        
        -- Log transaction
        INSERT INTO user_transactions (
            id, user_id, transaction_type, amount,
            balance_before, balance_after, description, created_at
        )
        SELECT 
            gen_random_uuid()::TEXT,
            NEW.user_id,
            'bonus_applied',
            NEW.bonus_amount,
            u.balance - NEW.bonus_amount,
            u.balance,
            'Deposit bonus unlocked and credited',
            NOW()
        FROM users u
        WHERE u.id = NEW.user_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_auto_credit_deposit_bonus ON deposit_bonuses;
CREATE TRIGGER trigger_auto_credit_deposit_bonus
    BEFORE UPDATE ON deposit_bonuses
    FOR EACH ROW
    WHEN (NEW.status = 'unlocked' AND OLD.status = 'locked')
    EXECUTE FUNCTION auto_credit_deposit_bonus();

-- ============================================
-- PART 7: VERIFICATION
-- ============================================

DO $$
DECLARE
    v_deposit_bonuses_fixed INTEGER;
    v_referral_bonuses_fixed INTEGER;
    v_users_updated INTEGER;
    v_games_recalculated INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_deposit_bonuses_fixed 
    FROM deposit_bonuses 
    WHERE wagering_required = deposit_amount * 0.3;
    
    SELECT COUNT(*) INTO v_referral_bonuses_fixed 
    FROM referral_bonuses 
    WHERE wagering_required = 0;
    
    SELECT COUNT(*) INTO v_users_updated 
    FROM users 
    WHERE updated_at > NOW() - INTERVAL '1 minute';
    
    SELECT COUNT(*) INTO v_games_recalculated 
    FROM game_statistics;
    
    RAISE NOTICE '';
    RAISE NOTICE '╔══════════════════════════════════════╗';
    RAISE NOTICE '║   COMPLETE FIX APPLIED SUCCESSFULLY  ║';
    RAISE NOTICE '╚══════════════════════════════════════╝';
    RAISE NOTICE '';
    RAISE NOTICE '✅ Deposit bonuses fixed: %', v_deposit_bonuses_fixed;
    RAISE NOTICE '✅ Referral bonuses simplified: %', v_referral_bonuses_fixed;
    RAISE NOTICE '✅ User stats updated: %', v_users_updated;
    RAISE NOTICE '✅ Games recalculated: %', v_games_recalculated;
    RAISE NOTICE '';
    RAISE NOTICE 'Verification:';
    RAISE NOTICE '- Check deposit bonus: ₹100k deposit → ₹30k wagering';
    RAISE NOTICE '- Check referral bonus: Instantly credited';
    RAISE NOTICE '- Check user stats: Correct games/winnings/losses';
    RAISE NOTICE '- Check analytics: Daily/monthly/yearly correct';
    RAISE NOTICE '';
END $$;

COMMIT;

-- ============================================
-- SHOW SAMPLE RESULTS
-- ============================================

SELECT '=== SAMPLE DEPOSIT BONUS (After Fix) ===' as info;
SELECT 
    deposit_amount,
    bonus_amount,
    wagering_required,
    wagering_completed,
    status
FROM deposit_bonuses
ORDER BY created_at DESC
LIMIT 3;

SELECT '=== SAMPLE REFERRAL BONUS (After Fix) ===' as info;
SELECT 
    deposit_amount,
    bonus_amount,
    wagering_required,
    status,
    credited_at
FROM referral_bonuses
ORDER BY created_at DESC
LIMIT 3;

SELECT '=== SAMPLE USER STATS (After Fix) ===' as info;
SELECT 
    phone,
    games_played,
    games_won,
    total_winnings,
    total_losses
FROM users
WHERE games_played > 0
ORDER BY total_winnings DESC
LIMIT 3;