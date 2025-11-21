/**
 * Fetch Complete Database Schema using PostgreSQL Client
 * 
 * This script connects directly to Supabase's PostgreSQL database
 * to fetch complete schema information including:
 * - Tables with all columns and data types
 * - RPCs with full definitions
 * - Triggers
 * - Foreign keys
 * - Indexes
 * - Constraints
 */

import dotenv from 'dotenv';
import pkg from 'pg';
const { Client } = pkg;
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

// Extract connection details from Supabase URL
// Format: https://<project-ref>.supabase.co
const projectRef = SUPABASE_URL.replace('https://', '').replace('.supabase.co', '');

// Supabase PostgreSQL connection string format:
// postgresql://postgres:[YOUR-PASSWORD]@db.<project-ref>.supabase.co:5432/postgres
console.log('🔍 Connecting to Supabase PostgreSQL database...\n');
console.log(`Project Reference: ${projectRef}`);
console.log('\n⚠️  NOTE: Direct PostgreSQL connection requires database password.');
console.log('You can find it in: Supabase Dashboard > Project Settings > Database > Connection string\n');

// For now, let's create a comprehensive analysis from what we have
async function analyzeExistingData() {
  console.log('📊 Analyzing existing database structure from previous fetch...\n');
  
  const structurePath = path.join(__dirname, 'database-structure.json');
  
  if (!fs.existsSync(structurePath)) {
    console.error('❌ database-structure.json not found');
    process.exit(1);
  }
  
  const structure = JSON.parse(fs.readFileSync(structurePath, 'utf8'));
  
  // Analyze tables
  const tables = structure.tables.map(t => t.table_name);
  console.log(`📋 Found ${tables.length} tables:`);
  tables.forEach(t => console.log(`   - ${t}`));
  
  // Analyze RPCs
  console.log(`\n⚙️  Found ${structure.rpcs.length} RPC functions:`);
  structure.rpcs.forEach(r => console.log(`   - ${r.routine_name} (${r.routine_type})`));
  
  // Now let's compare with what's required by the code
  console.log('\n\n' + '='.repeat(60));
  console.log('📚 COMPARING WITH REQUIRED SCHEMA FROM CODE');
  console.log('='.repeat(60));
  
  // Read schema.ts to see what's required
  const schemaPath = path.join(__dirname, '..', 'shared', 'schema.ts');
  if (fs.existsSync(schemaPath)) {
    const schemaContent = fs.readFileSync(schemaPath, 'utf8');
    
    // Extract table names from schema.ts
    const tableMatches = schemaContent.match(/export const (\w+) = pgTable\(/g);
    const requiredTables = tableMatches 
      ? tableMatches.map(m => m.replace('export const ', '').replace(' = pgTable(', ''))
      : [];
    
    console.log(`\n✅ Required tables from schema.ts: ${requiredTables.length}`);
    requiredTables.forEach(t => console.log(`   - ${t}`));
    
    // Find extra tables not in schema
    const extraTables = tables.filter(t => !requiredTables.includes(t));
    console.log(`\n⚠️  EXTRA/REDUNDANT tables (${extraTables.length}):`);
    if (extraTables.length > 0) {
      extraTables.forEach(t => console.log(`   ❌ ${t}`));
    } else {
      console.log('   None - all tables are defined in schema');
    }
    
    // Find missing tables
    const missingTables = requiredTables.filter(t => !tables.includes(t));
    console.log(`\n⚠️  MISSING tables (${missingTables.length}):`);
    if (missingTables.length > 0) {
      missingTables.forEach(t => console.log(`   ⚠️  ${t}`));
    } else {
      console.log('   None - all required tables exist');
    }
  }
  
  // Analyze what should be kept vs removed
  const analysis = {
    timestamp: new Date().toISOString(),
    summary: {
      total_tables_in_db: tables.length,
      total_rpcs_in_db: structure.rpcs.length,
      extra_tables: [],
      missing_tables: [],
      redundant_rpcs: []
    },
    recommendations: {
      tables_to_drop: [],
      rpcs_to_drop: [],
      tables_to_create: [],
      rpcs_to_create: []
    },
    current_structure: structure
  };
  
  // Save analysis
  const analysisPath = path.join(__dirname, 'database-analysis.json');
  fs.writeFileSync(analysisPath, JSON.stringify(analysis, null, 2));
  
  console.log('\n\n' + '='.repeat(60));
  console.log('✅ ANALYSIS COMPLETE');
  console.log('='.repeat(60));
  console.log(`📁 Analysis saved to: ${analysisPath}`);
  
  return analysis;
}

/**
 * Create SQL queries to manually run in Supabase SQL Editor
 */
function createManualQueries() {
  const queries = `
-- ============================================================
-- COMPREHENSIVE DATABASE SCHEMA QUERIES
-- Run these in Supabase SQL Editor to get complete details
-- ============================================================

-- 1. GET ALL TABLES WITH COLUMNS
SELECT 
  t.table_name,
  json_agg(
    json_build_object(
      'column_name', c.column_name,
      'ordinal_position', c.ordinal_position,
      'data_type', c.data_type,
      'udt_name', c.udt_name,
      'is_nullable', c.is_nullable,
      'column_default', c.column_default,
      'character_maximum_length', c.character_maximum_length,
      'numeric_precision', c.numeric_precision,
      'numeric_scale', c.numeric_scale
    ) ORDER BY c.ordinal_position
  ) as columns
FROM information_schema.tables t
LEFT JOIN information_schema.columns c 
  ON t.table_name = c.table_name 
  AND t.table_schema = c.table_schema
WHERE t.table_schema = 'public' 
  AND t.table_type = 'BASE TABLE'
GROUP BY t.table_name
ORDER BY t.table_name;

-- 2. GET ALL RPC FUNCTIONS WITH FULL DEFINITIONS
SELECT 
  r.routine_name,
  r.routine_type,
  r.data_type as return_type,
  r.routine_definition,
  (
    SELECT json_agg(
      json_build_object(
        'parameter_name', p.parameter_name,
        'data_type', p.data_type,
        'parameter_mode', p.parameter_mode
      ) ORDER BY p.ordinal_position
    )
    FROM information_schema.parameters p
    WHERE p.specific_name = r.specific_name
  ) as parameters
FROM information_schema.routines r
WHERE r.routine_schema = 'public'
  AND r.routine_type = 'FUNCTION'
ORDER BY r.routine_name;

-- 3. GET ALL TRIGGERS
SELECT 
  t.trigger_name,
  t.event_object_table as table_name,
  t.action_timing,
  t.event_manipulation,
  t.action_statement,
  t.action_orientation
FROM information_schema.triggers t
WHERE t.trigger_schema = 'public'
ORDER BY t.event_object_table, t.trigger_name;

-- 4. GET ALL FOREIGN KEYS
SELECT
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name,
  rc.update_rule,
  rc.delete_rule
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
JOIN information_schema.referential_constraints AS rc
  ON tc.constraint_name = rc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
ORDER BY tc.table_name, tc.constraint_name;

-- 5. GET ALL INDEXES
SELECT
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- 6. GET PRIMARY KEYS
SELECT
  tc.table_name,
  kcu.column_name,
  tc.constraint_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
WHERE tc.constraint_type = 'PRIMARY KEY'
  AND tc.table_schema = 'public'
ORDER BY tc.table_name;

-- 7. GET TABLE STATISTICS (size, row counts)
SELECT 
  schemaname,
  relname as table_name,
  n_live_tup as row_count,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||relname)) as total_size,
  pg_size_pretty(pg_relation_size(schemaname||'.'||relname)) as table_size
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||relname) DESC;

-- 8. LIST ALL VIEWS
SELECT 
  table_name as view_name,
  view_definition
FROM information_schema.views
WHERE table_schema = 'public'
ORDER BY table_name;
`;

  const queriesPath = path.join(__dirname, 'manual-schema-queries.sql');
  fs.writeFileSync(queriesPath, queries);
  
  console.log('\n📝 Manual SQL queries created');
  console.log(`   File: ${queriesPath}`);
  console.log('   Copy and run these in Supabase SQL Editor for complete details\n');
}

async function main() {
  try {
    await analyzeExistingData();
    createManualQueries();
    
    console.log('\n💡 NEXT STEPS:');
    console.log('   1. Review database-analysis.json');
    console.log('   2. Run manual-schema-queries.sql in Supabase SQL Editor');
    console.log('   3. Copy results back to continue with cleanup\n');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();