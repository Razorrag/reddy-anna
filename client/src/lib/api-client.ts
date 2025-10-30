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
        // Try to get error response first to see if this is a login failure vs auth token issue
        let errorData;
        try {
          errorData = await response.json();
        } catch {
          errorData = { error: 'Authentication failed' };
        }
        
        // For login endpoints, don't clear existing tokens - just throw the error
        const url = response.url;
        const isLoginEndpoint = url.includes('/auth/login') || url.includes('/auth/admin-login');
        
        if (isLoginEndpoint) {
          // For admin login, check if there's a specific error message
          if (url.includes('/auth/admin-login')) {
            const adminError = errorData.error || errorData.message || 'Invalid admin credentials';
            console.error('Admin login failed:', adminError);
            throw new Error(adminError);
          }
          throw new Error(errorData.error || errorData.message || 'Invalid credentials');
        }
        
        // For other endpoints, clear tokens and redirect
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('isLoggedIn');
        localStorage.removeItem('userRole');
        localStorage.removeItem('admin');
        localStorage.removeItem('isAdminLoggedIn');
        localStorage.removeItem('adminRole');
        
        // Determine where to redirect based on current context
        const currentPath = window.location.pathname;
        let redirectPath = '/login'; // Default to user login
        
        // If trying to access admin routes or already on admin-related paths, redirect to admin login
        if (currentPath.includes('/admin') || currentPath === '/admin-login') {
          redirectPath = '/admin-login';
        }
        // If already on login pages, don't redirect
        else if (currentPath === '/login' || currentPath === '/signup') {
          // Stay on current page, just clear the tokens
          return {} as any; // Return empty for login pages
        }
        
        // Only redirect if not already on login page
        // Use exact match instead of includes to avoid issues with /admin-login containing /login
        if (currentPath !== '/login' && currentPath !== '/admin-login' && currentPath !== '/signup') {
          window.location.href = redirectPath;
        }
        
        throw new Error(errorData.error || errorData.message || 'Authentication required. Please login again.');
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

  private async request<T>(
    endpoint: string,
    options: RequestOptions = {}
  ): Promise<T> {
    const { skipAuth, ...fetchOptions } = options;
    
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      ...fetchOptions,
      credentials: 'include',
      headers: {
        ...this.getHeaders(skipAuth),
        ...fetchOptions.headers,
      },
    });

    return this.handleResponse<T>(response);
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
   * Notify balance update via WebSocket
   */
  async notifyBalanceUpdate(userId: string, balance: number, transactionType?: string, amount?: number): Promise<ApiResponse> {
    return this.post<ApiResponse>('/user/balance-notify', {
      userId,
      balance,
      transactionType: transactionType || 'unknown',
      amount: amount || 0
    });
  }
}

// Export singleton instance
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
