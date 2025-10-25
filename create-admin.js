// Script to create an admin user in Supabase
import { supabaseServer } from './server/lib/supabaseServer.js';
import bcrypt from 'bcrypt';

async function createAdminUser() {
  try {
    // Hash the password
    const password = 'admin123';
    const hashedPassword = await bcrypt.hash(password, 12);
    
    // Admin user data
    const adminUser = {
      username: 'admin',
      password_hash: hashedPassword,
      role: 'admin'
    };

    // Check if admin user already exists
    const { data: existingAdmin, error: fetchError } = await supabaseServer
      .from('admin_credentials')
      .select('id')
      .eq('username', 'admin')
      .single();

    if (existingAdmin) {
      console.log('Admin user already exists');
      return;
    }

    // Insert the new admin user
    const { data, error } = await supabaseServer
      .from('admin_credentials')
      .insert([adminUser])
      .select();

    if (error) {
      console.error('Error creating admin user:', error.message);
      return;
    }

    console.log('Admin user created successfully!');
    console.log('Username: admin');
    console.log('Password: admin123');
  } catch (error) {
    console.error('Error creating admin user:', error.message);
  }
}

createAdminUser();