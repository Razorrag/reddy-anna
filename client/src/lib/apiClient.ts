/**
 * API Client with Automatic Token Management
 * 
 * This utility automatically adds authentication tokens to all API requests
 * No manual token handling needed in components
 */

interface RequestOptions extends RequestInit {
  skipAuth?: boolean; // Skip authentication for public endpoints
}

class APIClient {
  private baseURL: string;

  constructor() {
    // Use empty baseURL since /api is already in environment variable
    this.baseURL = import.meta.env.VITE_API_BASE_URL || '';
  }

  /**
   * Get authentication token from localStorage
   */
  private getToken(): string | null {
    return localStorage.getItem('token');
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
   * Handle API response
   */
  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      // Handle authentication errors
      if (response.status === 401) {
        // Token expired or invalid - clear and redirect to login
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        
        // Only redirect if not already on login page
        if (!window.location.pathname.includes('/login')) {
          window.location.href = '/login';
        }
        
        throw new Error('Authentication required. Please login again.');
      }

      if (response.status === 403) {
        throw new Error('Access denied. Insufficient permissions.');
      }

      // Try to get error message from response
      try {
        const errorData = await response.json();
        throw new Error(errorData.error || errorData.message || 'Request failed');
      } catch {
        throw new Error(`Request failed with status ${response.status}`);
      }
    }

    return response.json();
  }

  /**
   * GET request
   */
  async get<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const { skipAuth, ...fetchOptions } = options;
    
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      ...fetchOptions,
      method: 'GET',
      credentials: 'include', // Include cookies for session auth
      headers: {
        ...this.getHeaders(skipAuth),
        ...fetchOptions.headers,
      },
    });

    return this.handleResponse<T>(response);
  }

  /**
   * POST request
   */
  async post<T>(endpoint: string, data?: any, options: RequestOptions = {}): Promise<T> {
    const { skipAuth, ...fetchOptions } = options;
    
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      ...fetchOptions,
      method: 'POST',
      credentials: 'include',
      headers: {
        ...this.getHeaders(skipAuth),
        ...fetchOptions.headers,
      },
      body: data ? JSON.stringify(data) : undefined,
    });

    return this.handleResponse<T>(response);
  }

  /**
   * PUT request
   */
  async put<T>(endpoint: string, data?: any, options: RequestOptions = {}): Promise<T> {
    const { skipAuth, ...fetchOptions } = options;
    
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      ...fetchOptions,
      method: 'PUT',
      credentials: 'include',
      headers: {
        ...this.getHeaders(skipAuth),
        ...fetchOptions.headers,
      },
      body: data ? JSON.stringify(data) : undefined,
    });

    return this.handleResponse<T>(response);
  }

  /**
   * PATCH request
   */
  async patch<T>(endpoint: string, data?: any, options: RequestOptions = {}): Promise<T> {
    const { skipAuth, ...fetchOptions } = options;
    
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      ...fetchOptions,
      method: 'PATCH',
      credentials: 'include',
      headers: {
        ...this.getHeaders(skipAuth),
        ...fetchOptions.headers,
      },
      body: data ? JSON.stringify(data) : undefined,
    });

    return this.handleResponse<T>(response);
  }

  /**
   * DELETE request
   */
  async delete<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const { skipAuth, ...fetchOptions } = options;
    
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      ...fetchOptions,
      method: 'DELETE',
      credentials: 'include',
      headers: {
        ...this.getHeaders(skipAuth),
        ...fetchOptions.headers,
      },
    });

    return this.handleResponse<T>(response);
  }

  /**
   * Balance notification endpoint for WebSocket updates
   */
  async notifyBalanceUpdate(userId: string, balance: number, transactionType?: string, amount?: number): Promise<any> {
    try {
      const response = await fetch(`${this.baseURL}/user/balance-notify`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          ...this.getHeaders(false),  // Always include auth for this endpoint
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId, balance, transactionType, amount })
      });

      if (!response.ok) {
        throw new Error(`Balance notification failed with status ${response.status}`);
      }

      return response.json();
    } catch (error) {
      console.error('Balance notification error:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const apiClient = new APIClient();

// Export for use in components
export default apiClient;

/**
 * Usage Examples:
 * 
 * // Login (public endpoint - skip auth)
 * const response = await apiClient.post('/auth/login', 
 *   { phone, password }, 
 *   { skipAuth: true }
 * );
 * 
 * // Authenticated request (token added automatically)
 * const profile = await apiClient.get('/user/profile');
 * 
 * // Place bet (token added automatically)
 * const result = await apiClient.post('/game/bet', {
 *   side: 'andar',
 *   amount: 1000
 * });
 * 
 * // Notify balance update (token added automatically)
 * const result = await apiClient.notifyBalanceUpdate('user123', 5000, 'win', 1000);
 */
