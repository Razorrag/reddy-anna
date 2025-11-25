-- ============================================
-- COMPREHENSIVE DATABASE DIAGNOSIS AND FIX
-- Run this in Supabase SQL Editor
-- ============================================

-- ============================================
-- SECTION 1: DIAGNOSE GAME HISTORY ISSUES
-- ============================================

SELECT '=== GAME HISTORY DIAGNOSIS ===' as section;

-- Check if winner field has correct values
SELECT 
  'Game History Winner Values:' as check_type,
  winner,
  COUNT(*) as count
FROM game_history
GROUP BY winner
ORDER BY count DESC;

-- Check for any NULL or invalid winners
SELECT 
  'Invalid Winners:' as check_type,
  COUNT(*) as count,
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ All winners are valid'
    ELSE '❌ Found invalid winner values'
  END as status
FROM game_history
WHERE winner IS NULL OR winner NOT IN ('andar', 'bahar');

-- Check recent games to verify data
SELECT 
  'Recent 10 Games:' as check_type,
  game_id,
  opening_card,
  winner,
  winning_card,
  winning_round,
  created_at
FROM game_history
ORDER BY created_at DESC
LIMIT 10;

-- ============================================
-- SECTION 2: DIAGNOSE REFERRAL SYSTEM ISSUES
-- ============================================

SELECT '' as separator;
SELECT '=== REFERRAL SYSTEM DIAGNOSIS ===' as section;

-- Check user_referrals table
SELECT 
  'User Referrals Stats:' as check_type,
  COUNT(*) as total_referrals,
  COUNT(CASE WHEN bonus_applied = true THEN 1 END) as bonus_applied,
  COUNT(CASE WHEN bonus_applied = false THEN 1 END) as bonus_pending,
  COALESCE(SUM(deposit_amount::numeric), 0) as total_deposits,
  COALESCE(SUM(bonus_amount::numeric), 0) as total_bonus
FROM user_referrals;

-- Check referral_bonuses table
SELECT 
  'Referral Bonuses Stats:' as check_type,
  COUNT(*) as total,
  COUNT(CASE WHEN status = 'locked' THEN 1 END) as locked,
  COUNT(CASE WHEN status = 'unlocked' THEN 1 END) as unlocked,
  COUNT(CASE WHEN status = 'credited' THEN 1 END) as credited,
  COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
  COUNT(CASE WHEN status = 'expired' THEN 1 END) as expired
FROM referral_bonuses;

-- Check for orphaned referral bonuses (referrer doesn't exist)
SELECT 
  'Orphaned Referral Bonuses (referrer):' as check_type,
  COUNT(*) as count,
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ No orphans'
    ELSE '❌ Found orphaned records'
  END as status
FROM referral_bonuses rb
LEFT JOIN users u ON u.id = rb.referrer_user_id
WHERE u.id IS NULL;

-- Check for orphaned referral bonuses (referred user doesn't exist)
SELECT 
  'Orphaned Referral Bonuses (referred):' as check_type,
  COUNT(*) as count,
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ No orphans'
    ELSE '❌ Found orphaned records'
  END as status
FROM referral_bonuses rb
LEFT JOIN users u ON u.id = rb.referred_user_id
WHERE u.id IS NULL;

-- Check users with referral codes
SELECT 
  'Users with Referral Codes:' as check_type,
  COUNT(*) as total_users,
  COUNT(CASE WHEN referral_code IS NOT NULL THEN 1 END) as used_referral_code,
  COUNT(CASE WHEN referral_code_generated IS NOT NULL THEN 1 END) as has_generated_code
FROM users;

-- ============================================
-- SECTION 3: LIST ALL TABLES
-- ============================================

SELECT '' as separator;
SELECT '=== ALL DATABASE TABLES ===' as section;

SELECT 
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns WHERE columns.table_name = tables.table_name) as column_count
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- ============================================
-- SECTION 4: IDENTIFY POTENTIALLY UNUSED TABLES
-- ============================================

SELECT '' as separator;
SELECT '=== POTENTIALLY UNUSED TABLES ===' as section;

-- Check row counts for all tables
DO $$
DECLARE
  r RECORD;
  row_count INTEGER;
BEGIN
  FOR r IN 
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
  LOOP
    EXECUTE 'SELECT COUNT(*) FROM ' || quote_ident(r.table_name) INTO row_count;
    RAISE NOTICE 'Table: %, Rows: %', r.table_name, row_count;
  END LOOP;
END $$;

-- ============================================
-- SECTION 5: CHECK GAME SETTINGS
-- ============================================

SELECT '' as separator;
SELECT '=== GAME SETTINGS ===' as section;

SELECT 
  setting_key,
  setting_value,
  description
FROM game_settings
WHERE setting_key IN (
  'default_deposit_bonus_percent',
  'wagering_multiplier',
  'referral_bonus_percent',
  'referral_wagering_multiplier',
  'min_deposit_for_referral',
  'max_referrals_per_month'
)
ORDER BY setting_key;

-- ============================================
-- SECTION 6: FIX MISSING GAME SETTINGS
-- ============================================

SELECT '' as separator;
SELECT '=== FIXING MISSING SETTINGS ===' as section;

INSERT INTO game_settings (setting_key, setting_value, description)
VALUES 
  ('default_deposit_bonus_percent', '5', 'Percentage of deposit given as bonus'),
  ('wagering_multiplier', '0.3', 'Wagering requirement multiplier (30% of deposit)'),
  ('referral_bonus_percent', '5', 'Referral bonus percentage (5% of deposit)'),
  ('referral_wagering_multiplier', '3', 'Wagering multiplier for referral bonuses (3x bonus)'),
  ('min_deposit_for_referral', '500', 'Minimum deposit amount for referral bonus'),
  ('max_referrals_per_month', '50', 'Maximum referrals per user per month')
ON CONFLICT (setting_key) DO NOTHING;

SELECT '✅ Game settings verified/created' as status;

-- ============================================
-- SECTION 7: VERIFY REFERRAL BONUSES TABLE STRUCTURE
-- ============================================

SELECT '' as separator;
SELECT '=== REFERRAL BONUSES TABLE STRUCTURE ===' as section;

SELECT 
  column_name,
  data_type,
  column_default,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'referral_bonuses'
ORDER BY ordinal_position;

-- ============================================
-- SECTION 8: SUMMARY
-- ============================================

SELECT '' as separator;
SELECT '=== DIAGNOSIS COMPLETE ===' as section;

SELECT 
  'Run this script to see all diagnostic information' as note,
  NOW() as completed_at;
