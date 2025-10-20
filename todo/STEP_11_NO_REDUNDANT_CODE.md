# Step 11: Ensure No Redundant Code is Introduced

## Goal
Ensure that all code additions are purposeful and avoid introducing any redundant or duplicate functionality.

## Current State
- Multiple components and systems have been implemented
- Various utility functions and context providers created
- Need to review existing code to identify and eliminate redundancy
- Some functionality might be duplicated across different modules

## Target State
- Clean, efficient codebase without redundant functionality
- Proper code reusability with shared utilities and components
- Clear separation of concerns between different modules
- Well-organized code structure with logical grouping
- Elimination of duplicate functions and logic

## Files to Review and Optimize
- All created components for potential duplication
- Utility functions in various modules
- Context providers for overlap
- API endpoints for redundancy
- Game logic functions for duplication

## Detailed Changes

### 1. Review and Consolidate Utility Functions

#### Create a centralized utility file to prevent duplication:

```ts
// src/lib/utils.ts
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

// Consolidated class name utility
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Card utilities
export const getCardColorClass = (suit: string) => {
  return ['♥', '♦'].includes(suit) ? 'text-red-600' : 'text-black';
};

export const getCardValue = (card: any): number => {
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

export const isWinningCard = (card: any, openingCard: any): boolean => {
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
```

### 2. Review and Consolidate Context Providers

#### Create a unified application context to prevent multiple context providers:

```tsx
// src/contexts/AppContext.tsx
import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { GameState, PlayerBets, initializeGameState } from '../components/GameLogic/GameLogic';
import { validateToken, verifyToken } from '../../server/auth'; // This would be API call

// Define context state type
interface AppState {
  user: any | null;
  gameState: GameState;
  playerBets: PlayerBets;
  notifications: Array<{ id: string; message: string; type: 'success' | 'error' | 'warning' | 'info'; timestamp: number }>;
  selectedChip: number | null;
  chipAmounts: number[];
  isAuthenticated: boolean;
  authChecked: boolean;
}

// Define action types
type AppAction =
  | { type: 'SET_USER'; payload: any }
  | { type: 'SET_GAME_STATE'; payload: Partial<GameState> }
  | { type: 'ADD_NOTIFICATION'; payload: { message: string; type: 'success' | 'error' | 'warning' | 'info' } }
  | { type: 'REMOVE_NOTIFICATION'; payload: string }
  | { type: 'PLACE_BET'; side: 'andar' | 'bahar'; amount: number }
  | { type: 'SET_SELECTED_CHIP'; payload: number }
  | { type: 'SET_AUTH_STATUS'; payload: { isAuthenticated: boolean; authChecked: boolean } }
  | { type: 'RESET_APP' };

// Initialize state
const initialState: AppState = {
  user: null,
  gameState: initializeGameState(),
  playerBets: {
    round1: { andar: 0, bahar: 0 },
    round2: { andar: 0, bahar: 0 },
    currentBet: 0
  },
  notifications: [],
  selectedChip: null,
  chipAmounts: [100, 500, 1000, 5000, 10000, 25000, 50000, 100000],
  isAuthenticated: false,
  authChecked: false
};

// Reducer function
const appReducer = (state: AppState, action: AppAction): AppState => {
  switch (action.type) {
    case 'SET_USER':
      return { ...state, user: action.payload };
      
    case 'SET_GAME_STATE':
      return { ...state, gameState: { ...state.gameState, ...action.payload } };
      
    case 'ADD_NOTIFICATION': {
      const newNotification = {
        id: Date.now().toString(),
        message: action.payload.message,
        type: action.payload.type,
        timestamp: Date.now()
      };
      
      return {
        ...state,
        notifications: [...state.notifications, newNotification]
      };
    }
    
    case 'REMOVE_NOTIFICATION':
      return {
        ...state,
        notifications: state.notifications.filter(notification => notification.id !== action.payload)
      };
      
    case 'PLACE_BET': {
      const { side, amount } = action;
      const round = state.gameState.currentRound;
      
      const updatedBets = { ...state.playerBets };
      
      if (round === 1) {
        updatedBets.round1 = {
          ...updatedBets.round1,
          [side]: updatedBets.round1[side] + amount
        };
      } else if (round === 2) {
        updatedBets.round2 = {
          ...updatedBets.round2,
          [side]: updatedBets.round2[side] + amount
        };
      }
      
      updatedBets.currentBet = amount;
      
      return {
        ...state,
        playerBets: updatedBets
      };
    }
    
    case 'SET_SELECTED_CHIP':
      return { ...state, selectedChip: action.payload };
      
    case 'SET_AUTH_STATUS':
      return { 
        ...state, 
        isAuthenticated: action.payload.isAuthenticated,
        authChecked: action.payload.authChecked
      };
      
    case 'RESET_APP':
      return {
        ...initialState,
        chipAmounts: state.chipAmounts, // Keep chip amounts
        authChecked: false // Need to recheck auth status
      };
      
    default:
      return state;
  }
};

// Create context
const AppContext = createContext<{
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
  addNotification: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void;
  placeBet: (side: 'andar' | 'bahar', amount: number) => void;
  setSelectedChip: (amount: number) => void;
} | undefined>(undefined);

// App provider component
export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, initialState);
  
  // Check authentication status on app load
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          // This would be an API call to verify token
          // const userData = await verifyTokenAPI(token);
          // dispatch({ type: 'SET_USER', payload: userData });
          dispatch({ type: 'SET_AUTH_STATUS', payload: { isAuthenticated: true, authChecked: true } });
        } catch (error) {
          dispatch({ type: 'SET_AUTH_STATUS', payload: { isAuthenticated: false, authChecked: true } });
          localStorage.removeItem('token');
        }
      } else {
        dispatch({ type: 'SET_AUTH_STATUS', payload: { isAuthenticated: false, authChecked: true } });
      }
    };
    
    checkAuth();
  }, []);
  
  // Auto-remove notifications after 5 seconds
  useEffect(() => {
    const timers: NodeJS.Timeout[] = [];
    
    state.notifications.forEach(notification => {
      const timer = setTimeout(() => {
        dispatch({ type: 'REMOVE_NOTIFICATION', payload: notification.id });
      }, 5000);
      
      timers.push(timer);
    });
    
    return () => timers.forEach(timer => clearTimeout(timer));
  }, [state.notifications]);
  
  // Helper functions
  const addNotification = (message: string, type: 'success' | 'error' | 'warning' | 'info') => {
    dispatch({ type: 'ADD_NOTIFICATION', payload: { message, type } });
  };
  
  const placeBet = (side: 'andar' | 'bahar', amount: number) => {
    dispatch({ type: 'PLACE_BET', side, amount });
  };
  
  const setSelectedChip = (amount: number) => {
    dispatch({ type: 'SET_SELECTED_CHIP', payload: amount });
  };
  
  const value = {
    state,
    dispatch,
    addNotification,
    placeBet,
    setSelectedChip
  };
  
  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
};

// Custom hook to use app context
export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
```

### 3. Create Shared Components to Reduce Duplication

#### Create a shared notification component:

```tsx
// src/components/Notification/Notification.tsx
import React, { useEffect, useState } from 'react';
import { useApp } from '../../contexts/AppContext';
import { cn } from '../../lib/utils';

interface NotificationProps {
  id: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  onClose: (id: string) => void;
}

const Notification: React.FC<NotificationProps> = ({ id, message, type, onClose }) => {
  const [isVisible, setIsVisible] = useState(true);
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => onClose(id), 300); // Wait for animation to complete
    }, 3000);
    
    return () => clearTimeout(timer);
  }, [id, onClose]);
  
  const typeStyles = {
    success: 'bg-green-500 text-white',
    error: 'bg-red-500 text-white',
    warning: 'bg-yellow-500 text-black',
    info: 'bg-blue-500 text-white'
  };
  
  if (!isVisible) return null;
  
  return (
    <div 
      className={cn(
        "p-4 rounded-lg shadow-lg max-w-sm w-full transform transition-all duration-300",
        "fixed top-4 right-4 z-50",
        typeStyles[type],
        isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
      )}
    >
      <div className="flex justify-between items-center">
        <span>{message}</span>
        <button 
          onClick={() => {
            setIsVisible(false);
            setTimeout(() => onClose(id), 300);
          }}
          className="ml-2 text-xl font-bold"
        >
          ×
        </button>
      </div>
    </div>
  );
};

// Container component to manage all notifications
export const NotificationContainer: React.FC = () => {
  const { state, dispatch } = useApp();
  
  const removeNotification = (id: string) => {
    dispatch({ type: 'REMOVE_NOTIFICATION', payload: id });
  };
  
  return (
    <div>
      {state.notifications.map(notification => (
        <Notification
          key={notification.id}
          id={notification.id}
          message={notification.message}
          type={notification.type}
          onClose={removeNotification}
        />
      ))}
    </div>
  );
};
```

#### Create a shared button component:

```tsx
// src/components/Button/Button.tsx
import React from 'react';
import { cn } from '../../lib/utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'info' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  fullWidth?: boolean;
}

const Button: React.FC<ButtonProps> = React.forwardRef<HTMLButtonElement, ButtonProps>(({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  fullWidth = false,
  className,
  disabled,
  ...props
}, ref) => {
  const baseClasses = "inline-flex items-center justify-center font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed";
  
  const variantClasses = {
    primary: "bg-gold text-black hover:bg-yellow-400 focus:ring-gold",
    secondary: "bg-white text-black hover:bg-gray-200 focus:ring-gray-300",
    success: "bg-green-600 text-white hover:bg-green-700 focus:ring-green-500",
    danger: "bg-red-600 text-white hover:bg-red-700 focus:ring-red-500",
    warning: "bg-yellow-600 text-black hover:bg-yellow-700 focus:ring-yellow-500",
    info: "bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500",
    ghost: "bg-transparent text-gold hover:bg-gold/10 focus:ring-gold"
  };
  
  const sizeClasses = {
    sm: "text-sm px-3 py-1.5",
    md: "text-base px-4 py-2",
    lg: "text-lg px-6 py-3"
  };
  
  const widthClass = fullWidth ? "w-full" : "";
  
  return (
    <button
      ref={ref}
      className={cn(
        baseClasses,
        variantClasses[variant],
        sizeClasses[size],
        widthClass,
        "rounded-full",
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      )}
      {children}
    </button>
  );
});

Button.displayName = "Button";

export { Button };
```

### 4. Review and Optimize Game Logic

#### Consolidate game logic to prevent duplication:

```ts
// src/components/GameLogic/GameLogic.ts (optimized version)
import { useCallback } from 'react';

export interface Card {
  value: string;
  suit: string;
  display: string;
}

export interface GameState {
  phase: 'idle' | 'betting' | 'dealing' | 'completed';
  currentRound: number;
  openingCard: Card | null;
  andarCards: Card[];
  baharCards: Card[];
  countdown: number;
  winner: 'andar' | 'bahar' | null;
  round1Bets: { andar: number; bahar: number };
  round2Bets: { andar: number; bahar: number };
  totalBets: { andar: number; bahar: number };
  andarTotalBet: number;
  baharTotalBet: number;
}

export interface PlayerBets {
  round1: { andar: number; bahar: number };
  round2: { andar: number; bahar: number };
  currentBet: number;
}

export const initializeGameState = (): GameState => ({
  phase: 'idle',
  currentRound: 0,
  openingCard: null,
  andarCards: [],
  baharCards: [],
  countdown: 0,
  winner: null,
  round1Bets: { andar: 0, bahar: 0 },
  round2Bets: { andar: 0, bahar: 0 },
  totalBets: { andar: 0, bahar: 0 },
  andarTotalBet: 0,
  baharTotalBet: 0,
});

// Reusable game helper functions
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

export const isValidCard = (card: any): card is Card => {
  return (
    typeof card === 'object' &&
    typeof card.value === 'string' &&
    typeof card.suit === 'string' &&
    typeof card.display === 'string' &&
    ['♠', '♥', '♦', '♣'].includes(card.suit) &&
    card.value.length > 0
  );
};

export const isWinningCard = (card: Card, openingCard: Card): boolean => {
  return getCardValue(card) === getCardValue(openingCard);
};

export const calculateWinner = (gameState: GameState): 'andar' | 'bahar' | null => {
  if (!gameState.openingCard) return null;
  
  // Check if last card on andar side matches opening card
  if (gameState.andarCards.length > 0) {
    const lastAndarCard = gameState.andarCards[gameState.andarCards.length - 1];
    if (isWinningCard(lastAndarCard, gameState.openingCard)) {
      return 'andar';
    }
  }
  
  // Check if last card on bahar side matches opening card
  if (gameState.baharCards.length > 0) {
    const lastBaharCard = gameState.baharCards[gameState.baharCards.length - 1];
    if (isWinningCard(lastBaharCard, gameState.openingCard)) {
      return 'bahar';
    }
  }
  
  return null;
};

export const getWinningSideCards = (gameState: GameState): Card[] => {
  if (!gameState.winner) return [];
  
  return gameState.winner === 'andar' 
    ? gameState.andarCards 
    : gameState.baharCards;
};

export const calculatePayout = (betAmount: number, side: 'andar' | 'bahar', winner: 'andar' | 'bahar' | null, winningCards: Card[]): number => {
  if (!winner || side !== winner) return 0;
  
  // In Andar Bahar, if the 5th card wins, it typically has special odds
  if (winningCards.length === 5) {
    // Special payout for 5th card: typically 4:1 before commission
    return betAmount * 4;
  }
  
  // Regular payout: 1:1 minus commission (typically 5%)
  const commission = 0.05;
  return betAmount * (1 - commission);
};

export const getRoundPhase = (round: number): 'idle' | 'betting' | 'dealing' => {
  if (round === 0) return 'idle';
  if (round === 1 || round === 2) return 'betting';
  return 'dealing';
};

// Custom hook to encapsulate game logic
export const useGameLogic = () => {
  const calculateTotalBets = useCallback((round1Bets: { andar: number; bahar: number }, round2Bets: { andar: number; bahar: number }) => {
    return {
      andar: round1Bets.andar + round2Bets.andar,
      bahar: round1Bets.bahar + round2Bets.bahar
    };
  }, []);

  const updateGameStateWithBet = useCallback((state: GameState, side: 'andar' | 'bahar', amount: number, round: number): GameState => {
    const newState = { ...state };
    
    if (round === 1) {
      newState.round1Bets = {
        ...newState.round1Bets,
        [side]: newState.round1Bets[side] + amount
      };
    } else if (round === 2) {
      newState.round2Bets = {
        ...newState.round2Bets,
        [side]: newState.round2Bets[side] + amount
      };
    }
    
    // Update total bets
    newState.totalBets = calculateTotalBets(newState.round1Bets, newState.round2Bets);
    newState.andarTotalBet = newState.totalBets.andar;
    newState.baharTotalBet = newState.totalBets.bahar;
    
    return newState;
  }, [calculateTotalBets]);

  const addCardToGame = useCallback((state: GameState, side: 'andar' | 'bahar', card: Card): GameState => {
    const newState = { ...state };
    
    if (side === 'andar') {
      newState.andarCards = [...newState.andarCards, card];
    } else {
      newState.baharCards = [...newState.baharCards, card];
    }
    
    // Check if this is a winning card
    if (newState.openingCard) {
      const winner = calculateWinner(newState);
      
      if (winner) {
        newState.winner = winner;
        newState.phase = 'completed';
      }
    }
    
    return newState;
  }, []);

  return {
    calculateTotalBets,
    updateGameStateWithBet,
    addCardToGame,
    calculateWinner,
    getWinningSideCards,
    calculatePayout,
    getRoundPhase
  };
};
```

### 5. Create Reusable Form Components

```tsx
// src/components/Form/FormComponents.tsx
import React from 'react';
import { cn } from '../../lib/utils';

// Input component with validation
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  required?: boolean;
  icon?: React.ReactNode;
}

export const Input: React.FC<InputProps> = ({ 
  label, 
  error, 
  required, 
  icon, 
  className, 
  ...props 
}) => {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-gray-300 mb-2">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <div className="relative">
        {icon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            {icon}
          </div>
        )}
        <input
          className={cn(
            "w-full px-4 py-3 rounded-lg text-white focus:outline-none focus:ring-2 transition-colors duration-200",
            icon ? "pl-10" : "pl-4",
            error 
              ? "bg-red-900/20 border border-red-600 focus:ring-red-500" 
              : "bg-gray-700/50 border border-gray-600 focus:ring-gold",
            className
          )}
          {...props}
        />
      </div>
      {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
    </div>
  );
};

// Select component
interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  required?: boolean;
  options: Array<{ value: string; label: string }>;
}

export const Select: React.FC<SelectProps> = ({ 
  label, 
  error, 
  required, 
  options, 
  className, 
  ...props 
}) => {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-gray-300 mb-2">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <select
        className={cn(
          "w-full px-4 py-3 rounded-lg text-white focus:outline-none focus:ring-2 transition-colors duration-200 bg-gray-700/50 border border-gray-600 focus:ring-gold",
          error && "focus:ring-red-500 border-red-600",
          className
        )}
        {...props}
      >
        {options.map(option => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
    </div>
  );
};

// Textarea component
interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  required?: boolean;
}

export const Textarea: React.FC<TextareaProps> = ({ 
  label, 
  error, 
  required, 
  className, 
  ...props 
}) => {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-gray-300 mb-2">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <textarea
        className={cn(
          "w-full px-4 py-3 rounded-lg text-white focus:outline-none focus:ring-2 transition-colors duration-200 bg-gray-700/50 border border-gray-600 focus:ring-gold",
          error && "focus:ring-red-500 border-red-600",
          className
        )}
        {...props}
      />
      {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
    </div>
  );
};
```

### 6. Create a Global Loading and Error Handler

```tsx
// src/components/GlobalHandlers/GlobalHandlers.tsx
import React from 'react';
import { useApp } from '../../contexts/AppContext';

// Global loading component
export const GlobalLoading: React.FC = () => {
  const { state } = useApp();
  
  if (!state.authChecked) {
    return (
      <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gold"></div>
          <p className="mt-4 text-white">Loading...</p>
        </div>
      </div>
    );
  }
  
  return null;
};

// Global error boundary component
export class GlobalErrorBoundary extends React.Component<{
  children: React.ReactNode;
}, { hasError: boolean; error: Error | null }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Global error caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center min-h-screen bg-gray-900">
          <div className="text-center p-8 bg-gray-800 rounded-xl border border-red-500">
            <h2 className="text-2xl font-bold text-red-500 mb-4">Something went wrong</h2>
            <p className="text-gray-300 mb-4">{this.state.error?.message || 'An unexpected error occurred'}</p>
            <button 
              className="px-4 py-2 bg-gold text-black rounded-full font-semibold hover:bg-yellow-400"
              onClick={() => this.setState({ hasError: false, error: null })}
            >
              Try again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
```

### 7. Create Shared API Service

```ts
// src/services/api.ts
import { useApp } from '../contexts/AppContext';
import { NotificationContainer } from '../components/Notification/Notification';

// Base API service
class ApiService {
  private baseUrl: string;
  private token: string | null;

  constructor() {
    this.baseUrl = process.env.REACT_APP_API_BASE_URL || '/api';
    this.token = localStorage.getItem('token');
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const defaultOptions: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...(this.token && { 'Authorization': `Bearer ${this.token}` })
      }
    };

    const mergedOptions = {
      ...defaultOptions,
      ...options,
      headers: {
        ...defaultOptions.headers,
        ...options.headers
      }
    };

    try {
      const response = await fetch(url, mergedOptions);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error: any) {
      throw new Error(error.message || 'Network error occurred');
    }
  }

  // Authentication
  async login(email: string, password: string) {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
  }

  async register(userData: any) {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData)
    });
  }

  // Game
  async placeBet(side: 'andar' | 'bahar', amount: number) {
    return this.request('/game/bet', {
      method: 'POST',
      body: JSON.stringify({ side, amount })
    });
  }

  async getGameStats() {
    return this.request('/game/stats');
  }

  // Payment
  async processPayment(paymentData: any) {
    return this.request('/payment/process', {
      method: 'POST',
      body: JSON.stringify(paymentData)
    });
  }

  async getTransactionHistory() {
    return this.request('/payment/history');
  }

  // Profile
  async getUserProfile() {
    return this.request('/profile');
  }

  async updateProfile(profileData: any) {
    return this.request('/profile', {
      method: 'PUT',
      body: JSON.stringify(profileData)
    });
  }
}

// Singleton instance
export const apiService = new ApiService();

// Custom hook for API calls with notifications
export const useApi = () => {
  const { addNotification } = useApp();
  
  const apiCall = async <T,>(apiFunc: () => Promise<T>, successMessage?: string, errorMessage?: string): Promise<T | null> => {
    try {
      const result = await apiFunc();
      if (successMessage) {
        addNotification(successMessage, 'success');
      }
      return result;
    } catch (error: any) {
      const message = errorMessage || error.message || 'An error occurred';
      addNotification(message, 'error');
      return null;
    }
  };
  
  return { apiCall };
};
```

## Verification Steps
1. Review all created components and utilities for potential duplication
2. Consolidate similar functions into common utility files
3. Create reusable components to replace duplicate implementations
4. Implement a unified context system to avoid multiple context providers
5. Verify that all new code adds value without introducing redundancy
6. Check that shared components are properly abstracted and reusable
7. Ensure form components are consistent and reusable across the app
8. Verify API services are centralized and not duplicated
9. Test that consolidated code maintains functionality without breaking changes
10. Confirm that code organization follows logical grouping and separation of concerns