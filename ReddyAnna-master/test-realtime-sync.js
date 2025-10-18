// Test script for real-time synchronization
// This script tests the WebSocket connection and API endpoints

import WebSocket from 'ws';
import fetch from 'node-fetch';

// Configuration
const API_BASE_URL = 'http://localhost:4000';
const WS_URL = 'ws://localhost:4000';
const GAME_ID = 'default-game';

// Test WebSocket connection
function testWebSocketConnection() {
    console.log('Testing WebSocket connection...');
    
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
        
        if (message.type === 'sync_game_state') {
            console.log('✅ Game state sync received');
            console.log('   Phase:', message.data.gameState.phase);
            console.log('   Timer:', message.data.gameState.currentTimer);
            ws.close();
        }
    });
    
    ws.on('error', (error) => {
        console.error('❌ WebSocket error:', error);
    });
    
    ws.on('close', () => {
        console.log('🔌 WebSocket connection closed');
        testAPIEndpoints();
    });
}

// Test API endpoints
async function testAPIEndpoints() {
    console.log('\nTesting API endpoints...');
    
    try {
        // Test update timer endpoint
        console.log('Testing /update-timer endpoint...');
        const timerResponse = await fetch(`${API_BASE_URL}/api/game/update-timer`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                time: 25,
                phase: 'betting',
                game_id: GAME_ID
            })
        });
        
        if (timerResponse.ok) {
            console.log('✅ Timer update successful');
        } else {
            console.error('❌ Timer update failed:', timerResponse.status);
        }
        
        // Test submit bets endpoint
        console.log('Testing /submit-bets endpoint...');
        const betsResponse = await fetch(`${API_BASE_URL}/api/game/submit-bets`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                andarBets: 5000,
                baharBets: 3000,
                game_id: GAME_ID
            })
        });
        
        if (betsResponse.ok) {
            console.log('✅ Bets submission successful');
        } else {
            console.error('❌ Bets submission failed:', betsResponse.status);
        }
        
        // Test deal card endpoint
        console.log('Testing /deal-card endpoint...');
        const cardResponse = await fetch(`${API_BASE_URL}/api/game/deal-card`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                card: 'A♠',
                side: 'andar',
                position: 1,
                game_id: GAME_ID
            })
        });
        
        if (cardResponse.ok) {
            console.log('✅ Card dealing successful');
        } else {
            console.error('❌ Card dealing failed:', cardResponse.status);
        }
        
        // Test betting stats endpoint
        console.log('Testing /betting-stats endpoint...');
        const statsResponse = await fetch(`${API_BASE_URL}/api/game/betting-stats/${GAME_ID}`);
        
        if (statsResponse.ok) {
            const stats = await statsResponse.json();
            console.log('✅ Betting stats retrieved successfully');
            console.log('   Andar bets:', stats.data.andarBets);
            console.log('   Bahar bets:', stats.data.baharBets);
        } else {
            console.error('❌ Betting stats retrieval failed:', statsResponse.status);
        }
        
        console.log('\n🎉 All tests completed!');
        
    } catch (error) {
        console.error('❌ API test error:', error);
    }
}

// Run tests
console.log('🚀 Starting real-time synchronization tests...\n');
testWebSocketConnection();