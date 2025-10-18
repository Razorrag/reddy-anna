// Simple API test script for Andar Bahar game
// Run with: node test-api.js (after starting the backend server)

const API_BASE_URL = 'http://localhost:4000';

// Test functions
async function testHealthEndpoint() {
    console.log('Testing health endpoint...');
    try {
        const response = await fetch(`${API_BASE_URL}/health`);
        const data = await response.json();
        console.log('✅ Health endpoint response:', data);
        return true;
    } catch (error) {
        console.error('❌ Health endpoint failed:', error.message);
        return false;
    }
}

async function testGameSettings() {
    console.log('\nTesting game settings endpoint...');
    try {
        const response = await fetch(`${API_BASE_URL}/api/game/settings`);
        const data = await response.json();
        console.log('✅ Game settings response:', data);
        return true;
    } catch (error) {
        console.error('❌ Game settings endpoint failed:', error.message);
        return false;
    }
}

async function testGameState() {
    console.log('\nTesting game state endpoint...');
    try {
        const response = await fetch(`${API_BASE_URL}/api/game/game-state`);
        const data = await response.json();
        console.log('✅ Game state response:', data);
        return true;
    } catch (error) {
        console.error('❌ Game state endpoint failed:', error.message);
        return false;
    }
}

async function testSetOpeningCard() {
    console.log('\nTesting set opening card endpoint...');
    try {
        const response = await fetch(`${API_BASE_URL}/api/game/set-opening-card`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ card: 'A♠' })
        });
        const data = await response.json();
        console.log('✅ Set opening card response:', data);
        return true;
    } catch (error) {
        console.error('❌ Set opening card endpoint failed:', error.message);
        return false;
    }
}

async function testStartTimer() {
    console.log('\nTesting start timer endpoint...');
    try {
        const response = await fetch(`${API_BASE_URL}/api/game/start-timer`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ round: 'round1', duration: 30 })
        });
        const data = await response.json();
        console.log('✅ Start timer response:', data);
        return true;
    } catch (error) {
        console.error('❌ Start timer endpoint failed:', error.message);
        return false;
    }
}

async function testSubmitBets() {
    console.log('\nTesting submit bets endpoint...');
    try {
        const response = await fetch(`${API_BASE_URL}/api/game/submit-bets`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                round: 'round1', 
                andarTotal: 5000, 
                baharTotal: 3000 
            })
        });
        const data = await response.json();
        console.log('✅ Submit bets response:', data);
        return true;
    } catch (error) {
        console.error('❌ Submit bets endpoint failed:', error.message);
        return false;
    }
}

async function testSelectCards() {
    console.log('\nTesting select cards endpoint...');
    try {
        const response = await fetch(`${API_BASE_URL}/api/game/select-cards`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                round: 'round1', 
                side: 'andar', 
                cards: ['K♠', 'Q♥', 'J♦'] 
            })
        });
        const data = await response.json();
        console.log('✅ Select cards response:', data);
        return true;
    } catch (error) {
        console.error('❌ Select cards endpoint failed:', error.message);
        return false;
    }
}

async function testResetGame() {
    console.log('\nTesting reset game endpoint...');
    try {
        const response = await fetch(`${API_BASE_URL}/api/game/reset-game`, {
            method: 'POST'
        });
        const data = await response.json();
        console.log('✅ Reset game response:', data);
        return true;
    } catch (error) {
        console.error('❌ Reset game endpoint failed:', error.message);
        return false;
    }
}

// Run all tests
async function runAllTests() {
    console.log('🎮 Starting Andar Bahar API Tests');
    console.log('=====================================');
    
    const results = [];
    
    results.push(await testHealthEndpoint());
    results.push(await testGameSettings());
    results.push(await testGameState());
    results.push(await testSetOpeningCard());
    results.push(await testStartTimer());
    results.push(await testSubmitBets());
    results.push(await testSelectCards());
    results.push(await testResetGame());
    
    console.log('\n=====================================');
    console.log('📊 Test Results Summary:');
    console.log(`✅ Passed: ${results.filter(r => r).length} tests`);
    console.log(`❌ Failed: ${results.filter(r => !r).length} tests`);
    
    if (results.every(r => r)) {
        console.log('🎉 All tests passed! The API is working correctly.');
    } else {
        console.log('⚠️ Some tests failed. Please check the backend server.');
    }
}

// Check if fetch is available (Node.js 18+)
if (typeof fetch === 'undefined') {
    console.error('❌ This script requires Node.js 18+ or a fetch polyfill.');
    console.log('   You can install node-fetch with: npm install node-fetch');
    process.exit(1);
}

// Run the tests
runAllTests().catch(error => {
    console.error('❌ Test runner failed:', error);
    process.exit(1);
});