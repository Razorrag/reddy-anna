/**
 * 🧹 SUPABASE DATABASE CLEANUP SCRIPT
 *
 * This script safely removes all data from Supabase tables while respecting
 * foreign key constraints and providing safety confirmations.
 *
 * ⚠️  THIS WILL PERMANENTLY DELETE ALL DATA IN THE DATABASE!
 * ⚠️  MAKE SURE YOU HAVE A BACKUP BEFORE RUNNING THIS SCRIPT!
 */

import { createClient } from '@supabase/supabase-js';
import readline from 'readline';
import { config } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from the root directory
config({ path: path.resolve(__dirname, '..', '.env') });

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials. Please check your .env file.');
  process.exit(1);
}

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
 * Create readline interface for user input
 */
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

/**
 * Promisified version of readline.question for async/await
 */
function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

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
 * Clear table data using DELETE (safer than TRUNCATE for foreign keys)
 */
async function clearTable(table) {
  try {
    console.log(`🧹 Clearing ${table}...`);
    
    const { data, error } = await supabase
      .from(table)
      .delete()
      .neq('id', null); // Delete all records
    
    if (error) {
      throw new Error(error.message);
    }
    
    const deletedCount = data?.length || 0;
    console.log(`✅ ${table} cleared successfully (${deletedCount} records deleted)`);
    return deletedCount;
  } catch (error) {
    console.error(`❌ Error clearing ${table}:`, error.message);
    throw error;
  }
}

/**
 * Safety confirmation with multiple verification steps
 */
async function safetyConfirmation() {
  printHeader('🚨 DATABASE CLEANUP SAFETY CONFIRMATION');
  
  console.log('⚠️  THIS SCRIPT WILL PERMANENTLY DELETE ALL DATA FROM YOUR SUPABASE DATABASE!');
  console.log('⚠️  This action cannot be undone!');
  console.log('');
  console.log('📋 Tables that will be affected:');
  
  // Show all tables that will be cleared
  for (const group of TABLE_CLEANUP_ORDER) {
    console.log(`\n  ${group.name}:`);
    for (const table of group.tables) {
      const count = await getTableRowCount(table);
      console.log(`    - ${table}: ${count} records`);
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('📋 SUMMARY OF ACTIONS:');
  console.log('  • All user data will be deleted');
  console.log('  • All game sessions and bets will be removed');
  console.log('  • All analytics and statistics will be cleared');
  console.log('  • All payment and transaction history will be erased');
  console.log('  • Configuration settings will be reset');
  console.log('  • Admin credentials will be removed');
  console.log('='.repeat(60));
  
  // Multi-step confirmation
  const confirm1 = await question('\n❓ Are you absolutely sure you want to proceed? (type "YES" to continue): ');
  if (confirm1 !== 'YES') {
    console.log('✅ Operation cancelled. No data was modified.');
    return false;
  }
  
  const confirm2 = await question('❓ Type the word "DELETE" to confirm: ');
  if (confirm2 !== 'DELETE') {
    console.log('✅ Operation cancelled. No data was modified.');
    return false;
  }
  
  const confirm3 = await question('❓ Final confirmation - type "CONFIRM": ');
  if (confirm3 !== 'CONFIRM') {
    console.log('✅ Operation cancelled. No data was modified.');
    return false;
  }
  
  return true;
}

/**
 * Main cleanup function
 */
async function cleanupDatabase() {
  try {
    printHeader('🚀 STARTING DATABASE CLEANUP');
    
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
    }
    console.log(`🎯 Total records to be deleted: ${totalInitialCount}`);
    
    if (totalInitialCount === 0) {
      console.log('✅ Database is already empty!');
      return;
    }
    
    // Safety confirmation
    const confirmed = await safetyConfirmation();
    if (!confirmed) {
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
  } finally {
    rl.close();
  }
}

/**
 * Handle graceful shutdown
 */
process.on('SIGINT', () => {
  console.log('\n\n⚠️  Script interrupted by user');
  console.log('✅ No data was modified');
  rl.close();
  process.exit(0);
});

// Run the cleanup if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  cleanupDatabase();
}

export { cleanupDatabase, getTableRowCount, clearTable };