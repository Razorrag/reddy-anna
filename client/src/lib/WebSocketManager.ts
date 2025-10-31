import { tokenManager } from './TokenManager';

// Browser-compatible event system (replaces Node.js EventEmitter)
class BrowserEventEmitter {
  private events: Map<string, Array<(...args: any[]) => void>> = new Map();

  on(event: string, listener: (...args: any[]) => void): this {
    if (!this.events.has(event)) {
      this.events.set(event, []);
    }
    this.events.get(event)!.push(listener);
    return this;
  }

  off(event: string, listener: (...args: any[]) => void): this {
    const listeners = this.events.get(event);
    if (listeners) {
      const index = listeners.indexOf(listener);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
    return this;
  }

  emit(event: string, ...args: any[]): boolean {
    const listeners = this.events.get(event);
    if (listeners) {
      listeners.forEach(listener => listener(...args));
      return true;
    }
    return false;
  }

  once(event: string, listener: (...args: any[]) => void): this {
    const wrapper = (...args: any[]) => {
      listener(...args);
      this.off(event, wrapper);
    };
    this.on(event, wrapper);
    return this;
  }

  removeAllListeners(event?: string): this {
    if (event) {
      this.events.delete(event);
    } else {
      this.events.clear();
    }
    return this;
  }
}

// Define connection states
export enum ConnectionStatus {
  DISCONNECTED = 'DISCONNECTED',
  CONNECTING = 'CONNECTING',
  CONNECTED = 'CONNECTED',
  RECONNECTING = 'RECONNECTING',
  ERROR = 'ERROR',
}

interface WebSocketManagerOptions {
  url: string;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  tokenProvider?: () => Promise<string | null>;
  refreshTokenProvider?: () => Promise<string | null>;
  onMessage?: (event: MessageEvent) => void;
  onOpen?: (event: Event) => void;
  onClose?: (event: CloseEvent) => void;
  onError?: (event: Event) => void;
}

class WebSocketManager extends BrowserEventEmitter {
  private static instance: WebSocketManager;
  private ws: WebSocket | null = null;
  private status: ConnectionStatus = ConnectionStatus.DISCONNECTED;
  private reconnectAttempts: number = 0;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private activityPingInterval: NodeJS.Timeout | null = null;
  private tokenRefreshTimeout: NodeJS.Timeout | null = null;
  private lastActivityTime: number = 0;
  private options: WebSocketManagerOptions;
  private isExplicitlyClosed: boolean = false;
  private tokenUnsubscribe: (() => void) | null = null;
  private isReAuthenticating: boolean = false;

  private constructor(options: WebSocketManagerOptions) {
    super();
    this.options = {
      reconnectInterval: 3000, // Default reconnect interval
      maxReconnectAttempts: 10, // Default max attempts
      ...options,
    };
    
    // Subscribe to token changes for automatic re-authentication
    this.tokenUnsubscribe = tokenManager.subscribeAccessToken((token) => {
      this.handleTokenChange(token);
    });
  }

  public static getInstance(options?: WebSocketManagerOptions): WebSocketManager {
    if (!WebSocketManager.instance) {
      if (!options) {
        throw new Error("WebSocketManager must be initialized with options the first time getInstance is called.");
      }
      WebSocketManager.instance = new WebSocketManager(options);
    } else if (options) {
      // If instance already exists, update options if provided (e.g., tokenProvider might change)
      Object.assign(WebSocketManager.instance.options, options);
    }
    return WebSocketManager.instance;
  }

  public getStatus(): ConnectionStatus {
    return this.status;
  }

  public getWebSocket(): WebSocket | null {
    return this.ws;
  }

  public connect(): void {
    if (this.status === ConnectionStatus.CONNECTING || this.status === ConnectionStatus.CONNECTED) {
      console.log('WebSocketManager: Already connecting or connected.');
      return;
    }

    this.isExplicitlyClosed = false;
    this.setStatus(ConnectionStatus.CONNECTING);
    this.clearReconnectTimeout();

    const connectAttempt = async () => {
      try {
        const url = this.options.url;
        
        console.log('🔌 WebSocketManager: Connecting to', url);
        this.ws = new WebSocket(url);
        
        // Set up handlers
        this.ws.onopen = (event: Event) => {
          this.handleOpen(event);
        };
        
        this.ws.onmessage = this.handleMessage;
        this.ws.onclose = this.handleClose;
        this.ws.onerror = this.handleError;
      } catch (error) {
        console.error('WebSocketManager: Failed to create WebSocket instance:', error);
        this.setStatus(ConnectionStatus.ERROR);
        this.scheduleReconnect();
      }
    };

    connectAttempt();
  }

  /**
   * Handle token change - re-authenticate if WebSocket is connected
   */
  private handleTokenChange(newToken: string | null): void {
    // Only re-authenticate if WebSocket is connected and we're not already re-authenticating
    if (
      this.ws &&
      this.ws.readyState === WebSocket.OPEN &&
      this.status === ConnectionStatus.CONNECTED &&
      newToken &&
      !this.isReAuthenticating
    ) {
      console.log('🔄 WebSocketManager: Token updated, re-authenticating WebSocket...');
      this.reAuthenticate(newToken);
    }
  }

  /**
   * Re-authenticate WebSocket with new token
   */
  private reAuthenticate(token: string): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn('⚠️ WebSocketManager: Cannot re-authenticate - WebSocket not open');
      return;
    }

    this.isReAuthenticating = true;
    try {
      console.log('🔑 WebSocketManager: Re-authenticating with fresh token...');
      this.send({ type: 'authenticate', data: { token } });
      
      // Reset re-authenticating flag after short delay
      setTimeout(() => {
        this.isReAuthenticating = false;
      }, 1000);
    } catch (error) {
      console.error('❌ WebSocketManager: Error re-authenticating:', error);
      this.isReAuthenticating = false;
    }
  }

  public disconnect(): void {
    console.log('WebSocketManager: Disconnecting...');
    this.isExplicitlyClosed = true;
    this.clearReconnectTimeout();
    this.stopActivityMonitoring();
    this.stopTokenRefresh();
    
    // Unsubscribe from token changes
    if (this.tokenUnsubscribe) {
      this.tokenUnsubscribe();
      this.tokenUnsubscribe = null;
    }
    
    if (this.ws) {
      console.log('WebSocketManager: Explicitly closing WebSocket.');
      this.ws.close(1000, 'Explicitly closed by client');
      this.ws = null;
    }
    this.setStatus(ConnectionStatus.DISCONNECTED);
  }

  public send(message: object): void {
    // Enhanced validation with better logging
    if (!this.ws) {
      console.error('WebSocketManager: Cannot send message - WebSocket instance is null', {
        message: (message as any).type || 'unknown',
        status: this.status
      });
      this.emit('warning', 'WebSocket instance is null, message not sent.');
      return;
    }

    if (this.ws.readyState !== WebSocket.OPEN) {
      console.error('WebSocketManager: Cannot send message - WebSocket not in OPEN state', {
        message: (message as any).type || 'unknown',
        readyState: this.ws.readyState,
        status: this.status,
        readyStateText: ['CONNECTING', 'OPEN', 'CLOSING', 'CLOSED'][this.ws.readyState]
      });
      this.emit('warning', 'WebSocket not in OPEN state, message not sent.');
      return;
    }

    if (this.status !== ConnectionStatus.CONNECTED) {
      console.warn('WebSocketManager: Status mismatch - socket is OPEN but status is not CONNECTED', {
        message: (message as any).type || 'unknown',
        status: this.status,
        readyState: this.ws.readyState
      });
      // Try to fix status mismatch
      this.setStatus(ConnectionStatus.CONNECTED);
    }

    try {
      this.ws.send(JSON.stringify(message));
      this.updateLastActivity(); // Update activity on message send
      console.log('WebSocketManager: Message sent successfully:', (message as any).type || 'unknown');
    } catch (error) {
      console.error('WebSocketManager: Error sending message:', error);
      this.emit('error', error);
    }
  }
  
  public refreshToken(): void {
    if (this.ws && this.status === ConnectionStatus.CONNECTED) {
      if (this.options.refreshTokenProvider) {
        this.options.refreshTokenProvider().then(refreshToken => {
          if (refreshToken) {
            this.send({ type: 'token_refresh', data: { refreshToken } });
          } else {
            console.warn('WebSocketManager: No refresh token available');
          }
        }).catch(error => {
          console.error('WebSocketManager: Error getting refresh token:', error);
        });
      }
    } else {
      console.warn('WebSocketManager: Cannot refresh token, not connected');
    }
  }
  
  public sendActivityPing(): void {
    if (this.ws && this.status === ConnectionStatus.CONNECTED) {
      this.send({ type: 'activity_ping', data: {} });
    }
  }
  
  private updateLastActivity(): void {
    this.lastActivityTime = Date.now();
  }
  
  private startActivityMonitoring(): void {
    // Send activity ping every 2 minutes
    this.activityPingInterval = setInterval(() => {
      this.sendActivityPing();
    }, 2 * 60 * 1000);
  }
  
  private stopActivityMonitoring(): void {
    if (this.activityPingInterval) {
      clearInterval(this.activityPingInterval);
      this.activityPingInterval = null;
    }
  }
  
  private scheduleTokenRefresh(): void {
    // Schedule token refresh 5 minutes before expiry
    if (this.tokenRefreshTimeout) {
      clearTimeout(this.tokenRefreshTimeout);
    }
    
    this.tokenRefreshTimeout = setTimeout(() => {
      this.refreshToken();
    }, 5 * 60 * 1000); // 5 minutes
  }
  
  private stopTokenRefresh(): void {
    if (this.tokenRefreshTimeout) {
      clearTimeout(this.tokenRefreshTimeout);
      this.tokenRefreshTimeout = null;
    }
  }

  private setStatus(newStatus: ConnectionStatus): void {
    if (this.status !== newStatus) {
      this.status = newStatus;
      this.emit('statusChange', newStatus);
      console.log('WebSocketManager: Status changed to', newStatus);
    }
  }

  private handleOpen = (event: Event) => {
    console.log('✅ WebSocketManager: Connection opened successfully.');
    this.setStatus(ConnectionStatus.CONNECTED);
    this.reconnectAttempts = 0; // Reset attempts on successful connection
    this.options.onOpen?.(event);
    this.emit('open', event);
    
    // Start activity monitoring and token refresh scheduling
    this.startActivityMonitoring();
    this.scheduleTokenRefresh();
    this.updateLastActivity();
 
    // Authenticate immediately after connection opens
    if (this.options.tokenProvider) {
      console.log('🔐 WebSocketManager: Requesting token for authentication...');
      this.options.tokenProvider().then(token => {
        if (token) {
          // Ensure socket is still open before attempting to send auth
          if (this.ws && this.ws.readyState === WebSocket.OPEN && this.status === ConnectionStatus.CONNECTED) {
            console.log('🔑 WebSocketManager: Token received, sending authentication...');
            this.send({ type: 'authenticate', data: { token } });
          } else {
            console.warn('⚠️ WebSocketManager: Skipping auth send; socket not open anymore');
          }
        } else {
          console.warn('⚠️ WebSocketManager: No token available for authentication');
        }
      }).catch(error => {
        console.error('❌ WebSocketManager: Error getting token for authentication:', error);
      });
    } else {
      console.warn('⚠️ WebSocketManager: No token provider configured');
    }
  };

  private handleMessage = (event: MessageEvent) => {
    this.options.onMessage?.(event);
    this.emit('message', event);
  };

  private handleClose = (event: CloseEvent) => {
    console.log('WebSocketManager: Connection closed.', event.code, event.reason);
    
    // Store reference before nulling
    const wasOpen = this.ws !== null;
    this.ws = null;
    
    this.options.onClose?.(event);
    this.emit('close', event);
    
    // Stop activity monitoring and token refresh
    this.stopActivityMonitoring();
    this.stopTokenRefresh();

    if (!this.isExplicitlyClosed) {
      if (wasOpen) {
        console.log('WebSocketManager: Unexpected close - will attempt to reconnect');
      }
      this.setStatus(ConnectionStatus.RECONNECTING);
      this.scheduleReconnect();
    } else {
      console.log('WebSocketManager: Explicitly closed - not reconnecting');
      this.setStatus(ConnectionStatus.DISCONNECTED);
    }
  };

  private handleError = (event: Event) => {
    console.error('WebSocketManager: Connection error.', event);
    this.options.onError?.(event);
    this.emit('error', event);
    this.setStatus(ConnectionStatus.ERROR);
    if (!this.isExplicitlyClosed) {
      this.scheduleReconnect();
    }
  };

  private scheduleReconnect(): void {
    if (this.isExplicitlyClosed || this.reconnectAttempts >= (this.options.maxReconnectAttempts || 0)) {
      console.warn('WebSocketManager: Max reconnect attempts reached or explicitly closed. Not reconnecting.');
      this.setStatus(ConnectionStatus.DISCONNECTED);
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(
      (this.options.reconnectInterval || 3000) * Math.pow(2, this.reconnectAttempts - 1),
      30000 // Cap delay at 30 seconds
    );

    console.log(`WebSocketManager: Reconnecting in ${delay / 1000} seconds (attempt ${this.reconnectAttempts})...`);
    this.clearReconnectTimeout();
    this.reconnectTimeout = setTimeout(() => this.connect(), delay);
  }

  private clearReconnectTimeout(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
  }
}

export default WebSocketManager;
