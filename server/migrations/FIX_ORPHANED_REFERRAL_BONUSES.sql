-- ============================================
-- FIX ORPHANED REFERRAL BONUSES
-- ============================================
-- This migration fixes referral bonuses that are stuck in 'locked' state
-- because they were not linked to a deposit bonus (orphaned).
-- It credits them immediately to the user's balance.
-- ============================================

DO $$
DECLARE
  r RECORD;
  balance_before DECIMAL;
  balance_after DECIMAL;
  fixed_count INTEGER := 0;
BEGIN
  RAISE NOTICE 'Starting fix for orphaned referral bonuses...';

  FOR r IN (
    SELECT * FROM referral_bonuses 
    WHERE status = 'locked' AND linked_deposit_bonus_id IS NULL
  ) LOOP
    -- Get current balance
    SELECT balance INTO balance_before FROM users WHERE id = r.referrer_user_id;
    
    -- Handle case where user might not exist (rare but possible)
    IF balance_before IS NULL THEN
      RAISE WARNING '⚠️ User % not found for bonus %, skipping...', r.referrer_user_id, r.id;
      CONTINUE;
    END IF;

    -- Calculate new balance
    balance_after := balance_before + r.bonus_amount;
    
    -- Update user balance
    UPDATE users SET balance = balance_after WHERE id = r.referrer_user_id;
    
    -- Update referral bonus status
    UPDATE referral_bonuses 
    SET status = 'credited', 
        credited_at = NOW(),
        updated_at = NOW()
    WHERE id = r.id;
    
    -- Log transaction
    INSERT INTO bonus_transactions (
      user_id, 
      bonus_type, 
      bonus_source_id, 
      amount, 
      balance_before, 
      balance_after, 
      action, 
      description
    ) VALUES (
      r.referrer_user_id,
      'referral_bonus',
      r.id,
      r.bonus_amount,
      balance_before,
      balance_after,
      'credited',
      'Referral bonus credited immediately (orphaned fix): ₹' || r.bonus_amount
    );
    
    fixed_count := fixed_count + 1;
    RAISE NOTICE '✅ Credited orphaned referral bonus % to user % (Amount: %)', r.id, r.referrer_user_id, r.bonus_amount;
  END LOOP;
  
  RAISE NOTICE '========================================';
  RAISE NOTICE 'FIX COMPLETE';
  RAISE NOTICE 'Fixed % orphaned referral bonuses', fixed_count;
  RAISE NOTICE '========================================';
END $$;
