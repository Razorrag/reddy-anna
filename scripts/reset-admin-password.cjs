/**
 * Reset Admin Password Script
 * This script resets the admin password to the default: Admin@123
 * Run with: node scripts/reset-admin-password.cjs
 */

const bcrypt = require('bcrypt');
const { createClient } = require('@supabase/supabase-js');
require('dotenv/config');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing Supabase credentials in .env file');
  console.error('Required: SUPABASE_URL and SUPABASE_SERVICE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function resetAdminPassword() {
  try {
    console.log('🔐 Resetting admin password...\n');

    // The default password
    const defaultPassword = 'Admin@123';
    
    // Generate new password hash
    console.log('📝 Generating password hash for:', defaultPassword);
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(defaultPassword, saltRounds);
    console.log('✅ Password hash generated:', passwordHash.substring(0, 20) + '...\n');

    // Check if admin exists
    console.log('🔍 Checking for existing admin...');
    const { data: existingAdmin, error: checkError } = await supabase
      .from('admin_credentials')
      .select('*')
      .eq('username', 'admin')
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('❌ Error checking for admin:', checkError);
      throw checkError;
    }

    if (existingAdmin) {
      // Update existing admin
      console.log('📝 Updating existing admin password...');
      const { data, error } = await supabase
        .from('admin_credentials')
        .update({ password_hash: passwordHash })
        .eq('username', 'admin')
        .select();

      if (error) {
        console.error('❌ Error updating admin password:', error);
        throw error;
      }

      console.log('✅ Admin password updated successfully!\n');
    } else {
      // Create new admin
      console.log('📝 Creating new admin account...');
      const { data, error } = await supabase
        .from('admin_credentials')
        .insert({
          username: 'admin',
          password_hash: passwordHash,
          role: 'admin'
        })
        .select();

      if (error) {
        console.error('❌ Error creating admin:', error);
        throw error;
      }

      console.log('✅ Admin account created successfully!\n');
    }

    // Verify the password works
    console.log('🔍 Verifying password...');
    const { data: admin, error: verifyError } = await supabase
      .from('admin_credentials')
      .select('*')
      .eq('username', 'admin')
      .single();

    if (verifyError) {
      console.error('❌ Error verifying admin:', verifyError);
      throw verifyError;
    }

    const isValid = await bcrypt.compare(defaultPassword, admin.password_hash);
    
    if (isValid) {
      console.log('✅ Password verification successful!\n');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('🎉 Admin password has been reset!');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('\n📋 Admin Credentials:');
      console.log('   Username: admin');
      console.log('   Password: Admin@123');
      console.log('\n🌐 Admin Panel URLs:');
      console.log('   • http://localhost:5000/admin-game');
      console.log('   • http://localhost:5000/game-admin');
      console.log('   • http://localhost:5000/admin-control');
      console.log('\n⚠️  IMPORTANT: Change this password after first login!');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    } else {
      console.error('❌ Password verification failed!');
      console.error('The password was set but verification failed.');
      console.error('This might indicate a bcrypt configuration issue.');
    }

  } catch (error) {
    console.error('\n❌ Failed to reset admin password:', error);
    console.error('\nTroubleshooting:');
    console.error('1. Check your .env file has correct SUPABASE_URL and SUPABASE_SERVICE_KEY');
    console.error('2. Verify the admin_credentials table exists in Supabase');
    console.error('3. Check your internet connection');
    process.exit(1);
  }
}

// Run the script
resetAdminPassword();
