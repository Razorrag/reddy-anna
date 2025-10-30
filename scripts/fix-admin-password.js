#!/usr/bin/env node

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
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      const fetchOptions = {
        ...options,
        signal: controller.signal,
        // Add retry logic at the fetch level if needed
      };
      
      return fetch(url, fetchOptions).finally(() => {
        clearTimeout(timeoutId);
      });
    }
  },
  auth: {
    // Add auth timeout
    persistSession: true,
    detectSessionInUrl: false,
  }
});

async function fixAdminPassword() {
  try {
    console.log('🔧 Fixing admin password...');
    
    // The correct hash from database-setup.sql
    const correctHash = '$2b$12$Vc738883Bz.Rn6y4N5pP.eNl93jBQ.aJ5sXK3v3jVcQFpNQ7vZ5XW';
    
    // First, let's check if admin exists
    const { data: admin, error: fetchError } = await supabase
      .from('admin_credentials')
      .select('*')
      .eq('username', 'admin')
      .single();
    
    if (fetchError) {
      console.log('❌ Error fetching admin:', fetchError.message);
      return;
    }
    
    if (!admin) {
      console.log('❌ No admin found in database');
      return;
    }
    
    console.log('📋 Current admin record:');
    console.log('- ID:', admin.id);
    console.log('- Username:', admin.username);
    console.log('- Role:', admin.role);
    console.log('- Current hash:', admin.password_hash);
    
    // Test current hash
    const currentValid = await bcrypt.compare('admin123', admin.password_hash);
    console.log('- Current hash valid:', currentValid);
    
    if (currentValid) {
      console.log('✅ Admin password is already correct!');
      return;
    }
    
    // Update the admin password
    const { data, error } = await supabase
      .from('admin_credentials')
      .update({ password_hash: correctHash })
      .eq('username', 'admin')
      .select()
      .single();
    
    if (error) {
      console.log('❌ Error updating admin password:', error.message);
      return;
    }
    
    console.log('✅ Admin password updated successfully!');
    console.log('Admin ID:', data.id);
    console.log('Username:', data.username);
    console.log('Role:', data.role);
    
    // Test the new hash
    console.log('\n🔍 Testing the new password hash...');
    const isValid = await bcrypt.compare('admin123', data.password_hash);
    
    if (isValid) {
      console.log('✅ Password hash is valid! Admin login should now work with username "admin" and password "admin123"');
    } else {
      console.log('❌ Password hash is still invalid');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Run the fix
fixAdminPassword().then(() => {
  console.log('\n🎉 Admin password fix completed!');
}).catch(error => {
  console.error('❌ Fix failed:', error);
  process.exit(1);
});