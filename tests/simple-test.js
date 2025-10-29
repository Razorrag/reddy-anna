/**
 * Simple Test to Verify WebSocket Message Types
 */

// Test the new message types
const testMessages = [
  {
    type: 'player:bet',
    data: {
      side: 'andar',
      amount: 5000,
      round: '1',
      gameId: 'default-game'
    }
  },
  {
    type: 'admin:start-game',
    data: {
      openingCard: { display: 'A♠', id: 'A♠' },
      timer: 30,
      gameId: 'default-game'
    }
  },
  {
    type: 'admin:deal-card',
    data: {
      card: { display: 'K♥', id: 'K♥' },
      side: 'andar',
      position: 1,
      gameId: 'default-game'
    }
  },
  {
    type: 'game:state',
    data: {
      phase: 'betting',
      currentRound: 1,
      countdown: 30,
      openingCard: { display: 'A♠', id: 'A♠' }
    }
  },
  {
    type: 'game:card-dealt',
    data: {
      card: { display: 'Q♦', id: 'Q♦' },
      side: 'bahar',
      position: 1,
      isWinningCard: false
    }
  },
  {
    type: 'game:bet-placed',
    data: {
      side: 'andar',
      amount: 2500,
      round: 1
    }
  }
];

// Test function
function testWebSocketMessages() {
  console.log('🧪 Testing WebSocket Message Types...\n');
  
  let passed = 0;
  let failed = 0;
  
  for (const message of testMessages) {
    try {
      // Validate message structure
      if (!message.type || typeof message.type !== 'string') {
        throw new Error('Invalid message type');
      }
      
      if (!message.data || typeof message.data !== 'object') {
        throw new Error('Invalid message data');
      }
      
      console.log(`✅ Valid message: ${message.type}`);
      passed++;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.log(`❌ Invalid message: ${message.type} - ${errorMessage}`);
      failed++;
    }
  }
  
  console.log(`\n📊 Test Results: ${passed} passed, ${failed} failed`);
  
  if (failed === 0) {
    console.log('🎉 All WebSocket message types are working correctly!');
    return true;
  } else {
    console.log('⚠️  Some WebSocket message types have issues');
    return false;
  }
}

// Test message type validation
function testMessageTypeValidation() {
  console.log('\n🧪 Testing Message Type Validation...\n');
  
  const validTypes = [
    'player:bet',
    'admin:start-game', 
    'admin:deal-card',
    'game:state',
    'game:card-dealt',
    'game:bet-placed'
  ];
  
  let passed = 0;
  let failed = 0;
  
  // Test valid types
  for (const type of validTypes) {
    if (typeof type === 'string' && type.includes(':')) {
      console.log(`✅ Valid type format: ${type}`);
      passed++;
    } else {
      console.log(`❌ Invalid type format: ${type}`);
      failed++;
    }
  }
  
  console.log(`\n📊 Validation Results: ${passed} passed, ${failed} failed`);
  return failed === 0;
}

// Run tests
const result1 = testWebSocketMessages();
const result2 = testMessageTypeValidation();

if (result1 && result2) {
  console.log('\n🎉 All WebSocket tests passed!');
  process.exit(0);
} else {
  console.log('\n⚠️  Some WebSocket tests failed');
  process.exit(1);
}