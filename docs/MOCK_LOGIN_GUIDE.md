# 🔐 Mock Login Guide

## Quick Access (No Login Required)

### **Player Game** - Direct Access
```
http://localhost:3000/
```
✅ **No login required** - Play immediately!

### **Admin Game** - Direct Access (For Testing)
```
http://localhost:3000/admin-game
```
⚠️ Currently protected, but you can bypass for testing

---

## 🎭 Mock Login Credentials

### **Player Login**
- **URL:** `http://localhost:3000/login`
- **Username:** Any username (e.g., `player1`, `testuser`)
- **Password:** Any password (e.g., `password123`)
- **Action:** Just type anything and click "Sign In"
- **Result:** Redirects to player game after 1.5 seconds

### **Admin Login**
- **URL:** `http://localhost:3000/admin-login`
- **Username:** `admin`
- **Password:** `admin123`
- **Result:** Access to admin dashboard

---

## 🚀 Quick Test Flow

### **Option 1: Skip Login (Fastest)**
```
1. Go to: http://localhost:3000/
2. Start playing immediately!
```

### **Option 2: Test Login Flow**
```
1. Go to: http://localhost:3000/login
2. Enter any username/password
3. Click "Sign In"
4. Wait 1.5 seconds
5. Redirected to game
```

### **Option 3: Admin Access**
```
1. Go to: http://localhost:3000/admin-login
2. Username: admin
3. Password: admin123
4. Access admin controls
```

---

## 🔧 Bypass Login Protection (For Development)

If admin routes are protected, temporarily disable protection:

### **Method 1: Comment Out Protection**

**File:** `client/src/App.tsx`

Change this:
```tsx
<Route path="/admin-game">
  {() => (
    <ProtectedRoute component={AdminGame} role="admin">
      <AdminGame />
    </ProtectedRoute>
  )}
</Route>
```

To this:
```tsx
<Route path="/admin-game" component={AdminGame} />
```

### **Method 2: Mock Authentication**

Add to `client/src/components/ProtectedRoute.tsx`:
```tsx
// Temporary: Always allow access in development
if (import.meta.env.DEV) {
  return <>{children}</>;
}
```

---

## 📝 Current Login Implementation

### **Player Login** (`/login`)
- ✅ Beautiful UI with gold theme
- ✅ Username/password fields
- ✅ Mock authentication (accepts any credentials)
- ✅ 1.5 second delay simulation
- ✅ Redirects to `/` (player game)
- ✅ Social login buttons (UI only)

### **Admin Login** (`/admin-login`)
- ✅ Separate admin interface
- ✅ Role-based access control
- ✅ Protected routes

### **Signup** (`/signup`)
- ✅ Registration page available
- ✅ Links to login

---

## 🎮 Recommended Testing Flow

### **For Player Testing:**
```
1. Open: http://localhost:3000/
2. No login needed - play directly!
3. Select chips, place bets, test game flow
```

### **For Admin Testing:**
```
1. Open: http://localhost:3000/admin-game
2. If blocked, use bypass method above
3. Select opening card
4. Control game rounds
5. Deal cards
```

### **For Full Flow Testing:**
```
1. Open Admin: http://localhost:3000/admin-game
2. Open Player (new tab): http://localhost:3000/
3. Admin: Select opening card → Start Round 1
4. Player: Place bets
5. Admin: Deal cards
6. Test multi-round flow
```

---

## 🔐 Real Authentication (Future)

Currently using **mock authentication**. For production:

1. **Backend API** (`server/routes.ts`):
   - `/api/auth/login` - Already implemented
   - `/api/auth/signup` - Ready to use
   - Password hashing with bcrypt
   - JWT tokens (can be added)

2. **Database** (Supabase):
   - User table exists
   - Password storage ready
   - Role-based access

3. **To Enable Real Auth:**
   - Update `login.tsx` to call `/api/auth/login`
   - Store auth token in localStorage
   - Add token to WebSocket authentication
   - Update ProtectedRoute to check real auth

---

## ⚡ Quick Commands

### **Start Everything:**
```powershell
npm run dev:both
```

### **Access Points:**
- **Player:** http://localhost:3000/
- **Admin:** http://localhost:3000/admin-game
- **Login:** http://localhost:3000/login
- **Admin Login:** http://localhost:3000/admin-login

---

## 🎯 TL;DR

**Just want to test the game?**

1. Run: `npm run dev:both`
2. Open: `http://localhost:3000/`
3. Play! (No login needed)

**Want to test admin controls?**

1. Open: `http://localhost:3000/admin-game`
2. If blocked, comment out `<ProtectedRoute>` in `App.tsx`
3. Control the game!

---

**The game works without login for testing. Login pages are ready but use mock authentication for now!** 🎮
