// Generate password hashes for admin and test users
import bcrypt from 'bcryptjs';

async function generateHashes() {
  console.log('Generating password hashes...\n');
  
  // Admin credentials
  const adminPassword = 'admin123';
  const adminHash = await bcrypt.hash(adminPassword, 10);
  console.log('=== ADMIN CREDENTIALS ===');
  console.log('Username: admin');
  console.log('Password:', adminPassword);
  console.log('Hash:', adminHash);
  console.log('');
  
  // Test player 1
  const player1Password = 'player123';
  const player1Hash = await bcrypt.hash(player1Password, 10);
  console.log('=== TEST PLAYER 1 ===');
  console.log('Phone: 9876543210');
  console.log('Name: Test Player 1');
  console.log('Password:', player1Password);
  console.log('Hash:', player1Hash);
  console.log('');
  
  // Test player 2
  const player2Password = 'player123';
  const player2Hash = await bcrypt.hash(player2Password, 10);
  console.log('=== TEST PLAYER 2 ===');
  console.log('Phone: 9876543211');
  console.log('Name: Test Player 2');
  console.log('Password:', player2Password);
  console.log('Hash:', player2Hash);
  console.log('');
  
  // Test player 3
  const player3Password = 'player123';
  const player3Hash = await bcrypt.hash(player3Password, 10);
  console.log('=== TEST PLAYER 3 ===');
  console.log('Phone: 9876543212');
  console.log('Name: Test Player 3');
  console.log('Password:', player3Password);
  console.log('Hash:', player3Hash);
  console.log('');
  
  // Output SQL INSERT statements
  console.log('\n=== SQL INSERT STATEMENTS ===\n');
  
  console.log(`-- Admin user`);
  console.log(`INSERT INTO admin_credentials (id, username, password_hash, role, created_at, updated_at)`);
  console.log(`VALUES (gen_random_uuid(), 'admin', '${adminHash}', 'admin', NOW(), NOW());`);
  console.log('');
  
  console.log(`-- Test players`);
  console.log(`INSERT INTO users (id, phone, password_hash, full_name, role, status, balance, created_at, updated_at)`);
  console.log(`VALUES `);
  console.log(`  ('9876543210', '9876543210', '${player1Hash}', 'Test Player 1', 'player', 'active', 100000.00, NOW(), NOW()),`);
  console.log(`  ('9876543211', '9876543211', '${player2Hash}', 'Test Player 2', 'player', 'active', 100000.00, NOW(), NOW()),`);
  console.log(`  ('9876543212', '9876543212', '${player3Hash}', 'Test Player 3', 'player', 'active', 100000.00, NOW(), NOW());`);
}

generateHashes().catch(console.error);
