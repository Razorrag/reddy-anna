import bcrypt from 'bcryptjs';

async function generateHashes() {
  try {
    const passwordHash = await bcrypt.hash('password123', 10);
    const adminHash = await bcrypt.hash('admin123', 10);
    
    console.log('password123 hash:', passwordHash);
    console.log('admin123 hash:', adminHash);
    
    // Generate SQL update statements
    console.log('\n-- SQL Update Statements:');
    console.log('UPDATE users SET password = \'' + passwordHash + '\' WHERE username = \'testplayer1\';');
    console.log('UPDATE users SET password = \'' + passwordHash + '\' WHERE username = \'testplayer2\';');
    console.log('UPDATE users SET password = \'' + adminHash + '\' WHERE username = \'admin\';');
  } catch (error) {
    console.error('Error generating hashes:', error);
  }
}

generateHashes();
