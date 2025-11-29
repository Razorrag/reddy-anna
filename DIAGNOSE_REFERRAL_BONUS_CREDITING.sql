-- ============================================
-- DIAGNOSTIC QUERY FOR REFERRAL BONUS CREDITING ISSUE
-- Run this in Supabase SQL Editor to diagnose the problem
-- ============================================

-- Step 1: Check if linked_deposit_bonus_id column exists
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'referral_bonuses'
  AND column_name = 'linked_deposit_bonus_id';

-- Step 2: Check all referral bonuses and their linked deposit bonuses
SELECT 
    rb.id as referral_bonus_id,
    rb.referrer_user_id,
    rb.referred_user_id,
    rb.bonus_amount as referral_bonus_amount,
    rb.status as referral_status,
    rb.linked_deposit_bonus_id,
    rb.created_at as referral_created_at,
    rb.credited_at as referral_credited_at,
    
    -- Linked deposit bonus details
    db.id as deposit_bonus_id,
    db.user_id as deposit_bonus_user_id,
    db.bonus_amount as deposit_bonus_amount,
    db.status as deposit_status,
    db.wagering_required,
    db.wagering_completed,
    db.created_at as deposit_created_at,
    db.credited_at as deposit_credited_at,
    
    -- User details
    u_referrer.phone as referrer_phone,
    u_referrer.full_name as referrer_name,
    u_referred.phone as referred_phone,
    u_referred.full_name as referred_name
    
FROM referral_bonuses rb
LEFT JOIN deposit_bonuses db ON rb.linked_deposit_bonus_id = db.id
LEFT JOIN users u_referrer ON rb.referrer_user_id = u_referrer.id
LEFT JOIN users u_referred ON rb.referred_user_id = u_referred.id
ORDER BY rb.created_at DESC
LIMIT 20;

-- Step 3: Find referral bonuses that should have been credited but weren't
-- (where the linked deposit bonus is credited but referral bonus is still locked)
SELECT 
    rb.id as stuck_referral_bonus_id,
    rb.referrer_user_id,
    rb.bonus_amount as stuck_amount,
    rb.status as referral_status,
    rb.linked_deposit_bonus_id,
    rb.created_at,
    
    -- The deposit bonus it's linked to
    db.id as linked_deposit_id,
    db.status as deposit_status,
    db.credited_at as deposit_credited_at,
    db.bonus_amount as deposit_amount,
    
    -- User info
    u.phone as referrer_phone,
    u.full_name as referrer_name
    
FROM referral_bonuses rb
INNER JOIN deposit_bonuses db ON rb.linked_deposit_bonus_id = db.id
INNER JOIN users u ON rb.referrer_user_id = u.id
WHERE rb.status = 'locked'  -- Referral bonus is still locked
  AND db.status = 'credited'  -- But linked deposit bonus is already credited
ORDER BY rb.created_at DESC;

-- Step 4: Check if there are any referral bonuses with NULL linked_deposit_bonus_id
SELECT 
    rb.id,
    rb.referrer_user_id,
    rb.referred_user_id,
    rb.bonus_amount,
    rb.status,
    rb.linked_deposit_bonus_id,
    rb.created_at,
    u_referrer.phone as referrer_phone,
    u_referrer.full_name as referrer_name
FROM referral_bonuses rb
LEFT JOIN users u_referrer ON rb.referrer_user_id = u_referrer.id
WHERE rb.linked_deposit_bonus_id IS NULL
  AND rb.status != 'credited'
ORDER BY rb.created_at DESC;

-- Step 5: Show recent deposit bonus crediting events
SELECT 
    db.id as deposit_bonus_id,
    db.user_id,
    db.bonus_amount,
    db.status,
    db.wagering_required,
    db.wagering_completed,
    db.credited_at,
    u.phone,
    u.full_name,
    
    -- Count linked referral bonuses
    COUNT(rb.id) as linked_referral_bonuses_count,
    SUM(CASE WHEN rb.status = 'locked' THEN 1 ELSE 0 END) as locked_referral_count,
    SUM(CASE WHEN rb.status = 'credited' THEN 1 ELSE 0 END) as credited_referral_count
    
FROM deposit_bonuses db
INNER JOIN users u ON db.user_id = u.id
LEFT JOIN referral_bonuses rb ON rb.linked_deposit_bonus_id = db.id
WHERE db.status = 'credited'
  AND db.credited_at IS NOT NULL
GROUP BY db.id, db.user_id, db.bonus_amount, db.status, db.wagering_required, 
         db.wagering_completed, db.credited_at, u.phone, u.full_name
ORDER BY db.credited_at DESC
LIMIT 20;

-- ============================================
-- INTERPRETATION GUIDE:
-- ============================================
-- 
-- Query 1: Verify the column exists (should return 1 row)
-- 
-- Query 2: Shows all referral bonuses and what they're linked to
--   - Check if linked_deposit_bonus_id is populated
--   - Check if it points to the REFERRER's deposit bonus (deposit_bonus_user_id should equal referrer_user_id)
-- 
-- Query 3: **MOST IMPORTANT** - Shows "stuck" referral bonuses
--   - These are referral bonuses that should have been credited but weren't
--   - If this returns rows, that's your problem!
-- 
-- Query 4: Shows referral bonuses with no link (orphaned bonuses)
--   - These will never credit because they're not linked to anything
-- 
-- Query 5: Shows recent deposit bonus crediting and how many referral bonuses were linked
--   - If locked_referral_count > 0, those bonuses didn't get credited
-- 
-- ============================================