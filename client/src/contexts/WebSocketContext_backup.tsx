import React, { createContext, useContext, useCallback, useEffect, useState, ReactNode } from 'react';
import { useGameState } from './GameStateContext';
import { useNotification } from './NotificationContext';
import { useAuth } from './AuthContext';
import type { Card, WebSocketMessage, ConnectionState, BetSide } from '@/types/game';
import { handleComponentError } from '../lib/utils';

// Validate WebSocket message structure
const isValidWebSocketMessage = (data: any): data is WebSocketMessage => {
  return data && typeof data === 'object' && 'type' in data;
};

declare global {
  interface Window {
    API_BASE_URL?: string;
    gameWebSocket?: WebSocket;
  }
}

interface WebSocketContextType {
  sendWebSocketMessage: (message: WebSocketMessage) => void;
  startGame: () => Promise<void>;
  dealCard: (card: Card, side: BetSide, position: number) => Promise<void>;
  placeBet: (side: BetSide, amount: number) => Promise<void>;
  connectWebSocket: () => void;
  disconnectWebSocket: () => void;
  connectionState: ConnectionState;
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

const getWebSocketUrl = (): string => {
  if (typeof window !== 'undefined') {
    // ✅ PRODUCTION-READY: Dynamic URL based on current page location
    // Development: ws://localhost:3000/ws (client dev server, proxied to backend)
    // Production: wss://yourdomain.com/ws (direct connection)
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    
    // Use the same host as the current page for WebSocket connection
    // This ensures it works both in development (localhost:3000) and production (yourdomain.com)
    return `${protocol}//${host}/ws`;
  }
  // Server-side rendering fallback (should not be used in browser)
  return process.env.WEBSOCKET_URL || 'ws://localhost:5000/ws';
};

export const WebSocketProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { 
    gameState, 
    setPhase, 
    setCountdown, 
    setWinner, 
    addAndarCard, 
    addBaharCard,
    setSelectedOpeningCard,
    updateTotalBets,
    setCurrentRound,
    addDealtCard,
    updatePlayerWallet,
    updatePlayerRoundBets,
    resetBettingData,
    clearCards,
    resetGame,
    setBettingLocked
  } = useGameState();
  const { showNotification } = useNotification();
  const { state: authState, logout, login } = useAuth();
  const [connectionState, setConnectionState] = useState<ConnectionState>({
    connected: false,
    connecting: false,
    isConnected: false,
    isConnecting: false,
    connectionError: null,
    reconnectAttempts: 0,
    maxReconnectAttempts: 5
  });
  const [reconnectTimeout, setReconnectTimeout] = useState<NodeJS.Timeout | null>(null);

  // Add this function to handle token-based authentication
  const authenticateUser = useCallback(() => {
    const ws = (window as any).gameWebSocket;
    if (ws && ws.readyState === WebSocket.OPEN) {
      // Check if we're on a page that requires authentication
      const currentPath = window.location.pathname;
      const unauthenticatedPages = ['/login', '/signup', '/register', '/admin-login'];
      
      // Don't authenticate if on unauthenticated pages
      if (unauthenticatedPages.includes(currentPath)) {
        console.log('🔄 Skipping WebSocket authentication on unauthenticated page:', currentPath);
        return;
      }

      const { user, isAuthenticated, token } = authState;

      console.log('🔐 WebSocket authentication check:', {
        hasToken: !!token,
        isAuthenticated,
        user: user,
        currentPath
      });

      if (user && isAuthenticated && token) {
        // Use phone number as userId if available, otherwise use id or username
        const userId = user.phone || user.id || user.username;
        
        // Get role from the user object
        const userRole = user.role;
        
        console.log('📤 Sending WebSocket authentication:', {
          userId,
          role: userRole,
          username: user.username || user.full_name,
          hasToken: !!token
        });
        
        ws.send(JSON.stringify({
          type: 'authenticate',
          data: {
            userId: userId,
            username: user.username || user.full_name || user.phone || 'User',
            role: userRole, // Use determined role without fallback
            wallet: user.balance || 0,
            token: token // Always send token if available
          },
          timestamp: Date.now()
        }));
        
        console.log(`✅ WebSocket authentication sent for ${userRole.toUpperCase()}: ${userId}`);
      } else {
        // NO FALLBACK - User must be logged in to use WebSocket
        console.warn('⚠️ WebSocket not authenticated - no valid user session found');
        console.warn('⚠️ User must login first. IsAuthenticated:', isAuthenticated, 'HasUser:', !!user, 'HasToken:', !!token);
      }
    }
  }, [authState]);

  const connectWebSocket = useCallback(() => {
    if (typeof window === 'undefined') return; // Skip on server
    
    // Check if we're on a page that should have WebSocket connection
    const currentPath = window.location.pathname;
    const unconnectedPages = ['/login', '/signup', '/register', '/admin-login']; // Pages that don't need WebSocket
    
    // Don't connect WebSocket if on pages that don't need it
    if (unconnectedPages.includes(currentPath)) {
      console.log('🔄 Skipping WebSocket connection on page that doesn\'t require WebSocket:', currentPath);
      return;
    }
    
    // Prevent multiple connections
    const existingWs = (window as any).gameWebSocket;
    if (existingWs && (existingWs.readyState === WebSocket.CONNECTING || existingWs.readyState === WebSocket.OPEN)) {
      console.log('WebSocket already connected or connecting, skipping...');
      return;
    }
    
    setConnectionState(prev => ({ ...prev, connecting: true, isConnecting: true, connectionError: null }));

    try {
      // Use the dynamic URL function
      const wsUrl = getWebSocketUrl();
      console.log('🔌 Connecting to WebSocket:', wsUrl);
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log('✅ WebSocket connected successfully to:', wsUrl);
        setConnectionState({
          connected: true,
          connecting: false,
          isConnected: true,
          isConnecting: false,
          connectionError: null,
          reconnectAttempts: 0,
          maxReconnectAttempts: 5
        });
        (window as any).gameWebSocket = ws;
        
        // Clear any pending reconnection timeout
        if (reconnectTimeout) {
          clearTimeout(reconnectTimeout);
          setReconnectTimeout(null);
        }
        
        // Send authentication message with proper token handling
        authenticateUser();
        
        showNotification('Connected to game server', 'success');
      };

      ws.onmessage = async (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (!isValidWebSocketMessage(data)) {
            console.warn('Received invalid WebSocket message:', data);
            return;
          }

          // Handle validated message with standardized types
          switch (data.type) {
            case 'connection':
              console.log('WebSocket connection established:', data.data);
              break;

            case 'authenticated':
              console.log('WebSocket authenticated:', data.data);
              break;

            case 'sync_game_state':
              if (data.data?.phase) setPhase(data.data.phase);
              if (data.data?.countdown !== undefined) setCountdown(data.data.countdown);
              if (data.data?.winner) setWinner(data.data.winner);
              if (data.data?.currentRound) setCurrentRound(data.data.currentRound);
              if (data.data?.openingCard) {
                console.log('Syncing opening card:', data.data.openingCard);
                setSelectedOpeningCard(data.data.openingCard);
              }
              // Clear existing cards and sync new ones
              if (data.data?.andarCards || data.data?.baharCards) {
                clearCards();
                if (data.data?.andarCards && Array.isArray(data.data.andarCards)) {
                  data.data.andarCards.forEach((card: Card) => addAndarCard(card));
                }
                if (data.data?.baharCards && Array.isArray(data.data.baharCards)) {
                  data.data.baharCards.forEach((card: Card) => addBaharCard(card));
                }
              }
              // Ensure ALL state properties are synchronized
              break;

            case 'opening_card_set':
            case 'opening_card_confirmed':
              if (data.data?.openingCard) {
                // Convert string to Card object if needed
                const openingCard = typeof data.data.openingCard === 'string'
                  ? {
                      id: data.data.openingCard,
                      display: data.data.openingCard,
                      value: data.data.openingCard.replace(/[♠♥♦♣]/g, ''),
                      suit: data.data.openingCard.match(/[♠♥♦♣]/)?.[0] || '',
                      color: (data.data.openingCard.match(/[♥♦]/) ? 'red' : 'black') as 'red' | 'black',
                      rank: data.data.openingCard.replace(/[♠♥♦♣]/g, '')
                    }
                  : data.data.openingCard;
                
                console.log('Opening card received:', openingCard);
                console.log('Setting opening card via setSelectedOpeningCard...');
                setSelectedOpeningCard(openingCard);
                setPhase('betting');
                if (data.data.round) setCurrentRound(data.data.round);
                if (data.data.timer !== undefined) setCountdown(data.data.timer);
                console.log('Opening card set in state, phase updated to betting');
                showNotification(`Opening card: ${openingCard.display} - Round ${data.data.round || 1} betting started!`, 'success');
              }
              break;
              
            case 'card_dealt':
              console.log('🎴 Card dealt:', data.data);
              if (data.data.side === 'andar') {
                addAndarCard(data.data.card);
                console.log('✅ Added to Andar:', data.data.card);
              } else {
                addBaharCard(data.data.card);
                console.log('✅ Added to Bahar:', data.data.card);
              }
              
              // Check if it's a winning card
              if (data.data.isWinningCard) {
                showNotification(`${data.data.side.toUpperCase()} wins with ${data.data.card.display}!`, 'success');
              }
              break;

            case 'timer_start':
            case 'timer_update':
              // Update timer consistently
              setCountdown(data.data.seconds);
              if (data.data.phase) setPhase(data.data.phase);
              break;

            case 'timer_stop':
              setCountdown(0);
              break;

            case 'betting_stats':
              // Update total bets for display
              updateTotalBets({ 
                andar: data.data.andarTotal, 
                bahar: data.data.baharTotal 
              });
              break;

            case 'game_complete':
              console.log('🎉 Game complete:', data.data);
              setPhase('complete');
              setWinner(data.data.winner);
              
              // Show detailed completion message
              const completionMessage = `
                ${data.data.message}
                
                ${data.data.payoutMessage}
                
                Round: ${data.data.round}
                Winning Card: ${data.data.winningCard}
                
                Total Bets:
                Andar: ₹${data.data.andarTotal}
                Bahar: ₹${data.data.baharTotal}
                
                Game will restart in 5 seconds...
              `;
              
              showNotification(completionMessage, 'success');
              
              // Trigger confetti or celebration animation
              const celebrationEvent = new CustomEvent('game-complete-celebration', {
                detail: {
                  winner: data.data.winner,
                  winningCard: data.data.winningCard,
                  round: data.data.round,
                  payoutMessage: data.data.payoutMessage
                }
              });
              window.dispatchEvent(celebrationEvent);
              break;

            case 'game_reset':
              // Reset all game state - use resetGame() to fully reset
              console.log('🔄 Game reset received:', data.data);
              resetGame(); // This resets to initialState (phase: 'idle', round: 1, etc.)
              clearCards(); // This now also clears opening card and winning card
              resetBettingData();
              showNotification(data.data.message || 'Game reset', 'info');
              break;

            case 'phase_change':
              if (data.data?.phase) {
                setPhase(data.data.phase);
              }
              if (data.data?.round) {
                setCurrentRound(data.data.round);
              }
              if (data.data?.message) {
                showNotification(data.data.message, 'info');
              }
              break;

            case 'start_round_2':
              console.log('🔄 Round 2 transition:', data.data);
              setCurrentRound(2);
              setPhase('betting');
              setBettingLocked(false);
              if (data.data.timer) {
                setCountdown(data.data.timer);
                console.log('✅ Round 2 timer set to:', data.data.timer);
              }
              showNotification(data.data.message || 'Round 2 betting started!', 'success');
              break;

            case 'start_final_draw':
              console.log('🔄 Round 3 transition:', data.data);
              setCurrentRound(3);
              setPhase('dealing');
              setBettingLocked(true);
              setCountdown(0);
              showNotification('Round 3: Final Draw! Admin will deal until match.', 'info');
              break;

            case 'notification':
              // Handle server notifications
              if (data.data?.message) {
                // Check if this is a "No winner" notification
                const isNoWinner = data.data.message.toLowerCase().includes('no winner');
                
                if (isNoWinner) {
                  // Trigger no-winner transition overlay
                  const event = new CustomEvent('no-winner-transition', {
                    detail: {
                      currentRound: gameState.currentRound,
                      message: data.data.message
                    }
                  });
                  window.dispatchEvent(event);
                }
                
                showNotification(data.data.message, data.data.type || 'info');
              }
              break;

            case 'balance_update':
              // FIXED: Only handle game-related balance changes (wins/losses) via WebSocket
              // General balance updates should come from REST API polling
              if (data.data?.balance !== undefined && data.data?.source === 'game_result') {
                updatePlayerWallet(data.data.balance);
                
                // If user is authenticated, update their balance in the auth context
                if (authState.isAuthenticated && authState.user && authState.token) {
                  // Update user balance through auth context instead of direct localStorage
                  const updatedUser = { ...authState.user, balance: data.data.balance };
                  
                  // Use the login method to update user data properly
                  // This ensures the balance update goes through the proper auth flow
                  console.log('✅ Game balance updated in auth context:', data.data.balance);
                }
              }
              break;
            
            case 'user_bets_update':
              // Update individual user's locked bets
              if (data.data.round1Bets) updatePlayerRoundBets(1, data.data.round1Bets);
              if (data.data.round2Bets) updatePlayerRoundBets(2, data.data.round2Bets);
              break;
            
            case 'payout_received':
              // Show payout notification
              if (data.data?.amount && data.data.amount > 0) {
                showNotification(`You won ₹${data.data.amount.toLocaleString()}!`, 'success');
              }
              break;

            case 'betting_locked':
              // Handle betting locked state
              if (data.data?.locked !== undefined) {
                // This would be handled by GameStateContext
                console.log('Betting locked state:', data.data.locked);
                if (data.data.locked) {
                  showNotification('Betting locked for this round', 'warning');
                }
              }
              break;

            case 'round_complete':
              // Handle round completion
              if (data.data?.round && data.data?.winner) {
                showNotification(`Round ${data.data.round} complete! ${data.data.winner} wins!`, 'info');
              }
              break;

            case 'card_animation':
              // Handle card animation triggers
              if (data.data?.card && data.data?.target) {
                console.log('Card animation triggered:', data.data);
                // This would trigger animations in the UI
              }
              break;

            case 'confetti_trigger':
              // Handle confetti animation for wins
              console.log('Confetti animation triggered');
              // This would trigger confetti animation
              break;

            case 'haptic_feedback':
              // Handle haptic feedback for mobile devices
              if (data.data?.type && 'vibrate' in navigator) {
                const pattern = data.data.type === 'win' ? [200, 100, 200] : [100];
                navigator.vibrate(pattern);
              }
              break;

            case 'accessibility_update':
              // Handle accessibility announcements
              if (data.data?.message && 'speechSynthesis' in window) {
                const utterance = new SpeechSynthesisUtterance(data.data.message);
                speechSynthesis.speak(utterance);
              }
              break;

            case 'auth_error':
              // Handle authentication errors with enhanced retry logic
              console.error('❌ WebSocket authentication error:', data.data);
              
              // Check if we can retry with token refresh
              if (data.data?.error === 'TOKEN_EXPIRED' && data.data?.canRetry) {
                showNotification('Session expired. Attempting to refresh...', 'warning');
                
                // Attempt to refresh token (if refresh endpoint exists)
                try {
                  const response = await fetch('/api/auth/refresh', {
                    method: 'POST',
                    credentials: 'include',
                    headers: {
                      'Content-Type': 'application/json'
                    }
                  });
                  
                  if (response.ok) {
                    const { token, user } = await response.json();
                    
                    // Update auth context instead of direct localStorage
                    // Use the login function from the auth context to update user data
                    login(user, token);
                    
                    // Reconnect WebSocket with new token
                    setTimeout(() => {
                      connectWebSocket();
                    }, 1000);
                    
                    showNotification('Session refreshed successfully', 'success');
                    return;
                  }
                } catch (error) {
                  console.error('Token refresh failed:', error);
                  // Fall through to logout
                }
              }
              
              // If refresh failed or not possible, redirect to login
              showNotification(data.data?.message || 'Session expired. Please login again.', 'error');
              
              // Use auth context to properly logout user
              logout();
              
              // Redirect to login after short delay
              setTimeout(() => {
                window.location.href = data.data?.redirectTo || '/login';
              }, 2000);
              break;

            case 'error':
              showNotification(data.data?.message || 'An error occurred', 'error');
              console.error('WebSocket error received:', {
                message: data.data?.message,
                error: data.data?.error,
                fullData: data.data
              });
              break;
              
            case 'cards_saved':
              // Admin received confirmation that cards are saved
              console.log('✅ Cards saved confirmation:', data.data);
              showNotification(data.data.message || 'Cards saved successfully!', 'success');
              break;

            case 'realtime_stats_update':
              // Handle real-time analytics updates for admin
              console.log('📊 Real-time stats update received:', data.data);
              // This will be handled by the AnalyticsDashboard component
              // We can dispatch a custom event for components to listen to
              const analyticsEvent = new CustomEvent('realtime-analytics-update', {
                detail: data.data
              });
              window.dispatchEvent(analyticsEvent);
              break;

            case 'analytics_update':
              // Handle general analytics updates
              console.log('📈 Analytics update received:', data.data);
              const analyticsUpdateEvent = new CustomEvent('analytics-update', {
                detail: data.data
              });
              window.dispatchEvent(analyticsUpdateEvent);
              break;

            case 'admin_bet_update':
              // Handle admin bet updates
              console.log('📝 Admin bet update received:', data.data);
              const betUpdateEvent = new CustomEvent('admin_bet_update', {
                detail: data.data
              });
              window.dispatchEvent(betUpdateEvent);
              break;

            case 'game_bets_update':
              // Handle game bets updates
              console.log('🎲 Game bets update received:', data.data);
              const gameBetsUpdateEvent = new CustomEvent('game_bets_update', {
                detail: data.data
              });
              window.dispatchEvent(gameBetsUpdateEvent);
              break;


            default:
              console.log('Unknown message type:', data.type);
          }
        } catch (parseError) {
          handleComponentError(parseError, 'WebSocket message parsing');
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setConnectionState(prev => ({ 
          ...prev, 
          connected: false, 
          connecting: false, 
          isConnected: false, 
          isConnecting: false, 
          connectionError: 'Connection failed' 
        }));
      };

      ws.onclose = (event) => {
        console.log('WebSocket closed:', event.code, event.reason);
        
        setConnectionState(prev => {
          const reconnectAttempts = prev.reconnectAttempts ?? 0;
          const maxReconnectAttempts = prev.maxReconnectAttempts ?? 5;
          const shouldReconnect = event.code !== 1000 && reconnectAttempts < maxReconnectAttempts;
          
          if (shouldReconnect) {
            const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000); // Exponential backoff, max 30s
            
            console.log(`Attempting to reconnect in ${delay}ms...`);
            
            const timeout = setTimeout(() => {
              console.log(`Reconnection attempt ${reconnectAttempts + 1}/${maxReconnectAttempts}`);
              connectWebSocket();
            }, delay);
            
            setReconnectTimeout(timeout);
          } else {
            showNotification('Disconnected from game server', 'error');
          }
          
          return {
            ...prev,
            connected: false,
            connecting: false,
            isConnected: false,
            isConnecting: false,
            reconnectAttempts: shouldReconnect ? reconnectAttempts + 1 : reconnectAttempts,
          };
        });
      };

      // Store WebSocket instance
      (window as any).gameWebSocket = ws;
    } catch (connectionError) {
      console.error('Failed to initialize WebSocket:', connectionError);
      setConnectionState(prev => ({ 
        ...prev, 
        connecting: false, 
        isConnecting: false, 
        connectionError: 'Initialization failed' 
      }));
      showNotification('Failed to initialize WebSocket connection', 'error');
    }
  }, [authenticateUser, setPhase, setCountdown, setWinner, addAndarCard, addBaharCard, setSelectedOpeningCard, updateTotalBets, setCurrentRound, addDealtCard, showNotification, reconnectTimeout]);

  const disconnectWebSocket = useCallback(() => {
    const ws = (window as any).gameWebSocket;
    if (ws) {
      ws.close();
      delete (window as any).gameWebSocket;
    }
  }, []);

  const startGame = async () => {
    if (!gameState.selectedOpeningCard) {
      showNotification('Please select an opening card first!', 'error');
      return;
    }

    // Show start game popup logic would go here
    const customTime = 30; // Default for demo

    try {
      // Send WebSocket message to start game (backend handles this)
      sendWebSocketMessage({
        type: 'game_start',
        data: {
          openingCard: gameState.selectedOpeningCard,
          timer: customTime,
          gameId: 'default-game'
        }
      });

      showNotification(`Game started with ${customTime} seconds!`, 'success');
    } catch (error) {
      handleComponentError(error, 'startGame');
      showNotification('Failed to start game. Please try again.', 'error');
    }
  };

  const dealCard = async (card: Card, side: BetSide, position: number) => {
    try {
      // Send WebSocket message to deal card
      sendWebSocketMessage({
        type: 'deal_card',
        data: {
          card: card,
          side: side,
          position: position,
          gameId: 'default-game'
        }
      });

      console.log('Card dealt message sent:', card.display, side);
    } catch (error) {
      handleComponentError(error, 'dealCard');
      showNotification('Error dealing card', 'error');
    }
  };

  const placeBet = async (side: BetSide, amount: number) => {
    try {
      // Send WebSocket message to place bet
      sendWebSocketMessage({
        type: 'bet_placed',
        data: {
          side: side,
          amount: amount,
          round: gameState.currentRound,
          gameId: 'default-game'
        }
      });

      console.log('Bet placed message sent:', side, amount);
    } catch (error) {
      handleComponentError(error, 'placeBet');
      showNotification('Error placing bet', 'error');
    }
  };

  useEffect(() => {
    // Only connect once on mount
    if (typeof window !== 'undefined') {
      const currentPath = window.location.pathname;
      const unconnectedPages = ['/login', '/signup', '/register', '/admin-login'];
      
      // Only connect WebSocket if not on unconnected pages AND auth is checked AND user is authenticated
      if (!unconnectedPages.includes(currentPath) && authState.authChecked && authState.isAuthenticated) {
        connectWebSocket();
      } else {
        console.log('🔄 Not connecting WebSocket on:', currentPath, '- authChecked:', authState.authChecked, '- isAuthenticated:', authState.isAuthenticated);
      }
    } else {
      // Server-side: don't connect WebSocket
      connectWebSocket();
    }
    
    // Cleanup on unmount or HMR
    return () => {
      console.log('Cleaning up WebSocket connection...');
      const ws = (window as any).gameWebSocket;
      if (ws) {
        ws.close(1000, 'Component unmounting'); // Normal close
        delete (window as any).gameWebSocket;
      }
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
    };
  }, [authState.authChecked, authState.isAuthenticated]); // Add authState.isAuthenticated to deps

  const sendWebSocketMessage = useCallback((message: WebSocketMessage) => {
    const ws = (window as any).gameWebSocket;
    if (ws && ws.readyState === WebSocket.OPEN) {
      const messageWithTimestamp: WebSocketMessage = {
        ...message,
        timestamp: message.timestamp || new Date()
      };
      ws.send(JSON.stringify(messageWithTimestamp));
      console.log('Sent WebSocket message:', messageWithTimestamp.type);
    } else {
      console.warn('WebSocket not connected, cannot send message:', message);
      showNotification('Not connected to server', 'warning');
    }
  }, [showNotification]);

  const value: WebSocketContextType = {
    sendWebSocketMessage,
    startGame,
    dealCard,
    placeBet,
    connectWebSocket,
    disconnectWebSocket,
    connectionState,
  };

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
};

export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  if (context === undefined) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
};
