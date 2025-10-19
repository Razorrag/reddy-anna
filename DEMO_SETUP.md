# Andar Bahar Game - Complete Demo Analysis & Setup Guide

## Overview
This document details how to transform the current Andar Bahar project into the complete demo experience described. It maps out the existing architecture and provides the fixes needed to achieve the full game flow with Admin, Player, and Backend perspectives.

## Current Architecture Analysis

### Frontend Components
- **App.tsx**: Main routing with routes for `/player`, `/admin`, `/admin-login`, etc.
- **PlayerGame**: Main player interface
- **AdminGame**: Admin interface to control the game
- **Admin**: Admin dashboard
- **GameStateContext**: Manages game state (selectedOpeningCard, andarCards, baharCards, phase, timer, etc.)
- **WebSocketContext**: Handles WebSocket communication between components
- **NotificationSystem**: Provides user notifications

### Backend Components
- **Server (index.ts)**: Express server with WebSocket support
- **Routes (routes.ts)**: REST APIs and WebSocket handlers
- **Storage (storage.ts)**: Current in-memory database implementation
- **WebSocket Server**: Manages real-time communication

## Game Flow Mapping

### Current State vs Desired Flow

**Current Working Features:**
- Basic WebSocket communication is implemented
- Game state management exists (opening card, phases, betting, dealing)
- Betting functionality with timer
- Card dealing mechanism
- Basic UI for player and admin views
- Game session management

**Missing/Incomplete Features for Demo:**
1. Proper payout mechanism
2. Wallet/balance updates
3. Round tracking system
4. Betting stats display
5. Proper phase transitions
6. Real-time betting updates
7. Game history tracking
8. User authentication system

## Required Changes to Achieve Demo

### 1. Fix Context Provider Order (CRITICAL)
**File**: `client/src/providers/AppProviders.tsx`

**Current Issue**: WebSocketProvider tries to access GameStateContext before GameStateProvider is established.
```tsx
// INCORRECT ORDER
<NotificationProvider>
  <WebSocketProvider>
    <GameStateProvider>
      {children}
    </GameStateProvider>
  </WebSocketProvider>
</NotificationProvider>
```

**Solution**: Reorder providers
```tsx
// CORRECT ORDER
<GameStateProvider>
  <NotificationProvider>
    <WebSocketProvider>
      {children}
    </WebSocketProvider>
  </NotificationProvider>
</GameStateProvider>
```

### 2. Fix WebSocket URL Configuration
**File**: `client/src/contexts/WebSocketContext.tsx`

**Current Issue**: WebSocket tries to connect to the same port as the frontend (port 3000) instead of backend (port 5000).

**Solution**: Update URL construction
```ts
const getWebSocketUrl = (): string => {
  if (typeof window !== 'undefined') {
    // Use environment variable or fallback to backend port
    const backendHost = import.meta.env.VITE_WS_BASE_URL || 'localhost:5000';
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${backendHost}/ws`;
  }
  return process.env.WEBSOCKET_URL || 'ws://localhost:5000';
};
```

### 3. Implement Complete Game State Management
**File**: `client/src/contexts/GameStateContext.tsx`

**Required Actions**:
- Add wallet/balance management
- Add round tracking
- Add betting statistics
- Add game history
- Add user authentication state

**Extended GameState Interface**:
```ts
interface GameState {
  selectedOpeningCard: Card | null;
  andarCards: Card[];
  baharCards: Card[];
  phase: 'idle' | 'opening' | 'betting' | 'dealing' | 'complete';
  countdownTimer: number;
  gameWinner: 'andar' | 'bahar' | null;
  isGameActive: boolean;
  currentRound: number;
  playerBets: {
    andar: number; // total amount bet on andar
    bahar: number; // total amount bet on bahar
  };
  playerWallet: number;
  gameHistory: GameResult[];
  userRole: 'player' | 'admin';
}
```

### 4. Enhance WebSocket Communication Protocol
**File**: `server/routes.ts`

**Current Messages Support**: Basic game state sync, card dealing, timer updates.

**Required Additional Messages**:
- `bet_placed`: When a player places a bet
- `payout_processed`: When winnings are distributed
- `round_change`: When game moves to next round
- `wallet_update`: When player's wallet is updated

### 5. Update Game Logic for Multi-Round Simulation
**Current Issue**: The game doesn't properly handle multiple rounds as described in the demo.

**Required Changes**:
- Add round tracking (Round 1, Round 2, Continuous Draw)
- Implement 30-second timer for betting rounds
- Implement continuous draw after betting rounds
- Add winning card detection (matching opening card rank)

### 6. Implement Payout System
**Files**: `server/storage.ts` and corresponding API endpoints

**Current Issue**: No proper wallet/balance management.

**Required Changes**:
- Add user balance tracking
- Implement 1:1 payout for winning bets
- Update player balances after each game
- Track individual player bets per round

### 7. Create Admin Dashboard Enhancements
**Component**: `AdminGame` or `Admin` page

**Required Features**:
- Real-time betting stats display
- Round tracking information
- Total bet amounts for each side
- Lowest bet tracking
- Game history display

### 8. Update Player Interface
**Component**: `PlayerGame` page

**Required Features**:
- Clear display of current round
- Wallet balance display
- Current game status updates
- Betting interface with chip selection
- Visual indication of active betting window

## Port Configuration Issues

### Current Port Setup:
- **Frontend (Vite)**: Port 3000 (`vite.config.ts`)
- **Backend (Express)**: Port 5000 (`server/index.ts`)
- **WebSocket**: Same port as backend (5000)
- **RTMP**: Port 1935
- **HLS**: Port 8000

### Required Configuration:

1. **Add Environment Variables** (`.env` file):
```
VITE_API_BASE_URL=http://localhost:5000
VITE_WS_BASE_URL=localhost:5000
PORT=5000
```

2. **Update Vite Configuration** (`vite.config.ts`):
```ts
export default defineConfig({
  plugins: [react()],
  root: path.resolve(__dirname, "client"),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "client", "src"),
      "@shared": path.resolve(__dirname, "shared"),
    },
  },
  server: {
    host: true,
    port: 5000,  // Change to match backend
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      '/ws': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        ws: true,
      }
    }
  },
});
```

## Required Backend Enhancements

### 1. User Authentication
- Implement login/signup for players
- Admin authentication system
- JWT token management

### 2. Game Session Management
- Multi-game session support
- Proper game state persistence
- Player session tracking

### 3. Real-time Broadcasting
- Proper WebSocket message broadcasting to all clients
- Live stats updates
- Game state synchronization

## Database Migration Plan

### Current: In-Memory Storage (storage.ts)
- Good for development
- No persistence between server restarts

### Recommended: Add Database Support
- PostgreSQL (current schema exists)
- Supabase (for real-time capabilities)
- Required tables: users, player_bets, game_sessions, dealt_cards, game_history

## Setup Instructions for Complete Demo

### Step 1: Environment Setup
1. Install Node.js v18+ and PostgreSQL
2. Clone the repository
3. Run `npm install`

### Step 2: Database Setup
```bash
# Option A: Use Supabase (recommended for demo)
# 1. Create Supabase project
# 2. Update schema with required tables
# 3. Add environment variables to .env

# Option B: Local PostgreSQL
# 1. Start PostgreSQL server
# 2. Run database migrations
```

### Step 3: Environment Variables (.env file)
```
VITE_API_BASE_URL=http://localhost:5000
VITE_WS_BASE_URL=localhost:5000
PORT=5000
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_key
SUPABASE_SERVICE_KEY=your_service_key
```

### Step 4: Apply Required Code Fixes

**Fix 1**: Update AppProviders.tsx (context provider order)
**Fix 2**: Update WebSocketContext.tsx (URL configuration)
**Fix 3**: Enhance GameStateContext.tsx (full game state)
**Fix 4**: Update server/routes.ts (enhanced WebSocket messages)
**Fix 5**: Create payout/management logic
**Fix 6**: Update UI components for admin/player views

### Step 5: Run the Application
```bash
npm run dev  # Should run both client and server
```

### Step 6: Demo Setup
1. **Admin**: Open `http://localhost:5000/admin`
2. **Player A**: Open `http://localhost:5000/player` (wallet ₹50,00,000)
3. **Player B**: Open `http://localhost:5000/player` (wallet ₹10,00,000)

### Step 7: Execute Demo Flow
1. Admin selects opening card (e.g., "7♥️")
2. Admin starts game with 30-second timer
3. Players place bets during Round 1
4. Admin deals cards for Round 1 (no winner)
5. Players place bets during Round 2
6. Admin deals cards for Round 2 (no winner)
7. Admin starts continuous draw
8. Admin deals cards until match found (e.g., "7♦️")
9. BAHAR wins - payouts calculated and distributed
10. Game complete notification sent to all players
11. Admin resets game for next round

## Expected Demo Flow

### Phase 1: Setup
- Admin sets opening card
- Players see opening card and timer
- Players begin placing bets

### Phase 2: Round 1 (30 sec betting)
- Players can place bets on Andar/Bahar
- Real-time betting stats update
- Timer counts down

### Phase 3: Round 1 Dealing
- Betting stops
- Cards dealt to both sides
- Check for winner (none found)

### Phase 4: Round 2 (30 sec betting)
- New 30-second timer starts
- Players place new bets
- Stats updated separately for Round 2

### Phase 5: Round 2 Dealing
- Betting stops
- Cards dealt
- Check for winner (none found)

### Phase 6: Continuous Draw
- Betting permanently closed
- Admin continues dealing until card matches opening card rank
- Winner determined

### Phase 7: Payout & Reset
- Payouts calculated (1:1 on winning side total)
- Player wallets updated
- Game history recorded
- Ready for next game

## Error Prevention Checklist

- [ ] Context provider order fixed
- [ ] WebSocket URL configuration correct
- [ ] Port conflicts resolved
- [ ] Environment variables set
- [ ] Database connection established
- [ ] Game state properly initialized
- [ ] Payout logic implemented
- [ ] Real-time updates working
- [ ] Player authentication working
- [ ] Admin controls functional
- [ ] UI properly displays all game states

This setup will provide the complete demo experience as described, with proper role separation between Admin and Players, real-time updates, and accurate payout calculations.