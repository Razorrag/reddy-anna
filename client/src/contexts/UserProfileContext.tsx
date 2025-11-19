import React, { createContext, useContext, useReducer, useEffect, useCallback, ReactNode } from 'react';
import { apiClient } from '@/lib/api-client';

interface WhatsAppResponse {
  success: boolean;
  whatsappUrl?: string;
}

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
  wageringRequired: number;
  wageringCompleted: number;
  wageringProgress: number;
  bonusLocked: boolean;
}

export interface ReferralData {
  // The referral code generated for the current user (referral_code_generated)
  referralCode?: string;
  // Total number of users referred
  totalReferrals: number;
  // Total bonus earned from all referrals
  totalReferralEarnings: number;
  // Optional extra stats from backend
  activeReferrals?: number;
  totalDepositsFromReferrals?: number;
  referredUsers: Array<{
    id: string;
    phone?: string;
    fullName?: string;
    // Raw createdAt from backend can be string; we normalize in UI when needed
    createdAt?: string | Date;
    hasDeposited?: boolean;
    bonusEarned?: number;
    depositAmount?: number;
    bonusAmount?: number;
    bonusApplied?: boolean;
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
  } | null;
  yourBets?: Array<{
    id: string;
    side: 'andar' | 'bahar';
    amount: number;
    round: number;
    payout: number;
    status: string;
  }>;
  yourTotalBet: number;
  yourTotalPayout: number;
  yourNetProfit: number;
  result: 'win' | 'loss' | 'no_bet';
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
interface BonusSummary {
  depositBonuses: {
    unlocked: number;
    locked: number;
    credited: number;
    total: number;
  };
  referralBonuses: {
    pending: number;
    credited: number;
    total: number;
  };
  totals: {
    available: number;
    credited: number;
    lifetime: number;
  };
}

interface UserProfileState {
  user: UserProfile | null;
  analytics: UserAnalytics | null;
  // bonusInfo is kept for backward compatibility, but underlying data comes from unified bonus summary
  bonusInfo: BonusInfo | null;
  bonusSummary: BonusSummary | null;
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
  | { type: 'SET_BONUS_SUMMARY'; payload: BonusSummary | null }
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
  bonusSummary: null,
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

    case 'SET_BONUS_SUMMARY':
      return { ...state, bonusSummary: action.payload };
    
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
  refreshData: () => Promise<void>;
} | undefined>(undefined);

// Provider component
export const UserProfileProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(userProfileReducer, initialState);

  // API functions
  const fetchUserProfile = useCallback(async () => {
    try {
      // ✅ FIX: Cache user profile for 1 hour to prevent flooding
      const CACHE_KEY = 'user_profile_cache';
      const CACHE_TIMESTAMP_KEY = 'user_profile_cache_timestamp';
      const CACHE_DURATION = 60 * 60 * 1000; // 1 hour in milliseconds
      
      // Check cache first
      const cachedData = localStorage.getItem(CACHE_KEY);
      const cacheTimestamp = localStorage.getItem(CACHE_TIMESTAMP_KEY);
      
      if (cachedData && cacheTimestamp) {
        const timestamp = parseInt(cacheTimestamp, 10);
        const now = Date.now();
        const age = now - timestamp;
        
        // If cache is less than 1 hour old, use it
        if (age < CACHE_DURATION) {
          console.log('📦 Using cached user profile (age:', Math.round(age / 1000 / 60), 'minutes)');
          const parsedData = JSON.parse(cachedData);
          dispatch({ type: 'SET_USER', payload: parsedData });
          return;
        } else {
          console.log('⏰ User profile cache expired, fetching fresh data');
        }
      }
      
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'SET_ERROR', payload: null });
      
      console.log('🔄 Fetching user profile from API');
      const response = await apiClient.get('/user/profile') as any;
      if (response.success && response.user) {
        // Cache the data
        localStorage.setItem(CACHE_KEY, JSON.stringify(response.user));
        localStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString());
        dispatch({ type: 'SET_USER', payload: response.user });
      }
    } catch (error: any) {
      dispatch({ type: 'SET_ERROR', payload: error.message || 'Failed to fetch user profile' });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, []);

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

  const fetchBonusInfo = useCallback(async () => {
    // Skip bonus info fetch for admin users (admins don't have bonuses)
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        if (user.role === 'admin' || user.role === 'super_admin') {
          return;
        }
      } catch {
        // Ignore parse errors
      }
    }

    try {
      // Use unified bonus summary as single source of truth
      const summaryRes = await apiClient.get('/api/user/bonus-summary') as any;

      if (summaryRes?.success && summaryRes.data) {
        const summary: BonusSummary = summaryRes.data;
        dispatch({ type: 'SET_BONUS_SUMMARY', payload: summary });

        // Derive legacy BonusInfo shape from summary for backward compatibility
        const derivedBonusInfo: BonusInfo = {
          depositBonus: summary.depositBonuses?.unlocked || 0,
          referralBonus: summary.referralBonuses?.credited || 0,
          totalBonus:
            (summary.depositBonuses?.unlocked || 0) +
            (summary.referralBonuses?.credited || 0),
          wageringRequired: 0,
          wageringCompleted: 0,
          wageringProgress: 0,
          bonusLocked: false
        };

        dispatch({ type: 'SET_BONUS_INFO', payload: derivedBonusInfo });
      } else {
        // Fallback: clear on bad response
        dispatch({ type: 'SET_BONUS_SUMMARY', payload: null });
        dispatch({ type: 'SET_BONUS_INFO', payload: null });
      }
    } catch (error: any) {
      console.error('Failed to fetch bonus summary:', error);
      dispatch({ type: 'SET_ERROR', payload: error.message || 'Failed to fetch bonus information' });
      dispatch({ type: 'SET_BONUS_SUMMARY', payload: null });
    }
  }, []);

  const fetchReferralData = useCallback(async (forceRefresh = false) => {
    try {
      // ✅ FIX: Cache referral data for 24 hours to prevent flooding
      const CACHE_KEY = 'referral_data_cache';
      const CACHE_TIMESTAMP_KEY = 'referral_data_cache_timestamp';
      const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
      
      // Check cache first
      if (!forceRefresh) {
        const cachedData = localStorage.getItem(CACHE_KEY);
        const cacheTimestamp = localStorage.getItem(CACHE_TIMESTAMP_KEY);
        
        if (cachedData && cacheTimestamp) {
          const timestamp = parseInt(cacheTimestamp, 10);
          const now = Date.now();
          const age = now - timestamp;
          
          // If cache is less than 24 hours old, use it
          if (age < CACHE_DURATION) {
            console.log('📦 Using cached referral data (age:', Math.round(age / 1000 / 60), 'minutes)');
            const parsedData = JSON.parse(cachedData);
            dispatch({ type: 'SET_REFERRAL_DATA', payload: parsedData });
            return;
          } else {
            console.log('⏰ Referral data cache expired, fetching fresh data');
          }
        }
      }
      
      // Fetch fresh data
      console.log('🔄 Fetching referral data from API');
      // Use the authenticated referral data endpoint
      const response = await apiClient.get('/api/user/referral-data') as any;
      if (response.success && response.data) {
        // Cache the data
        localStorage.setItem(CACHE_KEY, JSON.stringify(response.data));
        localStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString());
        dispatch({ type: 'SET_REFERRAL_DATA', payload: response.data });
      }
    } catch (error: any) {
      // ✅ FIX: Log detailed error instead of silently caching fallback
      console.error('❌ Failed to fetch referral data:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
        endpoint: '/user/referral-data'
      });
      
      const fallbackData = { 
        totalReferrals: 0, 
        totalReferralEarnings: 0, 
        referredUsers: [],
        error: error.message || 'Failed to load referral data' // ✅ Track error state
      };
      
      // ✅ FIX: Only cache fallback for 5 minutes (not 24 hours) to allow retry
      const SHORT_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
      localStorage.setItem('referral_data_cache', JSON.stringify(fallbackData));
      localStorage.setItem('referral_data_cache_timestamp', Date.now().toString());
      localStorage.setItem('referral_data_cache_duration', SHORT_CACHE_DURATION.toString());
      
      dispatch({ 
        type: 'SET_REFERRAL_DATA', 
        payload: fallbackData
      });
      // Don't dispatch error - this is non-critical
    }
  }, []); // ✅ FIX: useCallback with empty deps to prevent infinite loops

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
      // Fix 1: Use correct endpoint /api/user/game-history
      const response = await apiClient.get(`/api/user/game-history?limit=${limit}&offset=${append ? offset : 0}&result=all`) as any;
      
      console.log('🎮 Game History API Response:', response);
      
      // Fix 2: Improved response parsing with better error detection
      let gamesRaw: any[] = [];
      let hasMore = false;
      
      // Handle multiple possible response structures
      if (response?.success && response?.data) {
        // Structure: { success: true, data: { games: [...], hasMore: true } }
        if (Array.isArray(response.data.games)) {
          gamesRaw = response.data.games;
          hasMore = Boolean(response.data.hasMore);
          console.log('✅ Found games in response.data.games:', gamesRaw.length);
        }
        // Structure: { success: true, data: { data: { games: [...] } } }
        else if (response.data.data && Array.isArray(response.data.data.games)) {
          gamesRaw = response.data.data.games;
          hasMore = Boolean(response.data.data.hasMore);
          console.log('✅ Found games in response.data.data.games:', gamesRaw.length);
        }
        // Structure: { success: true, data: [...] } (direct array)
        else if (Array.isArray(response.data)) {
          gamesRaw = response.data;
          hasMore = false;
          console.log('✅ Found games as direct array:', gamesRaw.length);
        }
        else {
          console.warn('⚠️ Unexpected response structure:', response);
        }
      } else {
        console.error('❌ Invalid API response:', response);
      }
      
      // Normalize field names from snake_case to camelCase (backend should send camelCase)
      const normalizeGameFields = (g: any) => {
        return {
          ...g,
          yourTotalBet: g.yourTotalBet ?? g.your_total_bet ?? 0,
          yourTotalPayout: g.yourTotalPayout ?? g.your_total_payout ?? 0,
          yourNetProfit: g.yourNetProfit ?? g.your_net_profit ?? 0,
          yourBets: g.yourBets ?? g.your_bets ?? [],
        };
      };
      
      const mappedGames: GameHistoryEntry[] = gamesRaw.map((g: any, index: number) => {
        // Normalize field names first
        const normalized = normalizeGameFields(g);
        
        // Trust backend calculations - no fallback recalculation needed
        // Backend already calculates these correctly in storage-supabase.ts
        const yourTotalBet = Number(normalized.yourTotalBet || 0);
        const yourTotalPayout = Number(normalized.yourTotalPayout || 0);
        const yourNetProfit = Number(normalized.yourNetProfit || 0);
        
        // Log only if values seem incorrect for debugging
        if (index === 0) {
          console.log(`📊 First game amounts:`, {
            yourTotalBet,
            yourTotalPayout,
            yourNetProfit,
            betsCount: normalized.yourBets?.length || 0
          });
        }

        // Improved result classification with better logic
        let result = g.result || normalized.result;
        if (!result) {
          if (yourTotalBet === 0) {
            result = 'no_bet';
          } else if (yourNetProfit > 0) {
            result = 'win';
          } else if (yourNetProfit < 0) {
            result = 'loss';
          } else {
            // Bet placed but no profit/loss (rare edge case)
            result = 'draw';
          }
        }

        const mappedGame = {
          id: String(g.id || g.gameId || g.game_id),
          gameId: String(g.gameId || g.game_id),
          openingCard: g.openingCard || g.opening_card || '',
          winner: g.winner || 'andar',
          yourBet: g.yourBet || g.your_bet || null,
          yourBets: Array.isArray(normalized.yourBets)
            ? normalized.yourBets.map((b: any) => ({
                id: String(b.id),
                side: b.side,
                amount: Number(b.amount || 0),
                round: Number(b.round || 1),
                payout: Number(b.payout || 0), // Backend now consistently sends 'payout'
                status: String(b.status || '')
              }))
            : [],
          yourTotalBet,
          yourTotalPayout,
          yourNetProfit,
          result,
          payout: yourTotalPayout,
          totalCards: Number(g.totalCards ?? g.total_cards ?? (g.dealtCards?.length ?? 0)),
          round: Number(g.round || g.winningRound || g.winning_round || 1),
          createdAt: g.createdAt || g.created_at ? new Date(g.createdAt || g.created_at) : new Date()
        };
        
        // Log first game for debugging
        if (index === 0) {
          console.log('📋 First mapped game:', mappedGame);
        }
        
        return mappedGame;
      });
      
      console.log(`✅ Successfully mapped ${mappedGames.length} games`);
      console.log('📊 Games breakdown:', {
        total: mappedGames.length,
        withBets: mappedGames.filter(g => g.yourTotalBet > 0).length,
        wins: mappedGames.filter(g => g.result === 'win').length,
        losses: mappedGames.filter(g => g.result === 'loss').length,
        noBets: mappedGames.filter(g => g.result === 'no_bet').length
      });
      
      if (response.success) {
        dispatch({
          type: 'SET_GAME_HISTORY',
          payload: {
            games: mappedGames,
            hasMore,
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
      const response = await apiClient.post('/api/payment-requests', {
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
        
        // Auto-open WhatsApp
        if (state.user) {
            try {
              const whatsappResponse = await apiClient.post<WhatsAppResponse>('/whatsapp/send-request', {
                userId: state.user.id,
                userPhone: state.user.mobile || state.user.username,
                requestType: 'DEPOSIT',
                message: `Request for ₹${amount}. Request ID: ${response.data.requestId}`,
                amount: amount,
                isUrgent: false
              });

              if (whatsappResponse.success && whatsappResponse.whatsappUrl) {
                window.open(whatsappResponse.whatsappUrl, '_blank');
              }
            } catch (error) {
              console.error('WhatsApp failed (non-critical):', error);
            }
        }
        
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
      
      const response = await apiClient.post('/api/payment-requests', {
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
        
        // Auto-open WhatsApp
        if (state.user) {
            try {
              const whatsappResponse = await apiClient.post<WhatsAppResponse>('/whatsapp/send-request', {
                userId: state.user.id,
                userPhone: state.user.mobile || state.user.username,
                requestType: 'WITHDRAWAL',
                message: `Request for ₹${amount}. Request ID: ${response.data.requestId}`,
                amount: amount,
                isUrgent: false
              });

              if (whatsappResponse.success && whatsappResponse.whatsappUrl) {
                window.open(whatsappResponse.whatsappUrl, '_blank');
              }
            } catch (error) {
              console.error('WhatsApp failed (non-critical):', error);
            }
        }
        
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

  // ✅ OPTIMIZED: Initialize essential data only, lazy load the rest
  useEffect(() => {
    const initializeData = async () => {
      const isLoggedIn = localStorage.getItem('isLoggedIn');
      const userStr = localStorage.getItem('user');
      
      if (isLoggedIn === 'true' && userStr) {
        try {
          const userData = JSON.parse(userStr);
          // Only fetch essential data for players (not all 6 endpoints)
          if (userData.role === 'player') {
            console.log('✅ Initializing player profile data (lazy load)');
            // Fetch only essential data - others will load when tabs are opened
            // ✅ FIX: These functions now have caching built-in, so they won't flood the API
            await fetchUserProfile();
            await fetchBonusInfo();
            // Don't fetch transactions/history/analytics until user navigates to those tabs
            // Don't fetch referral data until user opens referral tab (cached for 24 hours)
          } else {
            console.log('ℹ️ Skipping profile data fetch for admin user');
          }
        } catch (error) {
          console.error('❌ Failed to parse user data:', error);
        }
      }
    };
    
    initializeData();
  }, [fetchUserProfile, fetchBonusInfo]); // ✅ FIX: Added dependencies since functions are now stable with useCallback

  // Listen for balance updates
  useEffect(() => {
    const handleBalanceUpdate = (event: CustomEvent) => {
      const { balance } = event.detail;
      
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

    // Handle bonus updates from WebSocket
    const handleBonusUpdate = async (event: Event) => {
      const customEvent = event as CustomEvent;
      console.log('🎁 Bonus update received:', customEvent.detail);
      // Refresh bonus summary/bonus info and analytics when bonus changes
      await Promise.all([
        fetchBonusInfo(),
        fetchAnalytics()
      ]);
    };

    window.addEventListener('balance-updated', handleBalanceUpdate as EventListener);
    window.addEventListener('balance-websocket-update', handleWebSocketBalanceUpdate as EventListener);
    window.addEventListener('bonus_update', handleBonusUpdate as EventListener);
    
    return () => {
      window.removeEventListener('balance-updated', handleBalanceUpdate as EventListener);
      window.removeEventListener('balance-websocket-update', handleWebSocketBalanceUpdate as EventListener);
      window.removeEventListener('bonus_update', handleBonusUpdate as EventListener);
    };
  }, [state.analytics, fetchBonusInfo, fetchAnalytics]);

  // Enhance refreshData to include balance refresh
  const enhancedRefreshData = async () => {
    await refreshData();
    
    // Trigger balance refresh
    window.dispatchEvent(new CustomEvent('balance-refresh-requested', {
      detail: { source: 'profile-refresh', timestamp: Date.now() }
    }));
  };

  // ✅ REMOVED: Auto-refresh bonus info interval
  // WebSocket provides real-time bonus updates when they change
  // No need for polling - reduces API calls and improves performance

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
