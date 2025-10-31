import React, { createContext, useContext, useReducer, useEffect, ReactNode, useCallback } from 'react';
import { apiClient } from '@/lib/api-client';
import { useAuth } from './AuthContext';

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
  const { state: authState } = useAuth();

  // Check if user is admin
  const isAdmin = authState.user?.role === 'admin' || authState.user?.role === 'super_admin';

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
    // Skip balance refresh for admin users
    if (isAdmin) {
      return;
    }
    
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
  }, [updateBalance, isAdmin]);

  const validateBalance = useCallback(async (): Promise<boolean> => {
    // Skip balance validation for admin users
    if (isAdmin) {
      return true;
    }
    
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
  }, [state.currentBalance, updateBalance, isAdmin]);

  // Initialize balance from localStorage
  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        if (user.balance !== undefined) {
          updateBalance(user.balance, 'localStorage');
        }
      } catch (error) {
        console.error('Failed to parse user balance from localStorage:', error);
      }
    }
  }, [updateBalance]);

  // Listen for WebSocket balance updates
  useEffect(() => {
    const handleWebSocketBalanceUpdate = (event: CustomEvent) => {
      const { balance: newBalance } = event.detail;
      updateBalance(newBalance, 'websocket');
    };

    const handleRefreshBalance = () => {
      // Refresh balance from API when requested (skip for admin users)
      if (!isAdmin) {
        refreshBalance();
      }
    };

    window.addEventListener('balance-websocket-update', handleWebSocketBalanceUpdate as EventListener);
    window.addEventListener('refresh-balance', handleRefreshBalance as EventListener);
    
    return () => {
      window.removeEventListener('balance-websocket-update', handleWebSocketBalanceUpdate as EventListener);
      window.removeEventListener('refresh-balance', handleRefreshBalance as EventListener);
    };
  }, [updateBalance, refreshBalance, isAdmin]);

  // Periodic balance refresh (skip for admin users)
  useEffect(() => {
    if (isAdmin) {
      return; // Don't set up interval for admins
    }
    
    const interval = setInterval(() => {
      const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
      if (isLoggedIn && !state.isLoading) {
        refreshBalance();
      }
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [refreshBalance, state.isLoading, isAdmin]);

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