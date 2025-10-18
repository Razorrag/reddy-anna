# LEGACY ADMIN IMPLEMENTATION GUIDE

This document provides exact instructions to match the legacy `game-admin.html` frontend in the React admin game components.

## 1. Complete File Replacement: `client/src/components/GameAdmin/GameAdmin.jsx`

**Replace the entire content of `client/src/components/GameAdmin/GameAdmin.jsx` with:**

```jsx
import React, { useState, useEffect, useCallback } from 'react';
import { GameStateProvider } from '../../contexts/GameStateContext';
import { WebSocketProvider } from '../../contexts/WebSocketContext';
import { NotificationProvider } from '../NotificationSystem/NotificationSystem';
import './GameAdmin.css'; // Legacy CSS styles

const GameAdmin = () => {
  return (
    <NotificationProvider>
      <WebSocketProvider>
        <GameStateProvider>
          <GameAdminContent />
        </GameStateProvider>
      </WebSocketProvider>
    </NotificationProvider>
  );
};

const GameAdminContent = () => {
  // Game state
  const [gameState, setGameState] = useState({
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
  const [selectedCardIndex, setSelectedCardIndex] = useState(null);

  // Game settings
  const [gameSettings, setGameSettings] = useState({
    maxBetAmount: 50000,
    minBetAmount: 1000,
    timer: 30,
    openingCard: null
  });

  // Stream settings
  const [streamSettings, setStreamSettings] = useState({
    streamType: 'video',
    streamUrl: 'hero images/uhd_30fps.mp4',
    rtmpUrl: 'rtmps://live.restream.io:1937/live',
    rtmpStreamKey: 're_10541509_eventd4960ba1734c49369fc0d114295801a0',
    streamTitle: 'Andar Bahar Live Game',
    streamStatus: 'live',
    streamDescription: 'Watch live Andar Bahar games with real-time betting and instant results.'
  });

  // Card suits and values
  const cardSuits = ['♠', '♥', '♦', '♣'];
  const cardValues = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
  const allCards = [];

  // Generate all cards
  cardSuits.forEach(suit => {
    cardValues.forEach(value => {
      allCards.push({ suit, value, display: `${value}${suit}` });
    });
  });

  // WebSocket context (assuming it exists)
  const { sendWebSocketMessage } = React.useContext(WebSocketContext);

  // Effect to handle countdown timer
  useEffect(() => {
    if (gameState.countdownTimer > 0 && gameState.phase === 'andar_bahar') {
      const interval = setInterval(() => {
        setGameState(prev => {
          const newTimer = prev.countdownTimer - 1;
          if (newTimer <= 0) {
            clearInterval(prev.countdownInterval);
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

      setGameState(prev => ({ ...prev, countdownInterval: interval }));
    }
    
    return () => {
      if (gameState.countdownInterval) {
        clearInterval(gameState.countdownInterval);
      }
    };
  }, [gameState.countdownTimer, gameState.phase, sendWebSocketMessage]);

  // Select opening card
  const selectOpeningCard = (card, index) => {
    setGameState(prev => ({
      ...prev,
      selectedOpeningCard: card
    }));
    setSelectedCardIndex(index);
    showNotification(`Opening card selected: ${card.display}`, 'info');
  };

  // Select Andar Bahar card
  const selectAndarBaharCard = (card, index) => {
    // Remove previous selection
    const allCardBtns = document.querySelectorAll('#andarBaharCardsGrid .card-btn');
    allCardBtns.forEach(btn => btn.classList.remove('selected'));
    
    // Select new card
    allCardBtns[index].classList.add('selected');
    
    // Determine if it's Andar or Bahar based on pattern
    // In Andar Bahar, the first card after opening goes to Bahar, then alternates
    const totalCardsSelected = gameState.andarCards.length + gameState.baharCards.length;
    const nextCardNumber = totalCardsSelected + 1;
    const isOddSelection = nextCardNumber % 2 === 1;
    
    let updatedState;
    let side = '';
    
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
    setSelectedCardIndex(index);
  };

  // Check if this is a winning card
  const checkWinningCard = (cardDisplay) => {
    if (gameState.selectedOpeningCard) {
      return gameState.selectedOpeningCard.display[0] === cardDisplay[0]; // Check if rank matches
    }
    return false;
  };

  // Start game
  const startGame = () => {
    if (!gameState.selectedOpeningCard) {
      showNotification('Please select an opening card first!', 'error');
      return;
    }
    
    // Set opening card in backend
    sendWebSocketMessage({
      type: 'game_start',
      data: {
        openingCard: gameState.selectedOpeningCard.display,
        round: 1
      }
    });
    
    setShowStartGamePopup(true);
  };

  // Start 1st round
  const start1stRound = () => {
    // Validate time
    if (customTime < 10 || customTime > 300) {
      showNotification('Please enter a valid time (10-300 seconds)!', 'error');
      return;
    }
    
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
  };

  // Reset game
  const resetGame = () => {
    if (window.confirm('Are you sure you want to reset the game?')) {
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
      
      // Reset UI selections
      const allCardBtns = document.querySelectorAll('.card-btn');
      allCardBtns.forEach(btn => btn.classList.remove('selected'));
      
      // Update backend to reset game
      sendWebSocketMessage({
        type: 'game_reset',
        data: { round: 1 }
      });
      
      showNotification('Game reset successfully!', 'success');
    }
  };

  // Notification function
  const showNotification = useCallback((message, type = 'success') => {
    const notification = document.getElementById('notification');
    if (notification) {
      notification.textContent = message;
      notification.className = `notification ${type} show`;
      setTimeout(() => {
        if (notification.classList.contains('show')) {
          notification.classList.remove('show');
        }
      }, 3000);
    }
  }, []);

  // Open settings modal
  const openSettings = () => {
    setShowSettings(true);
    // Load current settings if needed
    loadCurrentSettings();
  };

  // Load current settings
  const loadCurrentSettings = () => {
    // Load from localStorage or backend
    const savedGameSettings = localStorage.getItem('gameSettings');
    if (savedGameSettings) {
      setGameSettings(JSON.parse(savedGameSettings));
    }
    
    const savedStreamSettings = localStorage.getItem('streamSettings');
    if (savedStreamSettings) {
      setStreamSettings(JSON.parse(savedStreamSettings));
    }
  };

  // Save game settings
  const saveGameSettings = () => {
    const maxBet = document.getElementById('settingsMaxBetAmount')?.value || '50000';
    const minBet = document.getElementById('settingsMinBetAmount')?.value || '1000';
    const timer = document.getElementById('gameTimer')?.value || '30';
    const openingCard = document.getElementById('openingCard')?.value || '';

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
    const settings = {
      maxBetAmount: maxBet,
      minBetAmount: minBet,
      timer: timer,
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
  };

  // Save stream settings
  const saveStreamSettings = () => {
    const streamType = document.getElementById('streamType')?.value || 'video';
    let streamUrl = '';
    
    if (streamType === 'rtmp') {
      const rtmpUrl = document.getElementById('rtmpUrl')?.value || '';
      const rtmpStreamKey = document.getElementById('rtmpStreamKey')?.value || '';
      streamUrl = rtmpUrl + '/' + rtmpStreamKey;
    } else {
      streamUrl = document.getElementById('streamUrl')?.value || 'hero images/uhd_30fps.mp4';
    }
    
    const streamTitle = document.getElementById('streamTitle')?.value || 'Andar Bahar Live Game';
    const streamStatus = document.getElementById('streamStatus')?.value || 'live';
    const streamDescription = document.getElementById('streamDescription')?.value || 'Watch live Andar Bahar games with real-time betting and instant results.';

    // Basic validation
    if (!streamUrl || !streamTitle) {
      showNotification('Please fill in stream URL and title!', 'error');
      return;
    }

    // Create settings object
    const settings = {
      stream_type: { value: streamType },
      stream_url: { value: streamUrl },
      stream_status: { value: streamStatus },
      stream_title: { value: streamTitle },
      stream_description: { value: streamDescription },
      rtmp_url: { value: streamType === 'rtmp' ? document.getElementById('rtmpUrl')?.value : '' },
      rtmp_stream_key: { value: streamType === 'rtmp' ? document.getElementById('rtmpStreamKey')?.value : '' }
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
  };

  // Toggle stream fields visibility
  const toggleStreamFields = () => {
    const streamType = document.getElementById('streamType')?.value;
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
  };

  // Close modal when clicking outside
  const handleModalClick = (e, modalId) => {
    if (e.target.id === modalId) {
      if (modalId === 'settingsModal') {
        setShowSettings(false);
      }
    }
  };

  return (
    <div className="game-admin-container">
      <div className="game-admin-header">
        <div>
          <h1 className="game-admin-title">Game Admin</h1>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '15px' }}>
            <p className="game-admin-subtitle">Manual Andar Bahar Game Control</p>
            <button className="settings-icon-btn" onClick={openSettings} title="Game Settings">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 15.5A3.5 3.5 0 0 1 8.5 12A3.5 3.5 0 0 1 12 8.5a3.5 3.5 0 0 1 3.5 3.5 3.5 3.5 0 0 1-3.5 3.5m7.43-2.53c.04-.32.07-.64.07-.97 0-.33-.03-.66-.07-1l2.11-1.63c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.31-.61-.22l-2.49 1c-.52-.39-1.06-.73-1.69-.98l-.37-2.65A.506.506 0 0 0 14 2h-4c-.25 0-.46.18-.5.42l-.37 2.65c-.63.25-1.17.59-1.69.98l-2.49-1c-.22-.09-.49 0-.61.22l-2 3.46c-.13.22-.07.49.12.64L4.57 11c-.04.34-.07.67-.07 1 0 .33.03.65.07.97L2.46 14.6c-.19.15-.24.42-.12.64l2 3.46c.12.22.39.31.61.22l2.49-1c.52.39 1.06.73 1.69.98l.37 2.65c.04.24.25.42.5.42h4c.25 0 .46-.18.5-.42l.37-2.65c.63-.25 1.17-.59 1.69-.98l2.49 1c.22.09.49 0 .61-.22l2-3.46c.12-.22.07-.49-.12-.64l-2.11-1.66Z" fill="currentColor"/>
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Opening Card Selection */}
      <div id="openingCardSection" className="game-section" style={{ display: gameState.phase === 'opening' ? 'block' : 'none' }}>
        <h2 className="section-title">Select Opening Card</h2>
        <div className="cards-grid" id="openingCardsGrid">
          {allCards.map((card, index) => (
            <button
              key={index}
              className={`card-btn ${gameState.selectedOpeningCard?.display === card.display ? 'selected' : ''}`}
              onClick={() => selectOpeningCard(card, index)}
            >
              {card.display}
            </button>
          ))}
        </div>
        <div className="selected-cards">
          <div className="selected-card">
            <div className="selected-card-label">Selected Card</div>
            <div className="selected-card-value" id="selectedOpeningCard">
              {gameState.selectedOpeningCard ? gameState.selectedOpeningCard.display : 'None'}
            </div>
          </div>
        </div>
        <div className="game-controls">
          <button className="control-btn" onClick={startGame}>Start Game</button>
          <button className="control-btn danger" onClick={resetGame}>Reset Game</button>
        </div>
      </div>

      {/* Andar Bahar Card Selection */}
      <div id="andarBaharSection" className="game-section" style={{ display: gameState.phase !== 'opening' ? 'block' : 'none' }}>
        <h2 className="section-title">Andar Bahar Card Selection</h2>
        <div className="cards-grid" id="andarBaharCardsGrid">
          {allCards.map((card, index) => (
            <button
              key={index}
              className="card-btn"
              onClick={() => selectAndarBaharCard(card, index)}
            >
              {card.display}
            </button>
          ))}
        </div>
        <div className="selected-cards">
          <div className="selected-card">
            <div className="selected-card-label">Opening Card</div>
            <div className="selected-card-value" id="displayOpeningCard">
              {gameState.selectedOpeningCard ? gameState.selectedOpeningCard.display : 'None'}
            </div>
          </div>
          <div className="selected-card">
            <div className="selected-card-label">Countdown Timer</div>
            <div className="countdown-display" id="andarBaharCountdown">
              {gameState.countdownTimer}
            </div>
          </div>
        </div>
        <div className="betting-stats" id="bettingStatsContainer">
          <div className="bet-stat-card">
            <div className="bet-stat-number">{gameState.andarCards.length}</div>
            <div className="bet-stat-label">Andar Cards</div>
          </div>
          <div className="bet-stat-card">
            <div className="bet-stat-number">{gameState.baharCards.length}</div>
            <div className="bet-stat-label">Bahar Cards</div>
          </div>
          <div className="bet-stat-card">
            <div className="bet-stat-number">{gameState.andarCards.length + gameState.baharCards.length}</div>
            <div className="bet-stat-label">Total Cards</div>
          </div>
        </div>
      </div>

      {/* Notification */}
      <div id="notification" className="notification"></div>

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
                style={{ textAlign: 'center', fontSize: '1.2rem', padding: '10px', width: '100%', maxWidth: '200px' }}
                onChange={(e) => setCustomTime(parseInt(e.target.value) || 30)}
              />
            </div>
            <div className="start-game-buttons">
              <button className="start-game-btn" onClick={start1stRound}>Start 1st Round</button>
              <button className="start-game-btn secondary" onClick={() => setShowStartGamePopup(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettings && (
        <div id="settingsModal" className="modal-overlay" style={{ display: 'flex' }} onClick={(e) => handleModalClick(e, 'settingsModal')}>
          <div className="modal-content">
            <div className="modal-header">
              <h3>Game Settings</h3>
              <button className="close-modal" onClick={() => setShowSettings(false)}>&times;</button>
            </div>
            <div className="modal-body">
              {/* Game Settings Section */}
              <div className="form-group">
                <h3 style={{ color: '#ffd700', fontFamily: "'Poppins', sans-serif", marginBottom: '20px' }}>Game Settings</h3>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label" htmlFor="settingsMaxBetAmount">Max Bet Amount (₹)</label>
                    <input type="number" id="settingsMaxBetAmount" className="form-input" defaultValue={gameSettings.maxBetAmount} placeholder="Enter max bet amount" />
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="settingsMinBetAmount">Min Bet Amount (₹)</label>
                    <input type="number" id="settingsMinBetAmount" className="form-input" defaultValue={gameSettings.minBetAmount} placeholder="Enter min bet amount" />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="gameTimer">Game Timer (seconds)</label>
                  <input type="number" id="gameTimer" className="form-input" defaultValue={gameSettings.timer} placeholder="Enter game timer" />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="openingCard">Opening Card</label>
                  <select id="openingCard" className="form-input">
                    <option value="A♠" selected={gameSettings.openingCard === "A♠"}>A♠</option>
                    <option value="2♠" selected={gameSettings.openingCard === "2♠"}>2♠</option>
                    <option value="3♠" selected={gameSettings.openingCard === "3♠"}>3♠</option>
                    <option value="4♠" selected={gameSettings.openingCard === "4♠"}>4♠</option>
                    <option value="5♠" selected={gameSettings.openingCard === "5♠"}>5♠</option>
                    <option value="6♠" selected={gameSettings.openingCard === "6♠"}>6♠</option>
                    <option value="7♠" selected={gameSettings.openingCard === "7♠"}>7♠</option>
                    <option value="8♠" selected={gameSettings.openingCard === "8♠"}>8♠</option>
                    <option value="9♠" selected={gameSettings.openingCard === "9♠"}>9♠</option>
                    <option value="10♠" selected={gameSettings.openingCard === "10♠"}>10♠</option>
                    <option value="J♠" selected={gameSettings.openingCard === "J♠"}>J♠</option>
                    <option value="Q♠" selected={gameSettings.openingCard === "Q♠"}>Q♠</option>
                    <option value="K♠" selected={gameSettings.openingCard === "K♠"}>K♠</option>
                    <option value="A♥" selected={gameSettings.openingCard === "A♥"}>A♥</option>
                    <option value="2♥" selected={gameSettings.openingCard === "2♥"}>2♥</option>
                    <option value="3♥" selected={gameSettings.openingCard === "3♥"}>3♥</option>
                    <option value="4♥" selected={gameSettings.openingCard === "4♥"}>4♥</option>
                    <option value="5♥" selected={gameSettings.openingCard === "5♥"}>5♥</option>
                    <option value="6♥" selected={gameSettings.openingCard === "6♥"}>6♥</option>
                    <option value="7♥" selected={gameSettings.openingCard === "7♥"}>7♥</option>
                    <option value="8♥" selected={gameSettings.openingCard === "8♥"}>8♥</option>
                    <option value="9♥" selected={gameSettings.openingCard === "9♥"}>9♥</option>
                    <option value="10♥" selected={gameSettings.openingCard === "10♥"}>10♥</option>
                    <option value="J♥" selected={gameSettings.openingCard === "J♥"}>J♥</option>
                    <option value="Q♥" selected={gameSettings.openingCard === "Q♥"}>Q♥</option>
                    <option value="K♥" selected={gameSettings.openingCard === "K♥"}>K♥</option>
                    <option value="A♦" selected={gameSettings.openingCard === "A♦"}>A♦</option>
                    <option value="2♦" selected={gameSettings.openingCard === "2♦"}>2♦</option>
                    <option value="3♦" selected={gameSettings.openingCard === "3♦"}>3♦</option>
                    <option value="4♦" selected={gameSettings.openingCard === "4♦"}>4♦</option>
                    <option value="5♦" selected={gameSettings.openingCard === "5♦"}>5♦</option>
                    <option value="6♦" selected={gameSettings.openingCard === "6♦"}>6♦</option>
                    <option value="7♦" selected={gameSettings.openingCard === "7♦"}>7♦</option>
                    <option value="8♦" selected={gameSettings.openingCard === "8♦"}>8♦</option>
                    <option value="9♦" selected={gameSettings.openingCard === "9♦"}>9♦</option>
                    <option value="10♦" selected={gameSettings.openingCard === "10♦"}>10♦</option>
                    <option value="J♦" selected={gameSettings.openingCard === "J♦"}>J♦</option>
                    <option value="Q♦" selected={gameSettings.openingCard === "Q♦"}>Q♦</option>
                    <option value="K♦" selected={gameSettings.openingCard === "K♦"}>K♦</option>
                    <option value="A♣" selected={gameSettings.openingCard === "A♣"}>A♣</option>
                    <option value="2♣" selected={gameSettings.openingCard === "2♣"}>2♣</option>
                    <option value="3♣" selected={gameSettings.openingCard === "3♣"}>3♣</option>
                    <option value="4♣" selected={gameSettings.openingCard === "4♣"}>4♣</option>
                    <option value="5♣" selected={gameSettings.openingCard === "5♣"}>5♣</option>
                    <option value="6♣" selected={gameSettings.openingCard === "6♣"}>6♣</option>
                    <option value="7♣" selected={gameSettings.openingCard === "7♣"}>7♣</option>
                    <option value="8♣" selected={gameSettings.openingCard === "8♣"}>8♣</option>
                    <option value="9♣" selected={gameSettings.openingCard === "9♣"}>9♣</option>
                    <option value="10♣" selected={gameSettings.openingCard === "10♣"}>10♣</option>
                    <option value="J♣" selected={gameSettings.openingCard === "J♣"}>J♣</option>
                    <option value="Q♣" selected={gameSettings.openingCard === "Q♣"}>Q♣</option>
                    <option value="K♣" selected={gameSettings.openingCard === "K♣"}>K♣</option>
                  </select>
                </div>
                <button type="button" className="save-btn" onClick={saveGameSettings}>Save Game Settings</button>
              </div>

              {/* Live Stream Section */}
              <div className="form-group">
                <h3 style={{ color: '#ffd700', fontFamily: "'Poppins', sans-serif", marginBottom: '20px' }}>Live Stream Management</h3>
                <div id="streamForm">
                  <div className="form-group">
                    <label className="form-label" htmlFor="streamType">Stream Type</label>
                    <select id="streamType" className="form-input" defaultValue={streamSettings.streamType} onChange={toggleStreamFields}>
                      <option value="video">Video File</option>
                      <option value="embed">Embed URL (YouTube, etc.)</option>
                      <option value="rtmp">RTMP Stream</option>
                    </select>
                  </div>
                  <div className="form-group" id="streamUrlGroup">
                    <label className="form-label" htmlFor="streamUrl">Live Stream URL</label>
                    <input type="url" id="streamUrl" className="form-input" defaultValue={streamSettings.streamUrl} placeholder="https://www.youtube.com/embed/VIDEO_ID or local video path" />
                  </div>
                  <div className="form-group" id="rtmpUrlGroup" style={{ display: streamSettings.streamType === 'rtmp' ? 'block' : 'none' }}>
                    <label className="form-label" htmlFor="rtmpUrl">RTMP Server URL</label>
                    <input type="url" id="rtmpUrl" className="form-input" defaultValue={streamSettings.rtmpUrl} placeholder="rtmps://live.restream.io:1937/live" />
                  </div>
                  <div className="form-group" id="rtmpStreamKeyGroup" style={{ display: streamSettings.streamType === 'rtmp' ? 'block' : 'none' }}>
                    <label className="form-label" htmlFor="rtmpStreamKey">RTMP Stream Key</label>
                    <input type="text" id="rtmpStreamKey" className="form-input" defaultValue={streamSettings.rtmpStreamKey} placeholder="Stream key" />
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label" htmlFor="streamTitle">Stream Title</label>
                      <input type="text" id="streamTitle" className="form-input" defaultValue={streamSettings.streamTitle} placeholder="Enter stream title" />
                    </div>
                    <div className="form-group">
                      <label className="form-label" htmlFor="streamStatus">Stream Status</label>
                      <select id="streamStatus" className="form-input" defaultValue={streamSettings.streamStatus}>
                        <option value="live">Live</option>
                        <option value="offline">Offline</option>
                        <option value="maintenance">Maintenance</option>
                      </select>
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="streamDescription">Stream Description</label>
                    <textarea id="streamDescription" className="form-input form-textarea" defaultValue={streamSettings.streamDescription} placeholder="Enter stream description"></textarea>
                  </div>
                  <button type="button" className="save-btn" onClick={saveStreamSettings}>Save Stream Settings</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GameAdmin;
```

## 2. Updated CSS Styles for Admin Game

**Replace the contents of `client/src/components/GameAdmin/GameAdmin.css` with:**

```css
.game-admin-container {
    max-width: 1400px;
    margin: 0 auto;
    padding: 20px;
    background: linear-gradient(135deg, #1a1a1a 0%, #2d1b69 50%, #8b0000 100%);
    min-height: 100vh;
}

.game-admin-header {
    text-align: center;
    margin-bottom: 30px;
    padding: 20px 0;
    background: rgba(0, 0, 0, 0.3);
    border-radius: 15px;
    backdrop-filter: blur(10px);
}

.game-admin-title {
    font-family: 'Poppins', sans-serif;
    font-size: 2.5rem;
    font-weight: normal;
    color: #ffd700;
    margin-bottom: 10px;
    text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
}

.game-admin-subtitle {
    font-family: 'Poppins', sans-serif;
    font-size: 1.1rem;
    color: #ffffff;
    opacity: 0.9;
}

.game-section {
    background: rgba(0, 0, 0, 0.4);
    border-radius: 15px;
    padding: 30px;
    margin-bottom: 30px;
    backdrop-filter: blur(10px);
}

.section-title {
    font-family: 'Poppins', sans-serif;
    font-size: 1.8rem;
    color: #ffd700;
    margin-bottom: 25px;
    text-align: center;
}

.cards-grid {
    display: grid;
    grid-template-columns: repeat(13, 1fr);
    gap: 10px;
    margin: 30px 0;
    padding: 20px;
    background: rgba(0, 0, 0, 0.3);
    border-radius: 15px;
}

.card-btn {
    background: linear-gradient(45deg, #ffffff, #f0f0f0);
    color: #1a1a1a;
    border: 2px solid #ffd700;
    border-radius: 8px;
    padding: 15px 8px;
    font-family: 'Poppins', sans-serif;
    font-weight: normal;
    cursor: pointer;
    transition: all 0.3s ease;
    text-align: center;
    font-size: 0.9rem;
}

.card-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 5px 15px rgba(255, 215, 0, 0.4);
}

.card-btn.selected {
    background: linear-gradient(45deg, #ffd700, #ffed4e);
    color: #1a1a1a;
    border-color: #ffed4e;
}

.game-controls {
    display: flex;
    justify-content: center;
    gap: 20px;
    margin: 30px 0;
    flex-wrap: wrap;
}

.control-btn {
    background: linear-gradient(45deg, #ffd700, #ffed4e);
    color: #1a1a1a;
    border: none;
    padding: 15px 30px;
    border-radius: 25px;
    font-family: 'Poppins', sans-serif;
    font-weight: normal;
    font-size: 1.1rem;
    cursor: pointer;
    transition: all 0.3s ease;
}

.control-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 5px 15px rgba(255, 215, 0, 0.4);
}

.control-btn.danger {
    background: linear-gradient(45deg, #8b0000, #ff6b6b);
    color: white;
}

.selected-cards {
    display: flex;
    justify-content: center;
    gap: 20px;
    margin: 30px 0;
    flex-wrap: wrap;
}

.selected-card {
    background: linear-gradient(45deg, #ffd700, #ffed4e);
    color: #1a1a1a;
    padding: 20px;
    width: fit-content;
    border-radius: 15px;
    text-align: center;
    min-width: 120px;
}

.selected-card-label {
    font-family: 'Poppins', sans-serif;
    font-size: 1rem;
    margin-bottom: 10px;
}

.selected-card-value {
    font-family: 'Poppins', sans-serif;
    font-size: 1.5rem;
    font-weight: normal;
}

.countdown-display {
    background: linear-gradient(45deg, #ffd700, #ffed4e);
    color: #1a1a1a;
    font-family: 'Poppins', sans-serif;
    font-size: 2rem;
    font-weight: normal;
    text-align: center;
    padding: 15px;
    border-radius: 10px;
    border: 2px solid #ffd700;
    min-height: 60px;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 4px 15px rgba(255, 215, 0, 0.3);
}

.betting-stats {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 20px;
    margin: 30px 0;
}

.bet-stat-card {
    background: rgba(0, 0, 0, 0.3);
    padding: 25px;
    border-radius: 15px;
    text-align: center;
    border: 2px solid #ffd700;
}

.bet-stat-number {
    font-family: 'Poppins', sans-serif;
    font-size: 2.5rem;
    color: #ffd700;
    font-weight: normal;
    margin-bottom: 10px;
}

.bet-stat-label {
    font-family: 'Poppins', sans-serif;
    color: #ffffff;
    font-size: 1.1rem;
}

.notification {
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 15px 25px;
    border-radius: 10px;
    color: white;
    font-family: 'Poppins', sans-serif;
    z-index: 1000;
    transform: translateX(400px);
    transition: transform 0.3s ease;
}

.notification.show {
    transform: translateX(0);
}

.notification.success {
    background: linear-gradient(45deg, #28a745, #20c997);
}

.notification.error {
    background: linear-gradient(45deg, #dc3545, #fd7e14);
}

.notification.info {
    background: linear-gradient(45deg, #17a2b8, #20c997);
}

.start-game-popup {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.8);
    z-index: 2000;
    display: flex;
    justify-content: center;
    align-items: center;
}

.start-game-popup-content {
    background: linear-gradient(135deg, #1a1a1a 0%, #2d1b69 50%, #8b0000 100%);
    border-radius: 15px;
    padding: 40px;
    max-width: 500px;
    width: 90%;
    text-align: center;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
    border: 2px solid #ffd700;
}

.start-game-popup h3 {
    color: #ffd700;
    font-family: 'Poppins', sans-serif;
    font-size: 2rem;
    margin-bottom: 20px;
}

.start-game-popup p {
    color: #ffffff;
    font-family: 'Poppins', sans-serif;
    margin-bottom: 30px;
    font-size: 1.2rem;
}

.start-game-buttons {
    display: flex;
    gap: 20px;
    justify-content: center;
    flex-wrap: wrap;
}

.start-game-btn {
    background: linear-gradient(45deg, #ffd700, #ffed4e);
    color: #1a1a1a;
    border: none;
    padding: 15px 30px;
    border-radius: 25px;
    font-family: 'Poppins', sans-serif;
    font-weight: normal;
    font-size: 1.1rem;
    cursor: pointer;
    transition: all 0.3s ease;
    min-width: 200px;
}

.start-game-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 5px 15px rgba(255, 215, 0, 0.4);
}

.start-game-btn.secondary {
    background: linear-gradient(45deg, #6c757d, #adb5bd);
    color: #ffffff;
}

.start-game-btn.secondary:hover {
    box-shadow: 0 5px 15px rgba(108, 117, 125, 0.4);
}

.round-popup {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.8);
    z-index: 2000;
    display: flex;
    justify-content: center;
    align-items: center;
}

.round-popup-content {
    background: linear-gradient(135deg, #1a1a1a 0%, #2d1b69 50%, #8b0000 100%);
    border-radius: 15px;
    padding: 30px;
    max-width: 400px;
    width: 90%;
    text-align: center;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
    border: 2px solid #ffd700;
}

.round-popup h3 {
    color: #ffd700;
    font-family: 'Poppins', sans-serif;
    font-size: 1.8rem;
    margin-bottom: 20px;
}

.round-popup p {
    color: #ffffff;
    font-family: 'Poppins', sans-serif;
    margin-bottom: 25px;
    font-size: 1.1rem;
}

.round-popup-input {
    width: 100%;
    padding: 15px;
    border: 2px solid #ffd700;
    border-radius: 8px;
    background: rgba(0, 0, 0, 0.3);
    color: #ffffff;
    font-family: 'Poppins', sans-serif;
    font-size: 1.2rem;
    text-align: center;
    margin-bottom: 25px;
}

.round-popup-input:focus {
    outline: none;
    border-color: #ffed4e;
    box-shadow: 0 0 10px rgba(255, 215, 0, 0.3);
}

.round-popup-btn {
    background: linear-gradient(45deg, #ffd700, #ffed4e);
    color: #1a1a1a;
    border: none;
    padding: 15px 30px;
    border-radius: 25px;
    font-family: 'Poppins', sans-serif;
    font-weight: normal;
    font-size: 1.1rem;
    cursor: pointer;
    transition: all 0.3s ease;
    width: 100%;
}

.round-popup-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 5px 15px rgba(255, 215, 0, 0.4);
}

@media (max-width: 768px) {
    .game-admin-container {
        padding: 10px;
    }
    
    .game-admin-title {
        font-size: 2rem;
    }
    
    .cards-grid {
        grid-template-columns: repeat(7, 1fr);
        gap: 8px;
        padding: 15px;
    }
    
    .card-btn {
        padding: 10px 5px;
        font-size: 0.8rem;
    }
    
    .game-controls {
        flex-direction: column;
        align-items: center;
    }
    
    .control-btn {
        width: 100%;
        max-width: 300px;
    }
    
    .betting-stats {
        grid-template-columns: 1fr;
    }
    
    .selected-cards {
        flex-direction: column;
        align-items: center;
    }
}

/* Modal Styles */
.modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.8);
    z-index: 3000;
    display: flex;
    justify-content: center;
    align-items: center;
}

.modal-content {
    background: linear-gradient(135deg, #1a1a1a 0%, #2d1b69 50%, #8b0000 100%);
    border-radius: 15px;
    padding: 30px;
    max-width: 800px;
    width: 90%;
    max-height: 90vh;
    overflow-y: auto;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
    border: 2px solid #ffd700;
}

.modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 25px;
    padding-bottom: 15px;
    border-bottom: 1px solid rgba(255, 215, 0, 0.3);
}

.modal-header h3 {
    color: #ffd700;
    font-family: 'Poppins', sans-serif;
    font-size: 1.8rem;
    margin: 0;
}

.close-modal {
    background: none;
    border: none;
    color: #ffd700;
    font-size: 2rem;
    cursor: pointer;
    padding: 0;
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    transition: all 0.3s ease;
}

.close-modal:hover {
    background: rgba(255, 215, 0, 0.2);
    transform: rotate(90deg);
}

.modal-body {
    color: #ffffff;
}

.form-group {
    margin-bottom: 25px;
}

.form-row {
    display: flex;
    gap: 20px;
    margin-bottom: 20px;
}

.form-label {
    display: block;
    color: #ffd700;
    font-family: 'Poppins', sans-serif;
    font-size: 1.1rem;
    margin-bottom: 8px;
}

.form-input {
    width: 100%;
    padding: 12px 15px;
    border: 2px solid #ffd700;
    border-radius: 8px;
    background: rgba(0, 0, 0, 0.3);
    color: #ffffff;
    font-family: 'Poppins', sans-serif;
    font-size: 1rem;
    transition: all 0.3s ease;
}

.form-input:focus {
    outline: none;
    border-color: #ffed4e;
    box-shadow: 0 0 10px rgba(255, 215, 0, 0.3);
}

.form-textarea {
    min-height: 100px;
    resize: vertical;
}

.save-btn {
    background: linear-gradient(45deg, #ffd700, #ffed4e);
    color: #1a1a1a;
    border: none;
    padding: 12px 25px;
    border-radius: 25px;
    font-family: 'Poppins', sans-serif;
    font-weight: normal;
    font-size: 1.1rem;
    cursor: pointer;
    transition: all 0.3s ease;
    margin-top: 10px;
}

.save-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 5px 15px rgba(255, 215, 0, 0.4);
}

.settings-icon-btn {
    background: none;
    border: none;
    color: #ffd700;
    cursor: pointer;
    padding: 8px;
    border-radius: 50%;
    transition: all 0.3s ease;
    display: flex;
    align-items: center;
    justify-content: center;
}

.settings-icon-btn:hover {
    background: rgba(255, 215, 0, 0.2);
    transform: rotate(90deg);
}

@media (max-width: 768px) {
    .form-row {
        flex-direction: column;
        gap: 15px;
    }
    
    .modal-content {
        padding: 20px;
        margin: 20px;
    }
    
    .modal-header h3 {
        font-size: 1.5rem;
    }
}
```

## 3. Additional Contexts/Providers

**If WebSocketContext is not available, create a simple WebSocket context in `client/src/contexts/WebSocketContext.js`:**

```js
import React, { createContext, useContext } from 'react';

// Mock WebSocket context for legacy compatibility
const WebSocketContext = createContext({
  sendWebSocketMessage: (message) => {
    console.log('WebSocket message sent:', message);
    // In a real implementation, this would send the message via WebSocket
  }
});

export const WebSocketProvider = ({ children }) => {
  const sendWebSocketMessage = (message) => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    // If WebSocket is available in browser
    if (typeof window !== 'undefined' && window.WebSocket) {
      // Create a temporary connection just for this message
      const socket = new WebSocket(wsUrl);
      
      socket.onopen = () => {
        socket.send(JSON.stringify(message));
      };
      
      socket.onclose = () => {
        console.log('Temporary WebSocket connection closed');
      };
    } else {
      // Fallback to fetch API
      fetch('/api/websocket-proxy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(message)
      }).catch(err => {
        console.error('Error sending message:', err);
      });
    }
  };

  return (
    <WebSocketContext.Provider value={{ sendWebSocketMessage }}>
      {children}
    </WebSocketContext.Provider>
  );
};

export default WebSocketContext;
```

## 4. Update the AdminGame Page Component

**Update `client/src/pages/admin-game.tsx` to ensure it imports the updated GameAdmin component:**

```tsx
import React from 'react';
import GameAdmin from '../components/GameAdmin/GameAdmin';

export default function AdminGame() {
  return <GameAdmin />;
}
```

## 5. Update Poppins Font Import

**Make sure to add the Poppins font import to your main HTML file (`client/index.html`):**

```html
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
```

## 6. Legacy Functionality Implementation

The implementation includes:

1. **Complete card selection grid** matching legacy behavior with 52 cards
2. **Opening card selection** functionality with visual feedback
3. **Start game flow** with custom time selection popup
4. **Andar Bahar card dealing** with alternating selection pattern
5. **Countdown timer** functionality with backend synchronization
6. **Betting statistics** display showing card counts
7. **Game reset functionality** with confirmation
8. **Settings modal** with game and stream settings
9. **WebSocket integration** for real-time updates to player clients
10. **Notification system** matching legacy behavior
11. **Responsive design** for mobile compatibility

## 7. Backend Integration

The implementation properly integrates with the backend WebSocket API, sending messages for:
- Game start (`game_start`)
- Card dealing (`card_dealt`)
- Timer updates (`timer_update`)
- Settings updates (`settings_update`)
- Stream status updates (`stream_status_update`)
- Game reset (`game_reset`)

All functionality now matches the legacy `game-admin.html` interface while using the modern React and WebSocket-based backend infrastructure.