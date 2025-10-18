# Functional Changes Required to Match Legacy HTML

## Overview
This document outlines all functional changes needed to make the React component behave exactly like the legacy HTML implementation.

## 1. DOM Manipulation Approach

### Legacy HTML Approach
The legacy HTML uses direct DOM manipulation for many features:
- Cards are added to sequences using direct DOM methods
- Element properties are changed directly with `element.textContent` and `element.style`
- Event listeners are attached using traditional JavaScript methods

### Current React Approach
The current React implementation uses React state and refs to update the DOM.

### Required Changes
Maintain React state for data management but also implement direct DOM manipulation for elements that need exact legacy behavior:

```javascript
// Add card to sequence using direct DOM manipulation
const addCardToSequence = (side: 'andar' | 'bahar', card: DealtCard) => {
  if (!cardSequenceContainerRef.current) return;
  
  // Create card element using DOM API (like legacy)
  const cardElement = document.createElement('div');
  cardElement.className = 'sequence-card';
  cardElement.innerHTML = `
    <span class="card-rank">${card.card?.slice(0, -1)}</span>
    <span class="card-suit">${card.card?.slice(-1)}</span>
  `;
  
  // Add to sequence container using DOM API (like legacy)
  const sequenceContainer = side === 'andar' ? andarCardSequenceRef.current : baharCardSequenceRef.current;
  if (sequenceContainer) {
    sequenceContainer.appendChild(cardElement);
    
    if (card.isWinningCard) {
      cardElement.classList.add('winning');
    }
  }
  
  if (cardSequenceContainerRef.current.style.display === 'none') {
    cardSequenceContainerRef.current.style.display = 'flex';
  }
  
  cardElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
};
```

## 2. WebSocket Communication Pattern

### Legacy HTML WebSocket Implementation
The legacy HTML has a specific WebSocket communication pattern:
- Authentication with user ID and role
- Subscription to game
- Request for current game state synchronization
- Specific message handling for each game event
- Direct DOM updates on WebSocket messages

### Required Changes
Ensure React WebSocket implementation matches legacy behavior exactly:

```javascript
// WebSocket connection setup matching legacy approach
useEffect(() => {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const wsUrl = `${protocol}//${window.location.host}/ws`;
  console.log('Connecting to WebSocket:', wsUrl);
  const socket = new WebSocket(wsUrl);

  socket.onopen = () => {
    console.log('WebSocket connection established');
    
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
    
    setConnectionStatus('connected');
  };

  socket.onmessage = (event) => {
    const message = JSON.parse(event.data);
    console.log('Received WebSocket message:', message);

    // Handle messages exactly like legacy HTML
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

      // Additional cases match legacy implementation...
    }
  };

  // Additional handlers match legacy...

  return () => {
    socket.close();
  };
}, [userId]);
```

## 3. Game State Management

### Legacy HTML State Handling
The legacy HTML maintains game state in global variables and updates the DOM directly:
- `gameState` object maintains current game information
- Direct updates to elements using `document.getElementById()`
- Manual DOM manipulation for all game events

### Required Changes
Keep React state as the source of truth but ensure DOM updates match legacy behavior:

```javascript
// Update DOM elements after state changes (for legacy compatibility)
useEffect(() => {
  // Update bet displays like legacy
  if (andarBetRef.current) {
    andarBetRef.current.textContent = `₹ ${gameState.andarBets.toLocaleString('en-IN')}`;
  }
  if (baharBetRef.current) {
    baharBetRef.current.textContent = `₹ ${gameState.baharBets.toLocaleString('en-IN')}`;
  }
  
  // Update timer like legacy
  if (gameTimerRef.current) {
    gameTimerRef.current.textContent = gameState.currentTimer.toString();
  }
  
  // Update round info based on phase and timer like legacy
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
  
  // Update timer visibility like legacy
  if (circularTimerRef.current) {
    if (gameState.currentTimer <= 0) {
      circularTimerRef.current.classList.add('timer-hidden');
    } else {
      circularTimerRef.current.classList.remove('timer-hidden');
    }
  }
}, [gameState.andarBets, gameState.baharBets, gameState.currentTimer, gameState.phase, gameState.round]);
```

## 4. Betting Functionality

### Legacy HTML Betting Flow
The legacy HTML follows a specific betting flow:
- Validate bet amount against user balance
- Validate against min/max bet amounts from game settings
- Send bet to backend API
- Update local UI temporarily
- Wait for WebSocket confirmation to update actual totals

### Required Changes
Implement the exact same betting flow:

```javascript
async function placeBet(zoneId: string) {
  // Match legacy validation
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
        gameId: gameState.gameId,
        round: round,
        side: side,
        amount: selectedChip
      })
    });
    
    const result = await response.json();
    
    if (result.success) {
      // Save current state for undo like legacy
      betHistory.push({ andarBet: gameState.andarBets, baharBet: gameState.baharBets, balance: playerBalance });
      
      // Update local balance like legacy
      setBalance(prev => prev - selectedChip);
      
      // Show notification like legacy
      showNotification(`Bet of ₹${selectedChip} placed on ${side.toUpperCase()}!`, 'success');
    } else {
      showNotification(result.message || 'Failed to place bet', 'error');
    }
  } catch (error) {
    console.error('Error placing bet:', error);
    showNotification('Failed to place bet. Please try again.', 'error');
  }
}
```

## 5. Card Display and Sequence Management

### Legacy HTML Card Handling
The legacy HTML has specific card display behavior:
- Cards are displayed in sequence with specific styling
- Winning cards are highlighted
- Card sequences scroll to show new cards
- Opening card is displayed separately

### Required Changes
Implement exact card handling like legacy:

```javascript
// Update opening card display like legacy
useEffect(() => {
  if (openingCardRankRef.current && openingCardSuitRef.current && gameState.openingCard) {
    const [rank, suit] = [gameState.openingCard.slice(0, -1), gameState.openingCard.slice(-1)];
    openingCardRankRef.current.textContent = rank;
    openingCardSuitRef.current.textContent = suit;
  }
}, [gameState.openingCard]);

// Add card to sequence like legacy
const addCardToSequence = (side: 'andar' | 'bahar', card: DealtCard) => {
  if (!cardSequenceContainerRef.current) return;
  
  // Create card element exactly like legacy
  const cardElement = document.createElement('div');
  cardElement.className = 'sequence-card';
  cardElement.innerHTML = `
    <span class="card-rank">${card.card?.slice(0, -1)}</span>
    <span class="card-suit">${card.card?.slice(-1)}</span>
  `;
  
  // Add to appropriate sequence container
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
```

## 6. History and Statistics Management

### Legacy HTML History System
The legacy HTML maintains game history with:
- Recent results display at bottom
- Full history modal with statistics
- Rolling display of recent results

### Required Changes
Implement history exactly like legacy:

```javascript
// Update recent results like legacy
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

// Generate history data like legacy
const generateHistoryData = () => {
  const results: GameHistoryItem[] = [];
  let roundNum = 1;
  
  // Generate 50 recent game results like legacy
  for (let i = 1; i <= 50; i++) {
    const isAndar = Math.random() > 0.5; // 50% chance like legacy
    results.push({
      id: `round-${i}`,
      round: roundNum++,
      winner: isAndar ? 'andar' : 'bahar',
      timestamp: new Date(Date.now() - (i * 60000)) // Simulate past games like legacy
    });
  }
  
  setGameHistory(results.slice(-50)); // Keep last 50 games like legacy
};
```

## 7. Notification System

### Legacy HTML Notifications
The legacy HTML uses a specific notification system:
- Notifications appear in top-right container
- Different styles for success, error, info, warning
- Auto-dismiss after 3 seconds
- CSS animations for appearance

### Required Changes
Implement exact same notification system:

```javascript
// Show notification like legacy
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
```

## 8. Chip Selection and Display

### Legacy HTML Chip System
The legacy HTML has specific chip selection behavior:
- Chips displayed in horizontal scrolling panel
- Active chip highlighted
- Panel shows/hides with toggle
- Chip values displayed with formatting

### Required Changes
Implement exact same chip system:

```javascript
// Chip selection logic like legacy
function setupChipSelection() {
  document.querySelectorAll('.chip-btn').forEach(chip => {
    chip.addEventListener('click', () => {
      // Remove active class from all chips like legacy
      document.querySelectorAll('.chip-btn').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      
      // Update selected chip like legacy
      const amount = parseInt(chip.getAttribute('data-amount') || '0');
      setSelectedChip(amount);
      
      // Update display like legacy
      const chipDisplay = document.getElementById('selectedChipDisplay');
      if (chipDisplay) {
        const formattedValue = amount >= 1000 ? `${amount/1000}k` : amount.toString();
        chipDisplay.textContent = `₹${formattedValue}`;
      }
      
      // Hide panel after selection like legacy
      setShowChipSelector(false);
    });
  });
}
```

## 9. Game Phase and Timer Management

### Legacy HTML Phase Handling
The legacy HTML manages game phases with specific behavior:
- Betting phase allows bets
- Dealing phase closes betting
- Complete phase shows results
- Timer display changes based on phase

### Required Changes
Implement exact phase management:

```javascript
// Handle phase changes like legacy
useEffect(() => {
  // Update UI based on phase like legacy
  if (roundInfoRef.current) {
    switch (gameState.phase) {
      case 'betting':
        if (gameState.currentTimer > 0) {
          roundInfoRef.current.textContent = `Betting Time: ${gameState.currentTimer}s`;
        } else {
          roundInfoRef.current.textContent = 'Time Up!';
        }
        break;
      case 'dealing':
        roundInfoRef.current.textContent = 'Dealing Phase';
        break;
      case 'complete':
        roundInfoRef.current.textContent = 'Game Complete';
        break;
      default:
        roundInfoRef.current.textContent = `Round ${gameState.round}`;
    }
  }
}, [gameState.phase, gameState.currentTimer, gameState.round]);
```

## 10. Video Stream Management

### Legacy HTML Video System
The legacy HTML handles multiple video types:
- Regular video files (MP4)
- Embed URLs (YouTube, etc.)
- RTMP streams with HLS.js
- Stream status indicators

### Required Changes
Implement exact video system:

```javascript
// Update stream display like legacy
function updateStreamDisplay(settings: any) {
  const streamType = settings.stream_type?.value || 'video';
  const streamUrl = settings.stream_url?.value || 'hero images/uhd_30fps.mp4';
  
  // Hide all stream containers first like legacy
  document.getElementById('liveStream')?.setAttribute('style', 'display: none;');
  document.getElementById('embedContainer')?.setAttribute('style', 'display: none;');
  document.getElementById('rtmpStream')?.setAttribute('style', 'display: none;');
  
  // Show appropriate stream type like legacy
  switch (streamType) {
    case 'video':
      const videoElement = document.getElementById('liveStream') as HTMLVideoElement;
      if (videoElement) {
        videoElement.setAttribute('src', streamUrl);
        videoElement.setAttribute('style', 'display: block;');
        
        // Clean up HLS if exists
        if ((window as any).hls) {
          (window as any).hls.destroy();
          (window as any).hls = null;
        }
      }
      break;
    // Handle other types similar to legacy...
  }
}
```

## 11. Final Implementation Steps

1. **Maintain React state** as the source of truth while allowing direct DOM updates where needed
2. **Implement direct DOM manipulation** for elements that require exact legacy behavior
3. **Keep WebSocket communication** pattern identical to legacy
4. **Preserve all JavaScript interactions** and event handling patterns
5. **Maintain the same notification system** behavior
6. **Implement identical history and statistics** displays
7. **Ensure all visual updates** happen with same timing as legacy
8. **Preserve all ID attributes** and class names for JavaScript compatibility
9. **Keep the same responsive behavior** as the legacy HTML
10. **Maintain all interactive elements** and their behaviors