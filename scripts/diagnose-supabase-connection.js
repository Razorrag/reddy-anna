#!/usr/bin/env node

/**
 * Comprehensive Supabase Connection Diagnostic Script
 * Tests connection, schema, and authentication functionality
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

config({ path: path.resolve(__dirname, '..', '.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials. Please check your .env file.');
  console.error('Required: SUPABASE_URL and SUPABASE_SERVICE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  global: {
    fetch: (url, options = {}) => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
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

async function diagnoseConnection() {
  console.log('🔍 COMPREHENSIVE SUPABASE CONNECTION DIAGNOSTIC\n');
  console.log('='.repeat(60));
  
  // 1. Test basic connection
  console.log('\n1️⃣ Testing Basic Connection...');
  try {
    const { data, error, count } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .limit(1);
    
    if (error) {
      console.error('❌ Connection Error:', error.message);
      console.error('   Code:', error.code);
      console.error('   Details:', error.details);
      console.error('   Hint:', error.hint);
    } else {
      console.log('✅ Connection successful!');
      console.log(`   Users table accessible (${count || 0} users)`);
    }
  } catch (error) {
    console.error('❌ Connection Exception:', error.message);
    return false;
  }
  
  // 2. Check required tables
  console.log('\n2️⃣ Checking Required Tables...');
  const requiredTables = [
    'users',
    'admin_credentials',
    'game_sessions',
    'player_bets',
    'dealt_cards',
    'game_history',
    'user_transactions',
    'payment_requests',
    'game_settings'
  ];
  
  for (const table of requiredTables) {
    try {
      const { data, error, count } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true })
        .limit(1);
      
      if (error) {
        if (error.code === 'PGRST116') {
          console.log(`   ⚠️  ${table}: Table exists but empty`);
        } else if (error.code === '42P01') {
          console.error(`   ❌ ${table}: Table does NOT exist`);
        } else {
          console.error(`   ❌ ${table}: Error - ${error.message || 'Unknown'}`);
          console.error(`      Code: ${error.code}`);
        }
      } else {
        console.log(`   ✅ ${table}: Accessible (${count || 0} records)`);
      }
    } catch (error) {
      console.error(`   ❌ ${table}: Exception - ${error.message}`);
    }
  }
  
  // 3. Test admin credentials table
  console.log('\n3️⃣ Testing Admin Credentials...');
  try {
    const { data, error } = await supabase
      .from('admin_credentials')
      .select('username, role')
      .limit(5);
    
    if (error) {
      console.error('❌ Error accessing admin_credentials:', error.message);
      console.error('   Code:', error.code);
    } else {
      console.log('✅ Admin credentials accessible');
      if (data && data.length > 0) {
        console.log('   Found admins:');
        data.forEach(admin => {
          console.log(`     - ${admin.username} (${admin.role})`);
        });
      } else {
        console.log('   ⚠️  No admin accounts found');
      }
    }
  } catch (error) {
    console.error('❌ Exception accessing admin_credentials:', error.message);
  }
  
  // 4. Test user lookup (login simulation)
  console.log('\n4️⃣ Testing User Lookup (Login Simulation)...');
  try {
    const testPhone = '9876543210';
    const { data, error } = await supabase
      .from('users')
      .select('id, phone, password_hash, full_name, status')
      .eq('phone', testPhone)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        console.log(`   ⚠️  Test user ${testPhone} not found`);
        console.log('   💡 This is expected if you haven\'t run the reset script');
      } else {
        console.error('❌ Error looking up user:', error.message);
        console.error('   Code:', error.code);
      }
    } else {
      console.log(`✅ Test user found: ${data.full_name || data.phone}`);
      console.log(`   Status: ${data.status}`);
      console.log(`   Has password hash: ${!!data.password_hash}`);
    }
  } catch (error) {
    console.error('❌ Exception looking up user:', error.message);
  }
  
  // 5. Test creating a user (signup simulation)
  console.log('\n5️⃣ Testing User Creation (Signup Simulation)...');
  try {
    // Check if we can insert (we'll rollback)
    const testUser = {
      id: 'test_' + Date.now(),
      phone: '9999999999',
      password_hash: '$2b$12$test',
      full_name: 'Test User',
      role: 'player',
      status: 'active',
      balance: 0
    };
    
    const { data, error } = await supabase
      .from('users')
      .insert(testUser)
      .select()
      .single();
    
    if (error) {
      console.error('❌ Error creating test user:', error.message);
      console.error('   Code:', error.code);
      console.error('   Details:', error.details);
      console.error('   Hint:', error.hint);
      
      if (error.code === '23505') {
        console.error('   💡 This is a unique constraint violation (expected if test user exists)');
      } else if (error.code === '42501') {
        console.error('   💡 Permission denied - check RLS policies');
      }
    } else {
      console.log('✅ User creation works!');
      
      // Clean up - delete test user
      await supabase
        .from('users')
        .delete()
        .eq('id', testUser.id);
      console.log('   Cleaned up test user');
    }
  } catch (error) {
    console.error('❌ Exception creating user:', error.message);
  }
  
  // 6. Check RLS policies
  console.log('\n6️⃣ Checking Row Level Security (RLS)...');
  try {
    // Check if RLS is enabled on users table
    const { data: rlsData, error: rlsError } = await supabase
      .rpc('check_rls_status', { table_name: 'users' })
      .single();
    
    if (rlsError) {
      // RLS check function might not exist, that's okay
      console.log('   ℹ️  Cannot check RLS status (function may not exist)');
      console.log('   💡 If RLS is blocking, check your Supabase dashboard');
    } else {
      console.log(`   RLS Status: ${rlsData ? 'Enabled' : 'Disabled'}`);
    }
  } catch (error) {
    console.log('   ℹ️  RLS check not available (this is normal)');
  }
  
  // 7. Summary and recommendations
  console.log('\n' + '='.repeat(60));
  console.log('\n📋 DIAGNOSTIC SUMMARY\n');
  console.log('✅ If you see connection errors:');
  console.log('   1. Check your .env file has correct SUPABASE_URL and SUPABASE_SERVICE_KEY');
  console.log('   2. Verify your Supabase project is active');
  console.log('   3. Check your internet connection');
  console.log('\n✅ If tables are missing:');
  console.log('   1. Run: scripts/reset-and-recreate-database.sql in Supabase SQL Editor');
  console.log('   2. This will create all required tables and data');
  console.log('\n✅ If RLS is blocking access:');
  console.log('   1. Go to Supabase Dashboard > Authentication > Policies');
  console.log('   2. Disable RLS for development (or create proper policies)');
  console.log('   3. The reset script disables RLS by default');
  console.log('\n✅ If login/signup still fails:');
  console.log('   1. Check server logs for detailed error messages');
  console.log('   2. Verify password hashes are correct in database');
  console.log('   3. Check browser console for client-side errors');
  console.log('\n' + '='.repeat(60));
}

diagnoseConnection()
  .then(() => {
    console.log('\n✅ Diagnostic complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Diagnostic failed:', error);
    process.exit(1);
  });

