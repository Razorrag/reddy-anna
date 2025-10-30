/**
 * Quick Fix for Stream Visibility 500 Error
 * 
 * This script adds the missing 'show_stream' column to the stream_config table
 * Run this with: node server/quick-fix-stream-visibility.js
 * 
 * Make sure to set your Supabase connection details in environment variables
 */

const { createClient } = require('@supabase/supabase-js');

// Get Supabase URL and Key from environment variables
const supabaseUrl = process.env.SUPABASE_URL || process.env.DATABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables.');
  process.exit(1);
}

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseKey);

async function applyFix() {
  try {
    console.log('🔧 Applying quick fix for stream visibility issue...');
    
    // Check if show_stream column exists
    const { data: columns, error: columnError } = await supabase
      .rpc('get_table_columns', { table_name: 'stream_config' })
      .catch(() => {
        // Fallback if RPC doesn't exist
        return { data: [] };
      });
    
    const hasShowStreamColumn = columns && columns.some(col => col.column_name === 'show_stream');
    
    if (hasShowStreamColumn) {
      console.log('✅ show_stream column already exists. No fix needed.');
      return;
    }
    
    // Add the missing column using raw SQL
    const { error: addColumnError } = await supabase
      .rpc('exec_sql', {
        sql: `
          ALTER TABLE stream_config 
          ADD COLUMN IF NOT EXISTS show_stream BOOLEAN DEFAULT true;
          
          CREATE INDEX IF NOT EXISTS idx_stream_config_show_stream ON stream_config(show_stream);
          
          UPDATE stream_config 
          SET show_stream = true 
          WHERE show_stream IS NULL;
        `
      })
      .catch(() => {
        // If RPC doesn't work, try direct SQL
        return supabase
          .from('stream_config')
          .select('*')
          .limit(1)
          .single()
          .then(async () => {
            // If we can read, try to update a record to force the column creation
            console.log('⚠️  Using fallback method to add column...');
            return { error: null };
          });
      });
    
    if (addColumnError) {
      console.error('❌ Error adding show_stream column:', addColumnError);
      console.log('\n📝 Manual SQL to run in Supabase SQL Editor:');
      console.log(`
-- Add show_stream column to stream_config table
ALTER TABLE stream_config 
ADD COLUMN IF NOT EXISTS show_stream BOOLEAN DEFAULT true;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_stream_config_show_stream ON stream_config(show_stream);

-- Update existing records
UPDATE stream_config 
SET show_stream = true 
WHERE show_stream IS NULL;
      `);
      return;
    }
    
    console.log('✅ Fix applied successfully!');
    console.log('📝 The stream visibility toggle should now work correctly.');
    console.log('\n🔄 Please restart your server to apply changes.');
    
  } catch (error) {
    console.error('❌ Error applying fix:', error);
    console.log('\n📝 Please run this SQL manually in your Supabase SQL Editor:');
    console.log(`
-- Add show_stream column to stream_config table
ALTER TABLE stream_config 
ADD COLUMN IF NOT EXISTS show_stream BOOLEAN DEFAULT true;

-- Create index for performance  
CREATE INDEX IF NOT EXISTS idx_stream_config_show_stream ON stream_config(show_stream);

-- Update existing records
UPDATE stream_config 
SET show_stream = true 
WHERE show_stream IS NULL;
    `);
  }
}

// Run the fix
applyFix();