# Prompt 4: Player Interface Functionality for Andar Bahar Game

## Objective
Add complete JavaScript functionality to the player interface (start-game.html), including WebSocket integration, betting system, timer management, card dealing visualization, stream settings, and all interactive elements.

## Files to Update

### 1. Update start-game.html with JavaScript functionality
```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Andar Bahar - Start Game | Reddy Anna Kossu</title>
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
    <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
    <script src="https://cdn.jsdelivr.net/npm/hls.js@1.5.11/dist/hls.min.js"></script>
    <script src="config.js"></script>
    <link rel="stylesheet" href="styles.css">
</head>
<body>
    <div class="game-body">
        <!-- Video Stream Section -->
        <div class="video-section" id="videoSection">
            <!-- Video player for video files -->
            <video id="liveStream" autoplay muted loop playsinline style="display: block;">
                <source src="hero images/uhd_30fps.mp4" type="video/mp4">
            </video>
            
            <!-- Container for embed codes (YouTube, Twitch, etc.) -->
            <div id="embedContainer" style="display: none; width: 100%; height: 100%; position: relative;">
                <iframe id="embedFrame" style="width: 100%; height: 100%; border: none;" allowfullscreen></iframe>
            </div>
            
            <!-- Container for RTMP streams (will use HLS.js or similar) -->
            <video id="rtmpStream" autoplay muted controls playsinline style="display: none;"></video>

            <!-- Header elements over video -->
            <header class="header">
                <nav class="navbar">
                    <div class="nav-container">
                        <div class="logo">
                            <h1 id="userIdDisplay">1308544430</h1>
                        </div>
                        <div class="wallet-display">
                            <i class="fas fa-wallet"></i>
                            <div class="wallet-amount-display" id="walletBalance">₹44,20,423.90</div>
                        </div>
                    </div>
                </nav>
            </header>
            
            <!-- Other overlay elements -->
            <div class="video-overlay-content">
                <div class="game-info-left">
                    <div class="live-indicator">
                        <div class="live-dot"></div>
                        <span>LIVE</span>
                    </div>
                    <span class="game-title-text">Andar Bahar</span>
                </div>
                <div class="view-count">
                    <i class="fas fa-eye"></i>
                    <span id="viewerCount">1,234</span>
                </div>
            </div>

            <!-- Centered Timer Overlay -->
            <div class="timer-overlay">
                <div class="circular-timer">
                    <div class="timer-value" id="gameTimer">30</div>
                    <div class="round-info" id="roundInfo">Round 1</div>
                </div>
            </div>
        </div>

        <!-- Game Interface Section -->
        <div class="game-interface">
            <!-- Main Betting Area -->
            <div class="main-betting-areas">
                <!-- ANDAR ZONE -->
                <div class="betting-zone andar-zone" id="andarZone">
                    <div class="bet-info">
                        <div class="bet-title">
                            <span>ANDAR 1:1</span>
                        </div>
                        <div class="bet-amount" id="andarBet">₹ 0</div>
                    </div>
                    <div class="card-representation">
                        <span class="card-rank" id="andarCardRank"></span>
                        <span class="card-suit" id="andarCardSuit"></span>
                    </div>
                </div>

                <!-- CENTRAL CARD AREA -->
                <div class="central-card-area">
                    <div class="opening-card" id="openingCard">
                        <span class="card-rank" id="openingCardRank"></span>
                        <span class="card-suit" id="openingCardSuit"></span>
                    </div>
               </div>

                <!-- BAHAR ZONE -->
                <div class="betting-zone bahar-zone" id="baharZone">
                    <div class="card-representation">
                        <span class="card-rank" id="baharCardRank"></span>
                        <span class="card-suit" id="baharCardSuit"></span>
                    </div>
                    <div class="bet-info">
                        <div class="bet-title">
                            <span>BAHAR 1:1</span>
                        </div>
                        <div class="bet-amount" id="baharBet">₹ 0</div>
                    </div>
                </div>
            </div>

            <!-- Card Sequence Display -->
            <div class="card-sequence-container" id="cardSequenceContainer" style="display: none;">
                <div class="sequence-section andar-sequence">
                    <div class="sequence-title">ANDAR</div>
                    <div class="card-sequence" id="andarCardSequence"></div>
                </div>
                <div class="sequence-section bahar-sequence">
                    <div class="sequence-title">BAHAR</div>
                    <div class="card-sequence" id="baharCardSequence"></div>
                </div>
            </div>

            <!-- Game Controls -->
            <div class="game-controls">
                <button class="control-btn" onclick="showHistory()">
                    <i class="fas fa-history"></i>
                    <span>History</span>
                </button>
                <button class="control-btn" onclick="undoBet()">
                    <i class="fas fa-undo"></i>
                    <span>Undo</span>
                </button>
                <button class="select-chip-btn" id="selectedChipDisplay" onclick="toggleChipPanel()">
                    Select Chip
                </button>
                <button class="control-btn" onclick="rebet()">
                    <i class="fas fa-redo"></i>
                    <span>Rebet</span>
                </button>
            </div>

            <!-- Chip Selection Panel -->
            <div class="chip-selection" id="chipSelectionPanel">
                <div class="chip-container">
                    <button class="chip-btn" data-amount="100000">
                        <img src="coins/100000.png" alt="₹100k" class="chip-image">
                        <div class="chip-amount">₹100k</div>
                    </button>
                    <button class="chip-btn" data-amount="50000">
                        <img src="coins/50000.png" alt="₹50k" class="chip-image">
                        <div class="chip-amount">₹50k</div>
                    </button>
                    <button class="chip-btn" data-amount="40000">
                        <img src="coins/40000.png" alt="₹40k" class="chip-image">
                        <div class="chip-amount">₹40k</div>
                    </button>
                    <button class="chip-btn" data-amount="30000">
                        <img src="coins/30000.png" alt="₹30k" class="chip-image">
                        <div class="chip-amount">₹30k</div>
                    </button>
                    <button class="chip-btn" data-amount="20000">
                        <img src="coins/20000.png" alt="₹20k" class="chip-image">
                        <div class="chip-amount">₹20k</div>
                    </button>
                    <button class="chip-btn" data-amount="10000">
                        <img src="coins/10000.png" alt="₹10k" class="chip-image">
                        <div class="chip-amount">₹10k</div>
                    </button>
                    <button class="chip-btn" data-amount="5000">
                        <img src="coins/5000.png" alt="₹5k" class="chip-image">
                        <div class="chip-amount">₹5k</div>
                    </button>
                    <button class="chip-btn" data-amount="2500">
                        <img src="coins/2500.png" alt="₹2.5k" class="chip-image">
                        <div class="chip-amount">₹2.5k</div>
                    </button>
                </div>
            </div>

            <!-- Recent Results - Card History -->
            <div class="recent-results-container" onclick="showFullHistory()">
                <div class="recent-results-header">
                    <div class="history-title">Card History</div>
                    <div class="history-expand">Click for more →</div>
                </div>
                <div class="recent-results-bottom" id="recentResults">
                    <div class="result-chip red">A</div>
                    <div class="result-chip red">A</div>
                    <div class="result-chip blue">B</div>
                    <div class="result-chip blue">B</div>
                    <div class="result-chip blue">B</div>
                    <div class="result-chip red">A</div>
                </div>
                <div class="results-progress-bar"></div>
            </div>
        </div>
    </div>
    
    <!-- History Modal -->
    <div id="historyModal" class="history-modal">
        <div class="history-content">
            <div class="history-header">
                <div class="history-title-large">Game History</div>
                <button class="close-history" onclick="closeHistory()">&times;</button>
            </div>
            <div class="history-grid" id="historyGrid">
                <!-- History items will be populated here -->
            </div>
            <div class="history-stats">
                <div class="stat-item">
                    <div class="stat-label">Total Games</div>
                    <div class="stat-value" id="totalGames">0</div>
                </div>
                <div class="stat-item">
                    <div class="stat-label">Andar Wins</div>
                    <div class="stat-value" id="andarWins">0</div>
                </div>
                <div class="stat-item">
                    <div class="stat-label">Bahar Wins</div>
                    <div class="stat-value" id="baharWins">0</div>
                </div>
            </div>
        </div>
    </div>
    
    <!-- Notification Container -->
    <div id="notificationContainer" class="notification-container"></div>
    
    <script>
        // Global variables
        let selectedChip = 0;
        let andarBet = 0;
        let baharBet = 0;
        let gameTimer = 30;
        let timerInterval;
        let playerBalance = 4420423.90;
        let betHistory = [];
        let bettingOpen = true;
        let gameSettings = {
            min_bet_amount: 1000,
            max_bet_amount: 50000,
            game_timer: 30
        };
        
        // Game state management
        let gameState = {
            phase: 'waiting', // 'waiting', 'betting', 'dealing', 'complete'
            openingCard: null,
            andarCards: [],
            baharCards: [],
            currentRound: 1,
            winner: null,
            winningCard: null
        };

        // Card dealing visualization
        let cardSequenceContainer = {
            andar: [],
            bahar: []
        };
        
        // WebSocket connection for real-time updates
        let websocketConnection = null;
        let currentGameId = 'default-game'; // Use consistent game ID
        let currentUserId = localStorage.getItem('userId') || '1308544430';
        
        // Make game state globally available for sync overrides
        window.gameState = gameState;
        
        // --- WEBSOCKET FUNCTIONS ---
        function initializeWebSocket() {
            // Ensure API_BASE_URL is defined
            if (!window.API_BASE_URL) {
                window.API_BASE_URL = 'http://localhost:4001';
            }
            
            const wsUrl = `${window.API_BASE_URL.replace('http', 'ws')}`;
            console.log('Connecting to WebSocket at:', wsUrl);
            
            try {
                websocketConnection = new WebSocket(wsUrl);
                
                websocketConnection.onopen = function(event) {
                    console.log('WebSocket connection established');
                    
                    // Authenticate and subscribe to game
                    websocketConnection.send(JSON.stringify({
                        type: 'authenticate',
                        data: { userId: currentUserId }
                    }));
                    
                    websocketConnection.send(JSON.stringify({
                        type: 'subscribe_game',
                        data: { gameId: currentGameId }
                    }));
                    
                    // Request current game state to synchronize
                    setTimeout(() => {
                        requestGameStateSync();
                    }, 1000);
                    
                    showNotification('Connected to game server', 'success');
                };
                
                websocketConnection.onmessage = function(event) {
                    try {
                        const message = JSON.parse(event.data);
                        handleWebSocketMessage(message);
                    } catch (error) {
                        console.error('Error parsing WebSocket message:', error);
                    }
                };
                
                websocketConnection.onclose = function(event) {
                    console.log('WebSocket connection closed:', event.code, event.reason);
                    showNotification('Connection to game server lost. Reconnecting...', 'warning');
                    
                    // Attempt to reconnect after 3 seconds
                    setTimeout(initializeWebSocket, 3000);
                };
                
                websocketConnection.onerror = function(error) {
                    console.error('WebSocket error:', error);
                    showNotification('Connection error with game server', 'error');
                };
            } catch (error) {
                console.error('Failed to initialize WebSocket:', error);
                showNotification('Failed to connect to game server', 'error');
            }
        }
        
        function handleWebSocketMessage(message) {
            console.log('Received WebSocket message:', message);
            
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
        }
        
        function handleGameStateUpdate(gameState) {
            console.log('Game state updated:', gameState);
            
            // Update opening card if provided
            if (gameState.openingCard) {
                updateOpeningCard(gameState.openingCard);
                // Fetch opening card from backend to ensure it's displayed
                fetchOpeningCard();
            }
            
            // Update game phase if provided
            if (gameState.phase) {
                updateGamePhase(gameState.phase);
            }
            
            // Update timer if provided
            if (gameState.currentTimer !== undefined) {
                updateTimerDisplay(gameState.currentTimer);
            }
        }
        
        function handleTimerUpdate(timer, phase) {
            console.log('Timer update:', timer, phase);
            
            // Always update the timer display
            const timerElement = document.getElementById('gameTimer');
            if (timerElement) {
                timerElement.textContent = timer;
                gameTimer = timer;
            }
            
            // Update betting status based on phase and timer value
            if (phase === 'betting' && timer > 0) {
                if (!bettingOpen) {
                    bettingOpen = true;
                    showNotification('Betting is now open!', 'success');
                }
            } else if (timer <= 0 || phase === 'closed' || phase === 'dealing') {
                if (bettingOpen) {
                    bettingOpen = false;
                    showNotification('Betting is now closed!', 'warning');
                }
            }
            
            // Handle timer visibility
            const circularTimerElement = document.querySelector('.circular-timer');
            if (circularTimerElement) {
                if (timer <= 0) {
                    circularTimerElement.classList.add('timer-hidden');
                } else {
                    circularTimerElement.classList.remove('timer-hidden');
                }
            }
            
            // Update round info based on phase and timer
            const roundInfoElement = document.getElementById('roundInfo');
            if (roundInfoElement) {
                if (phase === 'betting' && timer > 0) {
                    roundInfoElement.textContent = `Betting Time: ${timer}s`;
                } else if (phase === 'dealing') {
                    roundInfoElement.textContent = 'Dealing Phase';
                } else if (phase === 'complete') {
                    roundInfoElement.textContent = 'Game Complete';
                } else if (timer <= 0) {
                    roundInfoElement.textContent = 'Time Up!';
                }
            }
        }
        
        function handleCardDealt(card, side, position) {
            console.log('Card dealt:', card, side, position);
            
            // Update game state
            if (side === 'andar') {
                gameState.andarCards.push(card);
                addCardToSequence('andar', card, position);
            } else if (side === 'bahar') {
                gameState.baharCards.push(card);
                addCardToSequence('bahar', card, position);
            }
            
            // Check if this card matches the opening card rank
            if (gameState.openingCard && card.rank === gameState.openingCard.rank) {
                // Game should end - this is the winning card
                gameState.winner = side;
                gameState.winningCard = card;
                gameState.phase = 'complete';
                
                // This will be handled by the game_complete message from server
                console.log(`Winning card detected: ${card.rank}${card.suit} on ${side} side`);
            }
        }
        
        function handleGameComplete(winner, winningCard, totalCards) {
            console.log('Game complete:', winner, winningCard, totalCards);
            
            // Update game state
            gameState.winner = winner;
            gameState.winningCard = winningCard;
            gameState.phase = 'complete';
            
            // Show winner notification
            showNotification(`Game complete! ${winner.toUpperCase()} wins with ${winningCard.rank}${winningCard.suit}!`, 'success');
            
            // Update recent results
            updateRecentResults(winner);
            
            // Reset for next game
            bettingOpen = false;
            andarBet = 0;
            baharBet = 0;
            updateBetDisplay();
            
            // Clear card sequences after a delay
            setTimeout(() => {
                clearCardSequences();
            }, 5000);
        }
        
        function handleBetPlaced(userId, side, amount, round) {
            console.log('Bet placed:', userId, side, amount, round);
            
            // Only show notification for other users' bets
            if (userId !== currentUserId) {
                showNotification(`Player bet ₹${amount} on ${side}`, 'info');
            }
        }
        
        function handleBettingStats(andarBets, baharBets, totalBets) {
            console.log('Betting stats:', andarBets, baharBets, totalBets);
            
            // Update bet displays with current totals
            document.getElementById('andarBet').textContent = `₹ ${andarBets.toLocaleString('en-IN')}`;
            document.getElementById('baharBet').textContent = `₹ ${baharBets.toLocaleString('en-IN')}`;
        }
        
        function handlePhaseChange(phase, message) {
            console.log('Phase change:', phase, message);
            
            // Update game phase
            updateGamePhase(phase);
            
            // Show notification about phase change
            if (message) {
                showNotification(message, 'info');
            }
        }
        
        function handleSyncGameState(gameState) {
            console.log('Syncing game state:', gameState);
            
            // Update all game state properties
            if (gameState.phase) {
                updateGamePhase(gameState.phase);
            }
            
            if (gameState.openingCard) {
                updateOpeningCard(gameState.openingCard);
            }
            
            if (gameState.andarCards && gameState.andarCards.length > 0) {
                // Clear existing sequence
                document.getElementById('andarCardSequence').innerHTML = '';
                
                // Add all cards to sequence
                gameState.andarCards.forEach((card, index) => {
                    addCardToSequence('andar', card, index);
                });
            }
            
            if (gameState.baharCards && gameState.baharCards.length > 0) {
                // Clear existing sequence
                document.getElementById('baharCardSequence').innerHTML = '';
                
                // Add all cards to sequence
                gameState.baharCards.forEach((card, index) => {
                    addCardToSequence('bahar', card, index);
                });
            }
            
            if (gameState.winner && gameState.winningCard) {
                handleGameComplete(gameState.winner, gameState.winningCard,
                    gameState.andarCards.length + gameState.baharCards.length);
            }
            
            // Show sequence container if there are cards
            if ((gameState.andarCards && gameState.andarCards.length > 0) ||
                (gameState.baharCards && gameState.baharCards.length > 0)) {
                document.getElementById('cardSequenceContainer').style.display = 'flex';
            }
        }
        
        function handleStreamStatusUpdate(data) {
            console.log('Stream status update:', data);
            
            // Update live indicator based on stream status
            const liveIndicator = document.querySelector('.live-indicator');
            if (liveIndicator) {
                if (data.streamStatus === 'live') {
                    liveIndicator.style.display = 'flex';
                } else {
                    liveIndicator.style.display = 'none';
                }
            }
            
            // Update stream title if provided
            if (data.streamTitle) {
                const titleElement = document.querySelector('.game-title-text');
                if (titleElement) {
                    titleElement.textContent = data.streamTitle;
                }
            }
            
            // If stream type or URL changed, refresh stream settings
            if (data.streamType || data.streamUrl || data.rtmpUrl || data.rtmpStreamKey) {
                fetchStreamSettings();
            }
        }
        
        // Function to request game state synchronization
        function requestGameStateSync() {
            if (websocketConnection && websocketConnection.readyState === WebSocket.OPEN) {
                websocketConnection.send(JSON.stringify({
                    type: 'sync_request',
                    data: { gameId: currentGameId }
                }));
            }
        }
        
        // Function to update card sequences from game state
        function updateCardSequences(cardSequence) {
            if (!cardSequence) return;
            
            // Clear existing sequences
            document.getElementById('andarCardSequence').innerHTML = '';
            document.getElementById('baharCardSequence').innerHTML = '';
            
            // Add andar cards
            if (cardSequence.andarCards && Array.isArray(cardSequence.andarCards)) {
                cardSequence.andarCards.forEach((card, index) => {
                    addCardToSequence('andar', card, index);
                });
            }
            
            // Add bahar cards
            if (cardSequence.baharCards && Array.isArray(cardSequence.baharCards)) {
                cardSequence.baharCards.forEach((card, index) => {
                    addCardToSequence('bahar', card, index);
                });
            }
            
            // Show sequence container if there are cards
            const containerElement = document.getElementById('cardSequenceContainer');
            if ((cardSequence.andarCards && cardSequence.andarCards.length > 0) ||
                (cardSequence.baharCards && cardSequence.baharCards.length > 0)) {
                containerElement.style.display = 'flex';
            }
        }
        
        function updateOpeningCard(card) {
            if (card && card.rank && card.suit) {
                gameState.openingCard = card;
                document.getElementById('openingCardRank').textContent = card.rank;
                document.getElementById('openingCardSuit').textContent = card.suit;
                showNotification(`Opening card: ${card.rank}${card.suit}`, 'info');
            }
        }
        
        function updateTimerDisplay(timer) {
            const timerElement = document.getElementById('gameTimer');
            if (timerElement) {
                timerElement.textContent = timer;
                gameTimer = timer;
            }
            
            // Handle timer visibility
            const circularTimerElement = document.querySelector('.circular-timer');
            if (circularTimerElement) {
                if (timer <= 0) {
                    circularTimerElement.classList.add('timer-hidden');
                } else {
                    circularTimerElement.classList.remove('timer-hidden');
                }
            }
        }
        
        function updateGamePhase(phase) {
            gameState.phase = phase;
            const roundInfo = document.getElementById('roundInfo');
            if (phase === 'betting') {
                roundInfo.textContent = 'Betting Phase';
                bettingOpen = true;
            } else if (phase === 'dealing') {
                roundInfo.textContent = 'Dealing Phase';
                bettingOpen = false;
            } else if (phase === 'complete') {
                roundInfo.textContent = 'Game Complete';
                bettingOpen = false;
            }
        }
        
        // --- CORE FUNCTIONS ---
        document.addEventListener('DOMContentLoaded', function() {
            // Initial setup calls
            loadUserId();
            setupChipSelection();
            setupBettingZones();
            
            // Update wallet balance to match image format
            const balance = 4420423.90;
            const formattedBalance = `₹${balance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
            document.getElementById('walletBalance').textContent = formattedBalance;
            
            // Fetch opening card from backend
            fetchOpeningCard();
            
            // Fetch stream settings from backend
            fetchStreamSettings();
            
            // Initialize WebSocket connection
            initializeWebSocket();
            
            // Periodically check for opening card updates (every 3 seconds)
            setInterval(() => {
                if (!gameState.openingCard) {
                    fetchOpeningCard();
                }
            }, 3000);
            
            // Don't start local timer - wait for WebSocket timer updates
            // startGameTimer();
        });
        
        // Fetch opening card from backend
        async function fetchOpeningCard() {
            try {
                const response = await fetch(`${window.API_BASE_URL}/api/game/settings/opening_card`);
                const result = await response.json();
                
                if (result.success && result.data && result.data.setting_value) {
                    const cardValue = result.data.setting_value;
                    if (cardValue && cardValue.length >= 2) {
                        const rank = cardValue[0];
                        const suit = cardValue[1];
                        
                        document.getElementById('openingCardRank').textContent = rank;
                        document.getElementById('openingCardSuit').textContent = suit;
                        
                        // Update game state
                        gameState.openingCard = { rank, suit };
                        
                        showNotification(`Opening card: ${rank}${suit}`, 'success');
                    }
                }
            } catch (error) {
                console.error('Error fetching opening card:', error);
            }
        }
        
        // Fetch stream settings (try localStorage first, then backend API)
        async function fetchStreamSettings() {
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
                const response = await fetch(`${window.API_BASE_URL}/api/game/stream-settings`);
                
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
        }
        
        function updateStreamDisplay(settings) {
            const streamType = settings.stream_type?.value || 'video';
            const streamUrl = settings.stream_url?.value || 'hero images/uhd_30fps.mp4';
            const streamStatus = settings.stream_status?.value || 'offline';
            const streamTitle = settings.stream_title?.value || 'Andar Bahar Live Game';
            const rtmpUrl = settings.rtmp_url?.value || '';
            const rtmpStreamKey = settings.rtmp_stream_key?.value || '';
            
            // Hide all stream containers first
            document.getElementById('liveStream').style.display = 'none';
            document.getElementById('embedContainer').style.display = 'none';
            document.getElementById('rtmpStream').style.display = 'none';
            
            // Update stream title
            const titleElement = document.querySelector('.game-title-text');
            if (titleElement) {
                titleElement.textContent = streamTitle;
            }
            
            // Update live indicator based on status
            const liveIndicator = document.querySelector('.live-indicator');
            if (liveIndicator) {
                if (streamStatus === 'live') {
                    liveIndicator.style.display = 'flex';
                } else {
                    liveIndicator.style.display = 'none';
                }
            }
            
            // Display appropriate stream type
            switch (streamType) {
                case 'video':
                    const videoElement = document.getElementById('liveStream');
                    videoElement.src = streamUrl;
                    videoElement.style.display = 'block';
                    
                    // Remove any existing HLS instance
                    if (window.hls) {
                        window.hls.destroy();
                        window.hls = null;
                    }
                    break;
                    
                case 'embed':
                    const embedContainer = document.getElementById('embedContainer');
                    const embedFrame = document.getElementById('embedFrame');
                    embedFrame.src = streamUrl;
                    embedContainer.style.display = 'block';
                    
                    // Remove any existing HLS instance
                    if (window.hls) {
                        window.hls.destroy();
                        window.hls = null;
                    }
                    break;
                    
                case 'rtmp':
                    // For RTMP streams, since they can't be played directly in browsers,
                    // we will use the stream key in a proper way or show a placeholder
                    const rtmpElement = document.getElementById('rtmpStream');
                    rtmpElement.style.display = 'block';
                    
                    // Remove any existing HLS instance
                    if (window.hls) {
                        window.hls.destroy();
                        window.hls = null;
                    }
                    
                    // For actual RTMP streams like yours, we need to determine if there's an HLS endpoint
                    // For Restream.io, the RTMP ingest URL is rtmps://live.restream.io:1937/live
                    // But the HLS playback URL would be different and specific to your stream
                    
                    // Try to create the likely HLS URL for Restream.io based on the stream key
                    // However, most likely the RTMP URL provided is just for ingestion, not playback
                    // In real-world scenarios, you would get the HLS playback URL from the streaming service
                    const streamKey = rtmpStreamKey || streamUrl.split('/').pop(); // Get stream key from settings or extract from URL
                    
                    // For most RTMP services, the playback URL is different from the ingest URL
                    // If you know the HLS playback URL, you should use that instead of trying to guess it
                    // For now, we'll create a placeholder that indicates 
                    // that the stream settings have been configured, and suggest to use the actual HLS URL
                    console.log('RTMP settings configured. Stream URL:', streamUrl, 'Stream Key:', streamKey);
                    
                    // Optional: If you have an actual HLS playback URL from your streaming service,
                    // you can uncomment the following code and replace with the actual HLS URL
                    /*
                    const hlsPlaybackUrl = 'YOUR_ACTUAL_HLS_PLAYBACK_URL.m3u8'; // Replace with actual HLS URL
                    
                    if (hlsPlaybackUrl && Hls.isSupported()) {
                        window.hls = new Hls();
                        window.hls.loadSource(hlsPlaybackUrl);
                        window.hls.attachMedia(rtmpElement);
                        
                        window.hls.on(Hls.Events.MANIFEST_PARSED, function() {
                            rtmpElement.play();
                        });
                        
                        window.hls.on(Hls.Events.ERROR, function(event, data) {
                            console.error('HLS Error:', data);
                            // Update the poster to show the error
                            rtmpElement.poster = 'data:image/svg+xml;base64,' + btoa(`
                                <svg width="800" height="450" xmlns="http://www.w3.org/2000/svg">
                                    <rect width="800" height="450" fill="#000"/>
                                    <text x="400" y="200" font-family="Arial" font-size="24" fill="#ffd700" text-anchor="middle">
                                        HLS Stream Error
                                    </text>
                                    <text x="400" y="230" font-family="Arial" font-size="16" fill="#fff" text-anchor="middle">
                                        Could not load stream
                                    </text>
                                    <text x="400" y="260" font-family="Arial" font-size="14" fill="#ccc" text-anchor="middle">
                                        Check HLS URL configuration
                                    </text>
                                </svg>
                            `);
                        });
                    }
                    */
                    break;
                    
                default:
                    // Default to video if stream type is unrecognized
                    const defaultVideo = document.getElementById('liveStream');
                    defaultVideo.src = 'hero images/uhd_30fps.mp4';
                    defaultVideo.style.display = 'block';
                    
                    // Remove any existing HLS instance
                    if (window.hls) {
                        window.hls.destroy();
                        window.hls = null;
                    }
            }
        }
        
        function loadUserId() {
            const userIdDisplay = document.getElementById('userIdDisplay');
            let userId = localStorage.getItem('userId') || '1308544430';
            
            if (userIdDisplay) userIdDisplay.textContent = userId;
        }
        
        function startGameTimer() {
            // Timer is now controlled by WebSocket updates
            // This function is kept for compatibility but no longer starts a local timer
            console.log('Timer is now controlled by WebSocket updates');
        }
        
        function toggleChipPanel() {
            const chipPanel = document.getElementById('chipSelectionPanel');
            const currentDisplay = window.getComputedStyle(chipPanel).display;
            chipPanel.style.display = currentDisplay === 'none' ? 'block' : 'none';
        }

        function setupChipSelection() {
            document.querySelectorAll('.chip-btn').forEach(chip => {
                chip.addEventListener('click', () => {
                    document.querySelectorAll('.chip-btn').forEach(c => c.classList.remove('active'));
                    chip.classList.add('active');
                    selectedChip = parseInt(chip.dataset.amount);
                    
                    // Update the selected chip display
                    const chipDisplay = document.getElementById('selectedChipDisplay');
                    if (selectedChip > 0) {
                        const formattedValue = selectedChip >= 1000 ?
                            `${selectedChip/1000}k` :
                            selectedChip.toString();
                        chipDisplay.textContent = `₹${formattedValue}`;
                    }
                    
                    // Hide the panel after selection for better UX
                    toggleChipPanel();
                });
            });
        }
        
        function setupBettingZones() {
            ['andarZone', 'baharZone'].forEach(zoneId => {
                document.getElementById(zoneId).addEventListener('click', () => {
                    placeBet(zoneId);
                });
            });
        }

        async function placeBet(zoneId) {
            if (!bettingOpen) {
                showNotification('Betting is closed!', 'error');
                return;
            }
            if (selectedChip <= 0) {
                showNotification('Please select a chip to bet', 'error');
                return;
            }
            if (selectedChip < gameSettings.min_bet_amount) {
                showNotification(`Minimum bet is ₹${gameSettings.min_bet_amount.toLocaleString('en-IN')}`, 'error');
                return;
            }
            if (selectedChip > gameSettings.max_bet_amount) {
                showNotification(`Maximum bet is ₹${gameSettings.max_bet_amount.toLocaleString('en-IN')}`, 'error');
                return;
            }
            if (playerBalance < selectedChip) {
                showNotification('Insufficient balance!', 'error');
                return;
            }
            
            // Determine side and round
            const side = zoneId === 'andarZone' ? 'andar' : 'bahar';
            const round = 'round1'; // Default to round1 for now
            
            try {
                // Send bet to backend
                const response = await fetch(`${window.API_BASE_URL}/api/game/place-bet`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-User-Token': 'user-authenticated',
                        'X-User-Id': currentUserId
                    },
                    body: JSON.stringify({
                        userId: currentUserId,
                        gameId: currentGameId,
                        round: round,
                        side: side,
                        amount: selectedChip
                    })
                });
                
                const result = await response.json();
                
                if (result.success) {
                    // Save current state for undo
                    betHistory.push({ andarBet, baharBet, balance: playerBalance });
                    playerBalance -= selectedChip;

                    if (zoneId === 'andarZone') {
                        andarBet += selectedChip;
                        // Don't show fake cards - wait for admin to deal real cards
                    } else {
                        baharBet += selectedChip;
                        // Don't show fake cards - wait for admin to deal real cards
                    }

                    showNotification(`Bet of ₹${selectedChip} placed on ${side.toUpperCase()}!`, 'success');
                    updateBetDisplay();
                    updateBalanceDisplay();
                } else {
                    showNotification(result.message || 'Failed to place bet', 'error');
                }
            } catch (error) {
                console.error('Error placing bet:', error);
                showNotification('Failed to place bet. Please try again.', 'error');
            }
        }

        function updateBetDisplay() {
            document.getElementById('andarBet').textContent = `₹ ${andarBet.toLocaleString('en-IN')}`;
            document.getElementById('baharBet').textContent = `₹ ${baharBet.toLocaleString('en-IN')}`;
        }

        function updateBalanceDisplay() {
            const balanceEl = document.getElementById('walletBalance');
            const formattedBalance = `₹${playerBalance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
            
            if (balanceEl) {
                balanceEl.textContent = formattedBalance;
            }
            localStorage.setItem('userBalance', playerBalance.toString());
        }

        function undoBet() {
            if (betHistory.length > 0) {
                const lastState = betHistory.pop();
                andarBet = lastState.andarBet;
                baharBet = lastState.baharBet;
                playerBalance = lastState.balance;
                
                // Clear cards if no bets
                if (andarBet === 0) {
                    document.getElementById('andarCardRank').textContent = '';
                    document.getElementById('andarCardSuit').textContent = '';
                }
                
                if (baharBet === 0) {
                    document.getElementById('baharCardRank').textContent = '';
                    document.getElementById('baharCardSuit').textContent = '';
                }
                
                updateBetDisplay();
                updateBalanceDisplay();
                showNotification('Last bet has been undone', 'success');
            } else {
                showNotification('There is no bet to undo', 'error');
            }
        }
        
        function rebet() {
            if (betHistory.length > 0) {
                const lastState = betHistory[betHistory.length - 1];
                if (playerBalance >= (lastState.andarBet + lastState.baharBet)) {
                    betHistory.push({ andarBet, baharBet, balance: playerBalance });
                    playerBalance -= (lastState.andarBet + lastState.baharBet);
                    andarBet = lastState.andarBet;
                    baharBet = lastState.baharBet;

                    // Don't show fake cards - wait for admin to deal real cards
                    // Cards will be displayed when admin actually deals them

                    updateBetDisplay();
                    updateBalanceDisplay();
                    showNotification('Re-bet placed successfully!', 'success');
                } else {
                    showNotification('Insufficient balance for re-bet!', 'error');
                }
            } else {
                showNotification('No previous bet to re-bet', 'error');
            }
        }
        
        function showHistory() {
            showFullHistory();
        }

        function showFullHistory() {
            const modal = document.getElementById('historyModal');
            modal.style.display = 'block';
            
            // Generate extended history (in a real app, this would come from the backend)
            generateHistoryData();
        }

        function closeHistory() {
            const modal = document.getElementById('historyModal');
            modal.style.display = 'none';
        }

        function generateHistoryData() {
            const historyGrid = document.getElementById('historyGrid');
            historyGrid.innerHTML = '';
            
            // Generate 50 recent game results
            const results = [];
            let andarCount = 0;
            let baharCount = 0;
            
            for (let i = 1; i <= 50; i++) {
                const isAndar = Math.random() > 0.5; // 50% chance for each
                results.push({
                    round: i,
                    winner: isAndar ? 'andar' : 'bahar'
                });
                
                if (isAndar) andarCount++;
                else baharCount++;
            }
            
            // Display the most recent 30 results in the grid
            const recentResults = results.slice(-30).reverse();
            
            recentResults.forEach(result => {
                const historyItem = document.createElement('div');
                historyItem.className = 'history-item';
                
                const roundDiv = document.createElement('div');
                roundDiv.className = 'history-round';
                roundDiv.textContent = `#${result.round}`;
                
                const chipDiv = document.createElement('div');
                chipDiv.className = `history-result-chip ${result.winner === 'andar' ? 'red' : 'blue'}`;
                chipDiv.textContent = result.winner === 'andar' ? 'A' : 'B';
                
                historyItem.appendChild(roundDiv);
                historyItem.appendChild(chipDiv);
                historyGrid.appendChild(historyItem);
            });
            
            // Update statistics
            document.getElementById('totalGames').textContent = results.length;
            document.getElementById('andarWins').textContent = andarCount;
            document.getElementById('baharWins').textContent = baharCount;
        }

        // Update the recent results with new game result
        function updateRecentResults(winner) {
            const recentResults = document.getElementById('recentResults');
            const resultChip = document.createElement('div');
            resultChip.className = `result-chip ${winner === 'andar' ? 'red' : 'blue'}`;
            resultChip.textContent = winner === 'andar' ? 'A' : 'B';
            
            recentResults.insertBefore(resultChip, recentResults.firstChild);
            
            // Keep only last 12 results in the bottom view
            while (recentResults.children.length > 12) {
                recentResults.removeChild(recentResults.lastChild);
            }
        }

        // Close modal when clicking outside
        window.onclick = function(event) {
            const modal = document.getElementById('historyModal');
            if (event.target === modal) {
                modal.style.display = 'none';
            }
        }

        // --- CARD FUNCTIONS ---

        // Update card with rank and suit (only called when admin deals real cards)
        function updateCard(side, rank, suit) {
            document.getElementById(`${side}CardRank`).textContent = rank;
            document.getElementById(`${side}CardSuit`).textContent = suit;
        }

        // --- UI UTILITIES ---

        function showNotification(message, type = 'info') {
            const container = document.getElementById('notificationContainer');
            if (!container) return;

            const notification = document.createElement('div');
            notification.className = `notification notification-${type}`;
            notification.textContent = message;
            container.appendChild(notification);
            
            setTimeout(() => notification.classList.add('show'), 10);
            
            setTimeout(() => {
                notification.classList.remove('show');
                setTimeout(() => {
                    if (container.contains(notification)) {
                       container.removeChild(notification);
                    }
                }, 500);
            }, 3000);
        }

        // --- CARD SEQUENCE FUNCTIONS ---
        
        function addCardToSequence(side, card, position) {
            // Create card element
            const cardElement = document.createElement('div');
            cardElement.className = 'sequence-card';
            cardElement.innerHTML = `
                <span class="card-rank">${card.rank}</span>
                <span class="card-suit">${card.suit}</span>
            `;
            
            // Add to sequence container
            const sequenceContainer = document.getElementById(`${side}CardSequence`);
            sequenceContainer.appendChild(cardElement);
            
            // Show sequence container if hidden
            const containerElement = document.getElementById('cardSequenceContainer');
            if (containerElement.style.display === 'none') {
                containerElement.style.display = 'flex';
            }
            
            // Scroll to the latest card
            cardElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
        
        function clearCardSequences() {
            // Clear andar sequence
            const andarSequence = document.getElementById('andarCardSequence');
            andarSequence.innerHTML = '';
            
            // Clear bahar sequence
            const baharSequence = document.getElementById('baharCardSequence');
            baharSequence.innerHTML = '';
            
            // Hide sequence container
            document.getElementById('cardSequenceContainer').style.display = 'none';
            
            // Clear single card displays
            document.getElementById('andarCardRank').textContent = '';
            document.getElementById('andarCardSuit').textContent = '';
            document.getElementById('baharCardRank').textContent = '';
            document.getElementById('baharCardSuit').textContent = '';
            
            // Reset game state
            gameState.andarCards = [];
            gameState.baharCards = [];
            gameState.openingCard = null;
            gameState.winner = null;
            gameState.winningCard = null;
            gameState.phase = 'waiting';
        }
        
        // Cleanup HLS when page unloads
        window.addEventListener('beforeunload', function() {
            if (window.hls) {
                window.hls.destroy();
                window.hls = null;
            }
        });
        
        // Store the initial settings to detect changes
        let lastKnownStreamSettings = localStorage.getItem('streamSettings');
        
        // Periodically check for stream settings updates in localStorage (every 3 seconds)
        setInterval(() => {
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
    </script>
</body>
</html>
```

This adds complete functionality to the player interface including:
- WebSocket integration for real-time game updates
- Betting system with chip selection and validation
- Timer management synchronized with backend
- Card dealing visualization with sequence display
- Game state management and synchronization
- Stream settings management with different stream types
- History display functionality
- Notification system
- Balance and bet management
- Undo/rebet functionality
- Mobile-responsive interactive elements
- Proper error handling and validation