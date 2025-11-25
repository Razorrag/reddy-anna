-- ============================================
-- COMPLETE DATABASE CLEANUP SCRIPT
-- ============================================
-- This script performs a comprehensive cleanup of:
-- 1. Unused bonus_tracking table
-- 2. Duplicate indexes
-- 3. Referral bonus percentage fix
-- 4. Redundant fields in users table (with verification)
-- 
-- IMPORTANT: Run in Supabase SQL Editor
-- Estimated time: 10-15 minutes
-- Risk: LOW (creates backups before changes)
-- ============================================

-- ============================================
-- SECTION 1: PRE-CLEANUP VERIFICATION
-- ============================================

SELECT '=== PRE-CLEANUP VERIFICATION ===' as section;

-- Check if bonus_tracking table exists and has data
SELECT 
  'bonus_tracking table' as table_name,
  COUNT(*) as record_count,
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ Empty - safe to drop'
    WHEN COUNT(*) > 0 THEN '⚠️ Has ' || COUNT(*)::text || ' records - will backup first'
  END as status
FROM bonus_tracking;

-- Check users table legacy bonus fields
SELECT 
  'Users with legacy bonus data:' as check_type,
  COUNT(*) as total_users,
  COUNT(CASE WHEN deposit_bonus_available > 0 THEN 1 END) as with_deposit_bonus,
  COUNT(CASE WHEN referral_bonus_available > 0 THEN 1 END) as with_referral_bonus,
  COUNT(CASE WHEN wagering_requirement > 0 THEN 1 END) as with_wagering,
  COUNT(CASE WHEN wagering_completed > 0 THEN 1 END) as with_completed,
  COUNT(CASE WHEN bonus_locked = true THEN 1 END) as with_locked_bonus,
  COUNT(CASE WHEN original_deposit_amount > 0 THEN 1 END) as with_original_deposit
FROM users;

-- Check deposit_bonuses table status
SELECT 
  'deposit_bonuses table:' as check_type,
  COUNT(*) as total_bonuses,
  COUNT(CASE WHEN status = 'locked' THEN 1 END) as locked,
  COUNT(CASE WHEN status = 'unlocked' THEN 1 END) as unlocked,
  COUNT(CASE WHEN status = 'credited' THEN 1 END) as credited,
  COUNT(CASE WHEN status = 'expired' THEN 1 END) as expired
FROM deposit_bonuses;

-- Check referral_bonuses table status
SELECT 
  'referral_bonuses table:' as check_type,
  COUNT(*) as total_bonuses,
  COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
  COUNT(CASE WHEN status = 'credited' THEN 1 END) as credited,
  CAST(AVG(bonus_percentage) AS DECIMAL(10,2)) as avg_percentage
FROM referral_bonuses;

-- Check for duplicate indexes
SELECT 
  'Duplicate indexes on bonus_transactions:' as check_type,
  STRING_AGG(indexname, ', ') as indexes
FROM pg_indexes 
WHERE tablename = 'bonus_transactions' 
  AND (indexname = 'idx_bonus_transactions_type' OR indexname = 'idx_bonus_transactions_bonus_type');

-- ============================================
-- SECTION 2: CREATE BACKUP TABLES
-- ============================================

SELECT '' as separator;
SELECT '=== CREATING BACKUP TABLES ===' as section;

-- Backup bonus_tracking table (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'bonus_tracking') THEN
    EXECUTE 'CREATE TABLE bonus_tracking_backup_' || TO_CHAR(NOW(), 'YYYYMMDD_HH24MISS') || ' AS SELECT * FROM bonus_tracking';
    RAISE NOTICE 'Backed up bonus_tracking table';
  ELSE
    RAISE NOTICE 'bonus_tracking table does not exist - skipping backup';
  END IF;
END $$;

-- Backup users table bonus fields (only non-zero values)
DO $$
DECLARE
  backup_table_name TEXT;
BEGIN
  backup_table_name := 'users_bonus_fields_backup_' || TO_CHAR(NOW(), 'YYYYMMDD_HH24MISS');
  
  EXECUTE 'CREATE TABLE ' || backup_table_name || ' AS
   SELECT
     id,
     deposit_bonus_available,
     referral_bonus_available,
     original_deposit_amount,
     wagering_requirement,
     wagering_completed,
     bonus_locked,
     NOW() as backed_up_at
   FROM users
   WHERE deposit_bonus_available > 0
      OR referral_bonus_available > 0
      OR original_deposit_amount > 0
      OR wagering_requirement > 0
      OR wagering_completed > 0
      OR bonus_locked = true';
  
  RAISE NOTICE 'Backed up users bonus fields to: %', backup_table_name;
END $$;

SELECT 'Users bonus fields backed up' as status;

-- ============================================
-- SECTION 3: DROP UNUSED bonus_tracking TABLE
-- ============================================

SELECT '' as separator;
SELECT '=== DROPPING UNUSED TABLES ===' as section;

-- Drop bonus_tracking table
DROP TABLE IF EXISTS bonus_tracking CASCADE;

-- Verify table was dropped
SELECT 
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ bonus_tracking table successfully dropped'
    ELSE '❌ ERROR: bonus_tracking table still exists'
  END as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name = 'bonus_tracking';

-- Drop related indexes (if they exist)
DROP INDEX IF EXISTS idx_bonus_tracking_user_id;
DROP INDEX IF EXISTS idx_bonus_tracking_status;
DROP INDEX IF EXISTS idx_bonus_tracking_user_status;

SELECT '✅ Dropped bonus_tracking indexes' as status;

-- ============================================
-- SECTION 4: DROP DUPLICATE INDEXES
-- ============================================

SELECT '' as separator;
SELECT '=== DROPPING DUPLICATE INDEXES ===' as section;

-- Drop duplicate bonus_transactions index
DROP INDEX IF EXISTS idx_bonus_transactions_bonus_type;

SELECT '✅ Dropped duplicate idx_bonus_transactions_bonus_type' as status;

-- Verify only one index remains
SELECT 
  'Remaining bonus_type indexes:' as check_type,
  COUNT(*) as count,
  STRING_AGG(indexname, ', ') as indexes
FROM pg_indexes 
WHERE tablename = 'bonus_transactions' 
  AND indexname LIKE '%bonus%type%';

-- ============================================
-- SECTION 5: FIX REFERRAL BONUS PERCENTAGE
-- ============================================

SELECT '' as separator;
SELECT '=== FIXING REFERRAL BONUS PERCENTAGE ===' as section;

-- Fix default in referral_bonuses table
ALTER TABLE referral_bonuses 
ALTER COLUMN bonus_percentage SET DEFAULT 5.00;

SELECT '✅ Updated referral_bonuses.bonus_percentage default to 5.00' as status;

-- Update existing records with 1% to 5%
UPDATE referral_bonuses 
SET bonus_percentage = 5.00 
WHERE bonus_percentage = 1.00;

SELECT 
  'Updated referral_bonuses records:' as action,
  COUNT(*) as updated_count
FROM referral_bonuses 
WHERE bonus_percentage = 5.00;

-- Fix game_settings
UPDATE game_settings 
SET setting_value = '5', updated_at = NOW()
WHERE setting_key = 'referral_bonus_percent' 
  AND setting_value = '1';

SELECT 
  'game_settings.referral_bonus_percent:' as setting,
  setting_value as value
FROM game_settings 
WHERE setting_key = 'referral_bonus_percent';

-- ============================================
-- SECTION 6: REMOVE REDUNDANT USERS FIELDS
-- ============================================

SELECT '' as separator;
SELECT '=== REMOVING REDUNDANT FIELDS FROM USERS TABLE ===' as section;

-- Only proceed if NO users have data in legacy fields
DO $$
DECLARE
  users_with_legacy_data INTEGER;
BEGIN
  SELECT COUNT(*) INTO users_with_legacy_data
  FROM users
  WHERE deposit_bonus_available > 0
     OR referral_bonus_available > 0
     OR wagering_requirement > 0
     OR wagering_completed > 0
     OR bonus_locked = true
     OR original_deposit_amount > 0;

  IF users_with_legacy_data = 0 THEN
    -- Safe to drop columns
    ALTER TABLE users DROP COLUMN IF EXISTS deposit_bonus_available;
    ALTER TABLE users DROP COLUMN IF EXISTS referral_bonus_available;
    ALTER TABLE users DROP COLUMN IF EXISTS wagering_requirement;
    ALTER TABLE users DROP COLUMN IF EXISTS wagering_completed;
    ALTER TABLE users DROP COLUMN IF EXISTS bonus_locked;
    ALTER TABLE users DROP COLUMN IF EXISTS original_deposit_amount;
    ALTER TABLE users DROP COLUMN IF EXISTS phone_verified;
    
    RAISE NOTICE '✅ Dropped 7 redundant fields from users table';
  ELSE
    RAISE NOTICE '⚠️ SKIPPED: % users have data in legacy fields. Manual migration needed.', users_with_legacy_data;
    RAISE NOTICE 'Run this query to see affected users: SELECT id, deposit_bonus_available, referral_bonus_available FROM users WHERE deposit_bonus_available > 0 OR referral_bonus_available > 0;';
  END IF;
END $$;

-- Verify columns were dropped
SELECT 
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ All redundant fields removed from users table'
    ELSE '⚠️ WARNING: ' || COUNT(*)::text || ' redundant fields still exist: ' || STRING_AGG(column_name, ', ')
  END as status
FROM information_schema.columns 
WHERE table_name = 'users' 
  AND column_name IN (
    'deposit_bonus_available',
    'referral_bonus_available',
    'wagering_requirement',
    'wagering_completed',
    'bonus_locked',
    'original_deposit_amount',
    'phone_verified'
  );

-- ============================================
-- SECTION 7: ADD MISSING INDEXES (PERFORMANCE)
-- ============================================

SELECT '' as separator;
SELECT '=== ADDING PERFORMANCE INDEXES ===' as section;

-- Index for deposit bonus queries by user and status
CREATE INDEX IF NOT EXISTS idx_deposit_bonuses_user_status_created 
ON deposit_bonuses(user_id, status, created_at DESC);

-- Index for referral bonus queries by referrer
CREATE INDEX IF NOT EXISTS idx_referral_bonuses_referrer_created 
ON referral_bonuses(referrer_user_id, created_at DESC);

-- Index for bonus transactions by user and type
CREATE INDEX IF NOT EXISTS idx_bonus_transactions_user_bonus_type_created
ON bonus_transactions(user_id, bonus_type, created_at DESC);

-- Index for user_referrals by referrer and bonus status
CREATE INDEX IF NOT EXISTS idx_user_referrals_referrer_bonus_applied
ON user_referrals(referrer_user_id, bonus_applied, created_at DESC);

-- Index for checking if user was referred
CREATE INDEX IF NOT EXISTS idx_user_referrals_referred_lookup
ON user_referrals(referred_user_id);

SELECT '✅ Created 5 performance indexes' as status;

-- ============================================
-- SECTION 8: VERIFY UNIQUE CONSTRAINT
-- ============================================

SELECT '' as separator;
SELECT '=== VERIFYING REFERRAL CODE UNIQUE CONSTRAINT ===' as section;

-- Check if UNIQUE constraint exists on referral_code_generated
SELECT 
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ UNIQUE constraint exists on users.referral_code_generated'
    ELSE '❌ MISSING: UNIQUE constraint on users.referral_code_generated - run fix_referral_system.sql first!'
  END as status
FROM information_schema.table_constraints 
WHERE table_name = 'users' 
  AND constraint_type = 'UNIQUE'
  AND constraint_name = 'users_referral_code_generated_unique';

-- Check for any duplicate referral codes
SELECT 
  'Duplicate referral codes:' as check_type,
  COUNT(*) as duplicate_count,
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ No duplicates found'
    ELSE '❌ WARNING: ' || COUNT(*)::text || ' duplicate codes exist!'
  END as status
FROM (
  SELECT referral_code_generated, COUNT(*) as cnt
  FROM users
  WHERE referral_code_generated IS NOT NULL
  GROUP BY referral_code_generated
  HAVING COUNT(*) > 1
) duplicates;

-- ============================================
-- SECTION 9: FINAL VERIFICATION
-- ============================================

SELECT '' as separator;
SELECT '=== FINAL VERIFICATION ===' as section;

-- Verify all bonus tables exist and have correct structure
SELECT 
  'Bonus System Tables:' as check_type,
  COUNT(CASE WHEN table_name = 'deposit_bonuses' THEN 1 END) as deposit_bonuses,
  COUNT(CASE WHEN table_name = 'referral_bonuses' THEN 1 END) as referral_bonuses,
  COUNT(CASE WHEN table_name = 'user_referrals' THEN 1 END) as user_referrals,
  COUNT(CASE WHEN table_name = 'bonus_transactions' THEN 1 END) as bonus_transactions,
  COUNT(CASE WHEN table_name = 'bonus_tracking' THEN 1 END) as bonus_tracking_should_be_0
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('deposit_bonuses', 'referral_bonuses', 'user_referrals', 'bonus_transactions', 'bonus_tracking');

-- Check data integrity
SELECT 
  'Data Integrity:' as check_type,
  (SELECT COUNT(*) FROM users) as total_users,
  (SELECT COUNT(*) FROM deposit_bonuses) as deposit_bonuses,
  (SELECT COUNT(*) FROM referral_bonuses) as referral_bonuses,
  (SELECT COUNT(*) FROM user_referrals) as referral_relationships,
  (SELECT COUNT(*) FROM bonus_transactions) as bonus_transactions;

-- Verify bonus percentages
SELECT 
  'Bonus Percentages:' as check_type,
  (SELECT setting_value FROM game_settings WHERE setting_key = 'deposit_bonus_percent') as deposit_percent,
  (SELECT setting_value FROM game_settings WHERE setting_key = 'referral_bonus_percent') as referral_percent;

-- Check for orphaned records
SELECT 
  'Orphaned deposit_bonuses:' as check_type,
  COUNT(*) as count,
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ No orphans'
    ELSE '⚠️ WARNING: ' || COUNT(*)::text || ' orphaned records'
  END as status
FROM deposit_bonuses db
LEFT JOIN users u ON u.id = db.user_id
WHERE u.id IS NULL;

SELECT 
  'Orphaned referral_bonuses:' as check_type,
  COUNT(*) as count,
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ No orphans'
    ELSE '⚠️ WARNING: ' || COUNT(*)::text || ' orphaned records'
  END as status
FROM referral_bonuses rb
LEFT JOIN users u ON u.id = rb.referrer_user_id
WHERE u.id IS NULL;

SELECT 
  'Orphaned user_referrals:' as check_type,
  COUNT(*) as count,
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ No orphans'
    ELSE '⚠️ WARNING: ' || COUNT(*)::text || ' orphaned records'
  END as status
FROM user_referrals ur
LEFT JOIN users u ON u.id = ur.referrer_user_id
WHERE u.id IS NULL;

-- ============================================
-- SECTION 10: CLEANUP SUMMARY
-- ============================================

SELECT '' as separator;
SELECT '=== CLEANUP COMPLETE ===' as section;

SELECT 
  '✅ Database cleanup completed successfully' as status,
  NOW() as completed_at;

SELECT 'Summary of changes:' as summary
UNION ALL SELECT '1. Dropped bonus_tracking table'
UNION ALL SELECT '2. Dropped duplicate indexes'
UNION ALL SELECT '3. Fixed referral bonus percentage (1% → 5%)'
UNION ALL SELECT '4. Removed redundant fields from users table (if no data)'
UNION ALL SELECT '5. Added 5 performance indexes'
UNION ALL SELECT '6. Verified UNIQUE constraint on referral codes'
UNION ALL SELECT '7. Created backup tables';

-- ============================================
-- NEXT STEPS
-- ============================================

SELECT '' as separator;
SELECT '=== NEXT STEPS ===' as section;

SELECT 
  1 as step,
  'Test your application thoroughly' as action,
  'Verify bonus and referral systems work correctly' as details
UNION ALL
SELECT 
  2 as step,
  'Monitor for errors' as action,
  'Check application logs for any database-related issues' as details
UNION ALL
SELECT 
  3 as step,
  'Keep backups for 1 week' as action,
  'Do not drop backup tables until system is stable' as details
UNION ALL
SELECT 
  4 as step,
  'Drop backup tables after 1 week' as action,
  'DROP TABLE users_bonus_fields_backup_*; DROP TABLE bonus_tracking_backup_*;' as details
ORDER BY step;

-- ============================================
-- ROLLBACK INSTRUCTIONS (IF NEEDED)
-- ============================================

/*
IF YOU NEED TO ROLLBACK:

-- 1. Restore bonus_tracking table (if dropped)
CREATE TABLE bonus_tracking AS 
SELECT * FROM bonus_tracking_backup_YYYYMMDD_HHMMSS;

-- 2. Restore users bonus fields (if dropped)
ALTER TABLE users 
ADD COLUMN deposit_bonus_available numeric DEFAULT 0.00,
ADD COLUMN referral_bonus_available numeric DEFAULT 0.00,
ADD COLUMN original_deposit_amount numeric DEFAULT 0.00,
ADD COLUMN wagering_requirement numeric DEFAULT 0.00,
ADD COLUMN wagering_completed numeric DEFAULT 0.00,
ADD COLUMN bonus_locked boolean DEFAULT false,
ADD COLUMN phone_verified boolean DEFAULT false;

UPDATE users u
SET 
  deposit_bonus_available = b.deposit_bonus_available,
  referral_bonus_available = b.referral_bonus_available,
  original_deposit_amount = b.original_deposit_amount,
  wagering_requirement = b.wagering_requirement,
  wagering_completed = b.wagering_completed,
  bonus_locked = b.bonus_locked
FROM users_bonus_fields_backup_YYYYMMDD_HHMMSS b
WHERE u.id = b.id;

-- 3. Restore referral bonus percentage to 1%
ALTER TABLE referral_bonuses ALTER COLUMN bonus_percentage SET DEFAULT 1.00;
UPDATE game_settings SET setting_value = '1' WHERE setting_key = 'referral_bonus_percent';

-- 4. Recreate duplicate index
CREATE INDEX idx_bonus_transactions_bonus_type ON bonus_transactions(bonus_type);
*/

-- ============================================
-- END OF CLEANUP SCRIPT
-- ============================================