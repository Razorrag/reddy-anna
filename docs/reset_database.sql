-- 🗑️ COMPLETE DATABASE RESET SCRIPT FOR REDDY ANNA ANDAR BAHAR
-- ⚠️ WARNING: This will DELETE ALL DATA in your database!
-- Run this in Supabase SQL Editor to completely reset the database
-- This reset script matches the SUPABASE_SCHEMA.sql structure

-- Disable RLS policies temporarily
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE bets DISABLE ROW LEVEL SECURITY;
ALTER TABLE transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions DISABLE ROW LEVEL SECURITY;

-- Drop all tables in correct order (respecting foreign key constraints)
DROP TABLE IF EXISTS audit_log CASCADE;
DROP TABLE IF EXISTS site_content CASCADE;
DROP TABLE IF EXISTS system_settings CASCADE;
DROP TABLE IF EXISTS stream_settings CASCADE;
DROP TABLE IF EXISTS user_sessions CASCADE;
DROP TABLE IF EXISTS transactions CASCADE;
DROP TABLE IF EXISTS dealt_cards CASCADE;
DROP TABLE IF EXISTS bets CASCADE;
DROP TABLE IF EXISTS game_history CASCADE;
DROP TABLE IF EXISTS game_sessions CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Drop views
DROP VIEW IF EXISTS user_stats CASCADE;
DROP VIEW IF EXISTS game_stats CASCADE;

-- Drop custom types
DROP TYPE IF EXISTS payment_status CASCADE;
DROP TYPE IF EXISTS payment_type CASCADE;
DROP TYPE IF EXISTS bet_status CASCADE;
DROP TYPE IF EXISTS bet_side CASCADE;
DROP TYPE IF EXISTS game_phase CASCADE;
DROP TYPE IF EXISTS user_status CASCADE;
DROP TYPE IF EXISTS user_role CASCADE;

-- Drop functions
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS generate_referral_code() CASCADE;
DROP FUNCTION IF EXISTS update_user_statistics() CASCADE;
DROP FUNCTION IF EXISTS cleanup_expired_sessions() CASCADE;
DROP FUNCTION IF EXISTS get_user_game_history(UUID, INTEGER, INTEGER) CASCADE;
DROP FUNCTION IF EXISTS get_active_game() CASCADE;

-- Drop triggers
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
DROP TRIGGER IF EXISTS update_game_sessions_updated_at ON game_sessions;
DROP TRIGGER IF EXISTS update_bets_updated_at ON bets;
DROP TRIGGER IF EXISTS update_transactions_updated_at ON transactions;
DROP TRIGGER IF EXISTS update_user_sessions_updated_at ON user_sessions;
DROP TRIGGER IF EXISTS update_system_settings_updated_at ON system_settings;
DROP TRIGGER IF EXISTS update_site_content_updated_at ON site_content;
DROP TRIGGER IF EXISTS update_stream_settings_updated_at ON stream_settings;
DROP TRIGGER IF EXISTS generate_user_referral_code ON users;
DROP TRIGGER IF EXISTS update_user_stats_trigger ON bets;

-- Revoke all permissions
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM authenticated;
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM service_role;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM service_role;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM service_role;
REVOKE USAGE ON SCHEMA public FROM authenticated;

-- Reset sequence counters
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT sequence_name FROM information_schema.sequences WHERE sequence_schema = 'public') LOOP
        EXECUTE 'ALTER SEQUENCE ' || quote_ident(r.sequence_name) || ' RESTART WITH 1';
    END LOOP;
END
$$;

-- Clean up any remaining objects
DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;

-- Revoke create on public schema
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
REVOKE CREATE ON SCHEMA public FROM postgres;
REVOKE ALL ON SCHEMA public FROM PUBLIC;

-- Grant basic permissions
GRANT USAGE ON SCHEMA public TO PUBLIC;
GRANT CREATE ON SCHEMA public TO PUBLIC;

-- Reset complete message
SELECT '🗑️ DATABASE RESET COMPLETE - All tables, data, and objects have been removed' AS status;
SELECT '⚠️ You can now run the SUPABASE_SCHEMA.sql to recreate the database structure' AS next_step;
SELECT '✅ Reset script includes stream_settings table to match SUPABASE_SCHEMA.sql' AS confirmation;
