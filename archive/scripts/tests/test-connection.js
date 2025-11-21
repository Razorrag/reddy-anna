#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

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
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      const fetchOptions = {
        ...options,
        signal: controller.signal,
        // Add retry logic at the fetch level if needed
      };
      
      return fetch(url, fetchOptions).finally(() => {
        clearTimeout(timeoutId);
      });
    }
  },
  auth: {
    // Add auth timeout
    persistSession: true,
    detectSessionInUrl: false,
  }
});

async function testConnection() {
  try {
    console.log('🔍 Testing Supabase connection...');
    
    // Test connection with a simple query (using same syntax as working storage)
    const result = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .limit(1);
    
    console.log('Raw result:', JSON.stringify(result, null, 2));
    
    if (result.error) {
      console.error('❌ Error object:', result.error);
      throw new Error(`Supabase error: ${result.error.message || 'Unknown error'}`);
    }
    
    console.log('✅ Connection successful!');
    console.log('📊 Current user count:', result.data?.count || 0);
    
    // Test a few more tables
    const testTables = ['game_sessions', 'player_bets', 'game_history'];
    for (const table of testTables) {
      try {
        const tableResult = await supabase
          .from(table)
          .select('count(*)', { count: 'exact', head: true })
          .limit(1);
        
        console.log(`Debug ${table}:`, JSON.stringify(tableResult, null, 2));
        
        if (tableResult.error) {
          console.log(`❌ ${table}: Error - ${tableResult.error.message}`);
        } else {
          console.log(`✅ ${table}: ${tableResult.data?.count || 0} records`);
        }
      } catch (tableError) {
        console.log(`❌ ${table}: Exception -`, tableError.message);
      }
    }
    
    return true;
  } catch (error) {
    console.error('❌ Connection test failed:', error.message);
    console.error('Full error:', error);
    return false;
  }
}

// Run the test
testConnection().then(success => {
  if (success) {
    console.log('\n🎉 All tests passed! Ready to run the cleanup script.');
    console.log('📝 To run the cleanup: cd scripts && node cleanup-database.js');
  } else {
    console.log('\n❌ Connection test failed. Please check your Supabase credentials.');
    process.exit(1);
  }
});