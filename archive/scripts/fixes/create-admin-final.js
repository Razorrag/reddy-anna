#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

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

async function createAdminFinal() {
  try {
    console.log('🚀 Creating admin account with correct bcrypt hash...');
    
    // First, check if admin exists
    const { data: existingAdmin, error: checkError } = await supabase
      .from('admin_credentials')
      .select('id, username')
      .eq('username', 'admin')
      .single();
    
    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('❌ Error checking existing admin:', checkError.message);
      return false;
    }
    
    if (existingAdmin) {
      console.log('💡 Admin already exists, updating password hash...');
      
      // Update existing admin with correct hash
      const { data, error } = await supabase
        .from('admin_credentials')
        .update({
          password_hash: '$2b$12$Vc738883Bz.Rn6y4N5pP.eNl93jBQ.aJ5sXK3v3jVcQFpNQ7vZ5XW'
        })
        .eq('username', 'admin')
        .select();
        
      if (error) {
        console.error('❌ Failed to update admin password:', error.message);
        return false;
      }
      
      console.log('✅ Admin password updated successfully!');
    } else {
      console.log('📝 Creating new admin account...');
      
      // Create new admin with correct hash
      const { data, error } = await supabase
        .from('admin_credentials')
        .insert({
          username: 'admin',
          password_hash: '$2b$12$Vc738883Bz.Rn6y4N5pP.eNl93jBQ.aJ5sXK3v3jVcQFpNQ7vZ5XW',
          role: 'admin'
        })
        .select();
        
      if (error) {
        console.error('❌ Failed to create admin account:', error.message);
        return false;
      }
      
      console.log('✅ Admin account created successfully!');
    }
    
    console.log('\n📋 Admin Account Details:');
    console.log('   Username: admin');
    console.log('   Password: admin123');
    console.log('   Role: admin');
    console.log('   Password Hash: $2b$12$Vc738883Bz.Rn6y4N5pP.eNl93jBQ.aJ5sXK3v3jVcQFpNQ7vZ5XW');
    
    return true;
    
  } catch (error) {
    console.error('❌ Admin creation failed:', error.message);
    return false;
  }
}

// Run the admin creation
createAdminFinal().then(success => {
  if (success) {
    console.log('\n🎉 Admin setup completed successfully!');
    console.log('💡 You can now log in with:');
    console.log('   Username: admin');
    console.log('   Password: admin123');
  } else {
    console.log('\n❌ Admin setup failed. Please check the error messages above.');
    process.exit(1);
  }
});