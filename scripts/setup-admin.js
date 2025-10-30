#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Simple password hashing function (for demo purposes)
function hashPassword(password) {
  // In a real application, use bcrypt or similar
  // This is a simple demo hash
  return 'demo_hash_' + password + '_salt';
}

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

// Use the same configuration as the working storage implementation
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  global: {
    fetch: (url, options = {}) => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
      
      const fetchOptions = {
        ...options,
        signal: controller.signal,
      };
      
      return fetch(url, fetchOptions).finally(() => {
        clearTimeout(timeoutId);
      });
    }
  },
  auth: {
    persistSession: true,
    detectSessionInUrl: false,
  }
});

async function setupAdminAccount() {
  try {
    console.log('🚀 Setting up admin account...');
    console.log('🔍 Testing database connection...');
    
    const testResult = await supabase.from('admin_credentials').select('id').limit(1);
    if (testResult.error) {
      throw new Error(`Database connection test failed: ${testResult.error.message}`);
    }
    
    console.log('✅ Database connection verified');
    
    // Check if admin already exists
    const { data: existingAdmins, error: checkError } = await supabase
      .from('admin_credentials')
      .select('id, username')
      .limit(1);
    
    if (checkError) {
      console.error('❌ Error checking existing admins:', checkError.message);
      return;
    }
    
    if (existingAdmins && existingAdmins.length > 0) {
      console.log(`⚠️  Admin account already exists: ${existingAdmins[0].username}`);
      console.log('💡 Use the existing admin credentials to log in');
      return;
    }
    
    // Default admin credentials
    const defaultAdmin = {
      username: 'admin',
      password: 'admin123', // Change this in production!
      role: 'admin'
    };
    
    console.log('📝 Creating new admin account...');
    console.log(`👤 Username: ${defaultAdmin.username}`);
    console.log(`🔒 Password: ${defaultAdmin.password} (CHANGE THIS IN PRODUCTION!)`);
    
    // Hash the password using our simple hash function
    const hashedPassword = hashPassword(defaultAdmin.password);
    
    // Insert the admin account
    const { data, error } = await supabase
      .from('admin_credentials')
      .insert({
        username: defaultAdmin.username,
        password_hash: hashedPassword,
        role: defaultAdmin.role
      })
      .select()
      .single();
    
    if (error) {
      console.error('❌ Failed to create admin account:', error.message);
      return;
    }
    
    console.log('✅ Admin account created successfully!');
    console.log('\n📋 Admin Account Details:');
    console.log(`   Username: ${defaultAdmin.username}`);
    console.log(`   Password: ${defaultAdmin.password}`);
    console.log(`   Full Name: ${defaultAdmin.full_name}`);
    console.log(`   Email: ${defaultAdmin.email}`);
    console.log(`   Phone: ${defaultAdmin.phone}`);
    
    console.log('\n⚠️  SECURITY WARNING:');
    console.log('   • Change the default password immediately after first login');
    console.log('   • Use a strong, unique password');
    console.log('   • Consider using environment variables for production');
    
  } catch (error) {
    console.error('\n❌ Admin setup failed:', error.message);
    console.error('💡 Error details:', error);
    process.exit(1);
  }
}

// Run the admin setup
setupAdminAccount();