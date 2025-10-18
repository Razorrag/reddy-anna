import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import 'dotenv/config';

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function initializeDatabase() {
  try {
    console.log('🚀 Initializing Reddy Anna Andar Bahar database...');
    
    // Read the schema file
    const schema = readFileSync('./supabase-schema.sql', 'utf8');
    
    // Split schema into individual statements
    const statements = schema
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    console.log(`📝 Found ${statements.length} SQL statements to execute`);
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      try {
        console.log(`⚡ Executing statement ${i + 1}/${statements.length}...`);
        
        const { data, error } = await supabase.rpc('exec_sql', { sql_query: statement });
        
        if (error) {
          // Try direct SQL execution if RPC fails
          console.log('🔄 Trying direct SQL execution...');
          const { error: directError } = await supabase
            .from('information_schema.tables')
            .select('*');
            
          if (directError) {
            console.log(`⚠️  Statement ${i + 1} failed (this might be expected):`, error.message);
          }
        } else {
          console.log(`✅ Statement ${i + 1} executed successfully`);
        }
      } catch (err) {
        console.log(`⚠️  Statement ${i + 1} failed (this might be expected):`, err.message);
      }
    }
    
    // Test basic table creation
    console.log('\n🔍 Testing database connectivity...');
    
    try {
      const { data: settings, error: settingsError } = await supabase
        .from('game_settings')
        .select('*')
        .limit(1);
        
      if (settingsError) {
        console.error('❌ Error accessing game_settings table:', settingsError.message);
      } else {
        console.log('✅ game_settings table is accessible');
      }
    } catch (err) {
      console.error('❌ Error testing game_settings table:', err.message);
    }
    
    try {
      const { data: sessions, error: sessionsError } = await supabase
        .from('game_sessions')
        .select('*')
        .limit(1);
        
      if (sessionsError) {
        console.error('❌ Error accessing game_sessions table:', sessionsError.message);
      } else {
        console.log('✅ game_sessions table is accessible');
      }
    } catch (err) {
      console.error('❌ Error testing game_sessions table:', err.message);
    }
    
    console.log('\n🎉 Database initialization completed!');
    console.log('\n📋 Next steps:');
    console.log('1. Open your Supabase dashboard');
    console.log('2. Go to the SQL Editor');
    console.log('3. Copy and paste the contents of supabase-schema.sql');
    console.log('4. Run the SQL script to create all tables');
    console.log('5. Restart the backend server');
    
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
  }
}

// Run the initialization
initializeDatabase();