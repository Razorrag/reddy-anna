-- 🔄 RESET DATABASE SCHEMA
-- Run this first to clear existing tables, then run supabase_schema.sql

-- Drop all tables in correct order (respecting foreign key constraints)
DROP TABLE IF EXISTS audit_log CASCADE;
DROP TABLE IF EXISTS site_content CASCADE;
DROP TABLE IF EXISTS system_settings CASCADE;
DROP TABLE IF EXISTS user_sessions CASCADE;
DROP TABLE IF EXISTS transactions CASCADE;
DROP TABLE IF EXISTS dealt_cards CASCADE;
DROP TABLE IF EXISTS game_history CASCADE;
DROP TABLE IF EXISTS bets CASCADE;
DROP TABLE IF EXISTS game_sessions CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Drop views
DROP VIEW IF EXISTS user_stats CASCADE;
DROP VIEW IF EXISTS game_stats CASCADE;

-- Drop functions
DROP FUNCTION IF EXISTS cleanup_expired_sessions() CASCADE;
DROP FUNCTION IF EXISTS get_user_game_history(UUID, INTEGER, INTEGER) CASCADE;
DROP FUNCTION IF EXISTS get_active_game() CASCADE;
DROP FUNCTION IF EXISTS update_user_statistics() CASCADE;
DROP FUNCTION IF EXISTS generate_referral_code() CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

-- Drop types
DROP TYPE IF EXISTS payment_status CASCADE;
DROP TYPE IF EXISTS payment_type CASCADE;
DROP TYPE IF EXISTS bet_status CASCADE;
DROP TYPE IF EXISTS bet_side CASCADE;
DROP TYPE IF EXISTS game_phase CASCADE;
DROP TYPE IF EXISTS user_status CASCADE;
DROP TYPE IF EXISTS user_role CASCADE;

-- Reset sequence
-- (No need to reset UUID sequences as they use uuid_generate_v4())

-- Success message
SELECT 'Database reset completed. Now run supabase_schema.sql to create the new schema.' as status;
