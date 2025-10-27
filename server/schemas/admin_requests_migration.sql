-- ============================================
-- ADMIN REQUESTS DATABASE MIGRATION SCRIPT
-- Add admin requests functionality to existing database
-- ============================================
-- Run this script in your Supabase SQL Editor
-- This will add admin requests tables and functions to your existing database
-- ============================================

-- ============================================
-- 1. ENHANCE EXISTING WHATSAPP MESSAGES TABLE
-- ============================================

-- Add admin workflow fields to existing whatsapp_messages table
ALTER TABLE whatsapp_messages 
ADD COLUMN IF NOT EXISTS request_status VARCHAR(20) DEFAULT 'pending' 
CHECK (request_status IN ('pending', 'approved', 'rejected', 'processed'));

ALTER TABLE whatsapp_messages 
ADD COLUMN IF NOT EXISTS admin_response TEXT;

ALTER TABLE whatsapp_messages 
ADD COLUMN IF NOT EXISTS admin_id VARCHAR(36);

ALTER TABLE whatsapp_messages 
ADD COLUMN IF NOT EXISTS balance_updated BOOLEAN DEFAULT FALSE;

-- ============================================
-- 2. CREATE ADMIN REQUESTS TABLE
-- ============================================

-- Create the main admin requests table
CREATE TABLE IF NOT EXISTS admin_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(20) REFERENCES users(id),
    user_phone VARCHAR(20) NOT NULL,
    request_type VARCHAR(20) NOT NULL 
        CHECK (request_type IN ('deposit', 'withdrawal', 'support', 'balance')),
    amount DECIMAL(15, 2),
    currency VARCHAR(3) DEFAULT 'INR',
    payment_method VARCHAR(50),
    utr_number VARCHAR(100),
    status VARCHAR(20) DEFAULT 'pending'
        CHECK (status IN ('pending', 'approved', 'rejected', 'processing', 'completed')),
    priority INTEGER DEFAULT 3 
        CHECK (priority IN (1, 2, 3)), -- 1=high, 2=medium, 3=low
    admin_notes TEXT,
    admin_id VARCHAR(36) REFERENCES admin_credentials(id),
    whatsapp_message_id VARCHAR(36) REFERENCES whatsapp_messages(id),
    balance_updated BOOLEAN DEFAULT FALSE,
    balance_update_amount DECIMAL(15, 2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE
);

-- ============================================
-- 3. CREATE REQUEST AUDIT TRAIL TABLE
-- ============================================

-- Create audit trail table for all admin actions
CREATE TABLE IF NOT EXISTS request_audit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID REFERENCES admin_requests(id) ON DELETE CASCADE,
    admin_id VARCHAR(36) REFERENCES admin_credentials(id),
    action VARCHAR(50) NOT NULL,
    old_status VARCHAR(20),
    new_status VARCHAR(20),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 4. CREATE ADMIN DASHBOARD SETTINGS TABLE
-- ============================================

-- Create settings table for admin dashboard configuration
CREATE TABLE IF NOT EXISTS admin_dashboard_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT,
    description TEXT,
    updated_by VARCHAR(36) REFERENCES admin_credentials(id),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 5. CREATE INDEXES FOR PERFORMANCE
-- ============================================

-- Add indexes for admin requests table
CREATE INDEX IF NOT EXISTS idx_admin_requests_status ON admin_requests(status);
CREATE INDEX IF NOT EXISTS idx_admin_requests_user_id ON admin_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_requests_created_at ON admin_requests(created_at);
CREATE INDEX IF NOT EXISTS idx_admin_requests_priority ON admin_requests(priority);
CREATE INDEX IF NOT EXISTS idx_admin_requests_whatsapp_id ON admin_requests(whatsapp_message_id);

-- Add indexes for request audit table
CREATE INDEX IF NOT EXISTS idx_request_audit_request_id ON request_audit(request_id);
CREATE INDEX IF NOT EXISTS idx_request_audit_admin_id ON request_audit(admin_id);
CREATE INDEX IF NOT EXISTS idx_request_audit_created_at ON request_audit(created_at);

-- ============================================
-- 6. INSERT DEFAULT DASHBOARD SETTINGS
-- ============================================

-- Insert default configuration for admin dashboard
INSERT INTO admin_dashboard_settings (setting_key, setting_value, description)
VALUES
('auto_refresh_interval', '30', 'Auto-refresh interval in seconds for dashboard data'),
('default_request_limit', '50', 'Default number of requests to show per page'),
('enable_real_time_notifications', 'true', 'Enable real-time WebSocket notifications'),
('default_priority', '3', 'Default priority for new requests'),
('require_admin_approval', 'true', 'Require admin approval for balance updates'),
('notification_sound', 'true', 'Play sound for new high-priority requests')
ON CONFLICT (setting_key) DO NOTHING;

-- ============================================
-- 7. CREATE DATABASE VIEWS
-- ============================================

-- Create admin requests summary view for dashboard statistics
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

-- ============================================
-- 8. CREATE DATABASE FUNCTIONS
-- ============================================

-- Function to handle request status changes with audit logging
CREATE OR REPLACE FUNCTION update_request_status(
    p_request_id UUID,
    p_admin_id VARCHAR(36),
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

-- Function to update user balance and mark request as processed
CREATE OR REPLACE FUNCTION update_balance_with_request(
    p_request_id UUID,
    p_admin_id VARCHAR(36),
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
            UPDATE users SET balance = balance + v_request.amount
            WHERE id = v_request.user_id;
        ELSIF v_request.request_type = 'withdrawal' THEN
            UPDATE users SET balance = balance - v_request.amount
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
            'Balance updated by ' || COALESCE(p_notes, 'Admin action')
        );
    END IF;
    
    RETURN v_request;
END;
$$ LANGUAGE plpgsql;

-- Function to automatically update the updated_at field
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 9. CREATE TRIGGERS
-- ============================================

-- Create trigger for admin requests table
DROP TRIGGER IF EXISTS update_admin_requests_updated_at ON admin_requests;
CREATE TRIGGER update_admin_requests_updated_at
    BEFORE UPDATE ON admin_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create trigger for whatsapp messages table
DROP TRIGGER IF EXISTS update_whatsapp_messages_updated_at ON whatsapp_messages;
CREATE TRIGGER update_whatsapp_messages_updated_at
    BEFORE UPDATE ON whatsapp_messages
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 10. GRANT PERMISSIONS
-- ============================================

-- Grant necessary permissions for admin operations
-- Note: Adjust these based on your Supabase role setup
-- GRANT SELECT, INSERT, UPDATE ON admin_requests TO your_admin_role;
-- GRANT SELECT, INSERT ON request_audit TO your_admin_role;
-- GRANT SELECT, INSERT, UPDATE ON admin_dashboard_settings TO your_admin_role;
-- GRANT EXECUTE ON FUNCTION update_request_status TO your_admin_role;
-- GRANT EXECUTE ON FUNCTION update_balance_with_request TO your_admin_role;

-- ============================================
-- 11. INSERT SAMPLE DATA (OPTIONAL)
-- ============================================

-- Insert sample requests for testing (only if you want test data)
-- Note: Only run this after you have real users in your database
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
--     '919876543210', -- Replace with real user ID
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
--     '919876543211', -- Replace with real user ID
--     '919876543211',
--     'withdrawal',
--     2000.00,
--     'Bank Transfer',
--     'BANK123456',
--     'pending',
--     1,
--     'Test withdrawal request - high priority'
-- )
-- ON CONFLICT DO NOTHING;

-- ============================================
-- MIGRATION COMPLETE
-- ============================================

-- Admin requests migration has been applied successfully!
-- The following components are now available:
-- ✅ Admin requests table for managing user requests
-- ✅ Request audit trail for tracking admin actions
-- ✅ Admin dashboard settings for configuration
-- ✅ Admin requests summary view for live statistics
-- ✅ Database functions for request processing
-- ✅ Enhanced WhatsApp messages table with admin workflow

-- Next steps:
-- 1. Update your backend code to use the new tables
-- 2. Connect whatsapp-service-enhanced.ts to these tables
-- 3. Update admin dashboard API endpoints
-- 4. Test the admin request workflow