import React, { createContext, useContext, useReducer, ReactNode, useEffect } from 'react';
import type {
  Card,
  GamePhase,
  GameRound,
  GameWinner,
  BetSide,
  RoundBets,
  DealtCard,
  Bet,
  GameHistoryEntry
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
  
  // Player's individual bets per round
  playerRound1Bets: RoundBets;
  playerRound2Bets: RoundBets;
}

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
  | { type: 'CLEAR_CARDS' };

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
  playerRound1Bets: { andar: 0, bahar: 0 },
  playerRound2Bets: { andar: 0, bahar: 0 }
};

const gameReducer = (state: GameState, action: GameStateAction): GameState => {
  switch (action.type) {
    case 'SET_GAME_ID':
      return { ...state, gameId: action.payload };
    case 'SET_OPENING_CARD':
      // Add opening card to usedCards if not already there
      const isOpeningCardUsed = state.usedCards.some(c => c.id === action.payload.id);
      return { 
        ...state, 
        selectedOpeningCard: action.payload,
        usedCards: isOpeningCardUsed ? state.usedCards : [...state.usedCards, action.payload]
      };
    case 'ADD_ANDAR_CARD':
      // Add to usedCards if not already there
      const isAndarCardUsed = state.usedCards.some(c => c.id === action.payload.id);
      return { 
        ...state, 
        andarCards: [...state.andarCards, action.payload],
        usedCards: isAndarCardUsed ? state.usedCards : [...state.usedCards, action.payload]
      };
    case 'ADD_BAHAR_CARD':
      // Add to usedCards if not already there
      const isBaharCardUsed = state.usedCards.some(c => c.id === action.payload.id);
      return { 
        ...state, 
        baharCards: [...state.baharCards, action.payload],
        usedCards: isBaharCardUsed ? state.usedCards : [...state.usedCards, action.payload]
      };
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
        return { ...state, round1Bets: action.payload.bets };
      } else if (action.payload.round === 2) {
        return { ...state, round2Bets: action.payload.bets };
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
  updateTotalBets: (bets: RoundBets) => void;
  updatePlayerWallet: (wallet: number) => void;
  setUserRole: (role: 'player' | 'admin') => void;
  updateRoundBets: (round: GameRound, bets: RoundBets) => void;
  setWinningCard: (card: Card) => void;
  setUserData: (userData: { userId: string; username: string; wallet: number }) => void;
  updatePlayerRoundBets: (round: GameRound, bets: RoundBets) => void;
  clearCards: () => void;
  placeBet: (side: BetSide, amount: number) => void;
  resetBettingData: () => void;
  phase: GamePhase;
}

const GameStateContext = createContext<GameStateContextType | undefined>(undefined);

export const GameStateProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [gameState, dispatch] = useReducer(gameReducer, initialState);

  // Initialize from localStorage or auth with improved error handling
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        dispatch({
          type: 'SET_USER_DATA',
          payload: {
            userId: parsedUser.id || parsedUser.userId,
            username: parsedUser.username || parsedUser.name,
            wallet: parsedUser.wallet || parsedUser.balance || 50000 // default balance
          }
        });
        dispatch({
          type: 'SET_USER_ROLE',
          payload: parsedUser.role || parsedUser.userRole || 'player'
        });
      } catch (e) {
        console.error('Failed to parse user data from localStorage', e);
        // Initialize with default values
        dispatch({
          type: 'SET_USER_DATA',
          payload: {
            userId: 'guest',
            username: 'Guest Player',
            wallet: 50000
          }
        });
      }
    } else {
      // Initialize with default guest user
      dispatch({
        type: 'SET_USER_DATA',
        payload: {
          userId: 'guest',
          username: 'Guest Player',
          wallet: 50000
        }
      });
    }
  }, []);

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

  const updateTotalBets = (bets: RoundBets) => {
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
    localStorage.setItem('user', JSON.stringify({
      userId: userData.userId,
      username: userData.username,
      wallet: userData.wallet,
      role: 'player'
    }));
  };

  const updatePlayerRoundBets = (round: GameRound, bets: RoundBets) => {
    dispatch({ type: 'UPDATE_PLAYER_ROUND_BETS', payload: { round, bets } });
  };

  const clearCards = () => {
    dispatch({ type: 'CLEAR_CARDS' });
  };

  const resetBettingData = () => {
    dispatch({ type: 'UPDATE_TOTAL_BETS', payload: { andar: 0, bahar: 0 } });
    dispatch({ type: 'UPDATE_ROUND_BETS', payload: { round: 1, bets: { andar: 0, bahar: 0 } } });
    dispatch({ type: 'UPDATE_ROUND_BETS', payload: { round: 2, bets: { andar: 0, bahar: 0 } } });
    dispatch({ type: 'UPDATE_PLAYER_ROUND_BETS', payload: { round: 1, bets: { andar: 0, bahar: 0 } } });
    dispatch({ type: 'UPDATE_PLAYER_ROUND_BETS', payload: { round: 2, bets: { andar: 0, bahar: 0 } } });
  };

  const placeBet = (side: BetSide, amount: number) => {
    // This function now only updates local state
    // The actual bet placement is handled by WebSocket messages
    if (gameState.currentRound === 1) {
      const newBets: RoundBets = {
        ...gameState.playerRound1Bets,
        [side]: gameState.playerRound1Bets[side] + amount
      };
      updatePlayerRoundBets(1, newBets);
    } else if (gameState.currentRound === 2) {
      const newBets: RoundBets = {
        ...gameState.playerRound2Bets,
        [side]: gameState.playerRound2Bets[side] + amount
      };
      updatePlayerRoundBets(2, newBets);
    }
    
    if (gameState.playerWallet >= amount) {
      updatePlayerWallet(gameState.playerWallet - amount);
    }
  };

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
    updatePlayerRoundBets,
    clearCards,
    placeBet,
    resetBettingData,
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
