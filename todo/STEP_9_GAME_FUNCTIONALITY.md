# Step 9: Fix All Game-Related Functionality

## Goal
Fix and implement all game-related functionality including game logic, betting system, card dealing, and real-time synchronization.

## Current State
- Basic game interface components created with Tailwind CSS
- WebSocket context enhanced with message handlers
- Server-side broadcasting implemented for game events
- Need to implement complete game logic with proper state management
- Need to ensure real-time synchronization between admin and player interfaces

## Target State
- Complete Andar Bahar game logic implemented with proper rules
- Real-time synchronization between admin and player interfaces
- Proper betting system with validation and tracking
- Card dealing system with proper game flow
- Complete game rounds (Round 1, Round 2, Final Draw)
- Proper winner calculation and payout system
- Game history tracking and statistics

## Files to Modify/Create
- `client/src/components/Game/Game.tsx` (or existing player game component)
- `client/src/components/GameLogic/GameLogic.ts`
- `client/src/contexts/GameContext.tsx`
- `server/routes.ts` (game-specific routes)
- `server/game-logic.ts` (new file for game logic)

## Detailed Changes

### 1. Create Game Logic Module

```ts
// client/src/components/GameLogic/GameLogic.ts
export interface Card {
  value: string;
  suit: string;
  display: string;
}

export interface GameState {
  phase: 'idle' | 'betting' | 'dealing' | 'completed';
  currentRound: number;
  openingCard: Card | null;
  andarCards: Card[];
  baharCards: Card[];
  countdown: number;
  winner: 'andar' | 'bahar' | null;
  round1Bets: { andar: number; bahar: number };
  round2Bets: { andar: number; bahar: number };
  totalBets: { andar: number; bahar: number };
}

export interface PlayerBets {
  round1: { andar: number; bahar: number };
  round2: { andar: number; bahar: number };
  currentBet: number;
}

export const initializeGameState = (): GameState => ({
  phase: 'idle',
  currentRound: 0,
  openingCard: null,
  andarCards: [],
  baharCards: [],
  countdown: 0,
  winner: null,
  round1Bets: { andar: 0, bahar: 0 },
  round2Bets: { andar: 0, bahar: 0 },
  totalBets: { andar: 0, bahar: 0 },
});

export const isValidCard = (card: any): card is Card => {
  return (
    typeof card === 'object' &&
    typeof card.value === 'string' &&
    typeof card.suit === 'string' &&
    typeof card.display === 'string' &&
    ['♠', '♥', '♦', '♣'].includes(card.suit) &&
    card.value.length > 0
  );
};

export const getCardValue = (card: Card): number => {
  const valueMap: { [key: string]: number } = {
    'A': 1,
    '2': 2,
    '3': 3,
    '4': 4,
    '5': 5,
    '6': 6,
    '7': 7,
    '8': 8,
    '9': 9,
    '10': 10,
    'J': 11,
    'Q': 12,
    'K': 13
  };
  
  return valueMap[card.value] || 0;
};

export const isWinningCard = (card: Card, openingCard: Card): boolean => {
  return getCardValue(card) === getCardValue(openingCard);
};

export const calculateWinner = (gameState: GameState): 'andar' | 'bahar' | null => {
  if (!gameState.openingCard) return null;
  
  // Check if last card on andar side matches opening card
  if (gameState.andarCards.length > 0) {
    const lastAndarCard = gameState.andarCards[gameState.andarCards.length - 1];
    if (isWinningCard(lastAndarCard, gameState.openingCard)) {
      return 'andar';
    }
  }
  
  // Check if last card on bahar side matches opening card
  if (gameState.baharCards.length > 0) {
    const lastBaharCard = gameState.baharCards[gameState.baharCards.length - 1];
    if (isWinningCard(lastBaharCard, gameState.openingCard)) {
      return 'bahar';
    }
  }
  
  return null;
};

export const getWinnerSideCards = (gameState: GameState): Card[] => {
  if (!gameState.winner) return [];
  
  return gameState.winner === 'andar' 
    ? gameState.andarCards 
    : gameState.baharCards;
};

export const calculatePayout = (betAmount: number, side: 'andar' | 'bahar', winner: 'andar' | 'bahar' | null, gameState: GameState): number => {
  if (!winner) return 0;
  if (side !== winner) return 0;
  
  // In Andar Bahar, winning side typically gets 1:1 payout minus commission
  // For the 5th card special case: 4:1 payout before commission
  const winningCards = getWinnerSideCards(gameState);
  
  if (winningCards.length === 5) {
    // Special payout for 5th card: 4:1 (before commission)
    return betAmount * 4; // This would typically be 4:1 before commission
  }
  
  // Regular payout: 1:1 minus commission (typically 5-10%)
  const commission = 0.05; // 5% commission
  return betAmount * (1 - commission);
};

export const getRoundPhase = (round: number): 'betting' | 'dealing' => {
  return round === 0 ? 'idle' : round === 1 || round === 2 ? 'betting' : 'dealing';
};
```

### 2. Create Enhanced Game Context

```tsx
// client/src/contexts/GameContext.tsx
import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { WebSocketContext, WebSocketContextType } from './WebSocketContext';
import { 
  GameState, 
  PlayerBets, 
  initializeGameState,
  calculateWinner,
  calculatePayout,
  getRoundPhase
} from '../components/GameLogic/GameLogic';

// Define action types
type GameAction = 
  | { type: 'SET_GAME_STATE'; payload: Partial<GameState> }
  | { type: 'PLACE_BET'; side: 'andar' | 'bahar'; amount: number; round: number }
  | { type: 'ADD_CARD'; side: 'andar' | 'bahar'; card: any }
  | { type: 'SET_OPENING_CARD'; card: any }
  | { type: 'SET_WINNER'; winner: 'andar' | 'bahar' }
  | { type: 'START_ROUND'; round: number }
  | { type: 'RESET_GAME' };

// Game state type
interface GameContextType {
  gameState: GameState;
  playerBets: PlayerBets;
  placeBet: (side: 'andar' | 'bahar', amount: number) => void;
  dealCard: (side: 'andar' | 'bahar') => void;
  startNewGame: () => void;
  resetGame: () => void;
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
      const { side: cardSide, card } = action;
      const cardUpdate = { ...state };
      
      if (cardSide === 'andar') {
        cardUpdate.andarCards = [...cardUpdate.andarCards, card];
      } else {
        cardUpdate.baharCards = [...cardUpdate.baharCards, card];
      }
      
      // Check if this is a winning card
      if (cardUpdate.openingCard) {
        const winner = calculateWinner({
          ...cardUpdate,
          openingCard: cardUpdate.openingCard
        });
        
        if (winner) {
          cardUpdate.winner = winner;
          cardUpdate.phase = 'completed';
        }
      }
      
      return cardUpdate;
      
    case 'SET_OPENING_CARD':
      return { ...state, openingCard: action.card, phase: 'betting', currentRound: 1 };
      
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
  
  // WebSocket context
  const wsContext = useContext(WebSocketContext) as WebSocketContextType;
  
  // Handle WebSocket messages that affect game state
  useEffect(() => {
    if (!wsContext || !wsContext.gameState) return;
    
    // This would be handled in WebSocketContext, but we're showing the connection
    const handleWsUpdate = () => {
      // Dispatch updates based on WebSocket messages
      // This is handled in WebSocketContext but referenced here
    };
    
    handleWsUpdate();
  }, [wsContext]);
  
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
    
    // In a real implementation, this would send the bet to the server
    // For now, we'll just update local state
    dispatch({ type: 'PLACE_BET', side, amount, round });
    
    // Update player's local bets
    setPlayerBets(prev => ({
      ...prev,
      [`round${round}`]: {
        ...prev[`round${round}` as keyof PlayerBets],
        [side]: prev[`round${round}` as keyof PlayerBets][side] + amount
      } as { andar: number; bahar: number },
      currentBet: amount
    }));
  };
  
  const dealCard = (side: 'andar' | 'bahar') => {
    // Generate a random card for demonstration
    const suits = ['♠', '♥', '♦', '♣'];
    const values = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
    const randomSuit = suits[Math.floor(Math.random() * suits.length)];
    const randomValue = values[Math.floor(Math.random() * values.length)];
    const card = { display: `${randomValue}${randomSuit}`, value: randomValue, suit: randomSuit };
    
    dispatch({ type: 'ADD_CARD', side, card });
  };
  
  const startNewGame = () => {
    // Generate a random opening card
    const suits = ['♠', '♥', '♦', '♣'];
    const values = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
    const randomSuit = suits[Math.floor(Math.random() * suits.length)];
    const randomValue = values[Math.floor(Math.random() * values.length)];
    const openingCard = { display: `${randomValue}${randomSuit}`, value: randomValue, suit: randomSuit };
    
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
    dispatch({ type: 'RESET_GAME' });
    setPlayerBets({
      round1: { andar: 0, bahar: 0 },
      round2: { andar: 0, bahar: 0 },
      currentBet: 0
    });
  };
  
  // Expose context value
  const value: GameContextType = {
    gameState,
    playerBets,
    placeBet,
    dealCard,
    startNewGame,
    resetGame
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
```

### 3. Update Player Game Component with Complete Functionality

```tsx
// client/src/pages/player-game.tsx (updated version)
import React, { useState, useEffect } from 'react';
import { useGame } from '../contexts/GameContext';
import { useGameState } from '../contexts/WebSocketContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { PlayingCard } from '../components/PlayingCard/PlayingCard';
import { CircularTimer } from '../components/CircularTimer/CircularTimer';

const PlayerGame: React.FC = () => {
  const { 
    gameState: gameContextState, 
    placeBet, 
    dealCard, 
    startNewGame, 
    resetGame 
  } = useGame();
  
  const {
    gameState: wsGameState,
    selectedChip,
    setSelectedChip,
    chipAmounts,
    currentRound,
    phase,
    countdown,
    playerBalance,
    playerBets
  } = useGameState();
  
  // Use WebSocket state as primary source of truth
  const gameState = wsGameState || gameContextState;
  
  const [showChipSelection, setShowChipSelection] = useState(false);
  
  // Determine if betting is allowed
  const isBettingAllowed = phase === 'betting' && countdown > 0 && gameState.openingCard !== null;

  const handlePlaceBet = (side: 'andar' | 'bahar') => {
    if (!isBettingAllowed) {
      console.log("Betting is not allowed now");
      return;
    }
    
    if (!selectedChip) {
      alert('Please select a chip first');
      return;
    }
    
    // In a real implementation, this would call the WebSocket context's placeBet
    placeBet(side, selectedChip);
  };

  const handleSelectChip = (amount: number) => {
    setSelectedChip(amount);
    setShowChipSelection(false);
  };

  // Render the game interface with complete functionality
  return (
    <div className="relative w-full bg-black flex flex-col flex-grow overflow-y-auto h-screen">
      {/* Game Header */}
      <header className="fixed top-0 left-0 w-full z-50 bg-gradient-to-r from-black/80 to-black/60 backdrop-blur-sm py-3 px-5 flex justify-between items-center shadow-[0_4px_12px_rgba(0,0,0,0.3)]">
        <div className="text-white font-bold text-lg">ANDAR BAHAR</div>
        <div className="flex gap-4">
          <div className="text-gold font-semibold">Balance: ₹{playerBalance.toLocaleString()}</div>
          <div className="text-white">Round: {currentRound}</div>
          <div className="text-white">Phase: {phase}</div>
        </div>
      </header>

      {/* Main Game Area */}
      <div className="relative w-full h-3/5 min-h-5/6 max-h-5/6 bg-black overflow-hidden mt-16">
        {/* Video/Stream Placeholder */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-full h-full bg-gradient-to-br from-gray-900 to-black flex items-center justify-center">
            <div className="text-white/30 text-xl">LIVE GAME STREAM</div>
          </div>
        </div>
        
        {/* Game Status Message */}
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-black/70 text-white px-4 py-2 rounded-full">
          {phase === 'idle' && 'Waiting for game to start...'}
          {phase === 'betting' && `Betting Phase - Round ${currentRound}`}
          {phase === 'dealing' && 'Card Dealing Phase'}
          {phase === 'completed' && `Game Completed - ${gameState.winner} Wins!`}
        </div>
        
        {/* Circular Timer */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
          <CircularTimer countdown={countdown} phase={phase} />
        </div>
        
        {/* Winner Announcement */}
        {gameState.winner && (
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-gold to-yellow-400 text-black px-6 py-3 rounded-full font-bold animate-pulse">
            {gameState.winner.toUpperCase()} WINS!
          </div>
        )}
      </div>

      {/* Betting Zones */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-center p-3.75 gap-2 bg-black/90 border-t-2 border-gold border-b-2 border-gold">
        {/* Andar Betting Zone */}
        <div 
          className={cn(
            "h-20 rounded-lg p-1.25 cursor-pointer transition-all duration-200 hover:scale-102 hover:shadow-[0_0_15px_rgba(255,215,0,0.3)] flex items-center",
            gameState.openingCard ? "bg-[#A52A2A]" : "bg-[#A52A2A]/50 cursor-not-allowed"
          )} 
          onClick={isBettingAllowed ? () => handlePlaceBet('andar') : undefined}
        >
          <div className="h-full flex flex-col justify-between p-1.25 text-left">
            <div className="flex items-center gap-2 font-bold text-lg text-gold">
              <span>ANDAR</span>
              {gameState.openingCard && (
                <span className="text-xs bg-gold text-black px-1.5 py-0.5 rounded-full">
                  {gameState.andarCards.length}
                </span>
              )}
            </div>
            <div className="font-bold text-sm text-gold">
              ₹{gameState.andarTotalBet.toLocaleString()}
            </div>
          </div>
          
          {/* Andar Card Display */}
          <div className={cn(
            "w-12.5 h-17.5 bg-white rounded-md flex flex-col items-center justify-center ml-auto",
            gameState.andarCards.length > 0 
              ? "bg-gradient-to-br from-white to-gray-100 border-3 border-[#A52A2A] shadow-[0_8px_24px_rgba(165,42,42,0.4)_inset_0_2px_8px_rgba(255,255,255,0.3)]"
              : "bg-[rgba(165,42,42,0.2)] border-2 border-[rgba(165,42,42,0.5)]"
          )}>
            {gameState.andarCards.length > 0 ? (
              <>
                <span className={cn(
                  "text-2xl font-bold",
                  ['♥', '♦'].includes(gameState.andarCards[gameState.andarCards.length - 1].suit) 
                    ? 'text-red-600' 
                    : 'text-black'
                )}>
                  {gameState.andarCards[gameState.andarCards.length - 1].value}
                </span>
                <span className={cn(
                  "text-xl",
                  ['♥', '♦'].includes(gameState.andarCards[gameState.andarCards.length - 1].suit) 
                    ? 'text-red-600' 
                    : 'text-black'
                )}>
                  {gameState.andarCards[gameState.andarCards.length - 1].suit}
                </span>
              </>
            ) : (
              <div className="text-[rgba(165,42,42,0.6)] text-xs text-center font-bold">
                No Card<br/>Yet
              </div>
            )}
          </div>
        </div>

        {/* Central Card Display (Opening Card) */}
        <div className="flex items-center justify-center relative">
          {gameState.openingCard && (
            <div className="absolute -top-7.5 left-1/2 -translate-x-1/2 text-gold text-xs font-bold uppercase tracking-widest">
              Opening Card
            </div>
          )}
          <div className={cn(
            "w-15 h-20 bg-white border-3 border-gold shadow-[0_8px_32px_rgba(255,215,0,0.5)_inset_0_2px_8px_rgba(255,255,255,0.3)] transform scale-105 transition-all duration-300 flex items-center justify-center",
            gameState.openingCard 
              ? "bg-gradient-to-br from-white to-gray-100"
              : "bg-[rgba(255,255,255,0.1)] border-[rgba(255,255,255,0.3)] shadow-none transform scale-100"
          )}>
            {gameState.openingCard ? (
              <>
                <span className={cn(
                  "text-2xl font-bold",
                  ['♥', '♦'].includes(gameState.openingCard.suit) 
                    ? 'text-red-600' 
                    : 'text-black'
                )}>
                  {gameState.openingCard.value}
                </span>
                <span className={cn(
                  "text-xl",
                  ['♥', '♦'].includes(gameState.openingCard.suit) 
                    ? 'text-red-600' 
                    : 'text-black'
                )}>
                  {gameState.openingCard.suit}
                </span>
              </>
            ) : (
              <div className="text-[rgba(255,255,255,0.5)] text-sm text-center">
                Waiting for<br/>Opening Card
              </div>
            )}
          </div>
        </div>

        {/* Bahar Betting Zone */}
        <div 
          className={cn(
            "h-20 rounded-lg p-1.25 cursor-pointer transition-all duration-200 hover:scale-102 hover:shadow-[0_0_15px_rgba(255,215,0,0.3)] flex items-center",
            gameState.openingCard ? "bg-[#01073b]" : "bg-[#01073b]/50 cursor-not-allowed"
          )} 
          onClick={isBettingAllowed ? () => handlePlaceBet('bahar') : undefined}
        >
          {/* Bahar Card Display */}
          <div className="w-12.5 h-17.5 bg-white rounded-md flex flex-col items-center justify-center mr-auto">
            {gameState.baharCards.length > 0 ? (
              <>
                <span className={cn(
                  "text-2xl font-bold",
                  ['♥', '♦'].includes(gameState.baharCards[gameState.baharCards.length - 1].suit) 
                    ? 'text-red-600' 
                    : 'text-black'
                )}>
                  {gameState.baharCards[gameState.baharCards.length - 1].value}
                </span>
                <span className={cn(
                  "text-xl",
                  ['♥', '♦'].includes(gameState.baharCards[gameState.baharCards.length - 1].suit) 
                    ? 'text-red-600' 
                    : 'text-black'
                )}>
                  {gameState.baharCards[gameState.baharCards.length - 1].suit}
                </span>
              </>
            ) : (
              <div className="text-[rgba(1,7,59,0.6)] text-xs text-center font-bold">
                No Card<br/>Yet
              </div>
            )}
          </div>
          <div className="h-full flex flex-col justify-between p-1.25 text-right items-end">
            <div className="flex items-center gap-2 font-bold text-lg text-gold">
              <span>BAHAR</span>
              {gameState.openingCard && (
                <span className="text-xs bg-gold text-black px-1.5 py-0.5 rounded-full">
                  {gameState.baharCards.length}
                </span>
              )}
            </div>
            <div className="font-bold text-sm text-gold">
              ₹{gameState.baharTotalBet.toLocaleString()}
            </div>
          </div>
        </div>
      </div>

      {/* Betting Controls */}
      <div className="p-3.75 bg-black/70">
        <div className="flex justify-between items-center">
          <Button
            className={cn(
              "bg-gold text-black border-none rounded-full px-5 py-3 font-semibold cursor-pointer transition-all duration-200 hover:bg-yellow-400",
              !gameState.openingCard ? "opacity-50 cursor-not-allowed" : ""
            )}
            onClick={() => setShowChipSelection(!showChipSelection)}
            disabled={!gameState.openingCard}
          >
            {selectedChip ? `Chip: ₹${selectedChip}` : 'Select Chip'}
          </Button>
          
          <div className="text-white text-lg font-bold">
            Current Bet: {playerBets.currentBet ? `₹${playerBets.currentBet}` : '₹0'}
          </div>
        </div>
        
        {/* Chip Selection */}
        {showChipSelection && (
          <div className="mt-2.5 bg-black/80 border-t border-gold p-2.5 overflow-x-auto flex space-x-2">
            {chipAmounts.map((amount, index) => (
              <button
                key={index}
                className={cn(
                  "bg-transparent border-none cursor-pointer transition-all duration-300 flex flex-col items-center gap-1 p-2.5 rounded-lg min-w-[60px]",
                  amount === selectedChip ? "bg-yellow-900/50 scale-110" : "hover:scale-110"
                )}
                onClick={() => handleSelectChip(amount)}
              >
                <div className="w-12 h-12 bg-gradient-to-b from-yellow-500 to-yellow-600 rounded-full flex items-center justify-center shadow-[0_4px_12px_rgba(0,0,0,0.3)]">
                  <span className="text-black font-bold text-xs">₹{amount}</span>
                </div>
                <div className="text-white font-medium text-xs">₹{amount}</div>
              </button>
            ))}
          </div>
        )}
        
        {/* Game Controls */}
        <div className="mt-3 grid grid-cols-2 gap-3">
          <Button
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg font-semibold transition-all duration-200"
            onClick={startNewGame}
          >
            Start New Game
          </Button>
          
          <Button
            className="w-full bg-red-600 hover:bg-red-700 text-white py-3 px-4 rounded-lg font-semibold transition-all duration-200"
            onClick={resetGame}
          >
            Reset Game
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PlayerGame;
```

### 4. Update Server Game Logic

```ts
// server/game-logic.ts
import { v4 as uuidv4 } from 'uuid';

export interface GameData {
  gameId: string;
  phase: 'idle' | 'betting' | 'dealing' | 'completed';
  currentRound: number;
  openingCard: any | null;
  andarCards: any[];
  baharCards: any[];
  round1Bets: { andar: number; bahar: number };
  round2Bets: { andar: number; bahar: number };
  totalBets: { andar: number; bahar: number };
  winner: 'andar' | 'bahar' | null;
  winningCard: any | null;
  andarTotalBet: number;
  baharTotalBet: number;
  countdown: number;
}

// Initialize new game
export const initializeGame = (): GameData => {
  return {
    gameId: uuidv4(),
    phase: 'idle',
    currentRound: 0,
    openingCard: null,
    andarCards: [],
    baharCards: [],
    round1Bets: { andar: 0, bahar: 0 },
    round2Bets: { andar: 0, bahar: 0 },
    totalBets: { andar: 0, bahar: 0 },
    winner: null,
    winningCard: null,
    andarTotalBet: 0,
    baharTotalBet: 0,
    countdown: 0
  };
};

// Generate a random card
export const generateRandomCard = () => {
  const suits = ['♠', '♥', '♦', '♣'];
  const values = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
  const randomSuit = suits[Math.floor(Math.random() * suits.length)];
  const randomValue = values[Math.floor(Math.random() * values.length)];
  return { 
    display: `${randomValue}${randomSuit}`, 
    value: randomValue, 
    suit: randomSuit 
  };
};

// Check if a card matches the opening card
export const isWinningCard = (card: any, openingCard: any): boolean => {
  if (!card || !openingCard) return false;
  
  // In Andar Bahar, cards are considered matching if they have the same value
  // regardless of suit (e.g., both are 7s)
  return card.value === openingCard.value;
};

// Deal a card to a specific side
export const dealCard = (gameData: GameData, side: 'andar' | 'bahar'): GameData => {
  const newCard = generateRandomCard();
  const updatedGame: GameData = { ...gameData };
  
  if (side === 'andar') {
    updatedGame.andarCards = [...updatedGame.andarCards, newCard];
  } else {
    updatedGame.baharCards = [...updatedGame.baharCards, newCard];
  }
  
  // Check if this card wins the game
  if (gameData.openingCard && isWinningCard(newCard, gameData.openingCard)) {
    updatedGame.winner = side;
    updatedGame.winningCard = newCard;
    updatedGame.phase = 'completed';
    updatedGame.countdown = 0;
  }
  
  return updatedGame;
};

// Place a bet
export const placeBet = (gameData: GameData, side: 'andar' | 'bahar', amount: number, round: number): GameData => {
  const updatedGame: GameData = { ...gameData };
  
  if (round === 1) {
    updatedGame.round1Bets = {
      ...updatedGame.round1Bets,
      [side]: updatedGame.round1Bets[side] + amount
    };
  } else if (round === 2) {
    updatedGame.round2Bets = {
      ...updatedGame.round2Bets,
      [side]: updatedGame.round2Bets[side] + amount
    };
  }
  
  // Update total bets
  updatedGame.totalBets = {
    andar: updatedGame.round1Bets.andar + updatedGame.round2Bets.andar,
    bahar: updatedGame.round1Bets.bahar + updatedGame.round2Bets.bahar
  };
  
  updatedGame.andarTotalBet = updatedGame.totalBets.andar;
  updatedGame.baharTotalBet = updatedGame.totalBets.bahar;
  
  return updatedGame;
};

// Start a new round
export const startRound = (gameData: GameData, round: number): GameData => {
  const updatedGame: GameData = { ...gameData };
  updatedGame.currentRound = round;
  
  // Set phase based on round
  if (round === 1 || round === 2) {
    updatedGame.phase = 'betting';
    updatedGame.countdown = round === 1 ? 60 : 30; // 60 seconds for round 1, 30 for round 2
  } else if (round === 3) {
    updatedGame.phase = 'dealing';
    updatedGame.countdown = 0; // Continuous dealing
  }
  
  return updatedGame;
};

// Start the game with an opening card
export const startGame = (gameData: GameData, openingCard: any): GameData => {
  const updatedGame: GameData = { ...gameData };
  updatedGame.openingCard = openingCard;
  updatedGame.phase = 'betting';
  updatedGame.currentRound = 1;
  updatedGame.countdown = 60; // 60 seconds for round 1 betting
  
  return updatedGame;
};

// Complete the game
export const completeGame = (gameData: GameData, winner: 'andar' | 'bahar', winningCard: any): GameData => {
  const updatedGame: GameData = { ...gameData };
  updatedGame.winner = winner;
  updatedGame.winningCard = winningCard;
  updatedGame.phase = 'completed';
  updatedGame.countdown = 0;
  
  return updatedGame;
};

// Reset the game
export const resetGame = (gameData: GameData): GameData => {
  return {
    ...gameData,
    phase: 'idle',
    currentRound: 0,
    openingCard: null,
    andarCards: [],
    baharCards: [],
    round1Bets: { andar: 0, bahar: 0 },
    round2Bets: { andar: 0, bahar: 0 },
    totalBets: { andar: 0, bahar: 0 },
    winner: null,
    winningCard: null,
    andarTotalBet: 0,
    baharTotalBet: 0,
    countdown: 0
  };
};
```

### 5. Update Server Routes with Game Logic Integration

```ts
// In server/routes.ts, integrate the game logic
import { 
  initializeGame, 
  dealCard, 
  placeBet, 
  startRound, 
  startGame, 
  completeGame, 
  resetGame,
  GameData 
} from './game-logic';

// Update the routes to use the game logic functions
// The implementation would be integrated into the existing routes.ts file
// ensuring that each action properly updates the game state
```

## Verification Steps
1. Implement complete game logic with proper state management
2. Ensure real-time synchronization between admin and player interfaces
3. Test all game phases (betting, dealing, completion)
4. Verify betting system works correctly with proper validation
5. Test card dealing system with winner calculation
6. Ensure game rounds progress correctly (Round 1, Round 2, Final Draw)
7. Test winner calculation and payout system
8. Verify game history and statistics tracking
9. Test WebSocket message handling for all game events
10. Ensure all game functionality works with both local and WebSocket state