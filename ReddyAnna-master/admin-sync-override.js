// Admin Synchronization Override Module
// This module overrides the existing functions in game-admin.html to add real-time synchronization

// Global variables for synchronization
let currentGameId = 'default-game'; // Use consistent game ID
let websocketConnection = null;

// Initialize WebSocket connection for admin
function initializeAdminWebSocket() {
    // Ensure API_BASE_URL is defined
    if (!window.API_BASE_URL) {
        window.API_BASE_URL = 'http://localhost:4000';
    }
    
    const wsUrl = `${window.API_BASE_URL.replace('http', 'ws')}`;
    console.log('Admin connecting to WebSocket at:', wsUrl);
    
    try {
        websocketConnection = new WebSocket(wsUrl);
        
        websocketConnection.onopen = function(event) {
            console.log('Admin WebSocket connection established');
            
            // Authenticate as admin
            websocketConnection.send(JSON.stringify({
                type: 'authenticate',
                data: { userId: 'admin', isAdmin: true }
            }));
            
            // Subscribe to game updates
            websocketConnection.send(JSON.stringify({
                type: 'subscribe_game',
                data: { gameId: currentGameId }
            }));
            
            // Request current game state
            setTimeout(() => {
                requestGameStateSync();
            }, 1000);
        };
        
        websocketConnection.onmessage = function(event) {
            try {
                const message = JSON.parse(event.data);
                handleAdminWebSocketMessage(message);
            } catch (error) {
                console.error('Error parsing WebSocket message:', error);
            }
        };
        
        websocketConnection.onclose = function(event) {
            console.log('Admin WebSocket connection closed:', event.code, event.reason);
            
            // Attempt to reconnect after 3 seconds
            setTimeout(initializeAdminWebSocket, 3000);
        };
        
        websocketConnection.onerror = function(error) {
            console.error('Admin WebSocket error:', error);
        };
    } catch (error) {
        console.error('Failed to initialize admin WebSocket:', error);
    }
}

// Handle WebSocket messages for admin
function handleAdminWebSocketMessage(message) {
    console.log('Admin received WebSocket message:', message);
    
    switch (message.type) {
        case 'connection':
            console.log('Admin connected with client ID:', message.data.clientId);
            break;
            
        case 'authenticated':
            console.log('Admin authenticated');
            break;
            
        case 'subscribed':
            console.log('Admin subscribed to game:', message.data.gameId);
            break;
            
        case 'sync_game_state':
            handleAdminSyncGameState(message.data.gameState);
            break;
            
        case 'game_state_update':
            handleAdminGameStateUpdate(message.data.gameState);
            break;
            
        case 'timer_update':
            handleAdminTimerUpdate(message.data.timer, message.data.phase);
            break;
            
        case 'card_dealt':
            handleAdminCardDealt(message.data.card, message.data.side, message.data.position);
            break;
            
        case 'game_complete':
            handleAdminGameComplete(message.data.winner, message.data.winningCard, message.data.totalCards);
            break;
            
        case 'bet_placed':
            handleAdminBetPlaced(message.data.userId, message.data.side, message.data.amount, message.data.round);
            break;
            
        case 'betting_stats':
            handleAdminBettingStats(message.data.andarBets, message.data.baharBets, message.data.totalBets);
            break;
            
        case 'phase_change':
            handleAdminPhaseChange(message.data.phase, message.data.message);
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

// Handle game state synchronization for admin
function handleAdminSyncGameState(gameStateData) {
    console.log('Admin syncing game state:', gameStateData);
    
    if (gameStateData) {
        // Update admin UI if needed
        updateAdminUI();
    }
}

// Handle game state update for admin
function handleAdminGameStateUpdate(receivedGameState) {
    console.log('Admin game state updated:', receivedGameState);
    
    // Update opening card if provided
    if (receivedGameState.openingCard) {
        updateAdminOpeningCard(receivedGameState.openingCard);
    }
    
    // Update game phase if provided
    if (receivedGameState.phase) {
        updateAdminGamePhase(receivedGameState.phase);
    }
}

// Handle timer update for admin
function handleAdminTimerUpdate(timer, phase) {
    console.log('Admin timer update:', timer, phase);
    
    // Try to access global gameState to ensure it's in scope
    let globalGameState = window.gameState;
    
    // If gameState is not directly available, try to get it from the main window context
    if (!globalGameState && typeof gameState !== 'undefined') {
        globalGameState = gameState;
    }
    
    // Only update if timer is different to avoid conflicts
    if (globalGameState && globalGameState.countdownTimer !== timer) {
        // Update local timer
        globalGameState.countdownTimer = timer;
    } else if (!globalGameState) {
        // If gameState is still not available, try to update from DOM state
        console.warn('Global game state not available, updating timer display only');
    }
    
    // Update timer display regardless
    const timerDisplay = document.getElementById('andarBaharCountdown');
    if (timerDisplay) {
        timerDisplay.textContent = timer;
    }
}

// Handle card dealt for admin
function handleAdminCardDealt(card, side, position) {
    console.log('Admin card dealt:', card, side, position);
    
    // Access global gameState to ensure it's in scope
    const globalGameState = window.gameState;
    if (!globalGameState) {
        console.error('Game state not available for card dealing');
        return;
    }
    
    // Update game state
    if (side === 'andar') {
        globalGameState.andarCards.push(card);
    } else if (side === 'bahar') {
        globalGameState.baharCards.push(card);
    }
    
    // Update UI if needed
    updateAdminUI();
}

// Handle game complete for admin
function handleAdminGameComplete(winner, winningCard, totalCards) {
    console.log('Admin game complete:', winner, winningCard, totalCards);
    
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
    
    // Show notification
    showNotification(`Game complete! ${winner.toUpperCase()} wins with ${winningCard.rank}${winningCard.suit}!`, 'success');
}

// Handle bet placed for admin
function handleAdminBetPlaced(userId, side, amount, round) {
    console.log('Admin bet placed:', userId, side, amount, round);
    
    // Show notification for user bets
    showNotification(`User bet ₹${amount} on ${side}`, 'info');
}

// Handle betting stats for admin
function handleAdminBettingStats(andarBets, baharBets, totalBets) {
    console.log('Admin betting stats:', andarBets, baharBets, totalBets);
    
    // Update betting stats display if it exists
    const andarBetElement = document.getElementById('andarTotalBet');
    const baharBetElement = document.getElementById('baharTotalBet');
    
    if (andarBetElement) {
        andarBetElement.textContent = `₹ ${andarBets.toLocaleString('en-IN')}`;
    }
    
    if (baharBetElement) {
        baharBetElement.textContent = `₹ ${baharBets.toLocaleString('en-IN')}`;
    }
}

// Handle phase change for admin
function handleAdminPhaseChange(phase, message) {
    console.log('Admin phase change:', phase, message);
    
    // Update game phase
    updateAdminGamePhase(phase);
    
    // Show notification about phase change
    if (message) {
        showNotification(message, 'info');
    }
}

// Update opening card for admin
function updateAdminOpeningCard(card) {
    if (card && card.rank && card.suit) {
        gameState.openingCard = card;
        const displayElement = document.getElementById('displayOpeningCard');
        if (displayElement) {
            displayElement.textContent = `${card.rank}${card.suit}`;
        }
    }
}

// Update game phase for admin
function updateAdminGamePhase(phase) {
    gameState.phase = phase;
    // Update any UI elements that show the phase
}

// Update admin UI elements
function updateAdminUI() {
    // Access global gameState to ensure it's in scope
    const globalGameState = window.gameState;
    
    // Update timer display if it exists
    const timerDisplay = document.getElementById('andarBaharCountdown');
    if (timerDisplay && globalGameState && globalGameState.countdownTimer !== undefined) {
        timerDisplay.textContent = globalGameState.countdownTimer;
    }
}

// Override the updateTimerInBackend function to include game_id and broadcast via WebSocket
async function updateTimerInBackend(timer, phase) {
    try {
        // Access the global gameState to ensure we have the current phase
        const globalGameState = window.gameState;
        const currentPhase = phase || (globalGameState ? globalGameState.phase : 'betting');
        
        const response = await fetch(`${window.API_BASE_URL}/api/game/update-timer`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                timer: timer,
                game_id: currentGameId,
                phase: currentPhase
            })
        });
        
        const result = await response.json();
        if (result.success) {
            console.log('Timer updated successfully:', result);
            
            // Broadcast timer update directly via WebSocket for immediate sync
            if (websocketConnection && websocketConnection.readyState === WebSocket.OPEN) {
                const timerMessage = {
                    type: 'timer_update',
                    data: {
                        timer: timer,
                        phase: currentPhase
                    }
                };
                websocketConnection.send(JSON.stringify(timerMessage));
                console.log('Timer update broadcast via WebSocket:', timerMessage);
            }
        } else {
            console.error('Failed to update timer:', result.message);
        }
    } catch (error) {
        console.error('Error updating timer in backend:', error);
    }
}

// Override the updateBettingAmountsInBackend function to include game_id
async function updateBettingAmountsInBackend() {
    try {
        // Access gameState from window to ensure it's in scope
        const globalGameState = window.gameState;
        if (!globalGameState) {
            console.error('Game state not available for betting updates');
            return;
        }
        
        const round = globalGameState.phase;
        const andarTotal = globalGameState.roundBets[round]?.andar || 0;
        const baharTotal = globalGameState.roundBets[round]?.bahar || 0;

        const response = await fetch(`${window.API_BASE_URL}/api/game/submit-bets`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                andarBets: andarTotal,
                baharBets: baharTotal,
                game_id: currentGameId  // ADD THIS!
            })
        });
        
        const result = await response.json();
        if (result.success) {
            console.log('Betting amounts updated successfully:', result);
        } else {
            console.error('Failed to update betting amounts:', result.message);
        }
    } catch (error) {
        console.error('Error updating betting amounts in backend:', error);
    }
}

// Override the selectAndarBaharCard function to broadcast card deals
const originalSelectAndarBaharCard = window.selectAndarBaharCard;
window.selectAndarBaharCard = async function(card, index) {
    // Call the original function first to update the gameState
    const result = await originalSelectAndarBaharCard.call(this, card, index);
    
    // Count the number of cards in each side by checking the UI or by accessing the gameState if available
    // Since gameState may not be available in this scope, we need to count differently
    // For now, let's assume we can access the global gameState variable from window
    const globalGameState = window.gameState || this.gameState;
    let position;
    let side;
    
    if (globalGameState) {
        // Determine side and position based on total cards dealt
        const totalCardsSelected = globalGameState.andarCards.length + globalGameState.baharCards.length;
        position = totalCardsSelected;
        const isOddSelection = position % 2 === 1;
        side = isOddSelection ? 'bahar' : 'andar';
    } else {
        // Fallback: Calculate position by counting elements in the UI
        const andarCardCount = document.querySelectorAll('#andarCardSequence .sequence-card').length;
        const baharCardCount = document.querySelectorAll('#baharCardSequence .sequence-card').length;
        const totalCardsDealt = andarCardCount + baharCardCount + 1; // +1 for this card
        position = totalCardsDealt;
        const isOddSelection = totalCardsDealt % 2 === 1;
        side = isOddSelection ? 'bahar' : 'andar';
    }
    
    // Broadcast card deal directly via WebSocket for immediate sync
    if (websocketConnection && websocketConnection.readyState === WebSocket.OPEN) {
        const cardMessage = {
            type: 'card_dealt',
            data: {
                card: {
                    rank: card.display[0],
                    suit: card.display[1]
                },
                side: side,
                position: position
            }
        };
        websocketConnection.send(JSON.stringify(cardMessage));
        console.log('Card deal broadcast via WebSocket:', cardMessage);
    }
    
    // Also store in backend for persistence
    try {
        const response = await fetch(`${window.API_BASE_URL}/api/game/deal-card`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                card: card.display,
                side: side,
                position: position,
                game_id: currentGameId
            })
        });
        
        const dealResult = await response.json();
        if (dealResult.success) {
            console.log('Card dealt successfully to backend:', dealResult);
        } else {
            console.error('Failed to deal card in backend:', dealResult.message);
        }
    } catch (error) {
        console.error('Error dealing card in backend:', error);
    }
    
    return result;
};

// Override the start1stRound function to set opening card and start timer
const originalStart1stRound = window.start1stRound;
window.start1stRound = async function() {
    // Call the original function first
    await originalStart1stRound.call(this);
    
    // Get the opening card from the UI since gameState may not be accessible
    const openingCardDisplay = document.getElementById('displayOpeningCard').textContent;
    if (openingCardDisplay && openingCardDisplay !== 'None') {
        // Broadcast game state update to all users
        if (websocketConnection && websocketConnection.readyState === WebSocket.OPEN) {
            const gameStateMessage = {
                type: 'game_state_update',
                data: {
                    gameState: {
                        openingCard: {
                            rank: openingCardDisplay[0],
                            suit: openingCardDisplay[1]
                        },
                        phase: 'betting'
                    }
                }
            };
            websocketConnection.send(JSON.stringify(gameStateMessage));
            console.log('Game state broadcast via WebSocket:', gameStateMessage);
        }
    }
};

// Override the resetGame function to reset with game_id
const originalResetGame = window.resetGame;
window.resetGame = async function() {
    // Call the original function first
    await originalResetGame.call(this);
    
    // Reset game in backend
    try {
        await fetch(`${window.API_BASE_URL}/api/game/reset-game`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        console.log('Game reset in backend');
    } catch (error) {
        console.error('Error resetting game in backend:', error);
    }
};

// Override the saveStreamSettings function to broadcast via WebSocket
const originalSaveStreamSettings = window.saveStreamSettings;
window.saveStreamSettings = async function() {
    // Get the form values
    const streamType = document.getElementById('streamType').value;
    let streamUrl = '';
    let rtmpUrl = '';
    let rtmpStreamKey = '';
    let fullStreamUrl = '';
    
    if (streamType === 'rtmp') {
        rtmpUrl = document.getElementById('rtmpUrl').value;
        rtmpStreamKey = document.getElementById('rtmpStreamKey').value;
        // Combine RTMP URL and stream key
        fullStreamUrl = rtmpUrl + '/' + rtmpStreamKey;
        streamUrl = fullStreamUrl;
    } else {
        streamUrl = document.getElementById('streamUrl').value;
    }
    
    const streamTitle = document.getElementById('streamTitle').value;
    const streamStatus = document.getElementById('streamStatus').value;
    const streamDescription = document.getElementById('streamDescription').value;

    // Basic validation
    if ((!streamUrl || !streamTitle) && streamType !== 'rtmp') {
        showNotification('Please fill in stream URL and title!', 'error');
        return;
    }

    // Create settings object
    const settings = {
        stream_type: {value: streamType},
        stream_url: {value: streamUrl},
        stream_status: {value: streamStatus},
        stream_title: {value: streamTitle},
        stream_description: {value: streamDescription},
        rtmp_url: {value: rtmpUrl},
        rtmp_stream_key: {value: rtmpStreamKey}
    };

    // Save to localStorage as fallback
    localStorage.setItem('streamSettings', JSON.stringify(settings));
    
    // Broadcast stream settings update via WebSocket to all connected clients
    if (websocketConnection && websocketConnection.readyState === WebSocket.OPEN) {
        const streamUpdateMessage = {
            type: 'stream_status_update',
            data: {
                streamType: streamType,
                streamUrl: streamUrl,
                streamStatus: streamStatus,
                streamTitle: streamTitle,
                rtmpUrl: rtmpUrl,
                rtmpStreamKey: rtmpStreamKey
            }
        };
        websocketConnection.send(JSON.stringify(streamUpdateMessage));
        console.log('Stream settings broadcast via WebSocket:', streamUpdateMessage);
    } else {
        console.log('WebSocket not available, stream settings will update when page refreshes');
    }
    
    // Call the original save function for any additional processing
    if (originalSaveStreamSettings) {
        await originalSaveStreamSettings.call(this);
    } else {
        // Fallback: try to save to backend, but don't fail if API is not available
        fetch(`${window.API_BASE_URL}/api/game/update-stream-settings`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                stream_type: streamType,
                streamUrl: streamUrl, // Full combined URL for RTMP
                stream_url: streamUrl, // For compatibility
                rtmp_url: rtmpUrl,
                rtmp_stream_key: rtmpStreamKey,
                streamTitle: streamTitle,
                streamStatus: streamStatus,
                streamDescription: streamDescription,
                game_id: 'default-game'
            })
        })
        .then(response => {
            if (!response.ok) {
                // If response is not OK, it's likely a 404 or other error
                // Don't try to parse as JSON, just use localStorage
                console.log('Backend API not available, using localStorage');
                showNotification('Stream settings saved locally (backend unavailable)', 'success');
                closeSettingsModal();
                return; // Exit early, don't try to parse response
            }
            return response.json();
        })
        .then(data => {
            if (data && data.success) {
                showNotification('Stream settings saved successfully!', 'success');
                closeSettingsModal();
            } else if (data) {
                // If backend fails but localStorage worked, still show success
                console.log('Backend save failed, using localStorage fallback');
                showNotification('Stream settings saved (using fallback)!', 'success');
                closeSettingsModal();
            } else {
                // Response was OK but data is null (likely because we returned early for error response)
                showNotification('Stream settings saved locally (backend unavailable)', 'success');
                closeSettingsModal();
            }
        })
        .catch(error => {
            console.error('Error saving stream settings to backend:', error);
            // If backend fails, we'll use localStorage which was already saved
            showNotification('Stream settings saved locally (backend unavailable)', 'success');
            closeSettingsModal();
        });
    }
};

// Initialize admin game sync when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Wait a bit for the original game to initialize
    setTimeout(() => {
        // Initialize WebSocket connection
        initializeAdminWebSocket();
        
        // Add event listener for stream type change if the element exists
        const streamTypeElement = document.getElementById('streamType');
        if (streamTypeElement) {
            streamTypeElement.addEventListener('change', toggleStreamFields);
        }
        
        console.log('Admin synchronization module loaded');
    }, 2000);
});

// Broadcast complete game state to all users
function broadcastGameState() {
    if (websocketConnection && websocketConnection.readyState === WebSocket.OPEN) {
        // Access gameState from the window object to ensure it's in scope
        const globalGameState = window.gameState;
        if (!globalGameState) {
            console.error('Game state not available for broadcast');
            return;
        }
        
        const gameStateMessage = {
            type: 'game_state_update',
            data: {
                gameState: {
                    phase: globalGameState.phase,
                    openingCard: globalGameState.selectedOpeningCard ? {
                        rank: globalGameState.selectedOpeningCard.display[0],
                        suit: globalGameState.selectedOpeningCard.display[1]
                    } : null,
                    andarCards: globalGameState.andarCards.map(card => ({
                        rank: card.display[0],
                        suit: card.display[1]
                    })),
                    baharCards: globalGameState.baharCards.map(card => ({
                        rank: card.display[0],
                        suit: card.display[1]
                    })),
                    currentTimer: globalGameState.countdownTimer,
                    winner: globalGameState.winner,
                    winningCard: globalGameState.winningCard ? {
                        rank: globalGameState.winningCard.display[0],
                        suit: globalGameState.winningCard.display[1]
                    } : null
                }
            }
        };
        websocketConnection.send(JSON.stringify(gameStateMessage));
        console.log('Complete game state broadcast via WebSocket:', gameStateMessage);
    }
}

// Broadcast phase change to all users
function broadcastPhaseChange(phase, message) {
    if (websocketConnection && websocketConnection.readyState === WebSocket.OPEN) {
        const phaseMessage = {
            type: 'phase_change',
            data: {
                phase: phase,
                message: message
            }
        };
        websocketConnection.send(JSON.stringify(phaseMessage));
        console.log('Phase change broadcast via WebSocket:', phaseMessage);
    }
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        initializeAdminWebSocket,
        updateTimerInBackend,
        updateBettingAmountsInBackend,
        broadcastGameState,
        broadcastPhaseChange,
        currentGameId
    };
}