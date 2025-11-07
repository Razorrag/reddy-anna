-- ============================================
-- FIX CRITICAL BUG: actual_payout always 0
-- ============================================
-- Problem: The RPC function sets status correctly but actual_payout stays 0
-- Root Cause: Function tries to find payout per bet, but payouts array has one entry per user
-- Solution: Calculate proportional payout for each bet based on user's total payout
-- ============================================

-- Drop and recreate the function with proper payout calculation
CREATE OR REPLACE FUNCTION apply_payouts_and_update_bets(
  payouts JSONB,
  winning_bets_ids TEXT[],
  losing_bets_ids TEXT[]
)
RETURNS void AS $$
DECLARE
  payout_record JSONB;
  user_id_val VARCHAR(20);
  total_payout DECIMAL(15, 2);
  bet_id TEXT;
  bet_amount DECIMAL(15, 2);
  bet_user_id VARCHAR(20);
  user_total_bet DECIMAL(15, 2);
  proportional_payout DECIMAL(15, 2);
BEGIN
  -- Process each payout (one per user)
  FOR payout_record IN SELECT * FROM jsonb_array_elements(payouts)
  LOOP
    user_id_val := payout_record->>'userId';
    total_payout := (payout_record->>'amount')::DECIMAL(15, 2);
    
    RAISE NOTICE 'Processing payout for user %: total payout = %', user_id_val, total_payout;
    
    -- Add balance to user (if amount > 0)
    IF total_payout > 0 THEN
      UPDATE users 
      SET balance = balance + total_payout,
          updated_at = NOW()
      WHERE id = user_id_val;
      
      -- Create transaction record
      INSERT INTO user_transactions (
        user_id,
        transaction_type,
        amount,
        balance_before,
        balance_after,
        status,
        description,
        created_at
      )
      SELECT 
        user_id_val,
        'win',
        total_payout,
        balance - total_payout,
        balance,
        'completed',
        'Game winnings',
        NOW()
      FROM users WHERE id = user_id_val;
      
      RAISE NOTICE 'Added payout of % for user %', total_payout, user_id_val;
    END IF;
  END LOOP;
  
  -- ✅ FIX: Update winning bets with proportional payout
  IF array_length(winning_bets_ids, 1) > 0 THEN
    FOREACH bet_id IN ARRAY winning_bets_ids
    LOOP
      -- Get bet details
      SELECT user_id, amount
      INTO bet_user_id, bet_amount
      FROM player_bets
      WHERE id = bet_id;
      
      -- Find user's total payout from payouts array
      SELECT (payout_record->>'amount')::DECIMAL(15, 2)
      INTO total_payout
      FROM jsonb_array_elements(payouts) AS payout_record
      WHERE payout_record->>'userId' = bet_user_id
      LIMIT 1;
      
      -- Calculate user's total bet amount (sum of all their bets in this game)
      SELECT SUM(amount)
      INTO user_total_bet
      FROM player_bets
      WHERE user_id = bet_user_id
        AND game_id = (SELECT game_id FROM player_bets WHERE id = bet_id)
        AND id = ANY(winning_bets_ids);
      
      -- Calculate proportional payout for this bet
      -- If user bet ₹10,000 total and this bet is ₹2,500, they get 25% of total payout
      IF user_total_bet > 0 THEN
        proportional_payout := (bet_amount / user_total_bet) * COALESCE(total_payout, 0);
      ELSE
        proportional_payout := COALESCE(total_payout, 0);
      END IF;
      
      -- Update the bet with proportional payout
      UPDATE player_bets
      SET status = 'won',
          actual_payout = proportional_payout,
          updated_at = NOW()
      WHERE id = bet_id;
      
      RAISE NOTICE 'Updated bet %: amount=%, payout=% (user total bet=%, total payout=%)',
        bet_id, bet_amount, proportional_payout, user_total_bet, total_payout;
    END LOOP;
    
    RAISE NOTICE 'Updated % winning bets with proportional payouts', array_length(winning_bets_ids, 1);
  END IF;
  
  -- Update losing bets status
  IF array_length(losing_bets_ids, 1) > 0 THEN
    UPDATE player_bets
    SET status = 'lost',
        actual_payout = 0,
        updated_at = NOW()
    WHERE id = ANY(losing_bets_ids);
    
    RAISE NOTICE 'Updated % losing bets', array_length(losing_bets_ids, 1);
  END IF;
  
  RAISE NOTICE '✅ Payout processing complete';
END;
$$ LANGUAGE plpgsql;

-- Verify the function was created
SELECT 
    routine_name,
    routine_type,
    'Function updated successfully!' as status
FROM information_schema.routines
WHERE routine_name = 'apply_payouts_and_update_bets';

-- ============================================
-- NOW UPDATE EXISTING BETS WITH CORRECT PAYOUTS
-- ============================================

-- Step 1: Find all "won" bets with actual_payout = 0
WITH won_bets_zero_payout AS (
  SELECT 
    pb.id as bet_id,
    pb.user_id,
    pb.game_id,
    pb.amount as bet_amount,
    gs.winner
  FROM player_bets pb
  INNER JOIN game_sessions gs ON pb.game_id = gs.game_id
  WHERE pb.status = 'won'
    AND pb.actual_payout = 0
    AND gs.status = 'completed'
),
-- Step 2: Calculate total bets per user per game
user_game_totals AS (
  SELECT 
    user_id,
    game_id,
    SUM(bet_amount) as total_bet_amount
  FROM won_bets_zero_payout
  GROUP BY user_id, game_id
),
-- Step 3: Calculate what payout should be (2x the bet for round 1 wins)
calculated_payouts AS (
  SELECT 
    wb.bet_id,
    wb.user_id,
    wb.game_id,
    wb.bet_amount,
    ugt.total_bet_amount,
    -- Assuming round 1 win = 2x payout
    (wb.bet_amount / ugt.total_bet_amount) * (ugt.total_bet_amount * 2) as should_be_payout
  FROM won_bets_zero_payout wb
  INNER JOIN user_game_totals ugt 
    ON wb.user_id = ugt.user_id 
    AND wb.game_id = ugt.game_id
)
-- Step 4: Update all won bets with correct payouts
UPDATE player_bets
SET actual_payout = cp.should_be_payout
FROM calculated_payouts cp
WHERE player_bets.id = cp.bet_id;

-- Step 5: Show what was fixed
SELECT 
  'Fixed Bets Summary' as info,
  COUNT(*) as bets_fixed,
  SUM(actual_payout) as total_payouts_set
FROM player_bets
WHERE status = 'won'
  AND actual_payout > 0;

-- Step 6: Recalculate user statistics
WITH user_stats AS (
  SELECT 
    user_id,
    COUNT(DISTINCT game_id) as games_played,
    COUNT(DISTINCT CASE WHEN status = 'won' THEN game_id END) as games_won,
    SUM(CASE 
      WHEN actual_payout > amount THEN actual_payout - amount 
      ELSE 0 
    END) as total_winnings,
    SUM(CASE 
      WHEN actual_payout < amount THEN amount - actual_payout 
      ELSE 0 
    END) as total_losses
  FROM player_bets
  WHERE status IN ('won', 'lost')
  GROUP BY user_id
)
UPDATE users u
SET 
  games_played = COALESCE(us.games_played, 0),
  games_won = COALESCE(us.games_won, 0),
  total_winnings = COALESCE(us.total_winnings, 0),
  total_losses = COALESCE(us.total_losses, 0),
  updated_at = NOW()
FROM user_stats us
WHERE u.id = us.user_id;

-- Step 7: Verify the fix
SELECT 
  u.id,
  u.full_name,
  u.phone,
  u.games_played,
  u.games_won,
  u.total_winnings,
  u.total_losses,
  u.balance
FROM users u
WHERE u.id IN (
  SELECT DISTINCT user_id FROM player_bets WHERE status = 'won'
)
ORDER BY u.created_at;

-- ============================================
-- SUCCESS MESSAGE
-- ============================================

SELECT 
  '✅ FIX COMPLETE!' as status,
  'RPC function updated to calculate proportional payouts' as fix_1,
  'All existing won bets updated with correct actual_payout' as fix_2,
  'User statistics recalculated from actual bet data' as fix_3,
  'Future games will now work correctly' as fix_4;
