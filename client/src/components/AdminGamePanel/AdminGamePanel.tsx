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

import React, { useState } from 'react';
import { useGameState } from '../../contexts/GameStateContext';
import { useWebSocket } from '../../contexts/WebSocketContext';
import { useNotification } from '../../contexts/NotificationContext';
import OpeningCardSelector from './OpeningCardSelector';
import CardDealingPanel from './CardDealingPanel';

const AdminGamePanel: React.FC = () => {
  const { gameState, setPhase, resetGame: resetGameState } = useGameState();
  const { sendWebSocketMessage } = useWebSocket();
  const { showNotification } = useNotification();
  
  const [isResetting, setIsResetting] = useState(false);
  
  // Calculate betting percentages
  const totalBets = gameState.andarTotalBet + gameState.baharTotalBet;
  const andarPercentage = totalBets > 0 ? (gameState.andarTotalBet / totalBets) * 100 : 50;
  const baharPercentage = totalBets > 0 ? (gameState.baharTotalBet / totalBets) * 100 : 50;
  
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

              {/* RIGHT: Timer & Stats */}
              <div className="col-span-1 space-y-4">
                {/* Timer */}
                <div className="bg-red-900/30 rounded-lg border-2 border-red-500 p-5 text-center">
                  <div className="text-sm text-gray-400 mb-2">Betting Time</div>
                  <div className="text-6xl font-bold text-red-400 animate-pulse">
                    {gameState.countdownTimer}s
                  </div>
                  <div className="text-xs text-gray-400 mt-2">Round {gameState.currentRound}</div>
                </div>

                {/* Opening Card */}
                <div className="bg-gradient-to-br from-gold/20 to-yellow-600/20 rounded-lg p-5 border-2 border-gold/50 text-center">
                  <div className="text-sm text-gray-400 mb-2">Opening Card</div>
                  <div className="text-5xl font-bold text-white">
                    {gameState.selectedOpeningCard?.display || '--'}
                  </div>
                </div>

                {/* Betting Stats */}
                <div className="space-y-3">
                  <div className="bg-red-900/30 rounded-lg p-4 border-2 border-red-500/50">
                    <div className="text-sm text-gray-400 mb-1">ANDAR BETS</div>
                    <div className="text-2xl font-bold text-red-400">
                      ₹{gameState.andarTotalBet.toLocaleString('en-IN')}
                    </div>
                    <div className="text-sm text-gray-500 mt-1">
                      {andarPercentage.toFixed(1)}% of total
                    </div>
                  </div>
                  <div className="bg-blue-900/30 rounded-lg p-4 border-2 border-blue-500/50">
                    <div className="text-sm text-gray-400 mb-1">BAHAR BETS</div>
                    <div className="text-2xl font-bold text-blue-400">
                      ₹{gameState.baharTotalBet.toLocaleString('en-IN')}
                    </div>
                    <div className="text-sm text-gray-500 mt-1">
                      {baharPercentage.toFixed(1)}% of total
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Dealing Phase - Card Selection First */}
          {gameState.phase === 'dealing' && (
            <div className="space-y-4">
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

              {/* Cards Dealt Summary */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-blue-900/30 rounded-lg p-4 border border-blue-500/50">
                  <div className="text-sm text-gray-400 mb-1">BAHAR CARDS</div>
                  <div className="text-3xl font-bold text-blue-400">
                    {gameState.baharCards.length}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {gameState.baharCards.map(c => c.display).join(', ') || 'None yet'}
                  </div>
                </div>
                <div className="bg-red-900/30 rounded-lg p-4 border border-red-500/50">
                  <div className="text-sm text-gray-400 mb-1">ANDAR CARDS</div>
                  <div className="text-3xl font-bold text-red-400">
                    {gameState.andarCards.length}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {gameState.andarCards.map(c => c.display).join(', ') || 'None yet'}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: Game Complete - Show Winner */}
          {gameState.phase === 'complete' && gameState.gameWinner && (
            <div className="space-y-4">
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
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminGamePanel;
