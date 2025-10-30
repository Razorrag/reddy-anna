import WebSocket from 'ws';
import fs from 'fs';

// Test configuration
const TEST_DURATION = 5 * 60 * 1000; // 5 minutes
const CONNECTION_INTERVAL = 10000; // 10 seconds between connection attempts
const MAX_CONNECTIONS = 10;

console.log('🚀 Starting WebSocket Stability Test...');
console.log(`Duration: ${TEST_DURATION / 1000} seconds`);
console.log(`Connection interval: ${CONNECTION_INTERVAL / 1000} seconds`);
console.log(`Max connections: ${MAX_CONNECTIONS}\n`);

let connectionCount = 0;
let totalMessages = 0;
let errors = [];
let startTime = Date.now();

// Mock JWT token (replace with real token if available)
const mockToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.mock.token';

function createConnection() {
  if (connectionCount >= MAX_CONNECTIONS) {
    console.log('✅ Max connections reached, stopping test');
    return;
  }

  connectionCount++;
  const connectionId = connectionCount;
  
  console.log(`🔗 Connection ${connectionId}: Creating WebSocket...`);
  
  const ws = new WebSocket('ws://localhost:5000/ws');
  
  let isConnected = false;
  let messageCount = 0;
  let startTime = Date.now();
  
  ws.on('open', () => {
    console.log(`✅ Connection ${connectionId}: WebSocket opened`);
    isConnected = true;
    
    // Send authentication
    ws.send(JSON.stringify({
      type: 'authenticate',
      data: { token: mockToken }
    }));
    
    // Send periodic messages
    const messageInterval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'ping',
          data: { timestamp: Date.now() }
        }));
        messageCount++;
        totalMessages++;
      }
    }, 5000);
    
    // Close connection after 30 seconds
    setTimeout(() => {
      console.log(`🔗 Connection ${connectionId}: Closing after 30s (messages: ${messageCount})`);
      ws.close();
      clearInterval(messageInterval);
      
      // Create new connection after delay
      if (connectionCount < MAX_CONNECTIONS) {
        setTimeout(createConnection, CONNECTION_INTERVAL);
      }
    }, 30000);
  });
  
  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data);
      console.log(`📨 Connection ${connectionId}: Received ${message.type}`);
    } catch (err) {
      console.log(`📨 Connection ${connectionId}: Received raw message: ${data}`);
    }
  });
  
  ws.on('close', (code, reason) => {
    const duration = Date.now() - startTime;
    console.log(`❌ Connection ${connectionId}: Closed (code: ${code}, duration: ${duration}ms, messages: ${messageCount})`);
    
    if (!isConnected) {
      errors.push(`Connection ${connectionId}: Failed to connect`);
    }
  });
  
  ws.on('error', (error) => {
    console.log(`💥 Connection ${connectionId}: Error - ${error.message}`);
    errors.push(`Connection ${connectionId}: ${error.message}`);
  });
}

// Start the test
createConnection();

// Test completion handler
setTimeout(() => {
  const totalDuration = Date.now() - startTime;
  console.log('\n📊 Test Results:');
  console.log(`Total duration: ${totalDuration / 1000} seconds`);
  console.log(`Total connections: ${connectionCount}`);
  console.log(`Total messages sent: ${totalMessages}`);
  console.log(`Average messages per connection: ${connectionCount > 0 ? Math.round(totalMessages / connectionCount) : 0}`);
  console.log(`Errors: ${errors.length}`);
  
  if (errors.length > 0) {
    console.log('\n❌ Errors:');
    errors.forEach(error => console.log(`  - ${error}`));
  }
  
  // Save results to file
  const results = {
    timestamp: new Date().toISOString(),
    duration: totalDuration,
    connections: connectionCount,
    messages: totalMessages,
    errors: errors,
    averageMessagesPerConnection: connectionCount > 0 ? Math.round(totalMessages / connectionCount) : 0
  };
  
  fs.writeFileSync('websocket-test-results.json', JSON.stringify(results, null, 2));
  console.log('\n📄 Results saved to websocket-test-results.json');
  
  process.exit(0);
}, TEST_DURATION);