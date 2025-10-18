import { useState, useEffect, useCallback, useRef } from "react";
import type { Card, Side, GameState, DealtCard, GameHistoryEntry } from "@shared/schema";
import { VideoStream } from "@/components/VideoStream";
import "./player-game.css";

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
  
  // Stream state
  const [currentStreamUrl, setCurrentStreamUrl] = useState('/hero images/uhd_30fps.mp4');
  const [currentStreamType, setCurrentStreamType] = useState<'video' | 'embed' | 'rtmp'>('video');
  const [isStreamLive, setIsStreamLive] = useState(false);

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

  // Add notification matching legacy implementation
  const showNotification = useCallback((message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') => {
    const container = document.getElementById('notificationContainer');
    if (!container) return;

    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    container.appendChild(notification);
    
    // Apply animation like legacy
    setTimeout(() => notification.classList.add('show'), 10);
    
    // Auto-remove after 3 seconds like legacy
    setTimeout(() => {
      notification.classList.remove('show');
      setTimeout(() => {
        if (container.contains(notification)) {
          container.removeChild(notification);
        }
      }, 500);
    }, 3000);
  }, []);

  // Keep addNotification for backward compatibility but use showNotification
  const addNotification = useCallback((type: Notification['type'], message: string) => {
    showNotification(message, type);
  }, [showNotification]);

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

  // Update opening card display using direct DOM manipulation
  useEffect(() => {
    if (openingCardRankRef.current && openingCardSuitRef.current && gameState.openingCard) {
      const rank = gameState.openingCard.slice(0, -1);
      const suit = gameState.openingCard.slice(-1);
      openingCardRankRef.current.textContent = rank;
      openingCardSuitRef.current.textContent = suit;
    }
    
    // Update central card display
    const centralCardDisplay = document.getElementById('centralCardDisplay');
    if (centralCardDisplay && gameState.openingCard) {
      const cardIcon = centralCardDisplay.querySelector('.card-icon');
      const cardText = centralCardDisplay.querySelector('.card-text');
      
      if (cardIcon && cardText) {
        // Set the card icon based on suit
        const suit = gameState.openingCard.slice(-1);
        let icon = '🃏';
        
        switch(suit) {
          case '♠': icon = '♠️'; break;
          case '♥': icon = '♥️'; break;
          case '♦': icon = '♦️'; break;
          case '♣': icon = '♣️'; break;
        }
        
        cardIcon.textContent = icon;
        cardText.textContent = gameState.openingCard;
      }
    }
  }, [gameState.openingCard]);

  // Game settings from legacy
  const [gameSettings] = useState({
    min_bet_amount: 1000,
    max_bet_amount: 50000,
    game_timer: 30
  });

  // Place bet matching legacy implementation
  const placeBet = async (zoneId: string) => {
    if (!bettingOpen) {
      addNotification('error', 'Betting is closed!');
      return;
    }
    if (selectedChip <= 0) {
      addNotification('error', 'Please select a chip to bet');
      return;
    }
    if (selectedChip < gameSettings.min_bet_amount) {
      addNotification('error', `Minimum bet is ₹${gameSettings.min_bet_amount.toLocaleString('en-IN')}`);
      return;
    }
    if (selectedChip > gameSettings.max_bet_amount) {
      addNotification('error', `Maximum bet is ₹${gameSettings.max_bet_amount.toLocaleString('en-IN')}`);
      return;
    }
    if (balance < selectedChip) {
      addNotification('error', 'Insufficient balance!');
      return;
    }
    
    // Determine side like legacy
    const side = zoneId === 'andarZone' ? 'andar' : 'bahar';
    const round = 'round1'; // Default to round1 like legacy
    
    try {
      // Send bet to backend like legacy
      const response = await fetch(`${window.API_BASE_URL || 'http://localhost:5000'}/api/game/place-bet`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Token': 'user-authenticated',
          'X-User-Id': userId
        },
        body: JSON.stringify({
          userId,
          gameId: gameState.gameId || 'default-game',
          round: round,
          side: side,
          amount: selectedChip
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        // Save current state for undo like legacy
        setBetHistory(prev => [...prev, { andarBet: gameState.andarBets, baharBet: gameState.baharBets, balance }]);
        
        // Update local balance like legacy
        setBalance(prev => prev - selectedChip);
        
        // Update local bet amounts (will be confirmed by WebSocket)
        if (side === 'andar') {
          setGameState(prev => ({ ...prev, andarBets: prev.andarBets + selectedChip }));
        } else {
          setGameState(prev => ({ ...prev, baharBets: prev.baharBets + selectedChip }));
        }
        
        // Show notification like legacy
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

  // History management matching legacy implementation
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
    
    // Generate 50 recent game results like legacy
    for (let i = 1; i <= 50; i++) {
      const isAndar = Math.random() > 0.5; // 50% chance for each
      results.push({
        id: `round-${i}`,
        round: roundNum++,
        winner: isAndar ? 'andar' : 'bahar',
        timestamp: new Date(Date.now() - (i * 60000)) // Simulate past games like legacy
      });
    }
    
    setGameHistory(results.slice(-50)); // Keep last 50 games like legacy
  };

  // Update recent results with new game result like legacy
  const updateRecentResults = (winner: string) => {
    if (recentResultsRef.current) {
      // Create result chip exactly like legacy
      const resultChip = document.createElement('div');
      resultChip.className = `result-chip ${winner === 'andar' ? 'red' : 'blue'}`;
      resultChip.textContent = winner === 'andar' ? 'A' : 'B';
      
      // Add to beginning of results like legacy
      recentResultsRef.current.insertBefore(resultChip, recentResultsRef.current.firstChild);
      
      // Keep only last 12 results like legacy
      while (recentResultsRef.current.children.length > 12) {
        recentResultsRef.current.removeChild(recentResultsRef.current.lastChild as Node);
      }
    }
  };

  // Add card to sequence matching legacy implementation
  const addCardToSequence = (side: 'andar' | 'bahar', card: any) => {
    if (!cardSequenceContainerRef.current) return;
    
    // Create card element using DOM API (like legacy)
    const cardElement = document.createElement('div');
    cardElement.className = 'sequence-card';
    
    // Handle different card formats
    let rank = '';
    let suit = '';
    
    if (card.card && typeof card.card === 'string') {
      // Format like "A♠"
      rank = card.card.slice(0, -1);
      suit = card.card.slice(-1);
    } else if (card.rank && card.suit) {
      // Format like { rank: "A", suit: "♠" }
      rank = card.rank;
      suit = card.suit;
    }
    
    cardElement.innerHTML = `
      <span class="card-rank">${rank}</span>
      <span class="card-suit">${suit}</span>
    `;
    
    // Add to sequence container using DOM API (like legacy)
    const sequenceContainer = side === 'andar' ? andarCardSequenceRef.current : baharCardSequenceRef.current;
    if (sequenceContainer) {
      sequenceContainer.appendChild(cardElement);
      
      // Add winning class if applicable
      if (card.isWinningCard) {
        cardElement.classList.add('winning');
      }
    }
    
    // Show container if hidden
    if (cardSequenceContainerRef.current.style.display === 'none') {
      cardSequenceContainerRef.current.style.display = 'flex';
    }
    
    // Scroll to new card like legacy
    cardElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };

  // Clear card sequences matching legacy implementation
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
    
    // Reset game state like legacy
    setGameState(prev => ({
      ...prev,
      dealtCards: [],
      openingCard: null,
      winner: null,
      winningCard: null,
      phase: 'betting' as any
    }));
  };

  // WebSocket connection setup matching legacy approach
  useEffect(() => {
    // Ensure API_BASE_URL is defined like legacy
    if (!window.API_BASE_URL) {
      window.API_BASE_URL = 'http://localhost:5000';
    }
    
    const wsUrl = `${window.API_BASE_URL.replace('http', 'ws')}`;
    console.log('Connecting to WebSocket at:', wsUrl);
    
    try {
      const socket = new WebSocket(wsUrl);

      socket.onopen = () => {
        console.log('WebSocket connection established');
        setConnectionStatus('connected');
        
        // Authenticate and subscribe like legacy
        socket.send(JSON.stringify({
          type: 'authenticate',
          data: { userId, role: 'player' }
        }));
        
        socket.send(JSON.stringify({
          type: 'subscribe_game',
          data: { gameId: 'default-game' }
        }));
        
        // Request current game state to synchronize (like legacy)
        setTimeout(() => {
          socket.send(JSON.stringify({
            type: 'sync_request',
            data: { gameId: 'default-game' }
          }));
        }, 1000);
        
        addNotification('success', 'Connected to game server');
      };

      socket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          console.log('Received WebSocket message:', message);
          handleWebSocketMessage(message, socket);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      socket.onclose = () => {
        console.log('WebSocket connection closed');
        setConnectionStatus('disconnected');
        addNotification('warning', 'Connection to game server lost. Reconnecting...');
        
        // Attempt to reconnect after 3 seconds
        setTimeout(() => {
          // This effect will run again due to state change
        }, 3000);
      };

      socket.onerror = (error) => {
        console.error('WebSocket error:', error);
        setConnectionStatus('error');
        addNotification('error', 'Connection error with game server');
      };

      return () => {
        socket.close();
      };
    } catch (error) {
      console.error('Failed to initialize WebSocket:', error);
      addNotification('error', 'Failed to connect to game server');
    }
  }, [userId]);

  // Handle WebSocket messages exactly like legacy
  const handleWebSocketMessage = (message: any, socket: WebSocket) => {
    switch (message.type) {
      case 'connection':
        console.log('Connected with client ID:', message.data.clientId);
        break;

      case 'authenticated':
        console.log('Authenticated as user:', message.data.userId);
        break;

      case 'subscribed':
        console.log('Subscribed to game:', message.data.gameId);
        break;

      case 'game_state_update':
        handleGameStateUpdate(message.data.gameState);
        break;

      case 'timer_update':
        handleTimerUpdate(message.data.timer, message.data.phase);
        break;

      case 'card_dealt':
        handleCardDealt(message.data.card, message.data.side, message.data.position);
        break;

      case 'game_complete':
        handleGameComplete(message.data.winner, message.data.winningCard, message.data.totalCards);
        break;

      case 'bet_placed':
        handleBetPlaced(message.data.userId, message.data.side, message.data.amount, message.data.round);
        break;

      case 'betting_stats':
        handleBettingStats(message.data.andarBets, message.data.baharBets, message.data.totalBets);
        break;

      case 'phase_change':
        handlePhaseChange(message.data.phase, message.data.message);
        break;

      case 'sync_game_state':
        handleSyncGameState(message.data.gameState);
        break;

      case 'stream_status_update':
        handleStreamStatusUpdate(message.data);
        break;

      case 'heartbeat_response':
        // Heartbeat received, connection is alive
        break;

      default:
        console.log('Unknown message type:', message.type);
    }
  };

  // Handle game state updates like legacy
  const handleGameStateUpdate = (gameStateData: any) => {
    console.log('Game state updated:', gameStateData);
    
    // Update opening card if provided
    if (gameStateData.openingCard) {
      updateOpeningCard(gameStateData.openingCard);
    }
    
    // Update game phase if provided
    if (gameStateData.phase) {
      updateGamePhase(gameStateData.phase);
    }
    
    // Update timer if provided
    if (gameStateData.currentTimer !== undefined) {
      updateTimerDisplay(gameStateData.currentTimer);
    }
  };

  // Handle timer updates like legacy
  const handleTimerUpdate = (timer: number, phase: string) => {
    console.log('Timer update:', timer, phase);
    
    // Always update the timer display
    if (gameTimerRef.current) {
      gameTimerRef.current.textContent = timer.toString();
    }
    
    // Update betting status based on phase and timer value
    if (phase === 'betting' && timer > 0) {
      if (!bettingOpen) {
        setBettingOpen(true);
        addNotification('success', 'Betting is now open!');
      }
    } else if (timer <= 0 || phase === 'closed' || phase === 'dealing') {
      if (bettingOpen) {
        setBettingOpen(false);
        addNotification('warning', 'Betting is now closed!');
      }
    }
    
    // Handle timer visibility
    if (circularTimerRef.current) {
      if (timer <= 0) {
        circularTimerRef.current.classList.add('timer-hidden');
      } else {
        circularTimerRef.current.classList.remove('timer-hidden');
      }
    }
    
    // Update round info based on phase and timer
    if (roundInfoRef.current) {
      if (phase === 'betting' && timer > 0) {
        roundInfoRef.current.textContent = `Betting Time: ${timer}s`;
      } else if (phase === 'dealing') {
        roundInfoRef.current.textContent = 'Dealing Phase';
      } else if (phase === 'complete') {
        roundInfoRef.current.textContent = 'Game Complete';
      } else if (timer <= 0) {
        roundInfoRef.current.textContent = 'Time Up!';
      }
    }
    
    // Update React state
    setGameState(prev => ({
      ...prev,
      currentTimer: timer,
      phase: phase as any
    }));
  };

  // Handle card dealt like legacy
  const handleCardDealt = (card: any, side: string, position: number) => {
    console.log('Card dealt:', card, side, position);
    
    // Add card to sequence using DOM manipulation
    addCardToSequence(side as 'andar' | 'bahar', card);
    
    // Update game state
    setGameState(prev => ({
      ...prev,
      dealtCards: [...prev.dealtCards, { ...card, side, position, isWinningCard: false }]
    }));
    
    // Check if this card matches the opening card rank
    if (gameState.openingCard && card.card && gameState.openingCard.length >= 2 && card.card.length >= 2) {
      if (gameState.openingCard[0] === card.card[0]) { // Check if rank matches
        // Game should end - this is the winning card
        setGameState(prev => ({
          ...prev,
          winner: side,
          winningCard: card.card,
          phase: 'complete' as any
        }));
        
        console.log(`Winning card detected: ${card.card} on ${side} side`);
      }
    }
  };

  // Handle game complete like legacy
  const handleGameComplete = (winner: string, winningCard: any, totalCards: number) => {
    console.log('Game complete:', winner, winningCard, totalCards);
    
    // Update game state
    setGameState(prev => ({
      ...prev,
      winner,
      winningCard,
      phase: 'complete' as any
    }));
    
    // Show winner notification
    addNotification('success', `Game complete! ${winner.toUpperCase()} wins with ${winningCard.rank}${winningCard.suit}!`);
    
    // Update recent results
    updateRecentResults(winner);
    
    // Reset for next game
    setBettingOpen(false);
    setBetHistory([]);
    
    // Clear card sequences after a delay
    setTimeout(() => {
      clearCardSequences();
    }, 5000);
  };

  // Handle bet placed like legacy
  const handleBetPlaced = (userId: string, side: string, amount: number, round: string) => {
    console.log('Bet placed:', userId, side, amount, round);
    
    // Only show notification for other users' bets
    if (userId !== userId) {
      addNotification('info', `Player bet ₹${amount} on ${side}`);
    }
  };

  // Handle betting stats like legacy
  const handleBettingStats = (andarBets: number, baharBets: number, totalBets: number) => {
    console.log('Betting stats:', andarBets, baharBets, totalBets);
    
    // Update bet displays with current totals
    if (andarBetRef.current) {
      andarBetRef.current.textContent = `₹ ${andarBets.toLocaleString('en-IN')}`;
    }
    if (baharBetRef.current) {
      baharBetRef.current.textContent = `₹ ${baharBets.toLocaleString('en-IN')}`;
    }
    
    // Update React state
    setGameState(prev => ({
      ...prev,
      andarBets,
      baharBets
    }));
  };

  // Handle phase change like legacy
  const handlePhaseChange = (phase: string, message?: string) => {
    console.log('Phase change:', phase, message);
    
    // Update game phase
    updateGamePhase(phase);
    
    // Show notification about phase change
    if (message) {
      addNotification('info', message);
    }
  };

  // Handle sync game state like legacy
  const handleSyncGameState = (gameStateData: any) => {
    console.log('Syncing game state:', gameStateData);
    
    // Update all game state properties
    if (gameStateData.phase) {
      updateGamePhase(gameStateData.phase);
    }
    
    if (gameStateData.openingCard) {
      updateOpeningCard(gameStateData.openingCard);
    }
    
    if (gameStateData.dealtCards && Array.isArray(gameStateData.dealtCards)) {
      // Clear existing sequences
      if (andarCardSequenceRef.current) andarCardSequenceRef.current.innerHTML = '';
      if (baharCardSequenceRef.current) baharCardSequenceRef.current.innerHTML = '';
      
      // Add all cards to sequences
      gameStateData.dealtCards.forEach((card: DealtCard) => {
        addCardToSequence(card.side as 'andar' | 'bahar', card);
      });
    }
    
    if (gameStateData.winner && gameStateData.winningCard) {
      handleGameComplete(gameStateData.winner, gameStateData.winningCard,
        gameStateData.dealtCards ? gameStateData.dealtCards.length : 0);
    }
    
    // Show sequence container if there are cards
    if ((gameStateData.dealtCards && gameStateData.dealtCards.length > 0) && cardSequenceContainerRef.current) {
      cardSequenceContainerRef.current.style.display = 'flex';
    }
    
    // Update React state
    setGameState(prev => ({
      ...prev,
      gameId: gameStateData.gameId || prev.gameId,
      openingCard: gameStateData.openingCard,
      phase: gameStateData.phase || prev.phase,
      currentTimer: gameStateData.currentTimer !== undefined ? gameStateData.currentTimer : prev.currentTimer,
      round: gameStateData.round || prev.round,
      dealtCards: gameStateData.dealtCards || prev.dealtCards,
      andarBets: gameStateData.andarBets !== undefined ? gameStateData.andarBets : prev.andarBets,
      baharBets: gameStateData.baharBets !== undefined ? gameStateData.baharBets : prev.baharBets,
      winner: gameStateData.winner || prev.winner,
      winningCard: gameStateData.winningCard || prev.winningCard
    }));
  };

  // Handle stream status update like legacy
  const handleStreamStatusUpdate = (data: any) => {
    console.log('Stream status update:', data);
    
    // Handle changes to stream settings
    const streamType = data.streamType?.value || 'video';
    const streamUrl = data.streamUrl?.value || '/hero images/uhd_30fps.mp4';
    const streamStatus = data.streamStatus?.value || 'offline';

    // Update component state
    setCurrentStreamType(streamType);
    setCurrentStreamUrl(streamUrl);
    setIsStreamLive(streamStatus === 'live');

    // Update live indicator based on stream status
    const liveIndicator = document.querySelector('.live-indicator');
    if (liveIndicator) {
      if (streamStatus === 'live') {
        (liveIndicator as HTMLElement).style.display = 'flex';
      } else {
        (liveIndicator as HTMLElement).style.display = 'none';
      }
    }
    
    // Update stream title if provided
    if (data.streamTitle?.value) {
      const titleElement = document.querySelector('.game-title-text');
      if (titleElement) {
        (titleElement as HTMLElement).textContent = data.streamTitle.value;
      }
    }

    // Update which container to show based on stream type
    const liveStreamContainer = document.getElementById('liveStreamContainer');
    const embedContainer = document.getElementById('embedContainer');
    const rtmpStreamContainer = document.getElementById('rtmpStreamContainer');

    if (liveStreamContainer) liveStreamContainer.style.display = 'none';
    if (embedContainer) embedContainer.style.display = 'none';
    if (rtmpStreamContainer) rtmpStreamContainer.style.display = 'none';

    switch(streamType) {
      case 'video':
        if (liveStreamContainer) liveStreamContainer.style.display = 'block';
        break;
      case 'embed':
        if (embedContainer) embedContainer.style.display = 'block';
        break;
      case 'rtmp':
        if (rtmpStreamContainer) rtmpStreamContainer.style.display = 'block';
        break;
    }
  };

  // Update opening card like legacy
  const updateOpeningCard = (card: any) => {
    if (card && card.rank && card.suit) {
      if (openingCardRankRef.current) openingCardRankRef.current.textContent = card.rank;
      if (openingCardSuitRef.current) openingCardSuitRef.current.textContent = card.suit;
      addNotification('info', `Opening card: ${card.rank}${card.suit}`);
    }
  };

  // Update timer display like legacy
  const updateTimerDisplay = (timer: number) => {
    if (gameTimerRef.current) {
      gameTimerRef.current.textContent = timer.toString();
    }
    
    // Handle timer visibility
    if (circularTimerRef.current) {
      if (timer <= 0) {
        circularTimerRef.current.classList.add('timer-hidden');
      } else {
        circularTimerRef.current.classList.remove('timer-hidden');
      }
    }
  };

  // Update game phase like legacy
  const updateGamePhase = (phase: string) => {
    if (roundInfoRef.current) {
      if (phase === 'betting') {
        roundInfoRef.current.textContent = 'Betting Phase';
        setBettingOpen(true);
      } else if (phase === 'dealing') {
        roundInfoRef.current.textContent = 'Dealing Phase';
        setBettingOpen(false);
      } else if (phase === 'complete') {
        roundInfoRef.current.textContent = 'Game Complete';
        setBettingOpen(false);
      }
    }
  };

  // Update stream display matching legacy implementation
  const updateStreamDisplay = (settings: any) => {
    const streamType = settings.stream_type?.value || 'video';
    const streamUrl = settings.stream_url?.value || 'hero images/uhd_30fps.mp4';
    const streamStatus = settings.stream_status?.value || 'offline';
    const streamTitle = settings.stream_title?.value || 'Andar Bahar Live Game';
    const rtmpUrl = settings.rtmp_url?.value || '';
    const rtmpStreamKey = settings.rtmp_stream_key?.value || '';
    
    // Hide all stream containers first like legacy
    const liveStreamElement = document.getElementById('liveStream') as HTMLVideoElement;
    const embedContainer = document.getElementById('embedContainer');
    const rtmpStreamElement = document.getElementById('rtmpStream') as HTMLVideoElement;
    
    if (liveStreamElement) liveStreamElement.style.display = 'none';
    if (embedContainer) embedContainer.style.display = 'none';
    if (rtmpStreamElement) rtmpStreamElement.style.display = 'none';
    
    // Update stream title
    const titleElement = document.querySelector('.game-title-text');
    if (titleElement) {
      (titleElement as HTMLElement).textContent = streamTitle;
    }
    
    // Update live indicator based on status
    const liveIndicator = document.querySelector('.live-indicator');
    if (liveIndicator) {
      if (streamStatus === 'live') {
        (liveIndicator as HTMLElement).style.display = 'flex';
      } else {
        (liveIndicator as HTMLElement).style.display = 'none';
      }
    }
    
    // Display appropriate stream type like legacy
    switch (streamType) {
      case 'video':
        if (liveStreamElement) {
          liveStreamElement.src = streamUrl;
          liveStreamElement.style.display = 'block';
          
          // Clean up HLS if exists
          if ((window as any).hls) {
            (window as any).hls.destroy();
            (window as any).hls = null;
          }
        }
        break;
        
      case 'embed':
        if (embedContainer) {
          const embedFrame = document.getElementById('embedFrame') as HTMLIFrameElement;
          if (embedFrame) {
            embedFrame.src = streamUrl;
          }
          embedContainer.style.display = 'block';
          
          // Clean up HLS if exists
          if ((window as any).hls) {
            (window as any).hls.destroy();
            (window as any).hls = null;
          }
        }
        break;
        
      case 'rtmp':
        if (rtmpStreamElement) {
          rtmpStreamElement.style.display = 'block';
          
          // Clean up HLS if exists
          if ((window as any).hls) {
            (window as any).hls.destroy();
            (window as any).hls = null;
          }
          
          // For RTMP streams, since they can't be played directly in browsers,
          // we will use the stream key in a proper way or show a placeholder
          const streamKey = rtmpStreamKey || streamUrl.split('/').pop(); // Get stream key from settings or extract from URL
          
          console.log('RTMP settings configured. Stream URL:', streamUrl, 'Stream Key:', streamKey);
          
          // For most RTMP services, the playback URL is different from the ingest URL
          // If you know the HLS playback URL, you should use that instead of trying to guess it
          // For now, we'll create a placeholder that shows the stream is configured
          rtmpStreamElement.poster = 'data:image/svg+xml;base64,' + btoa(`
            <svg width="800" height="450" xmlns="http://www.w3.org/2000/svg">
              <rect width="800" height="450" fill="#000"/>
              <text x="400" y="200" font-family="Arial" font-size="24" fill="#ffd700" text-anchor="middle">
                RTMP Stream Configured
              </text>
              <text x="400" y="230" font-family="Arial" font-size="16" fill="#fff" text-anchor="middle">
                Stream: ${streamKey ? streamKey.substring(0, 15) + '...' : 'N/A'}
              </text>
              <text x="400" y="260" font-family="Arial" font-size="14" fill="#ccc" text-anchor="middle">
                NOTE: Actual HLS playback URL needed
              </text>
            </svg>
          `);
        }
        break;
        
      default:
        // Default to video if stream type is unrecognized
        if (liveStreamElement) {
          liveStreamElement.src = 'hero images/uhd_30fps.mp4';
          liveStreamElement.style.display = 'block';
          
          // Remove any existing HLS instance
          if ((window as any).hls) {
            (window as any).hls.destroy();
            (window as any).hls = null;
          }
        }
    }
  };

  // Add betting open state
  const [bettingOpen, setBettingOpen] = useState(true);

  // Fetch stream settings matching legacy implementation
  const fetchStreamSettings = async () => {
    // First try to get from localStorage (our primary source when backend isn't available)
    const localSettings = localStorage.getItem('streamSettings');
    if (localSettings) {
      try {
        const settings = JSON.parse(localSettings);
        console.log('Using stream settings from localStorage:', settings);
        updateStreamDisplay(settings);
        return; // Successfully loaded from localStorage
      } catch (error) {
        console.error('Error parsing localStorage settings:', error);
      }
    }
    
    // If localStorage isn't available, try the backend API
    try {
      const response = await fetch(`${window.API_BASE_URL || 'http://localhost:5000'}/api/game/stream-settings`);
      
      if (!response.ok) {
        // Backend API not available, use default settings
        console.log('Backend API not available, using default settings');
        updateStreamDisplay({
          stream_type: { value: 'video' },
          stream_url: { value: 'hero images/uhd_30fps.mp4' },
          stream_status: { value: 'offline' },
          stream_title: { value: 'Andar Bahar Live Game' }
        });
        return;
      }
      
      const result = await response.json();
      
      if (result.success && result.data) {
        const settings = result.data;
        console.log('Using stream settings from backend API:', settings);
        updateStreamDisplay(settings);
      } else {
        // Use default video if both methods fail
        updateStreamDisplay({
          stream_type: { value: 'video' },
          stream_url: { value: 'hero images/uhd_30fps.mp4' },
          stream_status: { value: 'offline' },
          stream_title: { value: 'Andar Bahar Live Game' }
        });
      }
    } catch (error) {
      console.error('Error fetching stream settings from backend:', error);
      // Use default video if both methods fail
      updateStreamDisplay({
        stream_type: { value: 'video' },
        stream_url: { value: 'hero images/uhd_30fps.mp4' },
        stream_status: { value: 'offline' },
        stream_title: { value: 'Andar Bahar Live Game' }
      });
    }
  };

  // Fetch opening card from backend matching legacy implementation
  const fetchOpeningCard = async () => {
    try {
      const response = await fetch(`${window.API_BASE_URL || 'http://localhost:5000'}/api/game/settings/opening_card`);
      const result = await response.json();
      
      if (result.success && result.data && result.data.setting_value) {
        const cardValue = result.data.setting_value;
        if (cardValue && cardValue.length >= 2) {
          const rank = cardValue[0];
          const suit = cardValue[1];
          
          if (openingCardRankRef.current) openingCardRankRef.current.textContent = rank;
          if (openingCardSuitRef.current) openingCardSuitRef.current.textContent = suit;
          
          // Update game state
          setGameState(prev => ({
            ...prev,
            openingCard: cardValue
          }));
          
          addNotification('success', `Opening card: ${rank}${suit}`);
        }
      }
    } catch (error) {
      console.error('Error fetching opening card:', error);
    }
  };

  // Initialize component like legacy
  useEffect(() => {
    // Fetch opening card from backend
    fetchOpeningCard();
    
    // Fetch stream settings from backend
    fetchStreamSettings();
    
    // Periodically check for opening card updates (every 3 seconds)
    const openingCardInterval = setInterval(() => {
      if (!gameState.openingCard) {
        fetchOpeningCard();
      }
    }, 3000);
    
    // Store the initial settings to detect changes
    let lastKnownStreamSettings = localStorage.getItem('streamSettings');
    
    // Periodically check for stream settings updates in localStorage (every 3 seconds)
    const streamSettingsInterval = setInterval(() => {
      const currentSettings = localStorage.getItem('streamSettings');
      if (currentSettings && currentSettings !== lastKnownStreamSettings) {
        try {
          const settings = JSON.parse(currentSettings);
          // Only update if we have valid settings
          if (settings.stream_type && settings.stream_url) {
            console.log('Stream settings changed in localStorage, updating display...', settings);
            // Update the display with new settings
            updateStreamDisplay(settings);
            // Update our reference
            lastKnownStreamSettings = currentSettings;
          }
        } catch (error) {
          console.error('Error checking localStorage for stream updates:', error);
        }
      }
    }, 3000); // Check every 3 seconds
    
    // Cleanup intervals on unmount
    return () => {
      clearInterval(openingCardInterval);
      clearInterval(streamSettingsInterval);
      
      // Cleanup HLS when page unloads
      if ((window as any).hls) {
        (window as any).hls.destroy();
        (window as any).hls = null;
      }
    };
  }, []);

  return (
    <div className="game-body">
      {/* Video Stream Section */}
      <div className="video-section" id="videoSection">
        {/* Video Stream Component */}
        <div id="liveStreamContainer" style={{ display: 'block', width: '100%', height: '100%' }}>
          <VideoStream
            streamUrl={currentStreamUrl}
            streamType={currentStreamType}
            isLive={isStreamLive}
            viewerCount={parseInt(viewerCount.replace(',', ''))}
            title="Andar Bahar"
          />
        </div>

        {/* Container for embed codes (YouTube, Twitch, etc.) - Legacy Support */}
        <div
          id="embedContainer"
          style={{ display: 'none', width: '100%', height: '100%', position: 'relative' }}
        >
          <iframe
            id="embedFrame"
            style={{ width: '100%', height: '100%', border: 'none' }}
            allowFullScreen
          ></iframe>
        </div>
        
        {/* Container for RTMP streams (Legacy Support) */}
        <div
          id="rtmpStreamContainer"
          style={{ display: 'none', width: '100%', height: '100%' }}
        >
          <video
            id="rtmpStream"
            autoPlay
            muted
            controls
            playsInline
            style={{ width: '100%', height: '100%' }}
            ref={(videoElement) => {
              if (videoElement) {
                // Store reference for later use
                (window as any).rtmpStreamElement = videoElement;
              }
            }}
          ></video>
        </div>

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

      {/* Stream Container - Legacy Structure */}
      <div className="stream-container">
        <div className="stream-video">
          <video
            id="streamVideoPlayer"
            autoPlay
            muted
            loop
            playsInline
          >
            <source src="/hero images/uhd_30fps.mp4" type="video/mp4" />
          </video>
          <div className="stream-controls">
            <button className="play-pause-btn">
              <i className="fas fa-play"></i>
            </button>
            <div className="stream-info">
              <div className="viewer-count">
                <i className="fas fa-eye"></i>
                <span>{viewerCount}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Game Interface Section */}
      <div className="game-interface">
        {/* Betting Interface */}
        <div className="betting-interface">
          <div className="betting-container">
            {/* Timer */}
            <div className="game-timer">
              <i className="fas fa-clock"></i>
              <span id="gameTimer">{gameState.currentTimer}</span>s
            </div>

            {/* Main Betting Area */}
            <div className="main-betting-areas">
              {/* ANDAR ZONE */}
              <div className="betting-zone andar-zone" id="andarZone" onClick={() => placeBet('andar')}>
                <div className="zone-content1">
                  <div className="zone-text1">
                    <div className="zone-label1">ANDAR 1:1</div>
                  </div>
                </div>
                <img src="/coins/Select Coins.png" alt="Andar Image" className="andar-zone-image" />
                <img src="/cards/D7.png" alt="Andar Image 2" className="andar-zone-image-2" />
                <div className="bet-amount" id="andarBet" ref={andarBetRef}>₹ {gameState.andarBets.toLocaleString('en-IN')}</div>
              </div>

              {/* CENTRAL CARD AREA */}
              <div className="central-card-area">
                <div className="opening-card" id="centralCardDisplay">
                  <div className="card-icon">🃏</div>
                  <div className="card-text">Select Opening Card</div>
                </div>
              </div>

              {/* BAHAR ZONE */}
              <div className="betting-zone bahar-zone" id="baharZone" onClick={() => placeBet('bahar')}>
                <div className="zone-text2">
                  <div className="zone-label2">BAHAR 1:1</div>
                </div>
                <img src="/coins/Select Coins.png" alt="Bahar Image" className="bahar-zone-image" />
                <img src="/cards/DQ.png" alt="Bahar Image 2" className="bahar-zone-image-2" />
                <div className="bet-amount" id="baharBet" ref={baharBetRef}>₹ {gameState.baharBets.toLocaleString('en-IN')}</div>
              </div>
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

        {/* Coins Container */}
        <div className="coins-container">
          <div className="chip-selection-section">
            {/* Chip Selection */}
            <div
              className="chip-selection"
              id="chipSelectionPanel"
              style={{ display: showChipSelector ? 'flex' : 'none' }}
            >
              <div className="chip-container">
                {CHIP_VALUES.map((value) => (
                  <button
                    key={value}
                    className={`chip-btn ${selectedChip === value ? 'active' : ''}`}
                    data-amount={value}
                    onClick={(e) => {
                      // Remove active class from all chips like legacy
                      document.querySelectorAll('.chip-btn').forEach(c => c.classList.remove('active'));
                      
                      // Add active class to selected chip
                      const clickedChip = e.currentTarget as HTMLElement;
                      clickedChip.classList.add('active');
                      
                      // Update selected chip like legacy
                      setSelectedChip(value);
                      
                      // Update display like legacy
                      const chipDisplay = document.getElementById('selectedChipDisplay');
                      if (chipDisplay) {
                        const formattedValue = value >= 1000 ? `${value/1000}k` : value.toString();
                        chipDisplay.textContent = `₹${formattedValue}`;
                      }
                      
                      // Hide panel after selection like legacy
                      setShowChipSelector(false);
                    }}
                  >
                    <img
                      src={`/coins/${value}.png`}
                      alt={`₹${value/1000}k`}
                      className="chip-image"
                    />
                    <div className="chip-amount">
                      {value >= 1000 ? `₹${value/1000}k` : `₹${value}`}
                    </div>
                  </button>
                ))}
              </div>
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
            <button className="control-btn" onClick={rebet}>
              <i className="fas fa-redo"></i>
              <span>Rebet</span>
            </button>
            <button className="control-btn" onClick={() => window.location.reload()} title="Refresh All Settings">
              <i className="fas fa-sync-alt"></i>
              <span>Refresh</span>
            </button>
            <button className="control-btn" onClick={() => {}} title="Refresh Game Settings">
              <i className="fas fa-cog"></i>
              <span>Settings</span>
            </button>
            <img src="/coins/Select Coins.png" alt="" className="select-coins" onClick={() => setShowChipSelector(!showChipSelector)} />
          </div>
        </div>

        {/* Recent Results */}
        <div className="recent-results">
          <div className="result-chip red">A</div>
          <div className="result-chip red">A</div>
          <div className="result-chip blue">B</div>
          <div className="result-chip blue">B</div>
          <div className="result-chip blue">B</div>
          <div className="result-chip red">A</div>
        </div>

        {/* Player Info */}
        <div className="player-info">
          <div className="info-left">
            <div className="info-item">
              <span className="label">ID</span>
              <span className="value">{userId}</span>
            </div>
            <div className="info-item">
              <span className="label">Balance</span>
              <span className="value balance">{balanceDisplay}</span>
            </div>
          </div>
          <div className="info-right">
            <div className="info-item">
              <span className="label">Total Bet</span>
              <span className="value">₹ {(gameState.andarBets + gameState.baharBets).toLocaleString('en-IN')}</span>
            </div>
            <div className="info-item">
              <span className="label">Last Win</span>
              <span className="value">₹ 0</span>
            </div>
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
          >
            {notification.message}
          </div>
        ))}
      </div>
    </div>
  );
}
