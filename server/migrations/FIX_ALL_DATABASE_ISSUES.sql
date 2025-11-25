-- ================================================================
-- FIX ALL DATABASE ISSUES - Complete Fix Script
-- Run this in Supabase SQL Editor to fix signup and other errors
-- ================================================================

BEGIN;

-- ================================================================
-- STEP 1: Ensure all required columns exist in public.users
-- ================================================================

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN DEFAULT false;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS original_deposit_amount NUMERIC(15,2) DEFAULT 0.00;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS deposit_bonus_available NUMERIC(15,2) DEFAULT 0.00;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS referral_bonus_available NUMERIC(15,2) DEFAULT 0.00;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS referral_code VARCHAR(50);
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS referral_code_generated VARCHAR(50);
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS total_bonus_earned NUMERIC(15,2) DEFAULT 0.00;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS last_login TIMESTAMPTZ;

-- ================================================================
-- STEP 2: Add UNIQUE constraint to referral_code_generated
-- ================================================================

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'users_referral_code_generated_unique'
    ) THEN
        ALTER TABLE public.users 
        ADD CONSTRAINT users_referral_code_generated_unique 
        UNIQUE (referral_code_generated);
        RAISE NOTICE '✅ Added UNIQUE constraint to referral_code_generated';
    ELSE
        RAISE NOTICE 'ℹ️ UNIQUE constraint already exists';
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Could not add UNIQUE constraint: %', SQLERRM;
END $$;

-- ================================================================
-- STEP 3: Ensure enum types exist with correct values
-- ================================================================

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM ('player', 'admin', 'super_admin');
        RAISE NOTICE '✅ Created user_role enum';
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_status') THEN
        CREATE TYPE user_status AS ENUM ('active', 'suspended', 'banned', 'inactive');
        RAISE NOTICE '✅ Created user_status enum';
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'game_status') THEN
        CREATE TYPE game_status AS ENUM ('active', 'completed', 'cancelled');
        RAISE NOTICE '✅ Created game_status enum';
    END IF;
END $$;

-- ================================================================
-- STEP 4: Drop the problematic get_realtime_game_stats function
-- (The code now uses direct queries instead)
-- ================================================================

DROP FUNCTION IF EXISTS get_realtime_game_stats();

-- ================================================================
-- STEP 5: Add useful indexes for performance
-- ================================================================

CREATE INDEX IF NOT EXISTS idx_users_referral_code_generated 
ON public.users(referral_code_generated) 
WHERE referral_code_generated IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_users_phone 
ON public.users(phone);

CREATE INDEX IF NOT EXISTS idx_game_sessions_status 
ON game_sessions(status);

CREATE INDEX IF NOT EXISTS idx_player_bets_created_at 
ON player_bets(created_at DESC);

COMMIT;

-- ================================================================
-- VERIFICATION
-- ================================================================

SELECT '✅ DATABASE FIX COMPLETE' as status;

-- Show users table columns
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'users'
ORDER BY ordinal_position;
