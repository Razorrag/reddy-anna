/**
 * AdminGamePanel - Complete Casino Control Panel
 * 
 * Professional admin interface for controlling the multi-round Andar Bahar game.
 * Features:
 * - Round-wise state management
 * - Real-time betting analytics with percentages
 * - Live card dealing interface
 * - Proper multiplayer synchronization
 * - Clean casino-themed UI matching player interface
 */

import React, { useState, useEffect } from 'react';
import { useGameState } from '../../contexts/GameStateContext';
import { useWebSocket } from '../../contexts/WebSocketContext';
import { useNotification } from '../../contexts/NotificationContext';
import OpeningCardSelector from './OpeningCardSelector';
import CardDealingPanel from './CardDealingPanel';
import PersistentSidePanel from '../PersistentSidePanel';
import RoundTransition from '../RoundTransition';
import NoWinnerTransition from '../NoWinnerTransition';

const AdminGamePanel: React.FC = () => {
  const { gameState, setPhase, resetGame: resetGameState } = useGameState();
  const { sendWebSocketMessage } = useWebSocket();
  const { showNotification } = useNotification();
  
  const [isResetting, setIsResetting] = useState(false);
  const [showRoundTransition, setShowRoundTransition] = useState(false);
  const [showNoWinnerTransition, setShowNoWinnerTransition] = useState(false);
  const [previousRound, setPreviousRound] = useState(gameState.currentRound);
  
  // Detect round changes and trigger transition animation
  useEffect(() => {
    if (gameState.currentRound !== previousRound && gameState.currentRound > 1) {
      setShowRoundTransition(true);
      setPreviousRound(gameState.currentRound);
    }
  }, [gameState.currentRound, previousRound]);

  // Listen for no-winner transition events
  useEffect(() => {
    const handleNoWinner = (event: Event) => {
      const customEvent = event as CustomEvent;
      console.log('Admin: No winner event received:', customEvent.detail);
      setShowNoWinnerTransition(true);
    };

    window.addEventListener('no-winner-transition', handleNoWinner);
    return () => window.removeEventListener('no-winner-transition', handleNoWinner);
  }, []);
  
  const handleResetGame = async () => {
    if (!window.confirm('🔄 Reset the entire game? This will clear all bets and restart.')) {
      return;
    }
    
    setIsResetting(true);
    
    // Reset game state
    resetGameState();
    setPhase('idle');
    
    // Notify backend
    sendWebSocketMessage({
      type: 'game_reset',
      data: { gameId: gameState.gameId }
    });
    
    showNotification('🔄 Game reset successfully', 'success');
    setTimeout(() => setIsResetting(false), 1000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 p-3">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-gray-800/90 rounded-lg border-2 border-gold/30 p-4 mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gold">🎰 Admin Control Panel</h1>
            <span className="text-sm px-3 py-1 bg-gold/20 text-gold rounded-lg font-bold">Round {gameState.currentRound}</span>
          </div>
          <button onClick={handleResetGame} disabled={isResetting} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm rounded-lg font-semibold">
            {isResetting ? '⏳ Resetting...' : '🔄 Reset Game'}
          </button>
        </div>

        {/* Simple Linear Flow */}
        <div className="space-y-4">
          {/* STEP 1: Opening Card Selection (Only at start) */}
          {(gameState.phase === 'idle' || gameState.phase === 'opening') && (
            <OpeningCardSelector />
          )}

          {/* STEP 2: Betting Phase - Efficient Grid Layout */}
          {gameState.phase === 'betting' && (
            <div className="grid grid-cols-3 gap-3">
              {/* LEFT: Card Selection */}
              <div className="col-span-2">
                <CardDealingPanel 
                  round={gameState.currentRound}
                  phase={gameState.phase}
                  openingCard={gameState.selectedOpeningCard}
                  andarCards={gameState.andarCards}
                  baharCards={gameState.baharCards}
                />
              </div>

              {/* RIGHT: Persistent Side Panel - ALWAYS VISIBLE */}
              <div className="col-span-1">
                <PersistentSidePanel />
              </div>
            </div>
          )}

          {/* STEP 3: Dealing Phase - Card Selection First */}
          {gameState.phase === 'dealing' && (
            <div className="grid grid-cols-3 gap-3">
              {/* LEFT: Card Selection and Status */}
              <div className="col-span-2 space-y-4">
              {/* Card Selection FIRST */}
              <CardDealingPanel 
                round={gameState.currentRound}
                phase={gameState.phase}
                openingCard={gameState.selectedOpeningCard}
                andarCards={gameState.andarCards}
                baharCards={gameState.baharCards}
              />

              {/* Status Message (below cards) */}
              <div className="bg-green-900/30 rounded-lg border border-green-500 p-4 text-center">
                <div className="text-xl font-bold text-green-400">
                  {gameState.currentRound === 1 && '⏳ Round 1 - Deal 1 Bahar + 1 Andar'}
                  {gameState.currentRound === 2 && '⏳ Round 2 - Deal 1 MORE Bahar + 1 MORE Andar'}
                  {gameState.currentRound === 3 && '⚡ Round 3 - Continuous Draw Until Match'}
                </div>
                <div className="text-sm text-gray-400 mt-1">
                  {gameState.currentRound === 3 
                    ? 'Deal alternating: Bahar → Andar → Bahar → Andar...'
                    : 'Select cards and click "Show Cards to Players"'
                  }
                </div>
              </div>

              </div>

              {/* RIGHT: Persistent Side Panel - ALWAYS VISIBLE */}
              <div className="col-span-1">
                <PersistentSidePanel />
              </div>
            </div>
          )}

          {/* STEP 4: Game Complete - Show Winner */}
          {gameState.phase === 'complete' && gameState.gameWinner && (
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2 space-y-4">
              <div className={`rounded-lg border-2 p-8 text-center ${
                gameState.gameWinner === 'andar' 
                  ? 'bg-red-900/30 border-red-500' 
                  : 'bg-blue-900/30 border-blue-500'
              }`}>
                <div className="text-6xl mb-4">🎉</div>
                <div className={`text-4xl font-bold mb-2 ${
                  gameState.gameWinner === 'andar' ? 'text-red-400' : 'text-blue-400'
                }`}>
                  {gameState.gameWinner.toUpperCase()} WINS!
                </div>
                <div className="text-lg text-gray-300 mb-4">
                  Winning Card: {gameState.winningCard?.display}
                </div>
                <div className="text-sm text-gray-400">
                  Round {gameState.currentRound} Complete
                </div>
              </div>

              <button 
                onClick={handleResetGame}
                className="w-full px-6 py-4 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-lg text-lg font-bold"
              >
                🎮 Start New Game
              </button>
              </div>

              {/* RIGHT: Persistent Side Panel - ALWAYS VISIBLE */}
              <div className="col-span-1">
                <PersistentSidePanel />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* No Winner Transition - Shows before round transition */}
      <NoWinnerTransition
        show={showNoWinnerTransition}
        currentRound={previousRound}
        nextRound={gameState.currentRound}
        onComplete={() => setShowNoWinnerTransition(false)}
      />

      {/* Round Transition Animation */}
      <RoundTransition
        show={showRoundTransition}
        round={gameState.currentRound}
        message={
          gameState.currentRound === 2
            ? 'Place additional bets!'
            : gameState.currentRound === 3
            ? 'Final Draw - No more betting!'
            : ''
        }
        onComplete={() => setShowRoundTransition(false)}
      />
    </div>
  );
};

export default AdminGamePanel;
