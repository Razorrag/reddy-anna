# Balance Synchronization Implementation Guide

## File-by-File Implementation Details

### 1. Create BalanceContext.tsx

```typescript
// client/src/contexts/BalanceContext.tsx
import React, { createContext, useContext, useReducer, useEffect, ReactNode, useCallback } from 'react';
import { apiClient } from '@/lib/api-client';

interface BalanceState {
  currentBalance: number;
  lastUpdated: number;
  isLoading: boolean;
  error: string | null;
  source: 'websocket' | 'api' | 'localStorage';
}

type BalanceAction =
  | { type: 'SET_BALANCE'; payload: { balance: number; source: string } }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'REFRESH_BALANCE' };

const initialState: BalanceState = {
  currentBalance: 0,
  lastUpdated: 0,
  isLoading: false,
  error: null,
  source: 'localStorage'
};

const balanceReducer = (state: BalanceState, action: BalanceAction): BalanceState => {
  switch (action.type) {
    case 'SET_BALANCE':
      return {
        ...state,
        currentBalance: action.payload.balance,
        lastUpdated: Date.now(),
        source: action.payload.source as 'websocket' | 'api' | 'localStorage'
      };
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload, isLoading: false };
    case 'REFRESH_BALANCE':
      return { ...state, isLoading: true, error: null };
    default:
      return state;
  }
};

interface BalanceContextType {
  balance: number;
  isLoading: boolean;
  error: string | null;
  source: string;
  updateBalance: (newBalance: number, source?: string) => void;
  refreshBalance: () => Promise<void>;
  validateBalance: () => Promise<boolean>;
}

const BalanceContext = createContext<BalanceContextType | undefined>(undefined);

export const BalanceProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(balanceReducer, initialState);

  const updateBalance = useCallback((newBalance: number, source: string = 'api') => {
    dispatch({
      type: 'SET_BALANCE',
      payload: { balance: newBalance, source }
    });

    // Emit custom event for other contexts
    window.dispatchEvent(new CustomEvent('balance-updated', {
      detail: { balance: newBalance, source, timestamp: Date.now() }
    }));

    // Update localStorage
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        user.balance = newBalance;
        localStorage.setItem('user', JSON.stringify(user));
      } catch (error) {
        console.error('Failed to update localStorage balance:', error);
      }
    }
  }, []);

  const refreshBalance = useCallback(async () => {
    dispatch({ type: 'REFRESH_BALANCE' });
    
    try {
      const response = await apiClient.get<{success: boolean, balance: number}>('/user/balance');
      if (response.success) {
        updateBalance(response.balance, 'api');
      } else {
        throw new Error(response.error || 'Failed to fetch balance');
      }
    } catch (error: any) {
      dispatch({ type: 'SET_ERROR', payload: error.message });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [updateBalance]);

  const validateBalance = useCallback(async (): Promise<boolean> => {
    try {
      const response = await apiClient.get<{success: boolean, balance: number}>('/user/balance');
      if (response.success) {
        const isValid = Math.abs(response.balance - state.currentBalance) < 0.01; // Allow for floating point
        if (!isValid) {
          updateBalance(response.balance, 'api');
        }
        return isValid;
      }
      return false;
    } catch (error) {
      console.error('Balance validation failed:', error);
      return false;
    }
  }, [state.currentBalance, updateBalance]);

  // Initialize balance from localStorage
  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        if (user.balance !== undefined) {
          updateBalance(user.balance, 'localStorage');
        }
      } catch (error) {
        console.error('Failed to parse user balance from localStorage:', error);
      }
    }
  }, [updateBalance]);

  // Periodic balance refresh
  useEffect(() => {
    const interval = setInterval(() => {
      const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
      if (isLoggedIn && !state.isLoading) {
        refreshBalance();
      }
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [refreshBalance, state.isLoading]);

  const value: BalanceContextType = {
    balance: state.currentBalance,
    isLoading: state.isLoading,
    error: state.error,
    source: state.source,
    updateBalance,
    refreshBalance,
    validateBalance
  };

  return (
    <BalanceContext.Provider value={value}>
      {children}
    </BalanceContext.Provider>
  );
};

export const useBalance = () => {
  const context = useContext(BalanceContext);
  if (context === undefined) {
    throw new Error('useBalance must be used within a BalanceProvider');
  }
  return context;
};
```

### 2. Update WebSocketContext.tsx

```typescript
// In WebSocketContext.tsx, modify the balance_update case:

case 'balance_update':
  // Handle real-time balance updates from server
  if (data.data?.balance !== undefined) {
    console.log('🔄 Balance update received:', data.data);
    
    // Get the balance context
    const balanceEvent = new CustomEvent('balance-websocket-update', {
      detail: {
        balance: data.data.balance,
        amount: data.data.amount,
        type: data.data.type, // 'deposit', 'withdrawal', 'win', 'loss', 'bet'
        timestamp: Date.now()
      }
    });
    window.dispatchEvent(balanceEvent);
    
    // Show notification for significant changes
    if (data.data.amount && Math.abs(data.data.amount) > 0) {
      const isCredit = data.data.amount > 0;
      let message = `${isCredit ? 'Credited' : 'Debited'}: ₹${Math.abs(data.data.amount).toLocaleString()}`;
      
      if (data.data.type) {
        switch (data.data.type) {
          case 'deposit':
            message = `Deposit of ₹${Math.abs(data.data.amount).toLocaleString()} received`;
            break;
          case 'withdrawal':
            message = `Withdrawal of ₹${Math.abs(data.data.amount).toLocaleString()} processed`;
            break;
          case 'win':
            message = `Won ₹${Math.abs(data.data.amount).toLocaleString()}!`;
            break;
          case 'loss':
            message = `Lost ₹${Math.abs(data.data.amount).toLocaleString()}`;
            break;
          case 'bet':
            message = `Bet placed: ₹${Math.abs(data.data.amount).toLocaleString()}`;
            break;
        }
      }
      
      showNotification(message, isCredit ? 'success' : 'info');
    }
  }
  break;
```

### 3. Update GameStateContext.tsx

```typescript
// In GameStateContext.tsx, add these enhancements:

import { useBalance } from './BalanceContext';

// Inside the GameStateProvider component:

const { balance, updateBalance, validateBalance } = useBalance();

// Add balance refresh function
const refreshBalanceFromAPI = useCallback(async () => {
  try {
    const response = await apiClient.get<{success: boolean, balance: number}>('/user/balance');
    if (response.success && response.balance !== gameState.playerWallet) {
      dispatch({
        type: 'UPDATE_PLAYER_WALLET',
        payload: response.balance
      });
      updateBalance(response.balance, 'api');
      return response.balance;
    }
  } catch (error) {
    console.error('Failed to refresh balance:', error);
  }
  return gameState.playerWallet;
}, [gameState.playerWallet, updateBalance]);

// Listen for balance updates from WebSocket
useEffect(() => {
  const handleBalanceUpdate = (event: CustomEvent) => {
    const { balance: newBalance, source } = event.detail;
    
    if (newBalance !== gameState.playerWallet) {
      dispatch({
        type: 'UPDATE_PLAYER_WALLET',
        payload: newBalance
      });
    }
  };

  const handleWebSocketBalanceUpdate = (event: CustomEvent) => {
    const { balance: newBalance } = event.detail;
    
    if (newBalance !== gameState.playerWallet) {
      dispatch({
        type: 'UPDATE_PLAYER_WALLET',
        payload: newBalance
      });
      updateBalance(newBalance, 'websocket');
    }
  };

  window.addEventListener('balance-updated', handleBalanceUpdate as EventListener);
  window.addEventListener('balance-websocket-update', handleWebSocketBalanceUpdate as EventListener);
  
  return () => {
    window.removeEventListener('balance-updated', handleBalanceUpdate as EventListener);
    window.removeEventListener('balance-websocket-update', handleWebSocketBalanceUpdate as EventListener);
  };
}, [gameState.playerWallet, updateBalance]);

// Enhance placeBet function with balance validation
const placeBet = async (side: BetSide, amount: number) => {
  // Validate balance before placing bet
  const isValidBalance = await validateBalance();
  if (!isValidBalance) {
    showNotification('Balance updated. Please try again.', 'warning');
    return;
  }

  if (gameState.playerWallet < amount) {
    showNotification('Insufficient balance', 'error');
    return;
  }

  // This function now only updates local state
  // The actual bet placement is handled by WebSocket messages
  if (gameState.currentRound === 1) {
    const newBets: RoundBets = {
      ...gameState.playerRound1Bets,
      [side]: gameState.playerRound1Bets[side] + amount
    };
    updatePlayerRoundBets(1, newBets);
  } else if (gameState.currentRound === 2) {
    const newBets: RoundBets = {
      ...gameState.playerRound2Bets,
      [side]: gameState.playerRound2Bets[side] + amount
    };
    updatePlayerRoundBets(2, newBets);
  }
  
  // Update local balance immediately for UI responsiveness
  updatePlayerWallet(gameState.playerWallet - amount);
};

// Add periodic balance refresh
useEffect(() => {
  const interval = setInterval(async () => {
    if (auth.isAuthenticated && !gameState.isGameActive) {
      await refreshBalanceFromAPI();
    }
  }, 30000); // 30 seconds

  return () => clearInterval(interval);
}, [auth.isAuthenticated, gameState.isGameActive, refreshBalanceFromAPI]);
```

### 4. Update AuthContext.tsx

```typescript
// In AuthContext.tsx, add these enhancements:

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

// Listen for balance updates
useEffect(() => {
  const handleBalanceUpdate = (event: CustomEvent) => {
    const { balance: newBalance, source } = event.detail;
    
    if (state.user && state.user.balance !== newBalance) {
      updateBalance(newBalance, source);
    }
  };

  window.addEventListener('balance-updated', handleBalanceUpdate as EventListener);
  return () => window.removeEventListener('balance-updated', handleBalanceUpdate as EventListener);
}, [state.user, updateBalance]);

// Add updateBalance to the context value
const value = {
  // ... existing properties
  updateBalance,
  refreshUser // Already exists
};
```

### 5. Update UserProfileContext.tsx

```typescript
// In UserProfileContext.tsx, add these enhancements:

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

  const handleWebSocketBalanceUpdate = (event: CustomEvent) => {
    const { balance, amount, type } = event.detail;
    
    // Update analytics
    if (state.analytics) {
      let updatedAnalytics = { ...state.analytics, currentBalance: balance };
      
      // Update profit/loss based on transaction type
      if (type === 'win') {
        updatedAnalytics.todayProfit += amount;
        updatedAnalytics.totalWinnings += amount;
      } else if (type === 'loss') {
        updatedAnalytics.todayProfit += amount; // amount is negative
        updatedAnalytics.totalLosses += Math.abs(amount);
      } else if (type === 'deposit') {
        updatedAnalytics.totalDeposits += amount;
      } else if (type === 'withdrawal') {
        updatedAnalytics.totalWithdrawals += amount;
      }
      
      dispatch({
        type: 'SET_ANALYTICS',
        payload: updatedAnalytics
      });
    }
  };

  window.addEventListener('balance-updated', handleBalanceUpdate as EventListener);
  window.addEventListener('balance-websocket-update', handleWebSocketBalanceUpdate as EventListener);
  
  return () => {
    window.removeEventListener('balance-updated', handleBalanceUpdate as EventListener);
    window.removeEventListener('balance-websocket-update', handleWebSocketBalanceUpdate as EventListener);
  };
}, [state.analytics]);

// Enhance refreshData to include balance refresh
const refreshData = async () => {
  await Promise.all([
    fetchUserProfile(),
    fetchAnalytics(),
    fetchBonusInfo(),
    fetchReferralData(),
    fetchTransactions(false),
    fetchGameHistory(false)
  ]);
  
  // Trigger balance refresh
  window.dispatchEvent(new CustomEvent('balance-refresh-requested', {
    detail: { source: 'profile-refresh', timestamp: Date.now() }
  }));
};
```

### 6. Update player-game.tsx

```typescript
// In player-game.tsx, add these enhancements:

import { useBalance } from '../contexts/BalanceContext';

// Inside the PlayerGame component:

const { balance, updateBalance } = useBalance();

// Update user balance from BalanceContext
useEffect(() => {
  if (balance !== userBalance) {
    setUserBalance(balance);
  }
}, [balance, userBalance]);

// Enhance handlePlaceBet with balance validation
const handlePlaceBet = useCallback(async (position: BetSide) => {
  if (selectedBetAmount === 0) {
    showNotification('Please select a chip first', 'error');
    return;
  }

  if (gameState.phase !== 'betting') {
    showNotification(`Betting is not open - Current phase: ${gameState.phase}`, 'error');
    return;
  }

  if (gameState.bettingLocked) {
    showNotification('Betting period has ended. Waiting for cards to be dealt.', 'error');
    return;
  }

  // Validate balance with server before placing bet
  try {
    const balanceCheck = await apiClient.get<{success: boolean, balance: number}>('/user/balance');
    if (!balanceCheck.success || balanceCheck.balance < selectedBetAmount) {
      showNotification('Insufficient balance', 'error');
      // Update local balance if different
      if (balanceCheck.success && balanceCheck.balance !== balance) {
        updateBalance(balanceCheck.balance, 'api');
      }
      return;
    }
  } catch (error) {
    showNotification('Failed to validate balance. Please try again.', 'error');
    return;
  }

  setIsPlacingBet(true);

  try {
    // Place bet via WebSocket for game logic
    await placeBetWebSocket(position, selectedBetAmount);

    showNotification(`Bet placed: ₹${selectedBetAmount} on ${position}`, 'success');
  } catch (error) {
    showNotification('Failed to place bet', 'error');
  } finally {
    setIsPlacingBet(false);
  }
}, [selectedBetAmount, gameState, placeBetWebSocket, showNotification, balance, updateBalance]);

// Listen for balance updates
useEffect(() => {
  const handleBalanceUpdate = (event: CustomEvent) => {
    const { balance: newBalance, source } = event.detail;
    setUserBalance(newBalance);
  };

  window.addEventListener('balance-updated', handleBalanceUpdate as EventListener);
  return () => window.removeEventListener('balance-updated', handleBalanceUpdate as EventListener);
}, []);
```

### 7. Update profile.tsx

```typescript
// In profile.tsx, add these enhancements:

import { useBalance } from '../contexts/BalanceContext';

// Inside the Profile component:

const { balance, refreshBalance } = useBalance();

// Use balance from BalanceContext instead of analytics
const currentBalance = balance;

// Update the balance display
<div className="text-4xl font-bold text-gold">
  {formatCurrency(currentBalance)}
</div>

// Add refresh button for balance
<Button
  onClick={refreshBalance}
  variant="outline"
  size="sm"
  className="border-gold/30 text-gold hover:bg-gold/10"
  disabled={isLoading}
>
  <RefreshCw className="w-4 h-4 mr-2" />
  Refresh Balance
</Button>

// Listen for balance updates
useEffect(() => {
  const handleBalanceUpdate = (event: CustomEvent) => {
    const { balance: newBalance, source } = event.detail;
    console.log('Profile page received balance update:', newBalance, 'from', source);
  };

  window.addEventListener('balance-updated', handleBalanceUpdate as EventListener);
  return () => window.removeEventListener('balance-updated', handleBalanceUpdate as EventListener);
}, []);
```

### 8. Update App.tsx

```typescript
// In App.tsx, add BalanceProvider to the provider hierarchy:

import { BalanceProvider } from './contexts/BalanceContext';

// Wrap the existing providers with BalanceProvider
<AppProviders>
  <BalanceProvider>
    {/* existing providers */}
  </BalanceProvider>
</AppProviders>
```

### 9. Server-Side Enhancements

```typescript
// In server/routes.ts, add balance notification endpoints:

// Send balance update via WebSocket when balance changes
const notifyBalanceUpdate = (userId: string, newBalance: number, amount: number, type: string) => {
  const io = getIO(); // Get Socket.IO instance
  
  // Send to specific user
  io.to(userId).emit('balance_update', {
    balance: newBalance,
    amount: amount,
    type: type, // 'deposit', 'withdrawal', 'win', 'loss', 'bet'
    timestamp: new Date().toISOString()
  });
};

// In deposit/withdrawal endpoints:
// After successful balance update in database
notifyBalanceUpdate(user.id, updatedBalance, amount, 'deposit'); // or 'withdrawal'

// In game result endpoints:
// After processing game results
notifyBalanceUpdate(userId, updatedBalance, winAmount, 'win'); // or 'loss'
```

## Testing Checklist

### 1. Basic Functionality
- [ ] Balance updates correctly on profile page
- [ ] Balance updates correctly on game page
- [ ] Balance updates correctly after deposit
- [ ] Balance updates correctly after withdrawal
- [ ] Balance updates correctly after game win/loss

### 2. Real-Time Updates
- [ ] WebSocket balance updates work
- [ ] Balance updates across all open tabs
- [ ] Balance notifications appear correctly
- [ ] Balance updates during active game

### 3. Fallback Mechanisms
- [ ] API polling works when WebSocket disconnected
- [ ] Balance validation catches discrepancies
- [ ] Error handling works correctly
- [ ] localStorage synchronization works

### 4. Edge Cases
- [ ] Rapid balance changes handled correctly
- [ ] Concurrent balance updates handled
- [ ] Network disconnection handled
- [ ] Page refresh maintains correct balance

This implementation provides a comprehensive solution for real-time balance synchronization across all pages with multiple fallback mechanisms to ensure reliability.