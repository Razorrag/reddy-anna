/**
 * Centralized Token Management
 * 
 * Manages JWT tokens (access and refresh) with listener system
 * for notifying components when tokens are updated
 */

type TokenListener = (token: string | null) => void;
type RefreshTokenListener = (token: string | null) => void;

class TokenManager {
  private static instance: TokenManager;
  private accessTokenListeners: Set<TokenListener> = new Set();
  private refreshTokenListeners: Set<RefreshTokenListener> = new Set();
  private storageKey = 'token';
  private refreshStorageKey = 'refreshToken';

  private constructor() {
    // Listen for storage events (token updates from other tabs/windows)
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', this.handleStorageChange);
    }
  }

  public static getInstance(): TokenManager {
    if (!TokenManager.instance) {
      TokenManager.instance = new TokenManager();
    }
    return TokenManager.instance;
  }

  /**
   * Get access token from localStorage
   */
  public getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(this.storageKey);
  }

  /**
   * Get refresh token from localStorage
   */
  public getRefreshToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(this.refreshStorageKey);
  }

  /**
   * Set access token and notify listeners
   */
  public setToken(token: string): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(this.storageKey, token);
    this.notifyAccessTokenListeners(token);
  }

  /**
   * Set refresh token and notify listeners
   */
  public setRefreshToken(token: string): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(this.refreshStorageKey, token);
    this.notifyRefreshTokenListeners(token);
  }

  /**
   * Set both tokens and notify listeners
   */
  public setTokens(accessToken: string, refreshToken: string): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(this.storageKey, accessToken);
    localStorage.setItem(this.refreshStorageKey, refreshToken);
    this.notifyAccessTokenListeners(accessToken);
    this.notifyRefreshTokenListeners(refreshToken);
  }

  /**
   * Clear both tokens and notify listeners
   */
  public clearTokens(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(this.storageKey);
    localStorage.removeItem(this.refreshStorageKey);
    this.notifyAccessTokenListeners(null);
    this.notifyRefreshTokenListeners(null);
  }

  /**
   * Subscribe to access token changes
   * Returns unsubscribe function
   */
  public subscribeAccessToken(listener: TokenListener): () => void {
    this.accessTokenListeners.add(listener);
    // Immediately call with current token
    listener(this.getToken());
    
    // Return unsubscribe function
    return () => {
      this.accessTokenListeners.delete(listener);
    };
  }

  /**
   * Subscribe to refresh token changes
   * Returns unsubscribe function
   */
  public subscribeRefreshToken(listener: RefreshTokenListener): () => void {
    this.refreshTokenListeners.add(listener);
    // Immediately call with current token
    listener(this.getRefreshToken());
    
    // Return unsubscribe function
    return () => {
      this.refreshTokenListeners.delete(listener);
    };
  }

  /**
   * Check if access token exists and is valid (basic check)
   */
  public hasToken(): boolean {
    return this.getToken() !== null;
  }

  /**
   * Check if refresh token exists
   */
  public hasRefreshToken(): boolean {
    return this.getRefreshToken() !== null;
  }

  /**
   * Handle storage events (token updates from other tabs/windows)
   */
  private handleStorageChange = (event: StorageEvent): void => {
    if (event.key === this.storageKey) {
      const newToken = event.newValue;
      this.notifyAccessTokenListeners(newToken);
    } else if (event.key === this.refreshStorageKey) {
      const newToken = event.newValue;
      this.notifyRefreshTokenListeners(newToken);
    }
  };

  /**
   * Notify all access token listeners
   */
  private notifyAccessTokenListeners(token: string | null): void {
    this.accessTokenListeners.forEach(listener => {
      try {
        listener(token);
      } catch (error) {
        console.error('Error in token listener:', error);
      }
    });
  }

  /**
   * Notify all refresh token listeners
   */
  private notifyRefreshTokenListeners(token: string | null): void {
    this.refreshTokenListeners.forEach(listener => {
      try {
        listener(token);
      } catch (error) {
        console.error('Error in refresh token listener:', error);
      }
    });
  }

  /**
   * Cleanup (remove event listeners)
   */
  public destroy(): void {
    if (typeof window !== 'undefined') {
      window.removeEventListener('storage', this.handleStorageChange);
    }
    this.accessTokenListeners.clear();
    this.refreshTokenListeners.clear();
  }
}

export const tokenManager = TokenManager.getInstance();
export default tokenManager;
















