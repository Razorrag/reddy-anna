// 🤝 PARTNER AUTHENTICATION CONTEXT
// Completely separate from player AuthContext
import React, { createContext, useContext, useReducer, useEffect, ReactNode, useCallback } from 'react';

// Partner interface
export interface Partner {
  id: string;
  phone: string;
  full_name: string;
  email?: string;
  status: 'pending' | 'active' | 'suspended' | 'banned';
}

// Partner auth state
interface PartnerAuthState {
  partner: Partner | null;
  isAuthenticated: boolean;
  authChecked: boolean;
  loading: boolean;
  error: string | null;
  token: string | null;
}

// Action types
type PartnerAuthAction =
  | { type: 'AUTH_START' }
  | { type: 'AUTH_SUCCESS'; payload: { partner: Partner; token: string } }
  | { type: 'AUTH_FAILURE'; payload: string }
  | { type: 'LOGOUT' }
  | { type: 'AUTH_CHECKED' }
  | { type: 'CLEAR_ERROR' }
  | { type: 'UPDATE_PARTNER'; payload: Partial<Partner> };

// Initial state
const initialState: PartnerAuthState = {
  partner: null,
  isAuthenticated: false,
  authChecked: false,
  loading: false,
  error: null,
  token: null
};

// Reducer
const partnerAuthReducer = (state: PartnerAuthState, action: PartnerAuthAction): PartnerAuthState => {
  switch (action.type) {
    case 'AUTH_START':
      return { ...state, loading: true, error: null };
    
    case 'AUTH_SUCCESS':
      return {
        ...state,
        partner: action.payload.partner,
        isAuthenticated: true,
        loading: false,
        error: null,
        authChecked: true,
        token: action.payload.token
      };
    
    case 'AUTH_FAILURE':
      return {
        ...state,
        partner: null,
        isAuthenticated: false,
        loading: false,
        error: action.payload,
        authChecked: true,
        token: null
      };
    
    case 'LOGOUT':
      return {
        ...state,
        partner: null,
        isAuthenticated: false,
        loading: false,
        error: null,
        token: null
      };
    
    case 'AUTH_CHECKED':
      return { ...state, authChecked: true };
    
    case 'CLEAR_ERROR':
      return { ...state, error: null };
    
    case 'UPDATE_PARTNER':
      return {
        ...state,
        partner: state.partner ? { ...state.partner, ...action.payload } : null
      };
    
    default:
      return state;
  }
};

// Context type
interface PartnerAuthContextType {
  partner: Partner | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  token: string | null;
  state: PartnerAuthState;
  
  login: (partnerData: Partner, token: string, refreshToken?: string) => void;
  logout: () => void;
  checkAuthStatus: () => void;
  clearError: () => void;
  refreshPartner: () => Promise<void>;
  refreshAccessToken: () => Promise<string | null>;
}

const PartnerAuthContext = createContext<PartnerAuthContextType | undefined>(undefined);

// Storage keys (separate from player keys)
const PARTNER_TOKEN_KEY = 'partner_token';
const PARTNER_REFRESH_TOKEN_KEY = 'partner_refresh_token';
const PARTNER_DATA_KEY = 'partner_data';
const PARTNER_LOGGED_IN_KEY = 'partner_logged_in';

// Provider component
export const PartnerAuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(partnerAuthReducer, initialState);

  // Check authentication status on load
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = () => {
    const partnerStr = localStorage.getItem(PARTNER_DATA_KEY);
    const isLoggedIn = localStorage.getItem(PARTNER_LOGGED_IN_KEY) === 'true';
    const token = localStorage.getItem(PARTNER_TOKEN_KEY);

    if (partnerStr && isLoggedIn && token) {
      try {
        const partner = JSON.parse(partnerStr) as Partner;
        dispatch({ type: 'AUTH_SUCCESS', payload: { partner, token } });
      } catch (error) {
        console.error('Failed to parse partner data:', error);
        clearPartnerStorage();
        dispatch({ type: 'AUTH_CHECKED' });
      }
    } else {
      dispatch({ type: 'AUTH_CHECKED' });
    }
  };

  const clearPartnerStorage = () => {
    localStorage.removeItem(PARTNER_TOKEN_KEY);
    localStorage.removeItem(PARTNER_REFRESH_TOKEN_KEY);
    localStorage.removeItem(PARTNER_DATA_KEY);
    localStorage.removeItem(PARTNER_LOGGED_IN_KEY);
  };

  const login = (partnerData: Partner, token: string, refreshToken?: string) => {
    try {
      localStorage.setItem(PARTNER_DATA_KEY, JSON.stringify(partnerData));
      localStorage.setItem(PARTNER_LOGGED_IN_KEY, 'true');
      localStorage.setItem(PARTNER_TOKEN_KEY, token);
      if (refreshToken) {
        localStorage.setItem(PARTNER_REFRESH_TOKEN_KEY, refreshToken);
      }
      dispatch({ type: 'AUTH_SUCCESS', payload: { partner: partnerData, token } });
    } catch (error) {
      console.error('Partner login error:', error);
      dispatch({ type: 'AUTH_FAILURE', payload: 'Failed to store partner data' });
    }
  };

  const logout = () => {
    clearPartnerStorage();
    dispatch({ type: 'LOGOUT' });
    // Redirect to partner login
    setTimeout(() => {
      window.location.href = '/partner/login';
    }, 100);
  };

  const clearError = () => {
    dispatch({ type: 'CLEAR_ERROR' });
  };

  const refreshPartner = async () => {
    if (!state.partner || !state.isAuthenticated || !state.token) return;

    try {
      const response = await fetch('/api/partner/profile', {
        headers: {
          'Authorization': `Bearer ${state.token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const { data } = await response.json();
        const updatedPartner: Partner = {
          ...state.partner,
          ...data,
        };
        localStorage.setItem(PARTNER_DATA_KEY, JSON.stringify(updatedPartner));
        dispatch({ type: 'AUTH_SUCCESS', payload: { partner: updatedPartner, token: state.token } });
      } else if (response.status === 401) {
        logout();
      }
    } catch (error) {
      console.error('Error refreshing partner:', error);
    }
  };

  const refreshAccessToken = useCallback(async (): Promise<string | null> => {
    const refreshToken = localStorage.getItem(PARTNER_REFRESH_TOKEN_KEY);
    if (!refreshToken) {
      logout();
      return null;
    }

    try {
      const response = await fetch('/api/partner/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });

      if (response.ok) {
        const data = await response.json();
        const newAccessToken = data.token;
        const newRefreshToken = data.refreshToken;

        if (newAccessToken && newRefreshToken) {
          localStorage.setItem(PARTNER_TOKEN_KEY, newAccessToken);
          localStorage.setItem(PARTNER_REFRESH_TOKEN_KEY, newRefreshToken);
          dispatch({
            type: 'AUTH_SUCCESS',
            payload: { partner: state.partner!, token: newAccessToken }
          });
          return newAccessToken;
        }
      }
      
      logout();
      return null;
    } catch (error) {
      console.error('Error during partner token refresh:', error);
      logout();
      return null;
    }
  }, [state.partner]);

  const value = {
    partner: state.partner,
    isAuthenticated: state.isAuthenticated,
    isLoading: state.loading,
    token: state.token,
    state,
    login,
    logout,
    checkAuthStatus,
    clearError,
    refreshPartner,
    refreshAccessToken
  };

  return (
    <PartnerAuthContext.Provider value={value}>
      {children}
    </PartnerAuthContext.Provider>
  );
};

// Hook
export const usePartnerAuth = () => {
  const context = useContext(PartnerAuthContext);
  if (context === undefined) {
    throw new Error('usePartnerAuth must be used within a PartnerAuthProvider');
  }
  return context;
};
