-- ============================================
-- CRITICAL FIX: Create missing 'bets' table
-- Your schema has 'player_bets' but code uses 'bets'
-- This creates BOTH for compatibility
-- ============================================

-- Option 1: Create 'bets' as an alias/view to 'player_bets' (if player_bets exists)
CREATE TABLE IF NOT EXISTS bets (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id VARCHAR(20) NOT NULL,
  game_id VARCHAR(36) NOT NULL,
  round INTEGER NOT NULL DEFAULT 1,
  side VARCHAR(10) NOT NULL, -- 'andar' or 'bahar'
  amount DECIMAL(15, 2) NOT NULL,
  potential_payout DECIMAL(15, 2),
  actual_payout DECIMAL(15, 2),
  payout_amount DECIMAL(15, 2),
  result VARCHAR(20), -- 'win', 'loss', 'pending'
  settled BOOLEAN DEFAULT false,
  settled_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Foreign keys
  CONSTRAINT fk_bets_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_bets_game FOREIGN KEY (game_id) REFERENCES game_sessions(game_id) ON DELETE CASCADE
);

-- Indexes for bets table
CREATE INDEX IF NOT EXISTS idx_bets_user_id ON bets(user_id);
CREATE INDEX IF NOT EXISTS idx_bets_game_id ON bets(game_id);
CREATE INDEX IF NOT EXISTS idx_bets_created_at ON bets(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bets_settled ON bets(settled);
CREATE INDEX IF NOT EXISTS idx_bets_result ON bets(result);

-- Copy existing data from player_bets to bets if player_bets exists
INSERT INTO bets (id, user_id, game_id, round, side, amount, potential_payout, actual_payout, payout_amount, result, settled, settled_at, created_at, updated_at)
SELECT 
  id, 
  user_id, 
  game_id, 
  round, 
  side, 
  amount, 
  potential_payout, 
  actual_payout, 
  payout_amount, 
  result, 
  settled, 
  settled_at, 
  created_at, 
  updated_at
FROM player_bets
WHERE NOT EXISTS (SELECT 1 FROM bets WHERE bets.id = player_bets.id)
ON CONFLICT (id) DO NOTHING;

-- Grant permissions
GRANT ALL ON bets TO authenticated;
GRANT ALL ON bets TO anon;

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';

-- Success message
SELECT '✅ Bets table created successfully!' as status;









