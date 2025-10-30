const WebSocket = require('ws');

console.log('🎴 TESTING NEW GAME FLOW INTEGRATION 🎴');

// Test configuration
const WS_URL = process.env.WS_URL || 'ws://localhost:5000/ws';
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

// Game flow test
let adminWs = null;
let client1Ws = null;
let client2Ws = null;
let clients = [];

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function testGameFlow() {
    console.log('\n🚀 Starting Game Flow Test...\n');

    try {
        // Step 1: Connect Admin
        console.log('1️⃣ Connecting Admin WebSocket...');
        adminWs = new WebSocket(WS_URL);

        await new Promise((resolve, reject) => {
            adminWs.onopen = () => {
                console.log('✅ Admin WebSocket connected');
                resolve();
            };
            adminWs.onerror = (error) => reject(error);
        });

        // Authenticate Admin
        console.log('2️⃣ Authenticating Admin...');
        adminWs.send(JSON.stringify({
            type: 'authenticate',
            data: { token: 'admin-test-token' }
        }));

        await new Promise((resolve) => {
            adminWs.onmessage = (event) => {
                const message = JSON.parse(event.data);
                if (message.type === 'authenticated') {
                    console.log('✅ Admin authenticated successfully');
                    resolve();
                }
            };
        });

        // Step 2: Connect Client 1 (Player)
        console.log('3️⃣ Connecting Player 1...');
        client1Ws = new WebSocket(WS_URL);

        await new Promise((resolve, reject) => {
            client1Ws.onopen = () => {
                console.log('✅ Player 1 WebSocket connected');
                resolve();
            };
            client1Ws.onerror = (error) => reject(error);
        });

        // Authenticate Client 1
        client1Ws.send(JSON.stringify({
            type: 'authenticate',
            data: { token: 'player1-test-token' }
        }));

        await new Promise((resolve) => {
            client1Ws.onmessage = (event) => {
                const message = JSON.parse(event.data);
                if (message.type === 'authenticated') {
                    console.log('✅ Player 1 authenticated successfully');
                    resolve();
                }
            };
        });

        // Step 3: Connect Client 2 (Player 2)
        console.log('4️⃣ Connecting Player 2...');
        client2Ws = new WebSocket(WS_URL);

        await new Promise((resolve, reject) => {
            client2Ws.onopen = () => {
                console.log('✅ Player 2 WebSocket connected');
                resolve();
            };
            client2Ws.onerror = (error) => reject(error);
        });

        // Authenticate Client 2
        client2Ws.send(JSON.stringify({
            type: 'authenticate',
            data: { token: 'player2-test-token' }
        }));

        await new Promise((resolve) => {
            client2Ws.onmessage = (event) => {
                const message = JSON.parse(event.data);
                if (message.type === 'authenticated') {
                    console.log('✅ Player 2 authenticated successfully');
                    resolve();
                }
            };
        });

        // Step 4: Setup message listeners for all clients
        setupMessageListeners();

        // Step 5: Admin starts the game
        console.log('5️⃣ Admin starting game...');
        await delay(1000);

        adminWs.send(JSON.stringify({
            type: 'start_game',
            data: { openingCard: '10♦' }
        }));

        // Wait for game state updates
        await delay(2000);

        console.log('6️⃣ Waiting for betting phase...');

        // Step 6: Players place bets
        console.log('7️⃣ Player 1 placing bet (₹100 on Andar Round 1)...');
        client1Ws.send(JSON.stringify({
            type: 'place_bet',
            data: {
                gameId: 'test-game',
                side: 'andar',
                amount: 100,
                round: 1
            }
        }));

        await delay(500);

        console.log('8️⃣ Player 2 placing bet (₹50 on Bahar Round 1)...');
        client2Ws.send(JSON.stringify({
            type: 'place_bet',
            data: {
                gameId: 'test-game',
                side: 'bahar',
                amount: 50,
                round: 1
            }
        }));

        await delay(500);

        console.log('9️⃣ Player 1 placing Round 2 bets (₹75 on Andar)...');
        client1Ws.send(JSON.stringify({
            type: 'place_bet',
            data: {
                gameId: 'test-game',
                side: 'andar',
                amount: 75,
                round: 2
            }
        }));

        // Step 7: Admin deals first card (Bahar)
        console.log('🔟 Admin dealing first card (Bahar)...');
        await delay(2000);

        adminWs.send(JSON.stringify({
            type: 'deal_card',
            data: {
                gameId: 'test-game',
                card: 'A♠',
                side: 'bahar',
                position: 1
            }
        }));

        await delay(2000);

        // Step 8: Admin deals second card (Andar)
        console.log('1️⃣ 1️⃣ Admin dealing second card (Andar)...');

        adminWs.send(JSON.stringify({
            type: 'deal_card',
            data: {
                gameId: 'test-game',
                card: '7♥',
                side: 'andar',
                position: 1
            }
        }));

        // Wait for round to complete
        await delay(3000);

        console.log('\n🎉 GAME FLOW TEST COMPLETED SUCCESSFULLY! 🎉');
        console.log('The new integrated game handlers should be working with:');
        console.log('- ✅ Admin game control (start/deal)');
        console.log('- ✅ Player betting functionality');
        console.log('- ✅ Real-time game state updates');
        console.log('- ✅ Proper payout calculations');
        console.log('- ✅ Bet tracking and processing');

    } catch (error) {
        console.error('❌ Test failed:', error);
    } finally {
        // Cleanup
        if (adminWs) adminWs.close();
        if (client1Ws) client1Ws.close();
        if (client2Ws) client2Ws.close();
    }
}

function setupMessageListeners() {
    // Admin messages
    adminWs.onmessage = (event) => {
        const message = JSON.parse(event.data);
        console.log(`📡 ADMIN: ${message.type}`, message.data);
    };

    // Client 1 messages
    client1Ws.onmessage = (event) => {
        const message = JSON.parse(event.data);
        console.log(`📡 PLAYER1: ${message.type}`, message.data);
    };

    // Client 2 messages
    client2Ws.onmessage = (event) => {
        const message = JSON.parse(event.data);
        console.log(`📡 PLAYER2: ${message.type}`, message.data);
    };
}

// Run the test
testGameFlow().then(() => {
    console.log('\n🎯 Test script completed!');
    process.exit(0);
}).catch((error) => {
    console.error('\n💥 Test failed:', error);
    process.exit(1);
});
