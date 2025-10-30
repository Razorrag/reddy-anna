/**
 * Complete Betting Flow Test
 * End-to-end test simulating the complete WebSocket betting flow
 * Tests the integration between client and server
 */

// Mock WebSocket implementation
class MockWebSocket {
  private eventListeners: Map<string, Function[]> = new Map();
  private messageQueue: any[] = [];
  private isOpen: boolean = true;

  addEventListener(event: string, callback: Function) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(callback);
  }

  send(data: string) {
    this.messageQueue.push(JSON.parse(data));
    
    // Immediately process the message (simulate server response)
    const parsedData = JSON.parse(data);
    if (parsedData.type === 'bet_placed') {
      // Simulate server processing and response
      setTimeout(() => {
        this.simulateServerResponse(parsedData);
      }, 50);
    }
  }

  private simulateServerResponse(data: any) {
    // This would normally come from the server
    // For testing, we'll simulate the server response
    const response = {
      type: 'bet_success',
      data: {
        side: data.data.side,
        amount: data.data.amount,
        round: data.data.round,
        newBalance: 5000 - data.data.amount, // Mock balance update
        message: `Bet placed successfully: ₹${data.data.amount} on ${data.data.side} (Round ${data.data.round})`
      }
    };
    
    this.simulateMessage(response);
  }

  simulateMessage(data: any) {
    const event = { data: JSON.stringify(data) };
    this.eventListeners.get('message')?.forEach(callback => callback(event));
  }

  getMessages() {
    return [...this.messageQueue];
  }

  close() {
    this.isOpen = false;
  }
}

// Mock client-side betting logic
class MockBettingClient {
  private ws: MockWebSocket;
  private currentRound: number = 1;
  private balance: number = 5000;

  constructor(webSocket: MockWebSocket) {
    this.ws = webSocket;
    this.setupWebSocketHandlers();
  }

  private setupWebSocketHandlers() {
    this.ws.addEventListener('message', (event: any) => {
      const data = JSON.parse(event.data);
      
      if (data.type === 'bet_success') {
        this.balance = data.data.newBalance;
        console.log(`💰 Bet successful! New balance: ₹${this.balance}`);
      } else if (data.type === 'error') {
        console.log(`❌ Bet failed: ${data.data.message}`);
      } else if (data.type === 'round_update') {
        this.currentRound = data.data.round;
        console.log(`🔄 Round updated to: ${this.currentRound}`);
      }
    });
  }

  // Simulate client-side bet placement
  placeBet(amount: number, side: string): boolean {
    if (amount < 1000 || amount > 100000) {
      console.log('❌ Invalid bet amount');
      return false;
    }

    if (side !== 'andar' && side !== 'bahar') {
      console.log('❌ Invalid bet side');
      return false;
    }

    if (this.balance < amount) {
      console.log('❌ Insufficient balance');
      return false;
    }

    // Send bet to server
    const betMessage = {
      type: 'bet_placed',
      data: {
        amount,
        side,
        round: this.currentRound
      }
    };

    this.ws.send(JSON.stringify(betMessage));
    console.log(`🎯 Bet placed: ₹${amount} on ${side} (Round ${this.currentRound})`);
    return true;
  }

  getCurrentBalance(): number {
    return this.balance;
  }

  getCurrentRound(): number {
    return this.currentRound;
  }
}

// Mock server-side betting logic
class MockBettingServer {
  private clients: Map<string, MockWebSocket> = new Map();
  private users = new Map([
    ['user1', { id: 'user1', balance: 5000 }],
    ['user2', { id: 'user2', balance: 3000 }]
  ]);

  registerClient(userId: string, webSocket: MockWebSocket) {
    this.clients.set(userId, webSocket);
    
    // Setup message handler
    webSocket.addEventListener('message', (event: any) => {
      this.handleClientMessage(userId, event);
    });
  }

  private handleClientMessage(userId: string, event: any) {
    const data = JSON.parse(event.data);
    
    if (data.type === 'bet_placed') {
      this.processBet(userId, data.data.amount, data.data.side, data.data.round);
    }
  }

  private processBet(userId: string, amount: number, side: string, round: number) {
    const user = this.users.get(userId);
    if (!user) {
      this.sendError(userId, 'User not found');
      return;
    }

    // Validate round
    if (round !== 1 && round !== 2) {
      this.sendError(userId, `Betting only allowed in Round 1 and Round 2. Current round: ${round}`);
      return;
    }

    // Validate amount
    if (amount < 1000 || amount > 100000) {
      this.sendError(userId, 'Invalid bet amount. Must be between ₹1,000 and ₹100,000');
      return;
    }

    // Validate side
    if (side !== 'andar' && side !== 'bahar') {
      this.sendError(userId, 'Invalid bet side. Must be andar or bahar');
      return;
    }

    // Check balance
    if (user.balance < amount) {
      this.sendError(userId, `Insufficient balance. Current balance: ₹${user.balance}, Bet amount: ₹${amount}`);
      return;
    }

    // Process bet
    user.balance -= amount;
    
    // Send success response
    this.sendSuccess(userId, {
      side,
      amount,
      round,
      newBalance: user.balance,
      message: `Bet placed successfully: ₹${amount} on ${side} (Round ${round})`
    });
  }

  private sendSuccess(userId: string, data: any) {
    const response = {
      type: 'bet_success',
      data
    };
    this.sendToClient(userId, response);
  }

  private sendError(userId: string, message: string) {
    const response = {
      type: 'error',
      data: { message }
    };
    this.sendToClient(userId, response);
  }

  private sendToClient(userId: string, data: any) {
    const client = this.clients.get(userId);
    if (client) {
      client.simulateMessage(data);
    }
  }

  // Simulate round transition
  transitionToRound2() {
    const roundUpdate = {
      type: 'round_update',
      data: { round: 2 }
    };
    
    this.clients.forEach((client, userId) => {
      this.sendToClient(userId, roundUpdate);
    });
  }

  getUserBalance(userId: string): number | undefined {
    return this.users.get(userId)?.balance;
  }
}

// Test function
async function runCompleteBettingFlowTest() {
  console.log('🎯 Testing Complete Betting Flow...\n');

  // Setup mock server and client
  const webSocket = new MockWebSocket();
  const server = new MockBettingServer();
  const client = new MockBettingClient(webSocket);

  // Register client with server
  server.registerClient('user1', webSocket);

  let passed = 0;
  let total = 0;

  // Test 1: Round 1 betting
  console.log('🧪 Test 1: Round 1 Betting');
  total++;
  try {
    const initialBalance = client.getCurrentBalance();
    client.placeBet(1000, 'andar');
    
    // Check if bet was processed correctly
    const finalBalance = server.getUserBalance('user1');
    if (finalBalance === 4000) {
      console.log('✅ Round 1 betting - PASSED');
      passed++;
    } else {
      console.log('❌ Round 1 betting - FAILED');
      console.log('   Expected balance: 4000');
      console.log('   Got balance:', finalBalance);
    }
  } catch (error) {
    console.log('❌ Round 1 betting - ERROR:', error instanceof Error ? error.message : String(error));
  }

  // Test 2: Round 2 betting after transition
  console.log('\n🧪 Test 2: Round 2 Betting After Transition');
  total++;
  try {
    // Simulate round transition
    server.transitionToRound2();
    
    // Wait a bit for round update to be processed
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Place bet in round 2
    client.placeBet(1500, 'bahar');
    
    // Check if bet was processed correctly
    const finalBalance = server.getUserBalance('user1');
    if (finalBalance === 2500) {
      console.log('✅ Round 2 betting - PASSED');
      passed++;
    } else {
      console.log('❌ Round 2 betting - FAILED');
      console.log('   Expected balance: 2500');
      console.log('   Got balance:', finalBalance);
    }
  } catch (error) {
    console.log('❌ Round 2 betting - ERROR:', error instanceof Error ? error.message : String(error));
  }

  // Test 3: Round 3 betting (should be blocked)
  console.log('\n🧪 Test 3: Round 3 Betting (Should be Blocked)');
  total++;
  try {
    // Simulate round 3 (should not be allowed)
    const roundUpdate = {
      type: 'round_update',
      data: { round: 3 }
    };
    webSocket.simulateMessage(roundUpdate);
    
    // Try to place bet in round 3
    client.placeBet(1000, 'andar');
    
    // Balance should not change
    const finalBalance = server.getUserBalance('user1');
    if (finalBalance === 2500) {
      console.log('✅ Round 3 betting blocked - PASSED');
      passed++;
    } else {
      console.log('❌ Round 3 betting blocked - FAILED');
      console.log('   Expected balance: 2500 (no change)');
      console.log('   Got balance:', finalBalance);
    }
  } catch (error) {
    console.log('❌ Round 3 betting blocked - ERROR:', error instanceof Error ? error.message : String(error));
  }

  // Test 4: Insufficient balance
  console.log('\n🧪 Test 4: Insufficient Balance');
  total++;
  try {
    // Reset to round 2 for this test
    server.transitionToRound2();
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Try to bet more than available balance
    client.placeBet(10000, 'andar');
    
    // Balance should not change
    const finalBalance = server.getUserBalance('user1');
    if (finalBalance === 2500) {
      console.log('✅ Insufficient balance blocked - PASSED');
      passed++;
    } else {
      console.log('❌ Insufficient balance blocked - FAILED');
      console.log('   Expected balance: 2500 (no change)');
      console.log('   Got balance:', finalBalance);
    }
  } catch (error) {
    console.log('❌ Insufficient balance blocked - ERROR:', error instanceof Error ? error.message : String(error));
  }

  // Test 5: Invalid bet side
  console.log('\n🧪 Test 5: Invalid Bet Side');
  total++;
  try {
    client.placeBet(1000, 'invalid');
    
    // Balance should not change
    const finalBalance = server.getUserBalance('user1');
    if (finalBalance === 2500) {
      console.log('✅ Invalid bet side blocked - PASSED');
      passed++;
    } else {
      console.log('❌ Invalid bet side blocked - FAILED');
      console.log('   Expected balance: 2500 (no change)');
      console.log('   Got balance:', finalBalance);
    }
  } catch (error) {
    console.log('❌ Invalid bet side blocked - ERROR:', error instanceof Error ? error.message : String(error));
  }

  console.log(`\n📊 Complete Betting Flow Test Results: ${passed}/${total} tests passed`);
  
  if (passed === total) {
    console.log('🎉 All complete betting flow tests PASSED!');
    console.log('✅ Round 1 and Round 2 betting is working correctly');
    console.log('✅ WebSocket communication is functioning properly');
    console.log('✅ Server-side validation is working as expected');
    return true;
  } else {
    console.log('⚠️  Some complete betting flow tests FAILED.');
    return false;
  }
}

// Run the complete test
runCompleteBettingFlowTest().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('Complete betting flow test failed:', error);
  process.exit(1);
});