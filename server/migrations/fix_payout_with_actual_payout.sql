-- CRITICAL FIX: Update apply_payouts_and_update_bets to set actual_payout field
-- This is the root cause of all display issues - actual_payout was never being set!

CREATE OR REPLACE FUNCTION apply_payouts_and_update_bets(
  payouts JSONB,
  winning_bets_ids UUID[],
  losing_bets_ids UUID[]
)
RETURNS VOID AS $$
DECLARE
  payout_record RECORD;
  bet_record RECORD;
  user_total_payout NUMERIC;
  user_total_bet NUMERIC;
  payout_per_bet NUMERIC;
BEGIN
  -- STEP 1: Update balances for winning users
  FOR payout_record IN SELECT * FROM jsonb_to_recordset(payouts) AS x(userId UUID, amount NUMERIC)
  LOOP
    UPDATE users
    SET balance = balance + payout_record.amount
    WHERE id = payout_record.userId;
    
    -- Calculate total bet amount for this user in winning bets
    SELECT COALESCE(SUM(amount), 0) INTO user_total_bet
    FROM player_bets
    WHERE user_id = payout_record.userId
      AND id = ANY(winning_bets_ids);
    
    -- If user has winning bets, distribute payout proportionally
    IF user_total_bet > 0 THEN
      -- Update each winning bet with proportional payout
      FOR bet_record IN 
        SELECT id, amount 
        FROM player_bets 
        WHERE user_id = payout_record.userId 
          AND id = ANY(winning_bets_ids)
      LOOP
        -- Calculate proportional payout for this bet
        payout_per_bet := (bet_record.amount / user_total_bet) * payout_record.amount;
        
        UPDATE player_bets
        SET 
          status = 'win',
          actual_payout = payout_per_bet,
          updated_at = NOW()
        WHERE id = bet_record.id;
      END LOOP;
    END IF;
  END LOOP;

  -- STEP 2: Update status for winning bets that weren't processed above
  -- (This handles edge cases where a bet is marked as winning but user got no payout)
  UPDATE player_bets
  SET 
    status = 'win',
    actual_payout = COALESCE(actual_payout, 0),
    updated_at = NOW()
  WHERE id = ANY(winning_bets_ids)
    AND actual_payout IS NULL;

  -- STEP 3: Update status for losing bets
  UPDATE player_bets
  SET 
    status = 'lose',
    actual_payout = 0,
    updated_at = NOW()
  WHERE id = ANY(losing_bets_ids);
  
  -- Log the update
  RAISE NOTICE 'Updated % winning bets and % losing bets with actual payouts', 
    array_length(winning_bets_ids, 1), 
    array_length(losing_bets_ids, 1);
END;
$$ LANGUAGE plpgsql;

-- Add comment explaining the function
COMMENT ON FUNCTION apply_payouts_and_update_bets IS 
'Atomically updates user balances, bet statuses, and actual_payout amounts for game completion. 
This function is critical for proper game history and statistics tracking.';
