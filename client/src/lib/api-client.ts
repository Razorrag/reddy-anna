/**
 * API Client with Automatic Token Management
 * 
 * This utility automatically adds authentication tokens to all API requests
 * and handles token refresh on 401 errors with a single retry.
 */

import { tokenManager } from './TokenManager';

interface RequestOptions extends RequestInit {
  skipAuth?: boolean; // Skip authentication for public endpoints
  _retried?: boolean; // Internal flag to prevent infinite retry loops
}

class APIClient {
  private baseURL: string;
  private isRefreshing: boolean = false;
  private refreshPromise: Promise<string | null> | null = null;

  constructor() {
    // Default to '/api' so relative endpoints (e.g., '/user/balance') proxy to the backend in dev
    // If VITE_API_BASE_URL is set, it will override this (supports absolute URLs or other bases)
    this.baseURL = import.meta.env.VITE_API_BASE_URL || '/api';
  }

  /**
   * Normalize and join baseURL with endpoint, avoiding double /api or slashes
   */
  private buildUrl(endpoint: string): string {
    const base = (this.baseURL || '/api').replace(/\/+$/g, ''); // trim trailing slashes, default to /api
    let path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

    // If base ends with /api and endpoint starts with /api, drop one
    if (base.endsWith('/api') && path.startsWith('/api/')) {
      path = path.substring(4); // remove leading /api
    }

    // If base is empty, return path as-is
    if (!base) return path;

    return `${base}${path}`;
  }

  /**
   * Get authentication token from TokenManager
   */
  private getToken(): string | null {
    return tokenManager.getToken();
  }

  /**
   * Get refresh token from TokenManager
   */
  private getRefreshToken(): string | null {
    return tokenManager.getRefreshToken();
  }

  /**
   * Get default headers with authentication
   */
  private getHeaders(skipAuth: boolean = false): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (!skipAuth) {
      const token = this.getToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }

    return headers;
  }

  /**
   * Refresh the access token using refresh token
   */
  private async refreshAccessToken(): Promise<string | null> {
    if (this.isRefreshing && this.refreshPromise) {
      return this.refreshPromise;
    }

    this.isRefreshing = true;

    this.refreshPromise = (async () => {
      const refreshToken = this.getRefreshToken();
      if (!refreshToken) {
        console.log('No refresh token available, clearing auth');
        this.clearAuth();
        return null;
      }

      try {
        const response = await fetch(this.buildUrl('/auth/refresh'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({ refreshToken }),
        });

        if (response.ok) {
          const data = await response.json();
          const newAccessToken = data.token || data.accessToken;
          const newRefreshToken = data.refreshToken;

          if (newAccessToken && newRefreshToken) {
            // Use TokenManager to update tokens (will notify listeners including WebSocket)
            tokenManager.setTokens(newAccessToken, newRefreshToken);
            console.log('✅ Access token refreshed successfully');
            return newAccessToken;
          } else {
            console.error('Refresh response missing tokens');
            this.clearAuth();
            return null;
          }
        } else {
          console.error('Token refresh failed with status:', response.status);
          this.clearAuth();
          return null;
        }
      } catch (error) {
        console.error('Error during token refresh:', error);
        this.clearAuth();
        return null;
      } finally {
        this.isRefreshing = false;
        this.refreshPromise = null;
      }
    })();

    return this.refreshPromise;
  }

  /**
   * Clear authentication data
   */
  private clearAuth(): void {
    // Use TokenManager to clear tokens (will notify listeners)
    tokenManager.clearTokens();
    
    // Clear other auth-related data
    localStorage.removeItem('user');
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('userRole');
    localStorage.removeItem('admin');
    localStorage.removeItem('isAdminLoggedIn');
    localStorage.removeItem('adminRole');
  }

  /**
   * Handle API response and token refresh on 401
   */
  private async handleResponse<T>(response: Response, retryFn?: () => Promise<T>): Promise<T> {
    if (!response.ok) {
      if (response.status === 401 && retryFn) {
        console.log('Received 401, attempting token refresh and retry');
        const newToken = await this.refreshAccessToken();
        if (newToken && retryFn) {
          console.log('Token refreshed, retrying request');
          return retryFn();
        } else {
          console.log('Token refresh failed or no retry function provided');
          this.clearAuth();
          const currentPath = window.location.pathname;
          const redirectPath = currentPath.includes('/admin') ? '/admin-login' : '/login';
          if (currentPath !== redirectPath && currentPath !== '/login' && currentPath !== '/signup') {
            window.location.href = redirectPath;
          }
          throw new Error('Authentication required. Please login again.');
        }
      }

      if (response.status === 401) {
        let errorData;
        try {
          errorData = await response.json();
        } catch {
          errorData = { error: 'Authentication failed' };
        }
        const url = response.url;
        const isLoginEndpoint = url.includes('/auth/login') || url.includes('/auth/admin-login');
        if (!isLoginEndpoint) {
          this.clearAuth();
          const currentPath = window.location.pathname;
          const redirectPath = currentPath.includes('/admin') ? '/admin-login' : '/login';
          if (currentPath !== redirectPath && currentPath !== '/login' && currentPath !== '/signup') {
            window.location.href = redirectPath;
          }
        }
        throw new Error(errorData.error || errorData.message || 'Authentication required. Please login again.');
      }

      if (response.status === 403) {
        throw new Error('Access denied. Insufficient permissions.');
      }

      try {
        const errorData = await response.json();
        throw new Error(errorData.error || errorData.message || 'Request failed');
      } catch (e) {
        if (e instanceof Error && e.message !== 'Request failed') {
          throw e;
        }
        throw new Error(`Request failed with status ${response.status}`);
      }
    }

    return response.json();
  }

  private async request<T>(
    endpoint: string,
    options: RequestOptions = {}
  ): Promise<T> {
    const { skipAuth, _retried, ...fetchOptions } = options;

    const response = await fetch(this.buildUrl(endpoint), {
      ...fetchOptions,
      credentials: 'include',
      headers: {
        ...this.getHeaders(skipAuth),
        ...fetchOptions.headers,
      },
    });

    const retryFn = !_retried ? () => {
      return this.request<T>(endpoint, {
        ...options,
        _retried: true,
      });
    } : undefined;

    return this.handleResponse<T>(response, retryFn);
  }

  async get<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  async post<T>(endpoint: string, data?: any, options: RequestOptions = {}): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put<T>(endpoint: string, data?: any, options: RequestOptions = {}): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async patch<T>(endpoint: string, data?: any, options: RequestOptions = {}): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }

  /**
   * Notify balance update via API
   */
  async notifyBalanceUpdate(userId: string, balance: number, transactionType?: string, amount?: number): Promise<ApiResponse> {
    if (balance === undefined || balance === null || Number.isNaN(balance)) {
      console.error('❌ Invalid balance for notifyBalanceUpdate:', balance);
      return { success: false, error: 'Invalid balance' };
    }

    if (!userId || userId === 'undefined' || userId === 'null') {
      console.error('❌ Invalid userId for notifyBalanceUpdate:', userId);
      return { success: false, error: 'Invalid userId' };
    }

    try {
      return await this.post<ApiResponse>('/user/balance-notify', {
        userId,
        balance,
        transactionType,
        amount
      });
    } catch (error) {
      console.error('❌ Error in notifyBalanceUpdate:', error);
      throw error;
    }
  }
}

export const apiClient = new APIClient();

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export default apiClient;
