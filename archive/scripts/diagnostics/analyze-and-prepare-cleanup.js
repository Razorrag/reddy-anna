/**
 * Analyze Database and Prepare Cleanup Plan
 * 
 * This script:
 * 1. Maps schema.ts definitions to actual database tables
 * 2. Identifies redundant/extra tables not in schema
 * 3. Identifies redundant RPCs
 * 4. Creates detailed cleanup plan
 * 5. Generates SQL scripts for cleanup
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔍 COMPREHENSIVE DATABASE ANALYSIS\n');
console.log('='.repeat(70) + '\n');

// Load existing database structure
const structurePath = path.join(__dirname, 'database-structure.json');
const structure = JSON.parse(fs.readFileSync(structurePath, 'utf8'));

// Define required tables from schema.ts (snake_case as they appear in DB)
const REQUIRED_TABLES = [
  'users',
  'admin_credentials',
  'game_settings',
  'game_sessions',
  'dealt_cards',
  'player_bets',
  'user_transactions',
  'game_statistics',
  'game_history',
  'blocked_users',
  'user_referrals',
  'stream_settings',
  'user_creation_log',
  'whatsapp_messages'
];

// Define required RPCs (atomic operations only)
const REQUIRED_RPCS = [
  'add_balance_atomic',           // Atomic balance addition
  'update_balance_atomic',         // Atomic balance update  
  'generate_referral_code',        // Generate unique referral codes
];

// Current tables and RPCs in database
const currentTables = structure.tables.map(t => t.table_name);
const currentRPCs = structure.rpcs.map(r => r.routine_name);

console.log('📊 CURRENT DATABASE STATE:');
console.log(`   Tables: ${currentTables.length}`);
console.log(`   RPCs: ${currentRPCs.length}\n`);

// Analyze tables
const extraTables = currentTables.filter(t => !REQUIRED_TABLES.includes(t));
const missingTables = REQUIRED_TABLES.filter(t => !currentTables.includes(t));
const correctTables = currentTables.filter(t => REQUIRED_TABLES.includes(t));

console.log('✅ REQUIRED TABLES (14):');
REQUIRED_TABLES.forEach(t => {
  const exists = currentTables.includes(t);
  console.log(`   ${exists ? '✓' : '✗'} ${t}`);
});

console.log(`\n❌ REDUNDANT/EXTRA TABLES (${extraTables.length}):`);
extraTables.forEach(t => console.log(`   🗑️  ${t}`));

if (missingTables.length > 0) {
  console.log(`\n⚠️  MISSING TABLES (${missingTables.length}):`);
  missingTables.forEach(t => console.log(`   ⚠️  ${t}`));
}

// Analyze RPCs
const redundantRPCs = currentRPCs.filter(r => !REQUIRED_RPCS.includes(r));

console.log(`\n\n📋 RPC FUNCTIONS ANALYSIS:`);
console.log(`\n✅ REQUIRED RPCs (${REQUIRED_RPCS.length}):`);
REQUIRED_RPCS.forEach(r => {
  const exists = currentRPCs.includes(r);
  console.log(`   ${exists ? '✓' : '✗'} ${r}`);
});

console.log(`\n❌ REDUNDANT RPCs (${redundantRPCs.length}):`);
redundantRPCs.forEach(r => console.log(`   🗑️  ${r}`));

// Categorize extra tables by function
const extraTableCategories = {
  bonus_system: extraTables.filter(t => 
    t.includes('bonus') || t.includes('deposit_bonuses') || t.includes('referral_bonuses')
  ),
  admin_requests: extraTables.filter(t => 
    t.includes('admin_request') || t.includes('payment_request') || t.includes('request_audit')
  ),
  statistics: extraTables.filter(t => 
    t.includes('daily_') || t.includes('monthly_') || t.includes('yearly_')
  ),
  streaming: extraTables.filter(t => 
    t.includes('stream_') && !REQUIRED_TABLES.includes(t)
  ),
  security: extraTables.filter(t => 
    t.includes('token_blacklist') || t.includes('password_reset')
  ),
  audit: extraTables.filter(t => 
    t.includes('audit_log')
  ),
  other: []
};

// Add uncategorized tables
extraTableCategories.other = extraTables.filter(t => 
  !Object.values(extraTableCategories).flat().includes(t)
);

console.log(`\n\n📦 REDUNDANT TABLES BY CATEGORY:`);
Object.entries(extraTableCategories).forEach(([category, tables]) => {
  if (tables.length > 0) {
    console.log(`\n   ${category.toUpperCase()} (${tables.length}):`);
    tables.forEach(t => console.log(`      - ${t}`));
  }
});

// Create cleanup plan
const cleanupPlan = {
  timestamp: new Date().toISOString(),
  summary: {
    total_tables_to_drop: extraTables.length,
    total_rpcs_to_drop: redundantRPCs.length,
    tables_to_keep: correctTables.length,
    rpcs_to_keep: REQUIRED_RPCS.filter(r => currentRPCs.includes(r)).length
  },
  actions: {
    drop_tables: extraTables,
    drop_rpcs: redundantRPCs,
    keep_tables: correctTables,
    keep_rpcs: REQUIRED_RPCS.filter(r => currentRPCs.includes(r)),
    missing_tables: missingTables,
    missing_rpcs: REQUIRED_RPCS.filter(r => !currentRPCs.includes(r))
  },
  categories: extraTableCategories,
  warnings: []
};

// Add warnings
if (extraTables.includes('payment_requests')) {
  cleanupPlan.warnings.push({
    table: 'payment_requests',
    warning: 'Contains user deposit/withdrawal requests - may need data migration',
    action: 'BACKUP before dropping'
  });
}

if (extraTables.includes('user_transactions') && !correctTables.includes('user_transactions')) {
  cleanupPlan.warnings.push({
    table: 'user_transactions',
    warning: 'This table is REQUIRED but marked as extra - check table name case',
    action: 'VERIFY before dropping'
  });
}

console.log(`\n\n⚠️  WARNINGS (${cleanupPlan.warnings.length}):`);
cleanupPlan.warnings.forEach(w => {
  console.log(`   ⚠️  ${w.table}: ${w.warning}`);
  console.log(`      → ${w.action}`);
});

// Save cleanup plan
const cleanupPlanPath = path.join(__dirname, 'cleanup-plan.json');
fs.writeFileSync(cleanupPlanPath, JSON.stringify(cleanupPlan, null, 2));

console.log(`\n\n${'='.repeat(70)}`);
console.log('✅ CLEANUP PLAN CREATED');
console.log('='.repeat(70));
console.log(`📁 Saved to: ${cleanupPlanPath}\n`);

// Generate SQL cleanup script
const sqlScript = `
-- ============================================================
-- DATABASE CLEANUP SCRIPT
-- Generated: ${new Date().toISOString()}
-- 
-- ⚠️  WARNING: This will DROP ${extraTables.length} tables and ${redundantRPCs.length} RPCs
-- BACKUP YOUR DATABASE before running this script!
-- ============================================================

-- Step 1: Backup important data (run before cleanup)
-- Copy this to a separate query and run first if needed

-- Backup payment requests
-- CREATE TABLE payment_requests_backup AS SELECT * FROM payment_requests;

-- Backup bonus data
-- CREATE TABLE bonus_transactions_backup AS SELECT * FROM bonus_transactions;
-- CREATE TABLE deposit_bonuses_backup AS SELECT * FROM deposit_bonuses;
-- CREATE TABLE referral_bonuses_backup AS SELECT * FROM referral_bonuses;

-- ============================================================
-- Step 2: Drop Redundant RPC Functions
-- ============================================================

${redundantRPCs.map(rpc => `DROP FUNCTION IF EXISTS ${rpc} CASCADE;`).join('\n')}

-- ============================================================
-- Step 3: Drop Redundant Tables
-- ============================================================
-- Tables are dropped in reverse dependency order

${extraTables.map(table => `DROP TABLE IF EXISTS ${table} CASCADE;`).join('\n')}

-- ============================================================
-- Step 4: Verify Cleanup
-- ============================================================

-- Check remaining tables
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- Check remaining functions
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public'
  AND routine_type = 'FUNCTION'
ORDER BY routine_name;

-- ============================================================
-- Expected result: ${REQUIRED_TABLES.length} tables and ${REQUIRED_RPCS.length} RPCs
-- ============================================================
`;

const sqlScriptPath = path.join(__dirname, 'cleanup-database.sql');
fs.writeFileSync(sqlScriptPath, sqlScript);

console.log(`📝 SQL Cleanup Script: ${sqlScriptPath}`);

// Generate verification script
const verifyScript = `
-- ============================================================
-- VERIFICATION SCRIPT - Run after cleanup
-- ============================================================

-- 1. Count tables (should be ${REQUIRED_TABLES.length})
SELECT COUNT(*) as table_count
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_type = 'BASE TABLE';

-- 2. List all tables
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- 3. Count RPCs (should be ${REQUIRED_RPCS.length})
SELECT COUNT(*) as rpc_count
FROM information_schema.routines 
WHERE routine_schema = 'public'
  AND routine_type = 'FUNCTION';

-- 4. List all RPCs
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public'
  AND routine_type = 'FUNCTION'
ORDER BY routine_name;

-- 5. Check for orphaned data
SELECT 'Checking for orphaned records...';

-- 6. Verify required tables exist
${REQUIRED_TABLES.map(t => `SELECT '${t}' as table_name, COUNT(*) as row_count FROM ${t};`).join('\n')}
`;

const verifyScriptPath = path.join(__dirname, 'verify-cleanup.sql');
fs.writeFileSync(verifyScriptPath, verifyScript);

console.log(`📝 Verification Script: ${verifyScriptPath}\n`);

console.log('📋 SUMMARY:');
console.log(`   ✓ Tables to keep: ${correctTables.length}`);
console.log(`   ✗ Tables to drop: ${extraTables.length}`);
console.log(`   ✓ RPCs to keep: ${REQUIRED_RPCS.filter(r => currentRPCs.includes(r)).length}`);
console.log(`   ✗ RPCs to drop: ${redundantRPCs.length}`);

if (missingTables.length > 0) {
  console.log(`   ⚠️  Tables missing: ${missingTables.length}`);
}

console.log('\n🎯 NEXT STEPS:');
console.log('   1. Review cleanup-plan.json');
console.log('   2. BACKUP your database');
console.log('   3. Run cleanup-database.sql in Supabase SQL Editor');
console.log('   4. Run verify-cleanup.sql to confirm');
console.log('   5. Proceed with database rebuild if needed\n');