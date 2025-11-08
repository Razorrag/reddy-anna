-- Add player aggregate columns to analytics tables
-- This allows tracking player winnings/losses over time in daily/monthly/yearly stats

-- Add columns to daily_game_statistics
ALTER TABLE daily_game_statistics 
ADD COLUMN IF NOT EXISTS total_player_winnings DECIMAL(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_player_losses DECIMAL(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS net_house_profit DECIMAL(15,2) DEFAULT 0;

-- Add columns to monthly_game_statistics
ALTER TABLE monthly_game_statistics 
ADD COLUMN IF NOT EXISTS total_player_winnings DECIMAL(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_player_losses DECIMAL(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS net_house_profit DECIMAL(15,2) DEFAULT 0;

-- Add columns to yearly_game_statistics
ALTER TABLE yearly_game_statistics 
ADD COLUMN IF NOT EXISTS total_player_winnings DECIMAL(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_player_losses DECIMAL(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS net_house_profit DECIMAL(15,2) DEFAULT 0;

-- Add comments for documentation
COMMENT ON COLUMN daily_game_statistics.total_player_winnings IS 'Sum of all player winnings (profit) for this day';
COMMENT ON COLUMN daily_game_statistics.total_player_losses IS 'Sum of all player losses for this day';
COMMENT ON COLUMN daily_game_statistics.net_house_profit IS 'House profit (total_player_losses - total_player_winnings)';

COMMENT ON COLUMN monthly_game_statistics.total_player_winnings IS 'Sum of all player winnings (profit) for this month';
COMMENT ON COLUMN monthly_game_statistics.total_player_losses IS 'Sum of all player losses for this month';
COMMENT ON COLUMN monthly_game_statistics.net_house_profit IS 'House profit (total_player_losses - total_player_winnings)';

COMMENT ON COLUMN yearly_game_statistics.total_player_winnings IS 'Sum of all player winnings (profit) for this year';
COMMENT ON COLUMN yearly_game_statistics.total_player_losses IS 'Sum of all player losses for this year';
COMMENT ON COLUMN yearly_game_statistics.net_house_profit IS 'House profit (total_player_losses - total_player_winnings)';

-- Backfill existing data with current user totals
-- This is a one-time operation to populate historical data

DO $$
DECLARE
  v_total_winnings DECIMAL(15,2);
  v_total_losses DECIMAL(15,2);
  v_net_profit DECIMAL(15,2);
BEGIN
  -- Calculate current totals from all users
  SELECT 
    COALESCE(SUM(CAST(users.total_winnings AS DECIMAL(15,2))), 0),
    COALESCE(SUM(CAST(users.total_losses AS DECIMAL(15,2))), 0)
  INTO v_total_winnings, v_total_losses
  FROM users;
  
  v_net_profit := v_total_losses - v_total_winnings;
  
  -- Update all existing daily records with current totals
  -- (This is approximate since we don't have historical daily breakdowns)
  UPDATE daily_game_statistics
  SET 
    total_player_winnings = v_total_winnings,
    total_player_losses = v_total_losses,
    net_house_profit = v_net_profit
  WHERE total_player_winnings = 0 AND total_player_losses = 0;
  
  -- Update all existing monthly records
  UPDATE monthly_game_statistics
  SET 
    total_player_winnings = v_total_winnings,
    total_player_losses = v_total_losses,
    net_house_profit = v_net_profit
  WHERE total_player_winnings = 0 AND total_player_losses = 0;
  
  -- Update all existing yearly records
  UPDATE yearly_game_statistics
  SET 
    total_player_winnings = v_total_winnings,
    total_player_losses = v_total_losses,
    net_house_profit = v_net_profit
  WHERE total_player_winnings = 0 AND total_player_losses = 0;
  
  RAISE NOTICE 'Backfilled analytics with: Winnings=%, Losses=%, NetProfit=%', 
    v_total_winnings, v_total_losses, v_net_profit;
END $$;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_daily_stats_net_profit ON daily_game_statistics(net_house_profit);
CREATE INDEX IF NOT EXISTS idx_monthly_stats_net_profit ON monthly_game_statistics(net_house_profit);
CREATE INDEX IF NOT EXISTS idx_yearly_stats_net_profit ON yearly_game_statistics(net_house_profit);

-- Verify the changes
SELECT 
  'daily_game_statistics' as table_name,
  COUNT(*) as total_records,
  SUM(total_player_winnings) as sum_winnings,
  SUM(total_player_losses) as sum_losses,
  SUM(net_house_profit) as sum_net_profit
FROM daily_game_statistics
UNION ALL
SELECT 
  'monthly_game_statistics',
  COUNT(*),
  SUM(total_player_winnings),
  SUM(total_player_losses),
  SUM(net_house_profit)
FROM monthly_game_statistics
UNION ALL
SELECT 
  'yearly_game_statistics',
  COUNT(*),
  SUM(total_player_winnings),
  SUM(total_player_losses),
  SUM(net_house_profit)
FROM yearly_game_statistics;
