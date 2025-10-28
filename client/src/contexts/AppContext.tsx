import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { GameState, initializeGameState } from '@/components/GameLogic/GameLogic';
import type { RoundBets } from '../types/game';
import { storage } from '../lib/utils';
import { useAuth } from './AuthContext';

// Define PlayerBets interface (extends UserBets with currentBet)
interface PlayerBets {
  round1: RoundBets;
  round2: RoundBets;
  currentBet: number;
}

// Define context state type
interface AppState {
  gameState: GameState;
  playerBets: PlayerBets;
  notifications: Array<{ id: string; message: string; type: 'success' | 'error' | 'warning' | 'info'; timestamp: number }>;
  selectedChip: number | null;
  chipAmounts: number[];
  loading: boolean;
  theme: 'light' | 'dark';
  language: 'en' | 'hi' | 'te';
}

// Define action types
type AppAction =
  | { type: 'SET_GAME_STATE'; payload: Partial<GameState> }
  | { type: 'ADD_NOTIFICATION'; payload: { message: string; type: 'success' | 'error' | 'warning' | 'info' } }
  | { type: 'REMOVE_NOTIFICATION'; payload: string }
  | { type: 'PLACE_BET'; side: 'andar' | 'bahar'; amount: number }
  | { type: 'SET_SELECTED_CHIP'; payload: number }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_THEME'; payload: 'light' | 'dark' }
  | { type: 'SET_LANGUAGE'; payload: 'en' | 'hi' | 'te' }
  | { type: 'RESET_APP' };

// Initialize state
const initialState: AppState = {
  gameState: initializeGameState(),
  playerBets: {
    round1: { andar: 0, bahar: 0 },
    round2: { andar: 0, bahar: 0 },
    currentBet: 0
  },
  notifications: [],
  selectedChip: null,
  chipAmounts: [100, 500, 1000, 5000, 10000, 25000, 50000, 100000],
  loading: false,
  theme: 'dark',
  language: 'en'
};

// Reducer function
const appReducer = (state: AppState, action: AppAction): AppState => {
  switch (action.type) {
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
      
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
      
    case 'SET_THEME':
      return { ...state, theme: action.payload };
      
    case 'SET_LANGUAGE':
      return { ...state, language: action.payload };
      
    case 'RESET_APP':
      return {
        ...initialState,
        chipAmounts: state.chipAmounts, // Keep chip amounts
        theme: state.theme, // Keep theme
        language: state.language, // Keep language
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
  removeNotification: (id: string) => void;
  placeBet: (side: 'andar' | 'bahar', amount: number) => void;
  setSelectedChip: (amount: number) => void;
  setLoading: (loading: boolean) => void;
  setTheme: (theme: 'light' | 'dark') => void;
  setLanguage: (language: 'en' | 'hi' | 'te') => void;
  resetApp: () => void;
} | undefined>(undefined);

// App provider component
export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, initialState);
  const { state: authState } = useAuth(); // Get auth state from unified AuthContext
  
  // Load saved preferences on mount
  useEffect(() => {
    const savedTheme = storage.get<'light' | 'dark'>('theme', 'dark');
    const savedLanguage = storage.get<'en' | 'hi' | 'te'>('language', 'en');
    
    if (savedTheme) {
      dispatch({ type: 'SET_THEME', payload: savedTheme });
    }
    
    if (savedLanguage) {
      dispatch({ type: 'SET_LANGUAGE', payload: savedLanguage });
    }
  }, []);
  
  // Save preferences when they change
  useEffect(() => {
    storage.set('theme', state.theme);
  }, [state.theme]);
  
  useEffect(() => {
    storage.set('language', state.language);
  }, [state.language]);
  
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
  
  // Apply theme to document
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', state.theme);
      document.documentElement.className = state.theme;
    }
  }, [state.theme]);
  
  // Helper functions
  const addNotification = (message: string, type: 'success' | 'error' | 'warning' | 'info') => {
    dispatch({ type: 'ADD_NOTIFICATION', payload: { message, type } });
  };
  
  const removeNotification = (id: string) => {
    dispatch({ type: 'REMOVE_NOTIFICATION', payload: id });
  };
  
  const placeBet = (side: 'andar' | 'bahar', amount: number) => {
    dispatch({ type: 'PLACE_BET', side, amount });
  };
  
  const setSelectedChip = (amount: number) => {
    dispatch({ type: 'SET_SELECTED_CHIP', payload: amount });
  };
  

  
  const setLoading = (loading: boolean) => {
    dispatch({ type: 'SET_LOADING', payload: loading });
  };
  
  const setTheme = (theme: 'light' | 'dark') => {
    dispatch({ type: 'SET_THEME', payload: theme });
  };
  
  const setLanguage = (language: 'en' | 'hi' | 'te') => {
    dispatch({ type: 'SET_LANGUAGE', payload: language });
  };
  
  const resetApp = () => {
    dispatch({ type: 'RESET_APP' });
  };
  
  const value = {
    state,
    dispatch,
    addNotification,
    removeNotification,
    placeBet,
    setSelectedChip,
    setLoading,
    setTheme,
    setLanguage,
    resetApp
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

// Custom hooks for specific parts of the state
export const useAppAuth = () => {
  const { state } = useApp();
  return {
    user: state.user,
    isAuthenticated: state.isAuthenticated,
    authChecked: state.authChecked,
    loading: state.loading
  };
};

export const useGame = () => {
  const { state, placeBet, setSelectedChip } = useApp();
  return {
    gameState: state.gameState,
    playerBets: state.playerBets,
    selectedChip: state.selectedChip,
    chipAmounts: state.chipAmounts,
    placeBet,
    setSelectedChip
  };
};

export const useNotifications = () => {
  const { state, addNotification, removeNotification } = useApp();
  return {
    notifications: state.notifications,
    addNotification,
    removeNotification
  };
};

export const usePreferences = () => {
  const { state, setTheme, setLanguage } = useApp();
  return {
    theme: state.theme,
    language: state.language,
    setTheme,
    setLanguage
  };
};
