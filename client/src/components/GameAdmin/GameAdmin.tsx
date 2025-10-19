import React, { useState, useEffect, useCallback, memo } from 'react';
import { useWebSocket } from '../../contexts/WebSocketContext';
import { useNotification } from '../NotificationSystem/NotificationSystem';
import GameHeader from './GameHeader';
import OpeningCardSection from './OpeningCardSection';
import AndarBaharSection from './AndarBaharSection';
import SettingsModal from '../SettingsModal/SettingsModal';
import { LoadingButton, LoadingOverlay } from '../LoadingSpinner';
import './GameAdmin.css'; // Legacy CSS styles

interface Card {
  suit: string;
  value: string;
  display: string;
}

interface GameSettings {
  maxBetAmount: number;
  minBetAmount: number;
  timer: number;
  openingCard: string | null;
}

interface StreamSettings {
  streamType: 'video' | 'embed' | 'rtmp';
  streamUrl: string;
  rtmpUrl?: string;
  rtmpStreamKey?: string;
  streamTitle: string;
  streamStatus: 'live' | 'offline' | 'maintenance';
  streamDescription: string;
}

interface GameState {
  phase: 'opening' | 'andar_bahar' | 'complete';
  selectedOpeningCard: Card | null;
  andarCards: Card[];
  baharCards: Card[];
  currentRound: number;
  countdownTimer: number;
  countdownInterval: NodeJS.Timeout | null;
  andarTotalBet: number;
  baharTotalBet: number;
}

const GameAdminContent: React.FC = () => {
  const { showNotification } = useNotification();
  const { sendWebSocketMessage } = useWebSocket();
  
  // Game state
  const [gameState, setGameState] = useState<GameState>({
    phase: 'opening', // 'opening', 'andar_bahar', 'complete'
    selectedOpeningCard: null,
    andarCards: [],
    baharCards: [],
    currentRound: 1,
    countdownTimer: 30,
    countdownInterval: null,
    andarTotalBet: 0,
    baharTotalBet: 0,
  });

  const [showSettings, setShowSettings] = useState(false);
  const [showStartGamePopup, setShowStartGamePopup] = useState(false);
  const [showRoundPopup, setShowRoundPopup] = useState(false);
  const [customTime, setCustomTime] = useState(30);
  const [selectedCardIndex, setSelectedCardIndex] = useState<number | null>(null);
  
  // Loading states
  const [isLoading, setIsLoading] = useState(false);
  const [isStartingGame, setIsStartingGame] = useState(false);
  const [isDealingCard, setIsDealingCard] = useState(false);
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

  // Card suits and values - memoized to prevent recalculation
  const allCards: Card[] = React.useMemo(() => {
    const cardSuits = ['♠', '♥', '♦', '♣'];
    const cardValues = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
    const cards: Card[] = [];
    
    cardSuits.forEach(suit => {
      cardValues.forEach(value => {
        cards.push({ suit, value, display: `${value}${suit}` });
      });
    });
    
    return cards;
  }, []);

  // Effect to handle countdown timer with proper cleanup
  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;
    
    if (gameState.countdownTimer > 0 && gameState.phase === 'andar_bahar') {
      intervalId = setInterval(() => {
        setGameState(prev => {
          const newTimer = prev.countdownTimer - 1;
          if (newTimer <= 0) {
            if (intervalId) clearInterval(intervalId);
            // Update backend to indicate betting is closed
            sendWebSocketMessage({
              type: 'timer_update',
              data: { seconds: 0, phase: 'closed' }
            });
            return { ...prev, countdownTimer: 0, countdownInterval: null };
          }
          
          // Update timer in backend
          sendWebSocketMessage({
            type: 'timer_update',
            data: { seconds: newTimer, phase: 'betting' }
          });
          
          return { ...prev, countdownTimer: newTimer };
        });
      }, 1000);

      setGameState(prev => ({ ...prev, countdownInterval: intervalId }));
    }
    
    // Cleanup function
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
      if (gameState.countdownInterval) {
        clearInterval(gameState.countdownInterval);
      }
    };
  }, [gameState.countdownTimer, gameState.phase, sendWebSocketMessage]);

  // Select opening card
  const selectOpeningCard = useCallback((card: Card, index: number) => {
    setGameState(prev => ({
      ...prev,
      selectedOpeningCard: card
    }));
    setSelectedCardIndex(index);
    showNotification(`Opening card selected: ${card.display}`, 'info');
  }, [showNotification]);

  // Select Andar Bahar card
  const selectAndarBaharCard = useCallback((card: Card, index: number) => {
    // Remove previous selection using React state
    setSelectedCardIndex(index);
    
    // Determine if it's Andar or Bahar based on pattern
    // In Andar Bahar, the first card after opening goes to Bahar, then alternates
    const totalCardsSelected = gameState.andarCards.length + gameState.baharCards.length;
    const nextCardNumber = totalCardsSelected + 1;
    const isOddSelection = nextCardNumber % 2 === 1;
    
    let updatedState: GameState;
    let side: 'andar' | 'bahar';
    
    if (isOddSelection) {
      updatedState = {
        ...gameState,
        baharCards: [...gameState.baharCards, card]
      };
      side = 'bahar';
      showNotification(`Bahar card selected: ${card.display}`, 'info');
    } else {
      updatedState = {
        ...gameState,
        andarCards: [...gameState.andarCards, card]
      };
      side = 'andar';
      showNotification(`Andar card selected: ${card.display}`, 'info');
    }
    
    // Send card to backend
    sendWebSocketMessage({
      type: 'card_dealt',
      data: {
        card: card.display,
        side: side,
        position: nextCardNumber,
        isWinningCard: checkWinningCard(card.display)
      }
    });
    
    setGameState(updatedState);
  }, [gameState, showNotification, sendWebSocketMessage]);

  // Check if this is a winning card
  const checkWinningCard = (cardDisplay: string): boolean => {
    if (gameState.selectedOpeningCard) {
      return gameState.selectedOpeningCard.display[0] === cardDisplay[0]; // Check if rank matches
    }
    return false;
  };

  // Start game
  const startGame = useCallback(() => {
    if (!gameState.selectedOpeningCard) {
      showNotification('Please select an opening card first!', 'error');
      return;
    }
    
    setIsStartingGame(true);
    
    // Set opening card in backend
    sendWebSocketMessage({
      type: 'game_start',
      data: {
        openingCard: gameState.selectedOpeningCard.display,
        round: 1
      }
    });
    
    setShowStartGamePopup(true);
    setIsStartingGame(false);
  }, [gameState.selectedOpeningCard, showNotification, sendWebSocketMessage]);

  // Start 1st round
  const start1stRound = useCallback(async () => {
    // Validate time
    if (customTime < 10 || customTime > 300) {
      showNotification('Please enter a valid time (10-300 seconds)!', 'error');
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Close popup
      setShowStartGamePopup(false);
      
      // Update UI - switch to Andar Bahar phase
      setGameState(prev => ({
        ...prev,
        phase: 'andar_bahar',
        countdownTimer: customTime
      }));
      
      // Update backend to start timer
      sendWebSocketMessage({
        type: 'timer_update',
        data: {
          seconds: customTime,
          phase: 'betting'
        }
      });
      
      showNotification(`1st Round started with ${customTime} seconds!`, 'success');
    } catch (error) {
      showNotification('Failed to start round. Please try again.', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [customTime, showNotification, sendWebSocketMessage]);

  // Reset game
  const resetGame = useCallback(() => {
    if (window.confirm('Are you sure you want to reset the game?')) {
      setIsResettingGame(true);
      
      // Stop countdown timer
      if (gameState.countdownInterval) {
        clearInterval(gameState.countdownInterval);
      }
      
      // Reset game state
      setGameState({
        phase: 'opening', // Back to opening phase
        selectedOpeningCard: null,
        andarCards: [],
        baharCards: [],
        currentRound: 1,
        countdownTimer: 30,
        countdownInterval: null,
        andarTotalBet: 0,
        baharTotalBet: 0,
      });
      
      setSelectedCardIndex(null);
      
      // Update backend to reset game
      sendWebSocketMessage({
        type: 'game_reset',
        data: { round: 1 }
      });
      
      showNotification('Game reset successfully!', 'success');
      setIsResettingGame(false);
    }
  }, [gameState.countdownInterval, showNotification, sendWebSocketMessage]);

  // Open settings modal
  const openSettings = useCallback(() => {
    setShowSettings(true);
    // Load current settings if needed
    loadCurrentSettings();
  }, []);

  // Load current settings
  const loadCurrentSettings = useCallback(() => {
    // Load from localStorage or backend
    const savedGameSettings = localStorage.getItem('gameSettings');
    if (savedGameSettings) {
      setGameSettings(JSON.parse(savedGameSettings));
    }
    
    const savedStreamSettings = localStorage.getItem('streamSettings');
    if (savedStreamSettings) {
      setStreamSettings(JSON.parse(savedStreamSettings));
    }
  }, []);

  // Save game settings
  const saveGameSettings = useCallback(() => {
    const maxBet = (document.getElementById('settingsMaxBetAmount') as HTMLInputElement)?.value || '50000';
    const minBet = (document.getElementById('settingsMinBetAmount') as HTMLInputElement)?.value || '1000';
    const timer = (document.getElementById('gameTimer') as HTMLInputElement)?.value || '30';
    const openingCard = (document.getElementById('openingCard') as HTMLSelectElement)?.value || '';

    // Basic validation
    if (!maxBet || !minBet || !timer) {
      showNotification('Please fill in all game settings!', 'error');
      return;
    }

    if (parseInt(maxBet) <= parseInt(minBet)) {
      showNotification('Max bet must be greater than min bet!', 'error');
      return;
    }

    // Save to localStorage
    const settings: GameSettings = {
      maxBetAmount: parseInt(maxBet),
      minBetAmount: parseInt(minBet),
      timer: parseInt(timer),
      openingCard: openingCard
    };
    localStorage.setItem('gameSettings', JSON.stringify(settings));
    
    // Update local state
    setGameSettings(settings);
    
    // Send to backend via WebSocket
    sendWebSocketMessage({
      type: 'settings_update',
      data: settings
    });
    
    showNotification('Game settings saved successfully!', 'success');
    setShowSettings(false);
  }, [showNotification, sendWebSocketMessage]);

  // Save stream settings
  const saveStreamSettings = useCallback(() => {
    const streamType = (document.getElementById('streamType') as HTMLSelectElement)?.value || 'video';
    let streamUrl = '';
    
    if (streamType === 'rtmp') {
      const rtmpUrl = (document.getElementById('rtmpUrl') as HTMLInputElement)?.value || 'rtmp://localhost:1935/live';
      const rtmpStreamKey = (document.getElementById('rtmpStreamKey') as HTMLInputElement)?.value || 'stream';
      streamUrl = rtmpUrl + '/' + rtmpStreamKey;
    } else {
      streamUrl = (document.getElementById('streamUrl') as HTMLInputElement)?.value || 'hero images/uhd_30fps.mp4';
    }
    
    const streamTitle = (document.getElementById('streamTitle') as HTMLInputElement)?.value || 'Andar Bahar Live Game';
    const streamStatus = (document.getElementById('streamStatus') as HTMLSelectElement)?.value || 'live';
    const streamDescription = (document.getElementById('streamDescription') as HTMLTextAreaElement)?.value || 'Watch live Andar Bahar games with real-time betting and instant results.';

    // Basic validation
    if (!streamUrl || !streamTitle) {
      showNotification('Please fill in stream URL and title!', 'error');
      return;
    }

    // Create settings object
    const settings: StreamSettings = {
      streamType: streamType as 'video' | 'embed' | 'rtmp',
      streamUrl: streamUrl,
      streamStatus: streamStatus as 'live' | 'offline' | 'maintenance',
      streamTitle: streamTitle,
      streamDescription: streamDescription,
      rtmpUrl: streamType === 'rtmp' ? (document.getElementById('rtmpUrl') as HTMLInputElement)?.value : undefined,
      rtmpStreamKey: streamType === 'rtmp' ? (document.getElementById('rtmpStreamKey') as HTMLInputElement)?.value : undefined
    };

    // Save to localStorage
    localStorage.setItem('streamSettings', JSON.stringify(settings));
    
    // Update local state
    setStreamSettings(settings);
    
    // Send to backend via WebSocket
    sendWebSocketMessage({
      type: 'stream_status_update',
      data: settings
    });
    
    showNotification('Stream settings saved successfully!', 'success');
    setShowSettings(false);
  }, [showNotification, sendWebSocketMessage]);

  // Toggle stream fields visibility
  const toggleStreamFields = useCallback(() => {
    const streamType = (document.getElementById('streamType') as HTMLSelectElement)?.value;
    const streamUrlGroup = document.getElementById('streamUrlGroup');
    const rtmpUrlGroup = document.getElementById('rtmpUrlGroup');
    const rtmpStreamKeyGroup = document.getElementById('rtmpStreamKeyGroup');
    
    // Hide all groups first
    if (streamUrlGroup) streamUrlGroup.style.display = 'none';
    if (rtmpUrlGroup) rtmpUrlGroup.style.display = 'none';
    if (rtmpStreamKeyGroup) rtmpStreamKeyGroup.style.display = 'none';
    
    if (streamType === 'rtmp') {
      if (rtmpUrlGroup) rtmpUrlGroup.style.display = 'block';
      if (rtmpStreamKeyGroup) rtmpStreamKeyGroup.style.display = 'block';
    } else {
      if (streamUrlGroup) streamUrlGroup.style.display = 'block';
    }
  }, []);

  // Close modal when clicking outside
  const handleModalClick = useCallback((e: React.MouseEvent, modalId: string) => {
    if (e.currentTarget.id === modalId) {
      if (modalId === 'settingsModal') {
        setShowSettings(false);
      }
    }
  }, []);

  return (
    <LoadingOverlay isLoading={isResettingGame} message="Resetting game...">
      <div className="game-admin-container">
        <GameHeader onSettingsClick={openSettings} />

        {/* Opening Card Selection */}
        <LoadingOverlay isLoading={isStartingGame} message="Starting game...">
          <OpeningCardSection />
        </LoadingOverlay>

        {/* Andar Bahar Card Selection */}
        <LoadingOverlay isLoading={isDealingCard} message="Dealing card...">
          <AndarBaharSection />
        </LoadingOverlay>

        {/* Start Game Popup */}
        {showStartGamePopup && (
          <div className="start-game-popup">
            <div className="start-game-popup-content">
              <h3>Continue Andar Bahar Cards</h3>
              <p>Opening card selected: {gameState.selectedOpeningCard?.display}</p>
              <div style={{ margin: '20px 0' }}>
                <label style={{ color: '#ffd700', fontFamily: "'Poppins', sans-serif", fontSize: '1.1rem', display: 'block', marginBottom: '10px' }}>
                  Custom Time (seconds)
                </label>
                <input
                  type="number"
                  id="popupCustomTime"
                  className="round-popup-input"
                  value={customTime}
                  min="10"
                  max="300"
                  disabled={isLoading}
                  style={{ textAlign: 'center', fontSize: '1.2rem', padding: '10px', width: '100%', maxWidth: '200px' }}
                  onChange={(e) => setCustomTime(parseInt(e.target.value) || 30)}
                />
              </div>
              <div className="start-game-buttons">
                <LoadingButton
                  isLoading={isLoading}
                  onClick={start1stRound}
                  className="start-game-btn"
                >
                  Start 1st Round
                </LoadingButton>
                <button
                  className="start-game-btn secondary"
                  onClick={() => setShowStartGamePopup(false)}
                  disabled={isLoading}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Settings Modal */}
        {showSettings && (
          <SettingsModal onClose={() => setShowSettings(false)} />
        )}
      </div>
    </LoadingOverlay>
  );
};

export default GameAdminContent;