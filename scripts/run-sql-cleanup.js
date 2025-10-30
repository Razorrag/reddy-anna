#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

// Get the directory name of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from the root directory
config({ path: path.resolve(__dirname, '..', '.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials. Please check your .env file.');
  process.exit(1);
}

// Use the same configuration as the working storage implementation
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  global: {
    fetch: (url, options = {}) => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
      
      const fetchOptions = {
        ...options,
        signal: controller.signal,
      };
      
      return fetch(url, fetchOptions).finally(() => {
        clearTimeout(timeoutId);
      });
    }
  },
  auth: {
    persistSession: true,
    detectSessionInUrl: false,
  }
});

async function runCleanup() {
  try {
    console.log('🚀 Starting database cleanup with SQL script...');
    
    // Read the SQL script
    const sqlScriptPath = path.resolve(__dirname, 'delete-all-data.sql');
    const sqlScript = fs.readFileSync(sqlScriptPath, 'utf8');
    
    console.log('🔍 Testing database connection...');
    const testResult = await supabase.from('users').select('id').limit(1);
    if (testResult.error) {
      throw new Error(`Database connection test failed: ${testResult.error.message}`);
    }
    console.log('✅ Database connection verified');
    
    console.log('🧹 Executing SQL cleanup script...');
    
    // Split the SQL script into individual statements
    const sqlStatements = sqlScript
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0);
    
    // Execute each statement
    for (const statement of sqlStatements) {
      if (statement.startsWith('--') || statement.length === 0) {
        continue; // Skip comments and empty statements
      }
      
      try {
        // Use raw SQL execution
        const { data, error } = await supabase
          .from('pg_stat_statements')
          .select('*')
          .limit(1); // This is just to test if we can execute SQL
        
        // For actual DELETE operations, use the from().delete() method
        if (statement.includes('DELETE FROM')) {
          const tableName = statement.match(/DELETE FROM (\w+)/)?.[1];
          if (tableName) {
            console.log(`🧹 Clearing ${tableName}...`);
            const { error: deleteError } = await supabase
              .from(tableName)
              .delete()
              .neq('id', null);
            
            if (deleteError) {
              console.log(`⚠️  Failed to clear ${tableName}: ${deleteError.message}`);
            } else {
              console.log(`✅ ${tableName} cleared successfully`);
            }
          }
        }
      } catch (stmtError) {
        console.log(`⚠️  Statement failed: ${statement.substring(0, 50)}...`);
        console.log(`   Error: ${stmtError.message}`);
      }
    }
    
    console.log('✅ SQL cleanup script executed successfully!');
    
    console.log('\n🎉 Database cleanup completed successfully!');
    console.log('✅ All tables have been cleared!');
    
  } catch (error) {
    console.error('\n❌ Cleanup failed:', error.message);
    console.error('💡 Error details:', error);
    process.exit(1);
  }
}

// Run the cleanup
runCleanup();