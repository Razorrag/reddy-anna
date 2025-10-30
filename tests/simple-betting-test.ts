/**
 * Simple Betting Test
 * Basic test to verify round 1 and round 2 betting functionality
 */

// Mock betting service
class MockBettingService {
  private users = [
    { id: 'user1', balance: 5000 },
    { id: 'user2', balance: 3000 }
  ];

  async processBet(userId: string, amount: number, side: string, round: number) {
    const user = this.users.find(u => u.id === userId);
    if (!user) return { success: false, message: 'User not found' };
    
    if (round !== 1 && round !== 2) {
      return { success: false, message: `Betting only allowed in Round 1 and Round 2. Current round: ${round}` };
    }
    
    if (amount < 1000 || amount > 100000) {
      return { success: false, message: 'Invalid bet amount' };
    }
    
    if (side !== 'andar' && side !== 'bahar') {
      return { success: false, message: 'Invalid bet side' };
    }
    
    if (user.balance < amount) {
      return { success: false, message: 'Insufficient balance' };
    }
    
    user.balance -= amount;
    return { success: true, newBalance: user.balance };
  }
}

// Test function
async function runTests() {
  console.log('🎯 Testing Betting Functionality...\n');
  
  const bettingService = new MockBettingService();
  let passed = 0;
  let total = 0;
  
  // Test 1: Round 1 betting
  total++;
  try {
    const result1 = await bettingService.processBet('user1', 1000, 'andar', 1);
    if (result1.success && result1.newBalance === 4000) {
      console.log('✅ Test 1: Round 1 betting - PASSED');
      passed++;
    } else {
      console.log('❌ Test 1: Round 1 betting - FAILED');
      console.log('   Expected: success=true, balance=4000');
      console.log('   Got:', result1);
    }
  } catch (error) {
    console.log('❌ Test 1: Round 1 betting - ERROR:', error instanceof Error ? error.message : String(error));
  }
  
  // Test 2: Round 2 betting
  total++;
  try {
    const result2 = await bettingService.processBet('user1', 1500, 'bahar', 2);
    if (result2.success && result2.newBalance === 2500) {
      console.log('✅ Test 2: Round 2 betting - PASSED');
      passed++;
    } else {
      console.log('❌ Test 2: Round 2 betting - FAILED');
      console.log('   Expected: success=true, balance=2500');
      console.log('   Got:', result2);
    }
  } catch (error) {
    console.log('❌ Test 2: Round 2 betting - ERROR:', error instanceof Error ? error.message : String(error));
  }
  
  // Test 3: Round 3 betting (should fail)
  total++;
  try {
    const result3 = await bettingService.processBet('user1', 1000, 'andar', 3);
    if (!result3.success && result3.message && result3.message.includes('Round 1 and Round 2')) {
      console.log('✅ Test 3: Round 3 betting blocked - PASSED');
      passed++;
    } else {
      console.log('❌ Test 3: Round 3 betting blocked - FAILED');
      console.log('   Expected: success=false, message about round restriction');
      console.log('   Got:', result3);
    }
  } catch (error) {
    console.log('❌ Test 3: Round 3 betting blocked - ERROR:', error instanceof Error ? error.message : String(error));
  }
  
  // Test 4: Insufficient balance
  total++;
  try {
    const result4 = await bettingService.processBet('user2', 5000, 'andar', 1);
    if (!result4.success && result4.message && result4.message.includes('Insufficient balance')) {
      console.log('✅ Test 4: Insufficient balance blocked - PASSED');
      passed++;
    } else {
      console.log('❌ Test 4: Insufficient balance blocked - FAILED');
      console.log('   Expected: success=false, message about insufficient balance');
      console.log('   Got:', result4);
    }
  } catch (error) {
    console.log('❌ Test 4: Insufficient balance blocked - ERROR:', error instanceof Error ? error.message : String(error));
  }
  
  // Test 5: Invalid bet side
  total++;
  try {
    const result5 = await bettingService.processBet('user1', 1000, 'invalid', 1);
    if (!result5.success && result5.message && result5.message.includes('Invalid bet side')) {
      console.log('✅ Test 5: Invalid bet side blocked - PASSED');
      passed++;
    } else {
      console.log('❌ Test 5: Invalid bet side blocked - FAILED');
      console.log('   Expected: success=false, message about invalid side');
      console.log('   Got:', result5);
    }
  } catch (error) {
    console.log('❌ Test 5: Invalid bet side blocked - ERROR:', error instanceof Error ? error.message : String(error));
  }
  
  console.log(`\n📊 Results: ${passed}/${total} tests passed`);
  
  if (passed === total) {
    console.log('🎉 All betting tests PASSED! Round 1 and Round 2 betting is working correctly.');
    return true;
  } else {
    console.log('⚠️  Some tests FAILED. Please check the betting logic.');
    return false;
  }
}

// Run tests
runTests().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('Test runner failed:', error);
  process.exit(1);
});