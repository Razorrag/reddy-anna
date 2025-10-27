-- Enhanced Admin Requests Database Schema
-- Comprehensive request management system for Andar Bahar platform

-- 1. Enhanced WhatsApp Messages Table
-- Adding admin workflow fields to existing whatsapp_messages table
ALTER TABLE whatsapp_messages 
ADD COLUMN IF NOT EXISTS request_status VARCHAR(20) DEFAULT 'pending' 
CHECK (request_status IN ('pending', 'approved', 'rejected', 'processed'));

ALTER TABLE whatsapp_messages 
ADD COLUMN IF NOT EXISTS admin_response TEXT;

ALTER TABLE whatsapp_messages 
ADD COLUMN IF NOT EXISTS admin_id VARCHAR(255);

ALTER TABLE whatsapp_messages 
ADD COLUMN IF NOT EXISTS balance_updated BOOLEAN DEFAULT FALSE;

-- 2. New Unified Admin Requests Table
-- Central table for managing all types of admin requests
CREATE TABLE IF NOT EXISTS admin_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(255) REFERENCES users(id),
    user_phone VARCHAR(20) NOT NULL,
    request_type VARCHAR(20) NOT NULL 
        CHECK (request_type IN ('deposit', 'withdrawal', 'support', 'balance')),
    amount DECIMAL(10,2),
    currency VARCHAR(3) DEFAULT 'INR',
    payment_method VARCHAR(50),
    utr_number VARCHAR(100),
    status VARCHAR(20) DEFAULT 'pending'
        CHECK (status IN ('pending', 'approved', 'rejected', 'processing', 'completed')),
    priority INTEGER DEFAULT 3 
        CHECK (priority IN (1, 2, 3)), -- 1=high, 2=medium, 3=low
    admin_notes TEXT,
    admin_id VARCHAR(255) REFERENCES admin_credentials(id),
    whatsapp_message_id VARCHAR(36) REFERENCES whatsapp_messages(id),
    balance_updated BOOLEAN DEFAULT FALSE,
    balance_update_amount DECIMAL(10,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE
);

-- 3. Request Audit Trail Table
-- Complete audit log for all admin actions on requests
CREATE TABLE IF NOT EXISTS request_audit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID REFERENCES admin_requests(id) ON DELETE CASCADE,
    admin_id VARCHAR(255) REFERENCES admin_credentials(id),
    action VARCHAR(50) NOT NULL,
    old_status VARCHAR(20),
    new_status VARCHAR(20),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Admin Dashboard Settings Table
-- Configuration settings for the admin dashboard
CREATE TABLE IF NOT EXISTS admin_dashboard_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT,
    description TEXT,
    updated_by VARCHAR(255),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Create Indexes for Performance
-- Indexes for efficient querying and real-time updates
CREATE INDEX IF NOT EXISTS idx_admin_requests_status ON admin_requests(status);
CREATE INDEX IF NOT EXISTS idx_admin_requests_user_id ON admin_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_requests_created_at ON admin_requests(created_at);
CREATE INDEX IF NOT EXISTS idx_admin_requests_priority ON admin_requests(priority);
CREATE INDEX IF NOT EXISTS idx_admin_requests_whatsapp_id ON admin_requests(whatsapp_message_id);

CREATE INDEX IF NOT EXISTS idx_request_audit_request_id ON request_audit(request_id);
CREATE INDEX IF NOT EXISTS idx_request_audit_admin_id ON request_audit(admin_id);
CREATE INDEX IF NOT EXISTS idx_request_audit_created_at ON request_audit(created_at);

-- 6. Insert Default Dashboard Settings
-- Initial configuration for the admin dashboard
INSERT INTO admin_dashboard_settings (setting_key, setting_value, description) VALUES
('auto_refresh_interval', '30', 'Auto-refresh interval in seconds for dashboard data'),
('default_request_limit', '50', 'Default number of requests to show per page'),
('enable_real_time_notifications', 'true', 'Enable real-time WebSocket notifications'),
('default_priority', '3', 'Default priority for new requests'),
('require_admin_approval', 'true', 'Require admin approval for balance updates'),
('notification_sound', 'true', 'Play sound for new high-priority requests')
ON CONFLICT (setting_key) DO NOTHING;

-- 7. Create View for Request Summary
-- Simplified view for dashboard statistics
CREATE OR REPLACE VIEW admin_requests_summary AS
SELECT 
    COUNT(*) as total_requests,
    COUNT(*) FILTER (WHERE status = 'pending') as pending_requests,
    COUNT(*) FILTER (WHERE status = 'pending' AND priority = 1) as high_priority_requests,
    COUNT(*) FILTER (WHERE status = 'approved') as approved_requests,
    COUNT(*) FILTER (WHERE status = 'rejected') as rejected_requests,
    SUM(amount) FILTER (WHERE status = 'pending') as pending_amount,
    SUM(amount) FILTER (WHERE status = 'approved') as approved_amount
FROM admin_requests
WHERE created_at >= NOW() - INTERVAL '24 hours';

-- 8. Create Function for Request Status Update
-- Function to handle request status changes with audit logging
CREATE OR REPLACE FUNCTION update_request_status(
    p_request_id UUID,
    p_admin_id VARCHAR(255),
    p_new_status VARCHAR(20),
    p_notes TEXT DEFAULT NULL
) RETURNS admin_requests AS $$
DECLARE
    v_old_status VARCHAR(20);
    v_request admin_requests%ROWTYPE;
BEGIN
    -- Get current status
    SELECT status INTO v_old_status FROM admin_requests WHERE id = p_request_id;
    
    -- Update the request
    UPDATE admin_requests 
    SET status = p_new_status,
        admin_id = p_admin_id,
        admin_notes = p_notes,
        updated_at = NOW(),
        processed_at = CASE WHEN p_new_status IN ('approved', 'rejected') THEN NOW() ELSE NULL END
    WHERE id = p_request_id
    RETURNING * INTO v_request;
    
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
    
    RETURN v_request;
END;
$$ LANGUAGE plpgsql;

-- 9. Create Function for Balance Update with Request
-- Function to update user balance and mark request as processed
CREATE OR REPLACE FUNCTION update_balance_with_request(
    p_request_id UUID,
    p_admin_id VARCHAR(255),
    p_new_status VARCHAR(20),
    p_notes TEXT DEFAULT NULL
) RETURNS admin_requests AS $$
DECLARE
    v_request admin_requests%ROWTYPE;
    v_user users%ROWTYPE;
BEGIN
    -- Get the request
    SELECT * INTO v_request FROM admin_requests WHERE id = p_request_id;
    
    -- Get the user
    SELECT * INTO v_user FROM users WHERE id = v_request.user_id;
    
    -- Update request status
    SELECT * INTO v_request FROM update_request_status(p_request_id, p_admin_id, p_new_status, p_notes);
    
    -- If approved and amount is set, update balance
    IF p_new_status = 'approved' AND v_request.amount IS NOT NULL THEN
        -- Update user balance (deposit increases, withdrawal decreases)
        IF v_request.request_type = 'deposit' THEN
            UPDATE users SET balance = (balance::DECIMAL + v_request.amount)::TEXT
            WHERE id = v_request.user_id;
        ELSIF v_request.request_type = 'withdrawal' THEN
            UPDATE users SET balance = (balance::DECIMAL - v_request.amount)::TEXT
            WHERE id = v_request.user_id;
        END IF;
        
        -- Mark balance as updated
        UPDATE admin_requests 
        SET balance_updated = true,
            balance_update_amount = v_request.amount
        WHERE id = p_request_id;
        
        -- Log the balance update action
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
            'Balance updated by ' || p_notes
        );
    END IF;
    
    RETURN v_request;
END;
$$ LANGUAGE plpgsql;

-- 10. Create Trigger for Auto-Update Timestamp
-- Automatically update the updated_at field
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_admin_requests_updated_at ON admin_requests;
CREATE TRIGGER update_admin_requests_updated_at
    BEFORE UPDATE ON admin_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 11. Grant Permissions
-- Grant necessary permissions for admin operations
GRANT SELECT, INSERT, UPDATE ON admin_requests TO supabase_auth_admin;
GRANT SELECT, INSERT ON request_audit TO supabase_auth_admin;
GRANT SELECT, INSERT, UPDATE ON admin_dashboard_settings TO supabase_auth_admin;
GRANT EXECUTE ON FUNCTION update_request_status TO supabase_auth_admin;
GRANT EXECUTE ON FUNCTION update_balance_with_request TO supabase_auth_admin;
GRANT EXECUTE ON FUNCTION update_updated_at_column TO supabase_auth_admin;

-- 12. Insert Sample Data for Testing
-- Sample requests for development and testing
-- NOTE: Only run this after users exist in the database
-- INSERT INTO admin_requests (
--     user_id,
--     user_phone,
--     request_type,
--     amount,
--     payment_method,
--     utr_number,
--     status,
--     priority,
--     admin_notes
-- ) VALUES
-- (
--     'test_user_1',
--     '919876543210',
--     'deposit',
--     5000.00,
--     'UPI',
--     'UPI1234567890',
--     'pending',
--     2,
--     'Test deposit request via UPI'
-- ),
-- (
--     'test_user_2',
--     '919876543211',
--     'withdrawal',
--     2000.00,
--     'Bank Transfer',
--     'BANK123456',
--     'pending',
--     1,
--     'Test withdrawal request - high priority'
-- ),
-- (
--     'test_user_3',
--     '919876543212',
--     'support',
--     NULL,
--     NULL,
--     NULL,
--     'pending',
--     3,
--     'Test support request - general inquiry'
-- )
-- ON CONFLICT DO NOTHING;

COMMENT ON TABLE admin_requests IS 'Central table for managing all admin requests including deposits, withdrawals, and support';
COMMENT ON TABLE request_audit IS 'Complete audit trail for all admin actions on requests';
COMMENT ON TABLE admin_dashboard_settings IS 'Configuration settings for the admin dashboard';
COMMENT ON FUNCTION update_request_status IS 'Function to update request status with audit logging';
COMMENT ON FUNCTION update_balance_with_request IS 'Function to update user balance and mark request as processed';