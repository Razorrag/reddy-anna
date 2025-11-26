-- =====================================================
-- PARTNER SYSTEM - COMPLETE DATABASE SCHEMA
-- =====================================================
-- Partners can login, view game history, and earn commissions
-- =====================================================

-- 1. PARTNERS TABLE
-- Stores partner accounts (completely separate from users/players)
CREATE TABLE IF NOT EXISTS partners (
    id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    phone VARCHAR(20) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    full_name TEXT NOT NULL,
    email TEXT,
    whatsapp_number VARCHAR(20),
    
    -- Status and approval
    status VARCHAR(20) DEFAULT 'pending', -- pending, active, suspended, banned
    approved_by VARCHAR(255), -- admin who approved
    approved_at TIMESTAMP,
    rejection_reason TEXT,
    
    -- Commission settings (set by admin)
    commission_percentage DECIMAL(5, 2) DEFAULT 10.00, -- default 10%
    
    -- Timestamps
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 2. ADMIN PARTNER SETTINGS TABLE
-- Global partner system configuration
CREATE TABLE IF NOT EXISTS admin_partner_settings (
    id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    setting_key VARCHAR(100) NOT NULL UNIQUE,
    setting_value TEXT NOT NULL,
    description TEXT,
    
    -- Audit
    updated_by VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_partners_phone ON partners(phone);
CREATE INDEX IF NOT EXISTS idx_partners_status ON partners(status);
CREATE INDEX IF NOT EXISTS idx_partners_created_at ON partners(created_at);

-- =====================================================
-- DEFAULT ADMIN PARTNER SETTINGS
-- =====================================================

INSERT INTO admin_partner_settings (setting_key, setting_value, description) VALUES
    ('allow_self_registration', 'true', 'Allow partners to self-register'),
    ('require_admin_approval', 'true', 'Require admin approval for new partner registrations'),
    ('partner_system_enabled', 'true', 'Enable/disable the entire partner system'),
    ('default_commission_percentage', '50', 'Default commission percentage for new partners (1-100)')
ON CONFLICT (setting_key) DO NOTHING;

-- =====================================================
-- TRIGGER FOR UPDATED_AT
-- =====================================================

CREATE OR REPLACE FUNCTION update_partner_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_partners_updated_at ON partners;
CREATE TRIGGER trigger_partners_updated_at
    BEFORE UPDATE ON partners
    FOR EACH ROW
    EXECUTE FUNCTION update_partner_updated_at();

-- =====================================================
-- ADD COMMISSION COLUMN IF IT DOESN'T EXIST
-- =====================================================

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='partners' AND column_name='commission_percentage'
    ) THEN
        ALTER TABLE partners ADD COLUMN commission_percentage DECIMAL(5, 2) DEFAULT 10.00;
    END IF;
END $$;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE partners IS 'Partner accounts - can view game history and earn commissions';
COMMENT ON TABLE admin_partner_settings IS 'Global partner system configuration';
COMMENT ON COLUMN partners.commission_percentage IS 'Percentage of game profits visible to partner (e.g., 10 = 10%)';