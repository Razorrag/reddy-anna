/**
 * Test Runner for All Payment Workflow Tests
 * This script runs both test suites to validate payment workflows
 */

import { testRunner as paymentTestRunner } from './payment-workflow.test.js';
import { runTests as whatsappTestRunner } from './payment-workflow-runner.js';

console.log('🚀 Starting Comprehensive Payment Workflow Tests...\n');

async function runAllTests() {
  console.log('🧪 Running Payment Workflow Tests...');
  const paymentSuccess = await paymentTestRunner.run();
  
  console.log('\n🧪 Running WhatsApp Service Tests...');
  let whatsappSuccess = false;
  try {
    await whatsappTestRunner();
    whatsappSuccess = true;
  } catch (error) {
    console.error('WhatsApp tests failed:', error);
  }
  
  console.log('\n📊 Final Test Results:');
  console.log(`Payment Workflow Tests: ${paymentSuccess ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`WhatsApp Service Tests: ${whatsappSuccess ? '✅ PASSED' : '❌ FAILED'}`);
  
  const allTestsPassed = paymentSuccess && whatsappSuccess;
  
  if (allTestsPassed) {
    console.log('\n🎉 All tests passed successfully!');
    return true;
  } else {
    console.log('\n⚠️  Some tests failed');
    return false;
  }
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllTests()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Test runner failed:', error);
      process.exit(1);
    });
}

export { runAllTests };