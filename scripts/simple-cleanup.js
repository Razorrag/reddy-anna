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

// Tables to clear in the correct order (respecting foreign key constraints)
const tablesToClear = [
  'payment_requests',
  'user_transactions',
  'game_statistics',
  'daily_game_statistics',
  'monthly_game_statistics',
  'yearly_game_statistics',
  'dealt_cards',
  'player_bets',
  'game_history',
  'game_sessions',
  'user_referrals',
  'users',
  'game_settings',
  'stream_settings',
  'admin_credentials'
];

async function clearTable(tableName) {
  try {
    // Get count first
    const { count, error: countError } = await supabase
      .from(tableName)
      .select('*', { count: 'exact', head: true });
    
    if (countError) {
      throw new Error(countError.message);
    }
    
    if (count === 0) {
      console.log(`⏭️  ${tableName}: Already empty`);
      return 0;
    }
    
    // Delete all records
    const { error: deleteError } = await supabase
      .from(tableName)
      .delete()
      .neq('id', null);
    
    if (deleteError) {
      throw new Error(deleteError.message);
    }
    
    console.log(`✅ ${tableName}: ${count} records deleted`);
    return count;
  } catch (error) {
    console.log(`❌ ${tableName}: Error - ${error.message}`);
    return 0;
  }
}

async function runCleanup() {
  try {
    console.log('🚀 Starting database cleanup...');
    console.log('🔍 Testing database connection...');
    
    const testResult = await supabase.from('users').select('id').limit(1);
    if (testResult.error) {
      throw new Error(`Database connection test failed: ${testResult.error.message}`);
    }
    
    console.log('✅ Database connection verified');
    console.log('📊 Starting table cleanup...\n');
    
    let totalDeleted = 0;
    
    for (const tableName of tablesToClear) {
      const deletedCount = await clearTable(tableName);
      totalDeleted += deletedCount;
    }
    
    console.log('\n🎉 Cleanup completed!');
    console.log(`📊 Total records deleted: ${totalDeleted}`);
    
    // Final verification
    console.log('\n🔍 Final verification:');
    let totalRemaining = 0;
    
    for (const tableName of tablesToClear) {
      try {
        const { count } = await supabase
          .from(tableName)
          .select('*', { count: 'exact', head: true });
        
        if (count > 0) {
          console.log(`⚠️  ${tableName}: ${count} records remaining`);
          totalRemaining += count;
        } else {
          console.log(`✅ ${tableName}: Empty`);
        }
      } catch (error) {
        console.log(`❌ ${tableName}: Verification error`);
      }
    }
    
    if (totalRemaining === 0) {
      console.log('\n✅ Database cleanup completed successfully!');
      console.log('🎉 All tables have been cleared!');
    } else {
      console.log(`\n⚠️  Warning: ${totalRemaining} records still exist`);
    }
    
  } catch (error) {
    console.error('\n❌ Cleanup failed:', error.message);
    process.exit(1);
  }
}

// Run the cleanup
runCleanup();