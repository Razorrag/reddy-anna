import React, { createContext, useContext, useReducer, ReactNode, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';
import { useBalance } from './BalanceContext';
import { apiClient } from '@/lib/api-client';
import { formatCurrency } from '@/lib/format-utils';
import type {
  Card,
  GamePhase,
  GameRound,
  GameWinner,
  BetSide,
  RoundBets,
  DealtCard,
  Bet,
  GameHistoryEntry,
  BetInfo
} from '@/types/game';

// Enhanced GameState interface using shared types
interface GameState {
  // Game identification
  id: string;
  gameId: string;

  // Game status
  status: 'waiting' | 'betting' | 'dealing' | 'revealing' | 'completed';

  // Card state
  selectedOpeningCard: Card | null;
  andarCards: Card[];
  baharCards: Card[];
  dealtCards: DealtCard[];
  usedCards: Card[]; // Track all cards used in the game
  andarCard?: Card;
  baharCard?: Card;

  // Game flow
  phase: GamePhase;
  currentRound: GameRound;
  timeRemaining: number;
  countdownTimer: number;
  isGameActive: boolean;
  bettingLocked: boolean;

  // Winner state
  gameWinner: GameWinner;
  winningSide?: 'andar' | 'bahar';
  winningCard: Card | null;

  // Betting state - total from all players
  andarTotalBet: number;
  baharTotalBet: number;
  bets: Bet[];

  // Round-specific total bets
  round1Bets: RoundBets;
  round2Bets: RoundBets;

  // Game history
  history: GameHistoryEntry[];

  // User-specific data
  userId: string | null;
  username: string | null;
  userRole: 'player' | 'admin';
  playerWallet: number;

  // Player's individual bets per round (cumulative totals from server)
  playerRound1Bets: RoundBets;  // Stores numbers (cumulative totals)
  playerRound2Bets: RoundBets;  // Stores numbers (cumulative totals)

  // ✅ NEW: Bet history for undo functionality (stores individual bets)
  playerRound1BetHistory: { andar: BetInfo[]; bahar: BetInfo[] };
  playerRound2BetHistory: { andar: BetInfo[]; bahar: BetInfo[] };

  isScreenSharingActive: boolean;
  lastCelebration?: any;
  showCelebration?: boolean;
}

// Helper functions to work with BetInfo arrays
const toBetInfoArray = (bets: number[] | BetInfo[]): BetInfo[] => {
  if (bets.length === 0) return [];
  if (typeof bets[0] === 'number') {
    // Convert number array to BetInfo array (for backward compatibility)
    return (bets as number[]).map((amount, index) => ({
      amount,
      betId: `temp-${Date.now()}-${index}`,
      timestamp: Date.now() - (bets.length - index) * 1000 // Approximate timestamps
    }));
  }
  return bets as BetInfo[];
};

const getBetAmounts = (bets: number[] | BetInfo[]): number[] => {
  if (bets.length === 0) return [];
  if (typeof bets[0] === 'number') {
    return bets as number[];
  }
  return (bets as BetInfo[]).map(bet => bet.amount);
};

type GameStateAction =
  | { type: 'SET_GAME_ID'; payload: string }
  | { type: 'SET_OPENING_CARD'; payload: Card }
  | { type: 'ADD_ANDAR_CARD'; payload: Card }
  | { type: 'ADD_BAHAR_CARD'; payload: Card }
  | { type: 'ADD_DEALT_CARD'; payload: DealtCard }
  | { type: 'ADD_USED_CARD'; payload: Card }
  | { type: 'SET_PHASE'; payload: GamePhase }
  | { type: 'SET_COUNTDOWN'; payload: number }
  | { type: 'SET_WINNER'; payload: GameWinner }
  | { type: 'RESET_GAME' }
  | { type: 'SET_GAME_ACTIVE'; payload: boolean }
  | { type: 'SET_BETTING_LOCKED'; payload: boolean }
  | { type: 'SET_CURRENT_ROUND'; payload: GameRound }
  | { type: 'UPDATE_TOTAL_BETS'; payload: { andar: number; bahar: number } }
  | { type: 'UPDATE_PLAYER_WALLET'; payload: number }
  | { type: 'SET_USER_ROLE'; payload: 'player' | 'admin' }
  | { type: 'UPDATE_ROUND_BETS'; payload: { round: GameRound; bets: RoundBets } }
  | { type: 'SET_WINNING_CARD'; payload: Card }
  | { type: 'SET_USER_DATA'; payload: { userId: string; username: string; wallet: number } }
  | { type: 'UPDATE_PLAYER_ROUND_BETS'; payload: { round: GameRound; bets: RoundBets } }
  | { type: 'ADD_BET_TO_HISTORY'; payload: { round: GameRound; side: BetSide; betInfo: BetInfo } }
  | { type: 'REMOVE_LAST_BET'; payload: { round: GameRound; side: BetSide } }
  | { type: 'CLEAR_ROUND_BETS'; payload: { round: GameRound; side?: BetSide } }
  | { type: 'SET_SCREEN_SHARING'; payload: boolean }
  | { type: 'CLEAR_CARDS' }
  | { type: 'SHOW_CELEBRATION'; payload: any }
  | { type: 'HIDE_CELEBRATION' };

const initialState: GameState = {
  id: '',
  gameId: '',
  status: 'waiting',
  selectedOpeningCard: null,
  andarCards: [],
  baharCards: [],
  dealtCards: [],
  usedCards: [],
  phase: 'idle',
  currentRound: 1,
  timeRemaining: 0,
  countdownTimer: 0,
  isGameActive: false,
  bettingLocked: false,
  gameWinner: null,
  winningCard: null,
  andarTotalBet: 0,
  baharTotalBet: 0,
  bets: [],
  round1Bets: { andar: 0, bahar: 0 },
  round2Bets: { andar: 0, bahar: 0 },
  history: [],
  userId: null,
  username: null,
  userRole: 'player',
  playerWallet: 0,
  playerRound1Bets: { andar: 0, bahar: 0 },  // Simple numbers
  playerRound2Bets: { andar: 0, bahar: 0 },  // Simple numbers

  // ✅ NEW: Initialize bet history
  playerRound1BetHistory: { andar: [], bahar: [] },
  playerRound2BetHistory: { andar: [], bahar: [] },

  isScreenSharingActive: false,
  lastCelebration: null,
  showCelebration: false
};

const gameReducer = (state: GameState, action: GameStateAction): GameState => {
  switch (action.type) {
    case 'SET_GAME_ID':
      return { ...state, gameId: action.payload };
    case 'SET_OPENING_CARD':
      // Add opening card to usedCards if not already there
      const isOpeningCardUsed = state.usedCards.some(c => c.id === action.payload.id);
      const updatedUsedCards = isOpeningCardUsed ? state.usedCards : [...state.usedCards, action.payload];
      return {
        ...state,
        selectedOpeningCard: action.payload,
        usedCards: updatedUsedCards
      };
    case 'ADD_ANDAR_CARD': {
      // ✅ FIX: Check for duplicate cards before adding
      const isDuplicateAndar = state.andarCards.some(c =>
        c.id === action.payload.id ||
        (c.display === action.payload.display && c.suit === action.payload.suit)
      );

      if (isDuplicateAndar) {
        console.warn('⚠️ Duplicate Andar card detected, skipping:', action.payload.display);
        return state;
      }

      // Add to usedCards if not already there
      const isAndarCardUsed = state.usedCards.some(c => c.id === action.payload.id);
      return {
        ...state,
        andarCards: [...state.andarCards, action.payload],
        usedCards: isAndarCardUsed ? state.usedCards : [...state.usedCards, action.payload]
      };
    }
    case 'ADD_BAHAR_CARD': {
      // ✅ FIX: Check for duplicate cards before adding
      const isDuplicateBahar = state.baharCards.some(c =>
        c.id === action.payload.id ||
        (c.display === action.payload.display && c.suit === action.payload.suit)
      );

      if (isDuplicateBahar) {
        console.warn('⚠️ Duplicate Bahar card detected, skipping:', action.payload.display);
        return state;
      }

      // Add to usedCards if not already there
      const isBaharCardUsed = state.usedCards.some(c => c.id === action.payload.id);
      return {
        ...state,
        baharCards: [...state.baharCards, action.payload],
        usedCards: isBaharCardUsed ? state.usedCards : [...state.usedCards, action.payload]
      };
    }
    case 'ADD_DEALT_CARD':
      return { ...state, dealtCards: [...state.dealtCards, action.payload] };
    case 'ADD_USED_CARD':
      // Add card to usedCards if not already there
      const isCardAlreadyUsed = state.usedCards.some(c => c.id === action.payload.id);
      return {
        ...state,
        usedCards: isCardAlreadyUsed ? state.usedCards : [...state.usedCards, action.payload]
      };
    case 'SET_PHASE':
      return { ...state, phase: action.payload };
    case 'SET_COUNTDOWN':
      return { ...state, countdownTimer: action.payload };
    case 'SET_WINNER':
      return { ...state, gameWinner: action.payload, phase: 'complete' };
    case 'RESET_GAME':
      return {
        ...initialState,
        userId: state.userId,
        username: state.username,
        playerWallet: state.playerWallet,
        userRole: state.userRole,
        usedCards: [], // Clear used cards on game reset
        andarCards: [], // Clear cards from previous game
        baharCards: [], // Clear cards from previous game
        selectedOpeningCard: null, // Clear opening card
        showCelebration: false, // ✅ FIX: Explicitly clear celebration on reset
        lastCelebration: null, // ✅ FIX: Clear celebration data on reset
        playerRound1BetHistory: { andar: [], bahar: [] }, // ✅ Clear bet history
        playerRound2BetHistory: { andar: [], bahar: [] }, // ✅ Clear bet history
      };
    case 'SET_GAME_ACTIVE':
      return { ...state, isGameActive: action.payload };
    case 'SET_BETTING_LOCKED':
      return { ...state, bettingLocked: action.payload };
    case 'SET_CURRENT_ROUND':
      return { ...state, currentRound: action.payload };
    case 'UPDATE_TOTAL_BETS':
      return { ...state, andarTotalBet: action.payload.andar, baharTotalBet: action.payload.bahar };
    case 'UPDATE_PLAYER_WALLET':
      return { ...state, playerWallet: action.payload };
    case 'SET_USER_ROLE':
      return { ...state, userRole: action.payload };
    case 'UPDATE_ROUND_BETS':
      if (action.payload.round === 1) {
        // ✅ FIX: Create new object to ensure React detects the change
        const newRound1Bets = {
          andar: action.payload.bets.andar || 0,
          bahar: action.payload.bets.bahar || 0
        };
        console.log('🔄 GameState: Updating round1Bets from', state.round1Bets, 'to', newRound1Bets);
        return { ...state, round1Bets: newRound1Bets };
      } else if (action.payload.round === 2) {
        // ✅ FIX: Create new object to ensure React detects the change
        const newRound2Bets = {
          andar: action.payload.bets.andar || 0,
          bahar: action.payload.bets.bahar || 0
        };
        console.log('🔄 GameState: Updating round2Bets from', state.round2Bets, 'to', newRound2Bets);
        return { ...state, round2Bets: newRound2Bets };
      }
      return state;
    case 'SET_WINNING_CARD':
      return { ...state, winningCard: action.payload };
    case 'SET_USER_DATA':
      return {
        ...state,
        userId: action.payload.userId,
        username: action.payload.username,
        playerWallet: action.payload.wallet
      };
    case 'UPDATE_PLAYER_ROUND_BETS':
      if (action.payload.round === 1) {
        return { ...state, playerRound1Bets: action.payload.bets };
      } else if (action.payload.round === 2) {
        return { ...state, playerRound2Bets: action.payload.bets };
      }
      return state;

    case 'ADD_BET_TO_HISTORY': {
      // ✅ NEW: Add bet to history for undo functionality
      const { round, side, betInfo } = action.payload;
      if (round === 1) {
        return {
          ...state,
          playerRound1BetHistory: {
            ...state.playerRound1BetHistory,
            [side]: [...state.playerRound1BetHistory[side], betInfo]
          }
        };
      } else if (round === 2) {
        return {
          ...state,
          playerRound2BetHistory: {
            ...state.playerRound2BetHistory,
            [side]: [...state.playerRound2BetHistory[side], betInfo]
          }
        };
      }
      return state;
    }
    case 'REMOVE_LAST_BET': {
      // ✅ FIXED: Remove last bet from history and update cumulative total
      const { round, side } = action.payload;
      console.log(`🔍 REMOVE_LAST_BET - Round: ${round}, Side: ${side}`);

      if (round === 1) {
        const betHistory = state.playerRound1BetHistory[side];

        if (betHistory.length === 0) {
          console.log('⚠️ No bets to remove!');
          return state;
        }

        const lastBet = betHistory[betHistory.length - 1];
        const newBetHistory = betHistory.slice(0, -1);
        const currentTotal = typeof state.playerRound1Bets[side] === 'number'
          ? state.playerRound1Bets[side]
          : 0;
        const newTotal = Math.max(0, currentTotal - lastBet.amount);

        console.log(`✅ Removed bet: ₹${lastBet.amount}, New total: ₹${newTotal}`);

        return {
          ...state,
          playerRound1BetHistory: {
            ...state.playerRound1BetHistory,
            [side]: newBetHistory
          },
          playerRound1Bets: {
            ...state.playerRound1Bets,
            [side]: newTotal
          }
        };
      } else if (round === 2) {
        const betHistory = state.playerRound2BetHistory[side];

        if (betHistory.length === 0) {
          console.log('⚠️ No bets to remove!');
          return state;
        }

        const lastBet = betHistory[betHistory.length - 1];
        const newBetHistory = betHistory.slice(0, -1);
        const currentTotal = typeof state.playerRound2Bets[side] === 'number'
          ? state.playerRound2Bets[side]
          : 0;
        const newTotal = Math.max(0, currentTotal - lastBet.amount);

        console.log(`✅ Removed bet: ₹${lastBet.amount}, New total: ₹${newTotal}`);

        return {
          ...state,
          playerRound2BetHistory: {
            ...state.playerRound2BetHistory,
            [side]: newBetHistory
          },
          playerRound2Bets: {
            ...state.playerRound2Bets,
            [side]: newTotal
          }
        };
      }
      return state;
    }
    case 'CLEAR_ROUND_BETS': {
      // ✅ FIXED: Clear bets and history for a specific round and side
      const { round, side } = action.payload;
      if (round === 1) {
        if (side) {
          // Clear specific side only
          return {
            ...state,
            playerRound1Bets: {
              ...state.playerRound1Bets,
              [side]: 0
            },
            playerRound1BetHistory: {
              ...state.playerRound1BetHistory,
              [side]: []
            }
          };
        } else {
          // Clear both sides
          return {
            ...state,
            playerRound1Bets: { andar: 0, bahar: 0 },
            playerRound1BetHistory: { andar: [], bahar: [] }
          };
        }
      } else if (round === 2) {
        if (side) {
          // Clear specific side only
          return {
            ...state,
            playerRound2Bets: {
              ...state.playerRound2Bets,
              [side]: 0
            },
            playerRound2BetHistory: {
              ...state.playerRound2BetHistory,
              [side]: []
            }
          };
        } else {
          // Clear both sides
          return {
            ...state,
            playerRound2Bets: { andar: 0, bahar: 0 },
            playerRound2BetHistory: { andar: [], bahar: [] }
          };
        }
      }
      return state;
    }
    case 'SET_SCREEN_SHARING':
      return { ...state, isScreenSharingActive: action.payload };
    case 'CLEAR_CARDS':
      return {
        ...state,
        selectedOpeningCard: null,  // ✅ Now clears opening card
        andarCards: [],
        baharCards: [],
        dealtCards: [],
        winningCard: null,  // ✅ Now clears winning card
        usedCards: [] // Clear used cards tracking
      };
    case 'SHOW_CELEBRATION':
      console.log('🎊 SHOW_CELEBRATION reducer action:', action.payload);
      return {
        ...state,
        lastCelebration: action.payload,
        showCelebration: true
      };
    case 'HIDE_CELEBRATION':
      console.log('🎊 HIDE_CELEBRATION reducer action');
      return {
        ...state,
        showCelebration: false
      };
    default:
      return state;
  }
};

interface GameStateContextType {
  gameState: GameState;
  setGameId: (id: string) => void;
  setSelectedOpeningCard: (card: Card) => void;
  addAndarCard: (card: Card) => void;
  addBaharCard: (card: Card) => void;
  addDealtCard: (card: DealtCard) => void;
  addUsedCard: (card: Card) => void;
  setPhase: (phase: GamePhase) => void;
  setCountdown: (time: number) => void;
  setWinner: (winner: GameWinner) => void;
  resetGame: () => void;
  setGameActive: (active: boolean) => void;
  setBettingLocked: (locked: boolean) => void;
  setCurrentRound: (round: GameRound) => void;
  updateTotalBets: (bets: { andar: number; bahar: number }) => void;
  updatePlayerWallet: (wallet: number) => void;
  setUserRole: (role: 'player' | 'admin') => void;
  updateRoundBets: (round: GameRound, bets: RoundBets) => void;
  setWinningCard: (card: Card) => void;
  setUserData: (userData: { userId: string; username: string; wallet: number }) => void;
  updatePlayerRoundBets: (round: GameRound, bets: RoundBets) => void;
  addBetToHistory: (round: GameRound, side: BetSide, betInfo: BetInfo) => void;
  clearCards: () => void;
  placeBet: (side: BetSide, amount: number, betId?: string) => void;
  removeLastBet: (round: GameRound, side: BetSide) => void;
  clearRoundBets: (round: GameRound, side?: BetSide) => void;
  resetBettingData: () => void;
  setScreenSharing: (isSharing: boolean) => void;
  phase: GamePhase;
  setCelebration: (data: any) => void;
  hideCelebration: () => void;
}

const GameStateContext = createContext<GameStateContextType | undefined>(undefined);

export const GameStateProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [gameState, dispatch] = useReducer(gameReducer, initialState);

  // Initialize from AuthContext with improved error handling
  const auth = useAuth();
  const { balance, updateBalance, validateBalance } = useBalance();

  useEffect(() => {
    // Initialize from auth state directly inside useEffect (no nested function)
    const { user, isAuthenticated } = auth;

    if (isAuthenticated && user) {
      // Convert balance to number if it's a string
      const balanceAsNumber = typeof user.balance === 'string'
        ? parseFloat(user.balance)
        : Number(user.balance);

      dispatch({
        type: 'SET_USER_DATA',
        payload: {
          userId: user.id || user.phone || 'user',
          username: user.username || user.full_name || user.phone || 'Player',
          wallet: isNaN(balanceAsNumber) ? 0 : balanceAsNumber
        }
      });
      dispatch({
        type: 'SET_USER_ROLE',
        payload: user.role === 'super_admin' ? 'admin' : (user.role || 'player')
      });

      // Fetch fresh balance on mount/refresh
      const fetchBalance = async () => {
        try {
          const balanceRes = await apiClient.get<{ success: boolean, balance: number }>('/user/balance');
          if (balanceRes.success && balanceRes.balance !== undefined) {
            const balanceNum = Number(balanceRes.balance);
            if (!isNaN(balanceNum)) {
              dispatch({
                type: 'UPDATE_PLAYER_WALLET',
                payload: balanceNum
              });
            }
          }
        } catch (error) {
          console.error('Error fetching balance on mount:', error);
        }
      };

      fetchBalance();
    } else {
      // Initialize with default guest user
      dispatch({
        type: 'SET_USER_DATA',
        payload: {
          userId: 'guest',
          username: 'Guest Player',
          wallet: 0
        }
      });
      dispatch({
        type: 'SET_USER_ROLE',
        payload: 'player'
      });
    }
  }, [auth.user, auth.isAuthenticated, auth.token]); // Add token to dependencies to update when token changes

  // Add separate effect to update balance when user balance changes
  useEffect(() => {
    const { user, isAuthenticated } = auth;

    if (isAuthenticated && user && user.balance !== undefined) {
      // Convert to number if it's a string
      const balanceAsNumber = typeof user.balance === 'string'
        ? parseFloat(user.balance)
        : Number(user.balance);

      dispatch({
        type: 'UPDATE_PLAYER_WALLET',
        payload: isNaN(balanceAsNumber) ? 0 : balanceAsNumber
      });
    }
  }, [auth.user?.balance, auth.isAuthenticated]); // Only update when balance changes

  // Add balance refresh function - only for non-admin users
  const refreshBalanceFromAPI = useCallback(async () => {
    // Skip balance fetch for admin users
    if (gameState.userRole === 'admin') {
      console.log('ℹ️ Skipping balance refresh for admin user');
      return gameState.playerWallet;
    }

    try {
      const response = await apiClient.get<{ success: boolean, balance: number, error?: string }>('/user/balance');
      if (response.success && response.balance !== gameState.playerWallet) {
        dispatch({
          type: 'UPDATE_PLAYER_WALLET',
          payload: response.balance
        });
        await updateBalance(response.balance, 'api', 'refresh', 0);
        return response.balance;
      }
    } catch (error) {
      console.error('Failed to refresh balance:', error);
    }
    return gameState.playerWallet;
  }, [gameState.playerWallet, gameState.userRole, updateBalance]);

  // Listen for balance updates from BalanceContext
  useEffect(() => {
    const handleBalanceUpdate = (event: CustomEvent) => {
      const { balance: newBalance, source } = event.detail;

      // Convert to number if it's a string
      const balanceAsNumber = typeof newBalance === 'string'
        ? parseFloat(newBalance)
        : Number(newBalance);

      if (!isNaN(balanceAsNumber) && balanceAsNumber !== gameState.playerWallet) {
        dispatch({
          type: 'UPDATE_PLAYER_WALLET',
          payload: balanceAsNumber
        });
      }
    };

    const handleWebSocketBalanceUpdate = (event: CustomEvent) => {
      const { balance: newBalance } = event.detail;

      // Convert to number if it's a string
      const balanceAsNumber = typeof newBalance === 'string'
        ? parseFloat(newBalance)
        : Number(newBalance);

      if (!isNaN(balanceAsNumber) && balanceAsNumber !== gameState.playerWallet) {
        dispatch({
          type: 'UPDATE_PLAYER_WALLET',
          payload: balanceAsNumber
        });
      }
    };

    window.addEventListener('balance-updated', handleBalanceUpdate as EventListener);
    window.addEventListener('balance-websocket-update', handleWebSocketBalanceUpdate as EventListener);

    return () => {
      window.removeEventListener('balance-updated', handleBalanceUpdate as EventListener);
      window.removeEventListener('balance-websocket-update', handleWebSocketBalanceUpdate as EventListener);
    };
  }, [gameState.playerWallet]);

  // ❌ REMOVED: Duplicate periodic balance refresh
  // BalanceContext already has a 30-second interval for balance refresh
  // This was causing double API calls and UI jumping
  // Keeping this commented for reference:
  /*
  useEffect(() => {
    if (gameState.userRole === 'admin') {
      console.log('ℹ️ Skipping periodic balance refresh for admin user');
      return;
    }

    const interval = setInterval(async () => {
      if (auth.isAuthenticated && !gameState.isGameActive) {
        await refreshBalanceFromAPI();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [auth.isAuthenticated, gameState.isGameActive, gameState.userRole, refreshBalanceFromAPI]);
  */

  // Dispatchers for all actions
  const setGameId = (id: string) => {
    dispatch({ type: 'SET_GAME_ID', payload: id });
  };

  const setSelectedOpeningCard = (card: Card) => {
    dispatch({ type: 'SET_OPENING_CARD', payload: card });
  };

  const addAndarCard = (card: Card) => {
    dispatch({ type: 'ADD_ANDAR_CARD', payload: card });
  };

  const addBaharCard = (card: Card) => {
    dispatch({ type: 'ADD_BAHAR_CARD', payload: card });
  };

  const addDealtCard = (card: DealtCard) => {
    dispatch({ type: 'ADD_DEALT_CARD', payload: card });
  };

  const addUsedCard = (card: Card) => {
    dispatch({ type: 'ADD_USED_CARD', payload: card });
  };

  const setPhase = (phase: GamePhase) => {
    dispatch({ type: 'SET_PHASE', payload: phase });
  };

  const setCountdown = (time: number) => {
    dispatch({ type: 'SET_COUNTDOWN', payload: time });
  };

  const setWinner = (winner: GameWinner) => {
    dispatch({ type: 'SET_WINNER', payload: winner });
  };

  const resetGame = () => {
    dispatch({ type: 'RESET_GAME' });
  };

  const setGameActive = (active: boolean) => {
    dispatch({ type: 'SET_GAME_ACTIVE', payload: active });
  };

  const setBettingLocked = (locked: boolean) => {
    dispatch({ type: 'SET_BETTING_LOCKED', payload: locked });
  };

  const setCurrentRound = (round: GameRound) => {
    dispatch({ type: 'SET_CURRENT_ROUND', payload: round });
  };

  const updateTotalBets = (bets: { andar: number; bahar: number }) => {
    dispatch({ type: 'UPDATE_TOTAL_BETS', payload: bets });
  };

  const updatePlayerWallet = (wallet: number) => {
    dispatch({ type: 'UPDATE_PLAYER_WALLET', payload: wallet });
  };

  const setUserRole = (role: 'player' | 'admin') => {
    dispatch({ type: 'SET_USER_ROLE', payload: role });
  };

  const updateRoundBets = (round: GameRound, bets: RoundBets) => {
    dispatch({ type: 'UPDATE_ROUND_BETS', payload: { round, bets } });
  };

  const setWinningCard = (card: Card) => {
    dispatch({ type: 'SET_WINNING_CARD', payload: card });
  };

  const setUserData = (userData: { userId: string; username: string; wallet: number }) => {
    dispatch({ type: 'SET_USER_DATA', payload: userData });
    // Don't write to localStorage directly - let AuthContext handle persistence
    // The role is now managed by AuthContext, not hardcoded as 'player'
  };

  const updatePlayerRoundBets = (round: GameRound, bets: RoundBets) => {
    dispatch({ type: 'UPDATE_PLAYER_ROUND_BETS', payload: { round, bets } });
  };

  const clearCards = () => {
    dispatch({ type: 'CLEAR_CARDS' });
  };

  const setScreenSharing = (isSharing: boolean) => {
    dispatch({ type: 'SET_SCREEN_SHARING', payload: isSharing });
  };

  const setCelebration = (data: any) => {
    dispatch({ type: 'SHOW_CELEBRATION', payload: data });
  };

  const hideCelebration = () => {
    dispatch({ type: 'HIDE_CELEBRATION' });
  };

  // ✅ NEW: Add bet to history for undo functionality
  const addBetToHistory = (round: GameRound, side: BetSide, betInfo: BetInfo) => {
    dispatch({ type: 'ADD_BET_TO_HISTORY', payload: { round, side, betInfo } });
  };

  const resetBettingData = () => {
    dispatch({ type: 'UPDATE_TOTAL_BETS', payload: { andar: 0, bahar: 0 } });
    dispatch({ type: 'UPDATE_ROUND_BETS', payload: { round: 1, bets: { andar: 0, bahar: 0 } } });
    dispatch({ type: 'UPDATE_ROUND_BETS', payload: { round: 2, bets: { andar: 0, bahar: 0 } } });
    dispatch({ type: 'UPDATE_PLAYER_ROUND_BETS', payload: { round: 1, bets: { andar: 0, bahar: 0 } } });
    dispatch({ type: 'UPDATE_PLAYER_ROUND_BETS', payload: { round: 2, bets: { andar: 0, bahar: 0 } } });
  };

  // ✅ FIX: Counter for unique bet IDs only - NO QUEUE BLOCKING
  const betCounterRef = useRef<number>(0);

  const placeBet = async (side: BetSide, amount: number, betId?: string) => {
    // ✅ OPTIMISTIC UPDATE: Immediately add to local total
    console.log(`🎯 INSTANT BET: ₹${amount} on ${side.toUpperCase()} - Round ${gameState.currentRound}`);

    // Validate balance before placing bet
    const isValidBalance = await validateBalance();
    if (!isValidBalance) {
      console.warn('Balance validation failed, skipping bet placement');
      return;
    }

    // Ensure playerWallet is treated as a number for comparison
    const currentBalance = Number(gameState.playerWallet);
    if (isNaN(currentBalance) || currentBalance < amount) {
      console.warn('Insufficient balance for bet or invalid balance value');
      return;
    }

    // ✅ Generate betId for tracking
    const finalBetId = betId || `bet-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // ✅ INSTANT UPDATE: Add to cumulative total immediately
    if (gameState.currentRound === 1) {
      const currentTotal = typeof gameState.playerRound1Bets[side] === 'number'
        ? gameState.playerRound1Bets[side]
        : 0;
      updatePlayerRoundBets(1, {
        ...gameState.playerRound1Bets,
        [side]: currentTotal + amount
      });

      // ✅ Add to bet history for undo
      addBetToHistory(1, side, {
        amount,
        betId: finalBetId,
        timestamp: Date.now()
      });

      console.log(`✅ INSTANT: Round 1 ${side} updated to ₹${currentTotal + amount}`);
    } else if (gameState.currentRound === 2) {
      const currentTotal = typeof gameState.playerRound2Bets[side] === 'number'
        ? gameState.playerRound2Bets[side]
        : 0;
      updatePlayerRoundBets(2, {
        ...gameState.playerRound2Bets,
        [side]: currentTotal + amount
      });

      // ✅ Add to bet history for undo
      addBetToHistory(2, side, {
        amount,
        betId: finalBetId,
        timestamp: Date.now()
      });

      console.log(`✅ INSTANT: Round 2 ${side} updated to ₹${currentTotal + amount}`);
    }

    // ✅ INSTANT UPDATE #2: Deduct money from balance IMMEDIATELY (0ms)
    const newBalance = currentBalance - amount;
    updatePlayerWallet(newBalance);
    console.log(`✅ INSTANT: Balance updated ₹${currentBalance.toLocaleString('en-IN')} → ₹${newBalance.toLocaleString('en-IN')}`);

    // ✅ UPDATE: Dispatch immediate balance update for other components
    const instantBalanceEvent = new CustomEvent('balance-instant-update', {
      detail: {
        balance: newBalance,
        amount: -amount,
        type: 'bet_optimistic',
        timestamp: Date.now()
      }
    });
    window.dispatchEvent(instantBalanceEvent);

    // Server will confirm via WebSocket bet_confirmed with authoritative totals
    console.log(`⏳ Waiting for server confirmation...`);

    return finalBetId; // Return betId for tracking
  };

  const removeLastBet = (round: GameRound, side: BetSide) => {
    dispatch({ type: 'REMOVE_LAST_BET', payload: { round, side } });
  };

  const clearRoundBets = (round: GameRound, side?: BetSide) => {
    dispatch({ type: 'CLEAR_ROUND_BETS', payload: { round, side } });
  };

  // ✅ NEW: Listen for optimistic bet events from WebSocketContext
  useEffect(() => {
    const handleOptimisticBet = (event: CustomEvent) => {
      const { side, amount, betId, round } = event.detail;
      console.log('🎯 Optimistic bet event received:', { side, amount, betId, round });

      // Only process if it's for the current round
      if (round === gameState.currentRound) {
        placeBet(side, amount, betId);
      }
    };

    window.addEventListener('optimistic-bet-placed', handleOptimisticBet as EventListener);
    return () => window.removeEventListener('optimistic-bet-placed', handleOptimisticBet as EventListener);
  }, [gameState.currentRound, placeBet]);

  // ✅ NEW: Listen for bet rollback events from WebSocketContext
  useEffect(() => {
    const handleRollbackBet = (event: CustomEvent) => {
      const { betId, side, amount, round } = event.detail;
      console.log('🔄 Rollback bet event received:', { betId, side, amount, round });

      // Find and remove the bet with matching betId
      if (round === 1) {
        const currentBets = gameState.playerRound1Bets[side as keyof typeof gameState.playerRound1Bets];
        const betArray = Array.isArray(currentBets) ? toBetInfoArray(currentBets as number[] | BetInfo[]) : [];

        // Remove bet with matching betId
        const updatedBets = betArray.filter((bet: BetInfo) => bet.betId !== betId);

        updatePlayerRoundBets(1, {
          ...gameState.playerRound1Bets,
          [side]: updatedBets
        });

        // Refund the amount
        const currentBalance = Number(gameState.playerWallet);
        updatePlayerWallet(currentBalance + amount);

        console.log(`✅ Rolled back bet: ₹${amount} refunded`);
      } else if (round === 2) {
        const currentBets = gameState.playerRound2Bets[side as keyof typeof gameState.playerRound2Bets];
        const betArray = Array.isArray(currentBets) ? toBetInfoArray(currentBets as number[] | BetInfo[]) : [];

        // Remove bet with matching betId
        const updatedBets = betArray.filter((bet: BetInfo) => bet.betId !== betId);

        updatePlayerRoundBets(2, {
          ...gameState.playerRound2Bets,
          [side]: updatedBets
        });

        // Refund the amount
        const currentBalance = Number(gameState.playerWallet);
        updatePlayerWallet(currentBalance + amount);

        console.log(`✅ Rolled back bet: ₹${amount} refunded`);
      }
    };

    window.addEventListener('rollback-optimistic-bet', handleRollbackBet as EventListener);
    return () => window.removeEventListener('rollback-optimistic-bet', handleRollbackBet as EventListener);
  }, [gameState.playerRound1Bets, gameState.playerRound2Bets, gameState.playerWallet, updatePlayerRoundBets, updatePlayerWallet]);

  const value: GameStateContextType = {
    gameState,
    setGameId,
    setSelectedOpeningCard,
    addAndarCard,
    addBaharCard,
    addDealtCard,
    addUsedCard,
    setPhase,
    setCountdown,
    setWinner,
    resetGame,
    setGameActive,
    setBettingLocked,
    setCurrentRound,
    updateTotalBets,
    updatePlayerWallet,
    setUserRole,
    updateRoundBets,
    setWinningCard,
    setUserData,
    addBetToHistory,
    updatePlayerRoundBets,
    clearCards,
    placeBet,
    removeLastBet,
    clearRoundBets,
    resetBettingData,
    setScreenSharing,
    setCelebration,
    hideCelebration,
    phase: gameState.phase,
  };

  return (
    <GameStateContext.Provider value={value}>
      {children}
    </GameStateContext.Provider>
  );
};

export const useGameState = () => {
  const context = useContext(GameStateContext);
  if (context === undefined) {
    throw new Error('useGameState must be used within a GameStateProvider');
  }
  return context;
};
