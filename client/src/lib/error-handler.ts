/**
 * Comprehensive Error Handling Utilities
 * 
 * Centralized error handling for the Andar Bahar gaming platform
 * Provides consistent error handling, logging, and user feedback
 */

import { useNotification } from '../contexts/NotificationContext';

export interface ErrorContext {
  component?: string;
  action?: string;
  userId?: string;
  gameId?: string;
  timestamp?: string;
  metadata?: Record<string, any>;
}

export interface EnhancedError extends Error {
  code?: string;
  status?: number;
  context?: ErrorContext;
  retryable?: boolean;
  userMessage?: string;
}

export class ErrorHandler {
  private static instance: ErrorHandler;
  private notification: ReturnType<typeof useNotification> | null = null;
  private errorLog: Array<{ error: EnhancedError; timestamp: Date }> = [];

  static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  setNotification(notification: ReturnType<typeof useNotification>) {
    this.notification = notification;
  }

  /**
   * Handle API errors with appropriate user feedback
   */
  handleApiError(error: any, context: ErrorContext = {}): EnhancedError {
    const enhancedError = this.enhanceError(error, context);
    
    // Log the error
    this.logError(enhancedError);
    
    // Show appropriate user feedback
    this.showUserFeedback(enhancedError);
    
    return enhancedError;
  }

  /**
   * Handle WebSocket errors
   */
  handleWebSocketError(error: any, context: ErrorContext = {}): EnhancedError {
    const enhancedError = this.enhanceError(error, {
      ...context,
      component: 'WebSocket'
    });

    // For WebSocket errors, we often want to show more technical details
    enhancedError.userMessage = this.getWebSocketUserMessage(enhancedError);

    this.logError(enhancedError);
    this.showUserFeedback(enhancedError);

    return enhancedError;
  }

  /**
   * Handle betting errors with specific feedback
   */
  handleBettingError(error: any, context: ErrorContext = {}): EnhancedError {
    const enhancedError = this.enhanceError(error, {
      ...context,
      component: 'Betting'
    });

    // Customize user message for betting errors
    enhancedError.userMessage = this.getBettingUserMessage(enhancedError);

    this.logError(enhancedError);
    this.showUserFeedback(enhancedError);

    return enhancedError;
  }

  /**
   * Handle payment errors with specific feedback
   */
  handlePaymentError(error: any, context: ErrorContext = {}): EnhancedError {
    const enhancedError = this.enhanceError(error, {
      ...context,
      component: 'Payment'
    });

    enhancedError.userMessage = this.getPaymentUserMessage(enhancedError);

    this.logError(enhancedError);
    this.showUserFeedback(enhancedError);

    return enhancedError;
  }

  /**
   * Enhance raw error with additional context and standardization
   */
  private enhanceError(error: any, context: ErrorContext): EnhancedError {
    let enhancedError: EnhancedError;

    if (error instanceof Error) {
      enhancedError = error as EnhancedError;
    } else if (typeof error === 'string') {
      enhancedError = new Error(error) as EnhancedError;
    } else {
      // Handle API response errors
      enhancedError = new Error(error.message || 'Unknown error') as EnhancedError;
      enhancedError.status = error.status;
      enhancedError.code = error.code;
    }

    // Add context
    enhancedError.context = {
      ...context,
      timestamp: new Date().toISOString(),
      userId: context.userId || this.getCurrentUserId(),
      gameId: context.gameId || this.getCurrentGameId()
    };

    // Determine if error is retryable
    enhancedError.retryable = this.isRetryable(enhancedError);

    return enhancedError;
  }

  /**
   * Show user feedback based on error type
   */
  private showUserFeedback(error: EnhancedError): void {
    if (!this.notification) {
      console.warn('Notification system not initialized, showing error in console:', error);
      return;
    }

    const userMessage = error.userMessage || error.message || 'An unexpected error occurred';
    const type = this.getErrorType(error);

    this.notification.showNotification(userMessage, type);
  }

  /**
   * Log error for monitoring and debugging
   */
  private logError(error: EnhancedError): void {
    // Add to local error log
    this.errorLog.push({
      error,
      timestamp: new Date()
    });

    // Send to external logging service (implement based on your needs)
    this.sendToLoggingService(error);

    // Keep only last 100 errors in memory
    if (this.errorLog.length > 100) {
      this.errorLog = this.errorLog.slice(-100);
    }
  }

  /**
   * Send error to external logging service
   */
  private sendToLoggingService(error: EnhancedError): void {
    // Implement your logging service integration here
    // Examples: Sentry, LogRocket, custom logging endpoint, etc.
    
    console.group('🚨 Error Logged');
    console.error('Error:', error.message);
    console.error('Code:', error.code);
    console.error('Status:', error.status);
    console.error('Context:', error.context);
    console.error('Stack:', error.stack);
    console.groupEnd();
  }

  /**
   * Get user-friendly message for WebSocket errors
   */
  private getWebSocketUserMessage(error: EnhancedError): string {
    if (error.status === 401) {
      return 'Authentication expired. Please refresh the page.';
    }
    if (error.status === 403) {
      return 'Access denied. Please check your permissions.';
    }
    if (error.message.includes('ECONNREFUSED') || error.message.includes('ENOTFOUND')) {
      return 'Connection lost. Attempting to reconnect...';
    }
    return 'Connection error. Please check your internet connection.';
  }

  /**
   * Get user-friendly message for betting errors
   */
  private getBettingUserMessage(error: EnhancedError): string {
    if (error.code === 'INSUFFICIENT_BALANCE') {
      return 'Insufficient balance to place this bet.';
    }
    if (error.code === 'BETTING_CLOSED') {
      return 'Betting is currently closed. Please wait for the next round.';
    }
    if (error.code === 'INVALID_BET_AMOUNT') {
      return 'Invalid bet amount. Please enter a valid amount.';
    }
    if (error.code === 'INVALID_BET_SIDE') {
      return 'Invalid bet side. Please choose Andar or Bahar.';
    }
    return 'Failed to place bet. Please try again.';
  }

  /**
   * Get user-friendly message for payment errors
   */
  private getPaymentUserMessage(error: EnhancedError): string {
    if (error.code === 'INVALID_AMOUNT') {
      return 'Invalid amount. Please enter a valid amount.';
    }
    if (error.code === 'PAYMENT_PROCESSING_ERROR') {
      return 'Payment processing failed. Please try again later.';
    }
    if (error.code === 'BALANCE_UPDATE_FAILED') {
      return 'Balance update failed. Please contact support.';
    }
    return 'Payment operation failed. Please try again.';
  }

  /**
   * Determine error type for notification styling
   */
  private getErrorType(error: EnhancedError): 'error' | 'warning' | 'info' {
    if (error.status === 401 || error.status === 403) {
      return 'warning';
    }
    if (error.retryable) {
      return 'warning';
    }
    return 'error';
  }

  /**
   * Determine if error is retryable
   */
  private isRetryable(error: EnhancedError): boolean {
    // Network errors are typically retryable
    if (error.message.includes('ECONNREFUSED') || 
        error.message.includes('ENOTFOUND') ||
        error.message.includes('timeout')) {
      return true;
    }

    // HTTP 5xx errors are typically retryable
    if (error.status && error.status >= 500 && error.status < 600) {
      return true;
    }

    // Authentication errors are not retryable
    if (error.status === 401 || error.status === 403) {
      return false;
    }

    // Validation errors are not retryable
    if (error.code && error.code.includes('INVALID_')) {
      return false;
    }

    return false;
  }

  /**
   * Get current user ID from localStorage or context
   */
  private getCurrentUserId(): string | undefined {
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      return user.id;
    } catch {
      return undefined;
    }
  }

  /**
   * Get current game ID from context or state
   */
  private getCurrentGameId(): string | undefined {
    // This would depend on your game state management
    // For now, return undefined
    return undefined;
  }

  /**
   * Get recent errors for debugging
   */
  getRecentErrors(limit: number = 10): Array<{ error: EnhancedError; timestamp: Date }> {
    return this.errorLog.slice(-limit);
  }

  /**
   * Clear error log
   */
  clearErrorLog(): void {
    this.errorLog = [];
  }
}

// Export singleton instance
export const errorHandler = ErrorHandler.getInstance();

// Export convenience functions
export const handleApiError = (error: any, context?: ErrorContext) => 
  errorHandler.handleApiError(error, context);

export const handleWebSocketError = (error: any, context?: ErrorContext) => 
  errorHandler.handleWebSocketError(error, context);

export const handleBettingError = (error: any, context?: ErrorContext) => 
  errorHandler.handleBettingError(error, context);

export const handlePaymentError = (error: any, context?: ErrorContext) => 
  errorHandler.handlePaymentError(error, context);

// Export error codes for consistent usage
export const ERROR_CODES = {
  // Authentication errors
  INVALID_TOKEN: 'INVALID_TOKEN',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  AUTH_REQUIRED: 'AUTH_REQUIRED',
  
  // Betting errors
  INSUFFICIENT_BALANCE: 'INSUFFICIENT_BALANCE',
  BETTING_CLOSED: 'BETTING_CLOSED',
  INVALID_BET_AMOUNT: 'INVALID_BET_AMOUNT',
  INVALID_BET_SIDE: 'INVALID_BET_SIDE',
  BET_RATE_LIMIT_EXCEEDED: 'BET_RATE_LIMIT_EXCEEDED',
  
  // Payment errors
  INVALID_AMOUNT: 'INVALID_AMOUNT',
  PAYMENT_PROCESSING_ERROR: 'PAYMENT_PROCESSING_ERROR',
  BALANCE_UPDATE_FAILED: 'BALANCE_UPDATE_FAILED',
  PAYMENT_METHOD_NOT_SUPPORTED: 'PAYMENT_METHOD_NOT_SUPPORTED',
  
  // WebSocket errors
  CONNECTION_LOST: 'CONNECTION_LOST',
  AUTHENTICATION_FAILED: 'AUTHENTICATION_FAILED',
  MESSAGE_PROCESSING_ERROR: 'MESSAGE_PROCESSING_ERROR',
  
  // General errors
  NETWORK_ERROR: 'NETWORK_ERROR',
  SERVER_ERROR: 'SERVER_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR'
} as const;