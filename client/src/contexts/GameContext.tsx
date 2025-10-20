import React, { createContext, useContext, useReducer } from 'react';
import { 
  GameState, 
  PlayerBets, 
  initializeGameState,
  getRoundPhase,
  generateRandomCard,
  dealCardToSide
} from '../components/GameLogic/GameLogic';

// Define action types
type GameAction = 
  | { type: 'SET_GAME_STATE'; payload: Partial<GameState> }
  | { type: 'PLACE_BET'; side: 'andar' | 'bahar'; amount: number; round: number }
  | { type: 'ADD_CARD'; side: 'andar' | 'bahar'; card: any }
  | { type: 'SET_OPENING_CARD'; card: any }
  | { type: 'SET_WINNER'; winner: 'andar' | 'bahar' }
  | { type: 'START_ROUND'; round: number }
  | { type: 'RESET_GAME' }
  | { type: 'UPDATE_COUNTDOWN'; countdown: number }
  | { type: 'SET_PHASE'; phase: 'idle' | 'betting' | 'dealing' | 'completed' };

// Game state type
interface GameContextType {
  gameState: GameState;
  playerBets: PlayerBets;
  placeBet: (side: 'andar' | 'bahar', amount: number) => void;
  dealCard: (side: 'andar' | 'bahar') => void;
  startNewGame: () => void;
  resetGame: () => void;
  updateCountdown: (countdown: number) => void;
  setPhase: (phase: 'idle' | 'betting' | 'dealing' | 'completed') => void;
}

// Reducer function
const gameReducer = (state: GameState, action: GameAction): GameState => {
  switch (action.type) {
    case 'SET_GAME_STATE':
      return { ...state, ...action.payload };
      
    case 'PLACE_BET':
      const { side, amount, round } = action;
      const betUpdate = { ...state };
      
      if (round === 1) {
        betUpdate.round1Bets = {
          ...betUpdate.round1Bets,
          [side]: betUpdate.round1Bets[side] + amount
        };
      } else if (round === 2) {
        betUpdate.round2Bets = {
          ...betUpdate.round2Bets,
          [side]: betUpdate.round2Bets[side] + amount
        };
      }
      
      // Update total bets
      betUpdate.totalBets = {
        andar: betUpdate.round1Bets.andar + betUpdate.round2Bets.andar,
        bahar: betUpdate.round1Bets.bahar + betUpdate.round2Bets.bahar
      };
      
      return betUpdate;
      
    case 'ADD_CARD':
      return dealCardToSide(state, action.side);
      
    case 'SET_OPENING_CARD':
      return { 
        ...state, 
        openingCard: action.card, 
        phase: 'betting', 
        currentRound: 1,
        countdown: 60
      };
      
    case 'SET_WINNER':
      return { 
        ...state, 
        winner: action.winner, 
        phase: 'completed',
        countdown: 0
      };
      
    case 'START_ROUND':
      return { 
        ...state, 
        currentRound: action.round,
        phase: getRoundPhase(action.round),
        countdown: action.round === 1 ? 60 : action.round === 2 ? 30 : 0
      };
      
    case 'UPDATE_COUNTDOWN':
      return { ...state, countdown: action.countdown };
      
    case 'SET_PHASE':
      return { ...state, phase: action.phase };
      
    case 'RESET_GAME':
      return initializeGameState();
      
    default:
      return state;
  }
};

// Game context
const GameContext = createContext<GameContextType | undefined>(undefined);

// Game provider component
export const GameProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [gameState, dispatch] = useReducer(gameReducer, initializeGameState());
  
  // Player bets state (would be separate in real implementation)
  const [playerBets, setPlayerBets] = React.useState<PlayerBets>({
    round1: { andar: 0, bahar: 0 },
    round2: { andar: 0, bahar: 0 },
    currentBet: 0
  });
  
  // WebSocket context will be integrated later
  // For now, we'll use local state management
  
  // Actions
  const placeBet = (side: 'andar' | 'bahar', amount: number) => {
    // Determine current round for bet placement
    const round = gameState.currentRound;
    
    if (round !== 1 && round !== 2) {
      console.log("Betting is not allowed in current phase");
      return;
    }
    
    if (gameState.countdown <= 0 && gameState.phase === 'betting') {
      console.log("Betting time has expired");
      return;
    }
    
    // Update local state
    dispatch({ type: 'PLACE_BET', side, amount, round });
    
    // Update player's local bets
    const roundKey = `round${round}` as 'round1' | 'round2';
    setPlayerBets(prev => ({
      ...prev,
      [roundKey]: {
        ...prev[roundKey],
        [side]: prev[roundKey][side] + amount
      },
      currentBet: amount
    }));
  };
  
  const dealCard = (side: 'andar' | 'bahar') => {
    // Generate a card and deal it
    const newCard = generateRandomCard();
    dispatch({ type: 'ADD_CARD', side, card: newCard });
  };
  
  const startNewGame = () => {
    // Generate a random opening card
    const openingCard = generateRandomCard();
    
    // Update local state
    dispatch({ 
      type: 'SET_OPENING_CARD', 
      card: openingCard 
    });
    
    dispatch({ 
      type: 'START_ROUND', 
      round: 1 
    });
  };
  
  const resetGame = () => {
    // Reset local state
    dispatch({ type: 'RESET_GAME' });
    
    setPlayerBets({
      round1: { andar: 0, bahar: 0 },
      round2: { andar: 0, bahar: 0 },
      currentBet: 0
    });
  };
  
  const updateCountdown = (countdown: number) => {
    dispatch({ type: 'UPDATE_COUNTDOWN', countdown });
  };
  
  const setPhase = (phase: 'idle' | 'betting' | 'dealing' | 'completed') => {
    dispatch({ type: 'SET_PHASE', phase });
  };
  
  // Expose context value
  const value: GameContextType = {
    gameState,
    playerBets,
    placeBet,
    dealCard,
    startNewGame,
    resetGame,
    updateCountdown,
    setPhase
  };
  
  return (
    <GameContext.Provider value={value}>
      {children}
    </GameContext.Provider>
  );
};

// Custom hook to use game context
export const useGame = (): GameContextType => {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
};
