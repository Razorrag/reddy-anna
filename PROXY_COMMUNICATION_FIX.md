# CRITICAL: Frontend-Backend Communication Fix

## The Core Issue
The frontend running on `http://localhost:3000` is NOT properly communicating with the backend running on `http://localhost:5000`. This is why you're seeing authentication failures - the frontend requests never reach the backend.

## Root Cause Analysis
Looking at the error logs and your setup:
- Frontend makes requests to `/api/auth/login` 
- These should be proxied to `http://localhost:5000`
- But instead they're going to `http://localhost:3000/api/auth/login`
- Result: 404 or 401 errors because the backend API endpoints don't exist on the frontend server

## Complete Solution

### 1. FIX: Frontend Vite Proxy Configuration (client/vite.config.ts)

**REPLACE the ENTIRE file content with:**
```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      "@shared": path.resolve(__dirname, "..", "shared"),
    },
    dedupe: ['react', 'react-dom'],
  },
  server: {
    host: true,
    port: 3000,
    proxy: {
      // CRITICAL: Proxy ALL API requests to backend
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
        // ADD these for debugging
        onProxyReq: (proxyReq, req, res) => {
          console.log('PROXYING API REQUEST:', req.method, req.url);
        },
        onProxyRes: (proxyRes, req, res) => {
          console.log('PROXYING API RESPONSE:', proxyRes.statusCode, req.url);
        }
      },
      // CRITICAL: Proxy WebSocket connections to backend  
      '/ws': {
        target: 'http://localhost:5000',
        ws: true,
        changeOrigin: true,
        secure: false,
        onProxyReqWs: (proxyReq, req, socket) => {
          console.log('PROXYING WS CONNECTION:', req.url);
        }
      },
    },
  },
});
```

### 2. FIX: Frontend API Client (client/src/lib/api-client.ts)

**UPDATE this file to use RELATIVE PATHS only:**
```typescript
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
    console.log(`This should proxy to: http://localhost:5000/api`);
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
```

### 3. VERIFY: Backend CORS Configuration (server/index.ts)

**Make sure your backend CORS allows the frontend:**
```typescript
// In server/index.ts, find the CORS configuration and ensure it's correct:
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',  // Frontend origin
  credentials: true, // Allow cookies/session
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept']
}));
```

### 4. FIX: Backend Server Configuration (server/index.ts)

**Make sure the backend is listening on the correct address:**
```typescript
// At the end of server/index.ts, ensure server listens on all interfaces:
const port = parseInt(process.env.PORT || '5000', 10);
const host = '0.0.0.0'; // Listen on all interfaces, not just 127.0.0.1

server.listen(port, host, () => {
  log(`serving on http://${host}:${port}`); // This should show 0.0.0.0:5000
  log(`RTMP server running on port 1935`);
  log(`HTTP server for HLS running on port 8000`);
  log(`WebSocket server running on the same port as HTTP server`);
});
```

### 5. TEST: Verify Backend is Accessible Directly

**Before testing frontend, verify backend works directly:**
1. Start backend: `npm run dev:server`
2. Test in browser: `http://localhost:5000/api/auth` (should give some response)
3. Test with curl: `curl -v http://localhost:5000/api/auth`
4. Backend should respond to requests on port 5000

### 6. TEST: Verify Frontend-Backend Proxy

**After fixing the proxy config:**
1. Start backend: `npm run dev:server`
2. Start frontend: `npm run dev:client`  
3. Open browser DevTools Network tab
4. Make a login attempt
5. Check that requests go to `http://localhost:3000/api/auth/login` in the browser
6. In the DevTools, check that these requests show status 200 (not 404) and reach the backend

### 7. DEBUG: Add Frontend Request Logging

**If still not working, add this debugging to your login component:**
```typescript
// In client/src/pages/login.tsx, update handleSubmit:
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setIsLoading(true);
  setError('');

  console.log('=== LOGIN DEBUG START ==='); // DEBUG
  console.log('Form data:', formData); // DEBUG
  
  try {
    console.log('About to make API call...'); // DEBUG
    const response = await apiClient.post<any>('/auth/login', {
      email: formData.email,
      password: formData.password
    });
    console.log('API Response:', response); // DEBUG
    
    // Rest of login logic...
  } catch (err: any) {
    console.log('Login Error:', err); // DEBUG
    setError(err.message || 'Invalid email or password');
  } finally {
    setIsLoading(false);
  }
  console.log('=== LOGIN DEBUG END ==='); // DEBUG
};
```

## Key Points for Success

1. **Frontend makes requests to `/api/...`** (relative paths)
2. **Vite proxy forwards `/api/...` to `http://localhost:5000`**
3. **Backend handles `/api/...` routes properly**
4. **Both servers running simultaneously**
5. **No absolute URLs in frontend API calls**

This should completely fix the communication issue between your frontend and backend!