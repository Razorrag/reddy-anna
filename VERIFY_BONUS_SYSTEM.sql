-- ============================================
-- BONUS & REFERRAL SYSTEM VERIFICATION SCRIPT
-- ============================================
-- Run this in Supabase SQL Editor to verify system status

-- 1. CHECK IF USERS HAVE REFERRAL CODES GENERATED
-- ============================================
SELECT 
  COUNT(*) as total_users,
  COUNT(referral_code_generated) as users_with_generated_code,
  COUNT(referral_code) as users_who_used_referral_code,
  COUNT(*) - COUNT(referral_code_generated) as missing_referral_codes
FROM users
WHERE role = 'player';

-- 2. SAMPLE USERS WITH REFERRAL CODES
-- ============================================
SELECT 
  id,
  phone,
  full_name,
  referral_code as used_code,
  referral_code_generated as own_code,
  created_at
FROM users
WHERE role = 'player'
ORDER BY created_at DESC
LIMIT 10;

-- 3. CHECK DEPOSIT BONUSES
-- ============================================
SELECT 
  COUNT(*) as total_deposit_bonuses,
  COUNT(CASE WHEN status = 'locked' THEN 1 END) as locked_bonuses,
  COUNT(CASE WHEN status = 'unlocked' THEN 1 END) as unlocked_bonuses,
  COUNT(CASE WHEN status = 'credited' THEN 1 END) as credited_bonuses,
  SUM(CASE WHEN status = 'locked' THEN bonus_amount ELSE 0 END) as total_locked_amount,
  SUM(CASE WHEN status = 'unlocked' THEN bonus_amount ELSE 0 END) as total_unlocked_amount,
  SUM(CASE WHEN status = 'credited' THEN bonus_amount ELSE 0 END) as total_credited_amount
FROM deposit_bonuses;

-- 4. CHECK REFERRAL BONUSES
-- ============================================
SELECT 
  COUNT(*) as total_referral_bonuses,
  COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_bonuses,
  COUNT(CASE WHEN status = 'credited' THEN 1 END) as credited_bonuses,
  SUM(CASE WHEN status = 'pending' THEN bonus_amount ELSE 0 END) as total_pending_amount,
  SUM(CASE WHEN status = 'credited' THEN bonus_amount ELSE 0 END) as total_credited_amount
FROM referral_bonuses;

-- 5. CHECK USER_REFERRALS TABLE
-- ============================================
SELECT 
  COUNT(*) as total_referral_relationships,
  COUNT(CASE WHEN bonus_applied = true THEN 1 END) as bonuses_applied,
  COUNT(CASE WHEN bonus_applied = false THEN 1 END) as bonuses_pending,
  SUM(bonus_amount) as total_bonus_amount
FROM user_referrals;

-- 6. CHECK BONUS TRANSACTIONS
-- ============================================
SELECT 
  COUNT(*) as total_transactions,
  COUNT(CASE WHEN action = 'added' THEN 1 END) as added,
  COUNT(CASE WHEN action = 'locked' THEN 1 END) as locked,
  COUNT(CASE WHEN action = 'unlocked' THEN 1 END) as unlocked,
  COUNT(CASE WHEN action = 'credited' THEN 1 END) as credited,
  COUNT(CASE WHEN action = 'expired' THEN 1 END) as expired,
  SUM(amount) as total_amount
FROM bonus_transactions;

-- 7. SAMPLE DEPOSIT BONUSES WITH USER INFO
-- ============================================
SELECT 
  db.id,
  u.phone,
  u.full_name,
  db.deposit_amount,
  db.bonus_amount,
  db.bonus_percentage,
  db.wagering_required,
  db.wagering_completed,
  db.status,
  db.created_at
FROM deposit_bonuses db
JOIN users u ON db.user_id = u.id
ORDER BY db.created_at DESC
LIMIT 10;

-- 8. SAMPLE REFERRAL BONUSES WITH USER INFO
-- ============================================
SELECT 
  rb.id,
  referrer.phone as referrer_phone,
  referrer.full_name as referrer_name,
  referred.phone as referred_phone,
  referred.full_name as referred_name,
  rb.deposit_amount,
  rb.bonus_amount,
  rb.status,
  rb.created_at
FROM referral_bonuses rb
JOIN users referrer ON rb.referrer_user_id = referrer.id
JOIN users referred ON rb.referred_user_id = referred.id
ORDER BY rb.created_at DESC
LIMIT 10;

-- 9. CHECK REFERRAL RELATIONSHIPS
-- ============================================
SELECT 
  referrer.phone as referrer_phone,
  referrer.full_name as referrer_name,
  referrer.referral_code_generated as referrer_code,
  COUNT(referred.id) as total_referrals,
  SUM(CASE WHEN ur.bonus_applied THEN ur.bonus_amount ELSE 0 END) as total_bonus_earned
FROM users referrer
LEFT JOIN users referred ON referred.referral_code = referrer.referral_code_generated
LEFT JOIN user_referrals ur ON ur.referrer_user_id = referrer.id AND ur.referred_user_id = referred.id
WHERE referrer.role = 'player'
GROUP BY referrer.id, referrer.phone, referrer.full_name, referrer.referral_code_generated
HAVING COUNT(referred.id) > 0
ORDER BY total_referrals DESC
LIMIT 10;

-- 10. CHECK IF GENERATE_REFERRAL_CODE FUNCTION EXISTS
-- ============================================
SELECT 
  routine_name,
  routine_type,
  routine_definition
FROM information_schema.routines
WHERE routine_name = 'generate_referral_code';

-- 11. TEST GENERATE_REFERRAL_CODE FUNCTION (if exists)
-- ============================================
-- Uncomment and replace 'test_user_id' with actual user ID to test
-- SELECT generate_referral_code('test_user_id');

-- 12. CHECK BONUS SETTINGS
-- ============================================
SELECT * FROM bonus_settings ORDER BY updated_at DESC LIMIT 1;

-- 13. USERS WITH AVAILABLE BONUSES (Should show in UI)
-- ============================================
SELECT 
  u.id,
  u.phone,
  u.full_name,
  u.balance,
  u.deposit_bonus_available,
  u.referral_bonus_available,
  u.total_bonus_earned,
  (
    SELECT COUNT(*) 
    FROM deposit_bonuses db 
    WHERE db.user_id = u.id AND db.status = 'unlocked'
  ) as unlocked_deposit_bonuses,
  (
    SELECT COUNT(*) 
    FROM referral_bonuses rb 
    WHERE rb.referrer_user_id = u.id AND rb.status = 'pending'
  ) as pending_referral_bonuses
FROM users u
WHERE u.role = 'player'
  AND (
    CAST(u.deposit_bonus_available AS DECIMAL) > 0 
    OR CAST(u.referral_bonus_available AS DECIMAL) > 0
  )
ORDER BY u.created_at DESC
LIMIT 10;

-- 14. SUMMARY REPORT
-- ============================================
SELECT 
  'Total Players' as metric,
  COUNT(*) as value
FROM users WHERE role = 'player'
UNION ALL
SELECT 
  'Players with Referral Codes',
  COUNT(referral_code_generated)
FROM users WHERE role = 'player'
UNION ALL
SELECT 
  'Total Deposit Bonuses',
  COUNT(*)
FROM deposit_bonuses
UNION ALL
SELECT 
  'Total Referral Bonuses',
  COUNT(*)
FROM referral_bonuses
UNION ALL
SELECT 
  'Total Referral Relationships',
  COUNT(*)
FROM user_referrals
UNION ALL
SELECT 
  'Total Bonus Transactions',
  COUNT(*)
FROM bonus_transactions;

-- ============================================
-- EXPECTED RESULTS:
-- ============================================
-- 1. All players should have referral_code_generated
-- 2. Deposit bonuses should exist if deposits were made
-- 3. Referral bonuses should exist if referred users deposited
-- 4. Bonus transactions should log all state changes
-- 5. generate_referral_code function should exist
-- 6. Bonus settings should have default values
-- ============================================
