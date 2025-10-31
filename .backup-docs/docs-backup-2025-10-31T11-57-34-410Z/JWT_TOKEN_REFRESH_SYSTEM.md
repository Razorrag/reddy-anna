# JWT Token Refresh System

## Overview
The Andar Bahar game now includes a robust JWT-based authentication system with refresh tokens for secure token management.

## Token System Architecture

### Types of Tokens
1. **Access Token**:
   - Short-lived (default: 15 minutes)
   - Used for API requests
   - Sent in Authorization header as `Bearer <token>`

2. **Refresh Token**:
   - Long-lived (default: 7 days)
   - Used to obtain new access tokens
   - Should be stored securely (e.g., in HTTP-only cookie or secure local storage)

## How Token Refresh Works

### 1. Initial Login
When a user logs in successfully, the server returns:
- `token` (access token)
- `refreshToken` (refresh token)
- User profile information

### 2. API Requests
- Use access token in Authorization header for all API requests
- If access token expires, the server will return a 401 error

### 3. Token Refresh
- When access token expires, call the `/api/auth/refresh` endpoint
- Include the refresh token in the request body
- Server validates refresh token and issues new access/refresh tokens
- Use new access token for subsequent API requests

## API Endpoints

### `/api/auth/login`
- **Method**: POST
- **Description**: Login user and return tokens
- **Response**:
  ```json
  {
    "success": true,
    "user": {
      "id": "user-id",
      "phone": "phone-number",
      "balance": "balance",
      "role": "player",
      "token": "access-token",  // new access token
      "refreshToken": "refresh-token"  // new refresh token
    }
  }
  ```

### `/api/auth/refresh`
- **Method**: POST
- **Description**: Refresh expired access token using refresh token
- **Request Body**:
  ```json
  {
    "refreshToken": "refresh-token-here"
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "token": "new-access-token",
    "refreshToken": "new-refresh-token"
  }
  ```

## Frontend Implementation

### Example Token Refresh Flow
1. Store both tokens after login
2. Make API calls with access token
3. On 401 response (expired token):
   - Call refresh endpoint with stored refresh token
   - If successful, retry original API call with new access token
   - If refresh fails, redirect to login

### Example Code Snippet
```javascript
// Function to make authenticated API requests
async function makeAuthenticatedRequest(url, options = {}) {
  const token = localStorage.getItem('token');
  
  const response = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
  
  // If token expired (401), try to refresh
  if (response.status === 401) {
    const newTokens = await refreshToken();
    if (newTokens) {
      // Retry the original request with new token
      return makeAuthenticatedRequest(url, options);
    } else {
      // Redirect to login if refresh failed
      window.location.href = '/login';
      return null;
    }
  }
  
  return response;
}

// Function to refresh tokens
async function refreshToken() {
  const refreshToken = localStorage.getItem('refreshToken');
  
  const response = await fetch('/api/auth/refresh', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ refreshToken })
  });
  
  if (response.ok) {
    const data = await response.json();
    localStorage.setItem('token', data.token);
    localStorage.setItem('refreshToken', data.refreshToken);
    return data;
  } else {
    // Clear stored tokens
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    return null;
  }
}
```

## Security Features
- Access tokens expire quickly to limit exposure if compromised
- Refresh tokens allow seamless user experience without requiring re-login
- Both tokens are validated server-side
- Tokens include user role information for authorization checks

## Environment Variables
- `JWT_SECRET`: Secret key for JWT signing (required)
- `JWT_EXPIRES_IN`: Access token expiration time (default: 15m)
- `JWT_REFRESH_EXPIRES_IN`: Refresh token expiration time (default: 7d)

## Production Considerations
- Use strong, randomly generated JWT secrets
- Consider storing refresh tokens in a database with revocation capability
- Implement token rotation (issue new refresh tokens with each refresh)
- Use HTTPS only in production
- Consider using HTTP-only cookies for refresh token storage