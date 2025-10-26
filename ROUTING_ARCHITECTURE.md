# 🔐 Authentication & Routing Architecture

## Current Issues

### Problem 1: Double Login System
- **Admin Login:** Uses `localStorage` with keys `admin`, `isAdminLoggedIn`
- **Player Login:** Uses `localStorage` with keys `user`, `isLoggedIn`
- **Result:** Two separate authentication systems that don't talk to each other

### Problem 2: Inconsistent Route Protection
- **ProtectedRoute:** Checks `AppContext` state (for players)
- **ProtectedAdminRoute:** Checks `localStorage` directly (for admins)
- **Result:** Different authentication checks for different routes

### Problem 3: Session Not Persistent
- Page refresh loses authentication state
- Need to login again after navigation
- WebSocket authentication separate from route authentication

---

## Proposed Solution: Unified Authentication

### Single Authentication System

```typescript
// Store in localStorage:
{
  user: {
    id: string,
    phone: string,
    role: 'player' | 'admin' | 'super_admin',
    balance?: number,
    username?: string
  },
  isLoggedIn: true,
  token: string // JWT token for API calls
}
```

### Route Protection Logic

```typescript
// For Player Routes
if (!isLoggedIn || role !== 'player') {
  redirect('/login')
}

// For Admin Routes  
if (!isLoggedIn || (role !== 'admin' && role !== 'super_admin')) {
  redirect('/admin-login')
}
```

---

## Implementation Plan

### Step 1: Unified Storage Keys
- Remove: `admin`, `isAdminLoggedIn`, `adminRole`
- Keep: `user`, `isLoggedIn`, `userRole`, `token`
- Admin and Player both use same keys, differentiated by `role` field

### Step 2: Update Login Pages

**Admin Login (`admin-login.tsx`):**
```typescript
// After successful login
const userData = {
  id: response.admin.id,
  username: response.admin.username,
  role: response.admin.role, // 'admin' or 'super_admin'
  phone: response.admin.username
};

localStorage.setItem('user', JSON.stringify(userData));
localStorage.setItem('isLoggedIn', 'true');
localStorage.setItem('userRole', userData.role);
localStorage.setItem('token', response.token);

// Redirect to /admin
```

**Player Login (`login.tsx`):**
```typescript
// After successful login
const userData = {
  id: response.user.id,
  phone: response.user.phone,
  role: 'player',
  balance: response.user.balance
};

localStorage.setItem('user', JSON.stringify(userData));
localStorage.setItem('isLoggedIn', 'true');
localStorage.setItem('userRole', 'player');
localStorage.setItem('token', response.token);

// Redirect to /game
```

### Step 3: Update Route Protection

**ProtectedRoute (for players):**
```typescript
const checkAuth = () => {
  const userStr = localStorage.getItem('user');
  const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
  
  if (!userStr || !isLoggedIn) {
    return false;
  }
  
  const user = JSON.parse(userStr);
  return user.role === 'player';
};
```

**ProtectedAdminRoute (for admins):**
```typescript
const checkAuth = () => {
  const userStr = localStorage.getItem('user');
  const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
  
  if (!userStr || !isLoggedIn) {
    return false;
  }
  
  const user = JSON.parse(userStr);
  return user.role === 'admin' || user.role === 'super_admin';
};
```

### Step 4: Update WebSocket Authentication

```typescript
// Send token with WebSocket connection
const token = localStorage.getItem('token');
ws.send(JSON.stringify({
  type: 'authenticate',
  token: token
}));
```

### Step 5: Update AppContext

```typescript
// Initialize from localStorage on app load
useEffect(() => {
  const userStr = localStorage.getItem('user');
  const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
  
  if (userStr && isLoggedIn) {
    const user = JSON.parse(userStr);
    dispatch({ type: 'SET_USER', payload: user });
    dispatch({ type: 'SET_AUTH_STATUS', payload: { 
      isAuthenticated: true, 
      authChecked: true 
    }});
  } else {
    dispatch({ type: 'SET_AUTH_STATUS', payload: { 
      isAuthenticated: false, 
      authChecked: true 
    }});
  }
}, []);
```

---

## Route Structure

### Public Routes (No Auth Required)
- `/` - Homepage
- `/login` - Player Login
- `/signup` - Player Signup
- `/admin-login` - Admin Login

### Player Routes (Require Player Login)
- `/game` - Player Game
- `/play` - Player Game (alias)
- `/player-game` - Player Game (alias)
- `/profile` - Player Profile
- `/profile/transactions` - Transaction History
- `/profile/referrals` - Referral System
- `/profile/settings` - Player Settings

### Admin Routes (Require Admin Login)
- `/admin` - Admin Dashboard
- `/admin-game` - Admin Game Control
- `/user-admin` - User Management
- `/admin-analytics` - Analytics
- `/admin-payments` - Payment Management
- `/admin-bonus` - Bonus Management
- `/admin-whatsapp-settings` - WhatsApp Settings
- `/game-history` - Game History
- `/backend-settings` - Backend Settings

---

## Navigation Flow

### Player Flow:
```
1. Visit / (Homepage)
2. Click "Play Now" → /login
3. Enter phone + password
4. Success → /game (with balance, can place bets)
5. Click Profile → /profile (view stats, transactions)
6. Logout → Clear localStorage → /
```

### Admin Flow:
```
1. Visit /admin-login (must know URL)
2. Enter username + password
3. Success → /admin (dashboard with all admin cards)
4. Click any card → Navigate to admin pages
5. All admin pages accessible without re-login
6. Logout → Clear localStorage → /
```

---

## Benefits

1. **Single Source of Truth:** One `user` object for both admin and player
2. **Consistent Auth:** Same localStorage keys, differentiated by `role`
3. **Persistent Sessions:** Auth survives page refresh
4. **No Double Login:** Login once, access all authorized pages
5. **Clear Separation:** Role-based access control
6. **WebSocket Sync:** Same token used for API and WebSocket

---

## Security Considerations

1. **Admin Routes Hidden:** Admin routes don't appear in UI for players
2. **Role Verification:** Backend verifies role on every API call
3. **Token Expiry:** JWT tokens expire after set time
4. **Session Validation:** Backend validates session on each request
5. **Logout Cleanup:** Clear all localStorage on logout

---

## Testing Checklist

- [ ] Player can login and access /game
- [ ] Player can access /profile
- [ ] Player CANNOT access /admin routes
- [ ] Admin can login and access /admin
- [ ] Admin can access all /admin-* routes
- [ ] Admin CANNOT place bets (backend blocks)
- [ ] Page refresh maintains login state
- [ ] Logout clears all data
- [ ] WebSocket uses same auth as routes
- [ ] No double login required

---

*This architecture ensures clean separation between admin and player while maintaining a unified authentication system.*
