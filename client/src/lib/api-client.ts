// Removed circular dependency - now self-contained

// Enhanced API client with error handling and interceptors
class ApiClient {
  private baseURL: string;
  private defaultHeaders: Record<string, string>;

  constructor() {
    // CRITICAL: Use RELATIVE path so proxy works
    // This will make requests to /api which gets proxied to backend
    this.baseURL = '/api';
    
    this.defaultHeaders = {
      'Content-Type': 'application/json',
    };
    
    console.log(`API Client initialized with baseURL: ${this.baseURL}`);
    console.log(`Requests will be made to: ${window.location.origin}${this.baseURL}`);
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    // CRITICAL: Use relative URL so proxy works
    const url = `${this.baseURL}${endpoint}`;
    
    console.log(`Making request to: ${url}`); // DEBUG LOG
    
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
      
      console.log(`Response status: ${response.status} for ${url}`); // DEBUG LOG
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMsg = errorData.message || `HTTP ${response.status}: ${response.statusText}`;
        console.error(`API Error: ${errorMsg}`); // DEBUG LOG
        throw new Error(errorMsg);
      }

      const data = await response.json();
      console.log(`Response data:`, data); // DEBUG LOG
      return data;
    } catch (error) {
      console.error(`API Error (${endpoint}):`, error);
      throw error;
    }
  }

  async get<T>(endpoint: string, params?: Record<string, any>): Promise<T> {
    let url = `${this.baseURL}${endpoint}`;
    
    if (params) {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.append(key, String(value));
        }
      });
      url += '?' + searchParams.toString();
    }

    return this.request<T>(url, {
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

  async getGameHistory() {
    return this.get('/game/history');
  }

  async getUserBalance() {
    return this.get('/user/balance');
  }

  // Auth methods
  async login(credentials: { email: string; password: string }) {
    console.log('Sending login request to backend:', credentials); // DEBUG LOG
    return this.post('/auth/login', credentials);
  }

  async logout() {
    return this.post('/auth/logout');
  }

  async register(userData: { name: string; email: string; mobile: string; password: string }) {
    console.log('Sending registration request to backend:', userData); // DEBUG LOG
    return this.post('/auth/register', userData);
  }

  async refreshToken() {
    return this.post('/auth/refresh');
  }
}

// Create singleton instance
export const apiClient = new ApiClient();

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
