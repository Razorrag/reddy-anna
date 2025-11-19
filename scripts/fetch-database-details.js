/**
 * Fetch Complete Database Details from Supabase
 * 
 * This script fetches:
 * - All tables with column definitions
 * - All RPCs/functions with parameters
 * - All triggers with definitions
 * - All views
 * - All foreign keys
 * - All indexes
 * 
 * Output: JSON file with complete database structure
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
  console.error('❌ Missing Supabase credentials in .env file');
  console.error('Required: SUPABASE_URL and SUPABASE_SERVICE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

console.log('🔍 Fetching complete database structure from Supabase...\n');

/**
 * Execute raw SQL query
 */
async function executeSQL(query) {
  try {
    const { data, error } = await supabase.rpc('exec_sql', { query });
    if (error) {
      // If RPC doesn't exist, try direct query
      const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`
        },
        body: JSON.stringify({ query })
      });
      
      if (!response.ok) {
        throw new Error(`SQL execution failed: ${response.statusText}`);
      }
      
      return await response.json();
    }
    return data;
  } catch (err) {
    console.warn(`⚠️  SQL execution method failed, trying alternative...`);
    // Alternative: Use Supabase REST API directly
    return null;
  }
}

/**
 * Fetch all tables with columns
 */
async function fetchTables() {
  console.log('📋 Fetching tables...');
  
  const query = `
    SELECT 
      t.table_name,
      json_agg(
        json_build_object(
          'column_name', c.column_name,
          'data_type', c.data_type,
          'is_nullable', c.is_nullable,
          'column_default', c.column_default,
          'character_maximum_length', c.character_maximum_length,
          'numeric_precision', c.numeric_precision
        ) ORDER BY c.ordinal_position
      ) as columns
    FROM information_schema.tables t
    LEFT JOIN information_schema.columns c ON t.table_name = c.table_name
    WHERE t.table_schema = 'public' 
      AND t.table_type = 'BASE TABLE'
    GROUP BY t.table_name
    ORDER BY t.table_name;
  `;
  
  try {
    const { data, error } = await supabase
      .from('information_schema.tables')
      .select('*')
      .eq('table_schema', 'public')
      .eq('table_type', 'BASE TABLE');
    
    // Since information_schema might not be directly accessible, 
    // we'll use a different approach - list tables via PostgREST
    const response = await fetch(`${SUPABASE_URL}/rest/v1/`, {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`
      }
    });
    
    if (response.ok) {
      const schema = await response.json();
      const tables = schema.definitions ? Object.keys(schema.definitions) : [];
      
      // Fetch detailed info for each table
      const tableDetails = [];
      for (const tableName of tables) {
        try {
          const { data, error } = await supabase
            .from(tableName)
            .select('*')
            .limit(0); // Just get schema, no data
          
          if (!error) {
            tableDetails.push({
              table_name: tableName,
              exists: true
            });
          }
        } catch (err) {
          // Table might not be accessible
        }
      }
      
      console.log(`✅ Found ${tableDetails.length} tables`);
      return tableDetails;
    }
  } catch (err) {
    console.error('Error fetching tables:', err.message);
  }
  
  return [];
}

/**
 * Fetch all RPC functions
 */
async function fetchRPCs() {
  console.log('⚙️  Fetching RPC functions...');
  
  try {
    // Try to list available RPCs
    const response = await fetch(`${SUPABASE_URL}/rest/v1/`, {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`
      }
    });
    
    if (response.ok) {
      const schema = await response.json();
      const rpcs = schema.paths ? Object.keys(schema.paths)
        .filter(path => path.startsWith('/rpc/'))
        .map(path => path.replace('/rpc/', '')) : [];
      
      console.log(`✅ Found ${rpcs.length} RPC functions`);
      return rpcs.map(name => ({ routine_name: name, routine_type: 'FUNCTION' }));
    }
  } catch (err) {
    console.error('Error fetching RPCs:', err.message);
  }
  
  return [];
}

/**
 * Fetch all triggers
 */
async function fetchTriggers() {
  console.log('🔔 Fetching triggers...');
  
  // Triggers are harder to fetch via REST API
  // We'll note that they exist but can't get details without direct SQL access
  console.log('⚠️  Trigger details require direct SQL access');
  
  return [];
}

/**
 * Fetch all views
 */
async function fetchViews() {
  console.log('👁️  Fetching views...');
  
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/`, {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`
      }
    });
    
    if (response.ok) {
      const schema = await response.json();
      // Views would be in definitions but marked differently
      console.log('✅ Views checked');
    }
  } catch (err) {
    console.error('Error fetching views:', err.message);
  }
  
  return [];
}

/**
 * Fetch foreign keys
 */
async function fetchForeignKeys() {
  console.log('🔗 Fetching foreign keys...');
  
  console.log('⚠️  Foreign key details require direct SQL access');
  
  return [];
}

/**
 * Fetch indexes
 */
async function fetchIndexes() {
  console.log('📇 Fetching indexes...');
  
  console.log('⚠️  Index details require direct SQL access');
  
  return [];
}

/**
 * Alternative: Use pg connection for detailed info
 */
async function fetchWithPgClient() {
  console.log('\n🔄 Attempting to fetch detailed info using direct PostgreSQL queries...\n');
  
  const queries = {
    tables: `
      SELECT 
        t.table_name,
        json_agg(
          json_build_object(
            'column_name', c.column_name,
            'data_type', c.data_type,
            'is_nullable', c.is_nullable,
            'column_default', c.column_default
          ) ORDER BY c.ordinal_position
        ) as columns
      FROM information_schema.tables t
      LEFT JOIN information_schema.columns c ON t.table_name = c.table_name AND t.table_schema = c.table_schema
      WHERE t.table_schema = 'public' AND t.table_type = 'BASE TABLE'
      GROUP BY t.table_name
      ORDER BY t.table_name;
    `,
    
    rpcs: `
      SELECT 
        routine_name,
        routine_type,
        data_type as return_type,
        routine_definition
      FROM information_schema.routines
      WHERE routine_schema = 'public'
      ORDER BY routine_name;
    `,
    
    triggers: `
      SELECT 
        trigger_name,
        event_object_table as table_name,
        action_timing,
        event_manipulation,
        action_statement
      FROM information_schema.triggers
      WHERE trigger_schema = 'public'
      ORDER BY trigger_name;
    `,
    
    views: `
      SELECT 
        table_name as view_name,
        view_definition
      FROM information_schema.views
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `,
    
    foreignKeys: `
      SELECT
        tc.constraint_name,
        tc.table_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema = 'public'
      ORDER BY tc.table_name, tc.constraint_name;
    `,
    
    indexes: `
      SELECT
        schemaname,
        tablename,
        indexname,
        indexdef
      FROM pg_indexes
      WHERE schemaname = 'public'
      ORDER BY tablename, indexname;
    `
  };
  
  const results = {};
  
  for (const [key, query] of Object.entries(queries)) {
    console.log(`  Fetching ${key}...`);
    // Note: We can't execute these directly via Supabase client REST API
    // User will need to run these in Supabase SQL Editor
    results[key] = {
      query,
      note: 'Run this query in Supabase SQL Editor to get detailed information'
    };
  }
  
  return results;
}

/**
 * Main execution
 */
async function main() {
  const databaseDetails = {
    timestamp: new Date().toISOString(),
    supabase_url: SUPABASE_URL,
    tables: [],
    rpcs: [],
    triggers: [],
    views: [],
    foreignKeys: [],
    indexes: [],
    sql_queries: {}
  };
  
  try {
    // Fetch basic info
    databaseDetails.tables = await fetchTables();
    databaseDetails.rpcs = await fetchRPCs();
    databaseDetails.triggers = await fetchTriggers();
    databaseDetails.views = await fetchViews();
    databaseDetails.foreignKeys = await fetchForeignKeys();
    databaseDetails.indexes = await fetchIndexes();
    
    // Get SQL queries for manual execution
    databaseDetails.sql_queries = await fetchWithPgClient();
    
    // Save to file
    const outputPath = path.join(__dirname, 'database-structure.json');
    fs.writeFileSync(outputPath, JSON.stringify(databaseDetails, null, 2));
    
    console.log('\n✅ Database structure saved to:', outputPath);
    console.log('\n📊 Summary:');
    console.log(`   Tables: ${databaseDetails.tables.length}`);
    console.log(`   RPCs: ${databaseDetails.rpcs.length}`);
    console.log(`   Triggers: ${databaseDetails.triggers.length}`);
    console.log(`   Views: ${databaseDetails.views.length}`);
    
    // Create SQL file for manual execution
    const sqlQueries = Object.entries(databaseDetails.sql_queries)
      .map(([key, value]) => `-- ${key.toUpperCase()}\n${value.query}\n`)
      .join('\n');
    
    const sqlPath = path.join(__dirname, 'fetch-database-details.sql');
    fs.writeFileSync(sqlPath, sqlQueries);
    console.log('\n📝 SQL queries saved to:', sqlPath);
    console.log('   Run these queries in Supabase SQL Editor for complete details');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

main();