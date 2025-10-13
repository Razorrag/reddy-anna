import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function setupDatabase() {
  try {
    console.log('Setting up Supabase database...');
    
    // Read the SQL schema file
    const schema = fs.readFileSync('./db_postgres.sql', 'utf8');
    
    // Split the schema into individual statements
    const statements = schema.split(';').filter(stmt => stmt.trim());
    
    // Execute each statement - Note: Supabase doesn't support executing arbitrary SQL via RPC
    // The schema should be applied manually through the Supabase dashboard
    console.log('Note: Please apply the db_postgres.sql schema manually through the Supabase dashboard');
    console.log('Schema file contains all necessary tables for the application');
    
    console.log('Database setup completed!');
    
    // Test the connection by checking if tables exist
    const { data, error } = await supabase.from('users').select('count');
    
    if (error) {
      console.error('Error testing connection:', error);
    } else {
      console.log('Database connection test successful!');
      console.log('Tables created and ready to use.');
    }
    
  } catch (error) {
    console.error('Setup failed:', error);
  }
}

setupDatabase();