// Balance utility functions for type consistency
// Use this across the entire application to handle balance parsing

/**
 * Parse balance from string or number to number
 * @param balance - Balance value as string or number
 * @returns Balance as number
 */
export const parseBalance = (balance: string | number): number => {
  if (typeof balance === 'number') {
    return balance;
  }
  if (typeof balance === 'string') {
    const parsed = parseFloat(balance);
    return isNaN(parsed) ? 0 : parsed;
  }
  return 0;
};

/**
 * Format balance for display
 * @param balance - Balance value as number
 * @param options - Formatting options
 * @returns Formatted balance string
 */
export const formatBalance = (
  balance: number,
  options: { decimals?: number; showCurrency?: boolean } = {}
): string => {
  const { decimals = 2, showCurrency = false } = options;
  const formatted = balance.toFixed(decimals);
  return showCurrency ? `₹${formatted}` : formatted;
};

/**
 * Validate if balance is sufficient for a bet
 * @param balance - Current balance
 * @param betAmount - Amount to bet
 * @returns Object with validation result
 */
export const validateBalance = (balance: string | number, betAmount: number): {
  isValid: boolean;
  remainingBalance: number;
  error?: string;
} => {
  const numericBalance = parseBalance(balance);
  
  if (numericBalance < betAmount) {
    return {
      isValid: false,
      remainingBalance: numericBalance,
      error: 'Insufficient balance'
    };
  }
  
  return {
    isValid: true,
    remainingBalance: numericBalance - betAmount
  };
};

/**
 * Calculate new balance after a transaction
 * @param currentBalance - Current balance
 * @param amountChange - Amount to add/subtract
 * @returns New balance
 */
export const calculateNewBalance = (currentBalance: string | number, amountChange: number): number => {
  const numericBalance = parseBalance(currentBalance);
  return numericBalance + amountChange;
};