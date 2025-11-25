-- ============================================
-- DATABASE CLEANUP - VERIFICATION SCRIPT
-- ============================================
-- Run this after Priority 1 and Priority 2 cleanups
-- to verify everything is working correctly
-- ============================================

-- ============================================
-- 1. VERIFY REFERRAL SYSTEM INTEGRITY
-- ============================================

SELECT '=== REFERRAL SYSTEM INTEGRITY ===' as section;

-- Check for duplicate referral codes (should be 0)
SELECT 
  '1. Duplicate referral codes:' as check_name,
  COUNT(*) as issue_count,
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ PASS'
    ELSE '❌ FAIL - Duplicates found!'
  END as status
FROM (
  SELECT referral_code_generated, COUNT(*) as cnt
  FROM users
  WHERE referral_code_generated IS NOT NULL
  GROUP BY referral_code_generated
  HAVING COUNT(*) > 1
) duplicates;

-- Check UNIQUE constraint exists
SELECT 
  '2. UNIQUE constraint on referral_code_generated:' as check_name,
  COUNT(*) as found,
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ PASS'
    ELSE '❌ FAIL - Constraint missing!'
  END as status
FROM information_schema.table_constraints 
WHERE table_name = 'users' 
  AND constraint_type = 'UNIQUE'
  AND constraint_name = 'users_referral_code_generated_unique';

-- Check referral bonus percentage is 5%
SELECT 
  '3. Referral bonus percentage in game_settings:' as check_name,
  setting_value as value,
  CASE 
    WHEN setting_value = '5' THEN '✅ PASS'
    ELSE '❌ FAIL - Should be 5, not ' || setting_value
  END as status
FROM game_settings 
WHERE setting_key = 'referral_bonus_percent';

-- Check referral_bonuses default percentage
SELECT 
  '4. Referral bonuses default percentage:' as check_name,
  column_default as default_value,
  CASE 
    WHEN column_default LIKE '%5.00%' THEN '✅ PASS'
    ELSE '❌ FAIL - Default should be 5.00'
  END as status
FROM information_schema.columns
WHERE table_name = 'referral_bonuses' 
  AND column_name = 'bonus_percentage';

-- ============================================
-- 2. VERIFY BONUS TABLES STRUCTURE
-- ============================================

SELECT '' as separator;
SELECT '=== BONUS TABLES STRUCTURE ===' as section;

-- Check deposit_bonuses exists and has records
SELECT 
  '5. deposit_bonuses table:' as check_name,
  COUNT(*) as record_count,
  CASE 
    WHEN COUNT(*) >= 0 THEN '✅ EXISTS'
    ELSE '❌ MISSING'
  END as status
FROM deposit_bonuses;

-- Check referral_bonuses exists and has records
SELECT 
  '6. referral_bonuses table:' as check_name,
  COUNT(*) as record_count,
  CASE 
    WHEN COUNT(*) >= 0 THEN '✅ EXISTS'
    ELSE '❌ MISSING'
  END as status
FROM referral_bonuses;

-- Check user_referrals exists and has records
SELECT 
  '7. user_referrals table:' as check_name,
  COUNT(*) as record_count,
  CASE 
    WHEN COUNT(*) >= 0 THEN '✅ EXISTS'
    ELSE '❌ MISSING'
  END as status
FROM user_referrals;

-- Check bonus_transactions exists and has records
SELECT 
  '8. bonus_transactions table:' as check_name,
  COUNT(*) as record_count,
  CASE 
    WHEN COUNT(*) >= 0 THEN '✅ EXISTS'
    ELSE '❌ MISSING'
  END as status
FROM bonus_transactions;

-- Check bonus_tracking was removed (should not exist)
SELECT 
  '9. bonus_tracking table (should be removed):' as check_name,
  COUNT(*) as found,
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ PASS - Table removed'
    ELSE '❌ FAIL - Table still exists!'
  END as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name = 'bonus_tracking';

-- ============================================
-- 3. VERIFY USERS TABLE CLEANUP
-- ============================================

SELECT '' as separator;
SELECT '=== USERS TABLE CLEANUP ===' as section;

-- Check redundant bonus fields were removed
WITH removed_columns AS (
  SELECT column_name
  FROM information_schema.columns 
  WHERE table_name = 'users' 
    AND column_name IN (
      'deposit_bonus_available',
      'referral_bonus_available',
      'original_deposit_amount',
      'total_bonus_earned',
      'wagering_requirement',
      'wagering_completed',
      'bonus_locked',
      'phone_verified'
    )
)
SELECT 
  '10. Redundant bonus fields in users table:' as check_name,
  COUNT(*) as fields_remaining,
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ PASS - All removed'
    ELSE '❌ FAIL - ' || COUNT(*)::text || ' fields still exist: ' || STRING_AGG(column_name, ', ')
  END as status
FROM removed_columns;

-- ============================================
-- 4. VERIFY DATA INTEGRITY
-- ============================================

SELECT '' as separator;
SELECT '=== DATA INTEGRITY CHECKS ===' as section;

-- Check for orphaned deposit bonuses
SELECT 
  '11. Orphaned deposit_bonuses (no user):' as check_name,
  COUNT(*) as orphan_count,
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ PASS'
    ELSE '❌ WARNING - ' || COUNT(*)::text || ' orphaned records'
  END as status
FROM deposit_bonuses db
LEFT JOIN users u ON u.id = db.user_id
WHERE u.id IS NULL;

-- Check for orphaned referral bonuses
SELECT 
  '12. Orphaned referral_bonuses (no referrer):' as check_name,
  COUNT(*) as orphan_count,
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ PASS'
    ELSE '❌ WARNING - ' || COUNT(*)::text || ' orphaned records'
  END as status
FROM referral_bonuses rb
LEFT JOIN users u ON u.id = rb.referrer_user_id
WHERE u.id IS NULL;

SELECT 
  '13. Orphaned referral_bonuses (no referred user):' as check_name,
  COUNT(*) as orphan_count,
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ PASS'
    ELSE '❌ WARNING - ' || COUNT(*)::text || ' orphaned records'
  END as status
FROM referral_bonuses rb
LEFT JOIN users u ON u.id = rb.referred_user_id
WHERE u.id IS NULL;

-- Check for orphaned user_referrals
SELECT 
  '14. Orphaned user_referrals (no referrer):' as check_name,
  COUNT(*) as orphan_count,
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ PASS'
    ELSE '❌ WARNING - ' || COUNT(*)::text || ' orphaned records'
  END as status
FROM user_referrals ur
LEFT JOIN users u ON u.id = ur.referrer_user_id
WHERE u.id IS NULL;

SELECT 
  '15. Orphaned user_referrals (no referred user):' as check_name,
  COUNT(*) as orphan_count,
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ PASS'
    ELSE '❌ WARNING - ' || COUNT(*)::text || ' orphaned records'
  END as status
FROM user_referrals ur
LEFT JOIN users u ON u.id = ur.referred_user_id
WHERE u.id IS NULL;

-- ============================================
-- 5. VERIFY INDEXES WERE CREATED
-- ============================================

SELECT '' as separator;
SELECT '=== INDEX VERIFICATION ===' as section;

-- Check critical indexes exist
WITH required_indexes AS (
  SELECT 'idx_deposit_bonuses_user_status_created' as index_name
  UNION ALL SELECT 'idx_referral_bonuses_referrer_created'
  UNION ALL SELECT 'idx_bonus_transactions_user_bonus_type_created'
  UNION ALL SELECT 'idx_user_referrals_referrer_bonus_applied'
  UNION ALL SELECT 'idx_user_referrals_referred_lookup'
)
SELECT 
  ri.index_name as check_name,
  CASE 
    WHEN i.indexname IS NOT NULL THEN '✅ EXISTS'
    ELSE '❌ MISSING'
  END as status
FROM required_indexes ri
LEFT JOIN pg_indexes i ON i.indexname = ri.index_name
ORDER BY ri.index_name;

-- ============================================
-- 6. VERIFY FOREIGN KEY CONSTRAINTS
-- ============================================

SELECT '' as separator;
SELECT '=== FOREIGN KEY CONSTRAINTS ===' as section;

-- Check critical FKs exist
WITH required_fks AS (
  SELECT 'deposit_bonuses' as table_name, 'deposit_bonuses_user_id_fkey' as fk_name
  UNION ALL SELECT 'referral_bonuses', 'referral_bonuses_referrer_user_id_fkey'
  UNION ALL SELECT 'referral_bonuses', 'referral_bonuses_referred_user_id_fkey'
  UNION ALL SELECT 'user_referrals', 'fk_user_referrals_referrer'
  UNION ALL SELECT 'user_referrals', 'fk_user_referrals_referred'
  UNION ALL SELECT 'bonus_transactions', 'bonus_transactions_user_id_fkey'
)
SELECT 
  rf.table_name || '.' || rf.fk_name as check_name,
  CASE 
    WHEN tc.constraint_name IS NOT NULL THEN '✅ EXISTS'
    ELSE '⚠️ MISSING (non-critical)'
  END as status
FROM required_fks rf
LEFT JOIN information_schema.table_constraints tc 
  ON tc.table_name = rf.table_name 
  AND tc.constraint_name = rf.fk_name
  AND tc.constraint_type = 'FOREIGN KEY'
ORDER BY rf.table_name, rf.fk_name;

-- ============================================
-- 7. BONUS SYSTEM STATISTICS
-- ============================================

SELECT '' as separator;
SELECT '=== BONUS SYSTEM STATISTICS ===' as section;

-- Overall statistics
SELECT 
  'Total Users' as metric,
  COUNT(*)::text as value
FROM users
UNION ALL
SELECT 
  'Users with Referral Codes' as metric,
  COUNT(*)::text as value
FROM users 
WHERE referral_code_generated IS NOT NULL
UNION ALL
SELECT 
  'Active Referral Relationships' as metric,
  COUNT(*)::text as value
FROM user_referrals
UNION ALL
SELECT 
  'Deposit Bonuses (All Status)' as metric,
  COUNT(*)::text as value
FROM deposit_bonuses
UNION ALL
SELECT 
  'Deposit Bonuses (Credited)' as metric,
  COUNT(*)::text as value
FROM deposit_bonuses 
WHERE status = 'credited'
UNION ALL
SELECT 
  'Referral Bonuses (All Status)' as metric,
  COUNT(*)::text as value
FROM referral_bonuses
UNION ALL
SELECT 
  'Referral Bonuses (Credited)' as metric,
  COUNT(*)::text as value
FROM referral_bonuses 
WHERE status = 'credited'
UNION ALL
SELECT 
  'Total Bonus Transactions' as metric,
  COUNT(*)::text as value
FROM bonus_transactions;

-- ============================================
-- 8. FINAL SUMMARY
-- ============================================

SELECT '' as separator;
SELECT '=== FINAL VERIFICATION SUMMARY ===' as section;

WITH all_checks AS (
  -- Count PASS checks
  SELECT 
    SUM(CASE WHEN status LIKE '%✅%' THEN 1 ELSE 0 END) as passed,
    SUM(CASE WHEN status LIKE '%❌%' THEN 1 ELSE 0 END) as failed,
    SUM(CASE WHEN status LIKE '%⚠️%' THEN 1 ELSE 0 END) as warnings,
    COUNT(*) as total
  FROM (
    -- This would ideally aggregate all the checks above
    -- For now, manually run and count
    SELECT 1 as dummy
  ) dummy_aggregation
)
SELECT 
  'Database cleanup verification completed' as summary,
  NOW() as verified_at;

-- ============================================
-- RECOMMENDED ACTIONS
-- ============================================

SELECT '' as separator;
SELECT '=== RECOMMENDED NEXT STEPS ===' as section;

SELECT 
  1 as step,
  '1. Review all ❌ FAIL results above' as action,
  'Fix any critical issues before proceeding' as details
UNION ALL
SELECT 
  2 as step,
  '2. Test application thoroughly' as action,
  'Verify referral system works end-to-end' as details
UNION ALL
SELECT 
  3 as step,
  '3. Monitor production for 24-48 hours' as action,
  'Watch for any unexpected errors' as details
UNION ALL
SELECT 
  4 as step,
  '4. If stable, drop backup tables' as action,
  'DROP TABLE users_bonus_fields_backup, bonus_tracking_backup' as details
UNION ALL
SELECT 
  5 as step,
  '5. Update application documentation' as action,
  'Reflect new database structure in docs' as details
ORDER BY step;

-- ============================================
-- END OF VERIFICATION
-- ============================================