# Balance Synchronization Fix Implementation Plan

## Problem Analysis

The balance synchronization issue occurs because:
1. Profile page fetches fresh balance from API via `UserProfileContext`
2. Game page relies on `GameStateContext` which gets balance from `AuthContext` (localStorage)
3. No real-time synchronization between these contexts
4. WebSocket balance updates are disabled (line 392-396 in WebSocketContext.tsx)

## Solution Architecture

### Centralized Balance Management System

We'll implement a hybrid approach with:
1. **Real-time WebSocket updates** for instant balance changes
2. **Periodic API polling** as fallback mechanism
3. **Event-driven synchronization** between contexts
4. **Balance validation** before critical operations

### Implementation Components

#### 1. BalanceContext (New Context)
Create a centralized balance management context:

```typescript
// client/src/contexts/BalanceContext.tsx
interface BalanceState {
  currentBalance: number;
  lastUpdated: number;
  isLoading: boolean;
  error: string | null;
  source: 'websocket' | 'api' | 'localStorage';
}

interface BalanceContextType {
  balance: number;
  isLoading: boolean;
  error: string | null;
  updateBalance: (newBalance: number, source?: string) => void;
  refreshBalance: () => Promise<void>;
  validateBalance: () => Promise<boolean>;
}
```

#### 2. Enhanced WebSocketContext
Re-enable and enhance balance update handling:

```typescript
// In WebSocketContext.tsx - case 'balance_update':
case 'balance_update':
  // Handle real-time balance updates from server
  if (data.data?.balance !== undefined) {
    // Update BalanceContext
    updateBalance(data.data.balance, 'websocket');
    
    // Show notification for significant changes
    if (data.data.amount && Math.abs(data.data.amount) > 0) {
      const isCredit = data.data.amount > 0;
      showNotification(
        `${isCredit ? 'Credited' : 'Debited'}: ₹${Math.abs(data.data.amount).toLocaleString()}`,
        isCredit ? 'success' : 'info'
      );
    }
  }
  break;
```

#### 3. Enhanced GameStateContext
Add balance refresh mechanism and API integration:

```typescript
// In GameStateContext.tsx
// Add balance refresh function
const refreshBalanceFromAPI = useCallback(async () => {
  try {
    const response = await apiClient.get<{success: boolean, balance: number}>('/user/balance');
    if (response.success && response.balance !== gameState.playerWallet) {
      dispatch({
        type: 'UPDATE_PLAYER_WALLET',
        payload: response.balance
      });
      return response.balance;
    }
  } catch (error) {
    console.error('Failed to refresh balance:', error);
  }
  return gameState.playerWallet;
}, [gameState.playerWallet]);

// Add periodic balance refresh
useEffect(() => {
  const interval = setInterval(async () => {
    if (auth.isAuthenticated) {
      await refreshBalanceFromAPI();
    }
  }, 30000); // 30 seconds

  return () => clearInterval(interval);
}, [auth.isAuthenticated, refreshBalanceFromAPI]);
```

#### 4. Enhanced AuthContext
Add balance synchronization methods:

```typescript
// In AuthContext.tsx
// Add balance update method
const updateBalance = useCallback((newBalance: number, source: string = 'api') => {
  if (state.user) {
    const updatedUser = {
      ...state.user,
      balance: newBalance
    };
    
    // Update localStorage
    localStorage.setItem('user', JSON.stringify(updatedUser));
    
    // Update state
    dispatch({ 
      type: 'AUTH_SUCCESS', 
      payload: { user: updatedUser, token: state.token } 
    });
    
    // Emit custom event for other contexts
    window.dispatchEvent(new CustomEvent('balance-updated', {
      detail: { balance: newBalance, source, timestamp: Date.now() }
    }));
  }
}, [state.user, state.token]);
```

#### 5. Enhanced UserProfileContext
Add real-time balance updates:

```typescript
// In UserProfileContext.tsx
// Listen for balance updates
useEffect(() => {
  const handleBalanceUpdate = (event: CustomEvent) => {
    const { balance, source } = event.detail;
    
    // Update analytics if balance changed
    if (state.analytics && state.analytics.currentBalance !== balance) {
      dispatch({
        type: 'SET_ANALYTICS',
        payload: { ...state.analytics, currentBalance: balance }
      });
    }
  };

  window.addEventListener('balance-updated', handleBalanceUpdate as EventListener);
  return () => window.removeEventListener('balance-updated', handleBalanceUpdate as EventListener);
}, [state.analytics]);
```

## Implementation Steps

### Step 1: Create BalanceContext
- Create centralized balance management context
- Implement balance update methods
- Add balance validation functions
- Set up event emission for cross-context communication

### Step 2: Enhance WebSocketContext
- Re-enable balance_update message handling
- Add real-time balance update processing
- Implement balance change notifications
- Add error handling for balance updates

### Step 3: Update GameStateContext
- Add API-based balance refresh function
- Implement periodic balance polling
- Add balance validation before bets
- Enhance balance synchronization with AuthContext

### Step 4: Update AuthContext
- Add balance update methods
- Implement localStorage synchronization
- Add event emission for balance changes
- Enhance user data management

### Step 5: Update UserProfileContext
- Add balance update event listeners
- Implement real-time analytics updates
- Add balance refresh triggers
- Enhance data synchronization

### Step 6: Update Player Game Page
- Add balance validation before placing bets
- Implement real-time balance updates
- Add balance refresh after game completion
- Enhance error handling

### Step 7: Update Profile Page
- Add real-time balance display updates
- Implement balance refresh triggers
- Add transaction-based balance updates
- Enhance user experience

### Step 8: Add Server-Side Support
- Implement WebSocket balance notifications
- Add balance change event triggers
- Enhance transaction processing
- Add real-time update mechanisms

## Key Features

### 1. Real-Time Balance Updates
- Instant balance updates via WebSocket
- Event-driven synchronization between contexts
- Automatic UI updates across all pages

### 2. Fallback Mechanisms
- Periodic API polling every 30 seconds
- Balance validation before critical operations
- Error handling and recovery mechanisms

### 3. Balance Validation
- Pre-bet balance validation
- Server-side balance verification
- Client-side balance consistency checks

### 4. User Experience
- Real-time balance notifications
- Smooth balance transitions
- Loading states and error handling

## Testing Scenarios

### 1. Deposit/Withdrawal Tests
- Verify real-time balance updates after deposit
- Verify real-time balance updates after withdrawal
- Test balance synchronization across pages

### 2. Game Play Tests
- Verify balance updates after winning
- Verify balance updates after losing
- Test balance validation before bets

### 3. Connection Tests
- Test behavior with WebSocket disconnection
- Test API polling fallback
- Test reconnection scenarios

### 4. Edge Cases
- Test rapid balance changes
- Test concurrent balance updates
- Test balance discrepancy handling

## Implementation Files to Modify

1. **New Files:**
   - `client/src/contexts/BalanceContext.tsx`

2. **Modified Files:**
   - `client/src/contexts/WebSocketContext.tsx`
   - `client/src/contexts/GameStateContext.tsx`
   - `client/src/contexts/AuthContext.tsx`
   - `client/src/contexts/UserProfileContext.tsx`
   - `client/src/pages/player-game.tsx`
   - `client/src/pages/profile.tsx`

3. **Server-Side Files:**
   - `server/routes.ts` (add balance notification endpoints)
   - `server/socket/game-handlers.ts` (add balance update events)

## Benefits of This Solution

1. **Real-Time Updates:** Instant balance synchronization across all pages
2. **Reliability:** Multiple fallback mechanisms ensure consistency
3. **Performance:** Efficient updates with minimal API calls
4. **User Experience:** Smooth, responsive balance updates
5. **Maintainability:** Centralized balance management
6. **Scalability:** Event-driven architecture supports future features

## Timeline

1. **Phase 1 (Day 1):** Create BalanceContext and enhance WebSocketContext
2. **Phase 2 (Day 2):** Update GameStateContext and AuthContext
3. **Phase 3 (Day 3):** Update UserProfileContext and page components
4. **Phase 4 (Day 4):** Add server-side support and testing
5. **Phase 5 (Day 5):** Final testing and deployment

This comprehensive solution will ensure that balance updates are reflected in real-time across all pages, providing a seamless user experience for deposits, withdrawals, and game activities.