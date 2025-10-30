-- 🧹 SUPABASE DATABASE CLEANUP SQL SCRIPT
-- 
-- This script safely removes all data from Supabase tables while respecting
-- foreign key constraints by deleting in the correct order.
--
-- ⚠️  THIS WILL PERMANENTLY DELETE ALL DATA IN THE DATABASE!
-- ⚠️  MAKE SURE YOU HAVE A BACKUP BEFORE RUNNING THIS SCRIPT!

-- Disable foreign key checks temporarily
SET session_replication_role = 'replica';

-- Clear Payment & Transaction Tables (highest dependency)
DELETE FROM payment_requests;
DELETE FROM user_transactions;

-- Clear Game Analytics Tables
DELETE FROM game_statistics;
DELETE FROM daily_game_statistics;
DELETE FROM monthly_game_statistics;
DELETE FROM yearly_game_statistics;

-- Clear Game Session Tables
DELETE FROM dealt_cards;
DELETE FROM player_bets;
DELETE FROM game_history;

-- Clear Game Session Table
DELETE FROM game_sessions;

-- Clear User Relationship Tables
DELETE FROM user_referrals;

-- Clear User Table
DELETE FROM users;

-- Clear Configuration Tables
DELETE FROM game_settings;
DELETE FROM stream_settings;
DELETE FROM admin_credentials;

-- Re-enable foreign key checks
SET session_replication_role = 'origin';

-- Verify cleanup completion
SELECT 'Cleanup completed!' as status;
SELECT 'Tables cleared:' as info, 
       (SELECT COUNT(*) FROM users) as users_count,
       (SELECT COUNT(*) FROM game_sessions) as game_sessions_count,
       (SELECT COUNT(*) FROM player_bets) as player_bets_count,
       (SELECT COUNT(*) FROM game_history) as game_history_count;