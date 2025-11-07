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
 * 
 * CRITICAL: DO NOT add RoundTransition or NoWinnerTransition components here!
 * These are PLAYER-ONLY UI elements. Admin should maintain continuous game control
 * without flashing black screens or transition animations during round changes.
 * Admin sees continuous game state, players see animated transitions.
 */

import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useGameState } from '@/contexts/GameStateContext';
import { useWebSocket } from '@/contexts/WebSocketContext';
import { useNotification } from '@/contexts/NotificationContext';
import OpeningCardSelector from './OpeningCardSelector';
import CardDealingPanel from './CardDealingPanel';
import PersistentSidePanel from '@/components/PersistentSidePanel';
import StreamControlPanel from './StreamControlPanel';
import { Home } from 'lucide-react';

const AdminGamePanel: React.FC = () => {
  const { gameState } = useGameState();
  const { sendWebSocketMessage } = useWebSocket();
  const { showNotification } = useNotification();
  
  const [isResetting, setIsResetting] = useState(false);
  const [activeTab, setActiveTab] = useState<'game' | 'stream'>('game');
  const [, setLocation] = useLocation();
  
  // Sync game state when admin navigates to this page
  useEffect(() => {
    // Request current game state when component mounts
    // This ensures the opening card is displayed immediately if it exists
    sendWebSocketMessage({
      type: 'game_subscribe',
      data: {}
    });
    console.log('🔄 Admin panel mounted - requesting game state sync');
  }, [sendWebSocketMessage]);
  
  const handleResetGame = async () => {
    if (!window.confirm('🔄 Reset the entire game? This will clear all bets and restart.')) {
      return;
    }
    
    setIsResetting(true);
    
    // Notify backend - backend will broadcast to all clients including this one
    sendWebSocketMessage({
      type: 'game_reset',
      data: { message: 'Admin initiated game reset' }
    });
    
    console.log('🔄 Admin reset initiated - waiting for backend broadcast');
    showNotification('🔄 Game reset successfully', 'success');
    setTimeout(() => setIsResetting(false), 1000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-900 via-blue-900 to-indigo-900 p-6">
      <div className="w-full">
        {/* Header */}
        <div className="bg-black/40 backdrop-blur-sm rounded-xl border border-gold/30 shadow-2xl p-4 mb-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setLocation('/admin')}
                className="px-4 py-2 bg-gradient-to-r from-slate-800 to-slate-700 hover:from-slate-700 hover:to-slate-600 text-white rounded-lg font-semibold transition-all duration-200 hover:scale-105 shadow-lg flex items-center gap-2"
              >
                <Home className="w-4 h-4" />
                Dashboard
              </button>
              <h1 className="text-3xl font-bold text-gold drop-shadow-lg">🎰 Game Control</h1>
              <span className="text-base px-4 py-2 bg-gold/20 border border-gold/40 text-gold rounded-lg font-bold shadow-lg">Round {gameState.currentRound}</span>
              <span className="text-sm px-3 py-1.5 bg-purple-600/30 border border-purple-400/30 text-purple-200 rounded-lg font-medium">Phase: {gameState.phase}</span>
            </div>
            <button 
              onClick={handleResetGame} 
              disabled={isResetting} 
              className="px-6 py-3 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 disabled:from-gray-600 disabled:to-gray-700 text-white text-sm rounded-xl font-bold shadow-lg transition-all duration-200 hover:scale-105 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isResetting ? '⏳ Resetting...' : '🔄 Reset Game'}
            </button>
          </div>
          
          {/* Tab Navigation - Game Control and Stream */}
          <div className="flex gap-3 border-t border-gold/20 pt-4 overflow-x-auto">
            <button
              onClick={() => setActiveTab('game')}
              className={`px-6 py-3 rounded-xl font-bold transition-all duration-200 whitespace-nowrap ${
                activeTab === 'game'
                  ? 'bg-gradient-to-r from-gold to-yellow-600 text-gray-900 shadow-lg scale-105'
                  : 'bg-slate-800/50 text-gray-300 hover:bg-slate-700/50 border border-slate-600/50'
              }`}
            >
              🎮 Game Control
            </button>
            <button
              onClick={() => setActiveTab('stream')}
              className={`px-6 py-3 rounded-xl font-bold transition-all duration-200 whitespace-nowrap ${
                activeTab === 'stream'
                  ? 'bg-gradient-to-r from-gold to-yellow-600 text-gray-900 shadow-lg scale-105'
                  : 'bg-slate-800/50 text-gray-300 hover:bg-slate-700/50 border border-slate-600/50'
              }`}
            >
              🎥 Stream Settings
            </button>
          </div>
        </div>

        {/* Management Dashboard Removed - Access from main admin dashboard */}

        {/* Tab Content */}
        {activeTab === 'stream' ? (
          <StreamControlPanel />
        ) : (
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
                andarCards={gameState.andarCards}
                baharCards={gameState.baharCards}
              />

              {/* Status Message (below cards) */}
              <div className="bg-gradient-to-r from-green-900/40 to-emerald-900/40 rounded-xl border border-green-500/50 p-6 text-center shadow-xl backdrop-blur-sm">
                <div className="text-2xl font-bold text-green-300 mb-2">
                  {gameState.currentRound === 1 && '🃏 Round 1 - Individual Card Dealing'}
                  {gameState.currentRound === 2 && '🃏 Round 2 - Individual Card Dealing'}
                  {gameState.currentRound === 3 && '⚡ Round 3 - Continuous Draw Until Match'}
                </div>
                <div className="text-base text-gray-300 mt-2">
                  {gameState.currentRound === 3
                    ? 'Deal alternating: Bahar → Andar → Bahar → Andar...'
                    : 'Deal ONE card at a time - winner checked immediately after each card'
                  }
                </div>
                <div className="text-sm text-blue-300 mt-2">
                  {gameState.currentRound === 1 && 'Round 1: Deal 1 Bahar → Check winner → Deal 1 Andar → Check winner → Round 2 if no winner'}
                  {gameState.currentRound === 2 && 'Round 2: Deal 2nd Bahar → Check winner → Deal 2nd Andar → Check winner → Round 3 if no winner'}
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
              <div className={`rounded-2xl border-2 p-10 text-center shadow-2xl backdrop-blur-sm ${
                gameState.gameWinner === 'andar' 
                  ? 'bg-gradient-to-br from-red-900/50 to-red-800/50 border-red-400' 
                  : 'bg-gradient-to-br from-blue-900/50 to-blue-800/50 border-blue-400'
              }`}>
                <div className="text-7xl mb-6 animate-bounce">🎉</div>
                <div className={`text-5xl font-black mb-4 ${
                  gameState.gameWinner === 'andar' ? 'text-[#A52A2A]' : 'text-[#01073b]'
                }`}>
                  {gameState.gameWinner === 'andar' 
                    ? 'ANDAR WINS!' 
                    : (gameState.currentRound >= 3 
                      ? 'BAHAR WINS!' 
                      : 'BABA WINS!')}
                </div>
                <div className="text-2xl text-gray-200 mb-6 font-semibold">
                  Winning Card: {typeof gameState.winningCard === 'string' 
                    ? gameState.winningCard 
                    : gameState.winningCard?.display || 'Unknown'}
                </div>
                <div className="text-lg text-gray-300">
                  Round {gameState.currentRound} Complete
                </div>
              </div>

              <button 
                onClick={handleResetGame}
                className="w-full px-8 py-5 bg-gradient-to-r from-green-600 via-emerald-600 to-green-600 hover:from-green-700 hover:via-emerald-700 hover:to-green-700 text-white rounded-xl text-xl font-black shadow-2xl transition-all duration-200 hover:scale-105"
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
        )}
      </div>
    </div>
  );
};

export default AdminGamePanel;
