import React, { createContext, useContext, useReducer, ReactNode, useEffect } from 'react';

interface Card {
  suit: string;
  value: string;
  display: string;
}

interface UserBet {
  id: string;
  side: 'andar' | 'bahar';
  amount: number;
  round: number;
  status: 'pending' | 'won' | 'lost';
}

// Enhanced GameState interface with real user data
interface GameState {
  selectedOpeningCard: Card | null;
  andarCards: Card[];
  baharCards: Card[];
  phase: 'idle' | 'opening' | 'betting' | 'dealing' | 'complete' | 'BETTING_R1' | 'DEALING_R1' | 'BETTING_R2' | 'DEALING_R2' | 'CONTINUOUS_DRAW';
  countdownTimer: number;
  gameWinner: 'andar' | 'bahar' | null;
  isGameActive: boolean;
  currentRound: number;  // Track current round
  playerBets: {
    andar: number; // total amount bet on andar
    bahar: number; // total amount bet on bahar
  };
  userRole: 'player' | 'admin'; // track user role
  roundBets: {
    round1: { andar: number; bahar: number };
    round2: { andar: number; bahar: number };
  };
  winningCard: Card | null; // track winning card
  // User-specific data
  userId: string | null;
  username: string | null;
  playerWallet: number; // player's balance from authentication
  playerRoundBets: {
    round1: { andar: number; bahar: number };
    round2: { andar: number; bahar: number };
  }; // track individual player bets
  // Multi-round specific data
  round1PlayerBets: {
    andar: number;
    bahar: number;
  };
  round2PlayerBets: {
    andar: number;
    bahar: number;
  };
}

interface GameResult {
  id: string;
  openingCard: string;
  winner: 'andar' | 'bahar';
  winningCard: string;
  totalCards: number;
  createdAt: Date;
}

type GameStateAction =
  | { type: 'SET_OPENING_CARD'; payload: Card }
  | { type: 'ADD_ANDAR_CARD'; payload: Card }
  | { type: 'ADD_BAHAR_CARD'; payload: Card }
  | { type: 'SET_PHASE'; payload: GameState['phase'] }
  | { type: 'SET_COUNTDOWN'; payload: number }
  | { type: 'SET_WINNER'; payload: GameState['gameWinner'] }
  | { type: 'RESET_GAME' }
  | { type: 'SET_GAME_ACTIVE'; payload: boolean }
  | { type: 'SET_CURRENT_ROUND'; payload: number }
  | { type: 'UPDATE_BETS'; payload: { andar: number; bahar: number } }
  | { type: 'UPDATE_PLAYER_WALLET'; payload: number }
  | { type: 'ADD_GAME_HISTORY'; payload: GameResult }
  | { type: 'SET_USER_ROLE'; payload: 'player' | 'admin' }
  | { type: 'UPDATE_ROUND_BETS'; payload: { round: number; andar: number; bahar: number } }
  | { type: 'SET_WINNING_CARD'; payload: Card }
  // User-specific actions
  | { type: 'SET_USER_DATA'; payload: { userId: string; username: string; wallet: number } }
  | { type: 'UPDATE_PLAYER_ROUND_BETS'; payload: { round: number; andar: number; bahar: number } }
  // Multi-round specific actions
  | { type: 'SET_ROUND1_PLAYER_BETS'; payload: { andar: number; bahar: number } }
  | { type: 'SET_ROUND2_PLAYER_BETS'; payload: { andar: number; bahar: number } };

const initialState: GameState = {
  selectedOpeningCard: null,
  andarCards: [],
  baharCards: [],
  phase: 'idle',
  countdownTimer: 0,
  gameWinner: null,
  isGameActive: false,
  currentRound: 1,
  playerBets: { andar: 0, bahar: 0 },
  userRole: 'player',
  roundBets: {
    round1: { andar: 0, bahar: 0 },
    round2: { andar: 0, bahar: 0 }
  },
  winningCard: null,
  // Initialize user-specific data to null
  userId: null,
  username: null,
  playerWallet: 0,
  playerRoundBets: {
    round1: { andar: 0, bahar: 0 },
    round2: { andar: 0, bahar: 0 }
  },
  // Multi-round specific
  round1PlayerBets: { andar: 0, bahar: 0 },
  round2PlayerBets: { andar: 0, bahar: 0 }
};

const gameReducer = (state: GameState, action: GameStateAction): GameState => {
  switch (action.type) {
    case 'SET_OPENING_CARD':
      return { ...state, selectedOpeningCard: action.payload };
    case 'ADD_ANDAR_CARD':
      return { ...state, andarCards: [...state.andarCards, action.payload] };
    case 'ADD_BAHAR_CARD':
      return { ...state, baharCards: [...state.baharCards, action.payload] };
    case 'SET_PHASE':
      return { ...state, phase: action.payload };
    case 'SET_COUNTDOWN':
      return { ...state, countdownTimer: action.payload };
    case 'SET_WINNER':
      return { ...state, gameWinner: action.payload, phase: 'complete' };
    case 'RESET_GAME':
      return {
        ...initialState,
        userId: state.userId, // preserve user data
        username: state.username,
        playerWallet: state.playerWallet,
        userRole: state.userRole,
      };
    case 'SET_GAME_ACTIVE':
      return { ...state, isGameActive: action.payload };
    case 'SET_CURRENT_ROUND':
      return { ...state, currentRound: action.payload };
    case 'UPDATE_BETS':
      return { ...state, playerBets: action.payload };
    case 'UPDATE_PLAYER_WALLET':
      return { ...state, playerWallet: action.payload };
    case 'SET_USER_ROLE':
      return { ...state, userRole: action.payload };
    case 'UPDATE_ROUND_BETS':
      if (action.payload.round === 1) {
        return {
          ...state,
          roundBets: {
            ...state.roundBets,
            round1: { andar: action.payload.andar, bahar: action.payload.bahar }
          }
        };
      } else if (action.payload.round === 2) {
        return {
          ...state,
          roundBets: {
            ...state.roundBets,
            round2: { andar: action.payload.andar, bahar: action.payload.bahar }
          }
        };
      }
      return state;
    case 'SET_WINNING_CARD':
      return { ...state, winningCard: action.payload };
    // User-specific reducers
    case 'SET_USER_DATA':
      return {
        ...state,
        userId: action.payload.userId,
        username: action.payload.username,
        playerWallet: action.payload.wallet
      };
    case 'UPDATE_PLAYER_ROUND_BETS':
      if (action.payload.round === 1) {
        return {
          ...state,
          playerRoundBets: {
            ...state.playerRoundBets,
            round1: { andar: action.payload.andar, bahar: action.payload.bahar }
          }
        };
      } else if (action.payload.round === 2) {
        return {
          ...state,
          playerRoundBets: {
            ...state.playerRoundBets,
            round2: { andar: action.payload.andar, bahar: action.payload.bahar }
          }
        };
      }
      return state;
    // Multi-round specific reducers
    case 'SET_ROUND1_PLAYER_BETS':
      return {
        ...state,
        round1PlayerBets: action.payload
      };
    case 'SET_ROUND2_PLAYER_BETS':
      return {
        ...state,
        round2PlayerBets: action.payload
      };
    default:
      return state;
  }
};

interface GameStateContextType {
  gameState: GameState;
  // Existing functions
  setSelectedOpeningCard: (card: Card) => void;
  addAndarCard: (card: Card) => void;
  addBaharCard: (card: Card) => void;
  setPhase: (phase: GameState['phase']) => void;
  setCountdown: (time: number) => void;
  setWinner: (winner: GameState['gameWinner']) => void;
  resetGame: () => void;
  setGameActive: (active: boolean) => void;
  setCurrentRound: (round: number) => void;
  updateBets: (bets: { andar: number; bahar: number }) => void;
  updatePlayerWallet: (wallet: number) => void;
  setUserRole: (role: 'player' | 'admin') => void;
  updateRoundBets: (round: number, bets: { andar: number; bahar: number }) => void;
  setWinningCard: (card: Card) => void;
  // New user functions
  setUserData: (userData: { userId: string; username: string; wallet: number }) => void;
  updatePlayerRoundBets: (round: number, bets: { andar: number; bahar: number }) => void;
  // Multi-round specific functions
  setRound1PlayerBets: (bets: { andar: number; bahar: number }) => void;
  setRound2PlayerBets: (bets: { andar: number; bahar: number }) => void;
  // Betting function
  placeBet: (side: 'andar' | 'bahar', amount: number) => void;
  phase: GameState['phase'];
}

const GameStateContext = createContext<GameStateContextType | undefined>(undefined);

export const GameStateProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [gameState, dispatch] = useReducer(gameReducer, initialState);

  // Initialize from localStorage or auth
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        dispatch({
          type: 'SET_USER_DATA',
          payload: {
            userId: parsedUser.userId,
            username: parsedUser.username,
            wallet: parsedUser.wallet
          }
        });
        dispatch({ type: 'SET_USER_ROLE', payload: parsedUser.role || 'player' });
      } catch (e) {
        console.error('Failed to parse user data from localStorage');
      }
    }
  }, []);

  // Dispatchers for all actions
  const setSelectedOpeningCard = (card: Card) => {
    dispatch({ type: 'SET_OPENING_CARD', payload: card });
  };

  const addAndarCard = (card: Card) => {
    dispatch({ type: 'ADD_ANDAR_CARD', payload: card });
  };

  const addBaharCard = (card: Card) => {
    dispatch({ type: 'ADD_BAHAR_CARD', payload: card });
  };

  const setPhase = (phase: GameState['phase']) => {
    dispatch({ type: 'SET_PHASE', payload: phase });
  };

  const setCountdown = (time: number) => {
    dispatch({ type: 'SET_COUNTDOWN', payload: time });
  };

  const setWinner = (winner: GameState['gameWinner']) => {
    dispatch({ type: 'SET_WINNER', payload: winner });
  };

  const resetGame = () => {
    dispatch({ type: 'RESET_GAME' });
  };

  const setGameActive = (active: boolean) => {
    dispatch({ type: 'SET_GAME_ACTIVE', payload: active });
  };

  const setCurrentRound = (round: number) => {
    dispatch({ type: 'SET_CURRENT_ROUND', payload: round });
  };

  const updateBets = (bets: { andar: number; bahar: number }) => {
    dispatch({ type: 'UPDATE_BETS', payload: bets });
  };

  const updatePlayerWallet = (wallet: number) => {
    dispatch({ type: 'UPDATE_PLAYER_WALLET', payload: wallet });
  };

  const setUserRole = (role: 'player' | 'admin') => {
    dispatch({ type: 'SET_USER_ROLE', payload: role });
  };

  const updateRoundBets = (round: number, bets: { andar: number; bahar: number }) => {
    dispatch({ type: 'UPDATE_ROUND_BETS', payload: { round, ...bets } });
  };

  const setWinningCard = (card: Card) => {
    dispatch({ type: 'SET_WINNING_CARD', payload: card });
  };

  // New user functions
  const setUserData = (userData: { userId: string; username: string; wallet: number }) => {
    dispatch({ type: 'SET_USER_DATA', payload: userData });
    localStorage.setItem('user', JSON.stringify({
      userId: userData.userId,
      username: userData.username,
      wallet: userData.wallet,
      role: 'player' // Default role
    }));
  };

  const updatePlayerRoundBets = (round: number, bets: { andar: number; bahar: number }) => {
    dispatch({ type: 'UPDATE_PLAYER_ROUND_BETS', payload: { round, ...bets } });
  };

  // Multi-round specific functions
  const setRound1PlayerBets = (bets: { andar: number; bahar: number }) => {
    dispatch({ type: 'SET_ROUND1_PLAYER_BETS', payload: bets });
  };

  const setRound2PlayerBets = (bets: { andar: number; bahar: number }) => {
    dispatch({ type: 'SET_ROUND2_PLAYER_BETS', payload: bets });
  };

  // Betting function
  const placeBet = (side: 'andar' | 'bahar', amount: number) => {
    // This will be implemented in WebSocket context
    // For now, just update local state
    if (gameState.currentRound === 1) {
      const currentBets = gameState.round1PlayerBets;
      const newBets = {
        ...currentBets,
        [side]: currentBets[side] + amount
      };
      setRound1PlayerBets(newBets);
    } else if (gameState.currentRound === 2) {
      const currentBets = gameState.round2PlayerBets;
      const newBets = {
        ...currentBets,
        [side]: currentBets[side] + amount
      };
      setRound2PlayerBets(newBets);
    }
    
    // Update player wallet
    if (gameState.playerWallet >= amount) {
      updatePlayerWallet(gameState.playerWallet - amount);
    }
  };

  const value: GameStateContextType = {
    gameState,
    setSelectedOpeningCard,
    addAndarCard,
    addBaharCard,
    setPhase,
    setCountdown,
    setWinner,
    resetGame,
    setGameActive,
    setCurrentRound,
    updateBets,
    updatePlayerWallet,
    setUserRole,
    updateRoundBets,
    setWinningCard,
    setUserData,
    updatePlayerRoundBets,
    setRound1PlayerBets,
    setRound2PlayerBets,
    placeBet,
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