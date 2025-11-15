-- ============================================
-- FIX DUPLICATE DATABASE FUNCTIONS
-- Run this ONLY after verifying duplicates exist
-- ============================================

-- STEP 1: List all versions of apply_payouts_and_update_bets
-- Run this first to see what needs to be dropped
SELECT 
    n.nspname AS schema_name,
    p.proname AS function_name,
    pg_get_function_arguments(p.oid) AS arguments,
    p.oid,
    pg_get_functiondef(p.oid) AS definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.proname = 'apply_payouts_and_update_bets'
ORDER BY n.nspname, p.oid;

-- STEP 2: Check which schema is being used (usually 'public')
SELECT current_schema();

-- STEP 3: If duplicates found, drop old versions
-- ⚠️ WARNING: Only drop if you're sure which one is correct!
-- Keep the version that matches your current code

-- Example: Drop function with specific signature
-- Replace the argument types with actual types from query above
-- DROP FUNCTION IF EXISTS public.apply_payouts_and_update_bets(OLD_SIGNATURE);

-- STEP 4: Verify only one version remains
SELECT 
    n.nspname AS schema_name,
    p.proname AS function_name,
    pg_get_function_arguments(p.oid) AS arguments
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.proname = 'apply_payouts_and_update_bets';

-- ============================================
-- RECREATE FUNCTION (if needed)
-- ============================================

-- If you need to recreate the function, use this template:
-- Replace with actual implementation from your codebase

/*
CREATE OR REPLACE FUNCTION apply_payouts_and_update_bets(
    payouts JSONB,
    winning_bets_ids TEXT[],
    losing_bets_ids TEXT[]
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
    -- Implementation here
    -- This should match your storage-supabase.ts implementation
END;
$$;
*/

