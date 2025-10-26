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
import { useLocation } from 'wouter';
import { useGameState } from '../../contexts/GameStateContext';
import { useWebSocket } from '../../contexts/WebSocketContext';
import { useNotification } from '../../contexts/NotificationContext';
import OpeningCardSelector from './OpeningCardSelector';
import CardDealingPanel from './CardDealingPanel';
import PersistentSidePanel from '../PersistentSidePanel';
import RoundTransition from '../RoundTransition';
import NoWinnerTransition from '../NoWinnerTransition';
import WinnerCelebration from '../WinnerCelebration';
import SimpleStreamSettings from './SimpleStreamSettings';
import BetMonitoringDashboard from '../BetMonitoringDashboard';
import { Users, Gift, BarChart3, History, CreditCard, Settings, Home } from 'lucide-react';

const AdminGamePanel: React.FC = () => {
  const { gameState } = useGameState();
  const { sendWebSocketMessage } = useWebSocket();
  const { showNotification } = useNotification();
  
  const [isResetting, setIsResetting] = useState(false);
  const [showRoundTransition, setShowRoundTransition] = useState(false);
  const [showNoWinnerTransition, setShowNoWinnerTransition] = useState(false);
  const [previousRound, setPreviousRound] = useState(gameState.currentRound);
  const [showWinnerCelebration, setShowWinnerCelebration] = useState(false);
  const [celebrationData, setCelebrationData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'game' | 'stream' | 'bets'>('game');
  const [, setLocation] = useLocation();
  
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

  // Listen for game complete celebration events
  useEffect(() => {
    const handleGameComplete = (event: Event) => {
      const customEvent = event as CustomEvent;
      console.log('Admin: Game complete celebration:', customEvent.detail);
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
    
    // Notify backend - backend will broadcast to all clients including this one
    sendWebSocketMessage({
      type: 'game_reset',
      data: { gameId: gameState.gameId }
    });
    
    console.log('🔄 Admin reset initiated - waiting for backend broadcast');
    showNotification('🔄 Game reset successfully', 'success');
    setTimeout(() => setIsResetting(false), 1000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-900/40 via-slate-900/40 to-purple-900/40 backdrop-blur-sm rounded-xl border border-purple-500/30 shadow-2xl p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setLocation('/admin')}
                className="px-4 py-2 bg-gradient-to-r from-slate-800 to-slate-700 hover:from-slate-700 hover:to-slate-600 text-white rounded-lg font-semibold transition-all duration-200 hover:scale-105 shadow-lg flex items-center gap-2"
              >
                <Home className="w-4 h-4" />
                Dashboard
              </button>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-yellow-400 via-yellow-300 to-yellow-500 bg-clip-text text-transparent drop-shadow-lg">🎰 Game Control</h1>
              <span className="text-base px-4 py-2 bg-gradient-to-r from-yellow-500/20 to-yellow-600/20 border border-yellow-500/40 text-yellow-300 rounded-lg font-bold shadow-lg">Round {gameState.currentRound}</span>
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
          
          {/* Tab Navigation */}
          <div className="flex gap-3 border-t border-purple-500/20 pt-4 overflow-x-auto">
            <button
              onClick={() => setActiveTab('game')}
              className={`px-6 py-3 rounded-xl font-bold transition-all duration-200 whitespace-nowrap ${
                activeTab === 'game'
                  ? 'bg-gradient-to-r from-yellow-500 to-yellow-600 text-gray-900 shadow-lg scale-105'
                  : 'bg-slate-800/50 text-gray-300 hover:bg-slate-700/50 border border-slate-600/50'
              }`}
            >
              🎮 Game Control
            </button>
            <button
              onClick={() => setActiveTab('stream')}
              className={`px-6 py-3 rounded-xl font-bold transition-all duration-200 whitespace-nowrap ${
                activeTab === 'stream'
                  ? 'bg-gradient-to-r from-yellow-500 to-yellow-600 text-gray-900 shadow-lg scale-105'
                  : 'bg-slate-800/50 text-gray-300 hover:bg-slate-700/50 border border-slate-600/50'
              }`}
            >
              🎥 Stream Settings
            </button>
            <button
              onClick={() => setActiveTab('bets')}
              className={`px-6 py-3 rounded-xl font-bold transition-all duration-200 whitespace-nowrap ${
                activeTab === 'bets'
                  ? 'bg-gradient-to-r from-yellow-500 to-yellow-600 text-gray-900 shadow-lg scale-105'
                  : 'bg-slate-800/50 text-gray-300 hover:bg-slate-700/50 border border-slate-600/50'
              }`}
            >
              🎲 Bet Monitoring
            </button>
          </div>
        </div>

        {/* Quick Access Navigation Cards */}
        <div className="bg-gradient-to-r from-slate-900/40 via-purple-900/40 to-slate-900/40 backdrop-blur-sm rounded-xl border border-purple-500/30 shadow-xl p-6 mb-6">
          <h2 className="text-xl font-bold text-yellow-300 mb-4">📊 Management Dashboard</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <button
              onClick={() => setLocation('/user-admin')}
              className="p-4 bg-gradient-to-br from-blue-900/50 to-blue-800/50 hover:from-blue-800/60 hover:to-blue-700/60 rounded-xl border border-blue-500/30 transition-all duration-200 hover:scale-105 shadow-lg"
            >
              <Users className="w-8 h-8 text-blue-300 mx-auto mb-2" />
              <div className="text-sm font-bold text-blue-200">User</div>
              <div className="text-sm font-bold text-blue-200">Management</div>
            </button>
            
            <button
              onClick={() => setLocation('/admin-bonus')}
              className="p-4 bg-gradient-to-br from-purple-900/50 to-purple-800/50 hover:from-purple-800/60 hover:to-purple-700/60 rounded-xl border border-purple-500/30 transition-all duration-200 hover:scale-105 shadow-lg"
            >
              <Gift className="w-8 h-8 text-purple-300 mx-auto mb-2" />
              <div className="text-sm font-bold text-purple-200">Bonus &</div>
              <div className="text-sm font-bold text-purple-200">Referral</div>
            </button>
            
            <button
              onClick={() => setLocation('/admin-analytics')}
              className="p-4 bg-gradient-to-br from-green-900/50 to-green-800/50 hover:from-green-800/60 hover:to-green-700/60 rounded-xl border border-green-500/30 transition-all duration-200 hover:scale-105 shadow-lg"
            >
              <BarChart3 className="w-8 h-8 text-green-300 mx-auto mb-2" />
              <div className="text-sm font-bold text-green-200">Analytics</div>
              <div className="text-sm font-bold text-green-200">Dashboard</div>
            </button>
            
            <button
              onClick={() => setLocation('/game-history')}
              className="p-4 bg-gradient-to-br from-yellow-900/50 to-yellow-800/50 hover:from-yellow-800/60 hover:to-yellow-700/60 rounded-xl border border-yellow-500/30 transition-all duration-200 hover:scale-105 shadow-lg"
            >
              <History className="w-8 h-8 text-yellow-300 mx-auto mb-2" />
              <div className="text-sm font-bold text-yellow-200">Game</div>
              <div className="text-sm font-bold text-yellow-200">History</div>
            </button>
            
            <button
              onClick={() => setLocation('/admin-payments')}
              className="p-4 bg-gradient-to-br from-red-900/50 to-red-800/50 hover:from-red-800/60 hover:to-red-700/60 rounded-xl border border-red-500/30 transition-all duration-200 hover:scale-105 shadow-lg"
            >
              <CreditCard className="w-8 h-8 text-red-300 mx-auto mb-2" />
              <div className="text-sm font-bold text-red-200">Payments</div>
              <div className="text-sm font-bold text-red-200">D/W</div>
            </button>
            
            <button
              onClick={() => setLocation('/backend-settings')}
              className="p-4 bg-gradient-to-br from-gray-900/50 to-gray-800/50 hover:from-gray-800/60 hover:to-gray-700/60 rounded-xl border border-gray-500/30 transition-all duration-200 hover:scale-105 shadow-lg"
            >
              <Settings className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <div className="text-sm font-bold text-gray-200">Backend</div>
              <div className="text-sm font-bold text-gray-200">Settings</div>
            </button>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'stream' ? (
          <SimpleStreamSettings />
        ) : activeTab === 'bets' ? (
          <BetMonitoringDashboard />
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
                  {gameState.currentRound === 1 && '⏳ Round 1 - Deal 1 Bahar + 1 Andar'}
                  {gameState.currentRound === 2 && '⏳ Round 2 - Deal 1 MORE Bahar + 1 MORE Andar'}
                  {gameState.currentRound === 3 && '⚡ Round 3 - Continuous Draw Until Match'}
                </div>
                <div className="text-base text-gray-300 mt-2">
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
              <div className={`rounded-2xl border-2 p-10 text-center shadow-2xl backdrop-blur-sm ${
                gameState.gameWinner === 'andar' 
                  ? 'bg-gradient-to-br from-red-900/50 to-red-800/50 border-red-400' 
                  : 'bg-gradient-to-br from-blue-900/50 to-blue-800/50 border-blue-400'
              }`}>
                <div className="text-7xl mb-6 animate-bounce">🎉</div>
                <div className={`text-5xl font-black mb-4 drop-shadow-lg ${
                  gameState.gameWinner === 'andar' ? 'text-red-300' : 'text-blue-300'
                }`}>
                  {gameState.gameWinner.toUpperCase()} WINS!
                </div>
                <div className="text-2xl text-gray-200 mb-6 font-semibold">
                  Winning Card: {gameState.winningCard?.display}
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

      {/* Winner Celebration - Shows when game completes */}
      {showWinnerCelebration && celebrationData && (
        <WinnerCelebration
          winner={celebrationData.winner}
          winningCard={celebrationData.winningCard}
          payoutMessage={celebrationData.payoutMessage}
          round={celebrationData.round}
          onComplete={handleCelebrationComplete}
        />
      )}
    </div>
  );
};

export default AdminGamePanel;
