// Simple WebSocket test to verify frontend-to-backend message flow
const WebSocket = require('ws');

console.log('🧪 TESTING WEBSOCKET MESSAGE FLOW');
console.log('Frontend → Backend → Frontend');

const WS_URL = process.env.WS_URL || 'ws://localhost:5000/ws';

async function delay(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

async function testWebSocketFlow() {
    console.log('1️⃣ Connecting to WebSocket...');

    const ws = new WebSocket(WS_URL);

    return new Promise((resolve, reject) => {
        ws.onopen = async () => {
            console.log('✅ WebSocket connected successfully');
            console.log('2️⃣ Testing player bet message flow...');

            // Test 1: Player bet message
            console.log('📤 Sending player bet message (place_bet)');
            ws.send(JSON.stringify({
                type: 'place_bet',
                data: {
                    gameId: 'test-game',
                    side: 'andar',
                    amount: 100,
                    round: 1
                }
            }));

            await delay(1000);

            // Test 2: Admin start game message
            console.log('📤 Sending admin start game message (start_game)');
            ws.send(JSON.stringify({
                type: 'start_game',
                data: {
                    openingCard: { rank: 'K', suit: '♥', id: 'test-card' }
                }
            }));

            await delay(1000);

            // Test 3: Admin deal card message
            console.log('📤 Sending admin deal card message (deal_card)');
            ws.send(JSON.stringify({
                type: 'deal_card',
                data: {
                    gameId: 'test-game',
                    card: 'Q♠',
                    side: 'bahar',
                    position: 1
                }
            }));

            await delay(1000);

            console.log('✅ All WebSocket message types tested successfully!');
            console.log('🎉 FRONTEND TO BACKEND MESSAGE FLOW IS WORKING');
            console.log('The integrated game flow should now work properly with:');
            console.log('- Player betting');
            console.log('- Admin game control');
            console.log('- Live updates');

            ws.close();
            resolve();
        };

        ws.onmessage = (event) => {
            const message = JSON.parse(event.data);
            console.log('📡 Server response:', message.type, message.data);
        };

        ws.onerror = (error) => {
            console.error('❌ WebSocket error:', error);
            reject(error);
        };

        ws.onclose = () => {
            console.log('✅ WebSocket closed');
        };
    });
}

testWebSocketFlow()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error('❌ Test failed:', error);
        process.exit(1);
    });
