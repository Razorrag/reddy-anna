// Simple test script for real-time synchronization
// This script tests the WebSocket connection and basic functionality

import WebSocket from 'ws';

// Configuration
const WS_URL = 'ws://localhost:4000';
const GAME_ID = 'default-game';

console.log('🚀 Starting real-time synchronization tests...\n');

// Test WebSocket connection
const ws = new WebSocket(WS_URL);

ws.on('open', () => {
    console.log('✅ WebSocket connection established');
    
    // Authenticate
    ws.send(JSON.stringify({
        type: 'authenticate',
        data: { userId: 'test-user' }
    }));
    
    // Subscribe to game
    ws.send(JSON.stringify({
        type: 'subscribe_game',
        data: { gameId: GAME_ID }
    }));
    
    // Request sync
    setTimeout(() => {
        ws.send(JSON.stringify({
            type: 'sync_request',
            data: { gameId: GAME_ID }
        }));
    }, 1000);
});

ws.on('message', (data) => {
    const message = JSON.parse(data);
    console.log('📨 Received message:', message.type);
    
    switch (message.type) {
        case 'authenticated':
            console.log('✅ Authentication successful');
            break;
        case 'subscribed':
            console.log('✅ Subscribed to game:', message.data.gameId);
            break;
        case 'sync_game_state':
            console.log('✅ Game state sync received');
            console.log('   Phase:', message.data.gameState.phase);
            console.log('   Timer:', message.data.gameState.currentTimer);
            console.log('   Opening Card:', message.data.gameState.openingCard);
            console.log('   Andar Cards:', message.data.gameState.andarCards.length);
            console.log('   Bahar Cards:', message.data.gameState.baharCards.length);
            break;
        case 'timer_update':
            console.log('✅ Timer update received');
            console.log('   Timer:', message.data.timer);
            console.log('   Phase:', message.data.phase);
            break;
        case 'betting_stats':
            console.log('✅ Betting stats received');
            console.log('   Andar Bets:', message.data.andarBets);
            console.log('   Bahar Bets:', message.data.baharBets);
            console.log('   Total Bets:', message.data.totalBets);
            break;
        case 'card_dealt':
            console.log('✅ Card dealt received');
            console.log('   Card:', message.data.card.rank + message.data.card.suit);
            console.log('   Side:', message.data.side);
            console.log('   Position:', message.data.position);
            break;
        case 'game_complete':
            console.log('✅ Game complete received');
            console.log('   Winner:', message.data.winner);
            console.log('   Winning Card:', message.data.winningCard.rank + message.data.winningCard.suit);
            console.log('   Total Cards:', message.data.totalCards);
            break;
        case 'phase_change':
            console.log('✅ Phase change received');
            console.log('   Phase:', message.data.phase);
            console.log('   Message:', message.data.message);
            break;
        default:
            console.log('❓ Unknown message type:', message.type);
    }
});

ws.on('error', (error) => {
    console.error('❌ WebSocket error:', error);
});

ws.on('close', () => {
    console.log('🔌 WebSocket connection closed');
    console.log('\n🎉 WebSocket test completed!');
    console.log('\n📝 To test API endpoints, start the server and use a tool like Postman or curl:');
    console.log('   curl -X POST http://localhost:4000/api/game/update-timer -H "Content-Type: application/json" -d \'{"time": 25, "phase": "betting", "game_id": "default-game"}\'');
    console.log('   curl -X POST http://localhost:4000/api/game/submit-bets -H "Content-Type: application/json" -d \'{"andarBets": 5000, "baharBets": 3000, "game_id": "default-game"}\'');
    console.log('   curl -X POST http://localhost:4000/api/game/deal-card -H "Content-Type: application/json" -d \'{"card": "A♠", "side": "andar", "position": 1, "game_id": "default-game"}\'');
    console.log('   curl http://localhost:4000/api/game/betting-stats/default-game');
});

// Close connection after 10 seconds
setTimeout(() => {
    if (ws.readyState === WebSocket.OPEN) {
        ws.close();
    }
}, 10000);