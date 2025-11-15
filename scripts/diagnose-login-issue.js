#!/usr/bin/env node

/**
 * Comprehensive Login Issue Diagnostic
 * Tests both user and admin login endpoints
 */

import { config } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

config({ path: path.resolve(__dirname, '..', '.env') });

const API_URL = process.env.API_URL || 'http://localhost:5000';
const BASE_URL = `${API_URL}/api`;

async function testServerHealth() {
  console.log('🔍 Step 1: Testing Server Health...');
  console.log('='.repeat(60));
  
  try {
    const response = await fetch(`${API_URL}/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000)
    });
    
    if (response.ok) {
      console.log('✅ Server is running and accessible');
      return true;
    } else {
      console.log(`⚠️  Server responded with status: ${response.status}`);
      return true; // Server is responding, just not with 200
    }
  } catch (error) {
    console.error('❌ Server is NOT running or not accessible!');
    console.error('   Error:', error.message);
    console.error('\n💡 SOLUTION:');
    console.error('   1. Make sure the server is running');
    console.error('   2. Start server with: npm run dev');
    console.error('   3. Check if server is running on port 5000');
    return false;
  }
}

async function testUserLogin() {
  console.log('\n🔍 Step 2: Testing User Login...');
  console.log('='.repeat(60));
  
  try {
    const testPhone = '9876543210';
    const testPassword = 'Test@123';
    
    console.log(`Testing with phone: ${testPhone}`);
    console.log(`Password: ${testPassword}`);
    
    const response = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        phone: testPhone,
        password: testPassword
      })
    });
    
    const data = await response.json();
    
    console.log(`Status: ${response.status} ${response.statusText}`);
    console.log('Response:', JSON.stringify(data, null, 2));
    
    if (response.ok && data.success) {
      console.log('✅ User login successful!');
      console.log(`   User ID: ${data.user?.id}`);
      console.log(`   Phone: ${data.user?.phone}`);
      console.log(`   Balance: ₹${data.user?.balance}`);
      console.log(`   Has token: ${!!data.token}`);
      console.log(`   Has refreshToken: ${!!data.refreshToken}`);
      return true;
    } else {
      console.error('❌ User login failed:', data.error);
      if (data.details) {
        console.error('   Validation errors:', data.details);
      }
      return false;
    }
  } catch (error) {
    console.error('❌ User login request failed:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.error('   💡 Server is not running!');
    } else if (error.message.includes('fetch failed')) {
      console.error('   💡 Cannot reach server. Check if server is running on port 5000');
    }
    return false;
  }
}

async function testAdminLogin() {
  console.log('\n🔍 Step 3: Testing Admin Login...');
  console.log('='.repeat(60));
  
  try {
    const testUsername = 'admin';
    const testPassword = 'admin123';
    
    console.log(`Testing with username: ${testUsername}`);
    console.log(`Password: ${testPassword}`);
    
    const response = await fetch(`${BASE_URL}/auth/admin-login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: testUsername,
        password: testPassword
      })
    });
    
    const data = await response.json();
    
    console.log(`Status: ${response.status} ${response.statusText}`);
    console.log('Response:', JSON.stringify(data, null, 2));
    
    if (response.ok && data.success) {
      console.log('✅ Admin login successful!');
      console.log(`   Admin ID: ${data.admin?.id}`);
      console.log(`   Username: ${data.admin?.username}`);
      console.log(`   Role: ${data.admin?.role}`);
      console.log(`   Has token: ${!!data.token}`);
      console.log(`   Has refreshToken: ${!!data.refreshToken}`);
      return true;
    } else {
      console.error('❌ Admin login failed:', data.error);
      if (data.details) {
        console.error('   Validation errors:', data.details);
      }
      return false;
    }
  } catch (error) {
    console.error('❌ Admin login request failed:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.error('   💡 Server is not running!');
    }
    return false;
  }
}

async function testDatabaseConnection() {
  console.log('\n🔍 Step 4: Testing Database Connection...');
  console.log('='.repeat(60));
  
  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('❌ Missing Supabase credentials in .env file');
      return false;
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Test user lookup
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, phone, password_hash')
      .eq('phone', '9876543210')
      .single();
    
    if (userError) {
      console.error('❌ Error looking up test user:', userError.message);
      return false;
    }
    
    console.log('✅ Database connection working');
    console.log(`   Test user found: ${userData.id}`);
    console.log(`   Has password hash: ${!!userData.password_hash}`);
    
    // Test admin lookup
    const { data: adminData, error: adminError } = await supabase
      .from('admin_credentials')
      .select('id, username, password_hash')
      .eq('username', 'admin')
      .single();
    
    if (adminError) {
      console.error('❌ Error looking up admin:', adminError.message);
      return false;
    }
    
    console.log(`   Admin found: ${adminData.username}`);
    console.log(`   Has password hash: ${!!adminData.password_hash}`);
    
    return true;
  } catch (error) {
    console.error('❌ Database connection test failed:', error.message);
    return false;
  }
}

async function checkEnvironmentVariables() {
  console.log('\n🔍 Step 5: Checking Environment Variables...');
  console.log('='.repeat(60));
  
  const required = [
    'SUPABASE_URL',
    'SUPABASE_SERVICE_KEY',
    'JWT_SECRET'
  ];
  
  const missing = [];
  const present = [];
  
  for (const varName of required) {
    if (process.env[varName]) {
      present.push(varName);
      console.log(`✅ ${varName}: Set`);
    } else {
      missing.push(varName);
      console.log(`❌ ${varName}: Missing`);
    }
  }
  
  if (missing.length > 0) {
    console.error('\n❌ Missing required environment variables:', missing.join(', '));
    console.error('   Please check your .env file');
    return false;
  }
  
  console.log('\n✅ All required environment variables are set');
  return true;
}

async function runDiagnostics() {
  console.log('🧪 COMPREHENSIVE LOGIN ISSUE DIAGNOSTIC');
  console.log('='.repeat(60));
  console.log(`API URL: ${BASE_URL}`);
  console.log(`Server URL: ${API_URL}`);
  console.log('');
  
  const results = {
    serverHealth: false,
    envVars: false,
    database: false,
    userLogin: false,
    adminLogin: false
  };
  
  // Step 1: Check environment variables
  results.envVars = await checkEnvironmentVariables();
  if (!results.envVars) {
    console.log('\n❌ Cannot continue without environment variables');
    return;
  }
  
  // Step 2: Test server health
  results.serverHealth = await testServerHealth();
  if (!results.serverHealth) {
    console.log('\n❌ Cannot continue without server running');
    return;
  }
  
  // Step 3: Test database connection
  results.database = await testDatabaseConnection();
  
  // Step 4: Test user login
  results.userLogin = await testUserLogin();
  
  // Step 5: Test admin login
  results.adminLogin = await testAdminLogin();
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📋 DIAGNOSTIC SUMMARY');
  console.log('='.repeat(60));
  console.log(`Environment Variables: ${results.envVars ? '✅' : '❌'}`);
  console.log(`Server Health: ${results.serverHealth ? '✅' : '❌'}`);
  console.log(`Database Connection: ${results.database ? '✅' : '❌'}`);
  console.log(`User Login: ${results.userLogin ? '✅' : '❌'}`);
  console.log(`Admin Login: ${results.adminLogin ? '✅' : '❌'}`);
  
  console.log('\n💡 RECOMMENDATIONS:');
  
  if (!results.serverHealth) {
    console.log('   1. Start the server: npm run dev');
  }
  
  if (!results.envVars) {
    console.log('   2. Check your .env file has all required variables');
  }
  
  if (!results.database) {
    console.log('   3. Run the database reset script in Supabase SQL Editor');
    console.log('      File: scripts/reset-and-recreate-database.sql');
  }
  
  if (results.database && !results.userLogin && !results.adminLogin) {
    console.log('   4. Password hashes might be incorrect in database');
    console.log('   5. Run the reset script to update password hashes');
  }
  
  if (results.serverHealth && results.database && !results.userLogin) {
    console.log('   6. Check server logs for detailed error messages');
    console.log('   7. Verify password hash matches in database');
  }
  
  console.log('\n' + '='.repeat(60));
}

runDiagnostics()
  .then(() => {
    console.log('\n✅ Diagnostic complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Diagnostic failed:', error);
    process.exit(1);
  });
















