#!/usr/bin/env node

/**
 * Update all admin accounts with fresh bcrypt hash
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

async function updateAllAdminPasswords() {
  try {
    console.log('🔐 Updating all admin accounts with fresh bcrypt hash...\n');
    
    // Admin password to use
    const adminPassword = 'admin123';
    const saltRounds = 12;
    
    // Generate fresh hash
    console.log('📝 Generating fresh bcrypt hash...');
    const freshHash = await bcrypt.hash(adminPassword, saltRounds);
    console.log(`✅ Generated hash: ${freshHash}\n`);
    
    // Verify the hash works
    const isValid = await bcrypt.compare(adminPassword, freshHash);
    if (!isValid) {
      throw new Error('Generated hash verification failed!');
    }
    console.log('✅ Hash verification passed\n');
    
    // Get all existing admin accounts
    console.log('🔍 Fetching all admin accounts...');
    const { data: admins, error: fetchError } = await supabase
      .from('admin_credentials')
      .select('id, username, password_hash');
    
    if (fetchError) {
      throw new Error(`Failed to fetch admin accounts: ${fetchError.message}`);
    }
    
    if (!admins || admins.length === 0) {
      console.log('⚠️  No admin accounts found in database.');
      console.log('💡 Creating default admin account...');
      
      // Create default admin account
      const { data: newAdmin, error: createError } = await supabase
        .from('admin_credentials')
        .insert({
          username: 'admin',
          password_hash: freshHash,
          role: 'admin'
        })
        .select()
        .single();
      
      if (createError) {
        throw new Error(`Failed to create admin account: ${createError.message}`);
      }
      
      console.log('✅ Created default admin account:');
      console.log(`   Username: ${newAdmin.username}`);
      console.log(`   ID: ${newAdmin.id}`);
      return;
    }
    
    console.log(`📋 Found ${admins.length} admin account(s):`);
    admins.forEach((admin, index) => {
      console.log(`   ${index + 1}. ${admin.username} (ID: ${admin.id})`);
    });
    console.log('');
    
    // Update all admin passwords (update each one individually to avoid WHERE clause issues)
    console.log('🔄 Updating all admin passwords...');
    const updatedAdmins = [];
    
    for (const admin of admins) {
      const { data: updatedAdmin, error: updateError } = await supabase
        .from('admin_credentials')
        .update({ password_hash: freshHash })
        .eq('id', admin.id)
        .select('id, username')
        .single();
      
      if (updateError) {
        console.error(`❌ Failed to update ${admin.username}: ${updateError.message}`);
        continue;
      }
      
      updatedAdmins.push(updatedAdmin);
    }
    
    if (updatedAdmins.length === 0) {
      throw new Error('Failed to update any admin accounts');
    }
    
    console.log(`✅ Successfully updated ${updatedAdmins.length} admin account(s):`);
    updatedAdmins.forEach((admin, index) => {
      console.log(`   ${index + 1}. ${admin.username} (ID: ${admin.id})`);
    });
    console.log('');
    
    console.log('📝 Updated Admin Credentials:');
    console.log(`   Username: admin (and all other admins)`);
    console.log(`   Password: ${adminPassword}`);
    console.log(`   Hash: ${freshHash}`);
    console.log('');
    console.log('⚠️  IMPORTANT: Change the default password after first login!');
    console.log('✅ All admin accounts have been updated successfully!');
    
  } catch (error) {
    console.error('\n❌ Error updating admin passwords:', error.message);
    console.error('💡 Error details:', error);
    process.exit(1);
  }
}

// Run the update
updateAllAdminPasswords();

