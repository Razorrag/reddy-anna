/**
 * Stream WebSocket Handler
 * 
 * Manages WebSocket connections for real-time streaming updates
 * Integrates with both the stream system and game state
 */

import { useEffect, useRef } from 'react';

interface StreamWebSocketHandlerProps {
  onStreamStatusChange?: (status: string) => void;
  onViewerCountChange?: (count: number) => void;
  onGameEvent?: (event: any) => void;
  token?: string;
}

export const useStreamWebSocket = ({
  onStreamStatusChange,
  onViewerCountChange,
  onGameEvent,
  token
}: StreamWebSocketHandlerProps) => {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const connect = () => {
    if (!token) {
      console.warn('No authentication token provided for WebSocket connection');
      return;
    }

    // Determine the appropriate WebSocket URL based on environment
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${wsProtocol}//${window.location.hostname}:5000/ws`;
    
    try {
      wsRef.current = new WebSocket(`${wsUrl}?token=${encodeURIComponent(token)}`);
      
      wsRef.current.onopen = () => {
        console.log('✅ Stream WebSocket connected');
      };
      
      wsRef.current.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          handleWebSocketMessage(message);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };
      
      wsRef.current.onclose = () => {
        console.log('⚠️ Stream WebSocket disconnected');
        // Attempt to reconnect after 3 seconds
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
        }
        reconnectTimeoutRef.current = setTimeout(connect, 3000);
      };
      
      wsRef.current.onerror = (error) => {
        console.error('❌ Stream WebSocket error:', error);
      };
      
    } catch (error) {
      console.error('Failed to establish WebSocket connection:', error);
      // Attempt to reconnect after 3 seconds
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      reconnectTimeoutRef.current = setTimeout(connect, 3000);
    }
  };

  const disconnect = () => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  };

  const handleWebSocketMessage = (message: any) => {
    switch (message.type) {
      case 'stream_status':
        onStreamStatusChange?.(message.data.status);
        break;
      case 'viewer_count_update':
        onViewerCountChange?.(message.data.count);
        break;
      case 'game_event':
        onGameEvent?.(message.data);
        break;
      case 'webrtc_offer':
      case 'webrtc_answer':
      case 'webrtc_ice_candidate':
        // These are handled by the WebRTC client
        break;
      default:
        console.log('Received unknown WebSocket message:', message);
    }
  };

  const sendStreamCommand = (command: string, data?: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: command, data }));
    } else {
      console.warn('WebSocket not connected, cannot send command:', command);
    }
  };

  useEffect(() => {
    if (token) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [token]);

  return {
    connect,
    disconnect,
    sendStreamCommand,
    isConnected: wsRef.current?.readyState === WebSocket.OPEN
  };
};