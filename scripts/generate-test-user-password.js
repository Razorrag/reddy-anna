/**
 * Generate bcrypt hash for test user password
 * Password: Test@123
 */

import bcrypt from 'bcrypt';

async function generateHash() {
  try {
    const password = 'Test@123';
    const saltRounds = 12;
    
    console.log('Generating bcrypt hash...');
    console.log('Password:', password);
    console.log('Salt rounds:', saltRounds);
    
    const hash = await bcrypt.hash(password, saltRounds);
    
    console.log('\n✅ Generated hash:');
    console.log(hash);
    
    // Verify the hash
    const isValid = await bcrypt.compare(password, hash);
    console.log('\n✅ Verification:', isValid ? 'PASSED' : 'FAILED');
    
    console.log('\n📝 SQL Update Statement:');
    console.log(`UPDATE users SET password_hash = '${hash}' WHERE phone IN ('9876543210', '9876543211', '9876543212', '9876543213', '9876543214');`);
    
    return hash;
  } catch (error) {
    console.error('❌ Error generating hash:', error);
    process.exit(1);
  }
}

generateHash();







