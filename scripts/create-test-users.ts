/**
 * Test Data Setup Script
 * 
 * This script creates test users and admin accounts for the Andar Bahar game.
 * It creates:
 * - 2 admin accounts with username/password authentication
 * - 5 test player accounts with phone/password authentication and ₹100,000 balance
 */

import { storage } from '../server/storage-supabase';
import { hashPassword } from '../server/auth';

async function createTestData() {
  console.log('🎲 Creating test data for Andar Bahar game...');

  try {
    // Create admin accounts
    console.log('\n👑 Creating admin accounts...');
    
    const adminPassword = await hashPassword('admin123');
    console.log('✅ Admin password hash created');
    
    // Note: Admin accounts should be created in the admin_credentials table
    // This would require a separate storage method for admin credentials
    console.log('📝 Admin accounts to be created manually:');
    console.log('   - Username: admin, Password: admin123');
    console.log('   - Username: rajugarikossu, Password: admin123');

    // Create test player users with ₹100,000 balance
    console.log('\n🎮 Creating test player accounts...');
    
    const testPlayers = [
      { phone: '9876543210', name: 'Test Player 1' },
      { phone: '9876543211', name: 'Test Player 2' },
      { phone: '9876543212', name: 'Test Player 3' },
      { phone: '9876543213', name: 'Test Player 4' },
      { phone: '9876543214', name: 'Test Player 5' }
    ];

    const playerPassword = await hashPassword('password123');
    console.log('✅ Player password hash created');

    for (const player of testPlayers) {
      try {
        // Check if user already exists
        const existingUser = await storage.getUserByPhone(player.phone);
        
        if (existingUser) {
          console.log(`⚠️  User with phone ${player.phone} already exists, skipping...`);
          continue;
        }

        // Create new user with phone as ID and ₹100,000 balance
        const newUser = await storage.createUser({
          id: player.phone, // Use phone as ID
          phone: player.phone,
          password: playerPassword,
          name: player.name,
          balance: 100000.00 // ₹100,000 default balance
        });

        console.log(`✅ Created test player: ${player.name} (${player.phone}) with balance ₹100,000`);
      } catch (error) {
        console.error(`❌ Error creating player ${player.phone}:`, error);
      }
    }

    console.log('\n🎉 Test data creation completed!');
    console.log('\n📋 Test Accounts Summary:');
    console.log('\n👑 Admin Accounts:');
    console.log('   - Username: admin, Password: admin123');
    console.log('   - Username: rajugarikossu, Password: admin123');
    
    console.log('\n🎮 Player Accounts:');
    testPlayers.forEach(player => {
      console.log(`   - Phone: ${player.phone}, Password: password123, Balance: ₹100,000`);
    });

    console.log('\n🔗 Quick Login URLs:');
    console.log('   - Admin Login: http://localhost:5000/admin-login');
    console.log('   - Player Login: http://localhost:5000/login');
    console.log('   - Game: http://localhost:5000/game');

  } catch (error) {
    console.error('❌ Error creating test data:', error);
    process.exit(1);
  }
}

// SQL commands for manual admin account creation
console.log(`
📝 Manual SQL Commands for Admin Accounts:

-- Connect to your Supabase database and run these commands:

-- Create admin credentials table (if not exists)
CREATE TABLE IF NOT EXISTS admin_credentials (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'admin',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert admin accounts (password: admin123)
INSERT INTO admin_credentials (username, password_hash, role) VALUES
('admin', '$2b$12$2wLKU1mQY7z5FZ.zj7uN5uF8B5K8d4N3R9V7m6J2L1K0P9W5U3Z1A', 'admin'),
('rajugarikossu', '$2b$12$2wLKU1mQY7z5FZ.zj7uN5uF8B5K8d4N3R9V7m6J2L1K0P9W5U3Z1A', 'admin')
ON CONFLICT (username) DO NOTHING;

-- Create indexes for admin credentials
CREATE INDEX IF NOT EXISTS idx_admin_credentials_username ON admin_credentials(username);
`);

// Run the test data creation
createTestData().then(() => {
  console.log('\n✅ Test data setup script completed successfully!');
  process.exit(0);
}).catch((error) => {
  console.error('\n❌ Test data setup script failed:', error);
  process.exit(1);
});