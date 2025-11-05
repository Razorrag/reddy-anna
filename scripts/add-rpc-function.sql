-- ============================================
-- CRITICAL FIX: Add missing RPC function and enum values
-- Run this in Supabase SQL Editor
-- ============================================

-- Step 1: Add missing enum values if not already present
DO $$ 
BEGIN
    -- Check and add 'won' to transaction_status enum
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'won' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'transaction_status')
    ) THEN
        ALTER TYPE transaction_status ADD VALUE 'won';
        RAISE NOTICE 'Added "won" to transaction_status enum';
    ELSE
        RAISE NOTICE '"won" already exists in transaction_status enum';
    END IF;

    -- Check and add 'lost' to transaction_status enum
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'lost' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'transaction_status')
    ) THEN
        ALTER TYPE transaction_status ADD VALUE 'lost';
        RAISE NOTICE 'Added "lost" to transaction_status enum';
    ELSE
        RAISE NOTICE '"lost" already exists in transaction_status enum';
    END IF;
END $$;

-- Step 2: Create the critical RPC function for payouts
CREATE OR REPLACE FUNCTION apply_payouts_and_update_bets(
  payouts JSONB,
  winning_bets_ids TEXT[],
  losing_bets_ids TEXT[]
)
RETURNS void AS $$
DECLARE
  payout_record JSONB;
  user_id_val VARCHAR(20);
  amount_val DECIMAL(15, 2);
  bet_id TEXT;
  bet_payout DECIMAL(15, 2);
BEGIN
  -- Process each payout
  FOR payout_record IN SELECT * FROM jsonb_array_elements(payouts)
  LOOP
    user_id_val := payout_record->>'userId';
    amount_val := (payout_record->>'amount')::DECIMAL(15, 2);
    
    -- Add balance to user (if amount > 0)
    IF amount_val > 0 THEN
      UPDATE users 
      SET balance = balance + amount_val,
          updated_at = NOW()
      WHERE id = user_id_val;
      
      -- Create transaction record
      INSERT INTO user_transactions (
        user_id,
        transaction_type,
        amount,
        balance_before,
        balance_after,
        status,
        description,
        created_at
      )
      SELECT 
        user_id_val,
        'win',
        amount_val,
        balance - amount_val,
        balance,
        'completed',
        'Game winnings',
        NOW()
      FROM users WHERE id = user_id_val;
      
      RAISE NOTICE 'Added payout of % for user %', amount_val, user_id_val;
    END IF;
  END LOOP;
  
  -- Update winning bets status and set actual_payout
  IF array_length(winning_bets_ids, 1) > 0 THEN
    -- Update each winning bet with its payout amount
    FOREACH bet_id IN ARRAY winning_bets_ids
    LOOP
      -- Find the payout amount for this bet's user
      SELECT (payout_record->>'amount')::DECIMAL(15, 2)
      INTO bet_payout
      FROM jsonb_array_elements(payouts) AS payout_record
      WHERE payout_record->>'userId' = (
        SELECT user_id FROM player_bets WHERE id = bet_id
      )
      LIMIT 1;
      
      -- Update the bet
      UPDATE player_bets
      SET status = 'won',
          actual_payout = COALESCE(bet_payout, 0),
          updated_at = NOW()
      WHERE id = bet_id;
    END LOOP;
    
    RAISE NOTICE 'Updated % winning bets', array_length(winning_bets_ids, 1);
  END IF;
  
  -- Update losing bets status
  IF array_length(losing_bets_ids, 1) > 0 THEN
    UPDATE player_bets
    SET status = 'lost',
        actual_payout = 0,
        updated_at = NOW()
    WHERE id = ANY(losing_bets_ids);
    
    RAISE NOTICE 'Updated % losing bets', array_length(losing_bets_ids, 1);
  END IF;
  
  RAISE NOTICE 'Payout processing complete';
END;
$$ LANGUAGE plpgsql;

-- Step 3: Verify the function was created
SELECT 
    routine_name,
    routine_type,
    data_type
FROM information_schema.routines
WHERE routine_name = 'apply_payouts_and_update_bets';

-- Step 4: Test enum values
SELECT unnest(enum_range(NULL::transaction_status)) as status_value;

-- If you see the function and both 'won' and 'lost' in the output above, SUCCESS! ✅
