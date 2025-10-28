import React, { createContext, useContext, useReducer, useEffect, ReactNode, useCallback } from 'react';

// Define user interface
export interface User {
  id: string;
  phone: string;
  balance?: number;
  role: 'player' | 'admin' | 'super_admin';
  username?: string;
  full_name?: string;
}

// Define auth state
interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  authChecked: boolean;
  loading: boolean;
  error: string | null;
  token: string | null;
}

// Define action types
type AuthAction =
  | { type: 'AUTH_START' }
  | { type: 'AUTH_SUCCESS'; payload: { user: User; token: string } }
  | { type: 'AUTH_FAILURE'; payload: string }
  | { type: 'LOGOUT' }
  | { type: 'AUTH_CHECKED' }
  | { type: 'CLEAR_ERROR' };

// Initial state
const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  authChecked: false,
  loading: false,
  error: null,
  token: null
};

// Reducer function
const authReducer = (state: AuthState, action: AuthAction): AuthState => {
  switch (action.type) {
    case 'AUTH_START':
      return {
        ...state,
        loading: true,
        error: null
      };
    
    case 'AUTH_SUCCESS':
      return {
        ...state,
        user: action.payload.user,
        isAuthenticated: true,
        loading: false,
        error: null,
        authChecked: true,
        token: action.payload.token
      };
    
    case 'AUTH_FAILURE':
      return {
        ...state,
        user: null,
        isAuthenticated: false,
        loading: false,
        error: action.payload,
        authChecked: true,
        token: null
      };
    
    case 'LOGOUT':
      return {
        ...state,
        user: null,
        isAuthenticated: false,
        loading: false,
        error: null,
        token: null
      };
    
    case 'AUTH_CHECKED':
      return {
        ...state,
        authChecked: true
      };
    
    case 'CLEAR_ERROR':
      return {
        ...state,
        error: null
      };
    
    default:
      return state;
  }
};

// Create context
interface AuthContextType {
  // Direct access to user and auth state
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  token: string | null;
  
  // State object for backward compatibility
  state: AuthState;
  
  // Methods
  login: (userData: User, token: string) => void;
  logout: () => void;
  checkAuthStatus: () => void;
  clearError: () => void;
  refreshUser: () => Promise<void>;
  updateBalance: (newBalance: number, source?: string, transactionType?: string, amount?: number) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Auth provider component
export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Check authentication status on app load
  useEffect(() => {
    checkAuthStatus();
  }, []);

  // Check if user is authenticated using localStorage
  const checkAuthStatus = () => {
    const userStr = localStorage.getItem('user');
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
    const token = localStorage.getItem('token');

    if (userStr && isLoggedIn && token) {
      try {
        const user: User = JSON.parse(userStr);
        dispatch({ type: 'AUTH_SUCCESS', payload: { user, token } });
      } catch (error) {
        console.error('Failed to parse user data:', error);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('isLoggedIn');
        dispatch({ type: 'AUTH_CHECKED' });
      }
    } else {
      dispatch({ type: 'AUTH_CHECKED' });
    }
  };

  // Login function
  const login = (userData: User, token: string) => {
    try {
      localStorage.setItem('user', JSON.stringify(userData));
      localStorage.setItem('isLoggedIn', 'true');
      localStorage.setItem('token', token);
      dispatch({ type: 'AUTH_SUCCESS', payload: { user: userData, token } });
    } catch (error) {
      console.error('Login error:', error);
      dispatch({ type: 'AUTH_FAILURE', payload: 'Failed to store user data' });
    }
  };

  // Logout function
  const logout = () => {
    // Remove all auth-related data from localStorage
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('isLoggedIn');
    
    dispatch({ type: 'LOGOUT' });
  };

  // Clear error
  const clearError = () => {
    dispatch({ type: 'CLEAR_ERROR' });
  };

  // Refresh user data from API
  const refreshUser = async () => {
    if (!state.user || !state.isAuthenticated || !state.token) return;

    try {
      const token = state.token;
      if (!token) {
        logout();
        return;
      }

      const response = await fetch('/api/user/profile', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const { data } = await response.json();
        const updatedUser: User = {
          ...state.user,
          balance: data.balance,
          // Add any other fields that might have changed
        };

        localStorage.setItem('user', JSON.stringify(updatedUser));
        dispatch({ type: 'AUTH_SUCCESS', payload: { user: updatedUser, token } });
      } else {
        // Token might be invalid/expired
        if (response.status === 401) {
          logout();
        }
      }
    } catch (error) {
      console.error('Error refreshing user:', error);
      dispatch({ type: 'AUTH_FAILURE', payload: 'Failed to refresh user data' });
    }
  };

  // Add balance update method
  const updateBalance = useCallback(async (newBalance: number, source: string = 'api', transactionType?: string, amount?: number) => {
    if (state.user) {
      const updatedUser = {
        ...state.user,
        balance: newBalance
      };
      
      // Update localStorage
      localStorage.setItem('user', JSON.stringify(updatedUser));
      
      // Update state
      dispatch({
        type: 'AUTH_SUCCESS',
        payload: { user: updatedUser, token: state.token || '' }
      });
      
      // Emit custom event for other contexts
      window.dispatchEvent(new CustomEvent('balance-updated', {
        detail: { balance: newBalance, source, timestamp: Date.now(), transactionType, amount }
      }));
    }
  }, [state.user, state.token]);

  // Listen for balance updates
  useEffect(() => {
    const handleBalanceUpdate = (event: CustomEvent) => {
      const { balance: newBalance, source } = event.detail;
      
      if (state.user && state.user.balance !== newBalance) {
        updateBalance(newBalance, source);
      }
    };

    window.addEventListener('balance-updated', handleBalanceUpdate as EventListener);
    return () => window.removeEventListener('balance-updated', handleBalanceUpdate as EventListener);
  }, [state.user, updateBalance]);

  const value = {
    // Direct access properties
    user: state.user,
    isAuthenticated: state.isAuthenticated,
    isLoading: state.loading,
    token: state.token,
    
    // State object for backward compatibility
    state,
    
    // Methods
    login,
    logout,
    checkAuthStatus,
    clearError,
    refreshUser,
    updateBalance
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};