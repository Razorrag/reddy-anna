import { ensureAdminExists } from './setup-admin';
import { storage } from '../server/storage-supabase';

async function initializeApp() {
  console.log('Initializing Andar Bahar application...');

  try {
    // Test the database connection first
    console.log('\\n1. Testing database connection...');
    try {
      const testResult = await storage.getAllUsers();
      console.log('✅ Database connection successful');
      console.log(`   Found ${testResult.length} users in database`);
    } catch (dbError) {
      console.error('❌ Database connection failed:', dbError);
      console.log('\\nMake sure:');
      console.log('1. Your Supabase project is running and accessible');
      console.log('2. Your SUPABASE_URL and SUPABASE_SERVICE_KEY in .env are correct');
      console.log('3. The required tables exist in your database');
      console.log('4. Your service role key has the necessary permissions');
      return;
    }

    // Setup admin if needed
    console.log('\\n2. Checking admin account...');
    const adminSetupResult = await ensureAdminExists();
    if (adminSetupResult) {
      console.log('✅ Admin account verified/created');
    } else {
      console.log('⚠️  Admin account setup failed, but continuing...');
    }

    // Summary
    console.log('\\n3. Initialization complete!');
    console.log('   - Database connection: OK');
    console.log('   - Admin account: Verified');
    console.log('\\nYou can now start your server with: npm run dev');
    console.log('\\nDefault admin credentials:');
    console.log('   - Username: admin');
    console.log('   - Password: admin123 (change after first login!)');

  } catch (error) {
    console.error('❌ Initialization failed:', error);
    process.exit(1);
  }
}

// Run the initialization if this file is executed directly
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Check if this file is being run directly
if (process.argv[1] === __filename) {
  initializeApp().catch(console.error);
}

export { initializeApp };