# Andar Bahar Game - Issues and Fixes

## Table of Contents
1. [Overview](#overview)
2. [Issue 1: Missing `/api/user/referral-data` Endpoint](#issue-1-missing-apiuserreferral-data-endpoint)
3. [Issue 2: Missing `payment_requests` Database Table](#issue-2-missing-payment_requests-database-table)
4. [Issue 3: Hardcoded Balance (50,000) Instead of Real Balance](#issue-3-hardcoded-balance-50000-instead-of-real-balance)
5. [Issue 4: Betting Flow Problems and Balance Synchronization](#issue-4-betting-flow-problems-and-balance-synchronization)
6. [Issue 5: Black Screen During Round 2 Betting](#issue-5-black-screen-during-round-2-betting)
7. [Issue 6: Missing Celebration/Feedback for Game Events](#issue-6-missing-celebrationfeedback-for-game-events)
8. [Issue 7: WebSocket Overloading Problem](#issue-7-websocket-overloading-problem)
9. [Recommended Architecture Changes](#recommended-architecture-changes)

## Overview

This document outlines all the identified issues in the Andar Bahar game system and provides detailed fixes for each problem. The main issues include missing API endpoints, database schema inconsistencies, balance synchronization problems, UI blocking issues, and architectural problems with WebSocket usage.

## Issue 1: Missing `/api/user/referral-data` Endpoint

### Problem
- Frontend is trying to access `/api/user/referral-data` but this endpoint doesn't exist
- Causes 404 Not Found errors

### Files Affected
- `server/routes.ts` - Missing endpoint definition

### Fix Required
**File**: `server/routes.ts`

**Add new endpoint** after the bonus-info endpoint:
```typescript
// Referral Data Route
app.get("/api/user/referral-data", generalLimiter, async (req, res) => {
  try {
    // The unified requireAuth middleware should have set req.user
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }
    
    const userId = req.user.id;
    const user = await storage.getUserById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    // Get user's referral code
    const referralCode = user.referral_code_generated;
    
    // Get referred users
    const referredUsers = await storage.getUserReferrals(userId);
    
    // Calculate referral stats
    const referralStats = {
      referralCode: referralCode || '',
      totalReferrals: referredUsers.length,
      activeReferrals: referredUsers.filter(ref => parseFloat(ref.deposit_amount || '0') > 0).length,
      totalReferralBonus: referredUsers.reduce((sum, ref) => sum + parseFloat(ref.bonus_amount || '0'), 0),
      totalReferralDeposits: referredUsers.reduce((sum, ref) => sum + parseFloat(ref.deposit_amount || '0'), 0)
    };
    
    res.json({
      success: true,
      data: referralStats
    });
  } catch (error) {
    console.error('Referral data error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve referral data'
    });
  }
});
```

## Issue 2: Missing `payment_requests` Database Table

### Problem
- System tries to access `payment_requests` table which doesn't exist in database schema
- Causes 500 Internal Server Error with message "Could not find the table 'public.payment_requests' in the schema cache"

### Files Affected
- `database-setup.sql` - Missing table definition
- `server/storage-supabase.ts` - Has methods for non-existent table

### Fix Required

**File**: `database-setup.sql`

**Add new table** before the indexes section:
```sql
-- Create payment_requests table
CREATE TABLE IF NOT EXISTS payment_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT REFERENCES users(id),
    request_type TEXT CHECK (request_type IN ('deposit', 'withdrawal')),
    amount NUMERIC,
    payment_method TEXT,
    status TEXT CHECK (status IN ('pending', 'approved', 'rejected', 'completed', 'processing')) DEFAULT 'pending',
    admin_id TEXT REFERENCES admin_credentials(id), -- Who processed the request
    processed_at TIMESTAMP,
    reference_id TEXT, -- UTR, transaction ID, etc.
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for payment requests
CREATE INDEX IF NOT EXISTS idx_payment_requests_user_id ON payment_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_requests_status ON payment_requests(status);
CREATE INDEX IF NOT EXISTS idx_payment_requests_type ON payment_requests(request_type);
CREATE INDEX IF NOT EXISTS idx_payment_requests_created_at ON payment_requests(created_at);

GRANT ALL PRIVILEGES ON TABLE payment_requests TO service_role;
```

## Issue 3: Hardcoded Balance (50,000) Instead of Real Balance

### Problem
- Game page shows hardcoded balance of 50,000 instead of fetching user's actual balance from database
- UI doesn't properly update when balance changes occur

### Files Affected
- Client-side game files (HTML/JS/CSS)
- WebSocket balance update handling
- Balance fetching mechanism

### Fix Required

**File**: Client-side game files (need to identify exact files)

1. **Remove hardcoded balance** and implement proper balance fetching:
```javascript
// Instead of hardcoded value, fetch from API
async function loadUserBalance() {
  try {
    const response = await fetch('/api/user/balance', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${getAuthToken()}`,
        'Content-Type': 'application/json'
      }
    });
    const data = await response.json();
    if (data.success) {
      updateBalanceDisplay(data.balance);
    } else {
      console.error('Failed to fetch balance:', data.error);
    }
  } catch (error) {
    console.error('Error fetching balance:', error);
  }
}
```

2. **Ensure WebSocket properly handles balance updates**:
```javascript
// In WebSocket message handling
if (message.type === 'balance_update') {
  updateBalanceDisplay(message.data.balance);
}
```

## Issue 4: Betting Flow Problems and Balance Synchronization

### Problem
- Balance not synchronized between database and UI in real-time
- Betting validation might use incorrect balance values
- Race conditions when multiple bets placed quickly

### Current Betting Flow Issues
```
Current Problematic Flow:
User places bet → WebSocket handles balance update → Race conditions → Inconsistency
```

### Recommended Flow
```
Optimal Flow:
User places bet → REST API validates balance → DB updates → WebSocket handles game logic only → UI updates
```

### Files Affected
- `server/routes.ts` - Betting endpoint logic
- `server/storage-supabase.ts` - Balance update methods
- Client-side betting logic files

### Fix Required

**File**: `server/routes.ts`

**Update betting logic** to separate balance validation from game logic:
```typescript
// Update the betting endpoint to use REST API for balance validation
case 'place_bet':
  if (!client) break;

  const betAmount = message.data.amount;
  const betSide = message.data.side;
  const betRound = currentGameState.currentRound;
  
  // Skip balance check for WebSocket, let REST API handle it
  // WebSocket should only handle game state, not account management

  // Only save to database for non-anonymous users via WebSocket
  if (!isAnonymous) {
    // Create bet record but don't update balance via WebSocket
    await storage.createBet({
      userId: client.userId,
      gameId: currentGameState.gameId,
      round: betRound.toString(),
      side: betSide,
      amount: betAmount.toString(),
      status: 'pending'
    });
    
    // Send bet placement to WebSocket, but balance update should come from separate REST call
    broadcast({ 
      type: 'betting_stats',
      data: {
        andarTotal: currentGameState.round1Bets.andar + currentGameState.round2Bets.andar,
        baharTotal: currentGameState.round1Bets.bahar + currentGameState.round2Bets.bahar,
        round1Bets: currentGameState.round1Bets,
        round2Bets: currentGameState.round2Bets
      }
    });
  }
  
  // WebSocket should not handle balance updates - this causes race conditions
  break;
```

**File**: Client-side files

**Update client to use REST API for balance validation**:
```javascript
// Before placing bet, validate via REST API
async function validateAndPlaceBet(amount, side, round) {
  // First validate balance via REST API
  const balanceCheck = await fetch('/api/user/balance');
  const balanceData = await balanceCheck.json();
  
  if (balanceData.balance < amount) {
    showErrorMessage('Insufficient balance');
    return false;
  }
  
  // Then send bet via WebSocket for game logic
  ws.send(JSON.stringify({
    type: 'place_bet',
    data: { amount, side, round }
  }));
}
```

## Issue 5: Black Screen During Round 2 Betting

### Problem
- When Round 2 starts, a black screen appears that blocks betting interface
- Players cannot place bets during Round 2 due to UI blocking

### Files Affected
- Client-side game UI files (HTML/CSS/JS)
- Game phase transition logic
- Round transition handling

### Fix Required

**File**: Client-side game rendering files (likely in client/src/)

1. **Remove or fix the black overlay** that appears during Round 2:
```css
/* Remove any black overlay that blocks betting during round transitions */
.round2-transition-overlay {
  display: none !important; /* or fix the transition logic */
}

/* Ensure betting interface remains visible during round transitions */
.game-betting-interface {
  z-index: 1000; /* Ensure betting controls stay on top */
  pointer-events: auto; /* Ensure betting buttons remain clickable */
}
```

2. **Update game phase transition handling** in client-side JavaScript:
```javascript
// In WebSocket message handler
if (message.type === 'start_round_2') {
  // Don't show blocking overlay, just update game state
  updateGamePhase('betting');
  updateCurrentRound(2);
  updateTimer(message.data.timer);
  // Show round transition message without blocking betting
  showRoundTransitionMessage('Round 2: Betting Opened');
}
```

## Issue 6: Missing Celebration/Feedback for Game Events

### Problem
- Game lacks visual/audio feedback for important events
- No celebration animations for winners
- Missing win/lose notifications
- Admin panel has these features but player interface doesn't

### Files Affected
- Client-side game UI files
- Game event handling logic
- Animation/CSS files

### Fix Required

**File**: Client-side game files

1. **Add celebration animations** for game events:
```javascript
// In WebSocket message handler for game completion
if (message.type === 'game_complete') {
  // Show celebration animation
  showCelebrationAnimation(message.data.winner);
  
  // Show win/lose notification
  if (userPlacedBet) {
    const userBet = getUserCurrentBet();
    if (userBet.side === message.data.winner) {
      showWinNotification(message.data.payoutMessage);
    } else {
      showLossNotification('Better luck next time!');
    }
  }
  
  // Play celebration sound
  playCelebrationSound();
}

function showCelebrationAnimation(winner) {
  const celebrationEl = document.createElement('div');
  celebrationEl.className = `celebration-${winner}`;
  celebrationEl.innerHTML = `<h2>${winner.toUpperCase()} WINS!</h2>`;
  document.body.appendChild(celebrationEl);
  
  // Remove after animation
  setTimeout(() => {
    celebrationEl.remove();
  }, 3000);
}
```

2. **Add sound effects** for game events:
```javascript
// Create sound functions
function playCardDealtSound() {
  // Play card dealing sound
}

function playWinSound() {
  // Play win celebration sound
}

function playRoundTransitionSound() {
  // Play round transition sound
}
```

## Issue 7: WebSocket Overloading Problem

### Problem
- WebSocket handles too many responsibilities (balance, game logic, authentication, UI updates)
- Should only handle real-time game logic
- Creating complexity and potential conflicts

### Current Overloaded Responsibilities
- ✗ Balance updates
- ✗ User authentication
- ✗ Game state management
- ✗ Betting logic
- ✗ UI updates
- ✗ Account management

### Recommended Responsibilities
- ✓ Game state (current phase, round, timer)
- ✓ Card dealing and results
- ✓ Betting actions and notifications
- ✓ Game completion and payouts
- ✓ Real-time game statistics

### Files Affected
- `server/routes.ts` - WebSocket connection handling
- Client-side WebSocket connection files
- Balance update logic
- Authentication flow

### Fix Required

**File**: `server/routes.ts`

**Restructure WebSocket authentication** to separate concerns:

```typescript
// Remove balance updates from WebSocket
ws.on('message', async (data: Buffer) => {
  try {
    const message = JSON.parse(data.toString());
    console.log('Received WebSocket message:', message.type);
    
    switch (message.type) {
      case 'authenticate':
        // Handle authentication via WebSocket
        // But balance updates should come from REST API
        break;
        
      case 'place_bet':
        // WebSocket handles game logic, not balance validation
        // Balance validation happens via REST API before WebSocket
        break;
        
      case 'balance_update':
        // Remove this from WebSocket - handle via REST API polling
        // WebSocket should only handle game-state related balance changes (wins/losses)
        break;
        
      case 'card_dealt':
      case 'game_complete':
      case 'phase_change':
        // These are legitimate WebSocket messages
        break;
    }
  } catch (error) {
    console.error('WebSocket message error:', error);
  }
});
```

**File**: Client-side WebSocket handling

**Update client-side** to handle only game logic:
```javascript
// WebSocket should only handle game events
ws.onmessage = function(event) {
  const message = JSON.parse(event.data);
  
  switch(message.type) {
    case 'game_state': // Game state updates only
      updateGameState(message.data);
      break;
      
    case 'card_dealt': // Card dealing only
      updateCardDisplay(message.data);
      break;
      
    case 'betting_stats': // Betting statistics only
      updateBettingStats(message.data);
      break;
      
    case 'game_complete': // Game completion only
      handleGameCompletion(message.data);
      break;
      
    // Remove non-game related messages from WebSocket
    default:
      console.log('Unhandled WebSocket message:', message.type);
  }
};
```

## Recommended Architecture Changes

### Separate Concerns Properly

```
REST API - Account Management:
├── /api/user/balance (balance queries/updates)
├── /api/user/profile (profile management)
├── /api/payment-requests (payment processing)
└── /api/auth/* (authentication)

WebSocket - Game Logic Only:
├── authenticate (session management)
├── place_bet (bet submission)
├── card_dealt (game progression)
├── game_complete (results)
├── phase_change (game state)
└── betting_stats (game statistics)
```

### Implementation Steps:
1. **Remove balance updates from WebSocket**
2. **Add REST API polling for balance updates**
3. **Ensure WebSocket only handles real-time game events**
4. **Move account management to REST endpoints**
5. **Update client-side to reflect new architecture**

### Benefits of Changes:
- ✅ Clear separation of concerns
- ✅ Easier debugging and maintenance
- ✅ Better performance for real-time gaming
- ✅ Reduced complexity in WebSocket handling
- ✅ Proper balance synchronization
- ✅ Fix for all identified issues

## Priority Fix Order

1. **Critical**: Add missing database table (`payment_requests`)
2. **Critical**: Add missing API endpoint (`/api/user/referral-data`)  
3. **High**: Fix WebSocket architecture to separate concerns
4. **High**: Implement proper balance synchronization
5. **Medium**: Fix round transition UI issues
6. **Low**: Add celebration animations and feedback

These changes will resolve all major issues while creating a more maintainable and scalable architecture for the game system.