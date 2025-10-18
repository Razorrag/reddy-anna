import React, { createContext, useContext, useCallback, useEffect, ReactNode } from 'react';
import { useGameState } from './GameStateContext';

interface Card {
  suit: string;
  value: string;
  display: string;
}

declare global {
  interface Window {
    API_BASE_URL?: string;
    gameWebSocket?: WebSocket;
  }
}

interface WebSocketContextType {
  sendWebSocketMessage: (message: any) => void;
  startGame: () => Promise<void>;
  dealCard: (card: Card, side: 'andar' | 'bahar', position: number) => Promise<void>;
  connectWebSocket: () => void;
  disconnectWebSocket: () => void;
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

export const WebSocketProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { gameState, setPhase, setCountdown, setWinner, addAndarCard, addBaharCard } = useGameState();
  
  const showNotification = useCallback((message: string, type: 'success' | 'error' | 'info') => {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    // Style the notification
    Object.assign(notification.style, {
      position: 'fixed',
      top: '20px',
      right: '20px',
      padding: '15px 25px',
      borderRadius: '10px',
      color: 'white',
      fontFamily: 'Poppins, sans-serif',
      zIndex: '1000',
      transform: 'translateX(400px)',
      transition: 'transform 0.3s ease',
    });
    
    // Add gradient background based on type
    if (type === 'success') {
      notification.style.background = 'linear-gradient(45deg, #28a745, #20c997)';
    } else if (type === 'error') {
      notification.style.background = 'linear-gradient(45deg, #dc3545, #fd7e14)';
    } else {
      notification.style.background = 'linear-gradient(45deg, #17a2b8, #20c997)';
    }
    
    document.body.appendChild(notification);
    
    // Animate in
    setTimeout(() => {
      notification.style.transform = 'translateX(0)';
    }, 100);
    
    // Remove after 3 seconds
    setTimeout(() => {
      notification.style.transform = 'translateX(400px)';
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }, 3000);
  }, []);

  const connectWebSocket = useCallback(() => {
    try {
      const ws = new WebSocket('ws://localhost:8080');
      
      ws.onopen = () => {
        console.log('WebSocket connected');
        showNotification('Connected to game server', 'success');
      };
      
      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        
        switch (data.type) {
          case 'gameState':
            // Update game state based on server message
            if (data.phase) setPhase(data.phase);
            if (data.countdown !== undefined) setCountdown(data.countdown);
            if (data.winner) setWinner(data.winner);
            break;
            
          case 'cardDealt':
            // Handle card dealt message
            if (data.side === 'andar') {
              addAndarCard(data.card);
            } else {
              addBaharCard(data.card);
            }
            break;
            
          case 'gameComplete':
            // Handle game complete message
            setWinner(data.winner);
            showNotification(`Game complete! ${data.winner.toUpperCase()} wins!`, 'success');
            break;
            
          default:
            console.log('Unknown message type:', data.type);
        }
      };
      
      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        showNotification('Connection error', 'error');
      };
      
      ws.onclose = () => {
        console.log('WebSocket disconnected');
        showNotification('Disconnected from game server', 'info');
      };
      
      // Store websocket instance for later use
      (window as any).gameWebSocket = ws;
      
    } catch (error) {
      console.error('Failed to connect WebSocket:', error);
      showNotification('Failed to connect to game server', 'error');
    }
  }, [showNotification, setPhase, setCountdown, setWinner, addAndarCard, addBaharCard]);

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
      // Set opening card in backend
      await fetch(`${window.API_BASE_URL || 'http://localhost:5000'}/api/game/set-opening-card`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          card: gameState.selectedOpeningCard.display,
          game_id: 'default-game'
        })
      });

      // Start timer in backend
      await fetch(`${window.API_BASE_URL || 'http://localhost:5000'}/api/game/start-timer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          duration: customTime,
          phase: 'betting',
          game_id: 'default-game'
        })
      });

      showNotification(`Game started with ${customTime} seconds!`, 'success');

      setPhase('betting');
      setCountdown(customTime);
    } catch (error) {
      console.error('Error starting game:', error);
      showNotification('Error starting game', 'error');
    }
  };

  const dealCard = async (card: Card, side: 'andar' | 'bahar', position: number) => {
    try {
      const response = await fetch(`${window.API_BASE_URL || 'http://localhost:5000'}/api/game/deal-card`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          card: card.display,
          side: side,
          position: position,
          game_id: 'default-game'
        })
      });

      const result = await response.json();
      if (result.success) {
        console.log('Card dealt successfully:', result);

        // Update local state
        if (side === 'andar') {
          addAndarCard(card);
        } else {
          addBaharCard(card);
        }

        if (result.data.isWinningCard) {
          showNotification(`Game complete! ${side.toUpperCase()} wins with ${card.display}!`, 'success');
          setWinner(side);
          setPhase('complete');
        }
      } else {
        showNotification('Failed to deal card in backend', 'error');
      }
    } catch (error) {
      console.error('Error dealing card:', error);
      showNotification('Error dealing card', 'error');
    }
  };

  useEffect(() => {
    connectWebSocket();
    
    return () => {
      disconnectWebSocket();
    };
  }, [connectWebSocket, disconnectWebSocket]);

  const sendWebSocketMessage = useCallback((message: any) => {
    const ws = (window as any).gameWebSocket;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket not connected, cannot send message:', message);
    }
  }, []);

  const value: WebSocketContextType = {
    sendWebSocketMessage,
    startGame,
    dealCard,
    connectWebSocket,
    disconnectWebSocket,
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
