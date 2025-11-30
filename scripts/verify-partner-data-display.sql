-- =====================================================
-- VERIFY PARTNER DATA DISPLAYS CORRECTLY
-- Run this to confirm all data shows in admin panel
-- =====================================================

-- ==================================================
-- 1. CHECK PARTNERS WITH WALLET DATA
-- ==================================================
SELECT 
  '1. Partners Overview' as check_name,
  id,
  full_name,
  phone,
  status,
  share_percentage,
  wallet_balance,
  total_earned,
  total_withdrawn
FROM partners
WHERE status = 'active'
ORDER BY created_at
LIMIT 5;

-- ==================================================
-- 2. CHECK EARNINGS DATA (What Admin Will See)
-- ==================================================
SELECT 
  '2. Earnings History' as check_name,
  pge.id,
  pge.partner_id,
  p.full_name as partner_name,
  pge.game_id,
  pge.real_profit as game_profit,  -- This is what admin sees as "Game Profit"
  pge.shown_profit,                 -- This is modified for partner
  pge.earned_amount,                -- This is what partner earned
  pge.commission_rate,
  pge.credited,
  pge.created_at
FROM partner_game_earnings pge
JOIN partners p ON p.id = pge.partner_id
WHERE pge.credited = true
ORDER BY pge.created_at DESC
LIMIT 10;

-- ==================================================
-- 3. CHECK WALLET TRANSACTIONS (Transaction History Tab)
-- ==================================================
SELECT 
  '3. Wallet Transactions' as check_name,
  pwt.id,
  pwt.partner_id,
  p.full_name as partner_name,
  pwt.transaction_type,
  pwt.amount,
  pwt.balance_before,
  pwt.balance_after,
  pwt.reference_id,
  pwt.description,
  pwt.created_at
FROM partner_wallet_transactions pwt
JOIN partners p ON p.id = pwt.partner_id
ORDER BY pwt.created_at DESC
LIMIT 10;

-- ==================================================
-- 4. CHECK WITHDRAWAL REQUESTS (Withdrawals Tab)
-- ==================================================
SELECT 
  '4. Withdrawal Requests' as check_name,
  pwr.id,
  pwr.partner_id,
  p.full_name as partner_name,
  pwr.amount,
  pwr.status,
  pwr.utr_number,
  pwr.rejection_reason,
  pwr.partner_phone,
  pwr.partner_whatsapp,
  pwr.created_at,
  pwr.processed_at
FROM partner_withdrawal_requests pwr
JOIN partners p ON p.id = pwr.partner_id
ORDER BY pwr.created_at DESC
LIMIT 10;

-- ==================================================
-- 5. CHECK STATS DATA (Dashboard Cards)
-- ==================================================
SELECT 
  '5. Partner Stats' as check_name,
  p.id as partner_id,
  p.full_name,
  COUNT(DISTINCT pge.id) as total_games,
  COALESCE(SUM(pge.earned_amount), 0) as total_earnings,
  p.wallet_balance as current_balance,
  p.total_withdrawn,
  (SELECT COALESCE(SUM(amount), 0) FROM partner_withdrawal_requests WHERE partner_id = p.id AND status = 'pending') as pending_withdrawals,
  (SELECT COALESCE(SUM(pge2.earned_amount), 0) 
   FROM partner_game_earnings pge2 
   WHERE pge2.partner_id = p.id 
   AND pge2.credited = true 
   AND pge2.created_at >= date_trunc('month', NOW())) as earnings_this_month,
  (SELECT COALESCE(SUM(pge3.earned_amount), 0) 
   FROM partner_game_earnings pge3 
   WHERE pge3.partner_id = p.id 
   AND pge3.credited = true 
   AND pge3.created_at >= date_trunc('day', NOW())) as earnings_today,
  COALESCE(AVG(pge.earned_amount), 0) as avg_per_game
FROM partners p
LEFT JOIN partner_game_earnings pge ON pge.partner_id = p.id AND pge.credited = true
WHERE p.status = 'active'
GROUP BY p.id, p.full_name, p.wallet_balance, p.total_withdrawn
ORDER BY p.created_at
LIMIT 5;

-- ==================================================
-- 6. DATA COMPLETENESS CHECK
-- ==================================================
SELECT 
  '6. Data Completeness' as info,
  (SELECT COUNT(*) FROM partners WHERE status = 'active') as active_partners,
  (SELECT COUNT(*) FROM partner_game_earnings WHERE credited = true) as total_earnings_records,
  (SELECT COUNT(*) FROM partner_wallet_transactions) as total_transactions,
  (SELECT COUNT(*) FROM partner_withdrawal_requests) as total_withdrawal_requests,
  (SELECT COUNT(*) FROM partner_withdrawal_requests WHERE status = 'pending') as pending_withdrawals,
  (SELECT COUNT(*) FROM partner_withdrawal_requests WHERE status = 'completed') as completed_withdrawals;

-- ==================================================
-- 7. SAMPLE DATA FOR EACH PARTNER
-- ==================================================
SELECT 
  '7. Per-Partner Summary' as info,
  p.id,
  p.full_name,
  p.phone,
  p.wallet_balance,
  COUNT(DISTINCT pge.id) as earnings_count,
  COUNT(DISTINCT pwt.id) as transaction_count,
  COUNT(DISTINCT pwr.id) as withdrawal_count
FROM partners p
LEFT JOIN partner_game_earnings pge ON pge.partner_id = p.id
LEFT JOIN partner_wallet_transactions pwt ON pwt.partner_id = p.id
LEFT JOIN partner_withdrawal_requests pwr ON pwr.partner_id = p.id
WHERE p.status = 'active'
GROUP BY p.id, p.full_name, p.phone, p.wallet_balance
ORDER BY p.created_at;

-- ==================================================
-- 8. VERIFY API ENDPOINT DATA MATCHES
-- ==================================================

-- Check what /api/admin/partners/:id/wallet will return
SELECT 
  '8a. Wallet Endpoint Data' as info,
  p.wallet_balance,
  p.total_earned,
  p.total_withdrawn,
  p.min_withdrawal_amount,
  p.commission_rate,
  p.share_percentage,
  (SELECT COALESCE(SUM(amount), 0) FROM partner_withdrawal_requests WHERE partner_id = p.id AND status = 'pending') as pending_withdrawals
FROM partners p
WHERE p.status = 'active'
LIMIT 1;

-- Check what /api/admin/partners/:id/earnings will return
SELECT 
  '8b. Earnings Endpoint Data' as info,
  id,
  partner_id,
  game_id,
  real_profit,  -- Backend maps this to game_profit
  shown_profit,
  earned_amount, -- Backend maps this to earning_amount
  commission_rate,
  credited,
  created_at
FROM partner_game_earnings
WHERE credited = true
ORDER BY created_at DESC
LIMIT 5;

-- Check what /api/admin/partners/:id/transactions will return
SELECT 
  '8c. Transactions Endpoint Data' as info,
  id,
  partner_id,
  transaction_type,
  amount,
  balance_before,
  balance_after,
  description,
  reference_id,
  created_at
FROM partner_wallet_transactions
ORDER BY created_at DESC
LIMIT 5;

-- ==================================================
-- 9. FRONTEND DISPLAY VERIFICATION
-- ==================================================
SELECT 
  '9. What Admin Will See in UI' as info,
  'Partner List: Wallet Balance, Total Earned, Total Withdrawn' as location,
  COUNT(*) as partners_to_show
FROM partners
WHERE status = 'active';

SELECT 
  '9. What Admin Will See in UI' as info,
  'Detail Page - Earnings Tab' as location,
  COUNT(*) as records_to_show
FROM partner_game_earnings
WHERE credited = true;

SELECT 
  '9. What Admin Will See in UI' as info,
  'Detail Page - Withdrawals Tab' as location,
  COUNT(*) as records_to_show
FROM partner_withdrawal_requests;

SELECT 
  '9. What Admin Will See in UI' as info,
  'Detail Page - Transactions Tab' as location,
  COUNT(*) as records_to_show
FROM partner_wallet_transactions;

-- ==================================================
-- 10. FINAL VALIDATION
-- ==================================================
DO $$
DECLARE
  v_active_partners INTEGER;
  v_earnings_count INTEGER;
  v_transactions_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_active_partners FROM partners WHERE status = 'active';
  SELECT COUNT(*) INTO v_earnings_count FROM partner_game_earnings WHERE credited = true;
  SELECT COUNT(*) INTO v_transactions_count FROM partner_wallet_transactions;
  
  RAISE NOTICE '=====================================================';
  RAISE NOTICE '  PARTNER FINANCIAL DATA VERIFICATION';
  RAISE NOTICE '=====================================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Active Partners: %', v_active_partners;
  RAISE NOTICE 'Credited Earnings: %', v_earnings_count;
  RAISE NOTICE 'Wallet Transactions: %', v_transactions_count;
  RAISE NOTICE '';
  
  IF v_active_partners > 0 AND v_earnings_count > 0 AND v_transactions_count > 0 THEN
    RAISE NOTICE '✅ DATA EXISTS - Admin will see financial information';
  ELSE
    RAISE NOTICE '⚠️  LIMITED DATA - Some sections may be empty';
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE 'Admin Panel URLs to test:';
  RAISE NOTICE '  1. Partner List: /admin/partners';
  RAISE NOTICE '  2. Partner Detail: /admin/partner/[partner-id]';
  RAISE NOTICE '';
  RAISE NOTICE 'Expected Behavior:';
  RAISE NOTICE '  ✓ Partner list shows wallet balance, earned, withdrawn';
  RAISE NOTICE '  ✓ Detail page has 3 tabs: Earnings, Withdrawals, Transactions';
  RAISE NOTICE '  ✓ Earnings tab shows game profit and earning amounts';
  RAISE NOTICE '  ✓ Withdrawals tab shows pending/completed requests';
  RAISE NOTICE '  ✓ Transactions tab shows complete audit trail';
  RAISE NOTICE '';
  RAISE NOTICE '=====================================================';
END $$;