-- ============================================
-- FIX: Admin Request Database Functions
-- This migration fixes the return types for admin request processing functions
-- ============================================

-- Drop existing functions if they exist
DROP FUNCTION IF EXISTS update_request_status(UUID, VARCHAR, request_status, TEXT);
DROP FUNCTION IF EXISTS update_balance_with_request(UUID, VARCHAR, request_status, TEXT);

-- ============================================
-- Function to update request status with proper JSON return
-- ============================================
CREATE OR REPLACE FUNCTION update_request_status(
    p_request_id UUID,
    p_admin_id VARCHAR(36),
    p_new_status request_status,
    p_notes TEXT DEFAULT NULL
) RETURNS JSON AS $$
DECLARE
    v_old_status request_status;
    v_result JSON;
BEGIN
    -- Get current status
    SELECT status INTO v_old_status FROM admin_requests WHERE id = p_request_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Request not found: %', p_request_id;
    END IF;
    
    -- Update the request
    UPDATE admin_requests 
    SET status = p_new_status,
        admin_id = p_admin_id,
        admin_notes = COALESCE(p_notes, admin_notes),
        updated_at = NOW(),
        processed_at = CASE WHEN p_new_status IN ('approved', 'rejected', 'completed') THEN NOW() ELSE processed_at END
    WHERE id = p_request_id;
    
    -- Log the audit trail
    INSERT INTO request_audit (
        request_id,
        admin_id,
        action,
        old_status,
        new_status,
        notes
    ) VALUES (
        p_request_id,
        p_admin_id,
        'status_update',
        v_old_status,
        p_new_status,
        p_notes
    );
    
    -- Return updated request as JSON
    SELECT row_to_json(r.*) INTO v_result
    FROM (SELECT * FROM admin_requests WHERE id = p_request_id) r;
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Function to update user balance and process request with proper JSON return
-- ============================================
CREATE OR REPLACE FUNCTION update_balance_with_request(
    p_request_id UUID,
    p_admin_id VARCHAR(36),
    p_new_status request_status,
    p_notes TEXT DEFAULT NULL
) RETURNS JSON AS $$
DECLARE
    v_request RECORD;
    v_user RECORD;
    v_old_balance DECIMAL(15, 2);
    v_new_balance DECIMAL(15, 2);
    v_result JSON;
BEGIN
    -- Get the request
    SELECT * INTO v_request FROM admin_requests WHERE id = p_request_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Request not found: %', p_request_id;
    END IF;
    
    -- Check if request has already been processed
    IF v_request.balance_updated = true THEN
        RAISE EXCEPTION 'Request has already been processed and balance updated';
    END IF;
    
    -- Get the user
    SELECT * INTO v_user FROM users WHERE id = v_request.user_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'User not found: %', v_request.user_id;
    END IF;
    
    -- Update request status first
    UPDATE admin_requests 
    SET status = p_new_status,
        admin_id = p_admin_id,
        admin_notes = COALESCE(p_notes, admin_notes),
        updated_at = NOW(),
        processed_at = NOW()
    WHERE id = p_request_id;
    
    -- Log status update in audit trail
    INSERT INTO request_audit (
        request_id,
        admin_id,
        action,
        old_status,
        new_status,
        notes
    ) VALUES (
        p_request_id,
        p_admin_id,
        'status_update',
        v_request.status,
        p_new_status,
        p_notes
    );
    
    -- If approved and amount is set, update balance
    IF p_new_status = 'approved' AND v_request.amount IS NOT NULL THEN
        v_old_balance := v_user.balance;
        
        -- Update user balance based on request type
        IF v_request.request_type = 'deposit' OR v_request.request_type = 'balance' THEN
            -- Add funds to user balance
            v_new_balance := v_old_balance + v_request.amount;
            
            -- Check for negative balance (shouldn't happen for deposits, but safety check)
            IF v_new_balance < 0 THEN
                RAISE EXCEPTION 'Invalid balance calculation. Old: %, Change: %', v_old_balance, v_request.amount;
            END IF;
            
            UPDATE users 
            SET balance = v_new_balance,
                updated_at = NOW()
            WHERE id = v_request.user_id;
            
            -- Apply deposit bonus if applicable (5% default)
            IF v_request.request_type = 'deposit' THEN
                DECLARE
                    v_bonus_amount DECIMAL(15, 2);
                    v_bonus_percent DECIMAL(5, 2) := 5.0; -- 5% default bonus
                BEGIN
                    v_bonus_amount := ROUND(v_request.amount * (v_bonus_percent / 100.0), 2);
                    
                    -- Add bonus to user's deposit_bonus_available
                    UPDATE users
                    SET deposit_bonus_available = deposit_bonus_available + v_bonus_amount,
                        total_bonus_earned = total_bonus_earned + v_bonus_amount,
                        original_deposit_amount = original_deposit_amount + v_request.amount,
                        updated_at = NOW()
                    WHERE id = v_request.user_id;
                    
                    -- Log bonus transaction
                    INSERT INTO user_transactions (
                        user_id,
                        transaction_type,
                        amount,
                        balance_before,
                        balance_after,
                        status,
                        description,
                        reference_id
                    ) VALUES (
                        v_request.user_id,
                        'bonus',
                        v_bonus_amount,
                        v_old_balance,
                        v_new_balance,
                        'completed',
                        'Deposit bonus (' || v_bonus_percent || '%) for deposit of ₹' || v_request.amount,
                        'BONUS-' || p_request_id::text
                    );
                END;
            END IF;
            
        ELSIF v_request.request_type = 'withdrawal' THEN
            -- Subtract funds from user balance
            v_new_balance := v_old_balance - v_request.amount;
            
            -- Check for negative balance
            IF v_new_balance < 0 THEN
                RAISE EXCEPTION 'Insufficient balance. Current: %, Withdrawal: %', v_old_balance, v_request.amount;
            END IF;
            
            UPDATE users 
            SET balance = v_new_balance,
                updated_at = NOW()
            WHERE id = v_request.user_id;
        END IF;
        
        -- Mark balance as updated
        UPDATE admin_requests 
        SET balance_updated = true,
            balance_update_amount = v_request.amount
        WHERE id = p_request_id;
        
        -- Log the balance update in audit trail
        INSERT INTO request_audit (
            request_id,
            admin_id,
            action,
            old_status,
            new_status,
            notes
        ) VALUES (
            p_request_id,
            p_admin_id,
            'balance_update',
            p_new_status,
            p_new_status,
            'Balance updated: ' || v_old_balance || ' → ' || v_new_balance || ' (' || 
            CASE 
                WHEN v_request.request_type IN ('deposit', 'balance') THEN '+'
                ELSE '-'
            END || v_request.amount || '). ' || COALESCE(p_notes, '')
        );
        
        -- Log transaction in user_transactions table
        INSERT INTO user_transactions (
            user_id,
            transaction_type,
            amount,
            balance_before,
            balance_after,
            status,
            description,
            reference_id
        ) VALUES (
            v_request.user_id,
            v_request.request_type,
            v_request.amount,
            v_old_balance,
            v_new_balance,
            'completed',
            CASE 
                WHEN v_request.request_type = 'deposit' THEN 'Deposit approved by admin'
                WHEN v_request.request_type = 'withdrawal' THEN 'Withdrawal approved by admin'
                WHEN v_request.request_type = 'balance' THEN 'Balance adjustment by admin'
                ELSE 'Admin request processed'
            END || COALESCE(' - ' || p_notes, ''),
            'REQ-' || p_request_id::text
        );
    END IF;
    
    -- Return updated request as JSON
    SELECT row_to_json(r.*) INTO v_result
    FROM (SELECT * FROM admin_requests WHERE id = p_request_id) r;
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Grant permissions
-- ============================================
GRANT EXECUTE ON FUNCTION update_request_status TO authenticated;
GRANT EXECUTE ON FUNCTION update_balance_with_request TO authenticated;

-- ============================================
-- Verification
-- ============================================
DO $$
BEGIN
    RAISE NOTICE '✅ Admin request functions updated successfully!';
    RAISE NOTICE '📋 Functions available:';
    RAISE NOTICE '   - update_request_status(request_id, admin_id, status, notes)';
    RAISE NOTICE '   - update_balance_with_request(request_id, admin_id, status, notes)';
    RAISE NOTICE '🔧 Both functions now return JSON format';
    RAISE NOTICE '💰 Deposit bonus (5%%) automatically applied on approved deposits';
    RAISE NOTICE '📊 All transactions logged in user_transactions table';
    RAISE NOTICE '🔍 Audit trail maintained in request_audit table';
END $$;
