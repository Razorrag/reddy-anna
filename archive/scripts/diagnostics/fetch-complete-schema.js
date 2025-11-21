/**
 * Fetch Complete Database Schema with Details
 * 
 * This script executes SQL queries directly in Supabase to get:
 * - All tables with full column details
 * - All RPCs with parameters and definitions
 * - All triggers
 * - All foreign keys
 * - All indexes
 * - Table sizes and row counts
 */

import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
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

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

console.log('🔍 Fetching COMPLETE database schema with detailed information...\n');

/**
 * Execute SQL via Supabase REST API using postgres_meta
 */
async function executeSQL(query, description) {
  console.log(`📝 ${description}...`);
  
  try {
    // Use Supabase's postgres-meta API endpoint
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({ query })
    });

    if (response.ok) {
      const data = await response.json();
      console.log(`   ✅ ${description} completed`);
      return data;
    }
    
    // If exec_sql RPC doesn't exist, try alternative method
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    
  } catch (error) {
    console.log(`   ⚠️  ${description} - Using alternative method`);
    return null;
  }
}

/**
 * Fetch table details with columns
 */
async function fetchTableDetails() {
  const query = `
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
  `;
  
  return await executeSQL(query, 'Fetching table details with columns');
}

/**
 * Fetch RPC functions with parameters
 */
async function fetchRPCDetails() {
  const query = `
    SELECT 
      r.routine_name,
      r.routine_type,
      r.data_type as return_type,
      r.type_udt_name,
      r.routine_definition,
      (
        SELECT json_agg(
          json_build_object(
            'parameter_name', p.parameter_name,
            'data_type', p.data_type,
            'parameter_mode', p.parameter_mode,
            'ordinal_position', p.ordinal_position
          ) ORDER BY p.ordinal_position
        )
        FROM information_schema.parameters p
        WHERE p.specific_name = r.specific_name
      ) as parameters
    FROM information_schema.routines r
    WHERE r.routine_schema = 'public'
      AND r.routine_type = 'FUNCTION'
    ORDER BY r.routine_name;
  `;
  
  return await executeSQL(query, 'Fetching RPC function details');
}

/**
 * Fetch triggers
 */
async function fetchTriggers() {
  const query = `
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
  `;
  
  return await executeSQL(query, 'Fetching triggers');
}

/**
 * Fetch foreign keys
 */
async function fetchForeignKeys() {
  const query = `
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
  `;
  
  return await executeSQL(query, 'Fetching foreign key constraints');
}

/**
 * Fetch indexes
 */
async function fetchIndexes() {
  const query = `
    SELECT
      schemaname,
      tablename,
      indexname,
      indexdef
    FROM pg_indexes
    WHERE schemaname = 'public'
    ORDER BY tablename, indexname;
  `;
  
  return await executeSQL(query, 'Fetching indexes');
}

/**
 * Fetch views
 */
async function fetchViews() {
  const query = `
    SELECT 
      table_name as view_name,
      view_definition
    FROM information_schema.views
    WHERE table_schema = 'public'
    ORDER BY table_name;
  `;
  
  return await executeSQL(query, 'Fetching views');
}

/**
 * Fetch primary keys
 */
async function fetchPrimaryKeys() {
  const query = `
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
  `;
  
  return await executeSQL(query, 'Fetching primary keys');
}

/**
 * Fetch unique constraints
 */
async function fetchUniqueConstraints() {
  const query = `
    SELECT
      tc.table_name,
      tc.constraint_name,
      kcu.column_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    WHERE tc.constraint_type = 'UNIQUE'
      AND tc.table_schema = 'public'
    ORDER BY tc.table_name, tc.constraint_name;
  `;
  
  return await executeSQL(query, 'Fetching unique constraints');
}

/**
 * Fetch table row counts and sizes
 */
async function fetchTableStats() {
  const query = `
    SELECT 
      schemaname,
      relname as table_name,
      n_live_tup as row_count,
      pg_size_pretty(pg_total_relation_size(schemaname||'.'||relname)) as total_size,
      pg_size_pretty(pg_relation_size(schemaname||'.'||relname)) as table_size,
      pg_size_pretty(pg_total_relation_size(schemaname||'.'||relname) - pg_relation_size(schemaname||'.'||relname)) as indexes_size
    FROM pg_stat_user_tables
    WHERE schemaname = 'public'
    ORDER BY pg_total_relation_size(schemaname||'.'||relname) DESC;
  `;
  
  return await executeSQL(query, 'Fetching table statistics');
}

/**
 * Main execution
 */
async function main() {
  const completeSchema = {
    timestamp: new Date().toISOString(),
    supabase_url: SUPABASE_URL,
    metadata: {
      total_tables: 0,
      total_rpcs: 0,
      total_triggers: 0,
      total_views: 0,
      total_foreign_keys: 0,
      total_indexes: 0
    },
    tables: null,
    rpcs: null,
    triggers: null,
    views: null,
    foreignKeys: null,
    primaryKeys: null,
    uniqueConstraints: null,
    indexes: null,
    tableStats: null
  };

  try {
    console.log('Starting comprehensive schema fetch...\n');
    
    // Fetch all details
    completeSchema.tables = await fetchTableDetails();
    completeSchema.rpcs = await fetchRPCDetails();
    completeSchema.triggers = await fetchTriggers();
    completeSchema.views = await fetchViews();
    completeSchema.foreignKeys = await fetchForeignKeys();
    completeSchema.primaryKeys = await fetchPrimaryKeys();
    completeSchema.uniqueConstraints = await fetchUniqueConstraints();
    completeSchema.indexes = await fetchIndexes();
    completeSchema.tableStats = await fetchTableStats();
    
    // Update metadata
    completeSchema.metadata.total_tables = completeSchema.tables?.length || 0;
    completeSchema.metadata.total_rpcs = completeSchema.rpcs?.length || 0;
    completeSchema.metadata.total_triggers = completeSchema.triggers?.length || 0;
    completeSchema.metadata.total_views = completeSchema.views?.length || 0;
    completeSchema.metadata.total_foreign_keys = completeSchema.foreignKeys?.length || 0;
    completeSchema.metadata.total_indexes = completeSchema.indexes?.length || 0;
    
    // Save complete schema
    const outputPath = path.join(__dirname, 'complete-database-schema.json');
    fs.writeFileSync(outputPath, JSON.stringify(completeSchema, null, 2));
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ COMPLETE DATABASE SCHEMA SAVED');
    console.log('='.repeat(60));
    console.log(`📁 File: ${outputPath}`);
    console.log('\n📊 SUMMARY:');
    console.log(`   Tables: ${completeSchema.metadata.total_tables}`);
    console.log(`   RPCs/Functions: ${completeSchema.metadata.total_rpcs}`);
    console.log(`   Triggers: ${completeSchema.metadata.total_triggers}`);
    console.log(`   Views: ${completeSchema.metadata.total_views}`);
    console.log(`   Foreign Keys: ${completeSchema.metadata.total_foreign_keys}`);
    console.log(`   Indexes: ${completeSchema.metadata.total_indexes}`);
    
    if (completeSchema.tables === null) {
      console.log('\n⚠️  WARNING: Could not fetch detailed schema via SQL queries.');
      console.log('   This might be because:');
      console.log('   1. The exec_sql RPC function is not installed in Supabase');
      console.log('   2. Service role key lacks necessary permissions');
      console.log('\n💡 SOLUTION: Run the queries manually in Supabase SQL Editor');
      console.log('   SQL file: scripts/fetch-database-details.sql');
    }
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();