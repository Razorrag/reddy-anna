#!/usr/bin/env node

/**
 * Generate fresh bcrypt hashes for both admin and test user accounts
 */

import bcrypt from 'bcrypt';

async function generateAllHashes() {
  try {
    console.log('🔐 Generating fresh bcrypt hashes for all accounts...\n');
    
    const saltRounds = 12; // Match the salt rounds used in server/auth.ts
    
    // Admin password
    const adminPassword = 'admin123';
    const adminHash = await bcrypt.hash(adminPassword, saltRounds);
    const adminValid = await bcrypt.compare(adminPassword, adminHash);
    
    // Test user password
    const testUserPassword = 'Test@123';
    const testUserHash = await bcrypt.hash(testUserPassword, saltRounds);
    const testUserValid = await bcrypt.compare(testUserPassword, testUserHash);
    
    console.log('✅ Generated hashes:\n');
    console.log('📝 ADMIN ACCOUNTS:');
    console.log(`   Password: ${adminPassword}`);
    console.log(`   Hash: ${adminHash}`);
    console.log(`   Verification: ${adminValid ? '✅ PASSED' : '❌ FAILED'}\n`);
    
    console.log('📝 TEST USER ACCOUNTS:');
    console.log(`   Password: ${testUserPassword}`);
    console.log(`   Hash: ${testUserHash}`);
    console.log(`   Verification: ${testUserValid ? '✅ PASSED' : '❌ FAILED'}\n`);
    
    console.log('📝 SQL INSERT STATEMENTS:\n');
    console.log('-- ============================================');
    console.log('-- CREATE ADMIN ACCOUNTS');
    console.log('-- ============================================');
    console.log(`-- Password: ${adminPassword}`);
    console.log(`-- Hash: ${adminHash}\n`);
    
    console.log(`INSERT INTO admin_credentials (username, password_hash, role) VALUES`);
    console.log(`('admin', '${adminHash}', 'admin'),`);
    console.log(`('rajugarikossu', '${adminHash}', 'admin')`);
    console.log(`ON CONFLICT (username) DO UPDATE SET password_hash = EXCLUDED.password_hash;\n`);
    
    console.log('-- ============================================');
    console.log('-- CREATE TEST USER ACCOUNTS');
    console.log('-- ============================================');
    console.log(`-- Password: ${testUserPassword}`);
    console.log(`-- Hash: ${testUserHash}\n`);
    
    console.log(`INSERT INTO users (id, phone, password_hash, full_name, role, status, balance, referral_code_generated) VALUES`);
    console.log(`('9876543210', '9876543210', '${testUserHash}', 'Test Player 1', 'player', 'active', 100000.00, 'RAJUGARIKOSSU0001'),`);
    console.log(`('9876543211', '9876543211', '${testUserHash}', 'Test Player 2', 'player', 'active', 50000.00, 'RAJUGARIKOSSU0002'),`);
    console.log(`('9876543212', '9876543212', '${testUserHash}', 'Test Player 3', 'player', 'active', 75000.00, 'RAJUGARIKOSSU0003'),`);
    console.log(`('9876543213', '9876543213', '${testUserHash}', 'Test Player 4', 'player', 'active', 25000.00, 'RAJUGARIKOSSU0004'),`);
    console.log(`('9876543214', '9876543214', '${testUserHash}', 'Test Player 5', 'player', 'active', 10000.00, 'RAJUGARIKOSSU0005')`);
    console.log(`ON CONFLICT (id) DO UPDATE SET`);
    console.log(`  password_hash = EXCLUDED.password_hash,`);
    console.log(`  balance = EXCLUDED.balance,`);
    console.log(`  status = EXCLUDED.status;`);
    
    console.log('\n✅ Fresh hashes generated successfully!');
    console.log('\n⚠️  IMPORTANT: Copy the hashes above and update your SQL script');
    
    return { adminHash, testUserHash };
  } catch (error) {
    console.error('❌ Error generating hashes:', error);
    process.exit(1);
  }
}

generateAllHashes();

