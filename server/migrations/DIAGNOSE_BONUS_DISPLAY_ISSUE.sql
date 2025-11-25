-- ============================================
-- DIAGNOSE BONUS DISPLAY ISSUE
-- Check database state and identify problems
-- ============================================

-- 1. Check if wagering columns exist in referral_bonuses
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'referral_bonuses'
  AND column_name IN ('wagering_required', 'wagering_completed', 'games_required', 'games_played')
ORDER BY column_name;

-- 2. Check sample referral bonuses data
SELECT 
  id,
  user_id,
  referrer_id,
  bonus_amount,
  deposit_amount,
  status,
  wagering_required,
  wagering_completed,
  created_at,
  credited_at
FROM referral_bonuses
ORDER BY created_at DESC
LIMIT 5;

-- 3. Check deposit bonuses data
SELECT 
  id,
  user_id,
  bonus_amount,
  deposit_amount,
  status,
  wagering_required,
  wagering_completed,
  created_at,
  credited_at
FROM deposit_bonuses
ORDER BY created_at DESC
LIMIT 5;

-- 4. Check game settings for bonus configuration
SELECT setting_key, setting_value, description
FROM game_settings
WHERE setting_key IN (
  'referral_wagering_multiplier',
  'default_deposit_bonus_percent',
  'wagering_multiplier'
)
ORDER BY setting_key;

-- 5. Count bonuses by status
SELECT 
  'deposit' as bonus_type,
  status,
  COUNT(*) as count,
  SUM(bonus_amount) as total_amount
FROM deposit_bonuses
GROUP BY status
UNION ALL
SELECT 
  'referral' as bonus_type,
  status,
  COUNT(*) as count,
  SUM(bonus_amount) as total_amount
FROM referral_bonuses
GROUP BY status
ORDER BY bonus_type, status;

-- 6. Check for users with locked bonuses
SELECT 
  u.id as user_id,
  u.phone,
  u.full_name,
  COUNT(DISTINCT db.id) as deposit_bonuses_count,
  COALESCE(SUM(CASE WHEN db.status = 'locked' THEN db.bonus_amount ELSE 0 END), 0) as deposit_locked,
  COUNT(DISTINCT rb.id) as referral_bonuses_count,
  COALESCE(SUM(CASE WHEN rb.status = 'locked' OR rb.status = 'pending' THEN rb.bonus_amount ELSE 0 END), 0) as referral_locked
FROM users u
LEFT JOIN deposit_bonuses db ON u.id = db.user_id
LEFT JOIN referral_bonuses rb ON u.id = rb.user_id
GROUP BY u.id, u.phone, u.full_name
HAVING COUNT(DISTINCT db.id) > 0 OR COUNT(DISTINCT rb.id) > 0
ORDER BY (deposit_locked + referral_locked) DESC
LIMIT 10;