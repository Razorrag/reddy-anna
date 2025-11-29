-- =====================================================
-- PARTNER WALLET & EARNINGS SYSTEM - COMPLETE SETUP
-- Execute this in Supabase SQL Editor
-- =====================================================
-- This creates a complete automated earnings system where:
-- 1. Partners earn 10% commission on their share of game profits
-- 2. Earnings are automatically credited after each game
-- 3. Partners can request withdrawals (like players)
-- 4. Admin can approve/reject withdrawal requests
-- =====================================================

-- ==================================================
-- STEP 1: ADD WALLET COLUMNS TO PARTNERS TABLE
-- ==================================================

ALTER TABLE partners ADD COLUMN IF NOT EXISTS 
  wallet_balance NUMERIC(15,2) DEFAULT 0.00 CHECK (wallet_balance >= 0);

ALTER TABLE partners ADD COLUMN IF NOT EXISTS 
  total_earned NUMERIC(15,2) DEFAULT 0.00;

ALTER TABLE partners ADD COLUMN IF NOT EXISTS 
  total_withdrawn NUMERIC(15,2) DEFAULT 0.00;

ALTER TABLE partners ADD COLUMN IF NOT EXISTS 
  commission_rate NUMERIC(5,2) DEFAULT 10.00 CHECK (commission_rate >= 0 AND commission_rate <= 100);

ALTER TABLE partners ADD COLUMN IF NOT EXISTS 
  min_withdrawal_amount NUMERIC(15,2) DEFAULT 5000.00;

COMMENT ON COLUMN partners.wallet_balance IS 'Current available balance for withdrawal';
COMMENT ON COLUMN partners.total_earned IS 'Total lifetime earnings from commissions';
COMMENT ON COLUMN partners.total_withdrawn IS 'Total amount withdrawn';
COMMENT ON COLUMN partners.commission_rate IS 'Percentage of shown profit credited to partner (default 10%)';
COMMENT ON COLUMN partners.min_withdrawal_amount IS 'Minimum amount for withdrawal requests';

-- ==================================================
-- STEP 2: CREATE PARTNER_WALLET_TRANSACTIONS TABLE
-- ==================================================

CREATE TABLE IF NOT EXISTS partner_wallet_transactions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  partner_id TEXT NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('earning', 'withdrawal', 'adjustment')),
  amount NUMERIC(15,2) NOT NULL,
  balance_before NUMERIC(15,2) NOT NULL,
  balance_after NUMERIC(15,2) NOT NULL,
  
  -- Earning-specific fields
  game_id TEXT,
  shown_profit NUMERIC(15,2),
  commission_rate NUMERIC(5,2),
  
  -- Withdrawal-specific fields
  withdrawal_request_id TEXT,
  
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_partner_wallet_trans_partner_date 
  ON partner_wallet_transactions(partner_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_partner_wallet_trans_type 
  ON partner_wallet_transactions(transaction_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_partner_wallet_trans_game 
  ON partner_wallet_transactions(game_id) WHERE game_id IS NOT NULL;

-- Enable RLS
ALTER TABLE partner_wallet_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Partners can only see their own transactions
DROP POLICY IF EXISTS partner_wallet_transactions_select_policy ON partner_wallet_transactions;
CREATE POLICY partner_wallet_transactions_select_policy ON partner_wallet_transactions
  FOR SELECT USING (
    partner_id = current_setting('app.current_partner_id', true)::text
    OR current_setting('app.is_admin', true)::boolean = true
  );

COMMENT ON TABLE partner_wallet_transactions IS 'All wallet transactions including earnings and withdrawals';

-- ==================================================
-- STEP 3: CREATE PARTNER_WITHDRAWAL_REQUESTS TABLE
-- ==================================================

CREATE TABLE IF NOT EXISTS partner_withdrawal_requests (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  partner_id TEXT NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  amount NUMERIC(15,2) NOT NULL CHECK (amount > 0),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'completed')),
  
  -- Partner details snapshot
  partner_phone TEXT,
  partner_whatsapp TEXT,
  partner_name TEXT,
  
  -- Admin processing
  processed_by TEXT,
  processed_at TIMESTAMPTZ,
  rejection_reason TEXT,
  admin_notes TEXT,
  
  -- Payment details
  payment_method TEXT,
  payment_reference TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_partner_withdrawal_status_date 
  ON partner_withdrawal_requests(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_partner_withdrawal_partner 
  ON partner_withdrawal_requests(partner_id, created_at DESC);

-- Enable RLS
ALTER TABLE partner_withdrawal_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Partners can only see their own requests
DROP POLICY IF EXISTS partner_withdrawal_requests_select_policy ON partner_withdrawal_requests;
CREATE POLICY partner_withdrawal_requests_select_policy ON partner_withdrawal_requests
  FOR SELECT USING (
    partner_id = current_setting('app.current_partner_id', true)::text
    OR current_setting('app.is_admin', true)::boolean = true
  );

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_partner_withdrawal_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_partner_withdrawal_updated_at ON partner_withdrawal_requests;
CREATE TRIGGER trigger_partner_withdrawal_updated_at
  BEFORE UPDATE ON partner_withdrawal_requests
  FOR EACH ROW EXECUTE FUNCTION update_partner_withdrawal_updated_at();

COMMENT ON TABLE partner_withdrawal_requests IS 'Partner withdrawal requests with admin approval workflow';

-- ==================================================
-- STEP 4: CREATE PARTNER_GAME_EARNINGS TABLE
-- ==================================================

CREATE TABLE IF NOT EXISTS partner_game_earnings (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  partner_id TEXT NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  game_id TEXT NOT NULL,
  
  -- Calculation details
  real_profit NUMERIC(15,2) NOT NULL,
  shown_profit NUMERIC(15,2) NOT NULL,
  share_percentage NUMERIC(5,2) NOT NULL,
  commission_rate NUMERIC(5,2) NOT NULL,
  earned_amount NUMERIC(15,2) NOT NULL,
  
  -- Status
  credited BOOLEAN DEFAULT false,
  credited_at TIMESTAMPTZ,
  transaction_id TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_partner_earnings_partner_date 
  ON partner_game_earnings(partner_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_partner_earnings_game 
  ON partner_game_earnings(game_id);

CREATE INDEX IF NOT EXISTS idx_partner_earnings_credited 
  ON partner_game_earnings(credited, created_at DESC);

-- Enable RLS
ALTER TABLE partner_game_earnings ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Partners can only see their own earnings
DROP POLICY IF EXISTS partner_game_earnings_select_policy ON partner_game_earnings;
CREATE POLICY partner_game_earnings_select_policy ON partner_game_earnings
  FOR SELECT USING (
    partner_id = current_setting('app.current_partner_id', true)::text
    OR current_setting('app.is_admin', true)::boolean = true
  );

COMMENT ON TABLE partner_game_earnings IS 'Detailed earnings history per game per partner';

-- ==================================================
-- STEP 5: CREATE PARTNER_WHATSAPP_MESSAGES TABLE
-- ==================================================

CREATE TABLE IF NOT EXISTS partner_whatsapp_messages (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  partner_id TEXT NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  partner_phone TEXT NOT NULL,
  admin_phone TEXT NOT NULL,
  request_type TEXT NOT NULL CHECK (request_type IN ('withdrawal', 'support', 'query')),
  message TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'responded')),
  
  -- Metadata
  withdrawal_request_id TEXT,
  amount NUMERIC(15,2),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  sent_at TIMESTAMPTZ,
  responded_at TIMESTAMPTZ,
  response_message TEXT
);

-- Index
CREATE INDEX IF NOT EXISTS idx_partner_whatsapp_status 
  ON partner_whatsapp_messages(status, created_at DESC);

COMMENT ON TABLE partner_whatsapp_messages IS 'WhatsApp communication log for partner requests';

-- ==================================================
-- STEP 6: AUTOMATIC EARNINGS CREDIT TRIGGER
-- ==================================================

CREATE OR REPLACE FUNCTION credit_partner_earnings_after_game()
RETURNS TRIGGER AS $$
DECLARE
  v_partner RECORD;
  v_real_profit NUMERIC(15,2);
  v_shown_profit NUMERIC(15,2);
  v_earning NUMERIC(15,2);
  v_new_balance NUMERIC(15,2);
  v_transaction_id TEXT;
  v_partners_credited INTEGER := 0;
BEGIN
  -- Extract profit/loss from game_statistics
  -- Use profit_loss if available, otherwise house_earnings
  v_real_profit := COALESCE(NEW.profit_loss, NEW.house_earnings, 0);
  
  -- Only credit if game has profit
  IF v_real_profit <= 0 THEN
    RAISE NOTICE 'Game has no profit, skipping partner credits';
    RETURN NEW;
  END IF;

  RAISE NOTICE 'Game completed with profit. Crediting partners...';

  -- Loop through all active partners
  FOR v_partner IN 
    SELECT 
      id, 
      share_percentage, 
      commission_rate, 
      wallet_balance,
      full_name
    FROM partners 
    WHERE status = 'active'
  LOOP
    -- Calculate shown profit (what partner sees based on their share_percentage)
    v_shown_profit := v_real_profit * (v_partner.share_percentage / 100);
    
    -- Calculate partner's earning (commission_rate % of shown profit)
    v_earning := v_shown_profit * (v_partner.commission_rate / 100);
    
    -- Skip if earning is too small
    IF v_earning < 0.01 THEN
      CONTINUE;
    END IF;
    
    -- Round to 2 decimals
    v_earning := ROUND(v_earning, 2);
    v_shown_profit := ROUND(v_shown_profit, 2);
    
    -- Calculate new balance
    v_new_balance := v_partner.wallet_balance + v_earning;
    v_transaction_id := gen_random_uuid()::text;
    
    -- Update partner wallet balance and totals
    UPDATE partners 
    SET 
      wallet_balance = v_new_balance,
      total_earned = total_earned + v_earning
    WHERE id = v_partner.id;
    
    -- Record earning in tracking table
    INSERT INTO partner_game_earnings (
      partner_id, 
      game_id,
      real_profit,
      shown_profit, 
      share_percentage,
      commission_rate, 
      earned_amount, 
      credited, 
      credited_at, 
      transaction_id
    ) VALUES (
      v_partner.id, 
      NEW.game_id,
      v_real_profit,
      v_shown_profit, 
      v_partner.share_percentage,
      v_partner.commission_rate, 
      v_earning, 
      true, 
      NOW(), 
      v_transaction_id
    );
    
    -- Record wallet transaction
    INSERT INTO partner_wallet_transactions (
      partner_id, 
      transaction_type, 
      amount, 
      balance_before, 
      balance_after,
      game_id, 
      shown_profit, 
      commission_rate,
      description
    ) VALUES (
      v_partner.id, 
      'earning', 
      v_earning,
      v_partner.wallet_balance, 
      v_new_balance,
      NEW.game_id, 
      v_shown_profit, 
      v_partner.commission_rate,
      'Commission earned from game ' || NEW.game_id
    );
    
    v_partners_credited := v_partners_credited + 1;
    
    -- Log success (simplified to avoid parameter limit)
    RAISE NOTICE 'Partner credited successfully';
    
  END LOOP;
  
  RAISE NOTICE 'Partners credited successfully';
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the game completion
    RAISE WARNING 'Error crediting partner earnings';
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach trigger to game_statistics table (on INSERT)
DROP TRIGGER IF EXISTS trigger_credit_partner_earnings ON game_statistics;
CREATE TRIGGER trigger_credit_partner_earnings
  AFTER INSERT ON game_statistics
  FOR EACH ROW
  EXECUTE FUNCTION credit_partner_earnings_after_game();

-- Also handle updates (if game stats are corrected)
DROP TRIGGER IF EXISTS trigger_credit_partner_earnings_update ON game_statistics;
CREATE TRIGGER trigger_credit_partner_earnings_update
  AFTER UPDATE ON game_statistics
  FOR EACH ROW
  WHEN (
    OLD.profit_loss IS DISTINCT FROM NEW.profit_loss 
    OR OLD.house_earnings IS DISTINCT FROM NEW.house_earnings
  )
  EXECUTE FUNCTION credit_partner_earnings_after_game();

-- ==================================================
-- STEP 7: HELPER FUNCTIONS
-- ==================================================

-- Function to get comprehensive partner dashboard stats
CREATE OR REPLACE FUNCTION get_partner_dashboard_stats(p_partner_id TEXT)
RETURNS TABLE(
  total_games BIGINT,
  total_earnings NUMERIC,
  current_balance NUMERIC,
  total_withdrawn NUMERIC,
  pending_withdrawals NUMERIC,
  earnings_this_month NUMERIC,
  earnings_today NUMERIC,
  avg_earning_per_game NUMERIC,
  last_earning_date TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    -- Total games that generated earnings
    (SELECT COUNT(*) FROM partner_game_earnings WHERE partner_id = p_partner_id AND credited = true),
    
    -- Total earnings
    (SELECT COALESCE(SUM(earned_amount), 0) FROM partner_game_earnings WHERE partner_id = p_partner_id AND credited = true),
    
    -- Current balance
    (SELECT p.wallet_balance FROM partners p WHERE p.id = p_partner_id),
    
    -- Total withdrawn
    (SELECT p.total_withdrawn FROM partners p WHERE p.id = p_partner_id),
    
    -- Pending withdrawals
    (SELECT COALESCE(SUM(amount), 0) FROM partner_withdrawal_requests WHERE partner_id = p_partner_id AND status = 'pending'),
    
    -- Earnings this month
    (SELECT COALESCE(SUM(earned_amount), 0) FROM partner_game_earnings 
     WHERE partner_id = p_partner_id 
     AND credited = true 
     AND created_at >= date_trunc('month', NOW())),
    
    -- Earnings today
    (SELECT COALESCE(SUM(earned_amount), 0) FROM partner_game_earnings 
     WHERE partner_id = p_partner_id 
     AND credited = true 
     AND created_at >= date_trunc('day', NOW())),
    
    -- Average earning per game
    (SELECT COALESCE(AVG(earned_amount), 0) FROM partner_game_earnings 
     WHERE partner_id = p_partner_id AND credited = true),
    
    -- Last earning date
    (SELECT MAX(credited_at) FROM partner_game_earnings 
     WHERE partner_id = p_partner_id AND credited = true);
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_partner_dashboard_stats IS 'Get comprehensive dashboard statistics for a partner';

-- ==================================================
-- STEP 8: INITIALIZE EXISTING PARTNERS
-- ==================================================

-- Update existing partners to have default wallet values
UPDATE partners 
SET 
  wallet_balance = COALESCE(wallet_balance, 0),
  total_earned = COALESCE(total_earned, 0),
  total_withdrawn = COALESCE(total_withdrawn, 0),
  commission_rate = COALESCE(commission_rate, 10.00),
  min_withdrawal_amount = COALESCE(min_withdrawal_amount, 5000.00)
WHERE wallet_balance IS NULL 
   OR total_earned IS NULL 
   OR total_withdrawn IS NULL 
   OR commission_rate IS NULL 
   OR min_withdrawal_amount IS NULL;

-- ==================================================
-- STEP 9: VERIFICATION & DIAGNOSTICS
-- ==================================================

-- Create a view for easy partner wallet overview
CREATE OR REPLACE VIEW partner_wallet_overview AS
SELECT 
  p.id,
  p.full_name,
  p.phone,
  p.status,
  p.share_percentage,
  p.commission_rate,
  p.wallet_balance,
  p.total_earned,
  p.total_withdrawn,
  p.min_withdrawal_amount,
  (SELECT COUNT(*) FROM partner_game_earnings WHERE partner_id = p.id AND credited = true) as total_games_credited,
  (SELECT COUNT(*) FROM partner_withdrawal_requests WHERE partner_id = p.id AND status = 'pending') as pending_withdrawal_count,
  (SELECT SUM(amount) FROM partner_withdrawal_requests WHERE partner_id = p.id AND status = 'pending') as pending_withdrawal_amount,
  p.created_at,
  p.last_login
FROM partners p
WHERE p.status = 'active'
ORDER BY p.wallet_balance DESC;

COMMENT ON VIEW partner_wallet_overview IS 'Easy overview of all partner wallets';

-- ==================================================
-- FINAL VERIFICATION QUERIES
-- ==================================================

DO $$
BEGIN
  RAISE NOTICE '=======================================================';
  RAISE NOTICE '  PARTNER WALLET SYSTEM SETUP COMPLETE';
  RAISE NOTICE '=======================================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Tables created/updated:';
  RAISE NOTICE '  ✓ partners (added wallet columns)';
  RAISE NOTICE '  ✓ partner_wallet_transactions';
  RAISE NOTICE '  ✓ partner_withdrawal_requests';
  RAISE NOTICE '  ✓ partner_game_earnings';
  RAISE NOTICE '  ✓ partner_whatsapp_messages';
  RAISE NOTICE '';
  RAISE NOTICE 'Triggers created:';
  RAISE NOTICE '  ✓ trigger_credit_partner_earnings (INSERT)';
  RAISE NOTICE '  ✓ trigger_credit_partner_earnings_update (UPDATE)';
  RAISE NOTICE '';
  RAISE NOTICE 'Functions created:';
  RAISE NOTICE '  ✓ get_partner_dashboard_stats()';
  RAISE NOTICE '';
  RAISE NOTICE 'Views created:';
  RAISE NOTICE '  ✓ partner_wallet_overview';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '  1. Complete a test game with profit';
  RAISE NOTICE '  2. Verify partner earnings: SELECT * FROM partner_wallet_overview;';
  RAISE NOTICE '  3. Check transactions: SELECT * FROM partner_wallet_transactions ORDER BY created_at DESC LIMIT 5;';
  RAISE NOTICE '  4. Update backend API routes';
  RAISE NOTICE '  5. Update frontend dashboard';
  RAISE NOTICE '';
  RAISE NOTICE '=======================================================';
END $$;

-- Show current partner setup
SELECT 
  id,
  full_name,
  status,
  share_percentage,
  commission_rate,
  wallet_balance,
  total_earned,
  min_withdrawal_amount
FROM partners
WHERE status = 'active'
ORDER BY created_at;

-- Show table structure
SELECT 
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_name IN (
  'partner_wallet_transactions',
  'partner_withdrawal_requests',
  'partner_game_earnings',
  'partner_whatsapp_messages'
)
ORDER BY table_name;