#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { hashPassword } from '../server/auth';
import bcrypt from 'bcrypt';

// Get the directory name of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from the root directory
config({ path: path.resolve(__dirname, '..', '.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials. Please check your .env file.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function resetAdminPassword() {
  try {
    console.log('🔧 Resetting admin password...');
    
    // Default password from documentation
    const password = 'Admin@123';
    
    // Generate a fresh hash using the same function as the auth system
    const newHash = await hashPassword(password);
    console.log('✅ Generated new password hash');
    
    // First, check if admin exists
    const { data: admin, error: fetchError } = await supabase
      .from('admin_credentials')
      .select('*')
      .eq('username', 'admin')
      .single();
    
    if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 = not found
      console.error('❌ Error fetching admin:', fetchError.message);
      return false;
    }
    
    if (!admin) {
      console.log('⚠️  Admin not found, creating new admin account...');
      
      // Create new admin account
      const { data: newAdmin, error: createError } = await supabase
        .from('admin_credentials')
        .insert({
          username: 'admin',
          password_hash: newHash,
          role: 'admin',
          created_at: new Date().toISOString()
        })
        .select()
        .single();
      
      if (createError) {
        console.error('❌ Error creating admin account:', createError.message);
        return false;
      }
      
      console.log('✅ Admin account created successfully!');
      
      // Test the password
      const isValid = await bcrypt.compare(password, newAdmin.password_hash);
      if (isValid) {
        console.log('✅ Password hash verified successfully!');
      } else {
        console.error('❌ Password hash verification failed!');
        return false;
      }
    } else {
      console.log('📋 Found existing admin account:');
      console.log('   - ID:', admin.id);
      console.log('   - Username:', admin.username);
      console.log('   - Role:', admin.role);
      
      // Test current hash
      const currentValid = await bcrypt.compare(password, admin.password_hash);
      if (currentValid) {
        console.log('✅ Current password is already correct!');
        console.log('   Username: admin');
        console.log('   Password: Admin@123');
        return true;
      }
      
      console.log('🔄 Updating admin password hash...');
      
      // Update the admin password
      const { data: updatedAdmin, error: updateError } = await supabase
        .from('admin_credentials')
        .update({ password_hash: newHash })
        .eq('username', 'admin')
        .select()
        .single();
      
      if (updateError) {
        console.error('❌ Error updating admin password:', updateError.message);
        return false;
      }
      
      console.log('✅ Admin password updated successfully!');
      
      // Test the new password
      const isValid = await bcrypt.compare(password, updatedAdmin.password_hash);
      if (isValid) {
        console.log('✅ Password hash verified successfully!');
      } else {
        console.error('❌ Password hash verification failed!');
        return false;
      }
    }
    
    console.log('\n📋 Admin Credentials:');
    console.log('   Username: admin');
    console.log('   Password: Admin@123');
    console.log('\n⚠️  SECURITY WARNING: Change this password after first login!');
    
    return true;
    
  } catch (error: any) {
    console.error('❌ Error resetting admin password:', error.message);
    return false;
  }
}

// Run the reset
resetAdminPassword().then((success) => {
  if (success) {
    console.log('\n🎉 Admin password reset completed successfully!');
    process.exit(0);
  } else {
    console.log('\n❌ Admin password reset failed!');
    process.exit(1);
  }
}).catch((error) => {
  console.error('❌ Unexpected error:', error);
  process.exit(1);
});


