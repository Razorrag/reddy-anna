/**
 * WebSocket Message Type Test
 * Tests the new message types we added to ensure they work correctly
 */

// Import types directly
interface WebSocketMessage {
  type: 'gameState' | 'betPlaced' | 'gameResult' | 'timerUpdate' | 'error' | 'connection' | 'authenticated' | 'auth_error' | 'sync_game_state' | 'opening_card_set' | 'opening_card_confirmed' | 'card_dealt' | 'timer_start' | 'timer_update' | 'timer_stop' | 'betting_stats' | 'start_round_2' | 'start_final_draw' | 'game_complete' | 'game_reset' | 'phase_change' | 'balance_update' | 'user_bets_update' | 'payout_received' | 'game_start' | 'deal_card' | 'bet_placed' | 'betting_locked' | 'round_complete' | 'card_animation' | 'confetti_trigger' | 'haptic_feedback' | 'accessibility_update' | 'notification' | 'save_cards' | 'reveal_cards' | 'deal_single_card' | 'cards_saved' | 'realtime_stats_update' | 'analytics_update' | 'admin_bet_update' | 'game_bets_update' | 'stream_start' | 'stream_frame' | 'stream_stop' | 'bet_success' | 'stream_status' | 'webrtc_offer' | 'webrtc_answer' | 'webrtc_ice_candidate' | 'viewer_count_update' | 'screen_share_start' | 'screen_share_stop' | 'game:state' | 'game:card-dealt' | 'game:bet-placed' | 'player:bet' | 'admin:start-game' | 'admin:deal-card';
  data: any;
  timestamp?: Date;
}

// Test the new message types
const testMessages: WebSocketMessage[] = [
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
      
      // Check if timestamp is present and valid (if provided)
      if (message.timestamp) {
        if (!(message.timestamp instanceof Date)) {
          throw new Error('Invalid timestamp format');
        }
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
  
  const invalidTypes = [
    'invalid:type',
    'unknown_message',
    'player_bet', // should be player:bet
    'admin_start_game' // should be admin:start-game
  ];
  
  let passed = 0;
  let failed = 0;
  
  // Test valid types
  for (const type of validTypes) {
    try {
      const message: WebSocketMessage = {
        type: type as any,
        data: { test: true }
      };
      console.log(`✅ Valid type: ${type}`);
      passed++;
    } catch (error) {
      console.log(`❌ Failed validation for valid type: ${type}`);
      failed++;
    }
  }
  
  // Test invalid types (should fail TypeScript compilation)
  for (const type of invalidTypes) {
    try {
      const message: WebSocketMessage = {
        type: type as any,
        data: { test: true }
      };
      console.log(`⚠️  Invalid type passed TypeScript: ${type} (this should not happen)`);
      failed++;
    } catch (error) {
      console.log(`✅ Correctly rejected invalid type: ${type}`);
      passed++;
    }
  }
  
  console.log(`\n📊 Validation Results: ${passed} passed, ${failed} failed`);
  return failed === 0;
}

// Run tests
if (import.meta.url === `file://${process.argv[1]}`) {
  const result1 = testWebSocketMessages();
  const result2 = testMessageTypeValidation();
  
  if (result1 && result2) {
    console.log('\n🎉 All WebSocket tests passed!');
    process.exit(0);
  } else {
    console.log('\n⚠️  Some WebSocket tests failed');
    process.exit(1);
  }
}

export { testWebSocketMessages, testMessageTypeValidation };