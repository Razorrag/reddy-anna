-- ============================================
-- UPDATE PASSWORD HASHES FOR ADMIN AND TEST USERS
-- ============================================
-- This script updates password hashes with fresh bcrypt hashes
-- Run this in Supabase SQL Editor
-- ============================================

-- Update Admin Accounts
-- Password: admin123
-- Hash generated with bcrypt (salt rounds: 12)
UPDATE admin_credentials 
SET password_hash = '$2b$12$kboT2aS9EqAQjfbcAGL3GOYSBtrJsgq2eLPxonASwnnUjeNfNZ9ZW',
    updated_at = NOW()
WHERE username IN ('admin', 'rajugarikossu');

-- Update Test User Accounts
-- Password: Test@123
-- Hash generated with bcrypt (salt rounds: 12)
UPDATE users 
SET password_hash = '$2b$12$tRhJv.A9JJ2rKdJp2rCmcePr.QDZTtAxLZTbILHFsuLYUhxshkaKu',
    updated_at = NOW()
WHERE phone IN ('9876543210', '9876543211', '9876543212', '9876543213', '9876543214');

-- Verify updates
SELECT 'Admin credentials updated:' as status;
SELECT username, role, updated_at FROM admin_credentials WHERE username IN ('admin', 'rajugarikossu');

SELECT 'Test users updated:' as status;
SELECT id, phone, full_name, updated_at FROM users WHERE phone IN ('9876543210', '9876543211', '9876543212', '9876543213', '9876543214');

SELECT '✅ Password hashes updated successfully!' as result;

