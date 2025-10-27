-- ============================================
-- QUICK FIX FOR LOGIN ISSUES
-- Run this in your Supabase SQL Editor
-- ============================================

-- Step 1: Check current database state
DO $$
BEGIN
  RAISE NOTICE '=== CHECKING CURRENT DATABASE STATE ===';
END $$;

-- Check if admin exists
DO $$
DECLARE
  admin_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO admin_count FROM admin_credentials WHERE username = 'admin';
  RAISE NOTICE 'Admin accounts found: %', admin_count;
END $$;

-- Check if users table has ENUM or TEXT types
DO $$
DECLARE
  role_type TEXT;
BEGIN
  SELECT data_type INTO role_type 
  FROM information_schema.columns 
  WHERE table_name = 'users' AND column_name = 'role';
  RAISE NOTICE 'Users.role column type: %', COALESCE(role_type, 'TABLE NOT FOUND');
END $$;

-- ============================================
-- Step 2: Create admin account if missing
-- ============================================

-- For TEXT-based schema (supabase_schema.sql or supabase_schema_complete.sql)
INSERT INTO admin_credentials (id, username, password_hash, role, created_at, updated_at) 
SELECT 
  gen_random_uuid()::text,
  'admin',
  '$2b$12$ZAn9noQkk7Adv.efdK/77e8BZark6rSz5I5PfoZUo3rjmeegIbg8K',
  'admin',
  NOW(),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM admin_credentials WHERE username = 'admin');

-- Verify admin was created
DO $$
DECLARE
  admin_exists BOOLEAN;
BEGIN
  SELECT EXISTS(SELECT 1 FROM admin_credentials WHERE username = 'admin') INTO admin_exists;
  IF admin_exists THEN
    RAISE NOTICE '✅ Admin account exists: username=admin, password=admin123';
  ELSE
    RAISE NOTICE '❌ Failed to create admin account';
  END IF;
END $$;

-- ============================================
-- Step 3: Create test user for login testing
-- ============================================

-- Create test user (phone: 9876543210, password: admin123)
INSERT INTO users (id, phone, password_hash, full_name, role, status, balance, created_at, updated_at)
SELECT 
  '9876543210',
  '9876543210',
  '$2b$12$ZAn9noQkk7Adv.efdK/77e8BZark6rSz5I5PfoZUo3rjmeegIbg8K',
  'Test User',
  'player',
  'active',
  100000.00,
  NOW(),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM users WHERE phone = '9876543210');

-- Create another test user (phone: 1234567890, password: admin123)
INSERT INTO users (id, phone, password_hash, full_name, role, status, balance, created_at, updated_at)
SELECT 
  '1234567890',
  '1234567890',
  '$2b$12$ZAn9noQkk7Adv.efdK/77e8BZark6rSz5I5PfoZUo3rjmeegIbg8K',
  'Demo Player',
  'player',
  'active',
  100000.00,
  NOW(),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM users WHERE phone = '1234567890');

-- Verify test users were created
DO $$
DECLARE
  user_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO user_count FROM users;
  RAISE NOTICE '✅ Total users in database: %', user_count;
END $$;

-- ============================================
-- Step 4: Display test credentials
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== TEST CREDENTIALS ===';
  RAISE NOTICE '';
  RAISE NOTICE '🔐 ADMIN LOGIN:';
  RAISE NOTICE '   Username: admin';
  RAISE NOTICE '   Password: admin123';
  RAISE NOTICE '';
  RAISE NOTICE '👤 USER LOGIN #1:';
  RAISE NOTICE '   Phone: 9876543210';
  RAISE NOTICE '   Password: admin123';
  RAISE NOTICE '';
  RAISE NOTICE '👤 USER LOGIN #2:';
  RAISE NOTICE '   Phone: 1234567890';
  RAISE NOTICE '   Password: admin123';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  IMPORTANT: Change these passwords after testing!';
  RAISE NOTICE '';
END $$;

-- ============================================
-- Step 5: Verify database structure
-- ============================================

-- Show all admins
SELECT 
  id,
  username,
  role,
  created_at
FROM admin_credentials
ORDER BY created_at DESC;

-- Show all users
SELECT 
  id,
  phone,
  full_name,
  role,
  status,
  balance,
  created_at
FROM users
ORDER BY created_at DESC;

-- ============================================
-- TROUBLESHOOTING QUERIES
-- ============================================

-- If you need to reset admin password:
-- UPDATE admin_credentials 
-- SET password_hash = '$2b$12$ZAn9noQkk7Adv.efdK/77e8BZark6rSz5I5PfoZUo3rjmeegIbg8K',
--     updated_at = NOW()
-- WHERE username = 'admin';

-- If you need to delete test users:
-- DELETE FROM users WHERE phone IN ('9876543210', '1234567890');

-- If you need to check table structure:
-- SELECT column_name, data_type, is_nullable, column_default
-- FROM information_schema.columns
-- WHERE table_name = 'users'
-- ORDER BY ordinal_position;

-- ============================================
-- COMPLETION MESSAGE
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ QUICK FIX COMPLETE!';
  RAISE NOTICE '';
  RAISE NOTICE '📝 Next Steps:';
  RAISE NOTICE '1. Try logging in with admin credentials';
  RAISE NOTICE '2. Try logging in with user credentials';
  RAISE NOTICE '3. If login still fails, check browser console and server logs';
  RAISE NOTICE '4. Verify Supabase connection in .env file';
  RAISE NOTICE '';
END $$;
