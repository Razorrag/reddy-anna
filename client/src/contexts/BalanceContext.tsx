import React, { createContext, useContext, useReducer, useEffect, ReactNode, useCallback } from 'react';
import { apiClient } from '@/lib/api-client';

interface BalanceState {
  currentBalance: number;
  lastUpdated: number;
  isLoading: boolean;
  error: string | null;
  source: 'websocket' | 'api' | 'localStorage';
}

type BalanceAction =
  | { type: 'SET_BALANCE'; payload: { balance: number; source: string } }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'REFRESH_BALANCE' };

const initialState: BalanceState = {
  currentBalance: 0,
  lastUpdated: 0,
  isLoading: false,
  error: null,
  source: 'localStorage'
};

const balanceReducer = (state: BalanceState, action: BalanceAction): BalanceState => {
  switch (action.type) {
    case 'SET_BALANCE':
      return {
        ...state,
        currentBalance: action.payload.balance,
        lastUpdated: Date.now(),
        source: action.payload.source as 'websocket' | 'api' | 'localStorage'
      };
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload, isLoading: false };
    case 'REFRESH_BALANCE':
      return { ...state, isLoading: true, error: null };
    default:
      return state;
  }
};

interface BalanceContextType {
  balance: number;
  isLoading: boolean;
  error: string | null;
  source: string;
  updateBalance: (newBalance: number, source?: string, transactionType?: string, amount?: number) => Promise<void>;
  refreshBalance: () => Promise<void>;
  validateBalance: () => Promise<boolean>;
}

const BalanceContext = createContext<BalanceContextType | undefined>(undefined);

export const BalanceProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(balanceReducer, initialState);

  const updateBalance = useCallback(async (newBalance: number, source: string = 'api', transactionType?: string, amount?: number) => {
    dispatch({
      type: 'SET_BALANCE',
      payload: { balance: newBalance, source }
    });

    // Emit custom event for other contexts
    window.dispatchEvent(new CustomEvent('balance-updated', {
      detail: { balance: newBalance, source, timestamp: Date.now(), transactionType, amount }
    }));

    // Update localStorage
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        user.balance = newBalance;
        localStorage.setItem('user', JSON.stringify(user));
        
        // Notify server via API to broadcast to other WebSocket clients
        if (source !== 'websocket') {
          try {
            await apiClient.notifyBalanceUpdate(user.id, newBalance, transactionType, amount);
          } catch (error) {
            console.error('Failed to notify balance update:', error);
          }
        }
      } catch (error) {
        console.error('Failed to update localStorage balance:', error);
      }
    }
  }, []);

  const refreshBalance = useCallback(async () => {
    dispatch({ type: 'REFRESH_BALANCE' });
    
    try {
      const response = await apiClient.get<{success: boolean, balance: number, error?: string}>('/user/balance');
      if (response.success) {
        updateBalance(response.balance, 'api');
      } else {
        throw new Error(response.error || 'Failed to fetch balance');
      }
    } catch (error: any) {
      dispatch({ type: 'SET_ERROR', payload: error.message });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [updateBalance]);

  const validateBalance = useCallback(async (): Promise<boolean> => {
    try {
      const response = await apiClient.get<{success: boolean, balance: number}>('/user/balance');
      if (response.success) {
        const isValid = Math.abs(response.balance - state.currentBalance) < 0.01; // Allow for floating point
        if (!isValid) {
          updateBalance(response.balance, 'api');
        }
        return isValid;
      }
      return false;
    } catch (error) {
      console.error('Balance validation failed:', error);
      return false;
    }
  }, [state.currentBalance, updateBalance]);

  // Initialize balance from localStorage and refresh from API
  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        if (user.balance !== undefined) {
          updateBalance(user.balance, 'localStorage');
          
          // Immediately refresh from API to ensure accuracy
          refreshBalance();
        }
      } catch (error) {
        console.error('Failed to parse user balance from localStorage:', error);
      }
    }
  }, [updateBalance, refreshBalance]);

  // Load balance when user becomes available via AuthContext
  useEffect(() => {
    const checkUserBalance = () => {
      const userStr = localStorage.getItem('user');
      const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
      
      if (userStr && isLoggedIn) {
        try {
          const user = JSON.parse(userStr);
          if (user.id && user.balance !== undefined) {
            // User is available, ensure balance is current
            if (state.currentBalance === 0 || Date.now() - state.lastUpdated > 5000) {
              console.log('🔄 Loading balance for authenticated user');
              refreshBalance();
            }
          }
        } catch (error) {
          console.error('Failed to check user balance:', error);
        }
      }
    };

    // Check immediately
    checkUserBalance();
    
    // Check periodically
    const interval = setInterval(checkUserBalance, 10000); // Every 10 seconds
    
    return () => clearInterval(interval);
  }, [refreshBalance, state.currentBalance, state.lastUpdated]);

  // Listen for WebSocket balance updates
  useEffect(() => {
    const handleWebSocketBalanceUpdate = (event: CustomEvent) => {
      const { balance: newBalance } = event.detail;
      updateBalance(newBalance, 'websocket');
    };

    window.addEventListener('balance-websocket-update', handleWebSocketBalanceUpdate as EventListener);
    return () => window.removeEventListener('balance-websocket-update', handleWebSocketBalanceUpdate as EventListener);
  }, [updateBalance]);

  // Periodic balance refresh
  useEffect(() => {
    const interval = setInterval(() => {
      const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
      if (isLoggedIn && !state.isLoading) {
        refreshBalance();
      }
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [refreshBalance, state.isLoading]);

  const value: BalanceContextType = {
    balance: state.currentBalance,
    isLoading: state.isLoading,
    error: state.error,
    source: state.source,
    updateBalance,
    refreshBalance,
    validateBalance
  };

  return (
    <BalanceContext.Provider value={value}>
      {children}
    </BalanceContext.Provider>
  );
};

export const useBalance = () => {
  const context = useContext(BalanceContext);
  if (context === undefined) {
    throw new Error('useBalance must be used within a BalanceProvider');
  }
  return context;
};