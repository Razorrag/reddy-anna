/**
 * Simple Payment Workflow Test Runner
 * 
 * A lightweight test runner for validating payment workflows without external dependencies
 * Can be run in Node.js environment to test core functionality
 */

import { EnhancedWhatsAppService } from '../server/whatsapp-service-enhanced';
import { Pool } from 'pg';

// Mock Pool for testing
class MockPool {
  private queries: Array<{ sql: string; params: any[]; result: any }> = [];
  private callCount = 0;

  query(sql: string, params?: any[]) {
    this.callCount++;
    const mockResult = this.getMockResult(sql, params);
    
    console.log(`Mock Query ${this.callCount}:`, {
      sql: sql.substring(0, 100) + '...',
      params,
      result: mockResult ? 'MOCKED' : 'DEFAULT'
    });

    return Promise.resolve(mockResult || { rows: [], rowCount: 0 });
  }

  private getMockResult(sql: string, params?: any[]): any {
    // Mock results for different query types
    if (sql.includes('INSERT INTO whatsapp_messages')) {
      return { rows: [{ id: 'msg_123', phone: params?.[1] }] };
    }
    
    if (sql.includes('INSERT INTO admin_requests')) {
      return { rows: [{ id: 'req_123', status: 'pending', retry_count: 0 }] };
    }
    
    if (sql.includes('SELECT * FROM admin_requests WHERE status = $1')) {
      return { rows: [{ id: 'req_123', status: 'pending' }] };
    }
    
    if (sql.includes('update_request_status')) {
      return { rows: [{ request: { id: 'req_123', status: 'approved' } }] };
    }
    
    if (sql.includes('update_balance_with_request')) {
      return { rows: [{ request: { id: 'req_123', balance_updated: true } }] };
    }

    return null;
  }

  getCallCount(): number {
    return this.callCount;
  }

  reset() {
    this.callCount = 0;
    this.queries = [];
  }
}

// Test utilities
class TestRunner {
  private tests: Array<{ name: string; fn: () => Promise<void> }> = [];
  private passed = 0;
  private failed = 0;

  addTest(name: string, fn: () => Promise<void>) {
    this.tests.push({ name, fn });
  }

  async run() {
    console.log('🧪 Running Payment Workflow Tests...\n');

    for (const test of this.tests) {
      try {
        console.log(`Running: ${test.name}`);
        await test.fn();
        this.passed++;
        console.log('✅ PASSED\n');
      } catch (error) {
        this.failed++;
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.log(`❌ FAILED: ${errorMessage}\n`);
      }
    }

    this.printSummary();
  }

  private printSummary() {
    const total = this.passed + this.failed;
    console.log('📊 Test Summary:');
    console.log(`Total: ${total}`);
    console.log(`Passed: ${this.passed}`);
    console.log(`Failed: ${this.failed}`);
    console.log(`Success Rate: ${Math.round((this.passed / total) * 100)}%`);

    if (this.failed > 0) {
      process.exit(1);
    }
  }
}

// Test cases
async function runTests() {
  const runner = new TestRunner();
  const mockPool = new MockPool();
  const whatsappService = new EnhancedWhatsAppService(mockPool as any);

  // Test 1: Basic message processing
  runner.addTest('Should process valid WhatsApp message', async () => {
    const mockMessage = {
      id: 'msg_123',
      phone: '918686886632',
      message: 'Deposit request for ₹10,000 via UPI. UTR: UPI1234567890',
      timestamp: new Date().toISOString(),
      type: 'text'
    };

    const result = await whatsappService.processWhatsAppMessage(mockMessage);
    
    if (!result) {
      throw new Error('Expected result to be defined');
    }
    
    if (result.retry_count !== 0) {
      throw new Error(`Expected retry_count to be 0, got ${result.retry_count}`);
    }
  });

  // Test 2: Amount extraction
  runner.addTest('Should extract amount correctly from various formats', async () => {
    const service = whatsappService as any;

    const testCases = [
      { input: 'Deposit ₹10,000', expected: 10000 },
      { input: 'Rs. 5000', expected: 5000 },
      { input: 'Amount: 2500.50', expected: 2500.50 },
      { input: 'No amount here', expected: null }
    ];

    for (const testCase of testCases) {
      const result = service.extractAmount(testCase.input);
      if (result !== testCase.expected) {
        throw new Error(`Expected ${testCase.expected}, got ${result} for input "${testCase.input}"`);
      }
    }
  });

  // Test 3: Payment method extraction
  runner.addTest('Should extract payment method correctly', async () => {
    const service = whatsappService as any;

    const testCases = [
      { input: 'via UPI', expected: 'UPI' },
      { input: 'through PhonePe', expected: 'UPI' },
      { input: 'bank transfer', expected: 'Bank Transfer' },
      { input: 'cash payment', expected: 'Cash' },
      { input: 'no method', expected: null }
    ];

    for (const testCase of testCases) {
      const result = service.extractPaymentMethod(testCase.input);
      if (result !== testCase.expected) {
        throw new Error(`Expected ${testCase.expected}, got ${result} for input "${testCase.input}"`);
      }
    }
  });

  // Test 4: UTR number extraction
  runner.addTest('Should extract UTR number correctly', async () => {
    const service = whatsappService as any;

    const testCases = [
      { input: 'UTR: UPI1234567890', expected: 'UPI1234567890' },
      { input: 'Reference: BANK123456789012', expected: 'BANK123456789012' },
      { input: 'no utr here', expected: null }
    ];

    for (const testCase of testCases) {
      const result = service.extractUTRNumber(testCase.input);
      if (result !== testCase.expected) {
        throw new Error(`Expected ${testCase.expected}, got ${result} for input "${testCase.input}"`);
      }
    }
  });

  // Test 5: Retry logic calculation
  runner.addTest('Should calculate retry delay with exponential backoff', async () => {
    const service = whatsappService as any;

    const delay1 = service.calculateRetryDelay(1);
    const delay2 = service.calculateRetryDelay(2);
    const delay3 = service.calculateRetryDelay(3);

    if (delay1 < 30) {
      throw new Error(`Expected delay1 >= 30, got ${delay1}`);
    }
    
    if (delay2 < 60) {
      throw new Error(`Expected delay2 >= 60, got ${delay2}`);
    }
    
    if (delay3 > service.retryConfig.maxDelay) {
      throw new Error(`Expected delay3 <= ${service.retryConfig.maxDelay}, got ${delay3}`);
    }
  });

  // Test 6: Request status update
  runner.addTest('Should update request status successfully', async () => {
    const result = await whatsappService.updateRequestStatus(
      'req_123',
      'admin_123',
      'approved',
      'Approved by admin'
    );

    if (!result) {
      throw new Error('Expected result to be defined');
    }

    if (result.status !== 'approved') {
      throw new Error(`Expected status to be "approved", got "${result.status}"`);
    }
  });

  // Test 7: Balance update processing
  runner.addTest('Should process balance update successfully', async () => {
    const result = await whatsappService.updateBalanceAndProcessRequest(
      'req_123',
      'admin_123',
      'completed',
      'Balance updated successfully'
    );

    if (!result) {
      throw new Error('Expected result to be defined');
    }

    if (result.balance_updated !== true) {
      throw new Error(`Expected balance_updated to be true, got ${result.balance_updated}`);
    }
  });

  // Test 8: Get requests by status
  runner.addTest('Should get requests by status', async () => {
    const result = await whatsappService.getRequestsByStatus('pending', 10);

    if (!Array.isArray(result)) {
      throw new Error('Expected result to be an array');
    }
  });

  // Test 9: Get retry statistics
  runner.addTest('Should get retry statistics', async () => {
    const result = await whatsappService.getRetryStatistics();

    const requiredFields = ['total_requests', 'failed_requests', 'avg_retry_count'];
    
    for (const field of requiredFields) {
      if (!(field in result)) {
        throw new Error(`Expected field "${field}" in retry statistics`);
      }
    }
  });

  // Test 10: Empty message handling
  runner.addTest('Should handle empty message processing', async () => {
    const emptyMessage = {
      id: 'msg_123',
      phone: '918686886632',
      message: '',
      timestamp: new Date().toISOString(),
      type: 'text'
    };

    const result = await whatsappService.processWhatsAppMessage(emptyMessage);
    
    if (result !== null) {
      throw new Error('Expected result to be null for empty message');
    }
  });

  // Run all tests
  await runner.run();
}

// Run tests if this file is executed directly
if (require.main === module) {
  runTests().catch(error => {
    console.error('Test runner failed:', error);
    process.exit(1);
  });
}

export { TestRunner, MockPool, runTests };