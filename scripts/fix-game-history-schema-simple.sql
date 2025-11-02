-- ============================================
-- GAME HISTORY SCHEMA FIX (Simple Version)
-- Run this script in Supabase SQL Editor
-- This will add missing columns to game_history table
-- ============================================

-- Add winning_round column if it doesn't exist
ALTER TABLE game_history 
ADD COLUMN IF NOT EXISTS winning_round INTEGER DEFAULT 1;

-- Add total_bets column if it doesn't exist
ALTER TABLE game_history 
ADD COLUMN IF NOT EXISTS total_bets DECIMAL(15, 2) DEFAULT '0.00';

-- Add total_payouts column if it doesn't exist
ALTER TABLE game_history 
ADD COLUMN IF NOT EXISTS total_payouts DECIMAL(15, 2) DEFAULT '0.00';

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_game_history_game_id ON game_history(game_id);
CREATE INDEX IF NOT EXISTS idx_game_history_created_at ON game_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_game_history_winning_round ON game_history(winning_round);

-- Verify the changes
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'game_history'
ORDER BY ordinal_position;

