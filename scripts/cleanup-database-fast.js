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

// Tables grouped by cleanup order (respecting foreign key constraints)
const TABLE_CLEANUP_ORDER = [
  {
    name: 'Payment & Transaction Tables',
    tables: [
      'payment_requests',
      'user_transactions'
    ]
  },
  {
    name: 'Game Analytics Tables',
    tables: [
      'game_statistics',
      'daily_game_statistics', 
      'monthly_game_statistics',
      'yearly_game_statistics'
    ]
  },
  {
    name: 'Game Session Tables',
    tables: [
      'dealt_cards',
      'player_bets',
      'game_history'
    ]
  },
  {
    name: 'Game Session Table',
    tables: [
      'game_sessions'
    ]
  },
  {
    name: 'User Relationship Tables',
    tables: [
      'user_referrals'
    ]
  },
  {
    name: 'User Table',
    tables: [
      'users'
    ]
  },
  {
    name: 'Configuration Tables',
    tables: [
      'game_settings',
      'stream_settings',
      'admin_credentials'
    ]
  }
];

// All tables flattened for easy access
const ALL_TABLES = TABLE_CLEANUP_ORDER.flatMap(group => group.tables);

/**
 * Print formatted header
 */
function printHeader(title) {
  console.log('\n' + '='.repeat(60));
  console.log(` ${title}`);
  console.log('='.repeat(60));
}

/**
 * Print formatted section
 */
function printSection(title) {
  console.log('\n' + '-'.repeat(40));
  console.log(` ${title}`);
  console.log('-'.repeat(40));
}

/**
 * Get table row count
 */
async function getTableRowCount(table) {
  try {
    const { data, error, count } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true });
    
    if (error) {
      throw new Error(error.message);
    }
    
    return count || 0;
  } catch (error) {
    console.error(`❌ Error getting count for ${table}:`, error.message);
    return 0;
  }
}

/**
 * Clear table data using direct SQL (more reliable for bulk operations)
 */
async function clearTable(table) {
  try {
    console.log(`🧹 Clearing ${table}...`);
    
    // First, get the count of records to be deleted
    const { count, error: countError } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true });
    
    if (countError) {
      throw new Error(countError.message);
    }
    
    if (count === 0) {
      console.log(`✅ ${table} already empty (0 records deleted)`);
      return 0;
    }
    
    // Use direct SQL to truncate the table (this handles foreign keys better)
    const { error } = await supabase
      .rpc('execute_sql', {
        sql: `DELETE FROM ${table} WHERE true;`
      });
    
    if (error) {
      console.log(`⚠️  Direct SQL failed for ${table}, trying regular delete...`);
      
      // Fallback to regular delete
      const { error: deleteError } = await supabase
        .from(table)
        .delete()
        .neq('id', null);
      
      if (deleteError) {
        throw new Error(deleteError.message);
      }
    }
    
    console.log(`✅ ${table} cleared successfully (${count} records deleted)`);
    return count;
  } catch (error) {
    console.error(`❌ Error clearing ${table}:`, error.message);
    
    // For certain tables with known issues, skip the error and continue
    if ((table === 'payment_requests' || table === 'user_transactions') && error.message.includes('uuid')) {
      console.log(`⚠️  Skipping ${table} due to UUID constraint issues`);
      return 0;
    }
    
    throw error;
  }
}

/**
 * Main cleanup function (SKIP SAFETY CONFIRMATIONS FOR AUTOMATED RUN)
 */
async function cleanupDatabase() {
  try {
    printHeader('🚀 STARTING DATABASE CLEANUP (AUTOMATED)');
    console.log('⚠️  Running in automated mode - skipping safety confirmations');
    
    // Test connection first
    console.log('🔍 Testing database connection...');
    const testResult = await supabase.from('users').select('id').limit(1);
    if (testResult.error) {
      throw new Error(`Database connection test failed: ${testResult.error.message}`);
    }
    console.log('✅ Database connection verified');
    
    // Get initial counts
    console.log('\n📊 Getting initial data counts...');
    let totalInitialCount = 0;
    for (const table of ALL_TABLES) {
      const count = await getTableRowCount(table);
      totalInitialCount += count;
      if (count > 0) {
        console.log(`  ${table}: ${count} records`);
      }
    }
    console.log(`🎯 Total records to be deleted: ${totalInitialCount}`);
    
    if (totalInitialCount === 0) {
      console.log('✅ Database is already empty!');
      return;
    }
    
    // Execute cleanup in correct order
    let totalDeleted = 0;
    
    for (const group of TABLE_CLEANUP_ORDER) {
      printSection(`🧹 Clearing ${group.name}`);
      
      for (const table of group.tables) {
        const initialCount = await getTableRowCount(table);
        if (initialCount > 0) {
          const deletedCount = await clearTable(table);
          totalDeleted += deletedCount;
        } else {
          console.log(`⏭️  ${table}: Already empty (skipping)`);
        }
      }
    }
    
    // Verify cleanup completion
    printSection('🔍 Verifying cleanup completion');
    let totalRemaining = 0;
    for (const table of ALL_TABLES) {
      const count = await getTableRowCount(table);
      totalRemaining += count;
      if (count > 0) {
        console.log(`⚠️  ${table}: ${count} records remaining`);
      } else {
        console.log(`✅ ${table}: Empty`);
      }
    }
    
    // Final summary
    printHeader('🎉 CLEANUP COMPLETED');
    console.log(`📊 Initial record count: ${totalInitialCount}`);
    console.log(`🗑️  Records deleted: ${totalDeleted}`);
    console.log(`🎯 Records remaining: ${totalRemaining}`);
    
    if (totalRemaining === 0) {
      console.log('✅ Database cleanup completed successfully!');
      console.log('🎉 All tables have been cleared!');
    } else {
      console.log('⚠️  Warning: Some records may still exist in the database');
      console.log('🔍 Please verify the remaining records manually');
    }
    
  } catch (error) {
    console.error('\n❌ Cleanup failed:', error.message);
    console.error('💡 Error details:', error);
    process.exit(1);
  }
}

// Run the cleanup
cleanupDatabase();