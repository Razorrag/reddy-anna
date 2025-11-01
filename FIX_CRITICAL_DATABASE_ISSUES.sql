-- ============================================
-- CRITICAL FIX: Database Schema and Cache Issues
-- Run this in Supabase SQL Editor
-- ============================================

-- ISSUE 1: Fix user_referrals foreign key relationships
-- Drop and recreate the foreign keys to refresh Supabase schema cache

ALTER TABLE user_referrals DROP CONSTRAINT IF EXISTS user_referrals_referrer_user_id_fkey;
ALTER TABLE user_referrals DROP CONSTRAINT IF EXISTS user_referrals_referred_user_id_fkey;

-- Recreate with explicit names
ALTER TABLE user_referrals 
ADD CONSTRAINT user_referrals_referrer_user_id_fkey 
FOREIGN KEY (referrer_user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE user_referrals 
ADD CONSTRAINT user_referrals_referred_user_id_fkey 
FOREIGN KEY (referred_user_id) REFERENCES users(id) ON DELETE CASCADE;

-- Force Supabase to refresh schema cache
NOTIFY pgrst, 'reload schema';

-- ISSUE 2: Ensure daily_stats table exists with correct structure
CREATE TABLE IF NOT EXISTS daily_stats (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  date DATE NOT NULL UNIQUE,
  total_games INTEGER DEFAULT 0,
  total_bets DECIMAL(15, 2) DEFAULT 0,
  total_payouts DECIMAL(15, 2) DEFAULT 0,
  total_revenue DECIMAL(15, 2) DEFAULT 0,
  profit_loss DECIMAL(15, 2) DEFAULT 0,
  unique_players INTEGER DEFAULT 0,
  peak_bets_hour INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for date lookups
CREATE INDEX IF NOT EXISTS idx_daily_stats_date ON daily_stats(date DESC);

-- ISSUE 3: Create or update function to aggregate daily stats
CREATE OR REPLACE FUNCTION update_daily_stats(target_date DATE)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO daily_stats (
    date,
    total_games,
    total_bets,
    total_payouts,
    total_revenue,
    profit_loss,
    unique_players,
    peak_bets_hour,
    updated_at
  )
  SELECT
    target_date,
    COUNT(DISTINCT gs.game_id) as total_games,
    COALESCE(SUM(b.amount), 0) as total_bets,
    COALESCE(SUM(CASE WHEN b.result = 'win' THEN b.payout_amount ELSE 0 END), 0) as total_payouts,
    COALESCE(SUM(CASE WHEN b.result = 'win' THEN b.amount - b.payout_amount ELSE b.amount END), 0) as total_revenue,
    COALESCE(SUM(CASE WHEN b.result = 'win' THEN -(b.payout_amount - b.amount) ELSE b.amount END), 0) as profit_loss,
    COUNT(DISTINCT b.user_id) as unique_players,
    EXTRACT(HOUR FROM (
      SELECT created_at 
      FROM bets 
      WHERE DATE(created_at) = target_date 
      ORDER BY created_at 
      LIMIT 1
    )) as peak_bets_hour,
    NOW()
  FROM game_sessions gs
  LEFT JOIN bets b ON b.game_id = gs.game_id
  WHERE DATE(gs.created_at) = target_date
  ON CONFLICT (date) 
  DO UPDATE SET
    total_games = EXCLUDED.total_games,
    total_bets = EXCLUDED.total_bets,
    total_payouts = EXCLUDED.total_payouts,
    total_revenue = EXCLUDED.total_revenue,
    profit_loss = EXCLUDED.profit_loss,
    unique_players = EXCLUDED.unique_players,
    peak_bets_hour = EXCLUDED.peak_bets_hour,
    updated_at = NOW();
END;
$$;

-- ISSUE 4: Verify all tables exist
DO $$
BEGIN
  -- Check if critical tables exist
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'users') THEN
    RAISE EXCEPTION 'Critical table "users" does not exist!';
  END IF;
  
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'user_referrals') THEN
    RAISE EXCEPTION 'Critical table "user_referrals" does not exist!';
  END IF;
  
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'game_sessions') THEN
    RAISE EXCEPTION 'Critical table "game_sessions" does not exist!';
  END IF;
  
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'bets') THEN
    RAISE EXCEPTION 'Critical table "bets" does not exist!';
  END IF;
  
  RAISE NOTICE 'All critical tables verified successfully';
END
$$;

-- ISSUE 5: Grant necessary permissions
GRANT ALL ON daily_stats TO authenticated;
GRANT ALL ON user_referrals TO authenticated;

-- Success message
SELECT 'Database fixes applied successfully!' as status;









