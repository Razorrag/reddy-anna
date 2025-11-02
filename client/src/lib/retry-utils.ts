/**
 * Retry utility with exponential backoff
 */

export interface RetryOptions {
  maxRetries?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffMultiplier?: number;
  retryableErrors?: (error: any) => boolean;
}

const DEFAULT_OPTIONS: Required<Omit<RetryOptions, 'retryableErrors'>> & { retryableErrors?: (error: any) => boolean } = {
  maxRetries: 3,
  initialDelay: 100,
  maxDelay: 2000,
  backoffMultiplier: 2
};

/**
 * Retry a function with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = {
    ...DEFAULT_OPTIONS,
    ...options,
    retryableErrors: options.retryableErrors || ((error: any) => {
      // Default: retry on network errors and timeouts
      return error.message?.includes('fetch failed') ||
             error.message?.includes('timeout') ||
             error.message?.includes('network') ||
             error.message?.includes('ECONNREFUSED') ||
             error.message?.includes('ETIMEDOUT') ||
             error.name === 'AbortError' ||
             error.code === 'ECONNREFUSED' ||
             error.code === 'ETIMEDOUT';
    })
  };

  let lastError: any;
  let delay = opts.initialDelay;

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;

      // If it's the last attempt or not a retryable error, throw immediately
      if (attempt === opts.maxRetries || !opts.retryableErrors(error)) {
        throw error;
      }

      // Wait before retrying with exponential backoff
      await new Promise(resolve => setTimeout(resolve, delay));
      
      // Calculate next delay with exponential backoff
      delay = Math.min(delay * opts.backoffMultiplier, opts.maxDelay);
    }
  }

  throw lastError || new Error('Retry failed');
}

