-- Clean up any old versions of apply_payouts_and_update_bets to avoid ambiguity
-- We want a SINGLE function whose types match the actual schema
DROP FUNCTION IF EXISTS public.apply_payouts_and_update_bets(
  payouts JSONB,
  winning_bets_ids UUID[],
  losing_bets_ids UUID[]
);

DROP FUNCTION IF EXISTS public.apply_payouts_and_update_bets(
  payouts JSONB,
  winning_bets_ids TEXT[],
  losing_bets_ids TEXT[]
);

-- Create the canonical version using TEXT[] to match player_bets.id (character varying)
CREATE OR REPLACE FUNCTION public.apply_payouts_and_update_bets(
  payouts JSONB,
  winning_bets_ids TEXT[],
  losing_bets_ids TEXT[]
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  payout_record JSONB;
  user_id_val TEXT;
  amount_val NUMERIC;
BEGIN
  -- Process each payout in the JSONB array
  FOR payout_record IN SELECT * FROM jsonb_array_elements(payouts)
  LOOP
    user_id_val := payout_record->>'userId';
    amount_val := (payout_record->>'amount')::NUMERIC;
    
    -- Update user balance
    UPDATE users
    SET balance = balance + amount_val
    WHERE id = user_id_val;
    
    IF NOT FOUND THEN
      RAISE EXCEPTION 'User % not found', user_id_val;
    END IF;
  END LOOP;
  
  -- Update winning bets status and actual_payout
  UPDATE player_bets
  SET 
    status = 'won',
    actual_payout = amount * 2,  -- Winning bets get 2x payout
    updated_at = NOW()
  WHERE id = ANY(winning_bets_ids);
  
  -- Update losing bets status
  UPDATE player_bets
  SET 
    status = 'lost',
    actual_payout = 0,  -- Losing bets get 0 payout
    updated_at = NOW()
  WHERE id = ANY(losing_bets_ids);
END;
$$;

-- Add comment explaining the function
COMMENT ON FUNCTION public.apply_payouts_and_update_bets IS 
'Atomically updates user balances, bet statuses, and actual_payout amounts for game completion. 
Uses UUID[] for bet IDs. The old text[] version has been removed to prevent ambiguity.';
