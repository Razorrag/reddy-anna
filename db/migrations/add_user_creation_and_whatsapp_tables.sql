-- Migration: Add User Creation Log and WhatsApp Messages Tables
-- Created: 2024-01-25
-- Description: Adds tables for tracking admin-created users and WhatsApp communication

-- User Creation Log Table
CREATE TABLE IF NOT EXISTS user_creation_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_by_admin_id VARCHAR(20) NOT NULL,
    user_phone VARCHAR(15) NOT NULL,
    created_user_id VARCHAR(20) NOT NULL,
    initial_balance DECIMAL(15,2) DEFAULT 0.00,
    created_reason TEXT,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- WhatsApp Messages Table
CREATE TABLE IF NOT EXISTS whatsapp_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(20) NOT NULL,
    user_phone VARCHAR(15) NOT NULL,
    admin_phone VARCHAR(15) NOT NULL,
    request_type VARCHAR(50) NOT NULL, -- withdrawal, deposit, support, balance
    message TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'pending', -- pending, sent, responded
    priority INTEGER DEFAULT 3, -- 1-5, 1 being highest
    is_urgent BOOLEAN DEFAULT FALSE,
    metadata TEXT, -- JSON string for additional data
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    sent_at TIMESTAMP WITH TIME ZONE,
    responded_at TIMESTAMP WITH TIME ZONE,
    response_message TEXT,
    response_by VARCHAR(20)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_user_creation_log_admin ON user_creation_log(created_by_admin_id);
CREATE INDEX IF NOT EXISTS idx_user_creation_log_user ON user_creation_log(created_user_id);
CREATE INDEX IF NOT EXISTS idx_user_creation_log_created_at ON user_creation_log(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_user ON whatsapp_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_status ON whatsapp_messages(status);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_created_at ON whatsapp_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_urgent ON whatsapp_messages(is_urgent, created_at);

-- Add admin WhatsApp number to game settings if not exists
INSERT INTO game_settings (setting_key, setting_value, description)
VALUES ('admin_whatsapp_number', '918686886632', 'Admin WhatsApp number for user requests')
ON CONFLICT (setting_key) DO NOTHING;

-- Comments for documentation
COMMENT ON TABLE user_creation_log IS 'Tracks all users created by admins for audit purposes';
COMMENT ON TABLE whatsapp_messages IS 'Stores all WhatsApp communication requests from users to admin';
COMMENT ON COLUMN whatsapp_messages.request_type IS 'Type of request: withdrawal, deposit, support, balance';
COMMENT ON COLUMN whatsapp_messages.priority IS 'Priority level: 1 (highest) to 5 (lowest)';
COMMENT ON COLUMN whatsapp_messages.metadata IS 'Additional request data stored as JSON string';
