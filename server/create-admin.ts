// server/create-admin.ts
import { storage } from './storage-supabase';
import { hashPassword } from './auth';

async function createAdmin() {
  try {
    console.log('Creating default admin user...');
    
    // Check if admin already exists
    const existingAdmin = await storage.getUserByUsername('admin@example.com');
    if (existingAdmin) {
      console.log('Admin user already exists');
      return;
    }

    // Create admin user object
    const adminUser = {
      username: 'admin@example.com',
      email: 'admin@example.com',
      password: await hashPassword('Admin123456'), // Default password
      full_name: 'Administrator',
      phone: '',
      role: 'admin',
      status: 'active',
      balance: 10000000, // Higher balance for admin
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const createdAdmin = await storage.createUser(adminUser as any);
    console.log('Admin user created successfully:', createdAdmin.id);

  } catch (error) {
    console.error('Error creating admin user:', error);
  }
}

if (require.main === module) {
  createAdmin();
}
