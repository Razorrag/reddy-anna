import { storage } from '../server/storage-supabase';
import { hashPassword } from '../server/auth';
import bcrypt from 'bcrypt';

async function setupAdmin() {
  try {
    const username = 'admin';
    const password = 'admin123'; // Change this after setup!
    
    console.log('Setting up initial admin account...');
    
    // Check if admin already exists
    const existingAdmin = await storage.getAdminByUsername(username);
    if (existingAdmin) {
      console.log('Admin account already exists');
      return;
    }
    
    const hashedPassword = await hashPassword(password);
    
    // Add admin to database (this assumes the admin_credentials table exists)
    // Use the imported supabaseServer instance
    const { supabaseServer } = await import('../server/lib/supabaseServer');
    const { data, error } = await supabaseServer
      .from('admin_credentials')
      .insert({
        username,
        password_hash: hashedPassword,
        role: 'admin',
        created_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (error) {
      console.error('Error creating admin account:', error);
      console.log('This might mean the admin_credentials table does not exist in your Supabase database.');
      console.log('You need to create this table manually or through migrations.');
      
      // Try to create the table if it doesn\'t exist
      console.log('\\nTo fix this, create the table in your Supabase database:');
      console.log('CREATE TABLE admin_credentials (');
      console.log('  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,');
      console.log('  username VARCHAR(255) UNIQUE NOT NULL,');
      console.log('  password_hash TEXT NOT NULL,');
      console.log('  role VARCHAR(50) DEFAULT \'admin\',');
      console.log('  created_at TIMESTAMP DEFAULT NOW()');
      console.log(');');
      return;
    }
    
    console.log('Admin account created successfully!');
    console.log('Username:', username);
    console.log('Password:', password, '(CHANGE THIS IMMEDIATELY!)');
    console.log('\\nFor security, please change the password after first login!');
  } catch (error) {
    console.error('Error setting up admin:', error);
  }
}

// Also export for use in other scripts
export async function ensureAdminExists() {
  try {
    const existingAdmin = await storage.getAdminByUsername('admin');
    if (existingAdmin) {
      console.log('Admin account already exists, skipping setup');
      return true;
    }
    
    console.log('No admin found, setting up default admin...');
    await setupAdmin();
    return true;
  } catch (error) {
    console.error('Error checking/creating admin:', error);
    return false;
  }
}

// Run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  setupAdmin();
}

export { setupAdmin };