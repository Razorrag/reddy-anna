import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { apiClient } from '@/lib/api-client';

// Types for user profile data
export interface UserAnalytics {
  currentBalance: number;
  totalDeposits: number;
  totalWithdrawals: number;
  gamesPlayed: number;
  totalWinnings: number;
  totalLosses: number;
  winRate: number;
  biggestWin: number;
  averageBet: number;
  todayProfit: number;
  weeklyProfit: number;
  monthlyProfit: number;
}

export interface BonusInfo {
  depositBonus: number;
  referralBonus: number;
  totalBonus: number;
}

export interface ReferralData {
  totalReferrals: number;
  totalReferralEarnings: number;
  referredUsers: Array<{
    username: string;
    createdAt: Date;
    hasDeposited: boolean;
    bonusEarned: number;
  }>;
}

export interface Transaction {
  id: string;
  type: 'deposit' | 'withdrawal' | 'win' | 'loss' | 'refund';
  amount: number;
  status: 'completed' | 'pending' | 'failed';
  paymentMethod?: string;
  transactionId?: string;
  description: string;
  createdAt: Date;
  metadata?: Record<string, any>;
}

export interface GameHistoryEntry {
  id: string;
  gameId: string;
  openingCard: string;
  winner: 'andar' | 'bahar';
  yourBet: {
    side: 'andar' | 'bahar';
    amount: number;
    round: number;
  };
  result: 'win' | 'loss';
  payout: number;
  totalCards: number;
  round: number;
  createdAt: Date;
}

export interface UserProfile {
  id: string;
  username: string;
  email: string;
  fullName?: string;
  mobile?: string;
  profilePicture?: string;
  dateOfBirth?: Date;
  gender?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  country?: string;
  referralCode?: string;
  referralCodeGenerated?: string;
  referredBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Context state
interface UserProfileState {
  user: UserProfile | null;
  analytics: UserAnalytics | null;
  bonusInfo: BonusInfo | null;
  referralData: ReferralData | null;
  transactions: Transaction[];
  gameHistory: GameHistoryEntry[];
  loading: boolean;
  error: string | null;
  pagination: {
    transactions: { hasMore: boolean; offset: number; limit: number };
    gameHistory: { hasMore: boolean; offset: number; limit: number };
  };
}

// Action types
type UserProfileAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_USER'; payload: UserProfile | null }
  | { type: 'SET_ANALYTICS'; payload: UserAnalytics | null }
  | { type: 'SET_BONUS_INFO'; payload: BonusInfo | null }
  | { type: 'SET_REFERRAL_DATA'; payload: ReferralData | null }
  | { type: 'SET_TRANSACTIONS'; payload: { transactions: Transaction[]; hasMore: boolean; append?: boolean } }
  | { type: 'SET_GAME_HISTORY'; payload: { games: GameHistoryEntry[]; hasMore: boolean; append?: boolean } }
  | { type: 'UPDATE_USER_PROFILE'; payload: Partial<UserProfile> }
  | { type: 'ADD_TRANSACTION'; payload: Transaction }
  | { type: 'RESET_STATE' };

// Initial state
const initialState: UserProfileState = {
  user: null,
  analytics: null,
  bonusInfo: null,
  referralData: null,
  transactions: [],
  gameHistory: [],
  loading: false,
  error: null,
  pagination: {
    transactions: { hasMore: true, offset: 0, limit: 20 },
    gameHistory: { hasMore: true, offset: 0, limit: 20 }
  }
};

// Reducer
const userProfileReducer = (state: UserProfileState, action: UserProfileAction): UserProfileState => {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    
    case 'SET_ERROR':
      return { ...state, error: action.payload, loading: false };
    
    case 'SET_USER':
      return { ...state, user: action.payload };
    
    case 'SET_ANALYTICS':
      return { ...state, analytics: action.payload };
    
    case 'SET_BONUS_INFO':
      return { ...state, bonusInfo: action.payload };
    
    case 'SET_REFERRAL_DATA':
      return { ...state, referralData: action.payload };
    
    case 'SET_TRANSACTIONS':
      return {
        ...state,
        transactions: action.payload.append 
          ? [...state.transactions, ...action.payload.transactions]
          : action.payload.transactions,
        pagination: {
          ...state.pagination,
          transactions: {
            ...state.pagination.transactions,
            hasMore: action.payload.hasMore,
            offset: action.payload.append 
              ? state.pagination.transactions.offset + state.pagination.transactions.limit
              : state.pagination.transactions.limit
          }
        }
      };
    
    case 'SET_GAME_HISTORY':
      return {
        ...state,
        gameHistory: action.payload.append 
          ? [...state.gameHistory, ...action.payload.games]
          : action.payload.games,
        pagination: {
          ...state.pagination,
          gameHistory: {
            ...state.pagination.gameHistory,
            hasMore: action.payload.hasMore,
            offset: action.payload.append 
              ? state.pagination.gameHistory.offset + state.pagination.gameHistory.limit
              : state.pagination.gameHistory.limit
          }
        }
      };
    
    case 'UPDATE_USER_PROFILE':
      return {
        ...state,
        user: state.user ? { ...state.user, ...action.payload } : null
      };
    
    case 'ADD_TRANSACTION':
      return {
        ...state,
        transactions: [action.payload, ...state.transactions]
      };
    
    case 'RESET_STATE':
      return initialState;
    
    default:
      return state;
  }
};

// Create context
const UserProfileContext = createContext<{
  state: UserProfileState;
  dispatch: React.Dispatch<UserProfileAction>;
  // Actions
  fetchUserProfile: () => Promise<void>;
  fetchAnalytics: () => Promise<void>;
  fetchBonusInfo: () => Promise<void>;
  fetchReferralData: () => Promise<void>;
  fetchTransactions: (append?: boolean) => Promise<void>;
  fetchGameHistory: (append?: boolean) => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
  deposit: (amount: number, method: string) => Promise<void>;
  withdraw: (amount: number, method: string) => Promise<void>;
  claimBonus: () => Promise<{ success: boolean; message?: string; error?: string }>;
  refreshData: () => Promise<void>;
} | undefined>(undefined);

// Provider component
export const UserProfileProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(userProfileReducer, initialState);

  // API functions
  const fetchUserProfile = async () => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'SET_ERROR', payload: null });
      
      const response = await apiClient.get('/user/profile') as any;
      if (response.success && response.user) {
        dispatch({ type: 'SET_USER', payload: response.user });
      }
    } catch (error: any) {
      dispatch({ type: 'SET_ERROR', payload: error.message || 'Failed to fetch user profile' });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const fetchAnalytics = async () => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      const response = await apiClient.get('/user/analytics') as any;
      if (response.success && response.data) {
        dispatch({ type: 'SET_ANALYTICS', payload: response.data });
      }
    } catch (error: any) {
      dispatch({ type: 'SET_ERROR', payload: error.message || 'Failed to fetch analytics' });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const fetchBonusInfo = async () => {
    try {
      const response = await apiClient.get('/user/bonus-info') as any;
      if (response.success && response.data) {
        dispatch({ type: 'SET_BONUS_INFO', payload: response.data });
      }
    } catch (error: any) {
      console.error('Failed to fetch bonus info:', error);
      dispatch({ type: 'SET_ERROR', payload: error.message || 'Failed to fetch bonus information' });
    }
  };

  const fetchReferralData = async () => {
    try {
      const response = await apiClient.get('/user/referral-data') as any;
      if (response.success && response.data) {
        dispatch({ type: 'SET_REFERRAL_DATA', payload: response.data });
      }
    } catch (error: any) {
      console.error('Failed to fetch referral data:', error);
      dispatch({ type: 'SET_ERROR', payload: error.message || 'Failed to fetch referral data' });
    }
  };

  const fetchTransactions = async (append = false) => {
    try {
      if (!append) dispatch({ type: 'SET_LOADING', payload: true });
      
      const { offset, limit } = state.pagination.transactions;
      const response = await apiClient.get(`/user/transactions?limit=${limit}&offset=${append ? offset : 0}&type=all`) as any;
      
      if (response.success && response.data) {
        dispatch({
          type: 'SET_TRANSACTIONS',
          payload: {
            transactions: response.data.transactions || [],
            hasMore: response.data.hasMore || false,
            append
          }
        });
      }
    } catch (error: any) {
      dispatch({ type: 'SET_ERROR', payload: error.message || 'Failed to fetch transactions' });
    } finally {
      if (!append) dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const fetchGameHistory = async (append = false) => {
    try {
      if (!append) dispatch({ type: 'SET_LOADING', payload: true });
      
      const { offset, limit } = state.pagination.gameHistory;
      const response = await apiClient.get(`/user/game-history?limit=${limit}&offset=${append ? offset : 0}&result=all`) as any;
      
      if (response.success && response.data) {
        dispatch({
          type: 'SET_GAME_HISTORY',
          payload: {
            games: response.data.games || [],
            hasMore: response.data.hasMore || false,
            append
          }
        });
      }
    } catch (error: any) {
      dispatch({ type: 'SET_ERROR', payload: error.message || 'Failed to fetch game history' });
    } finally {
      if (!append) dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const updateProfile = async (updates: Partial<UserProfile>) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      const response = await apiClient.put('/user/profile', updates) as any;
      if (response.success) {
        dispatch({ type: 'UPDATE_USER_PROFILE', payload: updates });
        return response;
      }
      throw new Error(response.error || 'Failed to update profile');
    } catch (error: any) {
      dispatch({ type: 'SET_ERROR', payload: error.message || 'Failed to update profile' });
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const deposit = async (amount: number, method: string) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      // Create payment request instead of direct balance processing
      const response = await apiClient.post('/payment-requests', {
        amount,
        paymentMethod: { type: method },
        requestType: 'deposit'
      }) as any;
      
      if (response.success) {
        // Add transaction to local state as pending
        const newTransaction: Transaction = {
          id: response.data?.requestId || `request-${Date.now()}`,
          type: 'deposit',
          amount,
          status: 'pending',
          paymentMethod: method,
          description: `Deposit request of ₹${amount.toLocaleString('en-IN')}`,
          createdAt: new Date()
        };
        
        dispatch({ type: 'ADD_TRANSACTION', payload: newTransaction });
        
        // Refresh analytics
        await fetchAnalytics();
        
        return response;
      }
      throw new Error(response.error || 'Failed to submit deposit request');
    } catch (error: any) {
      dispatch({ type: 'SET_ERROR', payload: error.message || 'Failed to submit deposit request' });
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const withdraw = async (amount: number, method: string) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      const response = await apiClient.post('/payment-requests', {
        amount,
        paymentMethod: { type: method },
        requestType: 'withdrawal'
      }) as any;
      
      if (response.success) {
        // Add transaction to local state as pending
        const newTransaction: Transaction = {
          id: response.data?.requestId || `request-${Date.now()}`,
          type: 'withdrawal',
          amount,
          status: 'pending',
          paymentMethod: method,
          description: `Withdrawal request of ₹${amount.toLocaleString('en-IN')}`,
          createdAt: new Date()
        };
        
        dispatch({ type: 'ADD_TRANSACTION', payload: newTransaction });
        
        // Refresh analytics
        await fetchAnalytics();
        
        return response;
      }
      throw new Error(response.error || 'Failed to submit withdrawal request');
    } catch (error: any) {
      dispatch({ type: 'SET_ERROR', payload: error.message || 'Failed to submit withdrawal request' });
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const claimBonus = async () => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      const response = await apiClient.post('/user/claim-bonus') as any;
      
      if (response.success) {
        // Refresh analytics and bonus info after claiming
        await Promise.all([
          fetchAnalytics(),
          fetchBonusInfo()
        ]);
        
        return { success: true, message: response.message };
      }
      
      return { success: false, error: response.error || 'Failed to claim bonus' };
    } catch (error: any) {
      dispatch({ type: 'SET_ERROR', payload: error.message || 'Failed to claim bonus' });
      return { success: false, error: error.message || 'Failed to claim bonus' };
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const refreshData = async () => {
    await Promise.all([
      fetchUserProfile(),
      fetchAnalytics(),
      fetchBonusInfo(),
      fetchReferralData(),
      fetchTransactions(false),
      fetchGameHistory(false)
    ]);
  };

  // Initialize data on mount (only for players, not admins)
  useEffect(() => {
    const initializeData = async () => {
      const isLoggedIn = localStorage.getItem('isLoggedIn');
      const userStr = localStorage.getItem('user');
      
      if (isLoggedIn === 'true' && userStr) {
        try {
          const userData = JSON.parse(userStr);
          // Only fetch profile data for players, not admins
          if (userData.role === 'player') {
            console.log('✅ Initializing player profile data');
            await refreshData();
          } else {
            console.log('ℹ️ Skipping profile data fetch for admin user');
          }
        } catch (error) {
          console.error('❌ Failed to parse user data:', error);
        }
      }
    };
    
    initializeData();
  }, []);

  // Listen for balance updates
  useEffect(() => {
    const handleBalanceUpdate = (event: CustomEvent) => {
      const { balance, source } = event.detail;
      
      // Update analytics if balance changed
      if (state.analytics && state.analytics.currentBalance !== balance) {
        dispatch({
          type: 'SET_ANALYTICS',
          payload: { ...state.analytics, currentBalance: balance }
        });
      }
    };

    const handleWebSocketBalanceUpdate = (event: CustomEvent) => {
      const { balance, amount, type } = event.detail;
      
      // Update analytics
      if (state.analytics) {
        let updatedAnalytics = { ...state.analytics, currentBalance: balance };
        
        // Update profit/loss based on transaction type
        if (type === 'win') {
          updatedAnalytics.todayProfit += amount;
          updatedAnalytics.totalWinnings += amount;
        } else if (type === 'loss') {
          updatedAnalytics.todayProfit += amount; // amount is negative
          updatedAnalytics.totalLosses += Math.abs(amount);
        } else if (type === 'deposit') {
          updatedAnalytics.totalDeposits += amount;
        } else if (type === 'withdrawal') {
          updatedAnalytics.totalWithdrawals += amount;
        }
        
        dispatch({
          type: 'SET_ANALYTICS',
          payload: updatedAnalytics
        });
      }
    };

    window.addEventListener('balance-updated', handleBalanceUpdate as EventListener);
    window.addEventListener('balance-websocket-update', handleWebSocketBalanceUpdate as EventListener);
    
    return () => {
      window.removeEventListener('balance-updated', handleBalanceUpdate as EventListener);
      window.removeEventListener('balance-websocket-update', handleWebSocketBalanceUpdate as EventListener);
    };
  }, [state.analytics]);

  // Enhance refreshData to include balance refresh
  const enhancedRefreshData = async () => {
    await refreshData();
    
    // Trigger balance refresh
    window.dispatchEvent(new CustomEvent('balance-refresh-requested', {
      detail: { source: 'profile-refresh', timestamp: Date.now() }
    }));
  };

  // Auto-refresh bonus info every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      const isLoggedIn = localStorage.getItem('isLoggedIn');
      if (isLoggedIn === 'true') {
        fetchBonusInfo();
      }
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, []);

  const value = {
    state,
    dispatch,
    fetchUserProfile,
    fetchAnalytics,
    fetchBonusInfo,
    fetchReferralData,
    fetchTransactions,
    fetchGameHistory,
    updateProfile,
    deposit,
    withdraw,
    claimBonus,
    refreshData: enhancedRefreshData
  };

  return (
    <UserProfileContext.Provider value={value}>
      {children}
    </UserProfileContext.Provider>
  );
};

// Custom hook
export const useUserProfile = () => {
  const context = useContext(UserProfileContext);
  if (context === undefined) {
    throw new Error('useUserProfile must be used within a UserProfileProvider');
  }
  return context;
};