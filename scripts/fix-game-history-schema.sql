-- ============================================
-- GAME HISTORY SCHEMA FIX
-- Run this script in Supabase SQL Editor
-- This will fix the game_history table to match the expected schema
-- ============================================

-- Check and add winning_round column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'game_history' 
        AND column_name = 'winning_round'
    ) THEN
        ALTER TABLE game_history 
        ADD COLUMN winning_round INTEGER DEFAULT 1;
        
        -- Update existing records: if round column exists, copy it; otherwise use 1
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'game_history' 
            AND column_name = 'round'
        ) THEN
            UPDATE game_history 
            SET winning_round = COALESCE(round, 1)
            WHERE winning_round IS NULL OR winning_round = 1;
            
            -- Optionally drop the old round column (uncomment if you want to remove it)
            -- ALTER TABLE game_history DROP COLUMN IF EXISTS round;
        END IF;
        
        RAISE NOTICE 'Added winning_round column to game_history table';
    ELSE
        RAISE NOTICE 'Column winning_round already exists in game_history table';
    END IF;
END $$;

-- Check and add total_bets column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'game_history' 
        AND column_name = 'total_bets'
    ) THEN
        ALTER TABLE game_history 
        ADD COLUMN total_bets DECIMAL(15, 2) DEFAULT '0.00';
        
        RAISE NOTICE 'Added total_bets column to game_history table';
    ELSE
        RAISE NOTICE 'Column total_bets already exists in game_history table';
    END IF;
END $$;

-- Check and add total_payouts column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'game_history' 
        AND column_name = 'total_payouts'
    ) THEN
        ALTER TABLE game_history 
        ADD COLUMN total_payouts DECIMAL(15, 2) DEFAULT '0.00';
        
        RAISE NOTICE 'Added total_payouts column to game_history table';
    ELSE
        RAISE NOTICE 'Column total_payouts already exists in game_history table';
    END IF;
END $$;

-- Ensure opening_card, winner, winning_card, total_cards are NOT NULL
-- (Add NOT NULL constraints if columns exist but don't have the constraint)
DO $$ 
BEGIN
    -- opening_card
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'game_history' 
        AND column_name = 'opening_card'
        AND is_nullable = 'YES'
    ) THEN
        -- Set default values for NULL entries first
        UPDATE game_history SET opening_card = '' WHERE opening_card IS NULL;
        ALTER TABLE game_history ALTER COLUMN opening_card SET NOT NULL;
        RAISE NOTICE 'Set opening_card as NOT NULL';
    END IF;
    
    -- winner
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'game_history' 
        AND column_name = 'winner'
        AND is_nullable = 'YES'
    ) THEN
        -- Set default values for NULL entries first
        UPDATE game_history SET winner = 'andar' WHERE winner IS NULL;
        ALTER TABLE game_history ALTER COLUMN winner SET NOT NULL;
        RAISE NOTICE 'Set winner as NOT NULL';
    END IF;
    
    -- winning_card
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'game_history' 
        AND column_name = 'winning_card'
        AND is_nullable = 'YES'
    ) THEN
        -- Set default values for NULL entries first
        UPDATE game_history SET winning_card = '' WHERE winning_card IS NULL;
        ALTER TABLE game_history ALTER COLUMN winning_card SET NOT NULL;
        RAISE NOTICE 'Set winning_card as NOT NULL';
    END IF;
    
    -- total_cards
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'game_history' 
        AND column_name = 'total_cards'
        AND is_nullable = 'YES'
    ) THEN
        -- Set default values for NULL entries first
        UPDATE game_history SET total_cards = 0 WHERE total_cards IS NULL;
        ALTER TABLE game_history ALTER COLUMN total_cards SET NOT NULL;
        RAISE NOTICE 'Set total_cards as NOT NULL';
    END IF;
END $$;

-- Create indexes if they don't exist (for performance)
CREATE INDEX IF NOT EXISTS idx_game_history_game_id ON game_history(game_id);
CREATE INDEX IF NOT EXISTS idx_game_history_created_at ON game_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_game_history_winning_round ON game_history(winning_round);

-- Verify the final schema
DO $$ 
DECLARE
    rec RECORD;
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Game History Table Schema Verification';
    RAISE NOTICE '========================================';
    
    -- List all columns in game_history
    FOR rec IN 
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns 
        WHERE table_name = 'game_history'
        ORDER BY ordinal_position
    LOOP
        RAISE NOTICE 'Column: % | Type: % | Nullable: % | Default: %', 
            rec.column_name, rec.data_type, rec.is_nullable, rec.column_default;
    END LOOP;
    
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Migration completed successfully!';
    RAISE NOTICE '========================================';
END $$;

