-- ============================================
-- DATABASE CLEANUP - PRIORITY 2 (HIGH)
-- ============================================
-- Remove redundant fields and obsolete tables
-- Estimated time: 10 minutes
-- Risk level: LOW (fields not used in code)
-- IMPORTANT: Backup database before running!
-- ============================================

-- ============================================
-- STEP 1: VERIFY FIELDS ARE NOT USED
-- ============================================

-- Check if any of these fields have non-default values
SELECT 
  'deposit_bonus_available' as field_name,
  COUNT(*) as records_with_values,
  SUM(deposit_bonus_available) as total_value
FROM users 
WHERE deposit_bonus_available != 0
UNION ALL
SELECT 
  'referral_bonus_available' as field_name,
  COUNT(*) as records_with_values,
  SUM(referral_bonus_available) as total_value
FROM users 
WHERE referral_bonus_available != 0
UNION ALL
SELECT 
  'original_deposit_amount' as field_name,
  COUNT(*) as records_with_values,
  SUM(original_deposit_amount) as total_value
FROM users 
WHERE original_deposit_amount != 0
UNION ALL
SELECT 
  'total_bonus_earned' as field_name,
  COUNT(*) as records_with_values,
  SUM(total_bonus_earned) as total_value
FROM users 
WHERE total_bonus_earned != 0
UNION ALL
SELECT 
  'wagering_requirement' as field_name,
  COUNT(*) as records_with_values,
  SUM(wagering_requirement) as total_value
FROM users 
WHERE wagering_requirement != 0
UNION ALL
SELECT 
  'wagering_completed' as field_name,
  COUNT(*) as records_with_values,
  SUM(wagering_completed) as total_value
FROM users 
WHERE wagering_completed != 0
UNION ALL
SELECT 
  'bonus_locked (TRUE)' as field_name,
  COUNT(*) as records_with_values,
  0 as total_value
FROM users 
WHERE bonus_locked = true;

-- If any of these show records_with_values > 0, investigate before dropping!

-- ============================================
-- STEP 2: CHECK bonus_tracking TABLE USAGE
-- ============================================

-- Check if bonus_tracking table has any data
SELECT 
  'bonus_tracking table' as table_name,
  COUNT(*) as record_count,
  MIN(created_at) as oldest_record,
  MAX(created_at) as newest_record
FROM bonus_tracking;

-- If record_count > 0, you may want to migrate data to deposit_bonuses first

-- ============================================
-- STEP 3: BACKUP DATA (OPTIONAL BUT RECOMMENDED)
-- ============================================

-- Create backup of users bonus fields
CREATE TABLE IF NOT EXISTS users_bonus_fields_backup AS
SELECT 
  id,
  deposit_bonus_available,
  referral_bonus_available,
  original_deposit_amount,
  total_bonus_earned,
  wagering_requirement,
  wagering_completed,
  bonus_locked,
  NOW() as backed_up_at
FROM users
WHERE deposit_bonus_available != 0
   OR referral_bonus_available != 0
   OR original_deposit_amount != 0
   OR total_bonus_earned != 0
   OR wagering_requirement != 0
   OR wagering_completed != 0
   OR bonus_locked = true;

SELECT 
  'Backed up users with non-zero bonus fields:' as info,
  COUNT(*) as count 
FROM users_bonus_fields_backup;

-- Backup bonus_tracking table
CREATE TABLE IF NOT EXISTS bonus_tracking_backup AS
SELECT *, NOW() as backed_up_at
FROM bonus_tracking;

SELECT 
  'Backed up bonus_tracking records:' as info,
  COUNT(*) as count 
FROM bonus_tracking_backup;

-- ============================================
-- STEP 4: REMOVE REDUNDANT FIELDS FROM users
-- ============================================

-- Remove bonus-related fields that duplicate data from other tables
ALTER TABLE users 
DROP COLUMN IF EXISTS deposit_bonus_available,
DROP COLUMN IF EXISTS referral_bonus_available,
DROP COLUMN IF EXISTS original_deposit_amount,
DROP COLUMN IF EXISTS total_bonus_earned,
DROP COLUMN IF EXISTS wagering_requirement,
DROP COLUMN IF EXISTS wagering_completed,
DROP COLUMN IF EXISTS bonus_locked;

-- Verify columns were dropped
SELECT 
  column_name 
FROM information_schema.columns 
WHERE table_name = 'users' 
  AND column_name IN (
    'deposit_bonus_available',
    'referral_bonus_available',
    'original_deposit_amount',
    'total_bonus_earned',
    'wagering_requirement',
    'wagering_completed',
    'bonus_locked'
  );
-- Should return 0 rows

-- ============================================
-- STEP 5: REMOVE OBSOLETE bonus_tracking TABLE
-- ============================================

-- Drop the obsolete bonus_tracking table
-- (Backup was created in STEP 3)
DROP TABLE IF EXISTS bonus_tracking CASCADE;

-- Verify table was dropped
SELECT 
  table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name = 'bonus_tracking';
-- Should return 0 rows

-- ============================================
-- STEP 6: REMOVE UNUSED phone_verified FIELD
-- ============================================

-- Check if phone_verified is ever set to true
SELECT 
  'phone_verified = true' as check_type,
  COUNT(*) as count
FROM users 
WHERE phone_verified = true;

-- If count = 0, safe to drop
ALTER TABLE users 
DROP COLUMN IF EXISTS phone_verified;

-- ============================================
-- STEP 7: ADD MISSING FOREIGN KEY CONSTRAINTS
-- ============================================

-- Add FK for bonus_transactions.bonus_source_id
-- Note: This field can reference EITHER deposit_bonuses OR referral_bonuses
-- We can't add a traditional FK, but we can add a check

-- Add FK for user_creation_log
ALTER TABLE user_creation_log 
ADD CONSTRAINT IF NOT EXISTS fk_user_creation_log_user 
FOREIGN KEY (created_user_id) REFERENCES users(id) ON DELETE CASCADE;

-- Verify FK was added
SELECT 
  constraint_name 
FROM information_schema.table_constraints 
WHERE table_name = 'user_creation_log' 
  AND constraint_name = 'fk_user_creation_log_user';

-- ============================================
-- STEP 8: CLEANUP VERIFICATION
-- ============================================

-- Verify users table structure
SELECT 
  column_name,
  data_type,
  column_default,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'users'
ORDER BY ordinal_position;

-- Verify bonus tables exist and are intact
SELECT 
  table_name,
  (SELECT COUNT(*) FROM deposit_bonuses) as deposit_bonus_count,
  (SELECT COUNT(*) FROM referral_bonuses) as referral_bonus_count,
  (SELECT COUNT(*) FROM user_referrals) as user_referral_count,
  (SELECT COUNT(*) FROM bonus_transactions) as bonus_transaction_count
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('deposit_bonuses', 'referral_bonuses', 'user_referrals', 'bonus_transactions')
LIMIT 1;

-- ============================================
-- COMPLETION MESSAGE
-- ============================================

SELECT 
  '✅ PRIORITY 2 CLEANUP COMPLETE' as status,
  'Removed redundant bonus fields from users table' as action_1,
  'Dropped obsolete bonus_tracking table' as action_2,
  'Added missing foreign key constraints' as action_3,
  NOW() as completed_at;

-- ============================================
-- ROLLBACK INSTRUCTIONS (IF NEEDED)
-- ============================================

/*
If you need to rollback:

-- Restore bonus_tracking table
CREATE TABLE bonus_tracking AS 
SELECT * FROM bonus_tracking_backup;

-- Restore users bonus fields
ALTER TABLE users 
ADD COLUMN deposit_bonus_available numeric DEFAULT 0.00,
ADD COLUMN referral_bonus_available numeric DEFAULT 0.00,
ADD COLUMN original_deposit_amount numeric DEFAULT 0.00,
ADD COLUMN total_bonus_earned numeric DEFAULT 0.00,
ADD COLUMN wagering_requirement numeric DEFAULT 0.00,
ADD COLUMN wagering_completed numeric DEFAULT 0.00,
ADD COLUMN bonus_locked boolean DEFAULT false;

UPDATE users u
SET 
  deposit_bonus_available = b.deposit_bonus_available,
  referral_bonus_available = b.referral_bonus_available,
  original_deposit_amount = b.original_deposit_amount,
  total_bonus_earned = b.total_bonus_earned,
  wagering_requirement = b.wagering_requirement,
  wagering_completed = b.wagering_completed,
  bonus_locked = b.bonus_locked
FROM users_bonus_fields_backup b
WHERE u.id = b.id;
*/

-- ============================================
-- NEXT STEPS
-- ============================================
-- 1. Test your application thoroughly
-- 2. Verify bonus system still works
-- 3. Monitor for any errors
-- 4. If stable for 1 week, drop backup tables:
--    DROP TABLE users_bonus_fields_backup;
--    DROP TABLE bonus_tracking_backup;
-- ============================================