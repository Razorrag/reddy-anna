#!/usr/bin/env node

/**
 * Generate fresh bcrypt hashes for admin passwords
 */

import bcrypt from 'bcrypt';

async function generateAdminHashes() {
  try {
    console.log('🔐 Generating fresh bcrypt hashes for admin accounts...\n');
    
    const saltRounds = 12; // Match the salt rounds used in server/auth.ts
    
    // Admin password
    const adminPassword = 'admin123';
    const adminHash = await bcrypt.hash(adminPassword, saltRounds);
    
    // Verify the hash works
    const adminValid = await bcrypt.compare(adminPassword, adminHash);
    
    console.log('✅ Generated hashes:\n');
    console.log(`Password: ${adminPassword}`);
    console.log(`Hash: ${adminHash}`);
    console.log(`Verification: ${adminValid ? '✅ PASSED' : '❌ FAILED'}\n`);
    
    console.log('📝 SQL INSERT Statement:\n');
    console.log('-- ============================================');
    console.log('-- CREATE ADMIN ACCOUNTS');
    console.log('-- ============================================');
    console.log(`-- Password: ${adminPassword}`);
    console.log(`-- Hash: ${adminHash}\n`);
    
    console.log(`INSERT INTO admin_credentials (username, password_hash, role) VALUES`);
    console.log(`('admin', '${adminHash}', 'admin'),`);
    console.log(`('rajugarikossu', '${adminHash}', 'admin')`);
    console.log(`ON CONFLICT (username) DO UPDATE SET password_hash = EXCLUDED.password_hash;`);
    
    console.log('\n✅ Fresh hash generated successfully!');
    console.log('\n⚠️  IMPORTANT: Copy the hash above and update your SQL script');
    
    return adminHash;
  } catch (error) {
    console.error('❌ Error generating hash:', error);
    process.exit(1);
  }
}

generateAdminHashes();

