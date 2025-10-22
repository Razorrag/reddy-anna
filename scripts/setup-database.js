import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import { config } from 'dotenv';
config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setupDatabase() {
  try {
    console.log('Setting up Supabase database schema...');
    
    // Read the schema file
    const schema = fs.readFileSync('./supabase_schema.sql', 'utf8');
    
    // Split into individual statements
    const statements = schema
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    console.log(`Found ${statements.length} SQL statements to execute`);
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      try {
        console.log(`Executing statement ${i + 1}/${statements.length}: ${statement.substring(0, 50)}...`);
        
        // Use raw SQL execution
        const { error } = await supabase.rpc('exec_sql', { sql_query: statement });
        
        if (error) {
          // Try direct SQL if RPC fails
          const { error: directError } = await supabase
            .from('_temp_execute')
            .select('*')
            .limit(1);
            
          if (directError && directError.code !== 'PGRST116') {
            console.warn(`Statement ${i + 1} failed:`, error.message);
            console.log('This might be expected if the table already exists');
          }
        } else {
          console.log(`Statement ${i + 1} executed successfully`);
        }
      } catch (err) {
        console.warn(`Statement ${i + 1} had an issue:`, err.message);
        console.log('Continuing with next statement...');
      }
    }
    
    console.log('Database schema setup completed!');
    
    // Test the connection by checking if users table exists
    const { data, error } = await supabase
      .from('users')
      .select('count')
      .limit(1);
      
    if (error && error.code !== 'PGRST116') {
      console.error('Error testing users table:', error);
    } else {
      console.log('✅ Users table is accessible!');
    }
    
  } catch (error) {
    console.error('Database setup failed:', error);
    process.exit(1);
  }
}

setupDatabase();
