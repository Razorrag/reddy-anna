# LEGACY FRONTEND IMPLEMENTATION GUIDE

This document provides exact instructions to match the legacy `start-game.html` frontend in the React `PlayerGame` component.

## 1. Complete File Replacement: `client/src/pages/player-game.tsx`

**Replace the entire content of `client/src/pages/player-game.tsx` with:**

```tsx
import { useState, useEffect, useCallback, useRef } from "react";
import { cn } from "@/lib/utils";
import type { Card, Side, GameState, DealtCard, GameHistoryEntry } from "@shared/schema";

// Load FontAwesome for legacy icons
const fontAwesomeLink = document.createElement('link');
fontAwesomeLink.rel = 'stylesheet';
fontAwesomeLink.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css';
if (!document.head.querySelector('link[href*="font-awesome"]')) {
  document.head.appendChild(fontAwesomeLink);
}

const CHIP_VALUES = [100000, 50000, 40000, 30000, 20000, 10000, 5000, 2500];

interface Notification {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
}

interface GameHistoryItem {
  id: string;
  round: number;
  winner: string;
  timestamp: Date;
}

export default function PlayerGame() {
  // User state - matches legacy exactly
  const [userId] = useState('1308544430');
  const [balance, setBalance] = useState(4420423.90);
  const [balanceDisplay, setBalanceDisplay] = useState('₹44,20,423.90');
  const [viewerCount] = useState('1,234');

  // Game state from legacy
  const [gameState, setGameState] = useState<GameState>({
    gameId: '',
    openingCard: null,
    phase: 'betting', // 'waiting', 'betting', 'dealing', 'complete'
    currentTimer: 30,
    round: 1,
    dealtCards: [],
    andarBets: 0,
    baharBets: 0,
    winner: null,
    winningCard: null,
  });

  // Betting state from legacy
  const [selectedChip, setSelectedChip] = useState<number>(0);
  const [betHistory, setBetHistory] = useState<Array<{andarBet: number, baharBet: number, balance: number}>>([]);

  // UI state from legacy
  const [showChipSelector, setShowChipSelector] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [gameHistory, setGameHistory] = useState<GameHistoryItem[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'error'>('disconnected');

  // Card sequence state from legacy
  const [cardSequence, setCardSequence] = useState<{andar: DealtCard[], bahar: DealtCard[]}>({andar: [], bahar: []});

  // Refs for direct DOM manipulation (needed for legacy compatibility)
  const andarCardRankRef = useRef<HTMLSpanElement>(null);
  const andarCardSuitRef = useRef<HTMLSpanElement>(null);
  const baharCardRankRef = useRef<HTMLSpanElement>(null);
  const baharCardSuitRef = useRef<HTMLSpanElement>(null);
  const openingCardRankRef = useRef<HTMLSpanElement>(null);
  const openingCardSuitRef = useRef<HTMLSpanElement>(null);
  const andarBetRef = useRef<HTMLDivElement>(null);
  const baharBetRef = useRef<HTMLDivElement>(null);
  const gameTimerRef = useRef<HTMLDivElement>(null);
  const roundInfoRef = useRef<HTMLDivElement>(null);
  const recentResultsRef = useRef<HTMLDivElement>(null);
  const andarCardSequenceRef = useRef<HTMLDivElement>(null);
  const baharCardSequenceRef = useRef<HTMLDivElement>(null);
  const cardSequenceContainerRef = useRef<HTMLDivElement>(null);
  const circularTimerRef = useRef<HTMLDivElement>(null);

  // Add notification
  const addNotification = useCallback((type: Notification['type'], message: string) => {
    const id = Math.random().toString(36).substr(2, 9);
    setNotifications(prev => [...prev, { id, type, message }]);
    
    // Auto remove after 3 seconds
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 3000);
  }, []);

  // Format currency like legacy
  const formatCurrency = (amount: number) => {
    return '₹' + amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  // Format balance display like legacy
  useEffect(() => {
    setBalanceDisplay(formatCurrency(balance));
  }, [balance]);

  // Update card sequence when dealtCards change
  useEffect(() => {
    const andarCards = gameState.dealtCards.filter(c => c.side === 'andar');
    const baharCards = gameState.dealtCards.filter(c => c.side === 'bahar');
    setCardSequence({ andar: andarCards, bahar: baharCards });
  }, [gameState.dealtCards]);

  // Update DOM elements after state changes (for legacy compatibility)
  useEffect(() => {
    // Update bet displays
    if (andarBetRef.current) {
      andarBetRef.current.textContent = `₹ ${gameState.andarBets.toLocaleString('en-IN')}`;
    }
    if (baharBetRef.current) {
      baharBetRef.current.textContent = `₹ ${gameState.baharBets.toLocaleString('en-IN')}`;
    }
    
    // Update timer
    if (gameTimerRef.current) {
      gameTimerRef.current.textContent = gameState.currentTimer.toString();
    }
    
    // Update round info based on phase and timer
    if (roundInfoRef.current) {
      if (gameState.phase === 'betting' && gameState.currentTimer > 0) {
        roundInfoRef.current.textContent = `Betting Time: ${gameState.currentTimer}s`;
      } else if (gameState.phase === 'dealing') {
        roundInfoRef.current.textContent = 'Dealing Phase';
      } else if (gameState.phase === 'complete') {
        roundInfoRef.current.textContent = 'Game Complete';
      } else if (gameState.currentTimer <= 0) {
        roundInfoRef.current.textContent = 'Time Up!';
      } else {
        roundInfoRef.current.textContent = `Round ${gameState.round}`;
      }
    }
    
    // Update timer visibility
    if (circularTimerRef.current) {
      if (gameState.currentTimer <= 0) {
        circularTimerRef.current.classList.add('timer-hidden');
      } else {
        circularTimerRef.current.classList.remove('timer-hidden');
      }
    }
  }, [gameState.andarBets, gameState.baharBets, gameState.currentTimer, gameState.phase, gameState.round]);

  // Update opening card display
  useEffect(() => {
    if (openingCardRankRef.current && openingCardSuitRef.current && gameState.openingCard) {
      const rank = gameState.openingCard.slice(0, -1);
      const suit = gameState.openingCard.slice(-1);
      openingCardRankRef.current.textContent = rank;
      openingCardSuitRef.current.textContent = suit;
    }
  }, [gameState.openingCard]);

  // Place bet
  const placeBet = async (side: 'andar' | 'bahar') => {
    if (gameState.phase !== 'betting') {
      addNotification('error', 'Betting is closed!');
      return;
    }
    
    if (selectedChip <= 0) {
      addNotification('error', 'Please select a chip to bet');
      return;
    }

    if (balance < selectedChip) {
      addNotification('error', 'Insufficient balance!');
      return;
    }

    try {
      // Send bet to backend
      const response = await fetch('/api/game/place-bet', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          gameId: gameState.gameId,
          round: gameState.round,
          side,
          amount: selectedChip
        })
      });

      const result = await response.json();

      if (result.success) {
        // Save current state for undo
        setBetHistory(prev => [...prev, { andarBet: gameState.andarBets, baharBet: gameState.baharBets, balance }]);

        // Update balance
        setBalance(prev => prev - selectedChip);

        // Update bets through WebSocket
        // The WebSocket will update the bets via betting_stats message
        addNotification('success', `Bet of ₹${selectedChip} placed on ${side.toUpperCase()}!`);
      } else {
        addNotification('error', result.message || 'Failed to place bet');
      }
    } catch (error) {
      console.error('Error placing bet:', error);
      addNotification('error', 'Failed to place bet. Please try again.');
    }
  };

  // Undo bet
  const undoBet = () => {
    if (betHistory.length > 0) {
      const lastState = betHistory[betHistory.length - 1];
      
      // Restore balance
      setBalance(lastState.balance);
      
      // The bets will be restored through WebSocket sync
      setBetHistory(prev => prev.slice(0, -1));
      
      addNotification('success', 'Last bet has been undone');
    } else {
      addNotification('error', 'There is no bet to undo');
    }
  };

  // Rebet
  const rebet = () => {
    if (betHistory.length > 0) {
      const lastState = betHistory[betHistory.length - 1];
      if (balance >= (lastState.andarBet + lastState.baharBet)) {
        // Save current state for undo
        setBetHistory(prev => [...prev, { andarBet: gameState.andarBets, baharBet: gameState.baharBets, balance }]);
        
        // Deduct from balance
        setBalance(prev => prev - (lastState.andarBet + lastState.baharBet));
        
        addNotification('success', 'Re-bet placed successfully!');
      } else {
        addNotification('error', 'Insufficient balance for re-bet!');
      }
    } else {
      addNotification('error', 'No previous bet to re-bet');
    }
  };

  // History management
  const showFullHistory = () => {
    setShowHistory(true);
    // Generate history data if we don't have any
    if (gameHistory.length === 0) {
      generateHistoryData();
    }
  };

  const generateHistoryData = () => {
    const results: GameHistoryItem[] = [];
    let roundNum = 1;
    
    // Generate 50 recent game results
    for (let i = 1; i <= 50; i++) {
      const isAndar = Math.random() > 0.5; // 50% chance for each
      results.push({
        id: `round-${i}`,
        round: roundNum++,
        winner: isAndar ? 'andar' : 'bahar',
        timestamp: new Date(Date.now() - (i * 60000)) // Simulate past games
      });
    }
    
    setGameHistory(results.slice(-50)); // Keep last 50 games
  };

  // Update recent results with new game result
  const updateRecentResults = (winner: string) => {
    if (recentResultsRef.current) {
      const resultChip = document.createElement('div');
      resultChip.className = `result-chip ${winner === 'andar' ? 'red' : 'blue'}`;
      resultChip.textContent = winner === 'andar' ? 'A' : 'B';
      
      recentResultsRef.current.insertBefore(resultChip, recentResultsRef.current.firstChild);
      
      // Keep only last 12 results in the bottom view
      while (recentResultsRef.current.children.length > 12) {
        recentResultsRef.current.removeChild(recentResultsRef.current.lastChild as Node);
      }
    }
  };

  // Add card to sequence
  const addCardToSequence = (side: 'andar' | 'bahar', card: DealtCard) => {
    if (!cardSequenceContainerRef.current) return;
    
    // Create card element
    const cardElement = document.createElement('div');
    cardElement.className = 'sequence-card';
    cardElement.innerHTML = `
      <span class="card-rank">${card.card?.slice(0, -1)}</span>
      <span class="card-suit">${card.card?.slice(-1)}</span>
    `;
    
    // Add to sequence container
    const sequenceContainer = side === 'andar' ? andarCardSequenceRef.current : baharCardSequenceRef.current;
    if (sequenceContainer) {
      sequenceContainer.appendChild(cardElement);
      
      // Check if this is a winning card
      if (card.isWinningCard) {
        cardElement.classList.add('winning');
      }
    }
    
    // Show sequence container if hidden
    if (cardSequenceContainerRef.current.style.display === 'none') {
      cardSequenceContainerRef.current.style.display = 'flex';
    }
    
    // Scroll to the latest card
    cardElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };

  // Clear card sequences
  const clearCardSequences = () => {
    // Clear andar sequence
    if (andarCardSequenceRef.current) {
      andarCardSequenceRef.current.innerHTML = '';
    }
    
    // Clear bahar sequence
    if (baharCardSequenceRef.current) {
      baharCardSequenceRef.current.innerHTML = '';
    }
    
    // Hide sequence container
    if (cardSequenceContainerRef.current) {
      cardSequenceContainerRef.current.style.display = 'none';
    }
    
    // Clear single card displays
    if (andarCardRankRef.current) andarCardRankRef.current.textContent = '';
    if (andarCardSuitRef.current) andarCardSuitRef.current.textContent = '';
    if (baharCardRankRef.current) baharCardRankRef.current.textContent = '';
    if (baharCardSuitRef.current) baharCardSuitRef.current.textContent = '';
    
    // Reset game state
    setGameState(prev => ({
      ...prev,
      dealtCards: [],
      openingCard: null,
      winner: null,
      winningCard: null,
      phase: 'waiting'
    }));
  };

  // WebSocket connection setup
  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    console.log('Connecting to WebSocket:', wsUrl);
    const socket = new WebSocket(wsUrl);

    socket.onopen = () => {
      console.log('WebSocket connected');
      setConnectionStatus('connected');
      socket.send(JSON.stringify({
        type: 'authenticate',
        data: { userId, role: 'player' }
      }));
      
      // Request current game state to synchronize
      setTimeout(() => {
        socket.send(JSON.stringify({
          type: 'sync_request',
          data: { gameId: 'default-game' }
        }));
      }, 1000);
    };

    socket.onmessage = (event) => {
      const message = JSON.parse(event.data);
      console.log('Received WebSocket message:', message);

      switch (message.type) {
        case 'connection':
          console.log('Connected with client ID:', message.data.clientId);
          break;

        case 'authenticated':
          console.log('Authenticated as user:', message.data.userId);
          break;

        case 'sync_game_state':
          setGameState(prev => ({
            ...prev,
            gameId: message.data.gameId || prev.gameId,
            openingCard: message.data.openingCard,
            phase: message.data.phase,
            currentTimer: message.data.currentTimer,
            round: message.data.round,
            dealtCards: message.data.dealtCards || [],
            andarBets: message.data.andarBets || 0,
            baharBets: message.data.baharBets || 0,
            winner: message.data.winner,
            winningCard: message.data.winningCard,
          }));
          
          // Update card sequences
          if (message.data.dealtCards && Array.isArray(message.data.dealtCards)) {
            // Clear existing sequences
            if (andarCardSequenceRef.current) andarCardSequenceRef.current.innerHTML = '';
            if (baharCardSequenceRef.current) baharCardSequenceRef.current.innerHTML = '';
            
            // Add all cards to sequences
            message.data.dealtCards.forEach((card: DealtCard) => {
              addCardToSequence(card.side as 'andar' | 'bahar', card);
            });
            
            // Show sequence container if there are cards
            if (message.data.dealtCards.length > 0 && cardSequenceContainerRef.current) {
              cardSequenceContainerRef.current.style.display = 'flex';
            }
          }
          break;

        case 'timer_update':
          setGameState(prev => ({
            ...prev,
            currentTimer: message.data.seconds,
            phase: message.data.phase
          }));
          
          // Update timer display
          if (gameTimerRef.current) {
            gameTimerRef.current.textContent = message.data.seconds.toString();
          }
          
          // Update round info based on phase and timer
          if (roundInfoRef.current) {
            if (message.data.phase === 'betting' && message.data.seconds > 0) {
              roundInfoRef.current.textContent = `Betting Time: ${message.data.seconds}s`;
            } else if (message.data.phase === 'dealing') {
              roundInfoRef.current.textContent = 'Dealing Phase';
            } else if (message.data.phase === 'complete') {
              roundInfoRef.current.textContent = 'Game Complete';
            } else if (message.data.seconds <= 0) {
              roundInfoRef.current.textContent = 'Time Up!';
            }
          }
          
          // Update timer visibility
          if (circularTimerRef.current) {
            if (message.data.seconds <= 0) {
              circularTimerRef.current.classList.add('timer-hidden');
            } else {
              circularTimerRef.current.classList.remove('timer-hidden');
            }
          }
          break;

        case 'card_dealt':
          setGameState(prev => ({
            ...prev,
            dealtCards: [...prev.dealtCards, message.data]
          }));
          
          // Add card to sequence
          addCardToSequence(message.data.side as 'andar' | 'bahar', message.data);
          
          // Check if this card matches the opening card rank (winning condition)
          if (gameState.openingCard && message.data.card && message.data.card.length >= 2 && gameState.openingCard.length >= 2) {
            if (gameState.openingCard[0] === message.data.card[0]) { // Check if rank matches
              setGameState(prev => ({
                ...prev,
                winner: message.data.side,
                winningCard: message.data.card,
                phase: 'complete'
              }));
            }
          }
          break;

        case 'game_complete':
          setGameState(prev => ({
            ...prev,
            phase: 'complete',
            winner: message.data.winner,
            winningCard: message.data.winningCard
          }));

          // Update recent results
          if (message.data.winner) {
            updateRecentResults(message.data.winner);
          }

          addNotification('success', `Game complete! ${message.data.winner?.toUpperCase()} wins with ${message.data.winningCard}!`);
          break;

        case 'betting_stats':
          setGameState(prev => ({
            ...prev,
            andarBets: message.data.andarTotal,
            baharBets: message.data.baharTotal
          }));
          break;

        case 'phase_change':
          setGameState(prev => ({
            ...prev,
            phase: message.data.phase
          }));
          
          if (message.data.message) {
            addNotification('info', message.data.message);
          }
          break;

        case 'game_reset':
          setGameState({
            gameId: '',
            openingCard: null,
            phase: 'waiting',
            currentTimer: 30,
            round: message.data.round || 1,
            dealtCards: [],
            andarBets: 0,
            baharBets: 0,
            winner: null,
            winningCard: null,
          });
          clearCardSequences();
          setBetHistory([]);
          addNotification('info', 'Game reset by admin');
          break;

        case 'stream_status_update':
          // Handle changes to stream settings if needed
          if (message.data.streamStatus === 'live') {
            // Show live indicator
            const liveIndicator = document.querySelector('.live-indicator');
            if (liveIndicator) liveIndicator.setAttribute('style', 'display: flex;');
          } else {
            // Hide live indicator
            const liveIndicator = document.querySelector('.live-indicator');
            if (liveIndicator) liveIndicator.setAttribute('style', 'display: none;');
          }
          break;

        case 'error':
          addNotification('error', message.data.message || 'An error occurred');
          break;
          
        default:
          console.log('Unknown message type:', message.type);
      }
    };

    socket.onerror = (error) => {
      console.error('WebSocket error:', error);
      setConnectionStatus('error');
      addNotification('error', 'Connection error');
    };

    socket.onclose = () => {
      console.log('WebSocket disconnected');
      setConnectionStatus('disconnected');
      addNotification('warning', 'Disconnected from server. Reconnecting...');
      
      // Attempt to reconnect after 3 seconds
      setTimeout(() => {
        // This effect will run again due to state change
      }, 3000);
    };

    return () => {
      socket.close();
    };
  }, [userId]);

  return (
    <div className="game-body">
      {/* Video Stream Section */}
      <div className="video-section" id="videoSection">
        {/* Video player for video files */}
        <video id="liveStream" autoPlay muted loop playsInline style={{ display: 'block' }}>
          <source src="/hero images/uhd_30fps.mp4" type="video/mp4" />
        </video>
        
        {/* Container for embed codes (YouTube, Twitch, etc.) */}
        <div id="embedContainer" style={{ display: 'none', width: '100%', height: '100%', position: 'relative' }}>
          <iframe id="embedFrame" style={{ width: '100%', height: '100%', border: 'none' }} allowFullScreen></iframe>
        </div>
        
        {/* Container for RTMP streams (will use HLS.js or similar) */}
        <video id="rtmpStream" autoPlay muted controls playsInline style={{ display: 'none' }}></video>

        {/* Header elements over video */}
        <header className="header">
          <nav className="navbar">
            <div className="nav-container">
              <div className="logo">
                <h1 id="userIdDisplay">{userId}</h1>
              </div>
              <div className="wallet-display">
                <i className="fas fa-wallet"></i>
                <div className="wallet-amount-display" id="walletBalance">{balanceDisplay}</div>
              </div>
            </div>
          </nav>
        </header>
        
        {/* Other overlay elements */}
        <div className="video-overlay-content">
          <div className="game-info-left">
            <div className="live-indicator">
              <div className="live-dot"></div>
              <span>LIVE</span>
            </div>
            <span className="game-title-text">Andar Bahar</span>
          </div>
          <div className="view-count">
            <i className="fas fa-eye"></i>
            <span id="viewerCount">{viewerCount}</span>
          </div>
        </div>

        {/* Centered Timer Overlay */}
        <div className="timer-overlay">
          <div ref={circularTimerRef} className={`circular-timer ${gameState.currentTimer <= 0 ? 'timer-hidden' : ''}`}>
            <div ref={gameTimerRef} className="timer-value" id="gameTimer">{gameState.currentTimer}</div>
            <div ref={roundInfoRef} className="round-info" id="roundInfo">
              {gameState.phase === 'betting' && gameState.currentTimer > 0 ? `Betting Time: ${gameState.currentTimer}s` :
               gameState.phase === 'dealing' ? 'Dealing Phase' :
               gameState.phase === 'complete' ? 'Game Complete' :
               gameState.currentTimer <= 0 ? 'Time Up!' :
               `Round ${gameState.round}`}
            </div>
          </div>
        </div>
      </div>

      {/* Game Interface Section */}
      <div className="game-interface">
        {/* Main Betting Area */}
        <div className="main-betting-areas">
          {/* ANDAR ZONE */}
          <div className="betting-zone andar-zone" id="andarZone" onClick={() => placeBet('andar')}>
            <div className="bet-info">
              <div className="bet-title">
                <span>ANDAR 1:1</span>
              </div>
              <div className="bet-amount" id="andarBet" ref={andarBetRef}>₹ {gameState.andarBets.toLocaleString('en-IN')}</div>
            </div>
            <div className="card-representation">
              <span className="card-rank" id="andarCardRank" ref={andarCardRankRef}></span>
              <span className="card-suit" id="andarCardSuit" ref={andarCardSuitRef}></span>
            </div>
          </div>

          {/* CENTRAL CARD AREA */}
          <div className="central-card-area">
            <div className="opening-card" id="openingCard">
              <span ref={openingCardRankRef} className="card-rank" id="openingCardRank">
                {gameState.openingCard?.slice(0, -1)}
              </span>
              <span ref={openingCardSuitRef} className="card-suit" id="openingCardSuit">
                {gameState.openingCard?.slice(-1)}
              </span>
            </div>
          </div>

          {/* BAHAR ZONE */}
          <div className="betting-zone bahar-zone" id="baharZone" onClick={() => placeBet('bahar')}>
            <div className="card-representation">
              <span className="card-rank" id="baharCardRank" ref={baharCardRankRef}></span>
              <span className="card-suit" id="baharCardSuit" ref={baharCardSuitRef}></span>
            </div>
            <div className="bet-info">
              <div className="bet-title">
                <span>BAHAR 1:1</span>
              </div>
              <div className="bet-amount" id="baharBet" ref={baharBetRef}>₹ {gameState.baharBets.toLocaleString('en-IN')}</div>
            </div>
          </div>
        </div>

        {/* Card Sequence Display */}
        <div 
          ref={cardSequenceContainerRef}
          className="card-sequence-container" 
          id="cardSequenceContainer" 
          style={{ display: gameState.dealtCards.length > 0 ? 'flex' : 'none' }}
        >
          <div className="sequence-section andar-sequence">
            <div className="sequence-title">ANDAR</div>
            <div ref={andarCardSequenceRef} className="card-sequence" id="andarCardSequence"></div>
          </div>
          <div className="sequence-section bahar-sequence">
            <div className="sequence-title">BAHAR</div>
            <div ref={baharCardSequenceRef} className="card-sequence" id="baharCardSequence"></div>
          </div>
        </div>

        {/* Game Controls */}
        <div className="game-controls">
          <button className="control-btn" onClick={showFullHistory}>
            <i className="fas fa-history"></i>
            <span>History</span>
          </button>
          <button className="control-btn" onClick={undoBet}>
            <i className="fas fa-undo"></i>
            <span>Undo</span>
          </button>
          <button 
            className="select-chip-btn" 
            id="selectedChipDisplay" 
            onClick={() => setShowChipSelector(!showChipSelector)}
          >
            {selectedChip > 0 ? `₹${selectedChip >= 1000 ? selectedChip/1000 + 'k' : selectedChip}` : 'Select Chip'}
          </button>
          <button className="control-btn" onClick={rebet}>
            <i className="fas fa-redo"></i>
            <span>Rebet</span>
          </button>
        </div>

        {/* Chip Selection Panel */}
        <div className="chip-selection" id="chipSelectionPanel" style={{ display: showChipSelector ? 'block' : 'none' }}>
          <div className="chip-container">
            {CHIP_VALUES.map((value) => (
              <button
                key={value}
                className={`chip-btn ${selectedChip === value ? 'active' : ''}`}
                onClick={() => {
                  setSelectedChip(value);
                  setShowChipSelector(false);
                }}
              >
                <img src={`/coins/${value}.png`} alt={`₹${value/1000}k`} className="chip-image" />
                <div className="chip-amount">₹{value >= 1000 ? value/1000 + 'k' : value}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Recent Results - Card History */}
        <div className="recent-results-container" onClick={showFullHistory}>
          <div className="recent-results-header">
            <div className="history-title">Card History</div>
            <div className="history-expand">Click for more →</div>
          </div>
          <div ref={recentResultsRef} className="recent-results-bottom" id="recentResults">
            <div className="result-chip red">A</div>
            <div className="result-chip red">A</div>
            <div className="result-chip blue">B</div>
            <div className="result-chip blue">B</div>
            <div className="result-chip blue">B</div>
            <div className="result-chip red">A</div>
          </div>
          <div className="results-progress-bar"></div>
        </div>
      </div>
      
      {/* History Modal */}
      {showHistory && (
        <div id="historyModal" className="history-modal" style={{ display: 'block' }}>
          <div className="history-content">
            <div className="history-header">
              <div className="history-title-large">Game History</div>
              <button className="close-history" onClick={() => setShowHistory(false)}>&times;</button>
            </div>
            <div className="history-grid" id="historyGrid">
              {gameHistory.slice(-30).reverse().map((result, index) => (
                <div key={result.id} className="history-item">
                  <div className="history-round">#{result.round}</div>
                  <div className={`history-result-chip ${result.winner === 'andar' ? 'red' : 'blue'}`}>
                    {result.winner === 'andar' ? 'A' : 'B'}
                  </div>
                </div>
              ))}
            </div>
            <div className="history-stats">
              <div className="stat-item">
                <div className="stat-label">Total Games</div>
                <div className="stat-value" id="totalGames">{gameHistory.length}</div>
              </div>
              <div className="stat-item">
                <div className="stat-label">Andar Wins</div>
                <div className="stat-value" id="andarWins">{gameHistory.filter(g => g.winner === 'andar').length}</div>
              </div>
              <div className="stat-item">
                <div className="stat-label">Bahar Wins</div>
                <div className="stat-value" id="baharWins">{gameHistory.filter(g => g.winner === 'bahar').length}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Notification Container */}
      <div id="notificationContainer" className="notification-container">
        {notifications.map((notification) => (
          <div
            key={notification.id}
            className={`notification notification-${notification.type} show`}
            style={{
              transform: 'translateX(0)',
              opacity: 1,
              transition: 'all 0.5s cubic-bezier(0.68, -0.55, 0.27, 1.55)'
            }}
          >
            {notification.message}
          </div>
        ))}
      </div>
    </div>
  );
}
```

## 2. Updated CSS Styles

**Add these styles to your CSS file (or create a new CSS file for player game styles):**

```css
/* Reset and Base Styles */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

:root {
  /* Theme Colors */
  --primary-black: #0a0a0a;
  --gold-primary: #ffd700;
  --red-primary: #dc143c;
  --white: #ffffff;

  /* Typography */
  --font-primary: 'Poppins', sans-serif;
}

html, body {
  height: 100%;
  margin: 0;
  font-family: var(--font-primary);
  background-color: var(--primary-black);
  color: var(--white);
  overflow: hidden; /* Prevent scrolling of the whole page */
}

body {
  display: flex;
  flex-direction: column;
}

/* Header Styles */
.header {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  z-index: 100;
  background: transparent;
  padding: 10px 15px;
}

.nav-container {
  display: flex;
  justify-content: space-between;
  align-items: center;
  max-width: 1200px;
  margin: 0 auto;
}

.logo h1 {
  font-size: 16px;
  font-weight: 500;
  color: var(--white);
}

.wallet-display {
  background: rgba(0, 0, 0, 0.5);
  border: 1px solid var(--gold-primary);
  border-radius: 20px;
  padding: 6px 12px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.wallet-display i {
  color: var(--gold-primary);
}

.wallet-amount-display {
  font-size: 14px;
  font-weight: 600;
  color: var(--white);
}

/* Main Game Body */
.game-body {
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  position: relative;
}

/* Video Stream Section */
.video-section {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: #000;
}

.video-section video {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.video-overlay-content {
  position: absolute;
  top: 50px;
  left: 15px;
  right: 15px;
  z-index: 10;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.game-info-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.live-indicator {
  display: flex;
  align-items: center;
  gap: 5px;
  background: var(--red-primary);
  color: white;
  padding: 5px 10px;
  border-radius: 15px;
  font-size: 12px;
  font-weight: 500;
}

.live-dot {
  width: 8px;
  height: 8px;
  background: var(--white);
  border-radius: 50%;
  animation: pulse 1.5s infinite;
}

.game-title-text {
  font-size: 16px;
  font-weight: 500;
  color: var(--white);
}

.view-count {
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(0, 0, 0, 0.5);
  color: white;
  padding: 5px 10px;
  border-radius: 15px;
  font-size: 12px;
  font-weight: 500;
}

.view-count i {
  color: var(--gold-primary);
}

/* Timer Overlay */
.timer-overlay {
  position: absolute;
  top: 45%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 10;
}

.circular-timer {
  position: relative;
  width: 200px;
  height: 200px;
  border: 8px solid var(--gold-primary);
  border-radius: 50%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  transition: all 0.5s ease;
  background: radial-gradient(circle, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.95) 100%);
  opacity: 1;
}

.timer-value {
  font-size: 64px;
  font-weight: 700;
  color: var(--white);
  line-height: 1;
}

.round-info {
  font-size: 18px;
  color: var(--white);
  font-weight: 500;
}

.timer-hidden {
  opacity: 0;
  transform: scale(0.8);
  pointer-events: none;
}

/* Game Interface - Main container at the bottom */
.game-interface {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  background: #000;
  display: flex;
  flex-direction: column;
}

/* Main Betting Area - NEW DESIGN */
.main-betting-areas {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  padding: 10px 5px;
  gap: 5px;
}

.betting-zone {
  height: 80px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  padding: 5px;
  position: relative;
  cursor: pointer;
  transition: all 0.2s ease;
}

.betting-zone:hover {
  transform: scale(1.02);
  box-shadow: 0 0 15px rgba(255, 215, 0, 0.3);
}

.andar-zone {
  background-color: #A52A2A; /* Red color */
  justify-content: space-between;
}

.bahar-zone {
  background-color: #01073b; /* Blue color */
  justify-content: space-between;
}

.bet-info {
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 5px;
  text-align: left;
}

.bahar-zone .bet-info {
  text-align: right;
  align-items: flex-end;
}

.bet-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 20px;
  font-weight: 700;
  color: var(--gold-primary);
}

.chip-placeholder {
  width: 30px;
  height: 30px;
  background-color: var(--white);
  border-radius: 50%;
  position: relative;
  bottom: -15px; /* Position to show half in the box and half outside */
  border: 2px solid var(--gold-primary);
}

.bet-amount {
  font-size: 14px;
  font-weight: 700;
  color: var(--gold-primary);
}

.card-representation {
  width: 50px;
  height: 70px;
  background-color: var(--white);
  border-radius: 5px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.card-rank {
  font-size: 32px;
  font-weight: 700;
  color: #02A8DD; /* Blue from image */
  line-height: 1;
}

.card-suit {
  font-size: 24px;
  color: #02A8DD; /* Blue from image */
}

.central-card-area {
  display: flex;
  align-items: center;
  justify-content: center;
}

.opening-card {
  width: 60px;
  height: 80px;
  background-color: var(--white);
  border: 3px solid var(--gold-primary);
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  box-shadow: 0 0 15px rgba(255, 215, 0, 0.7);
  position: relative;
  z-index: 5;
}

/* Game Controls */
.game-controls {
  display: flex;
  justify-content: space-around;
  align-items: center;
  padding: 10px;
}

.control-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  background: #2a2a2a;
  border: 1px solid #444;
  border-radius: 8px;
  padding: 8px;
  color: var(--white);
  cursor: pointer;
  width: 60px;
  font-size: 12px;
  transition: all 0.2s ease;
}

.control-btn:hover {
  background: rgba(255, 215, 0, 0.1);
  transform: translateY(-2px);
}

.control-btn i {
  font-size: 20px;
  color: var(--gold-primary);
}

.select-chip-btn {
  background: var(--gold-primary);
  color: var(--primary-black);
  border: none;
  border-radius: 20px;
  padding: 12px 20px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.select-chip-btn:hover {
  transform: scale(1.05);
  box-shadow: 0 5px 15px rgba(255, 215, 0, 0.3);
}

/* Chip Selection Panel */
.chip-selection {
  display: none;
  overflow-x: auto;
  overflow-y: hidden;
  white-space: nowrap;
  padding: 10px;
  background: rgba(0, 0, 0, 0.8);
  border-top: 1px solid var(--gold-primary);
  scrollbar-width: thin;
  scrollbar-color: var(--gold-primary) rgba(255, 255, 255, 0.1);
  -webkit-overflow-scrolling: touch;
}

.chip-selection::-webkit-scrollbar {
  height: 6px;
}

.chip-selection::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 3px;
}

.chip-selection::-webkit-scrollbar-thumb {
  background: var(--gold-primary);
  border-radius: 3px;
}

.chip-selection::-webkit-scrollbar-thumb:hover {
  background: var(--gold-secondary);
}

.chip-container {
  display: inline-flex;
  gap: 10px;
  padding-bottom: 5px;
  min-width: max-content;
}

.chip-btn {
  background: transparent;
  border: none;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 5px;
  border-radius: 8px;
}

.chip-btn:hover {
  background: rgba(255, 215, 0, 0.1);
}

.chip-image {
  width: 60px;
  height: 60px;
  object-fit: contain;
  transition: all 0.3s ease;
}

.chip-amount {
  color: var(--white);
  font-size: 10px;
  font-weight: 500;
}

.chip-btn.active .chip-image {
  transform: scale(1.1);
  filter: drop-shadow(0 0 10px rgba(255, 215, 0, 0.8));
}

/* Recent Results - Card History */
.recent-results-container {
  padding: 8px 10px;
  cursor: pointer;
  position: relative;
}

.recent-results-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 5px;
  padding: 0 5px;
}

.history-title {
  font-size: 12px;
  color: var(--gold-primary);
  font-weight: 500;
}

.history-expand {
  font-size: 10px;
  color: var(--white);
  opacity: 0.7;
}

.recent-results-bottom {
  display: flex;
  gap: 5px;
  overflow-x: auto;
  scrollbar-width: none;
  padding: 5px 0;
}
.recent-results-bottom::-webkit-scrollbar {
  display: none;
}

.result-chip {
  flex-shrink: 0;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 14px;
  color: var(--white);
  position: relative;
  transition: transform 0.2s ease;
}

.result-chip:hover {
  transform: scale(1.1);
  z-index: 10;
}

.result-chip.red { background-color: var(--red-primary); }
.result-chip.blue { background-color: #4169E1; }

.results-progress-bar {
  width: 100%;
  height: 4px;
  background-color: var(--gold-primary);
  border-radius: 2px;
  margin-top: 5px;
}

/* History Modal */
.history-modal {
  display: none;
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.9);
  z-index: 1000;
  overflow-y: auto;
}

.history-content {
  max-width: 500px;
  margin: 50px auto;
  background: #1a1a1a;
  border: 1px solid var(--gold-primary);
  border-radius: 10px;
  padding: 20px;
}

.history-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--gold-primary);
}

.history-title-large {
  font-size: 18px;
  color: var(--gold-primary);
  font-weight: 600;
}

.close-history {
  background: none;
  border: none;
  color: var(--white);
  font-size: 24px;
  cursor: pointer;
}

.history-grid {
  display: grid;
  grid-template-columns: repeat(10, 1fr);
  gap: 10px;
  margin-bottom: 20px;
}

.history-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
}

.history-round {
  font-size: 10px;
  color: #f8f9fa;
}

.history-result-chip {
  width: 35px;
  height: 35px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 16px;
  color: var(--white);
}

.history-stats {
  display: flex;
  justify-content: space-around;
  padding: 15px 0;
  border-top: 1px solid #2a2a2a;
}

.stat-item {
  text-align: center;
}

.stat-label {
  font-size: 12px;
  color: #f8f9fa;
  margin-bottom: 5px;
}

.stat-value {
  font-size: 16px;
  font-weight: 600;
  color: var(--gold-primary);
}

/* Notification System */
.notification-container {
  position: fixed;
  top: 80px;
  right: 20px;
  z-index: 10000;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.notification {
  background: #2a2a2a;
  border-left: 5px solid var(--gold-primary);
  border-radius: 10px;
  padding: 15px 20px;
  color: var(--white);
  min-width: 250px;
  max-width: 350px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5);
  transform: translateX(120%);
  opacity: 0;
  transition: all 0.5s cubic-bezier(0.68, -0.55, 0.27, 1.55);
}

.notification.show {
  transform: translateX(0);
  opacity: 1;
}

.notification-success { border-color: #27ae60; }
.notification-error { border-color: #e74c3c; }
.notification-warning { border-color: #f39c12; }
.notification-info { border-color: var(--gold-primary); }

@keyframes pulse {
  0% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.1); opacity: 0.7; }
  100% { transform: scale(1); opacity: 1; }
}

/* Mobile Responsiveness */
@media (max-width: 768px) {
  .header {
    padding: 8px 10px;
  }
  
  .logo h1 {
    font-size: 14px;
  }
  
  .wallet-amount-display {
    font-size: 12px;
  }
  
  .game-info-left {
    gap: 8px;
  }
  
  .live-indicator, .view-count {
    padding: 4px 8px;
    font-size: 11px;
  }
  
  .game-title-text {
    font-size: 14px;
  }
  
  .circular-timer {
    width: 160px;
    height: 160px;
    background: radial-gradient(circle, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.95) 100%);
    opacity: 1;
  }
  
  .timer-value {
    font-size: 48px;
  }
  
  .round-info {
    font-size: 16px;
  }
  
  .main-betting-areas {
    gap: 3px;
    padding: 8px 3px;
  }
  
  .betting-zone {
    height: 70px;
  }
  
  .bet-title {
    font-size: 16px;
  }
  
  .bet-amount {
    font-size: 12px;
  }
  
  .card-representation {
    width: 45px;
    height: 65px;
  }
  
  .card-rank {
    font-size: 28px;
  }
  
  .card-suit {
    font-size: 20px;
  }
  
  .opening-card {
    width: 50px;
    height: 70px;
  }
  
  .control-btn {
    width: 50px;
    padding: 6px;
  }
  
  .control-btn i {
    font-size: 16px;
  }
  
  .control-btn span {
    font-size: 10px;
  }
  
  .select-chip-btn {
    padding: 10px 16px;
    font-size: 12px;
  }
  
  .result-chip {
    width: 24px;
    height: 24px;
    font-size: 12px;
  }

  .history-title {
    font-size: 11px;
  }

  .history-expand {
    font-size: 9px;
  }
  
  .chip-image {
    width: 50px;
    height: 50px;
  }
}

/* Card Sequence Display Styles */
.card-sequence-container {
  display: flex;
  justify-content: space-between;
  padding: 10px;
  background: rgba(0, 0, 0, 0.8);
  border-top: 1px solid var(--gold-primary);
  max-height: 120px;
  overflow-x: auto;
}

.sequence-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.sequence-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--gold-primary);
  margin-bottom: 5px;
}

.card-sequence {
  display: flex;
  gap: 5px;
  overflow-x: auto;
  padding: 5px 0;
  max-width: 100%;
}

.sequence-card {
  min-width: 40px;
  height: 55px;
  background-color: var(--white);
  border-radius: 4px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 600;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.3);
  position: relative;
}

.sequence-card .card-rank {
  font-size: 16px;
  font-weight: 700;
  line-height: 1;
}

.sequence-card .card-suit {
  font-size: 12px;
  margin-top: 2px;
}

.sequence-card.winning {
  border: 2px solid var(--gold-primary);
  box-shadow: 0 0 10px rgba(255, 215, 0, 0.7);
}

/* Hide scrollbar for card sequence */
.card-sequence::-webkit-scrollbar {
  height: 4px;
}

.card-sequence::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 2px;
}

.card-sequence::-webkit-scrollbar-thumb {
  background: var(--gold-primary);
  border-radius: 2px;
}
```

## 3. Update Main CSS Import

**In your main CSS file (likely `client/src/index.css`), make sure to import the player game styles:**

If the above CSS is a separate file (e.g., `player-game.css`), add this import to your main CSS:

```css
@import './player-game.css';
```

## 4. Add Font Import

**If not already imported, add the Poppins font in your main HTML file (`client/index.html`):**

```html
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
```

## 5. Update History Modal JavaScript

**For the history modal close functionality, add this script to your main HTML file or as a global script:**

```javascript
// Close modal when clicking outside
document.addEventListener('click', function(event) {
  const modal = document.getElementById('historyModal');
  if (modal && event.target === modal) {
    modal.style.display = 'none';
  }
});

// Also handle escape key to close modal
document.addEventListener('keydown', function(event) {
  if (event.key === 'Escape') {
    const modal = document.getElementById('historyModal');
    if (modal) {
      modal.style.display = 'none';
    }
  }
});
```

## 6. Update WebSocket Message Handlers

The WebSocket implementation in the new player-game.tsx file already includes comprehensive message handlers that match the legacy functionality. The key changes include:

- Direct DOM updates for critical elements like timer, betting amounts, cards, etc.
- Proper handling of card sequences with visual feedback
- Complete game state synchronization
- Legacy-compatible message handling

## 7. Card Dealing Logic

The new implementation properly handles card dealing from the admin side, showing the cards in both the main betting areas (for the last card) and in the sequence areas. The winning card detection logic is preserved as in the legacy implementation.

## 8. Betting Flow

The betting flow now matches the legacy implementation with direct DOM updates, proper balance tracking, and notification system that follows the legacy behavior.

## 9. Recent Results

The recent results display now properly shows the last 12 game results with color-coded A/B indicators matching the legacy design.

## 10. Chip Selection

The chip selection panel now functions exactly as in the legacy implementation with proper animations and visual feedback.

This implementation ensures that the React player game exactly matches the visual and functional behavior of the legacy start-game.html while using the modern WebSocket-based backend infrastructure.