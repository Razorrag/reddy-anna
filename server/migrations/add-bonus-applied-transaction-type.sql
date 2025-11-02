-- Migration to add 'bonus_applied' to transaction_type enum
-- This allows tracking when bonuses are actually credited to user balance
-- Run this in Supabase SQL Editor if you encounter errors with bonus_applied transactions

-- Check if enum exists and add the new value
DO $$ 
BEGIN
    -- Check if 'bonus_applied' already exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'bonus_applied' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'transaction_type')
    ) THEN
        -- Add 'bonus_applied' to the transaction_type enum
        ALTER TYPE transaction_type ADD VALUE 'bonus_applied';
    END IF;
END $$;

-- Verify the enum now includes bonus_applied
SELECT enumlabel FROM pg_enum 
WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'transaction_type')
ORDER BY enumsortorder;

