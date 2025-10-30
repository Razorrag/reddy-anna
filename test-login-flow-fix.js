// Test script to verify login flow fix
// Tests that login doesn't cause automatic logout/redirect loop

const fetch = require('node-fetch');

// Configuration
const SERVER_URL = process.env.SERVER_URL || 'http://localhost:5000';

// Test credentials
const TEST_USER = {
  phone: '9876543210',
  password: 'TestPass123'
};

let testResults = {
  passed: 0,
  failed: 0,
  details: []
};

function log(message, type = 'info') {
  const timestamp = new Date().toISOString();
  const prefix = type === 'pass' ? '✅' : type === 'fail' ? '❌' : 'ℹ️';
  console.log(`${prefix} [${timestamp}] ${message}`);
}

function recordTest(name, passed, details) {
  testResults.details.push({ name, passed, details });
  if (passed) {
    testResults.passed++;
    log(`TEST PASSED: ${name}`, 'pass');
  } else {
    testResults.failed++;
    log(`TEST FAILED: ${name} - ${details}`, 'fail');
  }
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Test 1: Login with Refresh Token
async function testLoginWithRefreshToken() {
  try {
    log('Testing login with refresh token...');
    
    const response = await fetch(`${SERVER_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(TEST_USER)
    });
    
    const data = await response.json();
    
    const hasToken = !!data.token;
    const hasRefreshToken = !!data.refreshToken;
    const hasUser = !!data.user;
    const isSuccess = data.success;
    
    recordTest(
      'Login with Refresh Token',
      isSuccess && hasToken && hasRefreshToken && hasUser,
      `Success: ${isSuccess}, Token: ${hasToken}, RefreshToken: ${hasRefreshToken}, User: ${hasUser}`
    );
    
    return data;
  } catch (error) {
    recordTest('Login with Refresh Token', false, error.message);
    return null;
  }
}

// Test 2: Token Validation
async function testTokenValidation(token) {
  try {
    log('Testing token validation...');
    
    // Test token structure
    const parts = token.split('.');
    if (parts.length !== 3) {
      recordTest('Token Validation', false, 'Invalid token structure');
      return false;
    }
    
    // Test token payload
    const payload = JSON.parse(atob(parts[1]));
    const hasExp = !!payload.exp;
    const hasIat = !!payload.iat;
    const hasUserId = !!payload.id;
    
    recordTest(
      'Token Validation',
      hasExp && hasIat && hasUserId,
      `HasExp: ${hasExp}, HasIat: ${hasIat}, HasUserId: ${hasUserId}`
    );
    
    return true;
  } catch (error) {
    recordTest('Token Validation', false, error.message);
    return false;
  }
}

// Test 3: Token Expiration Check
async function testTokenExpirationCheck(token) {
  try {
    log('Testing token expiration check...');
    
    const parts = token.split('.');
    const payload = JSON.parse(atob(parts[1]));
    
    const currentTime = Date.now() / 1000;
    const expirationTime = payload.exp;
    const timeUntilExpiration = expirationTime - currentTime;
    
    // Test with 30 second buffer (as implemented in fix)
    const isExpiredWithBuffer = timeUntilExpiration < 30;
    
    recordTest(
      'Token Expiration Check',
      !isExpiredWithBuffer,
      `TimeUntilExpiration: ${timeUntilExpiration}, IsExpiredWithBuffer: ${isExpiredWithBuffer}`
    );
    
    return !isExpiredWithBuffer;
  } catch (error) {
    recordTest('Token Expiration Check', false, error.message);
    return false;
  }
}

// Test 4: Protected Route Access Simulation
async function testProtectedRouteAccess(token) {
  try {
    log('Testing protected route access...');
    
    // Simulate accessing a protected route with the token
    const response = await fetch(`${SERVER_URL}/api/user/profile`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    const isSuccess = response.ok;
    const data = await response.json();
    
    recordTest(
      'Protected Route Access',
      isSuccess && !data.error,
      `Success: ${isSuccess}, HasError: ${!!data.error}`
    );
    
    return isSuccess;
  } catch (error) {
    recordTest('Protected Route Access', false, error.message);
    return false;
  }
}

// Test 5: WebSocket Connection with Token
async function testWebSocketConnection(token) {
  return new Promise((resolve) => {
    try {
      log('Testing WebSocket connection with token...');
      
      const WebSocket = require('ws');
      const ws = new WebSocket(`ws://localhost:5000/ws`);
      let authenticated = false;
      let gameStateReceived = false;
      
      const timeout = setTimeout(() => {
        if (!authenticated) {
          recordTest('WebSocket Connection with Token', false, 'Authentication timeout');
          ws.close();
          resolve(false);
        }
      }, 5000);
      
      ws.on('open', () => {
        log('WebSocket connected, sending authentication...');
        ws.send(JSON.stringify({
          type: 'authenticate',
          data: { token }
        }));
      });
      
      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          
          if (message.type === 'authenticated') {
            authenticated = true;
            gameStateReceived = !!message.data.gameState;
            
            recordTest(
              'WebSocket Connection with Token',
              authenticated && gameStateReceived,
              `Authenticated: ${authenticated}, GameState: ${gameStateReceived}`
            );
            
            clearTimeout(timeout);
            ws.close();
            resolve(true);
          } else if (message.type === 'auth_error') {
            clearTimeout(timeout);
            recordTest('WebSocket Connection with Token', false, message.data.message);
            ws.close();
            resolve(false);
          }
        } catch (error) {
          log(`WebSocket message parsing error: ${error.message}`);
        }
      });
      
      ws.on('error', (error) => {
        clearTimeout(timeout);
        recordTest('WebSocket Connection with Token', false, error.message);
        resolve(false);
      });
      
    } catch (error) {
      recordTest('WebSocket Connection with Token', false, error.message);
      resolve(false);
    }
  });
}

// Main test execution
async function runLoginFlowTests() {
  log('Starting Login Flow Fix Validation');
  log('='.repeat(60));
  
  // Test 1: Login with refresh token
  const loginResult = await testLoginWithRefreshToken();
  await sleep(500);
  
  if (!loginResult || !loginResult.token) {
    log('❌ Login failed, cannot proceed with further tests');
    return;
  }
  
  const token = loginResult.token;
  
  // Test 2: Token validation
  const tokenValid = await testTokenValidation(token);
  await sleep(500);
  
  if (!tokenValid) {
    log('❌ Token validation failed, cannot proceed with further tests');
    return;
  }
  
  // Test 3: Token expiration check
  const tokenNotExpired = await testTokenExpirationCheck(token);
  await sleep(500);
  
  if (!tokenNotExpired) {
    log('❌ Token expiration check failed, cannot proceed with further tests');
    return;
  }
  
  // Test 4: Protected route access
  const protectedRouteAccess = await testProtectedRouteAccess(token);
  await sleep(500);
  
  // Test 5: WebSocket connection
  await testWebSocketConnection(token);
  await sleep(500);
  
  // Print results
  log('='.repeat(60));
  log('LOGIN FLOW FIX TEST RESULTS SUMMARY', 'info');
  log(`Total Tests: ${testResults.passed + testResults.failed}`);
  log(`Passed: ${testResults.passed}`, 'pass');
  log(`Failed: ${testResults.failed}`, 'fail');
  log(`Success Rate: ${((testResults.passed / (testResults.passed + testResults.failed)) * 100).toFixed(2)}%`);
  
  log('\nDETAILED RESULTS:');
  testResults.details.forEach(test => {
    const status = test.passed ? 'PASS' : 'FAIL';
    log(`${status}: ${test.name} - ${test.details}`, test.passed ? 'pass' : 'fail');
  });
  
  log('\nLogin Flow Fix Validation Complete!');
  
  // Exit with appropriate code
  process.exit(testResults.failed > 0 ? 1 : 0);
}

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  log(`Uncaught Exception: ${error.message}`, 'fail');
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  log(`Unhandled Rejection: ${reason}`, 'fail');
  process.exit(1);
});

// Run tests
if (require.main === module) {
  runLoginFlowTests();
}

module.exports = {
  runLoginFlowTests,
  testLoginWithRefreshToken,
  testTokenValidation,
  testTokenExpirationCheck,
  testProtectedRouteAccess,
  testWebSocketConnection
};