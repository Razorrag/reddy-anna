#!/usr/bin/env node

/**
 * Comprehensive Login Fix Script
 * Diagnoses and provides fixes for login issues
 */

import { config } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

config({ path: path.resolve(__dirname, '..', '.env') });

console.log('🔧 COMPREHENSIVE LOGIN ISSUE FIXER');
console.log('='.repeat(60));
console.log('');

async function checkEnvironmentVariables() {
  console.log('1️⃣ Checking Environment Variables...');
  console.log('-'.repeat(60));
  
  const required = ['SUPABASE_URL', 'SUPABASE_SERVICE_KEY', 'JWT_SECRET'];
  const missing = [];
  
  for (const varName of required) {
    if (process.env[varName]) {
      const value = process.env[varName];
      const masked = value.length > 20 ? value.substring(0, 10) + '...' + value.substring(value.length - 5) : '***';
      console.log(`   ✅ ${varName}: ${masked}`);
    } else {
      console.log(`   ❌ ${varName}: MISSING`);
      missing.push(varName);
    }
  }
  
  if (missing.length > 0) {
    console.log('\n   ❌ Missing required variables:', missing.join(', '));
    console.log('   💡 Create a .env file in the root directory with:');
    console.log('      SUPABASE_URL=your_supabase_url');
    console.log('      SUPABASE_SERVICE_KEY=your_service_key');
    console.log('      JWT_SECRET=your_jwt_secret');
    return false;
  }
  
  console.log('   ✅ All required environment variables are set\n');
  return true;
}

async function checkDatabaseConnection() {
  console.log('2️⃣ Checking Database Connection...');
  console.log('-'.repeat(60));
  
  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Test connection
    const { data, error, count } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .limit(1);
    
    if (error) {
      console.log(`   ❌ Database connection failed: ${error.message}`);
      return false;
    }
    
    console.log(`   ✅ Database connection successful (${count || 0} users found)`);
    
    // Check test user
    const { data: testUser, error: userError } = await supabase
      .from('users')
      .select('id, phone, password_hash')
      .eq('phone', '9876543210')
      .single();
    
    if (userError || !testUser) {
      console.log('   ⚠️  Test user not found - run database reset script');
      return false;
    }
    
    console.log(`   ✅ Test user found: ${testUser.id}`);
    console.log(`   ✅ Has password hash: ${!!testUser.password_hash}`);
    
    // Check admin
    const { data: admin, error: adminError } = await supabase
      .from('admin_credentials')
      .select('username, password_hash')
      .eq('username', 'admin')
      .single();
    
    if (adminError || !admin) {
      console.log('   ⚠️  Admin not found - run database reset script');
      return false;
    }
    
    console.log(`   ✅ Admin found: ${admin.username}`);
    console.log(`   ✅ Has password hash: ${!!admin.password_hash}\n`);
    
    return true;
  } catch (error) {
    console.log(`   ❌ Database check failed: ${error.message}\n`);
    return false;
  }
}

async function checkServerStatus() {
  console.log('3️⃣ Checking Server Status...');
  console.log('-'.repeat(60));
  
  const API_URL = process.env.API_URL || 'http://localhost:5000';
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    
    const response = await fetch(`${API_URL}/health`, {
      method: 'GET',
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (response.ok) {
      console.log('   ✅ Server is running and accessible');
      console.log(`   ✅ Server URL: ${API_URL}\n`);
      return true;
    } else {
      console.log(`   ⚠️  Server responded with status: ${response.status}`);
      return false;
    }
  } catch (error) {
    if (error.name === 'AbortError') {
      console.log('   ❌ Server is not responding (timeout)');
    } else if (error.code === 'ECONNREFUSED') {
      console.log('   ❌ Server is NOT running');
    } else {
      console.log(`   ❌ Server check failed: ${error.message}`);
    }
    console.log('   💡 Start the server with: npm run dev\n');
    return false;
  }
}

async function testLoginEndpoints() {
  console.log('4️⃣ Testing Login Endpoints...');
  console.log('-'.repeat(60));
  
  const API_URL = process.env.API_URL || 'http://localhost:5000';
  const BASE_URL = `${API_URL}/api`;
  
  // Test user login
  console.log('   Testing user login...');
  try {
    const response = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone: '9876543210',
        password: 'Test@123'
      })
    });
    
    const data = await response.json();
    
    if (response.ok && data.success) {
      console.log('   ✅ User login successful');
      console.log(`   ✅ Token received: ${!!data.token}`);
    } else {
      console.log(`   ❌ User login failed: ${data.error || 'Unknown error'}`);
      if (data.error?.includes('not found')) {
        console.log('   💡 Run database reset script to create test users');
      }
    }
  } catch (error) {
    console.log(`   ❌ User login test failed: ${error.message}`);
  }
  
  // Test admin login
  console.log('   Testing admin login...');
  try {
    const response = await fetch(`${BASE_URL}/auth/admin-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'admin',
        password: 'admin123'
      })
    });
    
    const data = await response.json();
    
    if (response.ok && data.success) {
      console.log('   ✅ Admin login successful');
      console.log(`   ✅ Token received: ${!!data.token}\n`);
    } else {
      console.log(`   ❌ Admin login failed: ${data.error || 'Unknown error'}`);
      if (data.error?.includes('not found')) {
        console.log('   💡 Run database reset script to create admin accounts\n');
      }
    }
  } catch (error) {
    console.log(`   ❌ Admin login test failed: ${error.message}\n`);
  }
}

async function generateFixInstructions() {
  console.log('\n' + '='.repeat(60));
  console.log('📋 FIX INSTRUCTIONS');
  console.log('='.repeat(60));
  console.log('');
  
  console.log('🔧 Step 1: Start the Server');
  console.log('   Run this command in your terminal:');
  console.log('   npm run dev');
  console.log('');
  console.log('   Or start both server and client:');
  console.log('   npm run dev:both');
  console.log('');
  
  console.log('🔧 Step 2: Verify Server Started');
  console.log('   You should see:');
  console.log('   ✅ Server started on port 5000');
  console.log('   ✅ JWT Authentication enabled');
  console.log('   ✅ Supabase connection configured');
  console.log('');
  
  console.log('🔧 Step 3: Test Login');
  console.log('   User Login:');
  console.log('   - Phone: 9876543210');
  console.log('   - Password: Test@123');
  console.log('');
  console.log('   Admin Login:');
  console.log('   - Username: admin');
  console.log('   - Password: admin123');
  console.log('');
  
  console.log('🔧 Step 4: If Database Issues');
  console.log('   1. Go to Supabase Dashboard');
  console.log('   2. Open SQL Editor');
  console.log('   3. Run: scripts/reset-and-recreate-database.sql');
  console.log('   4. This will create fresh password hashes');
  console.log('');
  
  console.log('🔧 Step 5: If Server Won\'t Start');
  console.log('   Check for errors in terminal');
  console.log('   Common issues:');
  console.log('   - Port 5000 already in use');
  console.log('   - Missing environment variables');
  console.log('   - Database connection failed');
  console.log('');
  
  console.log('='.repeat(60));
}

async function main() {
  const results = {
    env: false,
    database: false,
    server: false
  };
  
  // Step 1: Check environment
  results.env = await checkEnvironmentVariables();
  if (!results.env) {
    console.log('❌ Cannot continue without environment variables\n');
    await generateFixInstructions();
    process.exit(1);
  }
  
  // Step 2: Check database
  results.database = await checkDatabaseConnection();
  if (!results.database) {
    console.log('⚠️  Database issues detected - run reset script\n');
  }
  
  // Step 3: Check server
  results.server = await checkServerStatus();
  if (!results.server) {
    console.log('❌ Server is not running\n');
    await generateFixInstructions();
    process.exit(1);
  }
  
  // Step 4: Test endpoints
  if (results.server) {
    await testLoginEndpoints();
  }
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 SUMMARY');
  console.log('='.repeat(60));
  console.log(`Environment Variables: ${results.env ? '✅' : '❌'}`);
  console.log(`Database Connection: ${results.database ? '✅' : '❌'}`);
  console.log(`Server Status: ${results.server ? '✅' : '❌'}`);
  console.log('');
  
  if (results.env && results.database && results.server) {
    console.log('✅ All checks passed! Login should work now.');
    console.log('   Try logging in with test credentials.');
  } else {
    console.log('❌ Some checks failed. Follow the fix instructions above.');
    await generateFixInstructions();
  }
  
  console.log('\n' + '='.repeat(60));
}

main().catch(error => {
  console.error('❌ Script failed:', error);
  process.exit(1);
});
















