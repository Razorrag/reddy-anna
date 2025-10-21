// Removed circular dependency - now self-contained

// Enhanced API client with error handling and interceptors
class ApiClient {
  private baseURL: string;
  private defaultHeaders: Record<string, string>;

  constructor() {
    // Use relative path for Vite proxy to work correctly
    // The Vite proxy will forward /api requests to the backend
    this.baseURL = '/api';
    
    this.defaultHeaders = {
      'Content-Type': 'application/json',
    };
    
    console.log(`API Client initialized with baseURL: ${this.baseURL}`);
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    
    const config: RequestInit = {
      headers: {
        ...this.defaultHeaders,
        ...options.headers,
      },
      credentials: 'include', // Important for session cookies
      ...options,
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`API Error (${endpoint}):`, error);
      throw error;
    }
  }

  async get<T>(endpoint: string, params?: Record<string, any>): Promise<T> {
    const url = new URL(`${this.baseURL}${endpoint}`, window.location.origin);
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, String(value));
        }
      });
    }

    return this.request<T>(endpoint + url.search, {
      method: 'GET',
    });
  }

  async post<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async patch<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'DELETE',
    });
  }

  // Game-specific methods
  async getGameState() {
    return this.get('/game/current');
  }

  // Betting is done via WebSocket, not REST API
  // The placeBet method has been removed as it should not exist

  async getGameHistory() {
    return this.get('/game/history');
  }

  async getUserStats() {
    return this.get('/user/stats');
  }

  async getUserBalance() {
    return this.get('/user/balance');
  }

  // Admin methods
  async startGame() {
    return this.post('/admin/game/start');
  }

  async stopGame() {
    return this.post('/admin/game/stop');
  }

  async resetGame() {
    return this.post('/admin/game/reset');
  }

  async getUsers(filters?: { status?: string; search?: string }) {
    return this.get('/admin/users', filters);
  }

  async updateUserStatus(userId: string, status: 'active' | 'suspended' | 'banned') {
    return this.patch(`/admin/users/${userId}/status`, { status });
  }

  async getBettingStats() {
    return this.get('/admin/stats/betting');
  }

  // Auth methods
  async login(credentials: { email: string; password: string }) {
    return this.post('/auth/login', credentials);
  }

  async logout() {
    return this.post('/auth/logout');
  }

  async register(userData: { name: string; email: string; mobile: string; password: string }) {
    return this.post('/auth/register', userData);
  }

  async refreshToken() {
    return this.post('/auth/refresh');
  }
}

// Create singleton instance
export const apiClient = new ApiClient();

// Export types
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
