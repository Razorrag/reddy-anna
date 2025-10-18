import React, { useState, useEffect, useCallback } from 'react';
import { GameStateProvider } from '../../contexts/GameStateContext';
import { WebSocketProvider, useWebSocket } from '../../contexts/WebSocketContext';
import { NotificationProvider, useNotification } from '../NotificationSystem/NotificationSystem';
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
  const { showNotification } = useNotification();
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

  // WebSocket context
  const { sendWebSocketMessage } = useWebSocket();

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
      const rtmpUrl = document.getElementById('rtmpUrl')?.value || 'rtmp://localhost:1935/live';
      const rtmpStreamKey = document.getElementById('rtmpStreamKey')?.value || 'stream';
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
      streamType: { value: streamType },
      streamUrl: { value: streamUrl },
      streamStatus: { value: streamStatus },
      streamTitle: { value: streamTitle },
      streamDescription: { value: streamDescription },
      rtmpUrl: { value: streamType === 'rtmp' ? document.getElementById('rtmpUrl')?.value : '' },
      rtmpStreamKey: { value: streamType === 'rtmp' ? document.getElementById('rtmpStreamKey')?.value : '' }
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
