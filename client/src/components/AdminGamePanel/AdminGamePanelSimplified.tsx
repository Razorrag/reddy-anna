/**
 * AdminGamePanel - Simplified Game Control Interface
 * 
 * Clean, full-width interface focused ONLY on controlling the game.
 * No management features, no bet monitoring - just game control.
 * 
 * CRITICAL: DO NOT add RoundTransition or NoWinnerTransition components here!
 * These are PLAYER-ONLY UI elements. Admin should maintain continuous game control
 * without flashing black screens or transition animations during round changes.
 */

import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useGameState } from '../../contexts/GameStateContext';
import { useWebSocket } from '../../contexts/WebSocketContext';
import { useNotification } from '../../contexts/NotificationContext';
import OpeningCardSelector from './OpeningCardSelector';
import CardDealingPanel from './CardDealingPanel';
import WinnerCelebration from '../WinnerCelebration';
import { Home } from 'lucide-react';

const AdminGamePanelSimplified: React.FC = () => {
  const { gameState } = useGameState();
  const { sendWebSocketMessage } = useWebSocket();
  const { showNotification } = useNotification();
  
  const [isResetting, setIsResetting] = useState(false);
  const [showWinnerCelebration, setShowWinnerCelebration] = useState(false);
  const [celebrationData, setCelebrationData] = useState<any>(null);
  const [, setLocation] = useLocation();
  
  // Listen for game complete celebration events (optional for admin)
  useEffect(() => {
    const handleGameComplete = (event: Event) => {
      const customEvent = event as CustomEvent;
      setCelebrationData(customEvent.detail);
      setShowWinnerCelebration(true);
    };

    window.addEventListener('game-complete-celebration', handleGameComplete);
    return () => window.removeEventListener('game-complete-celebration', handleGameComplete);
  }, []);

  const handleCelebrationComplete = () => {
    setShowWinnerCelebration(false);
    setCelebrationData(null);
  };
  
  const handleResetGame = async () => {
    if (!window.confirm('🔄 Reset the entire game? This will clear all bets and restart.')) {
      return;
    }
    
    setIsResetting(true);
    sendWebSocketMessage({
      type: 'game_reset',
      data: { message: 'Admin initiated game reset' }
    });
    
    showNotification('🔄 Game reset successfully', 'success');
    setTimeout(() => setIsResetting(false), 1000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-900 via-blue-900 to-indigo-900 p-6">
      {/* Full Width Container */}
      <div className="w-full">
        {/* Header */}
        <div className="bg-black/40 backdrop-blur-sm rounded-xl border border-gold/30 shadow-2xl p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setLocation('/admin')}
                className="px-4 py-2 bg-gradient-to-r from-slate-800 to-slate-700 hover:from-slate-700 hover:to-slate-600 text-white rounded-lg font-semibold transition-all duration-200 hover:scale-105 shadow-lg flex items-center gap-2"
              >
                <Home className="w-4 h-4" />
                Dashboard
              </button>
              <h1 className="text-3xl font-bold text-gold drop-shadow-lg">🎰 Game Control</h1>
              <span className="text-base px-4 py-2 bg-gold/20 border border-gold/40 text-gold rounded-lg font-bold shadow-lg">
                Round {gameState.currentRound}
              </span>
              <span className="text-sm px-3 py-1.5 bg-purple-600/30 border border-purple-400/30 text-purple-200 rounded-lg font-medium">
                Phase: {gameState.phase}
              </span>
            </div>
            <button 
              onClick={handleResetGame} 
              disabled={isResetting} 
              className="px-6 py-3 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 disabled:from-gray-600 disabled:to-gray-700 text-white text-sm rounded-xl font-bold shadow-lg transition-all duration-200 hover:scale-105 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isResetting ? '⏳ Resetting...' : '🔄 Reset Game'}
            </button>
          </div>
        </div>

        {/* Main Game Control Area - Full Width Layout */}
        <div className="grid grid-cols-12 gap-6">
          {/* Left Side - Card Selection (Takes 8 columns) */}
          <div className="col-span-8">
            {gameState.phase === 'idle' ? (
              <OpeningCardSelector />
            ) : (
              <CardDealingPanel
                round={gameState.currentRound}
                phase={gameState.phase}
                andarCards={gameState.andarCards}
                baharCards={gameState.baharCards}
              />
            )}
          </div>

          {/* Right Side - Game Info (Takes 4 columns) */}
          <div className="col-span-4 space-y-4">
            {/* Timer */}
            <div className="bg-gradient-to-br from-purple-900/50 to-pink-900/50 backdrop-blur-sm rounded-xl border border-gold/30 p-6 text-center">
              <div className="text-sm text-gray-300 mb-2">Betting Time</div>
              <div className="text-6xl font-bold text-gold">
                {gameState.countdownTimer}s
              </div>
              <div className="text-xs text-gray-400 mt-2">Round {gameState.currentRound}</div>
            </div>

            {/* Opening Card */}
            {gameState.selectedOpeningCard && (
              <div className="bg-gradient-to-br from-amber-900/50 to-orange-900/50 backdrop-blur-sm rounded-xl border border-gold/30 p-6 text-center">
                <div className="text-sm text-gray-300 mb-3">Opening Card</div>
                <div className="text-7xl font-bold">
                  {gameState.selectedOpeningCard.display}
                </div>
              </div>
            )}

            {/* Betting Status */}
            <div className="bg-black/40 backdrop-blur-sm rounded-xl border border-gold/30 p-4">
              <div className="text-center">
                {gameState.phase === 'betting' && !gameState.bettingLocked && (
                  <div className="text-green-400 font-bold text-lg">
                    ⚡ Betting in progress - Cards locked until timer ends
                  </div>
                )}
                {gameState.bettingLocked && (
                  <div className="text-yellow-400 font-bold text-lg">
                    🔒 Betting closed - Ready to deal cards
                  </div>
                )}
                {gameState.phase === 'dealing' && (
                  <div className="text-blue-400 font-bold text-lg">
                    🎴 Dealing cards - Click cards to reveal
                  </div>
                )}
                {gameState.phase === 'idle' && (
                  <div className="text-purple-400 font-bold text-lg">
                    ⏳ Select opening card to start
                  </div>
                )}
              </div>
            </div>

            {/* Total Bets Summary - Show Round 1 and Round 2 separately */}
            <div className="bg-black/40 backdrop-blur-sm rounded-xl border border-gold/30 p-4">
              <div className="text-sm text-gray-300 mb-3 text-center font-semibold">Total Bets</div>
              
              {/* Round 1 Totals */}
              <div className="mb-4">
                <div className="text-xs text-gray-400 mb-2 text-center">Round 1</div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-red-900/30 rounded-lg p-2 border border-red-500/30">
                    <div className="text-[10px] text-red-300 mb-0.5">Andar R1</div>
                    <div className="text-lg font-bold text-red-400">
                      ₹{gameState.round1Bets.andar.toLocaleString()}
                    </div>
                  </div>
                  <div className="bg-blue-900/30 rounded-lg p-2 border border-blue-500/30">
                    <div className="text-[10px] text-blue-300 mb-0.5">Bahar R1</div>
                    <div className="text-lg font-bold text-blue-400">
                      ₹{gameState.round1Bets.bahar.toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>

              {/* Round 2 Totals */}
              {gameState.currentRound >= 2 && (
                <div className="mb-4">
                  <div className="text-xs text-gray-400 mb-2 text-center">Round 2</div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-red-900/30 rounded-lg p-2 border border-red-500/30">
                      <div className="text-[10px] text-red-300 mb-0.5">Andar R2</div>
                      <div className="text-lg font-bold text-red-400">
                        ₹{gameState.round2Bets.andar.toLocaleString()}
                      </div>
                    </div>
                    <div className="bg-blue-900/30 rounded-lg p-2 border border-blue-500/30">
                      <div className="text-[10px] text-blue-300 mb-0.5">Bahar R2</div>
                      <div className="text-lg font-bold text-blue-400">
                        ₹{gameState.round2Bets.bahar.toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Grand Total */}
              <div className="pt-3 border-t border-gray-600">
                <div className="text-xs text-gray-400 mb-2 text-center">Grand Total</div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-red-900/50 rounded-lg p-2 border border-red-500/50">
                    <div className="text-[10px] text-red-300 mb-0.5">Andar Total</div>
                    <div className="text-xl font-bold text-red-400">
                      ₹{(gameState.round1Bets.andar + gameState.round2Bets.andar).toLocaleString()}
                    </div>
                  </div>
                  <div className="bg-blue-900/50 rounded-lg p-2 border border-blue-500/50">
                    <div className="text-[10px] text-blue-300 mb-0.5">Bahar Total</div>
                    <div className="text-xl font-bold text-blue-400">
                      ₹{(gameState.round1Bets.bahar + gameState.round2Bets.bahar).toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Winner Celebration - Optional for admin to see final results */}
      {showWinnerCelebration && celebrationData && (
        <WinnerCelebration
          winner={celebrationData.winner}
          winningCard={celebrationData.winningCard}
          round={celebrationData.round}
          payoutMessage={celebrationData.payoutMessage || ''}
          onComplete={handleCelebrationComplete}
        />
      )}
    </div>
  );
};

export default AdminGamePanelSimplified;
