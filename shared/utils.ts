/**
 * Shared Utility Functions
 * Used by both client and server for consistent behavior
 */

/**
 * Parse balance value to number, handling various input types
 * @param balance - Balance value (can be string, number, or undefined)
 * @param defaultValue - Default value if parsing fails (default: 0)
 * @returns Parsed balance as number
 */
export function parseBalance(balance: string | number | undefined | null, defaultValue: number = 0): number {
  if (balance === undefined || balance === null) {
    return defaultValue;
  }

  if (typeof balance === 'number') {
    return isNaN(balance) ? defaultValue : balance;
  }

  if (typeof balance === 'string') {
    const parsed = parseFloat(balance);
    return isNaN(parsed) ? defaultValue : parsed;
  }

  return defaultValue;
}

/**
 * Format balance for display with proper currency formatting
 * @param balance - Balance value
 * @param currency - Currency symbol (default: '₹')
 * @returns Formatted balance string
 */
export function formatBalance(balance: string | number | undefined | null, currency: string = '₹'): string {
  const numBalance = parseBalance(balance);
  return `${currency}${numBalance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Validate if balance is sufficient for a transaction
 * @param currentBalance - Current balance
 * @param requiredAmount - Required amount
 * @returns true if balance is sufficient
 */
export function hasInsufficientBalance(currentBalance: string | number | undefined | null, requiredAmount: number): boolean {
  const balance = parseBalance(currentBalance);
  return balance < requiredAmount;
}

/**
 * Calculate new balance after a transaction
 * @param currentBalance - Current balance
 * @param amount - Transaction amount (positive for credit, negative for debit)
 * @returns New balance (never negative)
 */
export function calculateNewBalance(currentBalance: string | number | undefined | null, amount: number): number {
  const balance = parseBalance(currentBalance);
  const newBalance = balance + amount;
  return Math.max(0, newBalance); // Never return negative balance
}

/**
 * Validate balance value
 * @param balance - Balance to validate
 * @returns true if valid balance
 */
export function isValidBalance(balance: any): boolean {
  const parsed = parseBalance(balance, NaN);
  return !isNaN(parsed) && parsed >= 0 && isFinite(parsed);
}
