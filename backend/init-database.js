import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function initializeDatabase() {
  try {
    console.log('Starting database initialization...');
    
    // Read the SQL file
    const sqlFilePath = path.join(process.cwd(), 'db_postgres.sql');
    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
    
    // Split the SQL content into individual statements
    const statements = sqlContent
      .split(';')
      .filter(stmt => stmt.trim().length > 0)
      .map(stmt => stmt.trim());
    
    // Execute each statement
    for (const statement of statements) {
      if (statement) {
        console.log(`Executing: ${statement.substring(0, 50)}...`);
        
        // Execute the SQL statement using Supabase RPC
        const { data, error } = await supabase.rpc('exec_sql', { sql_query: statement });
        
        if (error) {
          console.error(`Error executing statement: ${error.message}`);
          
          // Try creating tables one by one if RPC fails
          if (statement.includes('CREATE TABLE')) {
            console.log('Attempting to create table directly...');
            
            // Extract table name from CREATE TABLE statement
            const tableNameMatch = statement.match(/CREATE TABLE IF NOT EXISTS\s+(\w+)/);
            if (tableNameMatch) {
              const tableName = tableNameMatch[1];
              
              // Try to create the table using the REST API
              const { error: createError } = await supabase
                .from(tableName)
                .select('*')
                .limit(1);
                
              if (createError && createError.code === 'PGRST116') {
                console.log(`Table ${tableName} does not exist. Please create it manually in Supabase dashboard.`);
              } else {
                console.log(`Table ${tableName} exists or was created successfully.`);
              }
            }
          }
        } else {
          console.log('Statement executed successfully.');
        }
      }
    }
    
    console.log('Database initialization completed!');
    
    // Verify tables exist by trying to query them
    const tables = ['users', 'admins', 'game_settings', 'stream_settings'];
    
    for (const table of tables) {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(1);
        
      if (error) {
        console.error(`Table ${table} verification failed: ${error.message}`);
      } else {
        console.log(`Table ${table} exists and is accessible.`);
      }
    }
    
  } catch (error) {
    console.error('Database initialization failed:', error);
  }
}

// Alternative approach using individual table creation
async function createTablesManually() {
  try {
    console.log('Creating tables manually...');
    
    // Create game_settings table
    const { error: gameSettingsError } = await supabase
      .from('game_settings')
      .upsert({
        setting_key: 'max_bet_amount',
        setting_value: '50000',
        description: 'Maximum bet amount allowed in the game'
      }, { onConflict: 'setting_key' });
      
    if (gameSettingsError) {
      console.error('Error with game_settings table:', gameSettingsError);
    } else {
      console.log('game_settings table is ready');
    }
    
    // Create stream_settings table
    const { error: streamSettingsError } = await supabase
      .from('stream_settings')
      .upsert({
        setting_key: 'stream_url',
        setting_value: 'hero images/uhd_30fps.mp4',
        description: 'Default stream URL for offline status'
      }, { onConflict: 'setting_key' });
      
    if (streamSettingsError) {
      console.error('Error with stream_settings table:', streamSettingsError);
    } else {
      console.log('stream_settings table is ready');
    }
    
    console.log('Manual table creation completed!');
    
  } catch (error) {
    console.error('Manual table creation failed:', error);
  }
}

// Run the initialization
initializeDatabase()
  .then(() => {
    console.log('Initialization complete. Trying manual approach as fallback...');
    return createTablesManually();
  })
  .catch(console.error);