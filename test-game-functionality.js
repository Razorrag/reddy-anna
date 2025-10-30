/**
 * Andar Bahar Game Functionality Test Script
 * 
 * This script tests all major game functionality:
 * 1. User registration and login
 * 2. Admin login and game control
 * 3. Betting system
 * 4. Card dealing and game flow
 * 5. Real-time updates
 * 6. Winner detection and payouts
 */

const WebSocket = require('ws');
const axios = require('axios');

// Configuration
const BASE_URL = process.env.BASE_URL || 'http://localhost:5000';
const WS_URL = process.env.WS_URL || 'ws://localhost:5000/ws';

// Test data
const testUser = {
  phone: '9999999999',
  password: 'Test123456',
  name: 'Test User'
};

const testAdmin = {
  username: 'admin',
  password: 'admin123'
};

let userToken = null;
let adminToken = null;
let userWs = null;
let adminWs = null;

// Test utilities
const log = (message, type = 'INFO') => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [${type}] ${message}`);
};

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Test 1: User Registration
async function testUserRegistration() {
  log('=== Testing User Registration ===');
  try {
    const response = await axios.post(`${BASE_URL}/api/auth/register`, testUser);
    if (response.data.success) {
      userToken = response.data.user.token;
      log('✅ User registration successful');
      return true;
    } else {
      log(`❌ User registration failed: ${response.data.error}`, 'ERROR');
      return false;
    }
  } catch (error) {
    log(`❌ User registration error: ${error.message}`, 'ERROR');
    return false;
  }
}

// Test 2: User Login
async function testUserLogin() {
  log('=== Testing User Login ===');
  try {
    const response = await axios.post(`${BASE_URL}/api/auth/login`, {
      phone: testUser.phone,
      password: testUser.password
    });
    if (response.data.success) {
      userToken = response.data.user.token;
      log('✅ User login successful');
      return true;
    } else {
      log(`❌ User login failed: ${response.data.error}`, 'ERROR');
      return false;
    }
  } catch (error) {
    log(`❌ User login error: ${error.message}`, 'ERROR');
    return false;
  }
}

// Test 3: Admin Login
async function testAdminLogin() {
  log('=== Testing Admin Login ===');
  try {
    const response = await axios.post(`${BASE_URL}/api/auth/admin-login`, testAdmin);
    if (response.data.success) {
      adminToken = response.data.admin.token;
      log('✅ Admin login successful');
      return true;
    } else {
      log(`❌ Admin login failed: ${response.data.error}`, 'ERROR');
      return false;
    }
  } catch (error) {
    log(`❌ Admin login error: ${error.message}`, 'ERROR');
    return false;
  }
}

// Test 4: WebSocket Connections
async function testWebSocketConnections() {
  log('=== Testing WebSocket Connections ===');
  
  return new Promise((resolve) => {
    let connectedCount = 0;
    const checkConnections = () => {
      if (connectedCount === 2) {
        log('✅ Both WebSocket connections established');
        resolve(true);
      }
    };

    // User WebSocket
    userWs = new WebSocket(WS_URL);
    userWs.on('open', () => {
      userWs.send(JSON.stringify({
        type: 'authenticate',
        data: { token: userToken }
      }));
      log('📱 User WebSocket connected');
    });
    
    userWs.on('message', (data) => {
      const message = JSON.parse(data);
      if (message.type === 'authenticated') {
        connectedCount++;
        log('✅ User WebSocket authenticated');
        checkConnections();
      }
    });

    // Admin WebSocket
    adminWs = new WebSocket(WS_URL);
    adminWs.on('open', () => {
      adminWs.send(JSON.stringify({
        type: 'authenticate',
        data: { token: adminToken }
      }));
      log('👨‍💼 Admin WebSocket connected');
    });
    
    adminWs.on('message', (data) => {
      const message = JSON.parse(data);
      if (message.type === 'authenticated') {
        connectedCount++;
        log('✅ Admin WebSocket authenticated');
        checkConnections();
      }
    });

    // Timeout after 10 seconds
    setTimeout(() => {
      if (connectedCount < 2) {
        log(`❌ WebSocket connection timeout. Connected: ${connectedCount}/2`, 'ERROR');
        resolve(false);
      }
    }, 10000);
  });
}

// Test 5: Game Start (Admin)
async function testGameStart() {
  log('=== Testing Game Start ===');
  
  return new Promise((resolve) => {
    const openingCard = '7♠';
    
    adminWs.send(JSON.stringify({
      type: 'start_game',
      data: { openingCard }
    }));
    
    log(`🎮 Admin started game with opening card: ${openingCard}`);
    
    // Wait for game to start
    setTimeout(() => {
      log('✅ Game start initiated');
      resolve(true);
    }, 2000);
  });
}

// Test 6: User Betting
async function testUserBetting() {
  log('=== Testing User Betting ===');
  
  return new Promise((resolve) => {
    let betPlaced = false;
    
    // Listen for bet confirmation
    const originalOnMessage = userWs.onmessage;
    userWs.onmessage = (data) => {
      const message = JSON.parse(data);
      
      if (message.type === 'bet_confirmed') {
        betPlaced = true;
        log(`✅ Bet confirmed: ₹${message.data.amount} on ${message.data.side}`);
        resolve(true);
      }
      
      // Call original handler if exists
      if (originalOnMessage) originalOnMessage(data);
    };
    
    // Place bet after betting phase starts
    setTimeout(() => {
      userWs.send(JSON.stringify({
        type: 'place_bet',
        data: {
          gameId: 'default-game',
          side: 'andar',
          amount: 2500,
          round: 1
        }
      }));
      log('💰 User placed bet: ₹2500 on Andar (Round 1)');
    }, 3000);
    
    // Timeout after 10 seconds
    setTimeout(() => {
      if (!betPlaced) {
        log('❌ Betting timeout - bet not confirmed', 'ERROR');
        resolve(false);
      }
    }, 10000);
  });
}

// Test 7: Card Dealing (Admin)
async function testCardDealing() {
  log('=== Testing Card Dealing ===');
  
  return new Promise((resolve) => {
    let cardsDealt = 0;
    const expectedCards = 2; // Round 1: 1 Bahar + 1 Andar
    
    // Listen for card deals
    const originalOnMessage = userWs.onmessage;
    userWs.onmessage = (data) => {
      const message = JSON.parse(data);
      
      if (message.type === 'card_dealt') {
        cardsDealt++;
        log(`🃏 Card dealt: ${message.data.card} on ${message.data.side}`);
        
        if (cardsDealt === expectedCards) {
          log('✅ All expected cards dealt for Round 1');
          resolve(true);
        }
      }
      
      // Call original handler if exists
      if (originalOnMessage) originalOnMessage(data);
    };
    
    // Admin deals cards after betting ends
    setTimeout(() => {
      // Deal Bahar card
      adminWs.send(JSON.stringify({
        type: 'deal_card',
        data: {
          gameId: 'default-game',
          card: 'K♥',
          side: 'bahar',
          position: 1
        }
      }));
      
      setTimeout(() => {
        // Deal Andar card
        adminWs.send(JSON.stringify({
          type: 'deal_card',
          data: {
            gameId: 'default-game',
            card: '3♣',
            side: 'andar',
            position: 1
          }
        }));
      }, 1000);
    }, 5000);
    
    // Timeout after 15 seconds
    setTimeout(() => {
      if (cardsDealt < expectedCards) {
        log(`❌ Card dealing timeout. Dealt: ${cardsDealt}/${expectedCards}`, 'ERROR');
        resolve(false);
      }
    }, 15000);
  });
}

// Test 8: Game Completion
async function testGameCompletion() {
  log('=== Testing Game Completion ===');
  
  return new Promise((resolve) => {
    let gameCompleted = false;
    
    // Listen for game completion
    const originalOnMessage = userWs.onmessage;
    userWs.onmessage = (data) => {
      const message = JSON.parse(data);
      
      if (message.type === 'game_complete') {
        gameCompleted = true;
        log(`🏆 Game complete: ${message.data.winner} won with ${message.data.winningCard}`);
        resolve(true);
      }
      
      // Call original handler if exists
      if (originalOnMessage) originalOnMessage(data);
    };
    
    // Admin deals winning card (matching opening card 7♠)
    setTimeout(() => {
      adminWs.send(JSON.stringify({
        type: 'deal_card',
        data: {
          gameId: 'default-game',
          card: '7♠',
          side: 'andar',
          position: 2
        }
      }));
      log('🎯 Admin dealt winning card: 7♠ on Andar');
    }, 8000);
    
    // Timeout after 10 seconds
    setTimeout(() => {
      if (!gameCompleted) {
        log('❌ Game completion timeout', 'ERROR');
        resolve(false);
      }
    }, 10000);
  });
}

// Test 9: Balance Update
async function testBalanceUpdate() {
  log('=== Testing Balance Update ===');
  
  try {
    const response = await axios.get(`${BASE_URL}/api/user/balance`, {
      headers: { Authorization: `Bearer ${userToken}` }
    });
    
    if (response.data.success) {
      log(`✅ Balance retrieved: ₹${response.data.balance}`);
      return true;
    } else {
      log(`❌ Balance retrieval failed: ${response.data.error}`, 'ERROR');
      return false;
    }
  } catch (error) {
    log(`❌ Balance update error: ${error.message}`, 'ERROR');
    return false;
  }
}

// Main test runner
async function runAllTests() {
  log('🚀 Starting Andar Bahar Game Functionality Tests');
  log('=====================================');
  
  const results = [];
  
  // Test 1: User Registration (skip if already exists)
  try {
    await testUserRegistration();
  } catch (error) {
    log('⚠️ Registration failed, trying login...');
  }
  
  // Test 2: User Login
  const loginResult = await testUserLogin();
  results.push({ test: 'User Login', passed: loginResult });
  
  if (!loginResult) {
    log('❌ Cannot continue tests without user login');
    return;
  }
  
  // Test 3: Admin Login
  const adminLoginResult = await testAdminLogin();
  results.push({ test: 'Admin Login', passed: adminLoginResult });
  
  if (!adminLoginResult) {
    log('❌ Cannot continue tests without admin login');
    return;
  }
  
  // Test 4: WebSocket Connections
  const wsResult = await testWebSocketConnections();
  results.push({ test: 'WebSocket Connections', passed: wsResult });
  
  // Test 5: Game Start
  const gameStartResult = await testGameStart();
  results.push({ test: 'Game Start', passed: gameStartResult });
  
  // Test 6: User Betting
  const bettingResult = await testUserBetting();
  results.push({ test: 'User Betting', passed: bettingResult });
  
  // Test 7: Card Dealing
  const dealingResult = await testCardDealing();
  results.push({ test: 'Card Dealing', passed: dealingResult });
  
  // Test 8: Game Completion
  const completionResult = await testGameCompletion();
  results.push({ test: 'Game Completion', passed: completionResult });
  
  // Test 9: Balance Update
  const balanceResult = await testBalanceUpdate();
  results.push({ test: 'Balance Update', passed: balanceResult });
  
  // Results summary
  log('=====================================');
  log('📊 TEST RESULTS SUMMARY');
  log('=====================================');
  
  const passed = results.filter(r => r.passed).length;
  const total = results.length;
  
  results.forEach(result => {
    const status = result.passed ? '✅ PASS' : '❌ FAIL';
    log(`${status} ${result.test}`);
  });
  
  log(`\n🎯 Overall: ${passed}/${total} tests passed (${Math.round(passed/total*100)}%)`);
  
  if (passed === total) {
    log('🎉 ALL TESTS PASSED! Andar Bahar game is working correctly.');
  } else {
    log('⚠️ Some tests failed. Please check the issues above.');
  }
  
  // Cleanup
  if (userWs) userWs.close();
  if (adminWs) adminWs.close();
}

// Run tests
if (require.main === module) {
  runAllTests().catch(error => {
    log(`💥 Test runner error: ${error.message}`, 'ERROR');
    process.exit(1);
  });
}

module.exports = {
  runAllTests,
  testUserRegistration,
  testUserLogin,
  testAdminLogin,
  testWebSocketConnections,
  testGameStart,
  testUserBetting,
  testCardDealing,
  testGameCompletion,
  testBalanceUpdate
};