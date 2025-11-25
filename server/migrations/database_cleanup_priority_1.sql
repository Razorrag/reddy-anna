-- ============================================
-- DATABASE CLEANUP - PRIORITY 1 (CRITICAL)
-- ============================================
-- Run these fixes immediately
-- Estimated time: 5 minutes
-- Risk level: LOW
-- ============================================

-- ============================================
-- 1. FIX REFERRAL BONUS PERCENTAGE (1% → 5%)
-- ============================================

-- Update default in referral_bonuses table
ALTER TABLE referral_bonuses 
ALTER COLUMN bonus_percentage SET DEFAULT 5.00;

-- Update existing records with wrong percentage
UPDATE referral_bonuses 
SET bonus_percentage = 5.00 
WHERE bonus_percentage = 1.00;

-- Update game_settings
UPDATE game_settings 
SET setting_value = '5', updated_at = NOW()
WHERE setting_key = 'referral_bonus_percent' 
  AND setting_value = '1';

-- Verify the changes
SELECT 'Referral Bonus Percentage in game_settings:' as check_type, setting_value 
FROM game_settings 
WHERE setting_key = 'referral_bonus_percent'
UNION ALL
SELECT 'Distinct values in referral_bonuses:' as check_type, DISTINCT bonus_percentage::text 
FROM referral_bonuses;

-- ============================================
-- 2. VERIFY UNIQUE CONSTRAINT ON REFERRAL CODES
-- ============================================

-- Check if constraint exists
SELECT 
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ UNIQUE constraint exists on referral_code_generated'
    ELSE '❌ MISSING: UNIQUE constraint on referral_code_generated'
  END as status
FROM information_schema.table_constraints 
WHERE table_name = 'users' 
  AND constraint_type = 'UNIQUE'
  AND constraint_name = 'users_referral_code_generated_unique';

-- Check for any duplicate codes (should return 0 rows)
SELECT 
  referral_code_generated,
  COUNT(*) as duplicate_count,
  STRING_AGG(id::text, ', ') as user_ids
FROM users
WHERE referral_code_generated IS NOT NULL
GROUP BY referral_code_generated
HAVING COUNT(*) > 1;

-- If duplicates found, they need to be fixed before adding constraint
-- Use the fix_referral_system.sql migration

-- ============================================
-- 3. ADD MISSING INDEXES FOR BONUS QUERIES
-- ============================================

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

-- ============================================
-- 4. VERIFY DATA INTEGRITY
-- ============================================

-- Check for orphaned deposit bonuses (no matching user)
SELECT 
  'Orphaned deposit_bonuses:' as check_type,
  COUNT(*) as count
FROM deposit_bonuses db
LEFT JOIN users u ON u.id = db.user_id
WHERE u.id IS NULL;

-- Check for orphaned referral bonuses
SELECT 
  'Orphaned referral_bonuses (no referrer):' as check_type,
  COUNT(*) as count
FROM referral_bonuses rb
LEFT JOIN users u ON u.id = rb.referrer_user_id
WHERE u.id IS NULL
UNION ALL
SELECT 
  'Orphaned referral_bonuses (no referred user):' as check_type,
  COUNT(*) as count
FROM referral_bonuses rb
LEFT JOIN users u ON u.id = rb.referred_user_id
WHERE u.id IS NULL;

-- Check for orphaned user_referrals
SELECT 
  'Orphaned user_referrals (no referrer):' as check_type,
  COUNT(*) as count
FROM user_referrals ur
LEFT JOIN users u ON u.id = ur.referrer_user_id
WHERE u.id IS NULL
UNION ALL
SELECT 
  'Orphaned user_referrals (no referred user):' as check_type,
  COUNT(*) as count
FROM user_referrals ur
LEFT JOIN users u ON u.id = ur.referred_user_id
WHERE u.id IS NULL;

-- ============================================
-- 5. VERIFY BONUS PERCENTAGE CONSISTENCY
-- ============================================

-- All these should return '5' or 5.00
SELECT 
  'game_settings.referral_bonus_percent' as source,
  setting_value as value
FROM game_settings 
WHERE setting_key = 'referral_bonus_percent'
UNION ALL
SELECT 
  'game_settings.default_deposit_bonus_percent' as source,
  setting_value as value
FROM game_settings 
WHERE setting_key = 'default_deposit_bonus_percent'
UNION ALL
SELECT 
  'referral_bonuses (distinct values)' as source,
  DISTINCT bonus_percentage::text as value
FROM referral_bonuses
UNION ALL
SELECT 
  'deposit_bonuses (distinct values)' as source,
  DISTINCT bonus_percentage::text as value
FROM deposit_bonuses;

-- ============================================
-- COMPLETION MESSAGE
-- ============================================

SELECT 
  '✅ PRIORITY 1 CLEANUP COMPLETE' as status,
  NOW() as completed_at;

-- ============================================
-- NEXT STEPS
-- ============================================
-- After running this script:
-- 1. Verify all checks passed (no orphaned records)
-- 2. Verify all percentages are 5% (not 1%)
-- 3. Verify UNIQUE constraint exists on referral_code_generated
-- 4. Proceed to database_cleanup_priority_2.sql
-- ============================================