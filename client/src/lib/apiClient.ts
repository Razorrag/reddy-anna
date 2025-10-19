import { WebSocketMessage } from '../../../shared/schema';

class ApiClient {
  private baseUrl: string;
  
  constructor() {
    this.baseUrl = typeof window !== 'undefined' 
      ? '' // Use relative URLs for same-origin requests
      : process.env.API_BASE_URL || 'http://localhost:5000';
  }

  async request(endpoint: string, options: RequestInit = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    
    try {
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`API request failed: ${endpoint}`, error);
      throw error;
    }
  }

  async get(endpoint: string) {
    return this.request(endpoint, { method: 'GET' });
  }

  async post(endpoint: string, data: any) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async put(endpoint: string, data: any) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async delete(endpoint: string) {
    return this.request(endpoint, { method: 'DELETE' });
  }
}

// Create a singleton instance
const apiClient = new ApiClient();

// WebSocket message validation
export const isValidWebSocketMessage = (message: any): message is WebSocketMessage => {
  return message && typeof message === 'object' && typeof message.type === 'string';
};

// Error handler utility
export const handleComponentError = (error: unknown, context: string) => {
  console.error(`Error in ${context}:`, error);
  
  // Log to error tracking service if available
  if (typeof window !== 'undefined') {
    // Example: Sentry.captureException(error, { contexts: { component: context } });
  }
};

export default apiClient;