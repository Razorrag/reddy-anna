import React, { createContext, useContext, useReducer, ReactNode } from 'react';

interface Card {
  suit: string;
  value: string;
  display: string;
}

interface GameState {
  selectedOpeningCard: Card | null;
  andarCards: Card[];
  baharCards: Card[];
  phase: 'opening' | 'betting' | 'playing' | 'complete';
  countdownTimer: number;
  gameWinner: 'andar' | 'bahar' | null;
  isGameActive: boolean;
}

type GameStateAction =
  | { type: 'SET_OPENING_CARD'; payload: Card }
  | { type: 'ADD_ANDAR_CARD'; payload: Card }
  | { type: 'ADD_BAHAR_CARD'; payload: Card }
  | { type: 'SET_PHASE'; payload: GameState['phase'] }
  | { type: 'SET_COUNTDOWN'; payload: number }
  | { type: 'SET_WINNER'; payload: GameState['gameWinner'] }
  | { type: 'RESET_GAME' }
  | { type: 'SET_GAME_ACTIVE'; payload: boolean };

const initialState: GameState = {
  selectedOpeningCard: null,
  andarCards: [],
  baharCards: [],
  phase: 'opening',
  countdownTimer: 0,
  gameWinner: null,
  isGameActive: false,
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
      return initialState;
    case 'SET_GAME_ACTIVE':
      return { ...state, isGameActive: action.payload };
    default:
      return state;
  }
};

interface GameStateContextType {
  gameState: GameState;
  setSelectedOpeningCard: (card: Card) => void;
  addAndarCard: (card: Card) => void;
  addBaharCard: (card: Card) => void;
  setPhase: (phase: GameState['phase']) => void;
  setCountdown: (time: number) => void;
  setWinner: (winner: GameState['gameWinner']) => void;
  resetGame: () => void;
  setGameActive: (active: boolean) => void;
  phase: GameState['phase'];
}

const GameStateContext = createContext<GameStateContextType | undefined>(undefined);

export const GameStateProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [gameState, dispatch] = useReducer(gameReducer, initialState);

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