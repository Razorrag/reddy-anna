/**
 * Centralized formatting utilities with null safety
 * Ensures all numeric and date displays handle null/undefined gracefully
 */

/**
 * Format currency with null safety
 * @param amount - Number to format (can be null/undefined)
 * @param currency - Currency symbol (default: ₹)
 * @returns Formatted currency string
 */
export const formatCurrency = (
  amount: number | null | undefined,
  currency: string = '₹'
): string => {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return `${currency}0.00`;
  }
  
  try {
    return currency + amount.toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  } catch (error) {
    console.error('Error formatting currency:', error);
    return `${currency}0.00`;
  }
};

/**
 * Format number with null safety
 * @param num - Number to format (can be null/undefined)
 * @param decimals - Number of decimal places (default: 0)
 * @returns Formatted number string
 */
export const formatNumber = (
  num: number | null | undefined,
  decimals: number = 0
): string => {
  if (num === null || num === undefined || isNaN(num)) {
    return '0';
  }
  
  try {
    return num.toLocaleString('en-IN', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });
  } catch (error) {
    console.error('Error formatting number:', error);
    return '0';
  }
};

/**
 * Format percentage with null safety
 * @param num - Number to format as percentage (can be null/undefined)
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted percentage string
 */
export const formatPercentage = (
  num: number | null | undefined,
  decimals: number = 2
): string => {
  if (num === null || num === undefined || isNaN(num)) {
    return '0.00%';
  }
  
  try {
    return num.toFixed(decimals) + '%';
  } catch (error) {
    console.error('Error formatting percentage:', error);
    return '0.00%';
  }
};

/**
 * Format date with null safety
 * @param date - Date to format (can be string, Date, null, or undefined)
 * @param options - Intl.DateTimeFormatOptions
 * @returns Formatted date string
 */
export const formatDate = (
  date: string | Date | null | undefined,
  options?: Intl.DateTimeFormatOptions
): string => {
  if (!date) {
    return 'N/A';
  }
  
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    if (isNaN(dateObj.getTime())) {
      return 'Invalid Date';
    }
    
    const defaultOptions: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      ...options
    };
    
    return dateObj.toLocaleString('en-IN', defaultOptions);
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'N/A';
  }
};

/**
 * Format date to short format (date only)
 * @param date - Date to format
 * @returns Formatted date string (MMM DD, YYYY)
 */
export const formatDateShort = (
  date: string | Date | null | undefined
): string => {
  return formatDate(date, {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

/**
 * Format timestamp to relative time (e.g., "2 hours ago")
 * @param date - Date to format
 * @returns Relative time string
 */
export const formatRelativeTime = (
  date: string | Date | null | undefined
): string => {
  if (!date) {
    return 'N/A';
  }
  
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    const now = new Date();
    const diffMs = now.getTime() - dateObj.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    
    return formatDateShort(dateObj);
  } catch (error) {
    console.error('Error formatting relative time:', error);
    return 'N/A';
  }
};

/**
 * Safe number formatter for counts/integers
 * @param count - Number to format
 * @returns Formatted count string
 */
export const formatCount = (count: number | null | undefined): string => {
  return formatNumber(count, 0);
};

/**
 * Format large numbers with K/M/B suffixes
 * @param num - Number to format
 * @returns Formatted number with suffix
 */
export const formatCompactNumber = (num: number | null | undefined): string => {
  if (num === null || num === undefined || isNaN(num)) {
    return '0';
  }
  
  try {
    if (num >= 1_000_000_000) {
      return (num / 1_000_000_000).toFixed(1) + 'B';
    }
    if (num >= 1_000_000) {
      return (num / 1_000_000).toFixed(1) + 'M';
    }
    if (num >= 1_000) {
      return (num / 1_000).toFixed(1) + 'K';
    }
    return num.toString();
  } catch (error) {
    console.error('Error formatting compact number:', error);
    return '0';
  }
};
