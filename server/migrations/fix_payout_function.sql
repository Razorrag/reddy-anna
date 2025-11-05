-- Fix ambiguous column reference in apply_payouts_and_update_bets function
-- This fixes the error: column reference "payout_record" is ambiguous

CREATE OR REPLACE FUNCTION apply_payouts_and_update_bets(
  payouts JSONB,
  winning_bets_ids UUID[],
  losing_bets_ids UUID[]
)
RETURNS VOID AS $$
DECLARE
  payout_record RECORD;
BEGIN
  -- Update balances for winning users
  FOR payout_record IN SELECT * FROM jsonb_to_recordset(payouts) AS x(userId UUID, amount NUMERIC)
  LOOP
    UPDATE users
    SET balance = balance + payout_record.amount
    WHERE id = payout_record.userId;
  END LOOP;

  -- Update status for winning bets
  UPDATE player_bets
  SET status = 'win'
  WHERE id = ANY(winning_bets_ids);

  -- Update status for losing bets
  UPDATE player_bets
  SET status = 'lose'
  WHERE id = ANY(losing_bets_ids);
END;
$$ LANGUAGE plpgsql;
