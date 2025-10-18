# Complete Layout Implementation Guide for Legacy Mobile Experience

## Player Game Component Updates

### Updated Player Game Component (client/src/pages/player-game.tsx)

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
    <div className="game-body fixed inset-0 flex flex-col bg-black">
      {/* Video Stream Section */}
      <div className="video-section flex-1 relative">
        {/* Video player for video files */}
        <video id="liveStream" className="w-full h-full object-cover" autoPlay muted loop playsInline style={{ display: 'block' }}>
          <source src="/hero images/uhd_30fps.mp4" type="video/mp4" />
        </video>
        
        {/* Container for embed codes (YouTube, Twitch, etc.) */}
        <div id="embedContainer" style={{ display: 'none', width: '100%', height: '100%', position: 'relative' }}>
          <iframe id="embedFrame" style={{ width: '100%', height: '100%', border: 'none' }} allowFullScreen></iframe>
        </div>
        
        {/* Container for RTMP streams (will use HLS.js or similar) */}
        <video id="rtmpStream" className="w-full h-full object-cover" autoPlay muted controls playsInline style={{ display: 'none' }}></video>

        {/* Header elements over video */}
        <header className="header absolute top-0 left-0 right-0 z-40 bg-gradient-to-b from-black/80 to-transparent">
          <nav className="navbar">
            <div className="nav-container flex justify-between items-center px-4 py-3">
              <div className="logo">
                <h1 id="userIdDisplay" className="text-gold font-bold text-base">{userId}</h1>
              </div>
              <div className="wallet-display flex items-center gap-2 bg-gold/10 px-3 py-1.5 rounded-full border border-gold">
                <i className="fas fa-wallet text-gold"></i>
                <div className="wallet-amount-display text-gold font-bold text-base" id="walletBalance">{balanceDisplay}</div>
              </div>
            </div>
          </nav>
        </header>
        
        {/* Other overlay elements */}
        <div className="video-overlay-content absolute top-4 left-0 right-0 px-4 flex justify-between items-center">
          <div className="game-info-left flex items-center gap-2">
            <div className="live-indicator flex items-center gap-1 bg-red-600 px-2 py-1 rounded-full">
              <div className="live-dot w-2 h-2 bg-white rounded-full animate-pulse"></div>
              <span className="text-white text-xs uppercase">LIVE</span>
            </div>
            <span className="game-title-text text-white text-sm">Andar Bahar</span>
          </div>
          <div className="view-count flex items-center gap-1 bg-black/50 px-2 py-1 rounded-full">
            <i className="fas fa-eye text-gold"></i>
            <span id="viewerCount" className="text-white text-xs">{viewerCount}</span>
          </div>
        </div>

        {/* Centered Timer Overlay */}
        <div className="timer-overlay absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-30">
          <div ref={circularTimerRef} className={`circular-timer ${gameState.currentTimer <= 0 ? 'timer-hidden' : ''} w-40 h-40 md:w-48 md:h-48 border-8 border-gold flex flex-col items-center justify-center bg-gradient-to-b from-black/80 to-black/95 shadow-2xl shadow-gold/30`}>
            <div ref={gameTimerRef} className="timer-value text-6xl md:text-7xl font-bold text-white tabular-nums" id="gameTimer">{gameState.currentTimer}</div>
            <div ref={roundInfoRef} className="round-info text-lg md:text-xl text-gold font-medium mt-1" id="roundInfo">
              {gameState.phase === 'betting' && gameState.currentTimer > 0 ? `Betting Time: ${gameState.currentTimer}s` :
               gameState.phase === 'dealing' ? 'Dealing Phase' :
               gameState.phase === 'complete' ? 'Game Complete' :
               gameState.currentTimer <= 0 ? 'Time Up!' :
               `Round ${gameState.round}`}
            </div>
          </div>
        </div>
      </div>

      {/* Fixed Three-Panel Betting Area */}
      <div className="fixed bottom-24 left-0 right-0 z-20 px-2">
        <div className="main-betting-areas grid grid-cols-[1fr_auto_1fr] gap-1 md:gap-2 items-center max-w-4xl mx-auto">
          {/* ANDAR ZONE - Fixed Layout */}
          <div className="betting-zone andar-zone bg-[#A52A2A] border-2 border-[#A52A2A] rounded-lg p-3 md:p-4 relative" id="andarZone" onClick={() => placeBet('andar')}>
            <div className="bet-info flex flex-col justify-between h-full">
              <div className="bet-title">
                <span className="text-gold text-sm md:text-base font-bold">ANDAR 1:1</span>
              </div>
              <div className="bet-amount text-gold text-xs md:text-sm font-bold" id="andarBet" ref={andarBetRef}>₹ {gameState.andarBets.toLocaleString('en-IN')}</div>
            </div>
            <div className="card-representation absolute -right-2 bottom-2 w-8 h-[34px] md:w-10 md:h-12 bg-white rounded border-2 flex flex-col items-center justify-center">
              <span ref={andarCardRankRef} className="card-rank text-xs md:text-sm font-bold text-blue-500" id="andarCardRank"></span>
              <span ref={andarCardSuitRef} className="card-suit text-xs md:text-sm font-bold text-blue-500" id="andarCardSuit"></span>
            </div>
          </div>

          {/* CENTRAL CARD AREA - Fixed Layout */}
          <div className="central-card-area flex justify-center">
            <div className="opening-card w-12 h-16 md:w-16 md:h-24 bg-white border-4 border-gold rounded-lg flex items-center justify-center shadow-lg relative">
              <span ref={openingCardRankRef} className="card-rank text-xl md:text-3xl font-bold text-gray-900" id="openingCardRank">
                {gameState.openingCard ? gameState.openingCard.slice(0, -1) : ''}
              </span>
              <span ref={openingCardSuitRef} className="card-suit text-lg md:text-2xl font-bold" id="openingCardSuit" style={{ color: '#02A8DD' }}>
                {gameState.openingCard ? gameState.openingCard.slice(-1) : ''}
              </span>
            </div>
          </div>

          {/* BAHAR ZONE - Fixed Layout */}
          <div className="betting-zone bahar-zone bg-[#01073b] border-2 border-[#01073b] rounded-lg p-3 md:p-4 relative" id="baharZone" onClick={() => placeBet('bahar')}>
            <div className="card-representation absolute -left-2 bottom-2 w-8 h-[34px] md:w-10 md:h-12 bg-white rounded border-2 flex flex-col items-center justify-center">
              <span ref={baharCardRankRef} className="card-rank text-xs md:text-sm font-bold text-blue-500" id="baharCardRank"></span>
              <span ref={baharCardSuitRef} className="card-suit text-xs md:text-sm font-bold text-blue-500" id="baharCardSuit"></span>
            </div>
            <div className="bet-info flex flex-col justify-between h-full text-right">
              <div className="bet-title">
                <span className="text-gold text-sm md:text-base font-bold">BAHAR 1:1</span>
              </div>
              <div className="bet-amount text-gold text-xs md:text-sm font-bold" id="baharBet" ref={baharBetRef}>₹ {gameState.baharBets.toLocaleString('en-IN')}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Card Sequence Display */}
      <div 
        ref={cardSequenceContainerRef}
        className="card-sequence-container fixed bottom-36 left-0 right-0 z-10 bg-black/80 rounded-lg p-2 border border-gold mx-2 max-h-24 overflow-x-auto" 
        id="cardSequenceContainer" 
        style={{ display: gameState.dealtCards.length > 0 ? 'flex' : 'none' }}
      >
        <div className="sequence-section andar-sequence w-1/2 pr-1">
          <div className="sequence-title text-[#A52A2A] text-xs font-semibold mb-1">ANDAR</div>
          <div ref={andarCardSequenceRef} className="card-sequence flex gap-1" id="andarCardSequence"></div>
        </div>
        <div className="sequence-section bahar-sequence w-1/2 pl-1">
          <div className="sequence-title text-[#01073b] text-xs font-semibold mb-1">BAHAR</div>
          <div ref={baharCardSequenceRef} className="card-sequence flex gap-1 justify-end" id="baharCardSequence"></div>
        </div>
      </div>

      {/* Game Controls - Fixed at Bottom */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-black border-t border-gold/30 p-2">
        <div className="container mx-auto max-w-4xl">
          {/* Chip Selector - Matches Legacy */}
          {showChipSelector && (
            <div className="mb-2 pb-2 border-b border-gold/30">
              <div className="flex gap-2 overflow-x-auto pb-1">
                {CHIP_VALUES.map((value) => (
                  <div
                    key={value}
                    className={`flex flex-col items-center min-w-[50px] ${selectedChip === value ? 'scale-110' : ''}`}
                    onClick={() => {
                      setSelectedChip(value);
                      setShowChipSelector(false);
                    }}
                  >
                    <div className={`w-12 h-12 md:w-14 md:h-14 rounded-full flex items-center justify-center border-4 ${
                      selectedChip === value ? 'border-gold shadow-gold/50 shadow-2xl' : 'border-white/30'
                    } bg-white relative overflow-hidden`}>
                      <img 
                        src={`/coins/${value}.png`} 
                        alt={`₹${value/1000}k`}
                        className="w-full h-full object-contain p-0.5"
                      />
                    </div>
                    <span className="text-gold text-xs mt-1">
                      {value >= 1000 ? `₹${value/1000}k` : `₹${value}`}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Control Buttons - Matches Legacy Layout */}
          <div className="grid grid-cols-4 gap-1">
            <button
              className="control-btn flex flex-col items-center py-2 border border-gold text-gold bg-transparent"
              onClick={showFullHistory}
            >
              <i className="fas fa-history text-sm"></i>
              <span className="text-xs mt-1">History</span>
            </button>
            <button
              className="control-btn flex flex-col items-center py-2 border border-gold text-gold bg-transparent"
              onClick={undoBet}
            >
              <i className="fas fa-undo text-sm"></i>
              <span className="text-xs mt-1">Undo</span>
            </button>
            <button 
              className="select-chip-btn flex flex-col items-center py-2 bg-gold text-black"
              id="selectedChipDisplay" 
              onClick={() => setShowChipSelector(!showChipSelector)}
            >
              <div className="text-sm font-bold">
                {selectedChip > 0 ? `₹${selectedChip >= 1000 ? selectedChip/1000 + 'k' : selectedChip}` : 'Select'}
              </div>
              <span className="text-xs">Chip</span>
            </button>
            <button
              className="control-btn flex flex-col items-center py-2 border border-gold text-gold bg-transparent"
              onClick={rebet}
            >
              <i className="fas fa-redo text-sm"></i>
              <span className="text-xs mt-1">Rebet</span>
            </button>
          </div>
        </div>
      </div>

      {/* Recent Results - Card History */}
      <div className="fixed bottom-16 left-0 right-0 z-30 bg-black/90 border-t border-gold/30 p-2" onClick={showFullHistory}>
        <div className="flex items-center justify-between mb-1 px-2">
          <div className="flex items-center gap-2">
            <i className="fas fa-clock text-gold text-sm"></i>
            <span className="text-white text-xs font-medium">Card History</span>
          </div>
          <span className="text-xs text-white/60">Click for more →</span>
        </div>
        <div ref={recentResultsRef} className="flex gap-1 overflow-x-auto pb-1 px-2" id="recentResults">
          <div className="result-chip red w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold bg-[#A52A2A]">A</div>
          <div className="result-chip red w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold bg-[#A52A2A]">A</div>
          <div className="result-chip blue w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold bg-[#01073b]">B</div>
          <div className="result-chip blue w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold bg-[#01073b]">B</div>
          <div className="result-chip blue w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold bg-[#01073b]">B</div>
          <div className="result-chip red w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold bg-[#A52A2A]">A</div>
        </div>
        <div className="mt-1 h-1 bg-gold rounded-full overflow-hidden"></div>
      </div>

      {/* History Modal */}
      {showHistory && (
        <div id="historyModal" className="history-modal fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4" style={{ display: 'flex' }}>
          <div className="history-content bg-[#0a0a0a] border-2 border-gold rounded-lg p-4 max-w-md w-full max-h-[80vh] overflow-y-auto">
            <div className="history-header flex justify-between items-center mb-4 pb-2 border-b border-gold">
              <div className="history-title-large text-gold text-lg font-semibold">Game History</div>
              <button className="close-history text-white" onClick={() => setShowHistory(false)}>&times;</button>
            </div>
            <div className="history-grid grid grid-cols-10 gap-2 mb-4" id="historyGrid">
              {gameHistory.slice(-30).reverse().map((result, index) => (
                <div key={result.id} className="history-item flex flex-col items-center">
                  <div className="history-round text-xs text-white/60">#{result.round}</div>
                  <div className={`history-result-chip w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold ${
                    result.winner === 'andar' ? 'bg-[#A52A2A]' : 'bg-[#01073b]'
                  }`}>
                    {result.winner === 'andar' ? 'A' : 'B'}
                  </div>
                </div>
              ))}
            </div>
            <div className="history-stats grid grid-cols-3 gap-4">
              <div className="stat-item text-center">
                <div className="stat-label text-white/60 text-xs">Total Games</div>
                <div className="stat-value text-gold text-sm" id="totalGames">{gameHistory.length}</div>
              </div>
              <div className="stat-item text-center">
                <div className="stat-label text-white/60 text-xs">Andar Wins</div>
                <div className="stat-value text-[#A52A2A] text-sm" id="andarWins">{gameHistory.filter(g => g.winner === 'andar').length}</div>
              </div>
              <div className="stat-item text-center">
                <div className="stat-label text-white/60 text-xs">Bahar Wins</div>
                <div className="stat-value text-[#01073b] text-sm" id="baharWins">{gameHistory.filter(g => g.winner === 'bahar').length}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Notification Container */}
      <div id="notificationContainer" className="notification-container fixed top-20 right-2 z-50">
        {notifications.map((notification) => (
          <div
            key={notification.id}
            className={`notification notification-${notification.type} show transform transition-all duration-500 ease-out`}
            style={{
              transform: 'translateX(0)',
              opacity: 1,
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

### Updated CSS for Fixed Mobile Layout (player-game.css)

```css
/* Fixed layout for mobile responsiveness */
.game-body {
  position: relative;
  height: 100vh;
  width: 100vw;
  overflow: hidden;
  background-color: #000;
  font-family: 'Poppins', sans-serif;
}

/* Video section with fixed aspect ratio */
.video-section {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: #000;
  z-index: 0;
}

.video-section video {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* Header with fixed positioning */
.header {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  z-index: 40;
  background: linear-gradient(to bottom, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0) 100%);
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
  color: #ffd700;
}

.wallet-display {
  background: rgba(0, 0, 0, 0.5);
  border: 1px solid #ffd700;
  border-radius: 20px;
  padding: 6px 12px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.wallet-display i {
  color: #ffd700;
}

.wallet-amount-display {
  font-size: 14px;
  font-weight: 600;
  color: #ffffff;
}

/* Video overlay content */
.video-overlay-content {
  position: absolute;
  top: 20px; /* Fixed top position */
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
  gap: 8px; /* Fixed gap */
}

.live-indicator {
  display: flex;
  align-items: center;
  gap: 4px; /* Fixed gap */
  background: #dc143c;
  color: white;
  padding: 4px 8px;
  border-radius: 15px;
  font-size: 12px;
  font-weight: 500;
}

.live-dot {
  width: 6px;
  height: 6px;
  background: #ffffff;
  border-radius: 50%;
  animation: pulse 1.5s infinite;
}

.game-title-text {
  font-size: 14px; /* Fixed size */
  font-weight: 500;
  color: #ffffff;
}

.view-count {
  display: flex;
  align-items: center;
  gap: 4px; /* Fixed gap */
  background: rgba(0, 0, 0, 0.5);
  color: white;
  padding: 4px 8px;
  border-radius: 15px;
  font-size: 12px;
  font-weight: 500;
}

.view-count i {
  color: #ffd700;
}

/* Fixed three-panel betting area */
.main-betting-areas {
  display: grid;
  grid-template-columns: 1fr auto 1fr; /* Fixed three-column layout */
  align-items: center;
  padding: 8px 4px; /* Fixed padding */
  gap: 4px; /* Fixed gap */
  height: 90px; /* Fixed height for mobile */
}

.betting-zone {
  height: 70px; /* Fixed height */
  border-radius: 8px;
  display: flex;
  align-items: center;
  padding: 6px; /* Fixed padding */
  position: relative;
  cursor: pointer;
  transition: all 0.2s ease;
  min-width: 0; /* Allow flex shrink */
}

.betting-zone:hover {
  transform: scale(1.02);
  box-shadow: 0 0 10px rgba(255, 215, 0, 0.3);
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
  padding: 4px; /* Fixed padding */
  text-align: left;
  min-width: 0; /* Prevent flex item from overflowing */
  flex: 1;
}

.bahar-zone .bet-info {
  text-align: right;
  align-items: flex-end;
}

.bet-title {
  display: flex;
  align-items: center;
  gap: 6px; /* Fixed gap */
  font-size: 16px; /* Fixed size */
  font-weight: 700;
  color: #ffd700;
}

.bet-amount {
  font-size: 12px; /* Fixed size */
  font-weight: 700;
  color: #ffd700;
  white-space: nowrap; /* Prevent text wrapping */
  overflow: hidden; /* Hide overflow */
  text-overflow: ellipsis; /* Add ellipsis */
}

.card-representation {
  width: 40px; /* Fixed width */
  height: 55px; /* Fixed height */
  background-color: #ffffff;
  border-radius: 4px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  position: absolute;
  border: 2px solid #ccc;
}

.card-representation .card-rank {
  font-size: 20px; /* Fixed size */
  font-weight: 700;
  color: #02A8DD;
  line-height: 1;
  position: absolute;
  top: 25%;
  left: 50%;
  transform: translateX(-50%);
}

.card-representation .card-suit {
  font-size: 16px; /* Fixed size */
  color: #02A8DD;
  position: absolute;
  bottom: 25%;
  left: 50%;
  transform: translateX(-50%);
}

.central-card-area {
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 5;
}

.opening-card {
  width: 50px; /* Fixed width */
  height: 70px; /* Fixed height */
  background-color: #ffffff;
  border: 3px solid #ffd700;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  box-shadow: 0 0 10px rgba(255, 215, 0, 0.7);
  position: relative;
}

.opening-card .card-rank {
  font-size: 28px; /* Fixed size */
  font-weight: 700;
  color: #000000;
  line-height: 1;
}

.opening-card .card-suit {
  font-size: 20px; /* Fixed size */
  color: #02A8DD;
}

/* Circular timer - fixed positioning */
.circular-timer {
  position: relative;
  width: 150px; /* Fixed width for mobile */
  height: 150px; /* Fixed height for mobile */
  border: 6px solid #ffd700; /* Fixed border width */
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
  font-size: 48px; /* Fixed size for mobile */
  font-weight: 700;
  color: #ffffff;
  line-height: 1;
}

.round-info {
  font-size: 14px; /* Fixed size for mobile */
  color: #ffd700;
  font-weight: 500;
}

.timer-hidden {
  opacity: 0;
  transform: scale(0.8);
  pointer-events: none;
}

/* Card sequence container */
.card-sequence-container {
  position: absolute;
  bottom: 140px; /* Fixed position above controls */
  left: 0;
  right: 0;
  z-index: 10;
  padding: 8px; /* Fixed padding */
  background: rgba(0, 0, 0, 0.8);
  border-top: 1px solid #ffd700;
  max-height: 80px; /* Fixed max height */
  display: none; /* Hidden by default */
}

.sequence-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.sequence-title {
  font-size: 12px; /* Fixed size */
  font-weight: 600;
  color: #ffd700;
  margin-bottom: 4px;
}

.card-sequence {
  display: flex;
  gap: 4px; /* Fixed gap */
  overflow-x: auto;
  padding: 4px 0;
  max-width: 100%;
}

.sequence-card {
  min-width: 30px; /* Fixed width */
  height: 40px; /* Fixed height */
  background-color: #ffffff;
  border-radius: 4px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  font-size: 10px; /* Fixed size */
  font-weight: 600;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.3);
  position: relative;
}

.sequence-card .card-rank {
  font-size: 12px; /* Fixed size */
  font-weight: 700;
  line-height: 1;
}

.sequence-card .card-suit {
  font-size: 10px; /* Fixed size */
  margin-top: 1px;
}

.sequence-card.winning {
  border: 2px solid #ffd700;
  box-shadow: 0 0 8px rgba(255, 215, 0, 0.7);
}

/* Game controls at bottom */
.game-controls {
  position: absolute;
  bottom: 0; /* Fixed to bottom */
  left: 0;
  right: 0;
  z-index: 20;
  padding: 8px; /* Fixed padding */
  background: #000;
  border-top: 1px solid #ffd700;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 6px; /* Fixed gap */
}

.control-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px; /* Fixed gap */
  background: #2a2a2a;
  border: 1px solid #444;
  border-radius: 8px;
  padding: 6px;
  color: #ffffff;
  cursor: pointer;
  width: 100%; /* Full width in grid */
  font-size: 10px; /* Fixed size */
  transition: all 0.2s ease;
}

.control-btn i {
  font-size: 16px; /* Fixed size */
  color: #ffd700;
}

.select-chip-btn {
  background: #ffd700;
  color: #0a0a0a;
  border: none;
  border-radius: 8px;
  padding: 6px;
  font-size: 10px; /* Fixed size */
  font-weight: 600;
  cursor: pointer;
  width: 100%; /* Full width in grid */
  transition: all 0.2s ease;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px; /* Fixed gap */
}

.select-chip-btn i {
  font-size: 16px; /* Fixed size */
  color: #0a0a0a;
}

/* Chip selection panel */
.chip-selection {
  display: none;
  overflow-x: auto;
  overflow-y: hidden;
  white-space: nowrap;
  padding: 8px;
  background: rgba(0, 0, 0, 0.8);
  border-top: 1px solid #ffd700;
  max-height: 80px; /* Fixed height */
}

.chip-container {
  display: inline-flex;
  gap: 8px; /* Fixed gap */
  padding-bottom: 4px;
  min-width: max-content;
}

.chip-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px; /* Fixed gap */
  padding: 4px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  min-width: 0; /* Allow flex shrink */
}

.chip-btn.active {
  transform: scale(1.1);
}

.chip-image {
  width: 50px; /* Fixed width */
  height: 50px; /* Fixed height */
  object-fit: contain;
  transition: all 0.3s ease;
}

.chip-amount {
  color: #ffffff;
  font-size: 10px; /* Fixed size */
  font-weight: 500;
}

/* Recent results */
.recent-results-container {
  position: absolute;
  bottom: 60px; /* Fixed position above controls */
  left: 0;
  right: 0;
  z-index: 15;
  padding: 8px;
  background: rgba(0, 0, 0, 0.9);
  border-top: 1px solid #ffd700;
  cursor: pointer;
}

.recent-results-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
  padding: 0 4px;
}

.history-title {
  font-size: 12px; /* Fixed size */
  color: #ffd700;
  font-weight: 500;
}

.history-expand {
  font-size: 10px; /* Fixed size */
  color: #ffffff;
  opacity: 0.7;
}

.recent-results-bottom {
  display: flex;
  gap: 4px; /* Fixed gap */
  overflow-x: auto;
  padding: 4px 0;
  scrollbar-width: none; /* Hide scrollbar */
}

.recent-results-bottom::-webkit-scrollbar {
  display: none; /* Hide scrollbar */
}

.result-chip {
  flex-shrink: 0;
  width: 24px; /* Fixed width */
  height: 24px; /* Fixed height */
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 12px; /* Fixed size */
  color: #ffffff;
  position: relative;
  transition: transform 0.2s ease;
}

.result-chip:hover {
  transform: scale(1.1);
  z-index: 10;
}

.result-chip.red { background-color: #A52A2A; }
.result-chip.blue { background-color: #01073b; }

.results-progress-bar {
  width: 100%;
  height: 3px; /* Fixed height */
  background-color: #ffd700;
  border-radius: 2px;
  margin-top: 4px;
}

/* History modal */
.history-modal {
  display: none;
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.9);
  z-index: 1000;
  align-items: center;
  justify-content: center;
  padding: 16px;
}

.history-content {
  background: #1a1a1a;
  border: 2px solid #ffd700;
  border-radius: 10px;
  padding: 16px;
  max-width: 90%;
  max-height: 80%;
  overflow-y: auto;
}

.history-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 8px;
  border-bottom: 1px solid #ffd700;
}

.history-title-large {
  font-size: 16px; /* Fixed size */
  color: #ffd700;
  font-weight: 600;
}

.close-history {
  background: none;
  border: none;
  color: #ffffff;
  font-size: 24px; /* Fixed size */
  cursor: pointer;
}

.history-grid {
  display: grid;
  grid-template-columns: repeat(10, 1fr);
  gap: 8px; /* Fixed gap */
  margin-bottom: 16px;
}

.history-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px; /* Fixed gap */
}

.history-round {
  font-size: 10px; /* Fixed size */
  color: #f8f9fa;
}

.history-result-chip {
  width: 28px; /* Fixed width */
  height: 28px; /* Fixed height */
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 14px; /* Fixed size */
  color: #ffffff;
}

.history-stats {
  display: flex;
  justify-content: space-around;
  padding: 12px 0;
  border-top: 1px solid #2a2a2a;
}

.stat-item {
  text-align: center;
}

.stat-label {
  font-size: 10px; /* Fixed size */
  color: #f8f9fa;
  margin-bottom: 4px;
}

.stat-value {
  font-size: 14px; /* Fixed size */
  font-weight: 600;
  color: #ffd700;
}

/* Notification system */
.notification-container {
  position: fixed;
  top: 80px;
  right: 16px;
  z-index: 10000;
  display: flex;
  flex-direction: column;
  gap: 8px; /* Fixed gap */
}

.notification {
  background: #2a2a2a;
  border-left: 4px solid #ffd700; /* Fixed border width */
  border-radius: 8px;
  padding: 12px 16px; /* Fixed padding */
  color: #ffffff;
  min-width: 200px; /* Fixed min width */
  max-width: 300px; /* Fixed max width */
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.5);
  transform: translateX(120%);
  opacity: 0;
  transition: all 0.5s cubic-bezier(0.68, -0.55, 0.27, 1.55);
}

.notification.show {
  transform: translateX(0);
  opacity: 1;
}

@keyframes pulse {
  0% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.1); opacity: 0.7; }
  100% { transform: scale(1); opacity: 1; }
}

/* Mobile-specific fixes */
@media (max-width: 480px) {
  .main-betting-areas {
    grid-template-columns: 1fr; /* Stack vertically on very small screens */
    grid-template-areas: 
      "andar"
      "center" 
      "bahar";
    height: auto; /* Auto height when stacked */
    gap: 6px; /* Increased gap when stacked */
  }
  
  .betting-zone.andar-zone {
    grid-area: andar;
    height: 60px; /* Reduced height for stacked layout */
  }
  
  .central-card-area {
    grid-area: center;
    margin: 4px 0;
  }
  
  .betting-zone.bahar-zone {
    grid-area: bahar;
    height: 60px; /* Reduced height for stacked layout */
  }
  
  .betting-zone {
    margin: 0; /* Remove margin when stacked */
  }
  
  .opening-card {
    width: 40px; /* Smaller for small screens */
    height: 60px; /* Smaller for small screens */
  }
  
  .opening-card .card-rank {
    font-size: 24px; /* Smaller for small screens */
  }
  
  .opening-card .card-suit {
    font-size: 16px; /* Smaller for small screens */
  }
  
  .card-representation {
    width: 32px; /* Smaller for small screens */
    height: 44px; /* Smaller for small screens */
  }
  
  .card-representation .card-rank {
    font-size: 16px; /* Smaller for small screens */
  }
  
  .card-representation .card-suit {
    font-size: 12px; /* Smaller for small screens */
  }
  
  .circular-timer {
    width: 120px; /* Smaller for small screens */
    height: 120px; /* Smaller for small screens */
  }
  
  .timer-value {
    font-size: 36px; /* Smaller for small screens */
  }
  
  .round-info {
    font-size: 12px; /* Smaller for small screens */
  }
}
```

## Admin Game Component Updates

### Updated Admin Game Component (client/src/components/GameAdmin/GameAdmin.jsx)

```jsx
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

### Updated CSS for Admin Page (client/src/components/GameAdmin/GameAdmin.css)

```css
/* Fixed and improved CSS for Game Admin */
.game-admin-container {
  max-width: 100%;
  margin: 0 auto;
  padding: 16px; /* Fixed padding for mobile */
  background: linear-gradient(135deg, #1a1a1a 0%, #2d1b69 50%, #8b0000 100%);
  min-height: 100vh;
  font-family: 'Poppins', sans-serif;
}

.game-admin-header {
  text-align: center;
  margin-bottom: 24px;
  padding: 16px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 15px;
  backdrop-filter: blur(10px);
}

.game-admin-title {
  font-family: 'Poppins', sans-serif;
  font-size: 28px; /* Fixed size */
  font-weight: 600;
  color: #ffd700;
  margin-bottom: 8px;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
}

.game-admin-subtitle {
  font-family: 'Poppins', sans-serif;
  font-size: 14px; /* Fixed size */
  color: #ffffff;
  opacity: 0.9;
}

.game-section {
  background: rgba(0, 0, 0, 0.4);
  border-radius: 15px;
  padding: 24px; /* Fixed padding */
  margin-bottom: 24px;
  backdrop-filter: blur(10px);
}

.section-title {
  font-family: 'Poppins', sans-serif;
  font-size: 20px; /* Fixed size */
  color: #ffd700;
  margin-bottom: 20px;
  text-align: center;
}

/* Fixed card grid layout */
.cards-grid {
  display: grid;
  grid-template-columns: repeat(13, 1fr); /* Fixed 13-column layout */
  gap: 8px; /* Fixed gap */
  margin: 20px 0;
  padding: 16px; /* Fixed padding */
  background: rgba(0, 0, 0, 0.3);
  border-radius: 15px;
  max-height: 60vh; /* Fixed max height */
  overflow-y: auto;
  box-sizing: border-box; /* Include padding in size calculation */
}

/* Fixed card button dimensions */
.card-btn {
  aspect-ratio: 1/1.4; /* Fixed aspect ratio */
  background: linear-gradient(45deg, #ffffff, #f0f0f0);
  color: #1a1a1a;
  border: 2px solid #ffd700;
  border-radius: 8px;
  font-family: 'Poppins', sans-serif;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  text-align: center;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px; /* Fixed font size */
  padding: 0; /* Remove default padding */
  min-height: 0; /* Override any min-height */
  position: relative;
  overflow: hidden;
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

/* Fixed game controls layout */
.game-controls {
  display: flex;
  justify-content: center;
  gap: 16px; /* Fixed gap */
  margin: 24px 0;
  flex-wrap: wrap;
}

.control-btn {
  flex: 1; /* Allow buttons to expand */
  min-width: 120px; /* Minimum width */
  background: linear-gradient(45deg, #ffd700, #ffed4e);
  color: #1a1a1a;
  border: none;
  padding: 12px 24px; /* Fixed padding */
  border-radius: 25px;
  font-family: 'Poppins', sans-serif;
  font-weight: 600;
  font-size: 16px; /* Fixed font size */
  cursor: pointer;
  transition: all 0.3s ease;
  text-align: center;
  max-width: 200px; /* Maximum width */
}

.control-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 5px 15px rgba(255, 215, 0, 0.4);
}

.control-btn.danger {
  background: linear-gradient(45deg, #8b0000, #ff6b6b);
  color: white;
}

/* Fixed selected cards layout */
.selected-cards {
  display: flex;
  justify-content: center;
  gap: 16px; /* Fixed gap */
  margin: 24px 0;
  flex-wrap: wrap;
}

.selected-card {
  background: linear-gradient(45deg, #ffd700, #ffed4e);
  color: #1a1a1a;
  padding: 16px; /* Fixed padding */
  width: 120px; /* Fixed width */
  border-radius: 15px;
  text-align: center;
  min-width: 0; /* Allow flex shrink */
}

.selected-card-label {
  font-family: 'Poppins', sans-serif;
  font-size: 12px; /* Fixed size */
  margin-bottom: 8px;
  font-weight: 600;
}

.selected-card-value {
  font-family: 'Poppins', sans-serif;
  font-size: 18px; /* Fixed size */
  font-weight: 600;
  min-height: 24px; /* Fixed height */
  display: flex;
  align-items: center;
  justify-content: center;
}

.countdown-display {
  background: linear-gradient(45deg, #ffd700, #ffed4e);
  color: #1a1a1a;
  font-family: 'Poppins', sans-serif;
  font-size: 32px; /* Fixed size */
  font-weight: 600;
  text-align: center;
  padding: 12px; /* Fixed padding */
  border-radius: 10px;
  border: 2px solid #ffd700;
  min-height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 15px rgba(255, 215, 0, 0.3);
}

/* Fixed betting stats layout */
.betting-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); /* Flexible grid */
  gap: 16px; /* Fixed gap */
  margin: 24px 0;
}

.bet-stat-card {
  background: rgba(0, 0, 0, 0.3);
  padding: 20px; /* Fixed padding */
  border-radius: 15px;
  text-align: center;
  border: 2px solid #ffd700;
}

.bet-stat-number {
  font-family: 'Poppins', sans-serif;
  font-size: 32px; /* Fixed size */
  color: #ffd700;
  font-weight: 600;
  margin-bottom: 8px;
}

.bet-stat-label {
  font-family: 'Poppins', sans-serif;
  color: #ffffff;
  font-size: 14px; /* Fixed size */
}

/* Fixed notification system */
.notification {
  position: fixed;
  top: 16px; /* Fixed position */
  right: 16px; /* Fixed position */
  padding: 12px 20px; /* Fixed padding */
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

/* Fixed popup windows */
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
  padding: 32px; /* Fixed padding */
  max-width: 90%; /* Responsive max-width */
  width: 450px; /* Fixed width */
  text-align: center;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
  border: 2px solid #ffd700;
  max-height: 90vh; /* Fixed max-height */
  overflow-y: auto; /* Scrollable if needed */
}

.start-game-popup h3 {
  color: #ffd700;
  font-family: 'Poppins', sans-serif;
  font-size: 24px; /* Fixed size */
  margin-bottom: 16px;
}

.start-game-popup p {
  color: #ffffff;
  font-family: 'Poppins', sans-serif;
  margin-bottom: 24px;
  font-size: 16px; /* Fixed size */
}

.start-game-buttons {
  display: flex;
  gap: 16px; /* Fixed gap */
  justify-content: center;
  flex-wrap: wrap;
}

.start-game-btn {
  background: linear-gradient(45deg, #ffd700, #ffed4e);
  color: #1a1a1a;
  border: none;
  padding: 12px 24px; /* Fixed padding */
  border-radius: 25px;
  font-family: 'Poppins', sans-serif;
  font-weight: 600;
  font-size: 16px; /* Fixed size */
  cursor: pointer;
  transition: all 0.3s ease;
  min-width: 140px; /* Fixed min-width */
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

/* Fixed modal styles */
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
  padding: 24px; /* Fixed padding */
  max-width: 90%; /* Responsive max-width */
  width: 600px; /* Fixed width */
  max-height: 90vh; /* Fixed max-height */
  overflow-y: auto; /* Scrollable if needed */
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
  border: 2px solid #ffd700;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px; /* Fixed margin */
  padding-bottom: 12px; /* Fixed padding */
  border-bottom: 1px solid rgba(255, 215, 0, 0.3);
}

.modal-header h3 {
  color: #ffd700;
  font-family: 'Poppins', sans-serif;
  font-size: 20px; /* Fixed size */
  margin: 0;
}

.close-modal {
  background: none;
  border: none;
  color: #ffd700;
  font-size: 28px; /* Fixed size */
  cursor: pointer;
  padding: 0;
  width: 36px; /* Fixed width */
  height: 36px; /* Fixed height */
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
  margin-bottom: 20px; /* Fixed margin */
}

.form-row {
  display: flex;
  gap: 16px; /* Fixed gap */
  margin-bottom: 16px;
}

.form-label {
  display: block;
  color: #ffd700;
  font-family: 'Poppins', sans-serif;
  font-size: 14px; /* Fixed size */
  margin-bottom: 6px;
}

.form-input {
  width: 100%;
  padding: 10px 12px; /* Fixed padding */
  border: 2px solid #ffd700;
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.3);
  color: #ffffff;
  font-family: 'Poppins', sans-serif;
  font-size: 14px; /* Fixed size */
  transition: all 0.3s ease;
  box-sizing: border-box; /* Include padding in size calculation */
}

.form-input:focus {
  outline: none;
  border-color: #ffed4e;
  box-shadow: 0 0 10px rgba(255, 215, 0, 0.3);
}

.form-textarea {
  min-height: 100px; /* Fixed min height */
  resize: vertical;
}

.save-btn {
  background: linear-gradient(45deg, #ffd700, #ffed4e);
  color: #1a1a1a;
  border: none;
  padding: 10px 20px; /* Fixed padding */
  border-radius: 25px;
  font-family: 'Poppins', sans-serif;
  font-weight: 600;
  font-size: 16px; /* Fixed size */
  cursor: pointer;
  transition: all 0.3s ease;
  margin-top: 8px; /* Fixed margin */
  display: inline-block; /* Prevent full width */
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
  padding: 8px; /* Fixed padding */
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

/* Mobile-specific styles */
@media (max-width: 768px) {
  .game-admin-container {
    padding: 12px; /* Reduced padding for mobile */
  }
  
  .game-admin-title {
    font-size: 24px; /* Smaller for mobile */
  }
  
  .game-admin-subtitle {
    font-size: 12px; /* Smaller for mobile */
  }
  
  .game-section {
    padding: 16px; /* Reduced padding for mobile */
  }
  
  .cards-grid {
    grid-template-columns: repeat(7, 1fr); /* Adjusted for mobile */
    gap: 6px; /* Reduced gap for mobile */
    padding: 12px; /* Reduced padding for mobile */
  }
  
  .card-btn {
    font-size: 10px; /* Smaller text for mobile */
    padding: 0; /* Ensure no padding */
  }
  
  .game-controls {
    flex-direction: column; /* Stack buttons vertically */
    align-items: center;
  }
  
  .control-btn {
    width: 100%; /* Full width on mobile */
    max-width: 300px; /* Max width to prevent too wide */
  }
  
  .betting-stats {
    grid-template-columns: 1fr; /* Single column on mobile */
  }
  
  .selected-cards {
    flex-direction: column; /* Stack cards vertically */
    align-items: center;
  }
  
  .selected-card {
    width: 100%; /* Full width */
    max-width: 200px; /* Max width */
  }
  
  .form-row {
    flex-direction: column; /* Stack form items vertically */
    gap: 12px; /* Reduced gap for mobile */
  }
  
  .modal-content {
    padding: 16px; /* Reduced padding for mobile */
    width: 95%; /* Wider on mobile */
    margin: 20px; /* Add margin for mobile */
  }
  
  .start-game-popup-content {
    padding: 24px; /* Reduced padding for mobile */
    width: 95%; /* Wider on mobile */
  }
}

@media (max-width: 480px) {
  .cards-grid {
    grid-template-columns: repeat(4, 1fr); /* Even fewer columns for very small screens */
  }
  
  .game-admin-title {
    font-size: 20px; /* Even smaller for very small screens */
  }
  
  .section-title {
    font-size: 18px; /* Even smaller for very small screens */
  }
  
  .selected-card {
    width: 100%; /* Full width */
    padding: 12px; /* Reduced padding */
  }
  
  .bet-stat-card {
    padding: 16px; /* Reduced padding */
  }
  
  .bet-stat-number {
    font-size: 24px; /* Smaller numbers */
  }
  
  .modal-header h3 {
    font-size: 18px; /* Smaller modal header */
  }
}
```