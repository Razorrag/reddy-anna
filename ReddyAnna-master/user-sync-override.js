// User Synchronization Override Module
// This module provides WebSocket functionality for the user interface (start-game.html)

// Global variables for synchronization (avoid conflicts with main script)
if (typeof currentGameId === 'undefined') {
    window.currentGameId = 'default-game'; // Use consistent game ID
}
// Use existing websocketConnection if already defined, otherwise create it
if (typeof websocketConnection === 'undefined') {
    var websocketConnection = null;
}
// Use existing currentUserId if already defined, otherwise create it
if (typeof currentUserId === 'undefined') {
    var currentUserId = localStorage.getItem('userId') || '1308544430';
}

// Initialize WebSocket connection for user
function initializeUserWebSocket() {
    // Ensure API_BASE_URL is defined
    if (!window.API_BASE_URL) {
        window.API_BASE_URL = 'http://localhost:4000';
    }
    
    const wsUrl = `${window.API_BASE_URL.replace('http', 'ws')}`;
    console.log('User connecting to WebSocket at:', wsUrl);
    
    try {
        websocketConnection = new WebSocket(wsUrl);
        
        websocketConnection.onopen = function(event) {
            console.log('User WebSocket connection established');
            
            // Authenticate as user
            websocketConnection.send(JSON.stringify({
                type: 'authenticate',
                data: { userId: currentUserId }
            }));
            
            // Subscribe to game updates
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
                handleUserWebSocketMessage(message);
            } catch (error) {
                console.error('Error parsing WebSocket message:', error);
            }
        };
        
        websocketConnection.onclose = function(event) {
            console.log('User WebSocket connection closed:', event.code, event.reason);
            showNotification('Connection to game server lost. Reconnecting...', 'warning');
            
            // Attempt to reconnect after 3 seconds
            setTimeout(initializeUserWebSocket, 3000);
        };
        
        websocketConnection.onerror = function(error) {
            console.error('User WebSocket error:', error);
            showNotification('Connection error with game server', 'error');
        };
    } catch (error) {
        console.error('Failed to initialize user WebSocket:', error);
        showNotification('Failed to connect to game server', 'error');
    }
}

// Handle WebSocket messages for user
function handleUserWebSocketMessage(message) {
    console.log('User received WebSocket message:', message);
    
    switch (message.type) {
        case 'connection':
            console.log('User connected with client ID:', message.data.clientId);
            break;
            
        case 'authenticated':
            console.log('User authenticated as:', message.data.userId);
            break;
            
        case 'subscribed':
            console.log('User subscribed to game:', message.data.gameId);
            break;
            
        case 'game_state_update':
            handleUserGameStateUpdate(message.data.gameState);
            break;
            
        case 'timer_update':
            handleUserTimerUpdate(message.data.timer, message.data.phase);
            break;
            
        case 'card_dealt':
            handleUserCardDealt(message.data.card, message.data.side, message.data.position);
            break;
            
        case 'game_complete':
            handleUserGameComplete(message.data.winner, message.data.winningCard, message.data.totalCards);
            break;
            
        case 'bet_placed':
            handleUserBetPlaced(message.data.userId, message.data.side, message.data.amount, message.data.round);
            break;
            
        case 'betting_stats':
            handleUserBettingStats(message.data.andarBets, message.data.baharBets, message.data.totalBets);
            break;
            
        case 'phase_change':
            handleUserPhaseChange(message.data.phase, message.data.message);
            break;
            
        case 'sync_game_state':
            handleUserSyncGameState(message.data.gameState);
            break;
            
        case 'stream_status_update':
            handleUserStreamStatusUpdate(message.data);
            break;
            
        case 'heartbeat_response':
            // Heartbeat received, connection is alive
            break;
            
        default:
            console.log('Unknown message type:', message.type);
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

// Handle game state update for user
function handleUserGameStateUpdate(gameState) {
    console.log('User game state updated:', gameState);
    
    // Update opening card if provided
    if (gameState.openingCard) {
        updateOpeningCardDisplay(gameState.openingCard);
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

// Handle timer update for user
function handleUserTimerUpdate(timer, phase) {
    console.log('User timer update:', timer, phase);
    
    // Always update the timer display
    const timerElement = document.getElementById('gameTimer');
    if (timerElement) {
        timerElement.textContent = timer;
        // Also update the global gameTimer variable
        if (typeof gameTimer !== 'undefined') {
            gameTimer = timer;
        }
    }
    
    // Update betting status based on phase
    if (phase === 'betting') {
        if (typeof bettingOpen !== 'undefined' && !bettingOpen) {
            bettingOpen = true;
            showNotification('Betting is now open!', 'info');
        }
    } else if (phase === 'closed' || phase === 'dealing') {
        if (typeof bettingOpen !== 'undefined' && bettingOpen) {
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
    
    // Update round info based on phase
    const roundInfoElement = document.getElementById('roundInfo');
    if (roundInfoElement) {
        if (phase === 'betting') {
            roundInfoElement.textContent = 'Betting Phase';
        } else if (phase === 'dealing') {
            roundInfoElement.textContent = 'Dealing Phase';
        } else if (phase === 'complete') {
            roundInfoElement.textContent = 'Game Complete';
        } else if (phase === 'closed') {
            roundInfoElement.textContent = 'Betting Closed';
        }
    }
}

// Handle card dealt for user
function handleUserCardDealt(card, side, position) {
    console.log('User card dealt:', card, side, position);
    
    // Access global gameState to ensure it's in scope
    const globalGameState = window.gameState;
    if (!globalGameState) {
        console.error('Game state not available for card dealing');
        return;
    }
    
    // Update game state
    if (side === 'andar') {
        globalGameState.andarCards.push(card);
        addCardToSequence('andar', card, position);
    } else if (side === 'bahar') {
        globalGameState.baharCards.push(card);
        addCardToSequence('bahar', card, position);
    }
    
    // Check if this card matches the opening card rank
    if (globalGameState.openingCard && card.rank === globalGameState.openingCard.rank) {
        // Game should end - this is the winning card
        globalGameState.winner = side;
        globalGameState.winningCard = card;
        globalGameState.phase = 'complete';
        
        // This will be handled by the game_complete message from server
        console.log(`Winning card detected: ${card.rank}${card.suit} on ${side} side`);
    }
    
    // Show sequence container if it's hidden
    const containerElement = document.getElementById('cardSequenceContainer');
    if (containerElement.style.display === 'none') {
        containerElement.style.display = 'flex';
    }
}

// Handle game complete for user
function handleUserGameComplete(winner, winningCard, totalCards) {
    console.log('User game complete:', winner, winningCard, totalCards);
    
    // Access global gameState to ensure it's in scope
    const globalGameState = window.gameState;
    if (!globalGameState) {
        console.error('Game state not available for game completion');
        return;
    }
    
    // Update game state
    globalGameState.winner = winner;
    globalGameState.winningCard = winningCard;
    globalGameState.phase = 'complete';
    
    // Show winner notification
    showNotification(`Game complete! ${winner.toUpperCase()} wins with ${winningCard.rank}${winningCard.suit}!`, 'success');
    
    // Update recent results
    updateRecentResults(winner);
    
    // Reset for next game - use global betting state if available
    if (typeof window.bettingOpen !== 'undefined') {
        window.bettingOpen = false;
    } else {
        // Fallback to local variable if global not available
        window.bettingOpen = false;
    }
    
    // Update bet displays
    if (typeof window.updateBetDisplay === 'function') {
        window.updateBetDisplay();
    }
    
    // Clear card sequences after a delay
    setTimeout(() => {
        if (typeof window.clearCardSequences === 'function') {
            window.clearCardSequences();
        }
    }, 5000);
}

// Handle bet placed for user
function handleUserBetPlaced(userId, side, amount, round) {
    console.log('User bet placed:', userId, side, amount, round);
    
    // Only show notification for other users' bets
    if (userId !== currentUserId) {
        showNotification(`Player bet ₹${amount} on ${side}`, 'info');
    }
}

// Handle betting stats for user
function handleUserBettingStats(andarBets, baharBets, totalBets) {
    console.log('User betting stats:', andarBets, baharBets, totalBets);
    
    // Update bet displays with current totals
    document.getElementById('andarBet').textContent = `₹ ${andarBets.toLocaleString('en-IN')}`;
    document.getElementById('baharBet').textContent = `₹ ${baharBets.toLocaleString('en-IN')}`;
}

// Handle phase change for user
function handleUserPhaseChange(phase, message) {
    console.log('User phase change:', phase, message);
    
    // Update game phase
    updateGamePhase(phase);
    
    // Show notification about phase change
    if (message) {
        showNotification(message, 'info');
    }
}

// Handle game state synchronization for user
function handleUserSyncGameState(receivedGameState) {
    console.log('User syncing game state:', receivedGameState);

    if (receivedGameState) {
        // Update opening card display
        if (receivedGameState.openingCard) {
            updateOpeningCardDisplay(receivedGameState.openingCard);
        }

        // Update timer display
        if (receivedGameState.currentTimer !== undefined) {
            updateTimerDisplay(receivedGameState.currentTimer);
        }

        // Update phase
        if (receivedGameState.phase) {
            updateGamePhase(receivedGameState.phase);
        }

        // Update cards if any have been dealt
        if (receivedGameState.andarCards && receivedGameState.andarCards.length > 0) {
            // Clear existing sequence first
            document.getElementById('andarCardSequence').innerHTML = '';
            
            receivedGameState.andarCards.forEach((card, index) => {
                addCardToSequence('andar', card, index);
            });
        }

        if (receivedGameState.baharCards && receivedGameState.baharCards.length > 0) {
            // Clear existing sequence first
            document.getElementById('baharCardSequence').innerHTML = '';
            
            receivedGameState.baharCards.forEach((card, index) => {
                addCardToSequence('bahar', card, index);
            });
        }

        // Update betting stats
        if (receivedGameState.bettingStats) {
            updateBettingStatsDisplay(receivedGameState.bettingStats);
        }
        
        // Show sequence container if there are cards
        if ((receivedGameState.andarCards && receivedGameState.andarCards.length > 0) ||
            (receivedGameState.baharCards && receivedGameState.baharCards.length > 0)) {
            document.getElementById('cardSequenceContainer').style.display = 'flex';
        }
        
        // Also update the global gameState object if it exists
        const globalGameState = window.gameState;
        if (globalGameState) {
            // Update all received game state properties
            Object.assign(globalGameState, receivedGameState);
        }
    }
}

// Handle stream status update for user
function handleUserStreamStatusUpdate(data) {
    console.log('User stream status update:', data);
    
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

// Update opening card display
function updateOpeningCardDisplay(openingCard) {
    const openingCardElement = document.getElementById('openingCard');
    if (openingCardElement && openingCard) {
        document.getElementById('openingCardRank').textContent = openingCard.rank;
        document.getElementById('openingCardSuit').textContent = openingCard.suit;
        console.log('Opening card updated in UI:', openingCard.rank + openingCard.suit);
        
        // Update game state
        gameState.openingCard = openingCard;
        showNotification(`Opening card: ${openingCard.rank}${openingCard.suit}`, 'info');
    }
}

// Update timer display
function updateTimerDisplay(timer) {
    const timerElement = document.getElementById('gameTimer');
    if (timerElement) {
        timerElement.textContent = timer;
        // Update global gameTimer variable if it exists
        if (typeof gameTimer !== 'undefined') {
            gameTimer = timer;
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
}

// Update game phase
function updateGamePhase(phase) {
    // Access global gameState to ensure it's in scope
    const globalGameState = window.gameState;
    if (globalGameState) {
        globalGameState.phase = phase;
    }
    
    const roundInfo = document.getElementById('roundInfo');
    if (roundInfo) {
        if (phase === 'betting') {
            roundInfo.textContent = 'Betting Phase';
        } else if (phase === 'dealing') {
            roundInfo.textContent = 'Dealing Phase';
        } else if (phase === 'complete') {
            roundInfo.textContent = 'Game Complete';
        }
    }
    
    // Update bettingOpen state - try to update global or local variable
    if (typeof window.bettingOpen !== 'undefined') {
        window.bettingOpen = (phase !== 'dealing' && phase !== 'complete');
    }
}

// Update betting stats display
function updateBettingStatsDisplay(bettingStats) {
    if (bettingStats) {
        document.getElementById('andarBet').textContent = `₹ ${bettingStats.andarBets.toLocaleString('en-IN')}`;
        document.getElementById('baharBet').textContent = `₹ ${bettingStats.baharBets.toLocaleString('en-IN')}`;
    }
}

// Show game complete notification
function showGameCompleteNotification(winner, winningCard, totalCards) {
    showNotification(`Game complete! ${winner.toUpperCase()} wins with ${winningCard.rank}${winningCard.suit}!`, 'success');
}

// Override the placeBet function to use WebSocket
const originalPlaceBet = window.placeBet;
window.placeBet = async function(zoneId) {
    // Call the original function first
    await originalPlaceBet.call(this, zoneId);
    
    // The original function already handles the backend API call
    // No additional WebSocket handling needed as the server will broadcast
};

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => {
        initializeUserWebSocket();
    }, 2000);
});

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        initializeUserWebSocket,
        requestGameStateSync,
        currentGameId
    };
}