# Complete Reddy Anna Game Implementation Guide

## Priority Action Plan

### Immediate Critical Issues (Fix First)
1. **Admin login domain issue** - Fix `admin@reddyanna.com@reddyanna.com` problem
2. **WebSocket message validation** - Prevent invalid game state changes
3. **Authentication token security** - Move from localStorage to secure storage
4. **Database schema alignment** - Fix shared schema vs actual DB mismatch

### High Priority Issues (Fix Second)
5. **Game logic accuracy** - Correct payout calculations and game rules
6. **Rate limiting** - Implement proper limits on betting and messages
7. **Balance management** - Fix race conditions in balance updates
8. **Session management** - Proper JWT implementation with refresh tokens

### Medium Priority Issues (Fix Third)
9. **Frontend-backend sync** - Improve game state synchronization
10. **Error handling** - Better user feedback and logging
11. **Animation timing** - Sync with actual game events
12. **Security hardening** - Additional security measures

### Low Priority Issues (Fix Last)
13. **Performance optimization** - Query optimization and caching
14. **User experience** - UI/UX improvements
15. **Documentation** - Complete technical docs

## Proper Game Flow Implementation

### 1. Complete Authentication Flow

#### User Registration Flow:
```
Frontend: User fills registration form
→ Validate input format and content
→ Call backend API: POST /api/auth/register
→ Backend: Validate input → Check if user exists → Hash password → Create user → Generate JWT
→ Backend: Return user data and token
→ Frontend: Store minimal user data (not JWT), redirect to game
```

#### User Login Flow:
```
Frontend: User enters email/password
→ Call backend API: POST /api/auth/login
→ Backend: Validate credentials → Generate JWT → Fetch user data
→ Backend: Return user data (no sensitive info) and token
→ Frontend: Store user data, redirect to game
→ WebSocket connects with authentication
```

#### Admin Login Flow:
```
Frontend: User enters "admin" or "admin@example.com", password
→ If no @, append "@example.com" (not "@reddyanna.com")
→ Call backend API: POST /api/auth/admin/login
→ Backend: Validate admin credentials → Generate JWT with admin role
→ Backend: Return admin data and token
→ Frontend: Store admin user data, redirect to admin panel
```

### 2. WebSocket Communication Flow

#### Authentication:
```
1. WebSocket connects to ws://server/ws
2. Client sends: { type: 'authenticate', data: { userId, token, role } }
3. Server validates token → Sets client role → Sends: { type: 'authenticated', data: { ... } }
4. Server sends initial sync: { type: 'sync_game_state', data: { ... } }
```

#### Betting Flow:
```
1. Player clicks bet button → Validates local state
2. Player sends: { type: 'place_bet', data: { side: 'andar'|'bahar', amount, round } }
3. Server validates: user balance, game phase, bet limits
4. Server reserves funds, updates bets, broadcasts: { type: 'betting_stats', data: { ... } }
5. Server sends personal update: { type: 'user_bets_update', data: { ... } }
```

#### Card Dealing Flow (Admin):
```
1. Admin clicks deal button → Checks game state
2. Admin sends: { type: 'deal_card', data: { card, side, position } }
3. Server validates: admin role, game state, card sequence
4. Server records card, checks for win, broadcasts: { type: 'card_dealt', data: { ... } }
5. Server updates game state if win detected
```

### 3. Game Logic Implementation

#### Complete Game State Structure:
```javascript
// Backend maintains single source of truth
const gameState = {
  gameId: string,
  openingCard: string | null,
  phase: 'idle' | 'betting' | 'dealing' | 'complete',
  currentRound: 1 | 2 | 3,
  timer: number,
  andarCards: string[],
  baharCards: string[],
  winner: 'andar' | 'bahar' | null,
  winningCard: string | null,
  round1Bets: { andar: number, bahar: number },
  round2Bets: { andar: number, bahar: number },
  userBets: Map<userId, { round1: { andar: number, bahar: number }, round2: { andar: number, bahar: number } }>,
  bettingLocked: boolean,
  winningRound: number | null
};
```

#### Proper Card Win Logic:
```javascript
function checkWin(card, openingCard) {
  if (!openingCard) return false;
  
  // Extract ranks properly (handles "10" correctly)
  const cardRank = getCardRank(card);      // Returns "A", "2", "3", ... "10", "J", "Q", "K"
  const openingRank = getCardRank(openingCard);
  
  return cardRank === openingRank;
}

function getCardRank(card) {
  // Properly extract rank from "A♥", "10♠", "K♦", etc.
  return card.replace(/[♠♥♦♣]/g, '');
}
```

#### Accurate Payout Calculation:
```javascript
function calculatePayout(betAmount, winningSide) {
  // Standard Andar Bahar: 2:1 payout (bet returned + bet amount as profit)
  // House commission: 5% on Andar wins only
  const basePayout = betAmount * 2;
  
  if (winningSide === 'andar') {
    return Math.floor(basePayout * 0.95); // 5% commission
  }
  return basePayout; // No commission on Bahar
}
```

### 4. Database Operations Flow

#### User Balance Transaction (Atomic):
```javascript
async function processUserBet(userId, betAmount) {
  // Use database transaction to ensure consistency
  const result = await database.transaction(async (tx) => {
    // 1. Verify user has sufficient balance
    const user = await tx.select('users', ['balance']).where('id', userId);
    if (user.balance < betAmount) {
      throw new Error('Insufficient balance');
    }
    
    // 2. Create bet record
    await tx.insert('bets', {
      user_id: userId,
      amount: betAmount,
      side: betSide,
      status: 'pending',
      game_id: currentGameId
    });
    
    // 3. Reserve funds (subtract from available balance)
    await tx.update('users', { 
      balance: user.balance - betAmount 
    }).where('id', userId);
    
    return { success: true };
  });
  
  return result;
}
```

#### Game Result Processing:
```javascript
async function processGameResult(gameId, winningSide) {
  const transaction = await database.transaction(async (tx) => {
    // 1. Update game session as completed
    await tx.update('game_sessions', {
      status: 'completed',
      winner: winningSide,
      completed_at: new Date()
    }).where('game_id', gameId);
    
    // 2. Process all winning bets
    const winningBets = await tx.select('bets', '*')
      .where('game_id', gameId)
      .where('side', winningSide)
      .where('status', 'pending');
    
    for (const bet of winningBets) {
      // Calculate payout with proper rules
      const payout = calculatePayout(bet.amount, winningSide);
      
      // Update bet status
      await tx.update('bets', {
        status: 'won',
        payout_amount: payout,
        resolved_at: new Date()
      }).where('id', bet.id);
      
      // Update user balance
      await tx.update('users', {
        balance: tx.raw('balance + ?', [payout])
      }).where('id', bet.user_id);
    }
    
    // 3. Mark losing bets
    await tx.update('bets', {
      status: 'lost',
      resolved_at: new Date()
    }).where('game_id', gameId).where('status', 'pending');
  });
  
  return transaction;
}
```

### 5. Frontend State Management

#### Proper State Flow:
```javascript
// Frontend should only reflect server state
const handleWebSocketMessage = (message) => {
  switch(message.type) {
    case 'sync_game_state':
      // Replace entire game state with server state
      setGameState(message.data);
      break;
      
    case 'card_dealt':
      // Server controls all game state changes
      // Frontend just updates display
      addCardToDisplay(message.data.card, message.data.side);
      break;
      
    case 'betting_stats':
      // Update betting totals from server
      setBettingTotals(message.data);
      break;
      
    case 'balance_update':
      // Update user balance from server
      updateUserBalance(message.data.balance);
      break;
  }
};
```

### 6. Error Handling Strategy

#### Frontend Error Handling:
```javascript
// Global error handler
const handleGameError = (error, context) => {
  switch(error.type) {
    case 'network':
      showNotification('Network connection lost, reconnecting...', 'warning');
      break;
    case 'auth':
      showNotification('Session expired, please login again', 'error');
      redirectToLogin();
      break;
    case 'game':
      showNotification(error.message, 'error');
      break;
    case 'bet':
      showNotification('Bet failed: ' + error.message, 'error');
      break;
  }
};
```

#### Backend Error Handling:
```javascript
// Centralized error response
const sendErrorResponse = (ws, errorType, message, details = null) => {
  ws.send(JSON.stringify({
    type: 'error',
    data: {
      type: errorType,
      message: message,
      details: details,
      timestamp: Date.now()
    }
  }));
};
```

### 7. Security Implementation

#### JWT Token Flow:
```javascript
// Secure token generation
const generateSecureToken = (user) => {
  return jwt.sign(
    { 
      id: user.id, 
      username: user.username, 
      role: user.role,
      exp: Math.floor(Date.now() / 1000) + (15 * 60) // 15 minutes
    },
    process.env.JWT_SECRET,
    { 
      algorithm: 'RS256',
      issuer: 'ReddyAnnaGame',
      audience: 'users'
    }
  );
};

// Token validation middleware
const validateToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET, {
      issuer: 'ReddyAnnaGame',
      audience: 'users'
    });
  } catch (error) {
    return null;
  }
};
```

#### Rate Limiting Implementation:
```javascript
// Comprehensive rate limiting
const rateLimiters = {
  bet: new Map(),    // Per-user bet limiting
  ws: new Map(),     // Per-connection message limiting
  auth: new Map()    // Per-IP auth attempt limiting
};

const checkRateLimit = (identifier, limitType) => {
  const now = Date.now();
  let limits = rateLimiters[limitType].get(identifier);
  
  if (!limits) {
    limits = { count: 0, resetTime: now + 60000 }; // 1 minute window
    rateLimiters[limitType].set(identifier, limits);
  }
  
  if (now >= limits.resetTime) {
    limits.count = 0;
    limits.resetTime = now + 60000;
  }
  
  limits.count++;
  
  // Different limits for different types
  const maxLimits = {
    bet: 10,    // 10 bets per minute
    ws: 100,    // 100 messages per minute
    auth: 5     // 5 auth attempts per minute
  };
  
  return limits.count <= maxLimits[limitType];
};
```

### 8. Complete Integration Checklist

#### Before Launch:
- [ ] All authentication flows tested
- [ ] Game rules verified against standard Andar Bahar
- [ ] Database schema aligned with code
- [ ] Security measures implemented and tested
- [ ] Performance benchmarks met
- [ ] Error handling verified
- [ ] User experience validated
- [ ] Production environment secured
- [ ] Monitoring and logging enabled

This comprehensive guide provides the complete implementation strategy to fix all identified issues and create a properly functioning, secure, and enjoyable gaming experience.