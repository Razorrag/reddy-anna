-- =====================================================
-- CLEANUP: Remove ALL Partner System Tables
-- =====================================================
-- This will DELETE all partner data and start fresh
-- Run this FIRST, then run PARTNER_SYSTEM_SIMPLE.sql
-- =====================================================

-- Drop functions first (no dependencies)
DROP FUNCTION IF EXISTS update_partner_updated_at() CASCADE;

-- Drop tables (cascades will handle triggers and foreign keys)
DROP TABLE IF EXISTS partners CASCADE;
DROP TABLE IF EXISTS admin_partner_settings CASCADE;

-- Verify cleanup
SELECT 'Cleanup complete. Now run PARTNER_SYSTEM_SIMPLE.sql to create fresh tables' as message;