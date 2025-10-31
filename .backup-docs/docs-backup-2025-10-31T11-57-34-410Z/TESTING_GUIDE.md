# Testing Guide

This document provides comprehensive information about the testing setup and how to run tests for the Andar Bahar gaming platform.

## Test Suite Overview

The platform includes multiple test suites to ensure reliability and functionality:

### 1. Payment Workflow Tests (`tests/payment-workflow.test.ts`)
- **Purpose**: Validates payment request creation, approval, and rejection workflows
- **Features**: 
  - Mock payment service with realistic scenarios
  - Error handling validation
  - WebSocket integration testing
  - Input validation testing

### 2. WhatsApp Service Tests (`tests/payment-workflow-runner.ts`)
- **Purpose**: Tests the enhanced WhatsApp service with retry logic
- **Features**:
  - Message processing validation
  - Amount and payment method extraction
  - UTR number parsing
  - Retry delay calculation
  - Database operation mocking

### 3. Combined Test Runner (`tests/run-all-tests.ts`)
- **Purpose**: Runs all test suites together for comprehensive validation
- **Features**:
  - Aggregates results from all test suites
  - Provides unified test reporting
  - Easy execution for CI/CD pipelines

## Running Tests

### Prerequisites
Ensure you have installed the required dependencies:

```bash
# Install Jest type definitions for TypeScript support
npm install --save-dev @types/jest

# For client-side tests
cd client && npm install @types/jest
```

### Test Commands

```bash
# Run all tests
npm test

# Run payment workflow tests only
npm run test:payment

# Run WhatsApp service tests only  
npm run test:whatsapp

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch

# Run tests with UI interface
npm run test:ui
```

### Test Execution Examples

```bash
# Run all comprehensive tests
npm test

# Expected output:
# 🚀 Starting Comprehensive Payment Workflow Tests...
# 
# 🧪 Running Payment Workflow Tests...
# ✅ All payment workflow tests passed
# 
# 🧪 Running WhatsApp Service Tests...
# ✅ All WhatsApp service tests passed
# 
# 🎉 All tests passed successfully!
```

## Test Categories

### Payment Workflow Tests
- **Request Creation**: Validates payment request creation with proper validation
- **Approval/Rejection**: Tests admin approval and rejection workflows
- **Error Handling**: Validates error scenarios and edge cases
- **WebSocket Integration**: Tests real-time balance update notifications

### WhatsApp Service Tests
- **Message Processing**: Validates WhatsApp message parsing and processing
- **Data Extraction**: Tests amount, payment method, and UTR extraction
- **Retry Logic**: Validates exponential backoff retry mechanisms
- **Database Operations**: Tests mock database interactions

## Test Results Interpretation

### Success Indicators
- ✅ All tests passed
- 🎉 All tests passed successfully!
- No TypeScript compilation errors
- All assertions passed

### Failure Indicators
- ❌ Test failed with specific error message
- ⚠️ Some tests failed
- TypeScript compilation errors
- Assertion failures with detailed messages

## Continuous Integration

The test suite is designed for CI/CD integration:

```yaml
# Example GitHub Actions workflow
- name: Run Tests
  run: npm test

- name: Test Coverage
  run: npm run test:coverage
```

## Troubleshooting

### Common Issues

1. **TypeScript Errors**: Ensure `@types/jest` is installed
2. **Module Resolution**: Check import paths in test files
3. **Async Test Failures**: Verify async/await usage in test functions
4. **Mock Failures**: Check mock implementations match expected interfaces

### Debug Mode

Run tests with debugging enabled:

```bash
# Enable verbose logging
DEBUG=* npm test

# Run specific test file
cd tests && node payment-workflow.test.js
```

## Test Coverage

The test suite covers:
- ✅ Payment request workflows (creation, approval, rejection)
- ✅ Error handling and edge cases
- ✅ WhatsApp message processing
- ✅ Retry logic and failure handling
- ✅ WebSocket integration
- ✅ Database operation mocking
- ✅ Input validation and sanitization

## Maintenance

### Adding New Tests

1. Add test cases to existing test files
2. Follow the existing test structure and naming conventions
3. Include proper error handling and edge cases
4. Update test documentation

### Updating Tests

1. Modify existing test cases as needed
2. Update mock data and expected results
3. Ensure backward compatibility
4. Run all tests after changes

## Performance Testing

For load testing and performance validation:

```bash
# Run concurrent user simulation
npm run test:load

# Monitor test execution time
npm run test:performance
```

## Conclusion

The comprehensive test suite ensures the platform's reliability, security, and functionality. Regular test execution is recommended before deployments and after code changes to maintain system integrity.
