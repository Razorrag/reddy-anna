/**
 * Circuit Breaker Pattern for Database Operations
 * Prevents cascading failures when database is down
 */

export enum CircuitState {
  CLOSED = 'CLOSED',      // Normal operation
  OPEN = 'OPEN',          // Failing, rejecting requests
  HALF_OPEN = 'HALF_OPEN' // Testing if service recovered
}

export interface CircuitBreakerOptions {
  failureThreshold: number;    // Number of failures before opening
  resetTimeout: number;        // Time (ms) before attempting recovery
  monitoringPeriod: number;    // Time window for failure counting
  halfOpenMaxAttempts: number; // Max attempts in half-open state
}

const DEFAULT_OPTIONS: CircuitBreakerOptions = {
  failureThreshold: 5,
  resetTimeout: 30000,  // 30 seconds
  monitoringPeriod: 60000, // 60 seconds
  halfOpenMaxAttempts: 3
};

export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount: number = 0;
  private lastFailureTime: number = 0;
  private nextAttemptTime: number = 0;
  private halfOpenAttempts: number = 0;
  private failures: Array<{ timestamp: number }> = [];
  private options: CircuitBreakerOptions;

  constructor(options: Partial<CircuitBreakerOptions> = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * Execute a function with circuit breaker protection
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    // Check circuit state
    this.updateState();

    // Reject if circuit is open
    if (this.state === CircuitState.OPEN) {
      throw new Error('Circuit breaker is OPEN - database operations temporarily unavailable');
    }

    // Limit attempts in half-open state
    if (this.state === CircuitState.HALF_OPEN && this.halfOpenAttempts >= this.options.halfOpenMaxAttempts) {
      this.state = CircuitState.OPEN;
      this.nextAttemptTime = Date.now() + this.options.resetTimeout;
      throw new Error('Circuit breaker is OPEN - too many failed attempts in half-open state');
    }

    try {
      // Execute the function
      const result = await fn();
      
      // Success - reset on success
      this.onSuccess();
      return result;
    } catch (error: any) {
      // Failure - record and handle
      this.onFailure();
      throw error;
    }
  }

  /**
   * Update circuit state based on time and failure count
   */
  private updateState(): void {
    const now = Date.now();

    // Clean up old failures outside monitoring period
    this.failures = this.failures.filter(
      f => now - f.timestamp < this.options.monitoringPeriod
    );

    // Count failures in current window
    this.failureCount = this.failures.length;

    // Transition from OPEN to HALF_OPEN after timeout
    if (this.state === CircuitState.OPEN && now >= this.nextAttemptTime) {
      this.state = CircuitState.HALF_OPEN;
      this.halfOpenAttempts = 0;
      console.log('🟡 Circuit breaker: Transitioning to HALF_OPEN - testing recovery');
    }

    // Transition from CLOSED to OPEN if threshold exceeded
    if (this.state === CircuitState.CLOSED && this.failureCount >= this.options.failureThreshold) {
      this.state = CircuitState.OPEN;
      this.nextAttemptTime = now + this.options.resetTimeout;
      console.error('🔴 Circuit breaker: Opening circuit - too many failures');
    }
  }

  /**
   * Handle successful operation
   */
  private onSuccess(): void {
    if (this.state === CircuitState.HALF_OPEN) {
      // Success in half-open - close circuit
      this.state = CircuitState.CLOSED;
      this.failureCount = 0;
      this.failures = [];
      this.halfOpenAttempts = 0;
      console.log('🟢 Circuit breaker: Closing circuit - service recovered');
    } else if (this.state === CircuitState.CLOSED) {
      // Reset failure count on success (gradual recovery)
      if (this.failureCount > 0) {
        this.failureCount = Math.max(0, this.failureCount - 1);
      }
    }
  }

  /**
   * Handle failed operation
   */
  private onFailure(): void {
    const now = Date.now();
    this.lastFailureTime = now;
    this.failures.push({ timestamp: now });

    // Increment half-open attempts
    if (this.state === CircuitState.HALF_OPEN) {
      this.halfOpenAttempts++;
    }

    // Clean up old failures
    this.failures = this.failures.filter(
      f => now - f.timestamp < this.options.monitoringPeriod
    );

    this.failureCount = this.failures.length;
  }

  /**
   * Get current circuit state
   */
  getState(): CircuitState {
    this.updateState();
    return this.state;
  }

  /**
   * Manually reset circuit breaker
   */
  reset(): void {
    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    this.failures = [];
    this.halfOpenAttempts = 0;
    this.nextAttemptTime = 0;
    console.log('🔄 Circuit breaker: Manually reset');
  }

  /**
   * Get circuit breaker statistics
   */
  getStats(): {
    state: CircuitState;
    failureCount: number;
    nextAttemptTime: number | null;
    halfOpenAttempts: number;
  } {
    this.updateState();
    return {
      state: this.state,
      failureCount: this.failureCount,
      nextAttemptTime: this.state === CircuitState.OPEN ? this.nextAttemptTime : null,
      halfOpenAttempts: this.halfOpenAttempts
    };
  }
}

// Global circuit breaker instance for database operations
export const dbCircuitBreaker = new CircuitBreaker({
  failureThreshold: 5,
  resetTimeout: 30000,  // 30 seconds
  monitoringPeriod: 60000, // 60 seconds
  halfOpenMaxAttempts: 3
});

