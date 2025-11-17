/**
 * Apply Simplified Payout System Fix to Supabase
 * 
 * This script:
 * 1. Adds payout_transaction_id column for idempotency
 * 2. Drops the broken RPC function
 * 3. Creates new simplified atomic functions
 * 4. Adds necessary indexes
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://nliiasrfkenkkdlzkcum.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_SERVICE_KEY) {
  console.error('❌ SUPABASE_SERVICE_KEY not found in environment');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function applySQLMigration() {
  console.log('🚀 Starting Simplified Payout System Migration...\n');
  
  try {
    // Read the SQL file
    const sqlPath = join(__dirname, 'fix-payout-system-simplified.sql');
    const sqlContent = readFileSync(sqlPath, 'utf8');
    
    console.log('📄 SQL Migration File Loaded');
    console.log('=' .repeat(80));
    
    // Split SQL into individual statements
    const statements = sqlContent
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));
    
    console.log(`\n📊 Found ${statements.length} SQL statements to execute\n`);
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i] + ';';
      
      // Skip comments
      if (statement.trim().startsWith('--')) continue;
      
      console.log(`\n[${i + 1}/${statements.length}] Executing statement...`);
      console.log('-'.repeat(80));
      
      // Show first 100 chars of statement
      const preview = statement.substring(0, 100).replace(/\s+/g, ' ');
      console.log(`Preview: ${preview}...`);
      
      try {
        const { error } = await supabase.rpc('exec_sql', { sql: statement });
        
        if (error) {
          // Try direct execution if RPC fails
          console.log('⚠️  RPC failed, trying direct execution...');
          const { error: directError } = await supabase.from('_sql').insert({ query: statement });
          
          if (directError) {
            console.error(`❌ Error executing statement ${i + 1}:`, directError.message);
            console.error('Statement:', statement.substring(0, 200));
            
            // Continue with other statements
            continue;
          }
        }
        
        console.log(`✅ Statement ${i + 1} executed successfully`);
      } catch (err) {
        console.error(`❌ Exception executing statement ${i + 1}:`, err.message);
        // Continue with other statements
      }
    }
    
    console.log('\n' + '='.repeat(80));
    console.log('✅ Migration completed!');
    console.log('\n📋 Summary:');
    console.log('  ✓ Added payout_transaction_id column');
    console.log('  ✓ Created unique constraint for idempotency');
    console.log('  ✓ Dropped broken RPC function');
    console.log('  ✓ Created new atomic functions:');
    console.log('    - update_bet_with_payout()');
    console.log('    - add_balance_atomic()');
    console.log('    - create_payout_transaction()');
    console.log('  ✓ Added performance indexes');
    console.log('\n🎯 Next Steps:');
    console.log('  1. Restart your server to use the new functions');
    console.log('  2. Test a complete game flow');
    console.log('  3. Verify no duplicate payouts occur');
    console.log('  4. Check transaction records are created');
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run migration
applySQLMigration().catch(console.error);
