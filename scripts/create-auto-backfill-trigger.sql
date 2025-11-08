-- Create a PostgreSQL trigger to automatically calculate and insert game statistics
-- when a new game is added to game_history
-- USE THIS ONLY IF THE APPLICATION CODE ISN'T SAVING STATISTICS

-- Create the trigger function
CREATE OR REPLACE FUNCTION auto_calculate_game_statistics()
RETURNS TRIGGER AS $$
DECLARE
  v_total_players INTEGER;
  v_total_bets NUMERIC;
  v_total_winnings NUMERIC;
  v_andar_total_bet NUMERIC;
  v_bahar_total_bet NUMERIC;
  v_andar_bets_count INTEGER;
  v_bahar_bets_count INTEGER;
  v_profit_loss NUMERIC;
  v_profit_loss_percentage NUMERIC;
BEGIN
  -- Calculate statistics from player_bets for this game
  SELECT 
    COUNT(DISTINCT user_id),
    COALESCE(SUM(amount), 0),
    COALESCE(SUM(payout), 0),
    COALESCE(SUM(CASE WHEN side = 'andar' THEN amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN side = 'bahar' THEN amount ELSE 0 END), 0),
    COUNT(CASE WHEN side = 'andar' THEN 1 END),
    COUNT(CASE WHEN side = 'bahar' THEN 1 END)
  INTO 
    v_total_players,
    v_total_bets,
    v_total_winnings,
    v_andar_total_bet,
    v_bahar_total_bet,
    v_andar_bets_count,
    v_bahar_bets_count
  FROM player_bets
  WHERE game_id = NEW.game_id;

  -- Calculate profit/loss
  v_profit_loss := v_total_bets - v_total_winnings;
  
  -- Calculate percentage
  IF v_total_bets > 0 THEN
    v_profit_loss_percentage := (v_profit_loss / v_total_bets) * 100;
  ELSE
    v_profit_loss_percentage := 0;
  END IF;

  -- Insert into game_statistics (only if not already exists)
  INSERT INTO game_statistics (
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
    NEW.game_id,
    v_total_players,
    v_total_bets::text,
    v_total_winnings::text,
    v_profit_loss::text,
    v_andar_bets_count,
    v_bahar_bets_count,
    v_andar_total_bet::text,
    v_bahar_total_bet::text,
    v_profit_loss::text,
    v_profit_loss_percentage::text,
    v_total_winnings::text,
    0,
    v_total_players,
    NEW.created_at
  WHERE NOT EXISTS (
    SELECT 1 FROM game_statistics WHERE game_id = NEW.game_id
  );

  -- Log the action
  RAISE NOTICE 'Auto-calculated statistics for game_id: % (Total Bets: %, Profit/Loss: %)', 
    NEW.game_id, v_total_bets, v_profit_loss;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger on game_history INSERT
DROP TRIGGER IF EXISTS trg_auto_calculate_game_statistics ON game_history;

CREATE TRIGGER trg_auto_calculate_game_statistics
AFTER INSERT ON game_history
FOR EACH ROW
EXECUTE FUNCTION auto_calculate_game_statistics();

-- Verify trigger was created
SELECT 
  trigger_name, 
  event_manipulation, 
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_name = 'trg_auto_calculate_game_statistics';

COMMENT ON TRIGGER trg_auto_calculate_game_statistics ON game_history IS 
  'Automatically calculates and inserts game statistics when a new game is completed';
