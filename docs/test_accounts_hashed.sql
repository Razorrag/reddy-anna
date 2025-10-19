-- =============================================
-- Test Accounts with Properly Hashed Passwords
-- =============================================
-- This file contains test accounts with bcrypt-hashed passwords
-- Run this to update the existing test users with proper password hashes

-- Password hashes generated using bcrypt (cost: 10)
-- password123 -> $2b$10$iH4ZEoUbWHt2hRYOqXgFOuN48/arnnTMVEtI2kgtjAenSvtgFD97q
-- admin123 -> $2b$10$Y656xjbv3uL8Q3Yd3gmFduowh3YhKeGbRl6Pd1xX59T6UeLIr2hNK

-- Update test users with properly hashed passwords
UPDATE users SET password = '$2b$10$iH4ZEoUbWHt2hRYOqXgFOuN48/arnnTMVEtI2kgtjAenSvtgFD97q' WHERE username = 'testplayer1';
UPDATE users SET password = '$2b$10$iH4ZEoUbWHt2hRYOqXgFOuN48/arnnTMVEtI2kgtjAenSvtgFD97q' WHERE username = 'testplayer2';
UPDATE users SET password = '$2b$10$Y656xjbv3uL8Q3Yd3gmFduowh3YhKeGbRl6Pd1xX59T6UeLIr2hNK' WHERE username = 'admin';

-- Verify the updates
SELECT username, full_name, balance, created_at FROM users WHERE username IN ('testplayer1', 'testplayer2', 'admin');

SELECT '✅ Test accounts updated with properly hashed passwords!' as status;
