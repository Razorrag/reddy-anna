# 🏗️ System Architecture - Andar Bahar Game

## Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     CLIENT (Browser)                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ Player UI    │  │ Admin Panel  │  │ Auth Pages   │     │
│  │ (React)      │  │ (React)      │  │ (React)      │     │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘     │
│         │                  │                  │              │
│         └──────────────────┴──────────────────┘              │
│                            │                                 │
└────────────────────────────┼─────────────────────────────────┘
                             │
                    ┌────────┴────────┐
                    │                 │
            HTTP/REST API      WebSocket (ws://)
                    │                 │
┌───────────────────┴─────────────────┴─────────────────────────┐
│                    SERVER (Node.js + Express)                  │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │                    server/index.ts                        │ │
│  │  • CORS Configuration                                     │ │
│  │  • Security Headers                                       │ │
│  │  • JWT Authentication                                     │ │
│  │  • Route Registration                                     │ │
│  └────────────────────┬─────────────────────────────────────┘ │
│                       │                                         │
│  ┌────────────────────┴─────────────────────────────────────┐ │
│  │              Route Modules (server/routes/)               │ │
│  │                                                            │ │
│  │  ┌─────────────────────────────────────────────────────┐ │ │
│  │  │ auth-routes.ts                                      │ │ │
│  │  │  • POST /api/auth/register                          │ │ │
│  │  │  • POST /api/auth/login                             │ │ │
│  │  │  • POST /api/auth/admin-login                       │ │ │
│  │  └─────────────────────────────────────────────────────┘ │ │
│  │                                                            │ │
│  │  ┌─────────────────────────────────────────────────────┐ │ │
│  │  │ websocket-routes.ts (MAIN GAME LOGIC)               │ │ │
│  │  │  • Creates HTTP + WebSocket Server                  │ │ │
│  │  │  • Path: /ws                                        │ │ │
│  │  │  • JWT Authentication                               │ │ │
│  │  │  • Game State Management                            │ │ │
│  │  │  • Bet Processing                                   │ │ │
│  │  │  • Real-time Broadcasts                             │ │ │
│  │  └─────────────────────────────────────────────────────┘ │ │
│  │                                                            │ │
│  │  ┌─────────────────────────────────────────────────────┐ │ │
│  │  │ game-routes.ts                                      │ │ │
│  │  │  • GET /api/game/state                              │ │ │
│  │  │  • GET /api/game/history                            │ │ │
│  │  └─────────────────────────────────────────────────────┘ │ │
│  │                                                            │ │
│  │  ┌─────────────────────────────────────────────────────┐ │ │
│  │  │ admin-routes.ts                                     │ │ │
│  │  │  • GET /api/admin/dashboard                         │ │ │
│  │  │  • GET /api/admin/users                             │ │ │
│  │  │  • PATCH /api/admin/users/:id/balance               │ │ │
│  │  └─────────────────────────────────────────────────────┘ │ │
│  │                                                            │ │
│  │  ┌─────────────────────────────────────────────────────┐ │ │
│  │  │ payment-routes.ts                                   │ │ │
│  │  │  • POST /api/payment/deposit                        │ │ │
│  │  │  • POST /api/payment/withdraw                       │ │ │
│  │  │  • GET /api/payment/requests                        │ │ │
│  │  └─────────────────────────────────────────────────────┘ │ │
│  │                                                            │ │
│  │  ┌─────────────────────────────────────────────────────┐ │ │
│  │  │ user-routes.ts                                      │ │ │
│  │  │  • GET /api/user/profile                            │ │ │
│  │  │  • PATCH /api/user/profile                          │ │ │
│  │  │  • GET /api/user/bets                               │ │ │
│  │  └─────────────────────────────────────────────────────┘ │ │
│  │                                                            │ │
│  │  ┌─────────────────────────────────────────────────────┐ │ │
│  │  │ stream-routes.ts                                    │ │ │
│  │  │  • GET /api/stream/settings                         │ │ │
│  │  │  • PATCH /api/stream/settings/:key                  │ │ │
│  │  └─────────────────────────────────────────────────────┘ │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │              Storage Layer (server/)                      │ │
│  │                                                            │ │
│  │  ┌─────────────────────────────────────────────────────┐ │ │
│  │  │ storage-supabase.ts                                 │ │ │
│  │  │  • Database Operations                              │ │ │
│  │  │  • User Management                                  │ │ │
│  │  │  • Bet Management                                   │ │ │
│  │  │  • Balance Updates (Atomic)                         │ │ │
│  │  │  • Game Session Management                          │ │ │
│  │  └─────────────────────────────────────────────────────┘ │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────┬───────────────────────────────┘
                              │
                    ┌─────────┴─────────┐
                    │                   │
┌───────────────────┴─────┐   ┌─────────┴───────────────┐
│   SUPABASE (PostgreSQL) │   │   Environment Variables │
│                         │   │                         │
│  • users table          │   │  • JWT_SECRET           │
│  • games table          │   │  • SUPABASE_URL         │
│  • bets table           │   │  • SUPABASE_SERVICE_KEY │
│  • payments table       │   │  • PORT                 │
│  • bonus_balance table  │   │  • NODE_ENV             │
│  • stream_settings      │   │  • ALLOWED_ORIGINS      │
└─────────────────────────┘   └─────────────────────────┘
```

---

## 🔄 Complete Betting Flow

### 1. User Authentication
```
┌─────────┐
│ Client  │
└────┬────┘
     │ POST /api/auth/login
     │ { phone, password }
     ▼
┌────────────────┐
│ auth-routes.ts │
└────┬───────────┘
     │ Validate credentials
     │ Generate JWT token
     ▼
┌─────────────────────┐
│ storage-supabase.ts │
│ getUser()           │
└─────────────────────┘
     │
     ▼
┌─────────┐
│ Client  │ Receives JWT token
└─────────┘
```

### 2. WebSocket Connection
```
┌─────────┐
│ Client  │
└────┬────┘
     │ ws://localhost:5000/ws
     │ Send: { type: 'authenticate', data: { token } }
     ▼
┌──────────────────────┐
│ websocket-routes.ts  │
└────┬─────────────────┘
     │ Verify JWT token
     │ Register client
     ▼
┌─────────────────┐
│ In-Memory Store │
│ clients Map     │
└─────────────────┘
     │
     ▼
┌─────────┐
│ Client  │ Receives: { type: 'auth_success' }
└─────────┘
```

### 3. Admin Starts Game
```
┌─────────┐
│ Admin   │
└────┬────┘
     │ WebSocket: { type: 'game_start', data: { openingCard } }
     ▼
┌──────────────────────┐
│ websocket-routes.ts  │
└────┬─────────────────┘
     │ Validate admin role
     │ Create game session
     ▼
┌─────────────────────┐
│ storage-supabase.ts │
│ createGameSession() │
└─────────────────────┘
     │
     ▼
┌─────────────────┐
│ In-Memory State │
│ gameState       │
└─────────────────┘
     │
     ▼
┌─────────────┐
│ Broadcast   │ { type: 'opening_card_confirmed' }
│ All Clients │ { type: 'timer_start' }
└─────────────┘
```

### 4. Player Places Bet
```
┌─────────┐
│ Player  │
└────┬────┘
     │ WebSocket: { type: 'bet_placed', data: { side, amount } }
     ▼
┌──────────────────────┐
│ websocket-routes.ts  │
└────┬─────────────────┘
     │ Validate:
     │  • Not admin
     │  • Sufficient balance
     │  • Valid bet amount
     │  • Betting phase active
     ▼
┌─────────────────────┐
│ storage-supabase.ts │
│ createBet()         │
│ updateUserBalance() │ ← ATOMIC UPDATE
└─────────────────────┘
     │
     ▼
┌─────────────────┐
│ In-Memory State │
│ Update totals   │
└─────────────────┘
     │
     ▼
┌─────────────┐
│ Broadcast   │ { type: 'bet_success' } → Player
│ All Clients │ { type: 'betting_stats' } → All
└─────────────┘
```

### 5. Admin Deals Cards
```
┌─────────┐
│ Admin   │
└────┬────┘
     │ WebSocket: { type: 'deal_card', data: { card, side } }
     ▼
┌──────────────────────┐
│ websocket-routes.ts  │
└────┬─────────────────┘
     │ Validate:
     │  • Admin role
     │  • Dealing phase
     │  • Correct sequence (Bahar → Andar)
     ▼
┌─────────────────┐
│ In-Memory State │
│ Add card        │
│ Check winner    │
└─────────────────┘
     │
     ▼
┌─────────────┐
│ Broadcast   │ { type: 'card_dealt' }
│ All Clients │
└─────────────┘
     │
     ▼ (if winner found)
┌─────────────────────┐
│ storage-supabase.ts │
│ processPayout()     │
│ updateUserBalance() │ ← ATOMIC UPDATE
│ updateGameStats()   │
└─────────────────────┘
     │
     ▼
┌─────────────┐
│ Broadcast   │ { type: 'game_ended' }
│ All Clients │ { type: 'balance_updated' } → Winners
└─────────────┘
```

---

## 🔐 Security Architecture

### JWT Authentication Flow
```
┌─────────┐
│ Login   │
└────┬────┘
     │
     ▼
┌──────────────────┐
│ Generate JWT     │
│ • userId         │
│ • role           │
│ • exp (24h)      │
└────┬─────────────┘
     │
     ▼
┌──────────────────┐
│ Client stores    │
│ token in memory  │
└────┬─────────────┘
     │
     ▼
┌──────────────────┐
│ All requests     │
│ include token    │
│ Authorization:   │
│ Bearer <token>   │
└────┬─────────────┘
     │
     ▼
┌──────────────────┐
│ Server validates │
│ JWT signature    │
│ Check expiration │
└────┬─────────────┘
     │
     ▼
┌──────────────────┐
│ Attach user info │
│ to req.user      │
└──────────────────┘
```

### Rate Limiting
```
┌─────────────────┐
│ User places bet │
└────┬────────────┘
     │
     ▼
┌─────────────────────────┐
│ Check rate limit        │
│ • Max 30 bets/minute    │
│ • Per user tracking     │
│ • 60s window            │
└────┬────────────────────┘
     │
     ▼
┌─────────────────────────┐
│ If exceeded:            │
│ • Reject bet            │
│ • Send error message    │
│                         │
│ If OK:                  │
│ • Increment counter     │
│ • Process bet           │
└─────────────────────────┘
```

### Atomic Balance Updates
```
┌──────────────────┐
│ Bet placed       │
│ Amount: ₹1000    │
└────┬─────────────┘
     │
     ▼
┌─────────────────────────────────┐
│ PostgreSQL Function             │
│ update_balance_atomic()         │
│                                 │
│ BEGIN TRANSACTION;              │
│   SELECT balance                │
│     FROM users                  │
│     WHERE id = $1               │
│     FOR UPDATE;  ← ROW LOCK     │
│                                 │
│   IF balance >= $2 THEN         │
│     UPDATE users                │
│       SET balance = balance + $2│
│       WHERE id = $1;            │
│   ELSE                          │
│     RAISE EXCEPTION;            │
│   END IF;                       │
│ COMMIT;                         │
└─────────────────────────────────┘
     │
     ▼
┌──────────────────┐
│ Success: Balance │
│ updated safely   │
│                  │
│ Failure: Bet     │
│ rejected         │
└──────────────────┘
```

---

## 📊 Data Flow

### Game State Management
```
┌─────────────────────────────────────────┐
│         In-Memory State                 │
│  (websocket-routes.ts gameState)        │
│                                         │
│  • gameId: string                       │
│  • phase: 'betting' | 'dealing'         │
│  • currentRound: 1 | 2 | 3              │
│  • openingCard: string                  │
│  • andarCards: string[]                 │
│  • baharCards: string[]                 │
│  • winner: 'andar' | 'bahar' | null     │
│  • round1Bets: { andar, bahar }         │
│  • round2Bets: { andar, bahar }         │
│  • userBets: Map<userId, bets>          │
│  • bettingLocked: boolean               │
└────────────┬────────────────────────────┘
             │
             │ Sync to database
             ▼
┌─────────────────────────────────────────┐
│         Database (Supabase)             │
│                                         │
│  games table:                           │
│  • game_id (PK)                         │
│  • opening_card                         │
│  • phase                                │
│  • current_round                        │
│  • winner                               │
│  • created_at                           │
│  • updated_at                           │
│                                         │
│  bets table:                            │
│  • bet_id (PK)                          │
│  • user_id (FK)                         │
│  • game_id (FK)                         │
│  • round                                │
│  • side                                 │
│  • amount                               │
│  • status                               │
│  • payout                               │
└─────────────────────────────────────────┘
```

### Real-time Synchronization
```
┌──────────────┐
│ State Change │
└──────┬───────┘
       │
       ▼
┌─────────────────────┐
│ Update In-Memory    │
│ gameState           │
└──────┬──────────────┘
       │
       ├─────────────────────┐
       │                     │
       ▼                     ▼
┌──────────────┐    ┌────────────────┐
│ Save to DB   │    │ Broadcast via  │
│ (async)      │    │ WebSocket      │
└──────────────┘    └────────┬───────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │ All Connected   │
                    │ Clients Receive │
                    │ Update          │
                    └─────────────────┘
```

---

## 🚀 Deployment Architecture

### Development
```
┌─────────────────────────────────────┐
│ Local Machine                       │
│                                     │
│  ┌──────────────┐  ┌─────────────┐ │
│  │ Vite Dev     │  │ Node Server │ │
│  │ Server       │  │ (Express)   │ │
│  │ :5173        │  │ :5000       │ │
│  └──────────────┘  └─────────────┘ │
└─────────────────────────────────────┘
         │                    │
         └────────┬───────────┘
                  │
         ┌────────┴────────┐
         │                 │
    ┌────┴─────┐    ┌──────┴──────┐
    │ Supabase │    │ .env (local)│
    │ (Cloud)  │    └─────────────┘
    └──────────┘
```

### Production
```
┌─────────────────────────────────────────┐
│ Production Server (VPS/Cloud)           │
│                                         │
│  ┌───────────────────────────────────┐ │
│  │ Nginx Reverse Proxy               │ │
│  │ • SSL/TLS Termination             │ │
│  │ • WebSocket Upgrade               │ │
│  │ • Static File Serving             │ │
│  └────────┬──────────────────────────┘ │
│           │                             │
│  ┌────────┴──────────────────────────┐ │
│  │ Node.js Server (PM2)              │ │
│  │ • Express + WebSocket             │ │
│  │ • Port 5000                       │ │
│  │ • Multiple Instances (Cluster)    │ │
│  └────────┬──────────────────────────┘ │
└───────────┼─────────────────────────────┘
            │
    ┌───────┴────────┐
    │                │
┌───┴────┐    ┌──────┴──────┐
│Supabase│    │ Environment │
│(Cloud) │    │ Variables   │
└────────┘    │ (Secrets)   │
              └─────────────┘
```

---

## 🔍 Monitoring & Debugging

### Server Logs
```
✅ CORS configured
✅ JWT-only authentication configured
✅ WebSocket server running on the same port as HTTP server
✅ Game session created with ID: game-1730223600000
💰 Bet placed successfully: user-123 -> -₹1000
🎯 Winner detected: Andar
💸 Payout processed: user-123 -> +₹1900
```

### Client Console
```javascript
// WebSocket connection
✅ Connected to ws://localhost:5000/ws

// Authentication
📨 Received: { type: 'auth_success', data: { userId, role } }

// Game events
📨 Received: { type: 'opening_card_confirmed', data: { ... } }
📨 Received: { type: 'timer_start', data: { seconds: 30 } }
📨 Received: { type: 'bet_success', data: { ... } }
📨 Received: { type: 'card_dealt', data: { ... } }
📨 Received: { type: 'game_ended', data: { winner, payouts } }
```

---

## 📝 Key Files Reference

### Core Server Files
- `server/index.ts` - Main server entry point
- `server/routes/websocket-routes.ts` - WebSocket + game logic (1240 lines)
- `server/storage-supabase.ts` - Database operations
- `server/auth.ts` - JWT authentication

### Client Files
- `client/src/pages/player-game.tsx` - Player game interface
- `client/src/pages/admin-game.tsx` - Admin control panel
- `client/src/contexts/WebSocketContext.tsx` - WebSocket client

### Configuration
- `.env` - Environment variables
- `package.json` - Dependencies
- `tsconfig.json` - TypeScript config
- `vite.config.ts` - Build config

---

**Status**: 🟢 **PRODUCTION READY**

This architecture provides:
- ✅ Scalable WebSocket communication
- ✅ Atomic database operations
- ✅ Real-time synchronization
- ✅ Secure JWT authentication
- ✅ Rate limiting and validation
- ✅ Complete game flow implementation
