# Error Handling Guide

This document outlines the comprehensive error handling patterns and best practices implemented in the Andar Bahar gaming platform.

## Table of Contents

1. [Overview](#overview)
2. [Error Types](#error-types)
3. [Frontend Error Handling](#frontend-error-handling)
4. [Backend Error Handling](#backend-error-handling)
5. [WebSocket Error Handling](#websocket-error-handling)
6. [Payment Error Handling](#payment-error-handling)
7. [Betting Error Handling](#betting-error-handling)
8. [WhatsApp Service Error Handling](#whatsapp-service-error-handling)
9. [Testing Error Scenarios](#testing-error-scenarios)
10. [Monitoring and Logging](#monitoring-and-logging)

## Overview

The Andar Bahar platform implements a comprehensive error handling strategy that ensures:

- **User Experience**: Clear, actionable error messages for users
- **Reliability**: Automatic retry logic for transient failures
- **Monitoring**: Comprehensive logging and error tracking
- **Recovery**: Graceful degradation and fallback mechanisms

## Error Types

### 1. Authentication Errors
- `INVALID_TOKEN`: Token is malformed or invalid
- `TOKEN_EXPIRED`: Token has expired and needs refresh
- `AUTH_REQUIRED`: User not authenticated, requires login

### 2. Betting Errors
- `INSUFFICIENT_BALANCE`: User doesn't have enough funds
- `BETTING_CLOSED`: Betting phase is not active
- `INVALID_BET_AMOUNT`: Bet amount is outside allowed range
- `INVALID_BET_SIDE`: Invalid bet side (not Andar/Bahar)
- `BET_RATE_LIMIT_EXCEEDED`: User has exceeded bet rate limits

### 3. Payment Errors
- `INVALID_AMOUNT`: Payment amount is invalid
- `PAYMENT_PROCESSING_ERROR`: Payment gateway failure
- `BALANCE_UPDATE_FAILED`: Balance update operation failed
- `PAYMENT_METHOD_NOT_SUPPORTED`: Payment method not supported

### 4. WebSocket Errors
- `CONNECTION_LOST`: WebSocket connection dropped
- `AUTHENTICATION_FAILED`: WebSocket auth failed
- `MESSAGE_PROCESSING_ERROR`: Error processing WebSocket message

### 5. General Errors
- `NETWORK_ERROR`: Network connectivity issues
- `SERVER_ERROR`: Server-side errors (5xx)
- `VALIDATION_ERROR`: Input validation failed
- `UNKNOWN_ERROR`: Unexpected errors

## Frontend Error Handling

### Error Boundary Component

```tsx
// Usage in React components
<ErrorBoundary level="page" onError={(error, errorInfo) => {
  // Custom error handling
}}>
  <YourComponent />
</ErrorBoundary>
```

### Centralized Error Handler

```typescript
import { errorHandler, ERROR_CODES } from './lib/error-handler';

// Handle API errors
try {
  await apiClient.post('/api/payment-requests', paymentData);
} catch (error) {
  errorHandler.handleApiError(error, {
    component: 'PaymentModal',
    action: 'submit_payment_request'
  });
}

// Handle betting errors
try {
  await placeBet(betData);
} catch (error) {
  errorHandler.handleBettingError(error, {
    component: 'BettingInterface',
    gameId: currentGameId
  });
}
```

### User Feedback Patterns

```typescript
// Success feedback
errorHandler.showNotification('Payment request submitted successfully!', 'success');

// Error feedback
errorHandler.showNotification('Insufficient balance to place bet.', 'error');

// Warning feedback
errorHandler.showNotification('Connection unstable, attempting to reconnect...', 'warning');
```

## Backend Error Handling

### API Route Error Handling

```typescript
// Example from server/routes.ts
app.post("/api/payment-requests", paymentLimiter, async (req, res) => {
  try {
    // Validate input
    if (!req.body.amount || req.body.amount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_AMOUNT',
        message: 'Amount must be greater than 0'
      });
    }

    // Process request
    const result = await processPaymentRequest(req.body);
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Payment request error:', error);
    res.status(500).json({
      success: false,
      error: 'PAYMENT_PROCESSING_ERROR',
      message: 'Failed to process payment request'
    });
  }
});
```

### Database Operation Error Handling

```typescript
// Atomic operations with error handling
try {
  const result = await supabase.rpc('place_bet', {
    user_id: userId,
    game_id: gameId,
    amount: betAmount,
    side: betSide
  });

  if (result.error) {
    throw new Error(`Database operation failed: ${result.error.message}`);
  }

  return result.data;
} catch (error) {
  if (error.message.includes('insufficient_balance')) {
    throw new InsufficientBalanceError('User has insufficient balance');
  }
  throw error;
}
```

## WebSocket Error Handling

### Connection Management

```typescript
// WebSocket authentication and error handling
wss.on('connection', (ws) => {
  ws.on('message', async (data) => {
    try {
      const message = JSON.parse(data.toString());
      
      switch (message.type) {
        case 'bet_placed':
          await handleBetPlacement(message, ws);
          break;
        // ... other message types
      }
    } catch (error) {
      console.error('WebSocket message error:', error);
      
      ws.send(JSON.stringify({
        type: 'error',
        data: { message: 'Failed to process message' }
      }));
    }
  });

  ws.on('close', () => {
    console.log('WebSocket connection closed');
    // Clean up client from tracking
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
    ws.close();
  });
});
```

### Reconnection Logic

```typescript
// Client-side reconnection
class WebSocketManager {
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  private handleConnectionLost() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      setTimeout(() => {
        this.reconnectAttempts++;
        this.connect();
      }, this.reconnectDelay * this.reconnectAttempts);
    }
  }
}
```

## Payment Error Handling

### Payment Request Flow

```typescript
// Enhanced payment request with retry logic
export const processPaymentRequest = async (requestData) => {
  let attempts = 0;
  const maxAttempts = 3;

  while (attempts < maxAttempts) {
    try {
      // 1. Validate request
      validatePaymentRequest(requestData);

      // 2. Create database record
      const request = await createPaymentRequest(requestData);

      // 3. Send WhatsApp notification
      await sendWhatsAppNotification(request);

      return { success: true, request };
    } catch (error) {
      attempts++;
      
      if (attempts >= maxAttempts) {
        // Log final failure
        await logPaymentFailure(requestData, error);
        throw new PaymentProcessingError('Payment request failed after retries');
      }

      // Wait before retry with exponential backoff
      await delay(Math.pow(2, attempts) * 1000);
    }
  }
};
```

### Balance Update Error Handling

```typescript
// Atomic balance updates
export const updateBalance = async (userId, amount, reason) => {
  try {
    const result = await supabase.rpc('update_user_balance', {
      user_id: userId,
      amount: amount,
      reason: reason
    });

    if (result.error) {
      throw new BalanceUpdateError(result.error.message);
    }

    return result.data;
  } catch (error) {
    // Log balance update failure
    await logBalanceUpdateFailure(userId, amount, error);
    throw error;
  }
};
```

## Betting Error Handling

### Bet Placement Validation

```typescript
export const validateBetPlacement = (betData, gameState, userBalance) => {
  const errors = [];

  // Check if betting is allowed
  if (gameState.phase !== 'betting') {
    errors.push({
      code: 'BETTING_CLOSED',
      message: 'Betting is currently closed'
    });
  }

  // Check balance
  if (betData.amount > userBalance) {
    errors.push({
      code: 'INSUFFICIENT_BALANCE',
      message: 'Insufficient balance to place this bet'
    });
  }

  // Check amount limits
  const minBet = parseInt(process.env.MIN_BET || '1000');
  const maxBet = parseInt(process.env.MAX_BET || '100000');
  
  if (betData.amount < minBet || betData.amount > maxBet) {
    errors.push({
      code: 'INVALID_BET_AMOUNT',
      message: `Bet amount must be between ₹${minBet} and ₹${maxBet}`
    });
  }

  // Check bet side
  if (!['andar', 'bahar'].includes(betData.side)) {
    errors.push({
      code: 'INVALID_BET_SIDE',
      message: 'Invalid bet side. Must be Andar or Bahar.'
    });
  }

  return errors;
};
```

### Rate Limiting

```typescript
// Bet rate limiting
const userBetRateLimits = new Map();

export const checkBetRateLimit = (userId) => {
  const now = Date.now();
  const userLimit = userBetRateLimits.get(userId);

  const maxBetsPerMinute = parseInt(process.env.MAX_BETS_PER_MINUTE || '30');
  const rateLimitWindow = parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000');

  if (userLimit && now < userLimit.resetTime) {
    if (userLimit.count >= maxBetsPerMinute) {
      return {
        allowed: false,
        error: {
          code: 'BET_RATE_LIMIT_EXCEEDED',
          message: `Too many bets. Please slow down (max ${maxBetsPerMinute} bets per minute).`
        }
      };
    }
    userLimit.count++;
  } else {
    userBetRateLimits.set(userId, {
      count: 1,
      resetTime: now + rateLimitWindow
    });
  }

  return { allowed: true };
};
```

## WhatsApp Service Error Handling

### Retry Logic

```typescript
class EnhancedWhatsAppService {
  private retryConfig = {
    maxAttempts: 3,
    baseDelay: 30, // seconds
    maxDelay: 300, // 5 minutes
    backoffMultiplier: 2
  };

  private calculateRetryDelay(attempt: number): number {
    const delay = Math.min(
      this.retryConfig.baseDelay * Math.pow(this.retryConfig.backoffMultiplier, attempt - 1),
      this.retryConfig.maxDelay
    );
    
    // Add jitter to prevent thundering herd
    return delay + Math.random() * 10;
  }

  public async processWhatsAppMessage(message: WhatsAppMessage): Promise<AdminRequest | null> {
    let attempt = 0;
    let lastError: Error | null = null;

    while (attempt <= this.retryConfig.maxAttempts) {
      try {
        return await this.processMessageInternal(message);
      } catch (error) {
        attempt++;
        lastError = error;
        
        if (attempt <= this.retryConfig.maxAttempts) {
          const delay = this.calculateRetryDelay(attempt);
          await this.delay(delay * 1000);
        }
      }
    }

    // Log final failure
    await this.logFailedWhatsAppMessage(message, lastError);
    return null;
  }
}
```

### Message Processing Validation

```typescript
private extractRequestInfo(message: string, phone: string): RequestInfo | null {
  const text = message.toLowerCase().trim();
  
  // Extract amount with multiple patterns
  const amount = this.extractAmount(text);
  if (!amount) {
    return null; // No valid amount found
  }

  // Validate phone number
  if (!this.isValidPhoneNumber(phone)) {
    return null;
  }

  return {
    type: this.determineRequestType(text),
    amount,
    paymentMethod: this.extractPaymentMethod(text),
    utrNumber: this.extractUTRNumber(text),
    priority: this.calculatePriority(amount)
  };
}
```

## Testing Error Scenarios

### Test Categories

1. **Authentication Failures**
   - Expired tokens
   - Invalid credentials
   - Missing authentication

2. **Network Issues**
   - Connection timeouts
   - WebSocket disconnections
   - API request failures

3. **Business Logic Errors**
   - Insufficient balance
   - Invalid bet amounts
   - Closed betting phases

4. **Payment Processing**
   - Failed payment requests
   - Balance update failures
   - WhatsApp notification failures

### Test Patterns

```typescript
// Example test for payment workflow
describe('Payment Error Handling', () => {
  it('should handle insufficient balance error', async () => {
    // Mock user with low balance
    mockUser.balance = 1000;
    
    // Attempt to place bet larger than balance
    const result = await placeBet({
      amount: 5000,
      side: 'andar'
    });

    expect(result.success).toBe(false);
    expect(result.error.code).toBe('INSUFFICIENT_BALANCE');
  });

  it('should retry failed WhatsApp notifications', async () => {
    // Mock WhatsApp service failure
    mockWhatsAppService.failNextCall();
    
    const result = await processPaymentRequest(validRequest);
    
    expect(result.success).toBe(true); // Should succeed after retry
    expect(mockWhatsAppService.callCount).toBe(2); // Initial + retry
  });
});
```

## Monitoring and Logging

### Error Logging Structure

```typescript
interface ErrorLog {
  id: string;
  timestamp: string;
  level: 'error' | 'warning' | 'info';
  message: string;
  code?: string;
  context: {
    component?: string;
    action?: string;
    userId?: string;
    gameId?: string;
    userAgent?: string;
    url?: string;
  };
  stack?: string;
  metadata?: Record<string, any>;
}
```

### Monitoring Integration

```typescript
// Send errors to monitoring service
export const sendToMonitoring = (error: ErrorLog) => {
  // Example: Send to Sentry, LogRocket, or custom service
  if (process.env.NODE_ENV === 'production') {
    // Send to external monitoring service
    monitoringService.captureError(error);
  }
  
  // Always log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.group('🚨 Error Logged');
    console.error('Message:', error.message);
    console.error('Context:', error.context);
    console.error('Stack:', error.stack);
    console.groupEnd();
  }
};
```

### Error Metrics

Track these key metrics:

- **Error Rate**: Percentage of requests that result in errors
- **Retry Success Rate**: Percentage of retries that succeed
- **Mean Time to Recovery**: Average time to recover from errors
- **User Impact**: Number of users affected by errors

### Alerting

Set up alerts for:

- Error rate > 5% over 5 minutes
- Payment failure rate > 10%
- WebSocket disconnection rate > 20%
- Database connection failures

## Best Practices

### 1. User-Friendly Messages
- Always provide actionable error messages
- Avoid technical jargon in user-facing errors
- Include suggestions for resolution when possible

### 2. Graceful Degradation
- Provide fallback functionality when possible
- Maintain core functionality during partial failures
- Cache data for offline scenarios

### 3. Error Prevention
- Validate input early and often
- Use rate limiting to prevent abuse
- Implement circuit breakers for external services

### 4. Monitoring
- Log all errors with consistent structure
- Monitor error patterns and trends
- Set up proactive alerting

### 5. Testing
- Test error scenarios thoroughly
- Simulate network failures
- Test retry logic and timeouts

## Conclusion

This error handling guide provides a comprehensive framework for managing errors in the Andar Bahar platform. By following these patterns, we ensure a reliable, user-friendly experience even when things go wrong.

Remember: **The goal is not to prevent all errors, but to handle them gracefully and keep users informed and in control.**