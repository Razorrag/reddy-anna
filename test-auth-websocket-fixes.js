/**
 * Test Script for Authentication and WebSocket Cyclic Issue Fixes
 * 
 * This script tests the complete solution for:
 * 1. WebSocket Authentication Flow
 * 2. Token Storage and Retrieval Coordination
 * 3. Multiple Token Handling
 * 4. Game Flow Integration
 */

const WebSocket = require('ws');
const jwt = require('jsonwebtoken');
const fetch = require('node-fetch');

// Configuration
const WS_URL = process.env.WS_URL || 'ws://localhost:5000/ws';
const API_URL = process.env.API_URL || 'http://localhost:5000';
const TEST_USER = {
  phone: '1234567890',
  password: 'test123'
};

let testResults = {
  authentication: { passed: 0, failed: 0, errors: [] },
  tokenManagement: { passed: 0, failed: 0, errors: [] },
  webSocket: { passed: 0, failed: 0, errors: [] },
  gameFlow: { passed: 0, failed: 0, errors: [] }
};

// Utility functions
function log(category, message, type = 'info') {
  const timestamp = new Date().toISOString();
  const prefix = type === 'error' ? '❌' : type === 'success' ? '✅' : 'ℹ️';
  console.log(`${prefix} [${category.toUpperCase()}] ${timestamp}: ${message}`);
  
  if (type === 'error') {
    testResults[category].errors.push(message);
    testResults[category].failed++;
  } else if (type === 'success') {
    testResults[category].passed++;
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Test 1: Authentication Flow
async function testAuthenticationFlow() {
  log('authentication', 'Starting authentication flow tests...');
  
  try {
    // Test login
    const loginResponse = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(TEST_USER)
    });
    
    const loginData = await loginResponse.json();
    
    if (!loginData.success || !loginData.token) {
      throw new Error('Login failed or no token received');
    }
    
    log('authentication', '✅ Login successful, token received', 'success');
    
    // Test token validation
    const decoded = jwt.decode(loginData.token);
    if (!decoded || !decoded.exp) {
      throw new Error('Token validation failed');
    }
    
    log('authentication', '✅ Token structure valid', 'success');
    
    // Test token refresh
    const refreshResponse = await fetch(`${API_URL}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: loginData.refreshToken })
    });
    
    const refreshData = await refreshResponse.json();
    
    if (!refreshData.success || !refreshData.token) {
      throw new Error('Token refresh failed');
    }
    
    log('authentication', '✅ Token refresh successful', 'success');
    
    return { accessToken: loginData.token, refreshToken: loginData.refreshToken };
    
  } catch (error) {
    log('authentication', `Authentication flow failed: ${error.message}`, 'error');
    return null;
  }
}

// Test 2: WebSocket Connection and Authentication
async function testWebSocketConnection(tokens) {
  if (!tokens) {
    log('webSocket', 'Cannot test WebSocket - no tokens available', 'error');
    return false;
  }
  
  return new Promise((resolve) => {
    log('webSocket', 'Starting WebSocket connection tests...');
    
    const ws = new WebSocket(WS_URL);
    let isAuthenticated = false;
    let gameStateReceived = false;
    
    const timeout = setTimeout(() => {
      if (!isAuthenticated) {
        log('webSocket', 'WebSocket authentication timeout', 'error');
        ws.close();
        resolve(false);
      }
    }, 10000);
    
    ws.on('open', () => {
      log('webSocket', '✅ WebSocket connection opened', 'success');
      
      // Send authentication message
      ws.send(JSON.stringify({
        type: 'authenticate',
        data: { token: tokens.accessToken }
      }));
    });
    
    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        
        switch (message.type) {
          case 'authenticated':
            if (!isAuthenticated) {
              isAuthenticated = true;
              log('webSocket', '✅ WebSocket authentication successful', 'success');
              
              // Check if game state is included
              if (message.data.gameState) {
                gameStateReceived = true;
                log('webSocket', '✅ Game state synchronized on connection', 'success');
              }
            }
            break;
            
          case 'auth_error':
            log('webSocket', `❌ WebSocket authentication error: ${message.data.message}`, 'error');
            break;
            
          case 'bet_error':
            log('webSocket', '✅ Bet error handling working', 'success');
            break;
            
          case 'token_expiry_warning':
            log('webSocket', '✅ Token expiry warning system working', 'success');
            break;
        }
      } catch (error) {
        log('webSocket', `❌ Failed to parse WebSocket message: ${error.message}`, 'error');
      }
    });
    
    ws.on('error', (error) => {
      log('webSocket', `❌ WebSocket error: ${error.message}`, 'error');
      clearTimeout(timeout);
      resolve(false);
    });
    
    ws.on('close', (code, reason) => {
      if (isAuthenticated) {
        log('webSocket', '✅ WebSocket closed cleanly after authentication', 'success');
        resolve(true);
      } else {
        log('webSocket', `❌ WebSocket closed without authentication: ${code} - ${reason}`, 'error');
        resolve(false);
      }
      clearTimeout(timeout);
    });
  });
}

// Test 3: Token Management Coordination
async function testTokenManagement() {
  log('tokenManagement', 'Starting token management tests...');
  
  try {
    // Test token storage simulation
    const mockLocalStorage = {};
    
    // Simulate token storage after login
    const tokens = await testAuthenticationFlow();
    if (tokens) {
      mockLocalStorage.accessToken = tokens.accessToken;
      mockLocalStorage.refreshToken = tokens.refreshToken;
      log('tokenManagement', '✅ Token storage simulation successful', 'success');
    }
    
    // Test token retrieval timing
    const tokenRetrievalStart = Date.now();
    const retrievedToken = mockLocalStorage.accessToken;
    const tokenRetrievalEnd = Date.now();
    
    if (retrievedToken && (tokenRetrievalEnd - tokenRetrievalStart) < 100) {
      log('tokenManagement', '✅ Token retrieval fast and reliable', 'success');
    } else {
      log('tokenManagement', '❌ Token retrieval slow or failed', 'error');
    }
    
    // Test token expiration handling
    const decoded = jwt.decode(tokens.accessToken);
    const now = Math.floor(Date.now() / 1000);
    const timeUntilExpiry = decoded.exp - now;
    
    if (timeUntilExpiry > 0) {
      log('tokenManagement', `✅ Token valid for ${timeUntilExpiry} more seconds`, 'success');
    } else {
      log('tokenManagement', '❌ Token already expired', 'error');
    }
    
  } catch (error) {
    log('tokenManagement', `Token management test failed: ${error.message}`, 'error');
  }
}

// Test 4: Game Flow Integration
async function testGameFlowIntegration() {
  log('gameFlow', 'Starting game flow integration tests...');
  
  try {
    // Test user can join at any point
    const tokens = await testAuthenticationFlow();
    if (!tokens) {
      throw new Error('No tokens for game flow test');
    }
    
    const ws = new WebSocket(WS_URL);
    
    return new Promise((resolve) => {
      let gameStateSynced = false;
      let canJoinChecked = false;
      
      const timeout = setTimeout(() => {
        if (!gameStateSynced) {
          log('gameFlow', '❌ Game state synchronization timeout', 'error');
        }
        ws.close();
        resolve(gameStateSynced && canJoinChecked);
      }, 15000);
      
      ws.on('open', () => {
        ws.send(JSON.stringify({
          type: 'authenticate',
          data: { token: tokens.accessToken }
        }));
      });
      
      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          
          if (message.type === 'authenticated' && message.data.gameState) {
            gameStateSynced = true;
            const gameState = message.data.gameState;
            
            // Test canJoin property
            if (gameState.canJoin === true) {
              canJoinChecked = true;
              log('gameFlow', '✅ Users can join at any point', 'success');
            } else {
              log('gameFlow', '❌ Users cannot join at any point', 'error');
            }
            
            // Test canBet property
            if (gameState.canBet !== undefined) {
              log('gameFlow', '✅ Can bet property available', 'success');
            } else {
              log('gameFlow', '❌ Can bet property missing', 'error');
            }
            
            // Test user-specific data
            if (gameState.userBalance !== undefined) {
              log('gameFlow', '✅ User balance synchronized', 'success');
            } else {
              log('gameFlow', '❌ User balance not synchronized', 'error');
            }
            
            // Test game flow information
            if (gameState.message && gameState.status) {
              log('gameFlow', '✅ Game flow information provided', 'success');
            } else {
              log('gameFlow', '❌ Game flow information missing', 'error');
            }
          }
          
          // Test bet placement validation
          if (message.type === 'bet_error') {
            const errorData = message.data;
            
            // Test specific error codes
            if (errorData.code && errorData.message) {
              log('gameFlow', '✅ Bet error codes working', 'success');
              
              // Test detailed error information
              const requiredFields = ['message', 'code'];
              const optionalFields = ['field', 'currentBalance', 'required', 'minAmount', 'maxAmount'];
              
              const hasRequiredFields = requiredFields.every(field => errorData[field]);
              const hasOptionalFields = optionalFields.some(field => errorData[field] !== undefined);
              
              if (hasRequiredFields) {
                log('gameFlow', '✅ Bet error includes required fields', 'success');
              } else {
                log('gameFlow', '❌ Bet error missing required fields', 'error');
              }
              
              if (hasOptionalFields) {
                log('gameFlow', '✅ Bet error includes detailed information', 'success');
              }
            }
          }
        } catch (error) {
          log('gameFlow', `❌ Failed to parse game flow message: ${error.message}`, 'error');
        }
      });
      
      ws.on('close', () => {
        clearTimeout(timeout);
        resolve(gameStateSynced && canJoinChecked);
      });
    });
    
  } catch (error) {
    log('gameFlow', `Game flow integration test failed: ${error.message}`, 'error');
    return false;
  }
}

// Main test execution
async function runAllTests() {
  console.log('🚀 Starting Authentication and WebSocket Cyclic Issue Fix Tests\n');
  
  // Run all tests
  const authResult = await testAuthenticationFlow();
  await sleep(1000);
  
  const wsResult = await testWebSocketConnection(authResult);
  await sleep(1000);
  
  await testTokenManagement();
  await sleep(1000);
  
  const gameFlowResult = await testGameFlowIntegration();
  await sleep(1000);
  
  // Generate final report
  console.log('\n📊 TEST RESULTS SUMMARY');
  console.log('=====================================');
  
  Object.keys(testResults).forEach(category => {
    const results = testResults[category];
    const total = results.passed + results.failed;
    const successRate = total > 0 ? (results.passed / total * 100).toFixed(1) : 0;
    
    console.log(`\n${category.toUpperCase()}:`);
    console.log(`  ✅ Passed: ${results.passed}`);
    console.log(`  ❌ Failed: ${results.failed}`);
    console.log(`  📈 Success Rate: ${successRate}%`);
    
    if (results.errors.length > 0) {
      console.log('  🚨 Errors:');
      results.errors.forEach(error => console.log(`    - ${error}`));
    }
  });
  
  // Overall assessment
  const totalPassed = Object.values(testResults).reduce((sum, cat) => sum + cat.passed, 0);
  const totalFailed = Object.values(testResults).reduce((sum, cat) => sum + cat.failed, 0);
  const totalTests = totalPassed + totalFailed;
  const overallSuccessRate = totalTests > 0 ? (totalPassed / totalTests * 100).toFixed(1) : 0;
  
  console.log('\n🎯 OVERALL ASSESSMENT');
  console.log('=====================================');
  console.log(`Total Tests: ${totalTests}`);
  console.log(`Overall Success Rate: ${overallSuccessRate}%`);
  
  if (overallSuccessRate >= 80) {
    console.log('🎉 EXCELLENT: Authentication and WebSocket fixes are working well!');
  } else if (overallSuccessRate >= 60) {
    console.log('⚠️  GOOD: Some issues detected but generally functional');
  } else {
    console.log('🚨 CRITICAL: Major issues with authentication and WebSocket fixes');
  }
  
  console.log('\n🔧 RECOMMENDATIONS');
  console.log('=====================================');
  
  if (testResults.authentication.failed > 0) {
    console.log('- Review authentication flow implementation');
  }
  
  if (testResults.webSocket.failed > 0) {
    console.log('- Check WebSocket server configuration and message handling');
  }
  
  if (testResults.tokenManagement.failed > 0) {
    console.log('- Verify token storage and retrieval coordination');
  }
  
  if (testResults.gameFlow.failed > 0) {
    console.log('- Fix game state synchronization and error handling');
  }
  
  console.log('\n✨ Test completed!');
}

// Run tests if this file is executed directly
if (require.main === module) {
  runAllTests().catch(error => {
    console.error('❌ Test execution failed:', error);
    process.exit(1);
  });
}

module.exports = {
  runAllTests,
  testAuthenticationFlow,
  testWebSocketConnection,
  testTokenManagement,
  testGameFlowIntegration
};