# Quick Start Guide - Andar Bahar Game
**Get up and running in 5 minutes**

---

## Prerequisites

- Node.js 18+ installed
- npm or yarn package manager
- Git (optional)

---

## Step 1: Install Dependencies (2 minutes)

```bash
# Navigate to project directory
cd e:\next\reddy-anna

# Install all dependencies
npm install
```

**What gets installed:**
- Express server dependencies
- React + Vite frontend
- WebSocket (ws) library
- Database drivers (Drizzle ORM)
- UI components (shadcn/ui)
- Authentication libraries (bcrypt)

---

## Step 2: Configure Environment (1 minute)

```bash
# Copy example env file
copy .env.example .env

# Edit .env file (optional - defaults work for dev)
```

**Minimum required in `.env`:**
```env
NODE_ENV=development
PORT=5000
SESSION_SECRET=your-secret-key-here-change-in-production
```

**Optional (for production):**
```env
DATABASE_URL=postgresql://...
SUPABASE_URL=https://...
SUPABASE_SERVICE_KEY=...
```

---

## Step 3: Start the Application (1 minute)

### Option A: Start Both (Recommended)
```bash
npm run dev:both
```
This starts:
- Backend server on `http://localhost:5000`
- Frontend dev server on `http://localhost:3000`

### Option B: Start Separately
```bash
# Terminal 1 - Backend
npm run dev:server

# Terminal 2 - Frontend
npm run dev:client
```

---

## Step 4: Access the Application (30 seconds)

### Player Interface
Open browser: **http://localhost:3000**
- Main game interface
- Place bets
- View live stream
- Real-time updates

### Admin Interface
Open browser: **http://localhost:3000/admin-login**
- Admin login page
- Username: `admin` (or any username with "admin")
- Password: (any password in dev mode)

After login: **http://localhost:3000/admin**
- Game control panel
- Deal cards
- Manage rounds
- View betting statistics

---

## Step 5: Test the Game (30 seconds)

### Quick Test Flow

1. **Open two browser windows:**
   - Window 1: Player at `http://localhost:3000`
   - Window 2: Admin at `http://localhost:3000/admin`

2. **Admin: Start Game**
   - Select opening card (e.g., 7♥)
   - Click "Start Game"
   - Timer starts (30 seconds)

3. **Player: Place Bet**
   - Select chip (e.g., 5000)
   - Click "Andar" or "Bahar"
   - See balance deduct

4. **Admin: Deal Cards**
   - Wait for timer to expire
   - Select card for Bahar
   - Click "Deal to Bahar"
   - Select card for Andar
   - Click "Deal to Andar"

5. **See Results**
   - If match found → Winner announced
   - If no match → Auto-transition to Round 2
   - Payouts distributed automatically

---

## Common Issues & Solutions

### Issue: Port 5000 already in use
**Solution:**
```bash
# Change port in .env
PORT=5001

# Or kill process on port 5000 (Windows)
netstat -ano | findstr :5000
taskkill /PID <PID> /F
```

### Issue: WebSocket not connecting
**Solution:**
1. Check backend is running on port 5000
2. Check frontend proxy in `client/vite.config.ts`
3. Clear browser cache and reload

### Issue: "Session is undefined" error
**Solution:**
Add session middleware to `server/index.ts`:
```typescript
import session from 'express-session';
import MemoryStore from 'memorystore';

const MemoryStoreSession = MemoryStore(session);

app.use(session({
  secret: process.env.SESSION_SECRET || 'dev-secret',
  resave: false,
  saveUninitialized: false,
  store: new MemoryStoreSession({
    checkPeriod: 86400000
  }),
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000
  }
}));
```

### Issue: Cannot access admin routes
**Solution:**
1. DEV mode bypasses auth (ProtectedRoute.tsx line 41)
2. Set localStorage manually:
```javascript
localStorage.setItem('isLoggedIn', 'true');
localStorage.setItem('userRole', 'admin');
```

---

## Development Workflow

### File Structure
```
reddy-anna/
├── client/              # Frontend (React + Vite)
│   ├── src/
│   │   ├── pages/       # Page components
│   │   ├── components/  # Reusable components
│   │   ├── contexts/    # React contexts
│   │   └── lib/         # Utilities
│   └── vite.config.ts   # Vite configuration
├── server/              # Backend (Express)
│   ├── index.ts         # Server entry point
│   ├── routes.ts        # API routes + WebSocket
│   ├── storage.ts       # In-memory storage
│   └── lib/             # Server utilities
├── shared/              # Shared types
│   └── schema.ts        # Database schema + types
└── docs/                # Documentation
```

### Hot Reload
- ✅ Frontend: Automatic (Vite HMR)
- ✅ Backend: Automatic (tsx watch mode)
- ✅ Changes reflect immediately

### Debugging
```bash
# Backend logs
npm run dev:server
# Watch console for WebSocket messages

# Frontend logs
# Open browser DevTools (F12)
# Check Console tab for errors
# Check Network tab for WebSocket
```

---

## Test Accounts (Development)

### Players
```
Username: player1
Password: password123

Username: player2
Password: password123
```

### Admin
```
Username: admin
Password: admin123

Username: gameadmin
Password: admin123
```

**Note:** In development mode, any password works due to auth bypass.

---

## Next Steps

### For Development
1. Read `COMPREHENSIVE_SYSTEM_AUDIT.md` for system overview
2. Read `CRITICAL_FIXES_REQUIRED.md` for production prep
3. Read `TESTING_CHECKLIST.md` for testing guide

### For Production
1. Apply critical fixes (session middleware, CORS, etc.)
2. Remove DEV auth bypass
3. Set up PostgreSQL database
4. Configure Redis for sessions
5. Set environment variables
6. Deploy to hosting platform

---

## Useful Commands

### Development
```bash
npm run dev              # Start backend only
npm run dev:client       # Start frontend only
npm run dev:both         # Start both (recommended)
npm run dev:reset        # Reset development environment
```

### Building
```bash
npm run build            # Build both frontend and backend
npm run build:client     # Build frontend only
```

### Production
```bash
npm run start            # Start production server
npm run start:client     # Preview production build
```

### Database
```bash
npm run db:push          # Push schema to database
```

### Type Checking
```bash
npm run check            # TypeScript type checking
```

---

## Browser DevTools Tips

### Check WebSocket Connection
1. Open DevTools (F12)
2. Go to Network tab
3. Filter by "WS" (WebSocket)
4. Click on connection
5. See Messages tab for real-time data

### Check localStorage
1. Open DevTools (F12)
2. Go to Application tab
3. Expand "Local Storage"
4. Click on your domain
5. See stored user data

### Check Console Logs
1. Open DevTools (F12)
2. Go to Console tab
3. Filter by level (Error, Warning, Info)
4. See all application logs

---

## Performance Tips

### Development
- Use `npm run dev:both` for best experience
- Keep DevTools open to monitor WebSocket
- Clear localStorage if state gets corrupted

### Production
- Enable gzip compression
- Use CDN for static assets
- Configure Redis for sessions
- Set up database connection pooling

---

## Getting Help

### Documentation
- `COMPREHENSIVE_SYSTEM_AUDIT.md` - Full system analysis
- `CRITICAL_FIXES_REQUIRED.md` - Production checklist
- `TESTING_CHECKLIST.md` - 300+ test cases
- `FRONTEND_IMPROVEMENTS_APPLIED.md` - Recent changes

### Common Questions

**Q: How do I reset the game?**
A: Admin panel → Click "Reset Game" button

**Q: How do I change bet limits?**
A: Admin panel → Settings → Modify min/max bet amounts

**Q: How do I add more players?**
A: Open multiple browser windows or use different browsers

**Q: How do I test payouts?**
A: Follow the test flow in Step 5 above

---

## Success Checklist

After following this guide, you should have:
- ✅ Backend running on port 5000
- ✅ Frontend running on port 3000
- ✅ WebSocket connected (check console)
- ✅ Can access player interface
- ✅ Can access admin interface
- ✅ Can start a game
- ✅ Can place bets
- ✅ Can deal cards
- ✅ See real-time updates

**If all checked, you're ready to develop! 🎉**

---

**Last Updated:** October 20, 2025  
**Estimated Setup Time:** 5 minutes  
**Difficulty:** Easy
