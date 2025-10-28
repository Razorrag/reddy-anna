import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import type { Card } from "../components/GameLogic/GameLogic";

// Consolidated class name utility
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Card utilities
export const getCardColorClass = (suit: string) => {
  return ['♥', '♦'].includes(suit) ? 'text-red-600' : 'text-black';
};

export const getCardValue = (card: Card): number => {
  const valueMap: { [key: string]: number } = {
    'A': 1,
    '2': 2,
    '3': 3,
    '4': 4,
    '5': 5,
    '6': 6,
    '7': 7,
    '8': 8,
    '9': 9,
    '10': 10,
    'J': 11,
    'Q': 12,
    'K': 13
  };
  
  return valueMap[card.value] || 0;
};

export const isWinningCard = (card: Card, openingCard: Card): boolean => {
  return getCardValue(card) === getCardValue(openingCard);
};

// Validation utilities
export const validateMobileNumber = (mobile: string): boolean => {
  const mobileRegex = /^[6-9]\d{9}$/;
  return mobileRegex.test(mobile);
};

export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Date utilities
export const formatDateTime = (date: Date | string): string => {
  return new Date(date).toLocaleString('en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

export const formatDate = (date: Date | string): string => {
  return new Date(date).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};

// Number utilities
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(amount);
};

export const formatCurrencyShort = (amount: number): string => {
  if (amount >= 10000000) {
    return '₹' + (amount / 10000000).toFixed(2) + 'Cr';
  } else if (amount >= 100000) {
    return '₹' + (amount / 100000).toFixed(2) + 'L';
  } else if (amount >= 1000) {
    return '₹' + (amount / 1000).toFixed(0) + 'k';
  }
  return '₹' + amount.toLocaleString('en-IN');
};

export const formatNumber = (num: number): string => {
  return new Intl.NumberFormat('en-IN').format(num);
};

// Array utilities
export const shuffleArray = <T>(array: T[]): T[] => {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
};

// Object utilities
export const deepMerge = (target: any, source: any): any => {
  const result = { ...target };
  for (const key in source) {
    if (source.hasOwnProperty(key)) {
      if (typeof source[key] === 'object' && source[key] !== null && !Array.isArray(source[key])) {
        result[key] = deepMerge(result[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }
  }
  return result;
};

// Error handling utilities
export const handleComponentError = (error: unknown, context: string) => {
  console.error(`Error in ${context}:`, error);
  
  // Log to error tracking service if available
  if (typeof window !== 'undefined') {
    // Example: Sentry.captureException(error, { contexts: { component: context } });
  }
};

// WebSocket message validation
export const isValidWebSocketMessage = (message: any): message is any => {
  return message && typeof message === 'object' && typeof message.type === 'string';
};

// Game utilities
export const canPlaceBet = (
  betAmount: number,
  currentBalance: number,
  minBet: number,
  maxBet: number
): { canBet: boolean; reason?: string } => {
  if (betAmount < minBet) {
    return { canBet: false, reason: `Minimum bet is ₹${minBet}` };
  }
  
  if (betAmount > maxBet) {
    return { canBet: false, reason: `Maximum bet is ₹${maxBet}` };
  }
  
  if (betAmount > currentBalance) {
    return { canBet: false, reason: 'Insufficient balance' };
  }
  
  return { canBet: true };
};

// Local storage utilities
export const storage = {
  get: <T>(key: string, defaultValue?: T): T | null => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue || null;
    } catch {
      return defaultValue || null;
    }
  },
  
  set: <T>(key: string, value: T): void => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error('Failed to save to localStorage:', error);
    }
  },
  
  remove: (key: string): void => {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error('Failed to remove from localStorage:', error);
    }
  },
  
  clear: (): void => {
    try {
      localStorage.clear();
    } catch (error) {
      console.error('Failed to clear localStorage:', error);
    }
  }
};

// Debounce utility
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

// Throttle utility
export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};

// Generate random ID
export const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

// Check if device is mobile
export const isMobile = (): boolean => {
  return typeof window !== 'undefined' && window.innerWidth < 768;
};

// Copy to clipboard
export const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    } else {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const result = document.execCommand('copy');
      textArea.remove();
      return result;
    }
  } catch {
    return false;
  }
};

/**
 * Centralized logout function to properly clear all authentication data
 * and redirect to appropriate login page
 */
export const logout = async (redirectTo?: 'user' | 'admin' | string) => {
  // Clear all possible authentication-related localStorage items
  const authKeys = [
    'user',
    'token',
    'isLoggedIn',
    'userRole',
    'admin',
    'isAdminLoggedIn',
    'adminRole'
  ];
  
  authKeys.forEach(key => {
    localStorage.removeItem(key);
  });
  
  // Determine redirect path
  let redirectPath = '/';
  
  if (redirectTo === 'user') {
    redirectPath = '/login';
  } else if (redirectTo === 'admin') {
    redirectPath = '/admin-login';
  } else if (typeof redirectTo === 'string') {
    redirectPath = redirectTo;
  }
  
  // Make logout API call (best effort - don't wait for response)
  try {
    const apiResponse = await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    // We don't need to wait for the response, just fire and forget
    console.log('Logout API call sent');
  } catch (error) {
    console.log('Logout API call failed (expected if already logged out)', error);
  }
  
  // Redirect after a brief delay to ensure cleanup
  setTimeout(() => {
    window.location.href = redirectPath;
  }, 100);
};
