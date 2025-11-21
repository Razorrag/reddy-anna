#!/usr/bin/env node

/**
 * Update all test user accounts with fresh bcrypt hash
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcrypt';

// Get the directory name of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from the root directory
config({ path: path.resolve(__dirname, '..', '.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials. Please check your .env file.');
  console.error('   Required: SUPABASE_URL and SUPABASE_SERVICE_KEY (or SUPABASE_SERVICE_ROLE_KEY)');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function updateAllTestUserPasswords() {
  try {
    console.log('🔐 Updating all test user accounts with fresh bcrypt hash...\n');
    
    // Test user password to use (from reset script)
    const testUserPassword = 'Test@123';
    const saltRounds = 12;
    
    // Generate fresh hash
    console.log('📝 Generating fresh bcrypt hash...');
    const freshHash = await bcrypt.hash(testUserPassword, saltRounds);
    console.log(`✅ Generated hash: ${freshHash}\n`);
    
    // Verify the hash works
    const isValid = await bcrypt.compare(testUserPassword, freshHash);
    if (!isValid) {
      throw new Error('Generated hash verification failed!');
    }
    console.log('✅ Hash verification passed\n');
    
    // Get all test users (by phone numbers from reset script)
    const testUserPhones = [
      '9876543210',
      '9876543211',
      '9876543212',
      '9876543213',
      '9876543214'
    ];
    
    console.log('🔍 Fetching test users...');
    const { data: users, error: fetchError } = await supabase
      .from('users')
      .select('id, phone, full_name')
      .in('phone', testUserPhones);
    
    if (fetchError) {
      throw new Error(`Failed to fetch test users: ${fetchError.message}`);
    }
    
    if (!users || users.length === 0) {
      console.log('⚠️  No test users found in database.');
      console.log('💡 Test users will be created when you run the reset script.');
      return;
    }
    
    console.log(`📋 Found ${users.length} test user(s):`);
    users.forEach((user, index) => {
      console.log(`   ${index + 1}. ${user.full_name || user.phone} (Phone: ${user.phone}, ID: ${user.id})`);
    });
    console.log('');
    
    // Update all test user passwords (update each one individually)
    console.log('🔄 Updating all test user passwords...');
    const updatedUsers = [];
    
    for (const user of users) {
      const { data: updatedUser, error: updateError } = await supabase
        .from('users')
        .update({ password_hash: freshHash })
        .eq('id', user.id)
        .select('id, phone, full_name')
        .single();
      
      if (updateError) {
        console.error(`❌ Failed to update ${user.phone}: ${updateError.message}`);
        continue;
      }
      
      updatedUsers.push(updatedUser);
    }
    
    if (updatedUsers.length === 0) {
      throw new Error('Failed to update any test users');
    }
    
    console.log(`✅ Successfully updated ${updatedUsers.length} test user(s):`);
    updatedUsers.forEach((user, index) => {
      console.log(`   ${index + 1}. ${user.full_name || user.phone} (Phone: ${user.phone}, ID: ${user.id})`);
    });
    console.log('');
    
    console.log('📝 Updated Test User Credentials:');
    console.log(`   Password: ${testUserPassword}`);
    console.log(`   Hash: ${freshHash}`);
    console.log('');
    console.log('📋 Test User Accounts:');
    console.log('   Phone: 9876543210, Password: Test@123, Balance: ₹1,00,000');
    console.log('   Phone: 9876543211, Password: Test@123, Balance: ₹50,000');
    console.log('   Phone: 9876543212, Password: Test@123, Balance: ₹75,000');
    console.log('   Phone: 9876543213, Password: Test@123, Balance: ₹25,000');
    console.log('   Phone: 9876543214, Password: Test@123, Balance: ₹10,000');
    console.log('');
    console.log('✅ All test user accounts have been updated successfully!');
    
  } catch (error) {
    console.error('\n❌ Error updating test user passwords:', error.message);
    console.error('💡 Error details:', error);
    process.exit(1);
  }
}

// Run the update
updateAllTestUserPasswords();

