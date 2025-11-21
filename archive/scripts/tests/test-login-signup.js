#!/usr/bin/env node

/**
 * Test Login and Signup Endpoints
 * Verifies that authentication endpoints are working correctly
 */

import { config } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

config({ path: path.resolve(__dirname, '..', '.env') });

const API_URL = process.env.API_URL || 'http://localhost:5000';
const BASE_URL = `${API_URL}/api`;

async function testLogin() {
  console.log('\n🔑 Testing Login Endpoint...');
  console.log('='.repeat(60));
  
  try {
    const response = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        phone: '9876543210',
        password: 'Test@123'
      })
    });
    
    const data = await response.json();
    
    console.log(`Status: ${response.status} ${response.statusText}`);
    console.log('Response:', JSON.stringify(data, null, 2));
    
    if (response.ok && data.success) {
      console.log('✅ Login successful!');
      console.log(`   User ID: ${data.user?.id}`);
      console.log(`   Phone: ${data.user?.phone}`);
      console.log(`   Balance: ₹${data.user?.balance}`);
      console.log(`   Has token: ${!!data.token}`);
      return data.token;
    } else {
      console.error('❌ Login failed:', data.error);
      return null;
    }
  } catch (error) {
    console.error('❌ Login request failed:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.error('   💡 Server is not running!');
      console.error('   💡 Start the server with: npm run dev');
    } else if (error.message.includes('fetch failed')) {
      console.error('   💡 Cannot reach server. Check if server is running on port 5000');
    }
    return null;
  }
}

async function testSignup() {
  console.log('\n📝 Testing Signup Endpoint...');
  console.log('='.repeat(60));
  
  try {
    const testPhone = '9999999999';
    const response = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'Test User',
        phone: testPhone,
        password: 'Test@123',
        confirmPassword: 'Test@123'
      })
    });
    
    const data = await response.json();
    
    console.log(`Status: ${response.status} ${response.statusText}`);
    console.log('Response:', JSON.stringify(data, null, 2));
    
    if (response.ok && data.success) {
      console.log('✅ Signup successful!');
      console.log(`   User ID: ${data.user?.id}`);
      console.log(`   Phone: ${data.user?.phone}`);
      console.log(`   Balance: ₹${data.user?.balance}`);
      console.log(`   Has token: ${!!data.token}`);
      
      // Clean up - delete test user
      console.log('\n🧹 Cleaning up test user...');
      // Note: We can't easily delete via API without auth, but that's okay
      return true;
    } else {
      if (data.error?.includes('already exists')) {
        console.log('⚠️  User already exists (this is expected if test was run before)');
      } else {
        console.error('❌ Signup failed:', data.error);
        if (data.details) {
          console.error('   Validation errors:', data.details);
        }
      }
      return false;
    }
  } catch (error) {
    console.error('❌ Signup request failed:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.error('   💡 Server is not running!');
      console.error('   💡 Start the server with: npm run dev');
    } else if (error.message.includes('fetch failed')) {
      console.error('   💡 Cannot reach server. Check if server is running on port 5000');
    }
    return false;
  }
}

async function testAdminLogin() {
  console.log('\n👑 Testing Admin Login Endpoint...');
  console.log('='.repeat(60));
  
  try {
    const response = await fetch(`${BASE_URL}/auth/admin-login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: 'admin',
        password: 'admin123'
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
      return data.token;
    } else {
      console.error('❌ Admin login failed:', data.error);
      return null;
    }
  } catch (error) {
    console.error('❌ Admin login request failed:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.error('   💡 Server is not running!');
      console.error('   💡 Start the server with: npm run dev');
    }
    return false;
  }
}

async function runTests() {
  console.log('🧪 TESTING AUTHENTICATION ENDPOINTS');
  console.log('='.repeat(60));
  console.log(`API URL: ${BASE_URL}`);
  console.log(`Server URL: ${API_URL}`);
  
  // Test 1: Check if server is running
  console.log('\n0️⃣ Checking if server is running...');
  try {
    const healthCheck = await fetch(`${API_URL}/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000)
    });
    console.log('✅ Server is running!');
  } catch (error) {
    console.error('❌ Server is NOT running or not accessible!');
    console.error('   Error:', error.message);
    console.error('\n💡 SOLUTION:');
    console.error('   1. Make sure the server is running');
    console.error('   2. Start server with: npm run dev');
    console.error('   3. Check if server is running on port 5000');
    console.error('   4. Check server logs for errors');
    return;
  }
  
  // Test 2: Test user login
  await testLogin();
  
  // Test 3: Test admin login
  await testAdminLogin();
  
  // Test 4: Test signup
  await testSignup();
  
  console.log('\n' + '='.repeat(60));
  console.log('\n📋 TEST SUMMARY\n');
  console.log('✅ If login/signup tests pass:');
  console.log('   - Authentication endpoints are working');
  console.log('   - Issue might be client-side (browser)');
  console.log('   - Check browser console for errors');
  console.log('\n❌ If tests fail:');
  console.log('   1. Check server logs for detailed error messages');
  console.log('   2. Verify database connection (run: node scripts/diagnose-supabase-connection.js)');
  console.log('   3. Check if environment variables are set correctly');
  console.log('   4. Verify password hashes in database match');
  console.log('\n' + '='.repeat(60));
}

runTests()
  .then(() => {
    console.log('\n✅ Tests complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Tests failed:', error);
    process.exit(1);
  });

