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

async function createAdminWithCorrectHash() {
  try {
    console.log('🚀 Creating admin account with correct bcrypt hash...');
    
    // The exact SQL from database-setup.sql
    const adminSQL = `
      INSERT INTO admin_credentials (username, password_hash, role) 
      VALUES ('admin', '$2b$12$Vc738883Bz.Rn6y4N5pP.eNl93jBQ.aJ5sXK3v3jVcQFpNQ7vZ5XW', 'admin')
      ON CONFLICT (username) DO NOTHING;
    `;
    
    // Execute the SQL directly
    const { data, error } = await supabase.rpc('sql', { 
      query: adminSQL 
    });
    
    if (error) {
      console.error('❌ Failed to create admin account:', error.message);
      return false;
    }
    
    console.log('✅ Admin account created successfully!');
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
createAdminWithCorrectHash().then(success => {
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