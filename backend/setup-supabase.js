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
    
    // Execute each statement
    for (const statement of statements) {
      if (statement.trim()) {
        console.log('Executing:', statement.substring(0, 50) + '...');
        const { error } = await supabase.rpc('exec_sql', { sql: statement });
        
        if (error) {
          console.error('Error executing statement:', error);
        } else {
          console.log('Statement executed successfully');
        }
      }
    }
    
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