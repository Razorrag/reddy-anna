// Complete Authentication and WebSocket Fix Validation Script
// Tests all aspects of the authentication and WebSocket cyclic issue fix

const WebSocket = require('ws');
const fetch = require('node-fetch');

// Configuration
const SERVER_URL = process.env.SERVER_URL || 'http://localhost:5000';
const WS_URL = process.env.WS_URL || 'ws://localhost:5000/ws';

// Test credentials
const TEST_USER = {
  phone: '9876543210',
  password: 'TestPass123'
};

const TEST_ADMIN = {
  username: 'admin',
  password: 'AdminPass123'
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

// Test 1: User Registration with Refresh Token
async function testUserRegistration() {
  try {
    log('Testing user registration with refresh token...');
    
    const response = await fetch(`${SERVER_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test User',
        phone: TEST_USER.phone,
        password: TEST_USER.password,
        confirmPassword: TEST_USER.password
      })
    });
    
    const data = await response.json();
    
    const hasToken = !!data.token;
    const hasRefreshToken = !!data.refreshToken;
    const hasUser = !!data.user;
    
    recordTest(
      'User Registration with Refresh Token',
      hasToken && hasRefreshToken && hasUser,
      `Token: ${hasToken}, RefreshToken: ${hasRefreshToken}, User: ${hasUser}`
    );
    
    return data;
  } catch (error) {
    recordTest('User Registration with Refresh Token', false, error.message);
    return null;
  }
}

// Test 2: User Login with Refresh Token
async function testUserLogin() {
  try {
    log('Testing user login with refresh token...');
    
    const response = await fetch(`${SERVER_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(TEST_USER)
    });
    
    const data = await response.json();
    
    const hasToken = !!data.token;
    const hasRefreshToken = !!data.refreshToken;
    const hasUser = !!data.user;
    
    recordTest(
      'User Login with Refresh Token',
      hasToken && hasRefreshToken && hasUser,
      `Token: ${hasToken}, RefreshToken: ${hasRefreshToken}, User: ${hasUser}`
    );
    
    return data;
  } catch (error) {
    recordTest('User Login with Refresh Token', false, error.message);
    return null;
  }
}

// Test 3: Admin Login with Refresh Token
async function testAdminLogin() {
  try {
    log('Testing admin login with refresh token...');
    
    const response = await fetch(`${SERVER_URL}/api/auth/admin-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(TEST_ADMIN)
    });
    
    const data = await response.json();
    
    const hasToken = !!data.token;
    const hasRefreshToken = !!data.refreshToken;
    const hasAdmin = !!data.admin;
    
    recordTest(
      'Admin Login with Refresh Token',
      hasToken && hasRefreshToken && hasAdmin,
      `Token: ${hasToken}, RefreshToken: ${hasRefreshToken}, Admin: ${hasAdmin}`
    );
    
    return data;
  } catch (error) {
    recordTest('Admin Login with Refresh Token', false, error.message);
    return null;
  }
}

// Test 4: Token Refresh Endpoint
async function testTokenRefresh(refreshToken) {
  try {
    log('Testing token refresh endpoint...');
    
    const response = await fetch(`${SERVER_URL}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken })
    });
    
    const data = await response.json();
    
    const hasNewToken = !!data.token;
    const hasNewRefreshToken = !!data.refreshToken;
    const isSuccess = data.success;
    
    recordTest(
      'Token Refresh Endpoint',
      isSuccess && hasNewToken && hasNewRefreshToken,
      `Success: ${isSuccess}, NewToken: ${hasNewToken}, NewRefreshToken: ${hasNewRefreshToken}`
    );
    
    return data;
  } catch (error) {
    recordTest('Token Refresh Endpoint', false, error.message);
    return null;
  }
}

// Test 5: WebSocket Authentication with Token
async function testWebSocketAuth(token) {
  return new Promise((resolve) => {
    try {
      log('Testing WebSocket authentication with token...');
      
      const ws = new WebSocket(WS_URL);
      let authenticated = false;
      let gameStateReceived = false;
      
      const timeout = setTimeout(() => {
        if (!authenticated) {
          recordTest('WebSocket Authentication with Token', false, 'Authentication timeout');
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
              'WebSocket Authentication with Token',
              authenticated && gameStateReceived,
              `Authenticated: ${authenticated}, GameState: ${gameStateReceived}`
            );
            
            clearTimeout(timeout);
            ws.close();
            resolve(true);
          } else if (message.type === 'auth_error') {
            clearTimeout(timeout);
            recordTest('WebSocket Authentication with Token', false, message.data.message);
            ws.close();
            resolve(false);
          }
        } catch (error) {
          log(`WebSocket message parsing error: ${error.message}`);
        }
      });
      
      ws.on('error', (error) => {
        clearTimeout(timeout);
        recordTest('WebSocket Authentication with Token', false, error.message);
        resolve(false);
      });
      
    } catch (error) {
      recordTest('WebSocket Authentication with Token', false, error.message);
      resolve(false);
    }
  });
}

// Test 6: WebSocket Token Refresh
async function testWebSocketTokenRefresh(token, refreshToken) {
  return new Promise((resolve) => {
    try {
      log('Testing WebSocket token refresh...');
      
      const ws = new WebSocket(WS_URL);
      let tokenRefreshed = false;
      
      const timeout = setTimeout(() => {
        recordTest('WebSocket Token Refresh', false, 'Token refresh timeout');
        ws.close();
        resolve(false);
      }, 5000);
      
      ws.on('open', () => {
        // First authenticate
        ws.send(JSON.stringify({
          type: 'authenticate',
          data: { token }
        }));
        
        // Then send refresh token request
        setTimeout(() => {
          ws.send(JSON.stringify({
            type: 'token_refresh',
            data: { refreshToken }
          }));
        }, 1000);
      });
      
      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          
          if (message.type === 'authenticated') {
            // Authenticated, wait for token refresh
          } else if (message.type === 'token_refreshed') {
            tokenRefreshed = !!message.data.token && !!message.data.refreshToken;
            
            recordTest(
              'WebSocket Token Refresh',
              tokenRefreshed,
              `TokenRefreshed: ${tokenRefreshed}`
            );
            
            clearTimeout(timeout);
            ws.close();
            resolve(true);
          } else if (message.type === 'token_refresh_error') {
            clearTimeout(timeout);
            recordTest('WebSocket Token Refresh', false, message.data.message);
            ws.close();
            resolve(false);
          }
        } catch (error) {
          log(`WebSocket message parsing error: ${error.message}`);
        }
      });
      
      ws.on('error', (error) => {
        clearTimeout(timeout);
        recordTest('WebSocket Token Refresh', false, error.message);
        resolve(false);
      });
      
    } catch (error) {
      recordTest('WebSocket Token Refresh', false, error.message);
      resolve(false);
    }
  });
}

// Test 7: WebSocket Activity Monitoring
async function testWebSocketActivityMonitoring(token) {
  return new Promise((resolve) => {
    try {
      log('Testing WebSocket activity monitoring...');
      
      const ws = new WebSocket(WS_URL);
      let pongReceived = false;
      
      const timeout = setTimeout(() => {
        recordTest('WebSocket Activity Monitoring', false, 'Activity monitoring timeout');
        ws.close();
        resolve(false);
      }, 5000);
      
      ws.on('open', () => {
        ws.send(JSON.stringify({
          type: 'authenticate',
          data: { token }
        }));
        
        // Send activity ping after authentication
        setTimeout(() => {
          ws.send(JSON.stringify({
            type: 'activity_ping',
            data: {}
          }));
        }, 1000);
      });
      
      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          
          if (message.type === 'authenticated') {
            // Authenticated, wait for pong
          } else if (message.type === 'activity_pong') {
            pongReceived = !!message.data.timestamp;
            
            recordTest(
              'WebSocket Activity Monitoring',
              pongReceived,
              `PongReceived: ${pongReceived}`
            );
            
            clearTimeout(timeout);
            ws.close();
            resolve(true);
          }
        } catch (error) {
          log(`WebSocket message parsing error: ${error.message}`);
        }
      });
      
      ws.on('error', (error) => {
        clearTimeout(timeout);
        recordTest('WebSocket Activity Monitoring', false, error.message);
        resolve(false);
      });
      
    } catch (error) {
      recordTest('WebSocket Activity Monitoring', false, error.message);
      resolve(false);
    }
  });
}

// Test 8: Game State Synchronization
async function testGameStateSynchronization(token) {
  return new Promise((resolve) => {
    try {
      log('Testing game state synchronization...');
      
      const ws = new WebSocket(WS_URL);
      let gameStateValid = false;
      
      const timeout = setTimeout(() => {
        recordTest('Game State Synchronization', false, 'Game state sync timeout');
        ws.close();
        resolve(false);
      }, 5000);
      
      ws.on('open', () => {
        ws.send(JSON.stringify({
          type: 'authenticate',
          data: { token }
        }));
      });
      
      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          
          if (message.type === 'authenticated') {
            const gameState = message.data.gameState;
            
            gameStateValid = !!gameState && 
                             typeof gameState.gameId === 'string' &&
                             typeof gameState.phase === 'string' &&
                             typeof gameState.userBalance === 'number' &&
                             Array.isArray(gameState.andarCards) &&
                             Array.isArray(gameState.baharCards);
            
            recordTest(
              'Game State Synchronization',
              gameStateValid,
              `GameStateValid: ${gameStateValid}, Phase: ${gameState?.phase}, Balance: ${gameState?.userBalance}`
            );
            
            clearTimeout(timeout);
            ws.close();
            resolve(true);
          }
        } catch (error) {
          log(`WebSocket message parsing error: ${error.message}`);
        }
      });
      
      ws.on('error', (error) => {
        clearTimeout(timeout);
        recordTest('Game State Synchronization', false, error.message);
        resolve(false);
      });
      
    } catch (error) {
      recordTest('Game State Synchronization', false, error.message);
      resolve(false);
    }
  });
}

// Main test execution
async function runAllTests() {
  log('Starting Complete Authentication and WebSocket Fix Validation');
  log('='.repeat(60));
  
  // Test authentication endpoints
  const registrationResult = await testUserRegistration();
  await sleep(500);
  
  const loginResult = await testUserLogin();
  await sleep(500);
  
  const adminLoginResult = await testAdminLogin();
  await sleep(500);
  
  // Test token refresh
  let refreshToken = null;
  if (loginResult && loginResult.refreshToken) {
    refreshToken = loginResult.refreshToken;
    const refreshResult = await testTokenRefresh(refreshToken);
    await sleep(500);
  }
  
  // Test WebSocket functionality
  if (loginResult && loginResult.token) {
    await testWebSocketAuth(loginResult.token);
    await sleep(500);
    
    if (refreshToken) {
      await testWebSocketTokenRefresh(loginResult.token, refreshToken);
      await sleep(500);
    }
    
    await testWebSocketActivityMonitoring(loginResult.token);
    await sleep(500);
    
    await testGameStateSynchronization(loginResult.token);
    await sleep(500);
  }
  
  // Print results
  log('='.repeat(60));
  log('TEST RESULTS SUMMARY', 'info');
  log(`Total Tests: ${testResults.passed + testResults.failed}`);
  log(`Passed: ${testResults.passed}`, 'pass');
  log(`Failed: ${testResults.failed}`, 'fail');
  log(`Success Rate: ${((testResults.passed / (testResults.passed + testResults.failed)) * 100).toFixed(2)}%`);
  
  log('\nDETAILED RESULTS:');
  testResults.details.forEach(test => {
    const status = test.passed ? 'PASS' : 'FAIL';
    log(`${status}: ${test.name} - ${test.details}`, test.passed ? 'pass' : 'fail');
  });
  
  log('\nAuthentication and WebSocket Fix Validation Complete!');
  
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
  runAllTests();
}

module.exports = {
  runAllTests,
  testUserRegistration,
  testUserLogin,
  testAdminLogin,
  testTokenRefresh,
  testWebSocketAuth,
  testWebSocketTokenRefresh,
  testWebSocketActivityMonitoring,
  testGameStateSynchronization
};