// Admin Game Synchronization Module
// This module handles real-time synchronization between admin and user interfaces

// Global variables
let currentGameId = 'default-game'; // Use consistent game ID
let websocketConnection = null;
let gameState = {
    phase: 'waiting',
    openingCard: null,
    andarCards: [],
    baharCards: [],
    currentTimer: 30,
    winner: null,
    winningCard: null
};

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
        gameState = { ...gameState, ...gameStateData };
        
        // Update UI elements if they exist
        updateAdminUI();
    }
}

// Update admin UI elements
function updateAdminUI() {
    // Update timer display
    const timerDisplay = document.getElementById('adminTimerDisplay');
    if (timerDisplay) {
        timerDisplay.textContent = gameState.currentTimer || 30;
    }
    
    // Update phase display
    const phaseDisplay = document.getElementById('adminPhaseDisplay');
    if (phaseDisplay) {
        phaseDisplay.textContent = gameState.phase || 'waiting';
    }
    
    // Update opening card display
    if (gameState.openingCard) {
        const openingCardDisplay = document.getElementById('adminOpeningCard');
        if (openingCardDisplay) {
            openingCardDisplay.textContent = `${gameState.openingCard.rank}${gameState.openingCard.suit}`;
        }
    }
}

// Update timer in backend with proper game_id
async function updateTimerInBackend(timer) {
    try {
        const response = await fetch(`${window.API_BASE_URL}/api/game/update-timer`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                time: timer,
                game_id: currentGameId,  // ADD THIS!
                phase: gameState.phase
            })
        });
        
        const result = await response.json();
        if (result.success) {
            console.log('Timer updated successfully:', result);
        } else {
            console.error('Failed to update timer:', result.message);
        }
    } catch (error) {
        console.error('Error updating timer in backend:', error);
    }
}

// Update betting amounts in backend with proper game_id
async function updateBettingAmountsInBackend() {
    try {
        const round = gameState.phase;
        const andarTotal = gameState.roundBets?.[round]?.andar || 0;
        const baharTotal = gameState.roundBets?.[round]?.bahar || 0;

        const response = await fetch(`${window.API_BASE_URL}/api/game/submit-bets`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                round: round,
                andarTotal: andarTotal,
                baharTotal: baharTotal,
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

// Deal a card in the game
async function dealCardInBackend(card, side, position) {
    try {
        const response = await fetch(`${window.API_BASE_URL}/api/game/deal-card`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                card: card,
                side: side,
                position: position,
                game_id: currentGameId
            })
        });
        
        const result = await response.json();
        if (result.success) {
            console.log('Card dealt successfully:', result);
            
            // Update local game state
            if (side === 'andar') {
                gameState.andarCards.push({ rank: card[0], suit: card[1] });
            } else if (side === 'bahar') {
                gameState.baharCards.push({ rank: card[0], suit: card[1] });
            }
            
            // Check if this was a winning card
            if (result.data.isWinningCard) {
                gameState.winner = side;
                gameState.winningCard = { rank: card[0], suit: card[1] };
                gameState.phase = 'completed';
            }
        } else {
            console.error('Failed to deal card:', result.message);
        }
    } catch (error) {
        console.error('Error dealing card in backend:', error);
    }
}

// Set opening card in backend
async function setOpeningCardInBackend(card) {
    try {
        const response = await fetch(`${window.API_BASE_URL}/api/game/set-opening-card`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                card: card,
                game_id: currentGameId
            })
        });
        
        const result = await response.json();
        if (result.success) {
            console.log('Opening card set successfully:', result);
            gameState.openingCard = { rank: card[0], suit: card[1] };
        } else {
            console.error('Failed to set opening card:', result.message);
        }
    } catch (error) {
        console.error('Error setting opening card in backend:', error);
    }
}

// Change game phase
async function changeGamePhase(phase, message) {
    try {
        const response = await fetch(`${window.API_BASE_URL}/api/game/change-phase`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                phase: phase,
                game_id: currentGameId,
                message: message
            })
        });
        
        const result = await response.json();
        if (result.success) {
            console.log('Phase changed successfully:', result);
            gameState.phase = phase;
        } else {
            console.error('Failed to change phase:', result.message);
        }
    } catch (error) {
        console.error('Error changing phase:', error);
    }
}

// Initialize admin game sync when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Initialize WebSocket connection
    initializeAdminWebSocket();
    
    // Expose functions to global scope for use in HTML
    window.updateTimerInBackend = updateTimerInBackend;
    window.updateBettingAmountsInBackend = updateBettingAmountsInBackend;
    window.dealCardInBackend = dealCardInBackend;
    window.setOpeningCardInBackend = setOpeningCardInBackend;
    window.changeGamePhase = changeGamePhase;
    window.currentGameId = currentGameId;
});

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        initializeAdminWebSocket,
        updateTimerInBackend,
        updateBettingAmountsInBackend,
        dealCardInBackend,
        setOpeningCardInBackend,
        changeGamePhase,
        currentGameId
    };
}