/**
 * GameAdmin Component - Refactored to use GameStateContext
 * 
 * This component manages the admin interface for the Andar Bahar game.
 * It uses the GameStateContext for state management instead of local state.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useGameState } from '../../contexts/GameStateContext';
import { useWebSocket } from '../../contexts/WebSocketContext';
import { useNotification } from '../../contexts/NotificationContext';
import GameHeader from './GameHeader';
import OpeningCardSection from './OpeningCardSection';
import AndarBaharSection from './AndarBaharSection';
import { LoadingButton, LoadingOverlay } from '../LoadingSpinner';
import type { GameSettings, StreamSettings } from '@/types/game';

const GameAdmin: React.FC = () => {
  const { showNotification } = useNotification();
  const { sendWebSocketMessage } = useWebSocket();
  
  // Use context for game state
  const {
    gameState,
    setPhase,
    setCurrentRound,
    setCountdown,
    resetGame: resetGameState,
    updateTotalBets,
  } = useGameState();
  
  // Note: Role validation is handled by ProtectedRoute in App.tsx
  // In DEV mode, ProtectedRoute bypasses authentication for easier testing
  
  // UI state (not game state)
  const [showSettings, setShowSettings] = useState(false);
  const [customTime, setCustomTime] = useState(30);
  
  // Loading states
  const [isResettingGame, setIsResettingGame] = useState(false);

  // Game settings
  const [gameSettings, setGameSettings] = useState<GameSettings>({
    maxBetAmount: 50000,
    minBetAmount: 1000,
    timer: 30,
    openingCard: null
  });

  // Stream settings
  const [streamSettings, setStreamSettings] = useState<StreamSettings>({
    streamType: 'video',
    streamUrl: '/hero images/uhd_30fps.mp4',
    rtmpUrl: 'rtmp://localhost:1935/live',
    rtmpStreamKey: 'streamKey',
    streamTitle: 'Andar Bahar Live',
    streamStatus: 'live',
    streamDescription: 'Live Andar Bahar Game',
    streamQuality: 'auto',
    streamDelay: 5,
    backupStreamUrl: '',
    embedCode: ''
  });

  // Initialize phase to 'opening' on mount for admin
  useEffect(() => {
    if (gameState.phase === 'idle') {
      setPhase('opening');
    }
  }, []);

  // Timer updates come from backend via WebSocket - no local countdown needed
  // Backend is the single source of truth for timer synchronization
  // This ensures admin and all players see the exact same timer value

  // Start Round 2
  const startRound2 = useCallback(() => {
    if (gameState.currentRound !== 1) {
      showNotification('Can only start Round 2 from Round 1', 'error');
      return;
    }
    
    setCurrentRound(2);
    setPhase('betting');
    setCountdown(30);
    
    sendWebSocketMessage({
      type: 'start_round_2',
      data: { gameId: 'default-game', timer: 30 }
    });
    
    showNotification('Round 2 betting started!', 'success');
  }, [gameState.currentRound, setCurrentRound, setPhase, setCountdown, sendWebSocketMessage, showNotification]);

  // Start Round 3
  const startRound3 = useCallback(() => {
    if (gameState.currentRound !== 2) {
      showNotification('Can only start Round 3 from Round 2', 'error');
      return;
    }
    
    setCurrentRound(3);
    setPhase('dealing');
    setCountdown(0); // No timer for round 3
    
    sendWebSocketMessage({
      type: 'start_final_draw',
      data: { gameId: 'default-game' }
    });
    
    showNotification('Round 3 (Continuous Draw) started!', 'success');
  }, [gameState.currentRound, setCurrentRound, setPhase, setCountdown, sendWebSocketMessage, showNotification]);

  // Reset game
  const resetGame = useCallback(() => {
    if (window.confirm('Are you sure you want to reset the game?')) {
      setIsResettingGame(true);
      
      resetGameState();
      setPhase('opening'); // Back to opening phase
      
      sendWebSocketMessage({
        type: 'game_reset',
        data: { round: 1 }
      });
      
      showNotification('Game reset successfully!', 'success');
      setIsResettingGame(false);
    }
  }, [resetGameState, setPhase, sendWebSocketMessage, showNotification]);

  // Open settings modal
  const openSettings = useCallback(() => {
    setShowSettings(true);
    loadCurrentSettings();
  }, []);

  // Load current settings
  const loadCurrentSettings = useCallback(() => {
    const savedGameSettings = localStorage.getItem('gameSettings');
    if (savedGameSettings) {
      setGameSettings(JSON.parse(savedGameSettings));
    }
    
    const savedStreamSettings = localStorage.getItem('streamSettings');
    if (savedStreamSettings) {
      setStreamSettings(JSON.parse(savedStreamSettings));
    }
  }, []);

  return (
    <LoadingOverlay isLoading={isResettingGame} message="Resetting game...">
      <div className="max-w-7xl mx-auto p-5 bg-gradient-to-br from-gray-900 via-purple-900 to-red-900 min-h-screen">
        {/* Mock Betting Simulation removed for live testing */}
        
        <GameHeader onSettingsClick={openSettings} />

        {/* PHASE 1: Opening Card Selection */}
        {(gameState.phase === 'opening' || gameState.phase === 'idle') && (
          <OpeningCardSection />
        )}

        {/* PHASE 2: Game Started - Show Bet Details and Card Dealing */}
        {(gameState.phase === 'betting' || gameState.phase === 'dealing') && (
          <>
            {/* Round Control Panel with Bet Details */}
            <div className="bg-gradient-to-br from-gray-900 to-gray-800 border-2 border-gold rounded-xl p-5 m-5 text-gold">
              <h2 className="text-2xl mb-4 text-center font-bold">
                🎮 Game In Progress
              </h2>
              
              {/* Current Status */}
              <div className="flex justify-around mb-5 flex-wrap gap-4">
                <div className="text-center min-w-[100px]">
                  <div className="text-sm text-gray-400">Round</div>
                  <div className="text-3xl font-bold">{gameState.currentRound}</div>
                </div>
                <div className="text-center min-w-[100px]">
                  <div className="text-sm text-gray-400">Timer</div>
                  <div className={`text-3xl font-bold ${gameState.countdownTimer <= 10 ? 'text-red-500' : 'text-gold'}`}>
                    {gameState.countdownTimer}s
                  </div>
                </div>
                <div className="text-center min-w-[120px]">
                  <div className="text-sm text-gray-400">Opening Card</div>
                  <div className="text-xl font-bold">
                    {gameState.selectedOpeningCard?.display || 'N/A'}
                  </div>
                </div>
              </div>
              
              {/* Bet Distribution */}
              <div className="bg-gold/10 p-5 rounded-lg mb-5">
                <h3 className="text-xl mb-4 text-center font-bold">💰 Live Bet Distribution</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="bg-andar/20 p-4 rounded-lg border-2 border-andar">
                    <div className="text-andar font-bold text-lg mb-2">🎴 ANDAR</div>
                    <div className="text-2xl font-bold">₹{gameState.andarTotalBet.toLocaleString('en-IN')}</div>
                  </div>
                  <div className="bg-bahar/20 p-4 rounded-lg border-2 border-bahar">
                    <div className="text-blue-500 font-bold text-lg mb-2">🎴 BAHAR</div>
                    <div className="text-2xl font-bold">₹{gameState.baharTotalBet.toLocaleString('en-IN')}</div>
                  </div>
                </div>
              </div>
              
              {/* Round Progression Buttons */}
              <div className="flex gap-3 flex-wrap justify-center">
                <button
                  onClick={startRound2}
                  disabled={gameState.currentRound !== 1}
                  className={`px-6 py-3 rounded-lg border-0 text-white font-bold text-base transition-all ${
                    gameState.currentRound === 1
                      ? 'bg-gradient-to-r from-purple-600 to-purple-700 cursor-pointer hover:from-purple-700 hover:to-purple-800'
                      : 'bg-gray-600 cursor-not-allowed opacity-50'
                  }`}
                >
                  🎲 Start Round 2 Betting
                </button>
                
                <button
                  onClick={startRound3}
                  disabled={gameState.currentRound !== 2}
                  className={`px-6 py-3 rounded-lg border-0 text-white font-bold text-base transition-all ${
                    gameState.currentRound === 2
                      ? 'bg-gradient-to-r from-red-600 to-red-700 cursor-pointer hover:from-red-700 hover:to-red-800'
                      : 'bg-gray-600 cursor-not-allowed opacity-50'
                  }`}
                >
                  🔥 Start Round 3 (Continuous Draw)
                </button>
                
                <button
                  onClick={resetGame}
                  disabled={isResettingGame}
                  className={`px-6 py-3 rounded-lg border-0 text-white font-bold text-base transition-all ${
                    isResettingGame
                      ? 'bg-gray-600 cursor-not-allowed opacity-60'
                      : 'bg-gradient-to-r from-gray-500 to-gray-600 cursor-pointer hover:from-gray-600 hover:to-gray-700'
                  }`}
                >
                  {isResettingGame ? '⏳ Resetting...' : '🔄 Reset Game'}
                </button>
              </div>
            </div>

            {/* Card Dealing Section */}
            <AndarBaharSection />
          </>
        )}
      </div>
    </LoadingOverlay>
  );
};

export default GameAdmin;
