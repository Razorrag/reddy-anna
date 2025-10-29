// Test WebSocket connection to the Andar Bahar game server
import WebSocket from 'ws';

console.log('Testing WebSocket connection to Andar Bahar server...');

// Connect to the WebSocket server
const ws = new WebSocket('ws://localhost:5000/ws');

ws.on('open', () => {
  console.log('✅ WebSocket connection established successfully!');
  
  // Try to authenticate as a test user
  const testAuthMessage = {
    type: 'authenticate',
    data: {
      userId: 'test-user-123',
      username: 'Test User',
      role: 'player',
      wallet: 100000,
      token: 'test-token-123' // This will be rejected, but we should get a proper error response
    },
    timestamp: Date.now()
  };
  
  ws.send(JSON.stringify(testAuthMessage));
  console.log('📤 Sent authentication message');
});

ws.on('message', (data) => {
  try {
    const message = JSON.parse(data.toString());
    console.log('📥 Received message:', message.type);
    
    if (message.type === 'auth_error') {
      console.log('✅ Authentication error received (expected for test token):', message.data.message);
    } else if (message.type === 'authenticated') {
      console.log('✅ Authentication successful:', message.data);
    } else if (message.type === 'sync_game_state') {
      console.log('✅ Game state synchronized:', {
        phase: message.data.phase,
        round: message.data.currentRound,
        andarTotal: message.data.andarTotal,
        baharTotal: message.data.baharTotal
      });
    }
  } catch (error) {
    console.error('❌ Error parsing message:', error);
  }
});

ws.on('error', (error) => {
  console.error('❌ WebSocket error:', error.message);
});

ws.on('close', (code, reason) => {
  console.log(`❌ WebSocket connection closed: ${code} - ${reason}`);
});

// Keep the script running for 10 seconds to see responses
setTimeout(() => {
  console.log('Test completed. Closing connection...');
  ws.close();
  process.exit(0);
}, 10000);