// server/create-test-user.ts
import { config } from 'dotenv';
config(); // Load environment variables

import { storage } from './storage-supabase.js';
import { hashPassword } from './auth.js';

async function createTestUser() {
  try {
    console.log('Creating test user account...');
    
    // Check if test user already exists
    const existingUser = await storage.getUserByUsername('testuser@example.com');
    if (existingUser) {
      console.log('Test user already exists');
      console.log('Login credentials:');
      console.log('Email: testuser@example.com');
      console.log('Password: Test123456');
      return;
    }

    // Create test user object
    const testUser = {
      username: 'testuser@example.com',
      email: 'testuser@example.com',
      password: await hashPassword('Test123456'), // Simple password for testing
      full_name: 'Test User',
      phone: '+1234567890',
      role: 'player',
      status: 'active',
      balance: 100000, // Default balance for testing
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const createdUser = await storage.createUser(testUser as any);
    console.log('Test user created successfully:', createdUser.id);
    console.log('\nLogin credentials:');
    console.log('Email: testuser@example.com');
    console.log('Password: Test123456');
    console.log('\nYou can now use these credentials to login to the application.');

  } catch (error) {
    console.error('Error creating test user:', error);
  }
}

if (require.main === module) {
  createTestUser();
}
