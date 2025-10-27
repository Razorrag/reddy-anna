// Test script to verify JWT authentication and user management functionality
const fetch = require('node-fetch');

const API_BASE = 'http://localhost:5000/api';

async function testAuthentication() {
  console.log('🧪 Testing Authentication System...\n');

  // Test 1: Register a new user
  console.log('1. Testing user registration...');
  try {
    const registerResponse = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test User',
        phone: '9876543210',
        password: 'test123',
        confirmPassword: 'test123'
      })
    });

    const registerData = await registerResponse.json();
    console.log('Registration Response:', registerData);

    if (registerData.success && registerData.user && registerData.user.token) {
      console.log('✅ User registration successful');
      console.log('✅ JWT token received:', registerData.user.token.substring(0, 20) + '...');
      
      const userToken = registerData.user.token;
      
      // Test 2: Test authenticated user endpoint
      console.log('\n2. Testing authenticated user endpoint...');
      const profileResponse = await fetch(`${API_BASE}/user/profile`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${userToken}`,
          'Content-Type': 'application/json'
        }
      });

      const profileData = await profileResponse.json();
      console.log('Profile Response:', profileData);

      if (profileData.success) {
        console.log('✅ User profile access successful');
      } else {
        console.log('❌ User profile access failed:', profileData.error);
      }

      // Test 3: Test token refresh
      console.log('\n3. Testing token refresh...');
      if (registerData.user.refreshToken) {
        const refreshResponse = await fetch(`${API_BASE}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            refreshToken: registerData.user.refreshToken
          })
        });

        const refreshData = await refreshResponse.json();
        console.log('Refresh Response:', refreshData);

        if (refreshData.success && refreshData.token) {
          console.log('✅ Token refresh successful');
          console.log('✅ New JWT token received:', refreshData.token.substring(0, 20) + '...');
        } else {
          console.log('❌ Token refresh failed:', refreshData.error);
        }
      } else {
        console.log('❌ No refresh token provided during registration');
      }

    } else {
      console.log('❌ User registration failed:', registerData.error);
    }

  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
  }

  // Test 4: Test admin login
  console.log('\n4. Testing admin login...');
  try {
    const adminResponse = await fetch(`${API_BASE}/auth/admin-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'admin',
        password: 'admin123'
      })
    });

    const adminData = await adminResponse.json();
    console.log('Admin Login Response:', adminData);

    if (adminData.success && adminData.admin && adminData.admin.token) {
      console.log('✅ Admin login successful');
      console.log('✅ Admin JWT token received:', adminData.admin.token.substring(0, 20) + '...');
      
      const adminToken = adminData.admin.token;
      
      // Test 5: Test admin user management endpoint
      console.log('\n5. Testing admin user management endpoint...');
      const usersResponse = await fetch(`${API_BASE}/admin/users`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        }
      });

      const usersData = await usersResponse.json();
      console.log('Users Response:', usersData);

      if (usersData.success) {
        console.log('✅ Admin user management access successful');
        console.log(`✅ Retrieved ${usersData.data?.length || 0} users`);
      } else {
        console.log('❌ Admin user management access failed:', usersData.error);
      }

    } else {
      console.log('❌ Admin login failed:', adminData.error);
    }

  } catch (error) {
    console.error('❌ Admin test failed with error:', error.message);
  }

  console.log('\n🏁 Authentication tests completed!');
}

// Run the test
testAuthentication().catch(console.error);