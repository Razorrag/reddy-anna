import React, { createContext, useContext, useCallback, useEffect, useState, ReactNode } from 'react';
import { useGameState } from './GameStateContext';
import { useNotification } from './NotificationContext';
import { useAuth } from './AuthContext';
import type { Card, WebSocketMessage, ConnectionState, BetSide } from '../types/game';
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
    
    // Use same host as the current page for WebSocket connection
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

  // ✅ CRITICAL FIX: Simplified and robust WebSocket authentication
  const authenticateUser = useCallback(async () => {
    const ws = (window as any).gameWebSocket;
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      console.log('🔄 WebSocket not ready for authentication');
      return;
    }

    // Check if we're on a page that requires authentication
    const currentPath = window.location.pathname;
    const unauthenticatedPages = ['/login', '/signup', '/register', '/admin-login'];
    
    if (unauthenticatedPages.includes(currentPath)) {
      console.log('🔄 Skipping WebSocket authentication on unauthenticated page:', currentPath);
      return;
    }

    const { user, isAuthenticated, token } = authState;

    console.log('🔐 WebSocket authentication check:', {
      hasToken: !!token,
      isAuthenticated,
      hasUser: !!user,
      currentPath
    });

    // ✅ CRITICAL FIX: Simple and clear authentication logic
    if (isAuthenticated && user && token) {
      try {
        // Validate token format and structure
        if (typeof token !== 'string' || token.length < 10) {
          console.error('❌ Invalid token format');
          return;
        }

        const userId = user.phone || user.id || user.username;
        const userRole = user.role || 'player';
        const username = user.username || user.full_name || user.phone || 'Player';
        const wallet = user.balance || 0;

        console.log('📤 Sending WebSocket authentication:', {
          userId,
          role: userRole,
          username,
          wallet
        });
        
        ws.send(JSON.stringify({
          type: 'authenticate',
          data: {
            userId: userId,
            username: username,
            role: userRole,
            wallet: wallet,
            token: token
          },
          timestamp: Date.now()
        }));
        
        console.log(`✅ WebSocket authentication sent for ${userRole.toUpperCase()}: ${userId}`);
      } catch (error) {
        console.error('❌ Error during WebSocket authentication:', error);
      }
    } else {
      // ✅ CRITICAL FIX: Clear error message for debugging
      console.warn('❌ WebSocket authentication failed:', {
        isAuthenticated,
        hasUser: !!user,
        hasToken: !!token
      });
      
      // Send clear error to server
      ws.send(JSON.stringify({
        type: 'auth_error',
        data: {
          message: 'Authentication required. Please login first.',
          error: 'AUTH_REQUIRED',
          redirectTo: '/login'
        }
      }));
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
    
    setConnectionState((prev: any) => ({ ...prev, connecting: true, isConnecting: true, connectionError: null }));

    try {
      // Use dynamic URL function
      const wsUrl = getWebSocketUrl();
      console.log('🔌 Connecting to WebSocket:', wsUrl);
      console.log('🔄 WebSocket connection attempt started');
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log('✅ WebSocket connected successfully to:', wsUrl);
        console.log('🎉 WebSocket connection established - game should start now');
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

            case 'sync_game_state': {
              console.log('📥 Syncing game state:', {
                phase: data.data?.phase,
                round: data.data?.currentRound,
                openingCard: data.data?.openingCard?.display || data.data?.openingCard,
                andarCards: data.data?.andarCards?.length || 0,
                baharCards: data.data?.baharCards?.length || 0,
                winner: data.data?.winner,
                bettingLocked: data.data?.bettingLocked
              });
              
              // ✅ CRITICAL FIX: Sync all game state properties with proper validation
              if (data.data?.phase) {
                console.log('🔄 Updating phase:', data.data.phase);
                setPhase(data.data.phase);
              }
              if (data.data?.countdown !== undefined) {
                console.log('🔄 Updating countdown:', data.data.countdown);
                setCountdown(data.data.countdown);
              }
              if (data.data?.winner) {
                console.log('🔄 Updating winner:', data.data.winner);
                setWinner(data.data.winner);
              }
              if (data.data?.currentRound) {
                console.log('🔄 Updating current round:', data.data.currentRound);
                setCurrentRound(data.data.currentRound);
              }
              if (data.data?.bettingLocked !== undefined) {
                console.log('🔄 Updating betting locked:', data.data.bettingLocked);
                setBettingLocked(data.data.bettingLocked);
              }
              
              // ✅ CRITICAL FIX: Sync opening card with proper validation
              if (data.data?.openingCard) {
                console.log('✅ Syncing opening card:', data.data.openingCard);
                setSelectedOpeningCard(data.data.openingCard);
              }
              
              // ✅ CRITICAL FIX: Clear existing cards and sync new ones
              if (data.data?.andarCards || data.data?.baharCards) {
                console.log('🔄 Clearing existing cards and syncing new ones');
                clearCards();
                if (data.data?.andarCards && Array.isArray(data.data.andarCards)) {
                  console.log(`✅ Syncing ${data.data.andarCards.length} Andar cards`);
                  data.data.andarCards.forEach((card: Card) => {
                    console.log('Adding Andar card:', card);
                    addAndarCard(card);
                  });
                }
                if (data.data?.baharCards && Array.isArray(data.data.baharCards)) {
                  console.log(`✅ Syncing ${data.data.baharCards.length} Bahar cards`);
                  data.data.baharCards.forEach((card: Card) => {
                    console.log('Adding Bahar card:', card);
                    addBaharCard(card);
                  });
                }
              }
              
              // ✅ CRITICAL FIX: Sync betting totals with proper structure
              if (data.data?.andarTotal !== undefined || data.data?.baharTotal !== undefined) {
                const andarTotal = data.data.andarTotal || 0;
                const baharTotal = data.data.baharTotal || 0;
                console.log('🔄 Updating betting totals:', { andarTotal, baharTotal });
                updateTotalBets({
                  andar: andarTotal,
                  bahar: baharTotal
                });
              }
              
              // ✅ CRITICAL FIX: Sync round-specific bets if available
              if (data.data?.round1Bets) {
                console.log('🔄 Syncing round 1 bets:', data.data.round1Bets);
                // Note: updateRoundBets function may not be available in this context
                // This would be handled by the GameStateContext if needed
              }
              if (data.data?.round2Bets) {
                console.log('🔄 Syncing round 2 bets:', data.data.round2Bets);
                // Note: updateRoundBets function may not be available in this context
                // This would be handled by the GameStateContext if needed
              }
              
              console.log('✅ Game state synchronized successfully');
              break;
            }

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
              
              // Trigger round notification for UI
              const round2Event = new CustomEvent('round-change', {
                detail: {
                  round: 2,
                  message: 'Place additional bets!'
                }
              });
              window.dispatchEvent(round2Event);
              break;

            case 'start_final_draw':
              console.log('🔄 Round 3 transition:', data.data);
              setCurrentRound(3);
              setPhase('dealing');
              setBettingLocked(true);
              setCountdown(0);
              showNotification('Round 3: Final Draw! Admin will deal until match.', 'info');
              
              // Trigger round notification for UI (won't show for round 3 due to our filter)
              const round3Event = new CustomEvent('round-change', {
                detail: {
                  round: 3,
                  message: 'Final draw - No more betting!'
                }
              });
              window.dispatchEvent(round3Event);
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
              // Handle real-time balance updates from server
              if (data.data?.balance !== undefined) {
                console.log('🔄 Balance update received:', data.data);
                
                // Send to BalanceContext via custom event
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
                
                // Attempt to refresh token using refresh token from localStorage
                try {
                  const refreshToken = localStorage.getItem('refreshToken');
                  if (!refreshToken) {
                    throw new Error('No refresh token available');
                  }
                  
                  const response = await fetch('/api/auth/refresh', {
                    method: 'POST',
                    credentials: 'include',
                    headers: {
                      'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ refreshToken })
                  });
                  
                  if (response.ok) {
                    const { token, user } = await response.json();
                    
                    // Update auth context instead of direct localStorage
                    // Use login function from the auth context to update user data
                    login(user, token);
                    
                    // Reconnect WebSocket with new token
                    setTimeout(() => {
                      connectWebSocket();
                    }, 1000);
                    
                    showNotification('Session refreshed successfully', 'success');
                    return;
                  } else {
                    throw new Error('Token refresh failed');
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
              const errorMessage = data.data?.message || 'An error occurred';
              const errorCode = data.data?.error;
              
              // Show more specific error messages based on error code
              let displayMessage = errorMessage;
              if (errorCode === 'BET_PROCESSING_ERROR') {
                displayMessage = 'Failed to process bet. Please try again.';
              } else if (errorCode === 'INSUFFICIENT_BALANCE') {
                displayMessage = 'Insufficient balance. Please add funds to your account.';
              } else if (errorCode === 'BETTING_CLOSED') {
                displayMessage = 'Betting period has ended. Please wait for the next round.';
              }
              
              showNotification(displayMessage, 'error');
              console.error('WebSocket error received:', {
                message: data.data?.message,
                error: data.data?.error,
                errorCode: errorCode,
                fullData: data.data
              });
              break;
              
            case 'bet_success':
              // Handle successful bet placement
              if (data.data?.message) {
                showNotification(data.data.message, 'success');
              }
              
              // Update local balance if provided
              if (data.data?.newBalance !== undefined && data.data?.newBalance !== null) {
                const balanceEvent = new CustomEvent('balance-websocket-update', {
                  detail: {
                    balance: data.data.newBalance,
                    amount: data.data.amount,
                    type: 'bet',
                    timestamp: Date.now()
                  }
                });
                window.dispatchEvent(balanceEvent);
              }
              console.log('Bet success received:', data.data);
              break;
              
            case 'cards_saved':
              // Admin received confirmation that cards are saved
              console.log('✅ Cards saved confirmation:', data.data);
              showNotification(data.data.message || 'Cards saved successfully!', 'success');
              break;

            case 'realtime_stats_update':
              // Handle real-time analytics updates for admin
              console.log('📊 Real-time stats update received:', data.data);
              // This will be handled by AnalyticsDashboard component
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


            case 'stream_status':
              // Handle streaming status updates
              console.log('📺 Stream status update:', data.data);
              if (data.data?.status) {
                const statusMessage = `Stream is ${data.data.status}`;
                showNotification(statusMessage, 'info');
                
                // Dispatch stream status update event for StreamPlayer
                const streamStatusEvent = new CustomEvent('stream_status_update', {
                  detail: { status: data.data.status }
                });
                window.dispatchEvent(streamStatusEvent);
              }
              break;

            case 'webrtc_offer':
              // Handle incoming WebRTC offer from admin
              console.log('📡 Received WebRTC offer from admin:', data.data.adminId);
              // This would be handled by a stream component on the player side
              const offerEvent = new CustomEvent('webrtc_offer_received', {
                detail: data.data
              });
              window.dispatchEvent(offerEvent);
              break;

            case 'webrtc_answer':
              // Handle incoming WebRTC answer from player
              console.log('📡 Received WebRTC answer:', data.data.playerId);
              // This would be handled by admin stream component
              const answerEvent = new CustomEvent('webrtc_answer_received', {
                detail: data.data
              });
              window.dispatchEvent(answerEvent);
              break;

            case 'webrtc_ice_candidate':
              // Handle incoming WebRTC ICE candidate
              console.log('🧊 Received ICE candidate:', data.data);
              // This would be handled by stream components
              const iceEvent = new CustomEvent('webrtc_ice_candidate_received', {
                detail: data.data
              });
              window.dispatchEvent(iceEvent);
              break;

            case 'viewer_count_update':
              // Handle viewer count updates
              console.log('👥 Viewer count updated:', data.data.count);
              // This would be handled by UI components
              break;
        
            case 'screen_share_start':
              // Handle screen sharing start from admin
              console.log('🖥️ Screen sharing started by admin');
              showNotification('Admin started screen sharing', 'info');
              
              // Dispatch screen share start event for VideoArea component
              const screenShareStartEvent = new CustomEvent('screen-share-start', {
                detail: {
                  isActive: true,
                  adminId: data.data?.adminId,
                  timestamp: Date.now()
                }
              });
              window.dispatchEvent(screenShareStartEvent);
              break;
        
            case 'screen_share_stop':
              // Handle screen sharing stop from admin
              console.log('🖥️ Screen sharing stopped by admin');
              showNotification('Admin stopped screen sharing', 'info');
              
              // Dispatch screen share stop event for VideoArea component
              const screenShareStopEvent = new CustomEvent('screen-share-stop', {
                detail: {
                  isActive: false,
                  timestamp: Date.now()
                }
              });
              window.dispatchEvent(screenShareStopEvent);
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
        setConnectionState((prev: any) => ({
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
        
        // Clear the stored WebSocket reference
        delete (window as any).gameWebSocket;
        
        setConnectionState(prev => {
          const reconnectAttempts = prev.reconnectAttempts ?? 0;
          const maxReconnectAttempts = prev.maxReconnectAttempts ?? 5;
          const shouldReconnect = event.code !== 1000 && reconnectAttempts < maxReconnectAttempts;
          
          if (shouldReconnect) {
            // Aggressive reconnection for game functionality
            const delay = Math.min(1000 * Math.pow(1.5, reconnectAttempts), 10000); // Faster reconnection, max 10s
            
            console.log(`🔄 Attempting to reconnect in ${delay}ms... (attempt ${reconnectAttempts + 1}/${maxReconnectAttempts})`);
            
            const timeout = setTimeout(() => {
              console.log(`🔄 Reconnection attempt ${reconnectAttempts + 1}/${maxReconnectAttempts}`);
              connectWebSocket();
            }, delay);
            
            setReconnectTimeout(timeout);
          }
          
          return {
            ...prev,
            connected: false,
            connecting: false,
            isConnected: false,
            isConnecting: false,
            reconnectAttempts: shouldReconnect ? reconnectAttempts + 1 : reconnectAttempts,
            maxReconnectReached: !shouldReconnect && reconnectAttempts >= maxReconnectAttempts,
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
      // Validate inputs before sending
      if (!side || (side !== 'andar' && side !== 'bahar')) {
        showNotification('Invalid bet side. Must be andar or bahar', 'error');
        return;
      }
      
      if (!amount || amount <= 0) {
        showNotification('Invalid bet amount. Must be greater than 0', 'error');
        return;
      }
      
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

  useEffect(() => {
    // Connect WebSocket immediately on game pages, handle auth inside WebSocket
    if (typeof window !== 'undefined') {
      const currentPath = window.location.pathname;
      const unconnectedPages = ['/login', '/signup', '/register', '/admin-login'];
      
      // Connect WebSocket immediately on game pages regardless of auth state
      // Authentication will be handled within the WebSocket connection
      if (!unconnectedPages.includes(currentPath)) {
        console.log('🔄 Connecting WebSocket immediately on game page:', currentPath);
        connectWebSocket();
      } else {
        console.log('🔄 Skipping WebSocket connection on:', currentPath);
      }
    } else {
      // Server-side: don't connect WebSocket
      connectWebSocket();
    }

    // Setup event listeners for WebRTC answers
    const handleWebRTCAnswerReady = (event: any) => {
      const { answer } = event.detail;
      if (answer) {
        sendWebSocketMessage({
          type: 'webrtc_answer',
          data: {
            answer: answer
          }
        });
      }
    };

    window.addEventListener('webrtc_answer_ready', handleWebRTCAnswerReady as EventListener);

    // Cleanup on unmount or HMR
    return () => {
      window.removeEventListener('webrtc_answer_ready', handleWebRTCAnswerReady as EventListener);
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
  }, []); // REMOVE authentication dependencies to break deadlock

  // Show notification when max reconnect attempts reached
  useEffect(() => {
    if (connectionState.maxReconnectReached) {
      showNotification('Disconnected from game server', 'error');
    }
  }, [connectionState.maxReconnectReached, showNotification]);

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