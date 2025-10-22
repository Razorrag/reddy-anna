# Complete Authentication Fix Guide

## Analysis of Error Logs

### Frontend Error:
```
POST http://localhost:3000/api/auth/login 401 (Unauthorized)
API Error (/auth/login): Error: HTTP 401: Unauthorized
```

### Backend Error:
```
Error getting user by username: {
  code: 'PGRST116',
  details: 'The result contains 0 rows',
  hint: null,
  message: 'Cannot coerce the result to a single JSON object' 
}
POST /api/auth/login 401 in 1071ms :: {"success":false,"error":"User not found"}
```

### Root Cause:
The Supabase query is returning 0 rows when searching for users, indicating that:
1. Users might not exist in the database
2. The search field (username vs email) might be mismatched
3. The database schema doesn't match the query expectations

## Complete Line-by-Line Fixes

### 1. Frontend: Fix API Client Base URL (client/src/lib/api-client.ts)

**Current Problem**: The API client shows "API Client initialized with baseURL: /api" but requests go to `http://localhost:3000/api/auth/login` instead of the backend server at `http://localhost:5000`.

**Fix**:
```typescript
// In client/src/lib/api-client.ts
// Change from:
this.baseURL = import.meta.env.VITE_API_BASE_URL || '/api';

// To:
// For development with Vite proxy, use relative paths
// The proxy in vite.config.ts will forward to backend
this.baseURL = '/api';
```

### 2. Frontend: Ensure Proper Vite Proxy Configuration (client/vite.config.ts)

**Current Problem**: API requests may not be properly proxied to the backend.

**Fix** (Verify this configuration):
```typescript
// In client/vite.config.ts - ensure proxy is configured:
server: {
  host: true,
  port: 3000,
  proxy: {
    // Proxy API requests to backend
    '/api': {
      target: 'http://127.0.0.1:5000',  // Backend running on port 5000
      changeOrigin: true,
      secure: false,
    },
    // Proxy WebSocket connections to backend
    '/ws': {
      target: 'ws://127.0.0.1:5000',
      ws: true,
      changeOrigin: true,
    },
  },
},
```

### 3. Backend: Fix Database Schema Mismatch (server/storage-supabase.ts)

**Current Problem**: The Supabase storage layer uses different field names than the actual database.

**Fix the getUserByUsername method**:
```typescript
// In server/storage-supabase.ts
// Change from:
async getUserByUsername(username: string): Promise<User | undefined> {
  const { data, error } = await supabaseServer
    .from('users')
    .select('*')
    .eq('username', username)  // This might be looking for 'username' but DB has 'email'
    .single();

// To - support both email and username search:
async getUserByUsername(identifier: string): Promise<User | undefined> {
  const { data, error } = await supabaseServer
    .from('users')
    .select('*')
    .or(`email.eq.${identifier},username.eq.${identifier}`)  // Search in both fields
    .single();

  if (error) {
    console.error('Error getting user by identifier:', error);
    // Log more details for debugging:
    console.log('Searching for identifier:', identifier);
    return undefined;
  }

  return data;
}
```

### 4. Backend: Update User Creation to Match Search Pattern (server/storage-supabase.ts)

**Current Problem**: Users might be created with different field values than what's searched.

**Fix the createUser method**:
```typescript
// In server/storage-supabase.ts
async createUser(insertUser: InsertUser): Promise<User> {
  const id = randomUUID();
  
  // Create user object ensuring email field is properly set
  const user = {
    id,
    username: insertUser.username,
    password_hash: insertUser.password, // Map password to password_hash
    email: insertUser.email || insertUser.username, // Use email if provided, else username
    full_name: insertUser.name || insertUser.username,
    phone: insertUser.mobile || '', // Use mobile from registration
    role: 'player',
    status: 'active',
    balance: 1000000, // Default balance
    total_winnings: 0,
    total_losses: 0,
    games_played: 0,
    games_won: 0,
    email_verified: false,
    phone_verified: false,
    two_factor_enabled: false,
    referral_code: null,
    referred_by: null,
    avatar_url: null,
    last_login: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  const { data, error } = await supabaseServer
    .from('users')
    .insert(user)
    .select()
    .single();

  if (error) {
    console.error('Error creating user:', error);
    throw error;
  }

  return data;
}
```

### 5. Backend: Fix the Auth Login Function (server/auth.ts)

**Current Problem**: The login function might not be handling the field mismatch properly.

**Fix the loginUser function**:
```typescript
// In server/auth.ts
export const loginUser = async (email: string, password: string): Promise<AuthResult> => {
  try {
    // Sanitize inputs
    const sanitizedEmail = sanitizeInput(email).toLowerCase().trim();

    if (!sanitizedEmail || !password) {
      return { success: false, error: 'Email and password are required' };
    }

    console.log('Login attempt for email:', sanitizedEmail); // Debug log

    // Find user by email using Supabase storage - this now supports both email and username search
    const user = await storage.getUserByUsername(sanitizedEmail);
    if (!user) {
      console.log('User not found for email:', sanitizedEmail);
      return { success: false, error: 'User not found' };
    }

    console.log('User found, attempting password validation'); // Debug log

    // Verify password - handle both password and password_hash fields
    const passwordToCheck = (user as any).password_hash || (user as any).password;
    if (!passwordToCheck) {
      console.log('No password found for user:', user.id);
      return { success: false, error: 'Invalid credentials' };
    }
    
    const isValid = await validatePassword(password, passwordToCheck);
    if (!isValid) {
      console.log('Invalid password for user:', user.id);
      return { success: false, error: 'Invalid password' };
    }

    // Update last login
    await storage.updateUser(user.id, { last_login: new Date().toISOString() });

    // Generate JWT token
    const token = generateToken({
      id: user.id,
      username: user.username,
      role: user.role || 'player'
    });

    // Format response (remove sensitive data)
    const userResponse = {
      id: user.id,
      username: user.username,
      email: user.email, // Include email in response
      balance: user.balance,
      role: user.role || 'player'
    };

    return { success: true, user: userResponse, token };
  } catch (error) {
    console.error('Login error:', error);
    return { success: false, error: 'Login failed' };
  }
};
```

### 6. Frontend: Update Registration to Send Required Fields (client/src/pages/signup.tsx)

**Current Problem**: The registration might not be sending all required fields that the backend expects.

**Fix the registration request**:
```typescript
// In client/src/pages/signup.tsx
// Change the handleSubmit function to ensure all required fields are sent:
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setIsLoading(true);
  setErrors({});

  // Basic validation
  const newErrors: Record<string, string> = {};

  if (formData.password !== formData.confirmPassword) {
    newErrors.confirmPassword = "Passwords don't match";
  }

  if (formData.password.length < 6) {
    newErrors.password = "Password must be at least 6 characters";
  }

  if (Object.keys(newErrors).length > 0) {
    setErrors(newErrors);
    setIsLoading(false);
    return;
  }

  try {
    // Make real API call to signup endpoint
    // Ensure we're sending the right fields expected by backend
    const response = await apiClient.post<any>('/auth/register', {
      name: formData.name,
      email: formData.email,        // This will be used as both username and email
      password: formData.password,
      mobile: formData.mobile,
      username: formData.email      // Also send as username for consistency
    });

    // Rest of the function remains the same...
    // Show success message
    setSuccess(true);
    setApiError('');

    // Store user data and redirect to player game
    const userData = {
      id: response.user?.id || response.id,
      username: response.user?.username || response.username,
      email: response.user?.email || formData.email,  // Store email separately
      balance: response.user?.balance || response.balance || 10000,
      role: response.user?.role || 'player'
    };

    localStorage.setItem('user', JSON.stringify(userData));
    localStorage.setItem('isLoggedIn', 'true');
    localStorage.setItem('userRole', userData.role);

    // Redirect after 1 second to show success message
    setTimeout(() => {
      window.location.href = '/game';
    }, 1000);
  } catch (err: any) {
    console.error('Signup error:', err);
    setApiError(err.message || 'Failed to create account. Please try again.');
  } finally {
    setIsLoading(false);
  }
};
```

### 7. Create Default Admin User (if needed)

**Current Problem**: There might not be any admin user in the database.

**Create a setup script** (server/create-admin.ts):
```typescript
// server/create-admin.ts
import { storage } from './storage-supabase';
import { hashPassword } from './auth';

async function createAdmin() {
  try {
    console.log('Creating default admin user...');
    
    // Check if admin already exists
    const existingAdmin = await storage.getUserByUsername('admin@example.com');
    if (existingAdmin) {
      console.log('Admin user already exists');
      return;
    }

    // Create admin user object
    const adminUser = {
      username: 'admin@example.com',
      email: 'admin@example.com',
      password: await hashPassword('Admin123456'), // Default password
      full_name: 'Administrator',
      phone: '',
      role: 'admin',
      status: 'active',
      balance: 10000000, // Higher balance for admin
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const createdAdmin = await storage.createUser(adminUser as any);
    console.log('Admin user created successfully:', createdAdmin.id);

  } catch (error) {
    console.error('Error creating admin user:', error);
  }
}

if (require.main === module) {
  createAdmin();
}
```

### 8. Update Environment Variables (.env)

**Current Problem**: Supabase credentials might be incorrect.

**Ensure these are correct in .env**:
```bash
# Supabase configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-super-secret-service-key

# JWT Configuration
JWT_SECRET=your-very-secure-jwt-secret-key-at-least-32-characters-long
JWT_EXPIRES_IN=1h  # Shorter for security

# Server Configuration
NODE_ENV=development
PORT=5000
CORS_ORIGIN=http://localhost:3000
```

### 9. Backend: Add Debugging to Authentication (server/auth.ts)

**Add debug logging to help troubleshoot**:
```typescript
// In server/auth.ts, update the loginUser function to add more debugging:
export const loginUser = async (email: string, password: string): Promise<AuthResult> => {
  try {
    // Sanitize inputs
    const sanitizedEmail = sanitizeInput(email).toLowerCase().trim();

    if (!sanitizedEmail || !password) {
      console.log('Login validation failed: missing email or password');
      return { success: false, error: 'Email and password are required' };
    }

    console.log('Login attempt for identifier:', sanitizedEmail); // Debug log

    // Find user by email using Supabase storage
    const user = await storage.getUserByUsername(sanitizedEmail);
    
    console.log('User lookup result:', user ? 'User found' : 'User not found');
    if (!user) {
      console.log('Failed login attempt for identifier:', sanitizedEmail);
      return { success: false, error: 'User not found' };
    }

    console.log('User found, attempting password validation for user ID:', user.id); // Debug log

    // Verify password - handle both password and password_hash fields
    const passwordToCheck = (user as any).password_hash || (user as any).password;
    if (!passwordToCheck) {
      console.log('No password found for user:', user.id);
      return { success: false, error: 'Invalid credentials' };
    }
    
    const isValid = await validatePassword(password, passwordToCheck);
    if (!isValid) {
      console.log('Invalid password for user:', user.id);
      return { success: false, error: 'Invalid password' };
    }

    console.log('Successful login for user:', user.id);
    
    // Update last login
    await storage.updateUser(user.id, { last_login: new Date().toISOString() });

    // Generate JWT token
    const token = generateToken({
      id: user.id,
      username: user.username,
      role: user.role || 'player'
    });

    // Format response (remove sensitive data)
    const userResponse = {
      id: user.id,
      username: user.username,
      email: user.email,
      balance: user.balance,
      role: user.role || 'player'
    };

    return { success: true, user: userResponse, token };
  } catch (error) {
    console.error('Login error:', error);
    return { success: false, error: 'Login failed' };
  }
};
```

### 10. Frontend: Update Login Component (client/src/pages/login.tsx)

**Add error handling and ensure proper request format**:
```typescript
// In client/src/pages/login.tsx, update handleSubmit:
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setIsLoading(true);
  setError('');

  try {
    console.log('Sending login request for:', formData.email); // Debug log
    
    // Make real API call to login endpoint
    const response = await apiClient.post<any>('/auth/login', {
      email: formData.email,  // Make sure this is the email/username used at registration
      password: formData.password
    });

    console.log('Login response:', response); // Debug log

    // Store user data in localStorage for WebSocket authentication
    const userData = {
      id: response.user?.id || response.id,
      username: response.user?.username || response.username,
      email: response.user?.email || formData.email,  // Store email
      balance: response.user?.balance || response.balance || 10000,
      role: response.user?.role || 'player'
    };

    localStorage.setItem('user', JSON.stringify(userData));
    localStorage.setItem('isLoggedIn', 'true');
    localStorage.setItem('userRole', userData.role);

    // Redirect to player game after successful login
    window.location.href = '/game';
  } catch (err: any) {
    console.error('Login error:', err);
    setError(err.message || 'Invalid email or password');
  } finally {
    setIsLoading(false);
  }
};
```

## Complete Database Schema Verification

### 11. Verify Supabase Table Structure

**Run this query in your Supabase SQL editor to check the users table**:
```sql
-- Check if users table exists and has proper structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'users' 
ORDER BY ordinal_position;
```

### 12. Sample Query to Test User Existence
```sql
-- Test if default admin user exists
SELECT id, email, username, role FROM users WHERE email = 'admin@example.com' OR username = 'admin@example.com';

-- Test if any users exist
SELECT COUNT(*) as user_count FROM users;
```

## Testing the Fixes

1. **First**, ensure your Supabase project is properly configured with the correct URL and keys
2. **Run** the admin creation script to ensure an admin user exists
3. **Start** the backend server: `npm run dev:server`
4. **Start** the frontend: `npm run dev:client`
5. **Open** browser to `http://localhost:3000`
6. **Test** login with `admin@example.com` / `Admin123456` or a registered user

## Additional Debugging Steps

If issues persist:

1. **Check Supabase Logs**: Look in your Supabase dashboard for any query errors
2. **Verify Network Requests**: Use browser DevTools Network tab to see the actual request URLs
3. **Check Backend Logs**: See what exact queries are being made to Supabase
4. **Test Supabase Directly**: Use the Supabase SQL editor to verify table structure and data

These fixes address the authentication issues by:
- Ensuring API requests route correctly through the Vite proxy
- Fixing the database schema mismatches between field names
- Properly creating and searching for users in the database
- Adding proper error logging for debugging
- Ensuring all required fields are sent during registration and login