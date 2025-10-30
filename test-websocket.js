import WebSocket from 'ws';

console.log('Testing WebSocket connection...');

// Test 1: Try connecting to the WebSocket server directly
const ws1 = new WebSocket('ws://localhost:5000/ws');

ws1.on('open', () => {
  console.log('✅ Direct WebSocket connection successful!');
  ws1.close();
});

ws1.on('error', (error) => {
  console.log('❌ Direct WebSocket connection failed:', error.message);
});

ws1.on('close', () => {
  console.log('Direct connection closed');
});

// Test 2: Try connecting through Vite proxy
setTimeout(() => {
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
}, 2000);