# Step 3: Component-by-Component Refactoring with Sync Integration

## Goal
Refactor components to use Tailwind CSS while maintaining real-time sync with WebSocket context, starting with the player game page.

## Current State
- Components use legacy CSS and need to be converted to Tailwind
- Player game interface needs refactoring for Tailwind and sync integration
- Need to remove all CSS import statements from components
- Need to convert inline styles to Tailwind classes

## Target State
- All components use Tailwind CSS instead of legacy CSS
- Player game interface properly connected to WebSocket context
- Real-time synchronization between admin and player interfaces
- Professional, polished UI with no CSS issues

## Files to Modify
- `client/src/pages/player-game.tsx`
- `client/src/components/BettingStats/BettingStats.tsx`
- `client/src/components/CircularTimer/CircularTimer.tsx`
- `client/src/components/PlayingCard/PlayingCard.tsx`
- `client/src/components/GameAdmin/GameAdmin.tsx`

## Detailed Changes

### 1. Refactor Player Game Page (player-game.tsx)

#### Remove legacy CSS import
In `client/src/pages/player-game.tsx`, remove:
```typescript
import "../player-game.css";
```

#### Replace with Tailwind implementation:
```tsx
// client/src/pages/player-game.tsx
import React, { useState, useEffect, useRef } from 'react';
import { useGameState } from '../contexts/WebSocketContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

const PlayerGame = () => {
  const {
    gameState,
    placeBet,
    selectedChip,
    setSelectedChip,
    chipAmounts,
    currentRound,
    phase,
    countdown,
    playerBalance,
    playerBets
  } = useGameState();
  
  const [showChipSelection, setShowChipSelection] = useState(false);

  const handlePlaceBet = (side: 'andar' | 'bahar') => {
    if (!selectedChip) {
      alert('Please select a chip first');
      return;
    }
    
    placeBet(side, selectedChip);
  };

  // Render the game interface with Tailwind classes and sync integration
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
        
        {/* Circular Timer */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
          <CircularTimer countdown={countdown} phase={phase} />
        </div>
      </div>

      {/* Betting Zones */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-center p-3.75 gap-2 bg-black/90 border-t-2 border-gold border-b-2 border-gold">
        <div 
          className="h-20 bg-[#A52A2A] rounded-lg p-1.25 cursor-pointer transition-all duration-200 hover:scale-102 hover:shadow-[0_0_15px_rgba(255,215,0,0.3)] flex items-center" 
          onClick={() => handlePlaceBet('andar')}
        >
          <div className="h-full flex flex-col justify-between p-1.25 text-left">
            <div className="flex items-center gap-2 font-bold text-lg text-gold">
              <span>ANDAR</span>
              {gameState.selectedOpeningCard && (
                <span className="text-xs bg-gold text-black px-1.5 py-0.5 rounded-full">
                  {gameState.andarCards.length}
                </span>
              )}
            </div>
            <div className="font-bold text-sm text-gold">
              ₹{gameState.andarTotalBet.toLocaleString()}
            </div>
          </div>
          
          <div className={cn(
            "w-12.5 h-17.5 bg-white rounded-md flex flex-col items-center justify-center",
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

        {/* Central Card Display */}
        <div className="flex items-center justify-center relative">
          {gameState.selectedOpeningCard && (
            <div className="absolute -top-7.5 left-1/2 -translate-x-1/2 text-gold text-xs font-bold uppercase tracking-widest">
              Opening Card
            </div>
          )}
          <div className={cn(
            "w-15 h-20 bg-white border-3 border-gold shadow-[0_8px_32px_rgba(255,215,0,0.5)_inset_0_2px_8px_rgba(255,255,255,0.3)] transform scale-105 transition-all duration-300",
            gameState.selectedOpeningCard 
              ? "bg-gradient-to-br from-white to-gray-100"
              : "bg-[rgba(255,255,255,0.1)] border-[rgba(255,255,255,0.3)] shadow-none transform scale-100"
          )}>
            {gameState.selectedOpeningCard ? (
              <>
                <span className={cn(
                  "text-2xl font-bold",
                  ['♥', '♦'].includes(gameState.selectedOpeningCard.suit) 
                    ? 'text-red-600' 
                    : 'text-black'
                )}>
                  {gameState.selectedOpeningCard.value}
                </span>
                <span className={cn(
                  "text-xl",
                  ['♥', '♦'].includes(gameState.selectedOpeningCard.suit) 
                    ? 'text-red-600' 
                    : 'text-black'
                )}>
                  {gameState.selectedOpeningCard.suit}
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
          className="h-20 bg-[#01073b] rounded-lg p-1.25 cursor-pointer transition-all duration-200 hover:scale-102 hover:shadow-[0_0_15px_rgba(255,215,0,0.3)] flex items-center" 
          onClick={() => handlePlaceBet('bahar')}
        >
          <div className="w-12.5 h-17.5 bg-white rounded-md flex flex-col items-center justify-center">
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
              {gameState.selectedOpeningCard && (
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
            className="bg-gold text-black border-none rounded-full px-5 py-3 font-semibold cursor-pointer transition-all duration-200 hover:bg-yellow-400"
            onClick={() => setShowChipSelection(!showChipSelection)}
          >
            {selectedChip ? `Chip: ₹${selectedChip}` : 'Select Chip'}
          </Button>
          
          <div className="text-white text-lg font-bold">
            Current Bet: {playerBets.currentBet ? `₹${playerBets.currentBet}` : '₹0'}
          </div>
        </div>
        
        {/* Chip Selection */}
        {showChipSelection && (
          <div className="hidden overflow-x-auto overflow-y-hidden whitespace-nowrap p-2.5 bg-black/80 border-t border-gold mt-2.5">
            {chipAmounts.map((amount) => (
              <button
                key={amount}
                className={cn(
                  "bg-transparent border-none cursor-pointer transition-all duration-300 flex flex-col items-center gap-1 p-1.25 rounded-lg",
                  amount === selectedChip ? "bg-yellow-900/50 scale-110" : "hover:scale-110"
                )}
                onClick={() => {
                  setSelectedChip(amount);
                  setShowChipSelection(false);
                }}
              >
                <div className="w-15 h-15 bg-gradient-to-b from-yellow-500 to-yellow-600 rounded-full flex items-center justify-center shadow-[0_4px_12px_rgba(0,0,0,0.3)]">
                  <span className="text-black font-bold text-sm">₹{amount}</span>
                </div>
                <div className="text-white font-medium text-xs">₹{amount}</div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PlayerGame;
```

### 2. Refactor Betting Stats Component

#### Remove legacy CSS import in `client/src/components/BettingStats/BettingStats.tsx`
Remove: `import './BettingStats.css';`

#### Replace with Tailwind implementation:
```tsx
// client/src/components/BettingStats/BettingStats.tsx
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { useGameState } from '../../contexts/WebSocketContext';

interface BettingStatsProps {
  bettingData: {
    andarTotal: number;
    baharTotal: number;
    totalBets: number;
    andarCount: number;
    baharCount: number;
    totalPlayers: number;
  };
}

const BettingStats: React.FC<BettingStatsProps> = ({ bettingData }) => {
  const { gameState } = useGameState();
  
  const andarPercentage = bettingData.totalBets > 0 
    ? Math.round((bettingData.andarTotal / bettingData.totalBets) * 100) 
    : 0;
  const baharPercentage = bettingData.totalBets > 0 
    ? Math.round((bettingData.baharTotal / bettingData.totalBets) * 100) 
    : 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-8">
      {/* Andar Stat Card */}
      <div className="bg-black/50 border border-[rgba(40,167,69,0.5)] rounded-xl p-5 text-center backdrop-blur-sm transition-all duration-300 hover:-translate-y-1.25 hover:shadow-[0_10px_25px_rgba(0,0,0,0.3)]">
        <div className="text-white text-base font-semibold mb-2.5">Andar Bets</div>
        <div className="text-green-500 text-2xl font-bold mb-1.25">
          ₹{bettingData.andarTotal.toLocaleString()}
        </div>
        <div className="text-gray-300 text-lg mb-1.25">{andarPercentage}%</div>
        <div className="text-gray-400 text-xs">{bettingData.andarCount} players</div>
      </div>
      
      {/* Bahar Stat Card */}
      <div className="bg-black/50 border border-[rgba(220,53,69,0.5)] rounded-xl p-5 text-center backdrop-blur-sm transition-all duration-300 hover:-translate-y-1.25 hover:shadow-[0_10px_25px_rgba(0,0,0,0.3)]">
        <div className="text-white text-base font-semibold mb-2.5">Bahar Bets</div>
        <div className="text-red-500 text-2xl font-bold mb-1.25">
          ₹{bettingData.baharTotal.toLocaleString()}
        </div>
        <div className="text-gray-300 text-lg mb-1.25">{baharPercentage}%</div>
        <div className="text-gray-400 text-xs">{bettingData.baharCount} players</div>
      </div>
      
      {/* Total Stat Card */}
      <div className="bg-black/50 border border-[rgba(255,215,0,0.5)] rounded-xl p-5 text-center backdrop-blur-sm transition-all duration-300 hover:-translate-y-1.25 hover:shadow-[0_10px_25px_rgba(0,0,0,0.3)]">
        <div className="text-white text-base font-semibold mb-2.5">Total Bets</div>
        <div className="text-gold text-2xl font-bold mb-1.25">
          ₹{bettingData.totalBets.toLocaleString()}
        </div>
        <div className="text-gray-300 text-lg mb-1.25">100%</div>
        <div className="text-gray-400 text-xs">{bettingData.totalPlayers} players</div>
      </div>
    </div>
  );
};

export default BettingStats;
```

### 3. Refactor Circular Timer Component

#### Remove legacy CSS import in `client/src/components/CircularTimer/CircularTimer.tsx`
Remove: `import './CircularTimer.css';`

#### Replace with Tailwind implementation:
```tsx
// client/src/components/CircularTimer/CircularTimer.tsx
import React from 'react';
import { cn } from '@/lib/utils';
import { useGameState } from '../../contexts/WebSocketContext';

interface CircularTimerProps {
  countdown: number;
  phase: string;
}

const CircularTimer: React.FC<CircularTimerProps> = ({ countdown, phase }) => {
  // Get game state to determine if timer should be highlighted
  const { gameState } = useGameState();
  
  return (
    <div className={cn(
      "w-50 h-50 border-8 rounded-full flex flex-col items-center justify-center transition-all duration-500",
      countdown <= 10 
        ? "border-[#ff4444] bg-gradient-to-br from-[rgba(255,68,68,0.9)] to-[rgba(200,0,0,0.8)] shadow-[0_0_30px_rgba(255,68,68,0.8)_inset_0_0_20px_rgba(255,255,255,0.3)] animate-pulse"
        : "border-gold bg-gradient-to-br from-[rgba(255,215,0,0.9)] to-[rgba(255,165,0,0.8)] shadow-[0_0_30px_rgba(255,215,0,0.6)_inset_0_0_20px_rgba(255,255,255,0.3)]"
    )}>
      <div className="text-3xl font-bold text-white mb-0.5">
        {countdown}
      </div>
      <div className="text-sm font-semibold text-white text-center">
        {countdown <= 10 ? '⚠️ HURRY!' : '⏱️ Betting Time'}
      </div>
    </div>
  );
};

export default CircularTimer;
```

### 4. Refactor Playing Card Component

#### Remove legacy CSS import in `client/src/components/PlayingCard/PlayingCard.tsx`
Remove: `import './PlayingCard.css';`

#### Replace with Tailwind implementation:
```tsx
// client/src/components/PlayingCard/PlayingCard.tsx
import React from 'react';
import { cn } from '@/lib/utils';

interface PlayingCardProps {
  card: {
    value: string;
    suit: string;
  };
  isWinning?: boolean;
  className?: string;
}

const PlayingCard: React.FC<PlayingCardProps> = ({ card, isWinning, className = '' }) => {
  const { value, suit } = card;
  
  return (
    <div className={cn(
      "w-12.5 h-17.5 bg-white rounded-md flex flex-col items-center justify-center",
      "border-2 border-gray-300 shadow-[0_4px_12px_rgba(0,0,0,0.2)]",
      isWinning && "animate-pulse-win border-gold shadow-[0_0_20px_rgba(255,215,0,0.9)]",
      className
    )}>
      <span className={cn(
        "text-2xl font-bold",
        ['♥', '♦'].includes(suit) 
          ? 'text-red-600' 
          : 'text-black'
      )}>
        {value}
      </span>
      <span className={cn(
        "text-xl",
        ['♥', '♦'].includes(suit) 
          ? 'text-red-600' 
          : 'text-black'
      )}>
        {suit}
      </span>
    </div>
  );
};

export default PlayingCard;
```

### 5. Refactor Game Admin Component

#### Remove legacy CSS import in `client/src/components/GameAdmin/GameAdmin.tsx`
Remove: `import './GameAdmin.css';`

#### Replace with Tailwind implementation:
```tsx
// client/src/components/GameAdmin/GameAdmin.tsx
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useGameState } from '../../contexts/WebSocketContext';
import { PlayingCard } from '../PlayingCard/PlayingCard';
import { BettingStats } from '../BettingStats/BettingStats';

const GameAdmin: React.FC = () => {
  const {
    gameState,
    sendWebSocketMessage,
    showNotification,
    currentRound,
    phase,
    countdown,
    andarCards,
    baharCards,
    winner
  } = useGameState();
  
  const [selectedCard, setSelectedCard] = useState<string | null>(null);

  const handleStartGame = () => {
    if (!selectedCard) {
      showNotification('Please select an opening card first', 'error');
      return;
    }
    
    sendWebSocketMessage({
      type: 'game_start',
      data: {
        openingCard: selectedCard,
        timer: 60,
        message: 'Game started with opening card!'
      }
    });
    
    showNotification('Game started! Opening card set.', 'success');
  };

  const handleDealCard = (side: 'andar' | 'bahar') => {
    // Generate a random card for demonstration
    const suits = ['♠', '♥', '♦', '♣'];
    const values = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
    const randomSuit = suits[Math.floor(Math.random() * suits.length)];
    const randomValue = values[Math.floor(Math.random() * values.length)];
    const card = `${randomValue}${randomSuit}`;
    
    sendWebSocketMessage({
      type: 'deal_card',
      data: { 
        card: { display: card, value: randomValue, suit: randomSuit },
        side,
        position: side === 'andar' ? gameState.andarCards.length + 1 : gameState.baharCards.length + 1,
        message: `Card dealt to ${side}!`
      }
    });
    
    showNotification(`Card ${card} dealt to ${side}!`, 'info');
  };

  const handleStartRound2 = () => {
    sendWebSocketMessage({
      type: 'start_round_2',
      data: { 
        timer: 30,
        message: 'Round 2 betting started!' 
      }
    });
    
    showNotification('Round 2 started! Betting phase active.', 'success');
  };

  const handleStartFinalDraw = () => {
    sendWebSocketMessage({
      type: 'start_final_draw',
      data: { 
        message: 'Final draw phase started!' 
      }
    });
    
    showNotification('Final draw phase started! Cards will be dealt continuously.', 'warning');
  };

  const handleCompleteGame = () => {
    // Determine winner based on the game logic
    const winningSide = Math.random() > 0.5 ? 'andar' : 'bahar';
    
    sendWebSocketMessage({
      type: 'game_complete',
      data: { 
        winner: winningSide,
        message: `Game completed! ${winningSide} wins!`
      }
    });
    
    showNotification(`Game completed! ${winningSide} wins!`, 'success');
  };

  const handleResetGame = () => {
    sendWebSocketMessage({
      type: 'game_reset',
      data: { 
        message: 'Game has been reset. New game starting...' 
      }
    });
    
    showNotification('Game reset successfully!', 'info');
  };

  return (
    <div className="max-w-7xl mx-auto p-5 bg-gradient-to-br from-black/100 to-purple-900/20 to-red-900/100 min-h-screen">
      {/* Game Admin Header */}
      <header className="text-center mb-7.5 p-5 bg-[rgba(0,0,0,0.3)] rounded-xl backdrop-blur-sm">
        <h1 className="font-poppins text-3xl font-bold text-gold mb-2.5">Game Administration</h1>
        <div className="flex justify-center gap-6 text-white">
          <div>Round: <span className="text-gold font-semibold">{currentRound}</span></div>
          <div>Phase: <span className="text-gold font-semibold">{phase}</span></div>
          <div>Timer: <span className="text-gold font-semibold">{countdown}s</span></div>
          {winner && <div>Winner: <span className="text-gold font-semibold">{winner}</span></div>}
        </div>
      </header>

      {/* Betting Stats Section */}
      <section className="bg-[rgba(0,0,0,0.4)] rounded-xl p-7.5 mb-7.5 backdrop-blur-sm">
        <div className="section-title">
          <h2 className="font-poppins text-1.8rem text-gold mb-6.25 text-center">Betting Statistics</h2>
        </div>
        <BettingStats 
          bettingData={{
            andarTotal: gameState.andarTotalBet,
            baharTotal: gameState.baharTotalBet,
            totalBets: gameState.andarTotalBet + gameState.baharTotalBet,
            andarCount: 0, // placeholder - implement player count logic
            baharCount: 0, // placeholder - implement player count logic
            totalPlayers: 0 // placeholder - implement player count logic
          }} 
        />
      </section>

      {/* Game Controls Section */}
      <section className="bg-[rgba(0,0,0,0.4)] rounded-xl p-7.5 mb-7.5 backdrop-blur-sm">
        <div className="section-title">
          <h2 className="font-poppins text-1.8rem text-gold mb-6.25 text-center">Game Controls</h2>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Button
            className="w-full bg-green-600 hover:bg-green-700 text-white py-3 px-4 rounded-lg font-semibold transition-all duration-200"
            onClick={handleStartGame}
            disabled={phase !== 'idle' && phase !== 'completed'}
          >
            Start Game
          </Button>
          
          <Button
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg font-semibold transition-all duration-200"
            onClick={() => handleDealCard('andar')}
            disabled={phase !== 'dealing'}
          >
            Deal to Andar
          </Button>
          
          <Button
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg font-semibold transition-all duration-200"
            onClick={() => handleDealCard('bahar')}
            disabled={phase !== 'dealing'}
          >
            Deal to Bahar
          </Button>
          
          <Button
            className="w-full bg-yellow-600 hover:bg-yellow-700 text-white py-3 px-4 rounded-lg font-semibold transition-all duration-200"
            onClick={handleStartRound2}
            disabled={phase !== 'betting' || currentRound !== 1}
          >
            Start Round 2
          </Button>
          
          <Button
            className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 px-4 rounded-lg font-semibold transition-all duration-200"
            onClick={handleStartFinalDraw}
            disabled={phase !== 'betting' || currentRound !== 2}
          >
            Start Final Draw
          </Button>
          
          <Button
            className="w-full bg-red-600 hover:bg-red-700 text-white py-3 px-4 rounded-lg font-semibold transition-all duration-200"
            onClick={handleCompleteGame}
            disabled={phase !== 'dealing'}
          >
            Complete Game
          </Button>
          
          <Button
            className="w-full bg-gray-600 hover:bg-gray-700 text-white py-3 px-4 rounded-lg font-semibold transition-all duration-200"
            onClick={handleResetGame}
          >
            Reset Game
          </Button>
        </div>
      </section>

      {/* Card Sequence Section */}
      <section className="bg-[rgba(0,0,0,0.4)] rounded-xl p-7.5 mb-7.5 backdrop-blur-sm">
        <div className="section-title">
          <h2 className="font-poppins text-1.8rem text-gold mb-6.25 text-center">Card Sequences</h2>
        </div>
        
        <div className="flex gap-8">
          {/* Andar Cards */}
          <div className="flex-1">
            <h3 className="text-white font-semibold mb-3 text-center">ANDAR</h3>
            <div className="flex flex-wrap gap-2">
              {andarCards.map((card, index) => (
                <PlayingCard 
                  key={index} 
                  card={card} 
                  isWinning={index === andarCards.length - 1}
                />
              ))}
            </div>
          </div>
          
          {/* Bahar Cards */}
          <div className="flex-1">
            <h3 className="text-white font-semibold mb-3 text-center">BAHAR</h3>
            <div className="flex flex-wrap gap-2">
              {baharCards.map((card, index) => (
                <PlayingCard 
                  key={index} 
                  card={card} 
                  isWinning={index === baharCards.length - 1}
                />
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default GameAdmin;
```

## Verification Steps
1. Remove all legacy CSS imports from components
2. Update all components with Tailwind implementations
3. Test real-time synchronization between admin and player interfaces
4. Verify all styling is consistent and professional with no CSS issues
5. Ensure WebSocket context integration works properly with all components