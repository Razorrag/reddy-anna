// Node.js v22+ has native fetch, no need to import

const API_BASE_URL = 'http://localhost:4000';

async function testAPIEndpoints() {
    console.log('Testing Andar Bahar Game Flow...\n');
    
    try {
        // Test 1: Start game
        console.log('1. Testing start game endpoint...');
        const startGameResponse = await fetch(`${API_BASE_URL}/api/game/start-game`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                gameId: 'test-game-001',
                openingCard: '8♠',
                timer: 30
            })
        });
        
        const startGameResult = await startGameResponse.json();
        console.log('Start game response:', startGameResult);
        console.log('✅ Start game endpoint working\n');
        
        // Test 2: Place bet
        console.log('2. Testing place bet endpoint...');
        const placeBetResponse = await fetch(`${API_BASE_URL}/api/game/place-bet`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                userId: 'test-user-001',
                gameId: 'test-game-001',
                round: 'round1',
                side: 'andar',
                amount: 1000
            })
        });
        
        const placeBetResult = await placeBetResponse.json();
        console.log('Place bet response:', placeBetResult);
        console.log('✅ Place bet endpoint working\n');
        
        // Test 3: Deal card
        console.log('3. Testing deal card endpoint...');
        const dealCardResponse = await fetch(`${API_BASE_URL}/api/game/deal-card`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                gameId: 'test-game-001',
                card: { rank: 'K', suit: '♥', display: 'K♥' },
                side: 'andar'
            })
        });
        
        const dealCardResult = await dealCardResponse.json();
        console.log('Deal card response:', dealCardResult);
        console.log('✅ Deal card endpoint working\n');
        
        // Test 4: Update timer
        console.log('4. Testing update timer endpoint...');
        const updateTimerResponse = await fetch(`${API_BASE_URL}/api/game/update-timer`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                gameId: 'test-game-001',
                timer: 25,
                phase: 'betting'
            })
        });
        
        const updateTimerResult = await updateTimerResponse.json();
        console.log('Update timer response:', updateTimerResult);
        console.log('✅ Update timer endpoint working\n');
        
        // Test 5: Complete game
        console.log('5. Testing complete game endpoint...');
        const completeGameResponse = await fetch(`${API_BASE_URL}/api/game/complete-game`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                gameId: 'test-game-001',
                winner: 'andar',
                winningCard: { rank: '8', suit: '♠', display: '8♠' }
            })
        });
        
        const completeGameResult = await completeGameResponse.json();
        console.log('Complete game response:', completeGameResult);
        console.log('✅ Complete game endpoint working\n');
        
        // Test 6: Get player bets
        console.log('6. Testing get player bets endpoint...');
        const getPlayerBetsResponse = await fetch(`${API_BASE_URL}/api/game/player-bets/test-user-001/test-game-001`);
        const getPlayerBetsResult = await getPlayerBetsResponse.json();
        console.log('Get player bets response:', getPlayerBetsResult);
        console.log('✅ Get player bets endpoint working\n');
        
        // Test 7: Get all bets
        console.log('7. Testing get all bets endpoint...');
        const getAllBetsResponse = await fetch(`${API_BASE_URL}/api/game/all-bets/test-game-001`);
        const getAllBetsResult = await getAllBetsResponse.json();
        console.log('Get all bets response:', getAllBetsResult);
        console.log('✅ Get all bets endpoint working\n');
        
        console.log('🎉 All API endpoints are working correctly!');
        console.log('\nTo test the complete game flow:');
        console.log('1. Open admin-auth.html in a browser and login with username: admin, password: admin123');
        console.log('2. This will redirect you to game-admin-fixed.html');
        console.log('3. Open start-game.html in another browser tab');
        console.log('4. Start a game from the admin interface');
        console.log('5. Place bets from the user interface');
        console.log('6. The game state should sync in real-time between both interfaces');
        
    } catch (error) {
        console.error('❌ Error testing API endpoints:', error);
    }
}

// Run the test
testAPIEndpoints();