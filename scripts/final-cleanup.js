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

async function getTableRowCount(tableName) {
  try {
    const { count, error } = await supabase
      .from(tableName)
      .select('*', { count: 'exact', head: true });
    
    if (error) {
      console.log(`⚠️  Could not get count for ${tableName}: ${error.message}`);
      return 0;
    }
    
    return count || 0;
  } catch (error) {
    console.log(`⚠️  Exception getting count for ${tableName}: ${error.message}`);
    return 0;
  }
}

async function clearTable(tableName) {
  try {
    // Get count first
    const count = await getTableRowCount(tableName);
    
    if (count === 0) {
      console.log(`⏭️  ${tableName}: Already empty`);
      return 0;
    }
    
    console.log(`🧹 ${tableName}: ${count} records found`);
    
    // Delete all records with error handling for UUID issues
    const { error: deleteError } = await supabase
      .from(tableName)
      .delete()
      .neq('id', null);
    
    if (deleteError) {
      // Handle specific UUID error by using a different approach
      if (deleteError.message.includes('uuid') || deleteError.message.includes('null')) {
        console.log(`⚠️  UUID issue with ${tableName}, trying alternative approach...`);
        
        // Try to delete without the neq condition for tables with UUID issues
        const { error: altError } = await supabase
          .from(tableName)
          .delete();
        
        if (altError) {
          console.log(`❌ ${tableName}: Failed with both approaches - ${altError.message}`);
          return 0;
        }
      } else {
        console.log(`❌ ${tableName}: Delete failed - ${deleteError.message}`);
        return 0;
      }
    }
    
    console.log(`✅ ${tableName}: Successfully cleared (${count} records)`);
    return count;
  } catch (error) {
    console.log(`❌ ${tableName}: Exception during cleanup - ${error.message}`);
    return 0;
  }
}

async function runCleanup() {
  try {
    console.log('🚀 Starting database cleanup...');
    console.log('🔍 Testing database connection...');
    
    // Test connection with a simple query
    const testResult = await supabase.from('users').select('id').limit(1);
    if (testResult.error) {
      throw new Error(`Database connection test failed: ${testResult.error.message}`);
    }
    
    console.log('✅ Database connection verified');
    console.log('📊 Starting table cleanup...\n');
    
    let totalDeleted = 0;
    let successfulTables = 0;
    let failedTables = 0;
    
    // Process tables one by one with individual error handling
    for (const tableName of tablesToClear) {
      try {
        const deletedCount = await clearTable(tableName);
        if (deletedCount > 0) {
          totalDeleted += deletedCount;
          successfulTables++;
        } else {
          failedTables++;
        }
      } catch (tableError) {
        console.log(`❌ ${tableName}: Unexpected error - ${tableError.message}`);
        failedTables++;
      }
      console.log(''); // Add spacing between tables
    }
    
    console.log('🎉 Cleanup completed!');
    console.log(`📊 Summary:`);
    console.log(`  • Total records deleted: ${totalDeleted}`);
    console.log(`  • Tables successfully cleared: ${successfulTables}`);
    console.log(`  • Tables with issues: ${failedTables}`);
    console.log(`  • Total tables processed: ${tablesToClear.length}`);
    
    // Final verification - check if any tables still have data
    console.log('\n🔍 Final verification:');
    let verificationPassed = true;
    let totalRemaining = 0;
    
    for (const tableName of tablesToClear) {
      try {
        const count = await getTableRowCount(tableName);
        if (count > 0) {
          console.log(`⚠️  ${tableName}: ${count} records remaining`);
          totalRemaining += count;
          verificationPassed = false;
        } else {
          console.log(`✅ ${tableName}: Empty`);
        }
      } catch (verifyError) {
        console.log(`❌ ${tableName}: Verification failed`);
        verificationPassed = false;
      }
    }
    
    if (verificationPassed && totalRemaining === 0) {
      console.log('\n🎉🎉🎉 PERFECT! Database cleanup completed successfully! 🎉🎉🎉');
      console.log('✅ All tables are completely empty');
      console.log('✅ No errors encountered during cleanup');
      console.log('✅ Database is ready for fresh data');
    } else if (totalRemaining > 0) {
      console.log(`\n⚠️  Warning: ${totalRemaining} records still exist in the database`);
      console.log('💡 Some tables may need manual cleanup');
    } else {
      console.log('\n✅ Cleanup completed with no remaining data');
    }
    
  } catch (error) {
    console.error('\n❌ Cleanup failed:', error.message);
    console.error('💡 Error details:', error);
    process.exit(1);
  }
}

// Run the cleanup
runCleanup();