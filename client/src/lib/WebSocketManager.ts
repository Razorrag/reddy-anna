
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
  private options: WebSocketManagerOptions;
  private isExplicitlyClosed: boolean = false;

  private constructor(options: WebSocketManagerOptions) {
    super();
    this.options = {
      reconnectInterval: 3000, // Default reconnect interval
      maxReconnectAttempts: 10, // Default max attempts
      ...options,
    };
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
        let url = this.options.url;
        
        // Get token before connecting
        let token: string | null = null;
        if (this.options.tokenProvider) {
          token = await this.options.tokenProvider();
          if (!token) {
            console.warn('WebSocketManager: No token available for connection, will authenticate after connection.');
          }
        }

        this.ws = new WebSocket(url);
        
        // Set up handlers
        this.ws.onopen = (event: Event) => {
          this.handleOpen(event);
          
          // If we have a token, authenticate immediately after connection
          if (token) {
            this.send({ type: 'authenticate', data: { token } });
          }
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

  public disconnect(): void {
    this.isExplicitlyClosed = true;
    this.clearReconnectTimeout();
    if (this.ws) {
      console.log('WebSocketManager: Explicitly closing WebSocket.');
      this.ws.close(1000, 'Explicitly closed by client');
      this.ws = null;
    }
    this.setStatus(ConnectionStatus.DISCONNECTED);
  }

  public send(message: object): void {
    if (this.ws && this.status === ConnectionStatus.CONNECTED) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.warn('WebSocketManager: Cannot send message, WebSocket not connected.', message);
      this.emit('warning', 'WebSocket not connected, message not sent.');
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
    console.log('WebSocketManager: Connection opened.');
    this.setStatus(ConnectionStatus.CONNECTED);
    this.reconnectAttempts = 0; // Reset attempts on successful connection
    this.options.onOpen?.(event);
    this.emit('open', event);

    // If tokenProvider is used and token was not sent in URL, send authenticate message
    // This logic might need to be more sophisticated depending on server expectations
    if (this.options.tokenProvider) {
      this.options.tokenProvider().then(token => {
        if (token) {
          this.send({ type: 'authenticate', data: { token } });
        }
      }).catch(error => {
        console.error('WebSocketManager: Error getting token for authentication:', error);
      });
    }
  };

  private handleMessage = (event: MessageEvent) => {
    this.options.onMessage?.(event);
    this.emit('message', event);
  };

  private handleClose = (event: CloseEvent) => {
    console.log('WebSocketManager: Connection closed.', event.code, event.reason);
    this.ws = null;
    this.options.onClose?.(event);
    this.emit('close', event);

    if (!this.isExplicitlyClosed) {
      this.setStatus(ConnectionStatus.RECONNECTING);
      this.scheduleReconnect();
    } else {
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
