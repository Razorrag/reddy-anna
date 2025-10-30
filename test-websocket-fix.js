import WebSocket from 'ws';

console.log('Testing WebSocket connection after fixes...');

// Test 1: Try connecting to the WebSocket server directly
const ws1 = new WebSocket('ws://localhost:5000/ws');

ws1.on('open', () => {
  console.log('✅ Direct WebSocket connection successful!');
  console.log('Sending authentication test message...');
  
  // Send a test message
  ws1.send(JSON.stringify({
    type: 'authenticate',
    data: { token: 'test-token' },
    timestamp: new Date().toISOString()
  }));
  
  // Close after 2 seconds
  setTimeout(() => {
    ws1.close();
  }, 2000);
});

ws1.on('message', (data) => {
  console.log('Received message:', JSON.parse(data.toString()));
});

ws1.on('error', (error) => {
  console.log('❌ Direct WebSocket connection failed:', error.message);
});

ws1.on('close', () => {
  console.log('Direct connection closed');
});

// Test 2: Try connecting through Vite proxy
setTimeout(() => {
  console.log('\nTesting Vite proxy connection...');
  const ws2 = new WebSocket('ws://localhost:3000/ws');
  
  ws2.on('open', () => {
    console.log('✅ Vite proxy WebSocket connection successful!');
    ws2.close();
  });
  
  ws2.on('error', (error) => {
    console.log('❌ Vite proxy WebSocket connection failed:', error.message);
  });
  
  ws2.on('close', () => {
    console.log('Vite proxy connection closed');
  });
}, 3000);