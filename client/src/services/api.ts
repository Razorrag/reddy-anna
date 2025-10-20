import React from 'react';
import { useApp } from '../contexts/AppContext';
import { storage } from '../lib/utils';

// API response interface
interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

// API error class
class ApiError extends Error {
  constructor(
    message: string,
    public status?: number,
    public code?: string,
    public data?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// Base API service class
class ApiService {
  private baseUrl: string;
  private defaultHeaders: Record<string, string>;

  constructor() {
    this.baseUrl = import.meta.env.VITE_API_BASE_URL || '/api';
    this.defaultHeaders = {
      'Content-Type': 'application/json',
    };
  }

  private getAuthHeader(): Record<string, string> {
    const token = storage.get<string>('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const headers = {
      ...this.defaultHeaders,
      ...this.getAuthHeader(),
      ...options.headers,
    };

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new ApiError(
          data.message || data.error || `HTTP error! status: ${response.status}`,
          response.status,
          data.code,
          data
        );
      }

      return data as ApiResponse<T>;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      
      // Network or other errors
      throw new ApiError(
        error instanceof Error ? error.message : 'Network error occurred',
        0,
        'NETWORK_ERROR'
      );
    }
  }

  // HTTP methods
  async get<T>(endpoint: string, params?: Record<string, any>): Promise<ApiResponse<T>> {
    const url = new URL(`${this.baseUrl}${endpoint}`, window.location.origin);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, String(value));
        }
      });
    }
    
    return this.request<T>(endpoint, {
      method: 'GET',
    });
  }

  async post<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async patch<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'DELETE',
    });
  }

  // File upload
  async upload<T>(endpoint: string, file: File, additionalData?: Record<string, any>): Promise<ApiResponse<T>> {
    const formData = new FormData();
    formData.append('file', file);
    
    if (additionalData) {
      Object.entries(additionalData).forEach(([key, value]) => {
        formData.append(key, String(value));
      });
    }

    return this.request<T>(endpoint, {
      method: 'POST',
      body: formData,
      headers: {
        ...this.getAuthHeader(),
        // Don't set Content-Type for FormData - browser sets it with boundary
      },
    });
  }
}

// Create singleton instance
export const apiService = new ApiService();

// Custom hook for API calls with notifications and error handling
export const useApi = () => {
  const { addNotification, setLoading } = useApp();
  
  const apiCall = async <T,>(
    apiFunction: () => Promise<ApiResponse<T>>,
    options?: {
      successMessage?: string;
      errorMessage?: string;
      showLoading?: boolean;
      onSuccess?: (data: T) => void;
      onError?: (error: ApiError) => void;
    }
  ): Promise<T | null> => {
    const {
      successMessage,
      errorMessage,
      showLoading = true,
      onSuccess,
      onError
    } = options || {};

    if (showLoading) {
      setLoading(true);
    }

    try {
      const response = await apiFunction();
      
      if (response.success && response.data) {
        if (successMessage) {
          addNotification(successMessage, 'success');
        }
        
        onSuccess?.(response.data);
        return response.data;
      } else {
        const errorMsg = response.error || response.message || 'Request failed';
        addNotification(errorMsg, 'error');
        return null;
      }
    } catch (error: any) {
      const message = errorMessage || error.message || 'An error occurred';
      addNotification(message, 'error');
      
      if (error instanceof ApiError) {
        onError?.(error);
      }
      
      return null;
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  };
  
  return { apiCall };
};

// API endpoints and services
export const api = {
  // Authentication
  auth: {
    login: (email: string, password: string) =>
      apiService.post('/auth/login', { email, password }),
    
    register: (userData: any) =>
      apiService.post('/auth/register', userData),
    
    logout: () =>
      apiService.post('/auth/logout'),
    
    refreshToken: () =>
      apiService.post('/auth/refresh'),
    
    verifyToken: () =>
      apiService.get('/auth/verify'),
    
    forgotPassword: (email: string) =>
      apiService.post('/auth/forgot-password', { email }),
    
    resetPassword: (token: string, password: string) =>
      apiService.post('/auth/reset-password', { token, password }),
  },

  // User management
  users: {
    getProfile: () =>
      apiService.get('/users/profile'),
    
    updateProfile: (data: any) =>
      apiService.put('/users/profile', data),
    
    changePassword: (oldPassword: string, newPassword: string) =>
      apiService.post('/users/change-password', { oldPassword, newPassword }),
    
    getBalance: () =>
      apiService.get('/users/balance'),
    
    getTransactionHistory: (params?: { page?: number; limit?: number }) =>
      apiService.get('/users/transactions', params),
  },

  // Game operations
  game: {
    getState: () =>
      apiService.get('/game/state'),
    
    placeBet: (side: 'andar' | 'bahar', amount: number, round?: number) =>
      apiService.post('/game/bet', { side, amount, round }),
    
    getHistory: (params?: { page?: number; limit?: number }) =>
      apiService.get('/game/history', params),
    
    getStats: () =>
      apiService.get('/game/stats'),
    
    getLeaderboard: () =>
      apiService.get('/game/leaderboard'),
  },

  // Payment operations
  payment: {
    getMethods: () =>
      apiService.get('/payment/methods'),
    
    createOrder: (data: { amount: number; method: string; metadata?: any }) =>
      apiService.post('/payment/orders', data),
    
    verifyPayment: (orderId: string, paymentData: any) =>
      apiService.post(`/payment/orders/${orderId}/verify`, paymentData),
    
    getOrders: (params?: { page?: number; limit?: number; status?: string }) =>
      apiService.get('/payment/orders', params),
    
    withdraw: (data: { amount: number; method: string; details: any }) =>
      apiService.post('/payment/withdraw', data),
  },

  // Content management
  content: {
    getPages: () =>
      apiService.get('/content/pages'),
    
    getPage: (slug: string) =>
      apiService.get(`/content/pages/${slug}`),
    
    getBanners: () =>
      apiService.get('/content/banners'),
    
    getNews: (params?: { page?: number; limit?: number }) =>
      apiService.get('/content/news', params),
  },

  // Admin operations
  admin: {
    getUsers: (params?: { page?: number; limit?: number; search?: string }) =>
      apiService.get('/admin/users', params),
    
    updateUser: (userId: string, data: any) =>
      apiService.put(`/admin/users/${userId}`, data),
    
    getGameSessions: (params?: { page?: number; limit?: number }) =>
      apiService.get('/admin/game-sessions', params),
    
    updateGameSettings: (settings: any) =>
      apiService.put('/admin/game-settings', settings),
    
    getReports: (type: string, params?: any) =>
      apiService.get(`/admin/reports/${type}`, params),
  },

  // WebSocket connection info
  websocket: {
    getConnectionInfo: () =>
      apiService.get('/websocket/info'),
  },
};

// React Query-like hooks for data fetching
export const useQuery = <T>(
  _key: string[],
  fetcher: () => Promise<ApiResponse<T>>,
  options?: {
    enabled?: boolean;
    refetchInterval?: number;
    onSuccess?: (data: T) => void;
    onError?: (error: ApiError) => void;
  }
) => {
  const [data, setData] = React.useState<T | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<ApiError | null>(null);
  const { addNotification } = useApp();

  const fetchData = React.useCallback(async () => {
    if (options?.enabled === false) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetcher();
      if (response.success && response.data) {
        setData(response.data);
        options?.onSuccess?.(response.data);
      } else {
        const errorMsg = response.error || response.message || 'Request failed';
        setError(new ApiError(errorMsg));
        addNotification(errorMsg, 'error');
        options?.onError?.(new ApiError(errorMsg));
      }
    } catch (err: any) {
      const apiError = err instanceof ApiError ? err : new ApiError(err.message);
      setError(apiError);
      addNotification(apiError.message, 'error');
      options?.onError?.(apiError);
    } finally {
      setLoading(false);
    }
  }, [fetcher, options, addNotification]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  React.useEffect(() => {
    if (options?.refetchInterval) {
      const interval = setInterval(fetchData, options.refetchInterval);
      return () => clearInterval(interval);
    }
  }, [fetchData, options?.refetchInterval]);

  return {
    data,
    loading,
    error,
    refetch: fetchData,
  };
};

export { ApiError };
export default apiService;
