/**
 * GameAdmin Component - Refactored to use GameStateContext
 * 
 * This component manages the admin interface for the Andar Bahar game.
 * It uses the GameStateContext for state management instead of local state.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useGameState } from '../../contexts/GameStateContext';
import { useWebSocket } from '../../contexts/WebSocketContext';
import { useNotification } from '../NotificationSystem/NotificationSystem';
import GameHeader from './GameHeader';
import OpeningCardSection from './OpeningCardSection';
import AndarBaharSection from './AndarBaharSection';
import SettingsModal from '../SettingsModal/SettingsModal';
import { LoadingButton, LoadingOverlay } from '../LoadingSpinner';
import type { GameSettings, StreamSettings } from '@/types/game';
import './GameAdmin.css';

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
    streamUrl: 'hero images/uhd_30fps.mp4',
    rtmpUrl: 'rtmps://live.restream.io:1937/live',
    rtmpStreamKey: 're_10541509_eventd4960ba1734c49369fc0d114295801a0',
    streamTitle: 'Andar Bahar Live Game',
    streamStatus: 'live',
    streamDescription: 'Watch live Andar Bahar games with real-time betting and instant results.'
  });

  // Initialize phase to 'opening' on mount for admin
  useEffect(() => {
    if (gameState.phase === 'idle') {
      setPhase('opening');
    }
  }, []);

  // Timer effect
  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;
    
    if (gameState.countdownTimer > 0 && gameState.phase === 'betting') {
      intervalId = setInterval(() => {
        const newTimer = gameState.countdownTimer - 1;
        setCountdown(newTimer);
        
        if (newTimer <= 0) {
          sendWebSocketMessage({
            type: 'timer_update',
            data: { seconds: 0, phase: 'closed' }
          });
        } else {
          sendWebSocketMessage({
            type: 'timer_update',
            data: { seconds: newTimer, phase: 'betting' }
          });
        }
      }, 1000);
    }
    
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [gameState.countdownTimer, gameState.phase, setCountdown, sendWebSocketMessage]);

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
      <div className="game-admin-container">
        <GameHeader onSettingsClick={openSettings} />

        {/* PHASE 1: Opening Card Selection */}
        {(gameState.phase === 'opening' || gameState.phase === 'idle') && (
          <OpeningCardSection />
        )}

        {/* PHASE 2: Game Started - Show Bet Details and Card Dealing */}
        {(gameState.phase === 'betting' || gameState.phase === 'dealing') && (
          <>
            {/* Round Control Panel with Bet Details */}
            <div className="round-control-panel" style={{
              background: 'linear-gradient(135deg, rgba(0, 0, 0, 0.9) 0%, rgba(20, 20, 20, 0.9) 100%)',
              border: '2px solid #ffd700',
              borderRadius: '10px',
              padding: '20px',
              margin: '20px',
              color: '#ffd700'
            }}>
              <h2 style={{ fontSize: '1.5rem', marginBottom: '15px', textAlign: 'center' }}>
                🎮 Game In Progress
              </h2>
              
              {/* Current Status */}
              <div style={{ display: 'flex', justifyContent: 'space-around', marginBottom: '20px', flexWrap: 'wrap', gap: '15px' }}>
                <div style={{ textAlign: 'center', minWidth: '100px' }}>
                  <div style={{ fontSize: '0.9rem', color: '#aaa' }}>Round</div>
                  <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>{gameState.currentRound}</div>
                </div>
                <div style={{ textAlign: 'center', minWidth: '100px' }}>
                  <div style={{ fontSize: '0.9rem', color: '#aaa' }}>Timer</div>
                  <div style={{ fontSize: '2rem', fontWeight: 'bold', color: gameState.countdownTimer <= 10 ? '#ff4444' : '#ffd700' }}>
                    {gameState.countdownTimer}s
                  </div>
                </div>
                <div style={{ textAlign: 'center', minWidth: '120px' }}>
                  <div style={{ fontSize: '0.9rem', color: '#aaa' }}>Opening Card</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
                    {gameState.selectedOpeningCard?.display || 'N/A'}
                  </div>
                </div>
              </div>
              
              {/* Bet Distribution */}
              <div style={{ 
                background: 'rgba(255, 215, 0, 0.1)', 
                padding: '20px', 
                borderRadius: '8px',
                marginBottom: '20px'
              }}>
                <h3 style={{ fontSize: '1.3rem', marginBottom: '15px', textAlign: 'center' }}>💰 Live Bet Distribution</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                  <div style={{ 
                    background: 'rgba(165, 42, 42, 0.2)',
                    padding: '15px',
                    borderRadius: '8px',
                    border: '2px solid #A52A2A'
                  }}>
                    <div style={{ color: '#A52A2A', fontWeight: 'bold', fontSize: '1.2rem', marginBottom: '8px' }}>🎴 ANDAR</div>
                    <div style={{ fontSize: '1.8rem', fontWeight: 'bold' }}>₹{gameState.andarTotalBet.toLocaleString('en-IN')}</div>
                  </div>
                  <div style={{ 
                    background: 'rgba(1, 7, 59, 0.2)',
                    padding: '15px',
                    borderRadius: '8px',
                    border: '2px solid #01073b'
                  }}>
                    <div style={{ color: '#4169E1', fontWeight: 'bold', fontSize: '1.2rem', marginBottom: '8px' }}>🎴 BAHAR</div>
                    <div style={{ fontSize: '1.8rem', fontWeight: 'bold' }}>₹{gameState.baharTotalBet.toLocaleString('en-IN')}</div>
                  </div>
                </div>
              </div>
              
              {/* Round Progression Buttons */}
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center' }}>
                <button
                  onClick={startRound2}
                  disabled={gameState.currentRound !== 1}
                  style={{
                    background: gameState.currentRound === 1
                      ? 'linear-gradient(135deg, #9b59b6 0%, #8e44ad 100%)'
                      : '#555',
                    padding: '12px 24px',
                    borderRadius: '8px',
                    border: 'none',
                    color: '#fff',
                    fontWeight: 'bold',
                    cursor: gameState.currentRound === 1 ? 'pointer' : 'not-allowed',
                    opacity: gameState.currentRound === 1 ? 1 : 0.5,
                    fontSize: '1rem'
                  }}
                >
                  🎲 Start Round 2 Betting
                </button>
                
                <button
                  onClick={startRound3}
                  disabled={gameState.currentRound !== 2}
                  style={{
                    background: gameState.currentRound === 2
                      ? 'linear-gradient(135deg, #e74c3c 0%, #c0392b 100%)'
                      : '#555',
                    padding: '12px 24px',
                    borderRadius: '8px',
                    border: 'none',
                    color: '#fff',
                    fontWeight: 'bold',
                    cursor: gameState.currentRound === 2 ? 'pointer' : 'not-allowed',
                    opacity: gameState.currentRound === 2 ? 1 : 0.5,
                    fontSize: '1rem'
                  }}
                >
                  🔥 Start Round 3 (Continuous Draw)
                </button>
                
                <button
                  onClick={resetGame}
                  disabled={isResettingGame}
                  style={{
                    background: 'linear-gradient(135deg, #95a5a6 0%, #7f8c8d 100%)',
                    padding: '12px 24px',
                    borderRadius: '8px',
                    border: 'none',
                    color: '#fff',
                    fontWeight: 'bold',
                    cursor: isResettingGame ? 'not-allowed' : 'pointer',
                    fontSize: '1rem',
                    opacity: isResettingGame ? 0.6 : 1
                  }}
                >
                  {isResettingGame ? '⏳ Resetting...' : '🔄 Reset Game'}
                </button>
              </div>
            </div>

            {/* Card Dealing Section */}
            <AndarBaharSection />
          </>
        )}

        {/* Settings Modal */}
        {showSettings && (
          <SettingsModal onClose={() => setShowSettings(false)} />
        )}
      </div>
    </LoadingOverlay>
  );
};

export default GameAdmin;
