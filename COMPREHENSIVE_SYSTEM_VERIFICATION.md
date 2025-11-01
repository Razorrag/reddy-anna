# Comprehensive System Verification & Testing Guide

## 🎯 Complete Functionality Checklist

This document verifies every critical function in the system to ensure nothing is broken.

---

## 1. 🔐 Authentication & User Management

### 1.1 User Registration Flow
**Test:** Create a new user account

**Frontend:** `/signup`
**API:** `POST /auth/register`
**Backend:** `server/auth.ts` → `registerUser()`

**Data Flow:**
```
Frontend Form
  ↓ { name, phone, password, confirmPassword, referralCode }
API Endpoint
  ↓ Validate input
  ↓ Check if user exists (getUserByPhone)
  ↓ Hash password (bcrypt)
  ↓ Create user in database
  ↓ Generate JWT tokens
  ↓ Return { success: true, user, token, refreshToken }
Frontend
  ↓ Store token in localStorage
  ↓ Update AuthContext
  ↓ Redirect to /game
```

**Test Cases:**
- [ ] Register with phone: `9876543210`, password: `Test123!` → Should succeed
- [ ] Register with same phone again → Should fail (user exists)
- [ ] Register with weak password: `test123` → Should fail (validation)
- [ ] Register with referral code → Should create referral relationship
- [ ] Check database: User created with correct data
- [ ] Check database: Password is properly hashed
- [ ] Check token: JWT contains correct user data

**Verification Query:**
```sql
SELECT id, phone, full_name, balance, role, created_at 
FROM users 
WHERE phone = '9876543210';
```

---

### 1.2 User Login Flow
**Test:** Login with existing user

**Frontend:** `/login`
**API:** `POST /api/auth/login`
**Backend:** `server/auth.ts` → `loginUser()`

**Data Flow:**
```
Frontend Form
  ↓ { phone, password }
API Endpoint
  ↓ Sanitize phone (strip non-numeric)
  ↓ Find user (getUserByPhone)
  ↓ Validate password (bcrypt.compare)
  ↓ Update last_login
  ↓ Generate JWT tokens
  ↓ Return { success: true, user, token, refreshToken }
Frontend
  ↓ Store token in localStorage
  ↓ Update AuthContext
  ↓ Redirect to /game
```

**Test Cases:**
- [ ] Login with correct phone and password → Should succeed
- [ ] Login with correct phone, wrong password → Should fail
- [ ] Login with non-existent phone → Should fail (user not found)
- [ ] Login with formatted phone `(987) 654-3210` → Should succeed (strips formatting)
- [ ] Check localStorage: Token stored correctly
- [ ] Check database: last_login updated

---

### 1.3 Admin Login Flow
**Test:** Login as admin

**Frontend:** `/admin-login`
**API:** `POST /api/auth/admin-login`
**Backend:** `server/auth.ts` → `loginAdmin()`

**Data Flow:**
```
Frontend Form
  ↓ { username, password }
API Endpoint
  ↓ Sanitize username (lowercase, trim)
  ↓ Find admin (getAdminByUsername)
  ↓ Validate password (bcrypt.compare)
  ↓ Generate JWT tokens
  ↓ Return { success: true, admin, token, refreshToken }
Frontend
  ↓ Store token in localStorage
  ↓ Update AuthContext
  ↓ Redirect to /admin
```

**Test Cases:**
- [ ] Login with username: `admin`, password: `Admin@123` → Should succeed
- [ ] Login with username: `Admin` (capital A), password: `Admin@123` → Should succeed
- [ ] Login with username: `ADMIN` (all caps), password: `Admin@123` → Should succeed
- [ ] Login with username: `admin`, password: `admin@123` (wrong case) → Should fail
- [ ] Check localStorage: Token stored with admin role

**Verification Query:**
```sql
SELECT id, username, role, created_at 
FROM admin_credentials 
WHERE username = 'admin';
```

---

## 2. 💰 Balance Management

### 2.1 Initial Balance on Registration
**Test:** User gets default balance on signup

**Backend:** `server/auth.ts` → `registerUser()` line 191

**Data Flow:**
```
Registration
  ↓ DEFAULT_BALANCE from env or 0
  ↓ Create user with balance: defaultBalance
  ↓ Set original_deposit_amount: defaultBalance
Database
  ↓ users.balance = DEFAULT_BALANCE
  ↓ users.original_deposit_amount = DEFAULT_BALANCE
```

**Test Cases:**
- [ ] Register new user → Check balance in database
- [ ] Check `.env` for DEFAULT_BALANCE value
- [ ] Balance should be stored as decimal/string in DB
- [ ] Balance displayed as number in frontend

**Verification Query:**
```sql
SELECT id, phone, balance, original_deposit_amount 
FROM users 
WHERE phone = '9876543210';
```

---

### 2.2 Manual Balance Addition (Admin)
**Test:** Admin adds balance to user account

**Frontend:** `/admin/users` → UserDetailsModal
**API:** `POST /api/admin/user/:userId/balance`
**Backend:** `server/routes.ts` + `server/user-management.ts`

**Data Flow:**
```
Admin Panel
  ↓ { userId, amount, type: 'add' }
API Endpoint (requireAuth + requireRole(['admin']))
  ↓ Validate amount > 0
  ↓ Call updateUserBalance(userId, amount, type)
User Management
  ↓ Get current user (storage.getUser)
  ↓ Calculate new balance
  ↓ Update database (storage.updateUser)
  ↓ Create transaction record
  ↓ Broadcast balance update via WebSocket
Frontend
  ↓ Receive balance_update WebSocket message
  ↓ Update BalanceContext
  ↓ Update UI display
```

**Test Cases:**
- [ ] Admin adds ₹1000 to user → Balance increases by 1000
- [ ] Admin deducts ₹500 from user → Balance decreases by 500
- [ ] Check transaction history created
- [ ] Check WebSocket broadcasts balance update
- [ ] User receives balance update in real-time

**Verification Query:**
```sql
-- Check updated balance
SELECT id, phone, balance FROM users WHERE phone = '9876543210';

-- Check transaction record
SELECT * FROM user_transactions 
WHERE user_id = (SELECT id FROM users WHERE phone = '9876543210')
ORDER BY created_at DESC LIMIT 5;
```

---

### 2.3 Balance Deduction on Bet
**Test:** User places bet, balance is deducted

**Frontend:** `/game` → BettingStrip
**API:** WebSocket message `place_bet`
**Backend:** `server/socket/game-handlers.ts` → `handlePlayerBet()`

**Data Flow:**
```
User Interface
  ↓ Select chip amount (e.g., 2500)
  ↓ Click Andar or Bahar
WebSocket Message
  ↓ { type: 'place_bet', data: { side, amount, round } }
Game Handler
  ↓ Verify user authenticated
  ↓ Check balance >= amount
  ↓ Deduct from user.balance (storage.updateUser)
  ↓ Create bet record (storage.placeBet)
  ↓ Update game state
  ↓ Broadcast to all clients
User Interface
  ↓ Receive balance_update
  ↓ Update BalanceContext
  ↓ Display new balance
```

**Test Cases:**
- [ ] User has ₹10,000 balance
- [ ] Place ₹2,500 bet on Andar → Balance should be ₹7,500
- [ ] Try to bet ₹20,000 (more than balance) → Should fail
- [ ] Check bet created in player_bets table
- [ ] Check balance updated in users table
- [ ] User sees updated balance immediately

**Verification Query:**
```sql
-- Check balance after bet
SELECT id, phone, balance FROM users WHERE phone = '9876543210';

-- Check bet record
SELECT * FROM player_bets 
WHERE user_id = (SELECT id FROM users WHERE phone = '9876543210')
ORDER BY created_at DESC LIMIT 5;
```

---

### 2.4 Balance Addition on Win
**Test:** User wins, balance is increased

**Backend:** `server/routes.ts` → `completeGame()` lines 4094-4199

**Data Flow:**
```
Game Complete
  ↓ Calculate payouts for each user
  ↓ For each winning bet:
  ↓   Calculate payout amount
  ↓   Update user balance (storage.updateUserBalance)
  ↓   Update bet status to 'won'
  ↓   Update user stats (total_winnings, games_won)
  ↓   Broadcast balance_update via WebSocket
  ↓ For each losing bet:
  ↓   Update bet status to 'lost'
  ↓   Update user stats (total_losses)
User Interface
  ↓ Receive payout_received message
  ↓ Receive balance_update message
  ↓ Update BalanceContext
  ↓ Show payout notification
  ↓ Display updated balance
```

**Test Cases:**
- [ ] User bets ₹2,500 on Andar
- [ ] Andar wins (Round 1: 1:1 payout)
- [ ] User should receive ₹5,000 (original bet + winnings)
- [ ] Check balance increased
- [ ] Check bet status = 'won'
- [ ] Check user stats updated (games_won, total_winnings)

**Verification Query:**
```sql
-- Check balance after win
SELECT id, phone, balance, total_winnings, games_won 
FROM users WHERE phone = '9876543210';

-- Check bet status
SELECT id, amount, side, status, actual_payout 
FROM player_bets 
WHERE user_id = (SELECT id FROM users WHERE phone = '9876543210')
ORDER BY created_at DESC LIMIT 5;
```

---

## 3. 🎮 Game Flow

### 3.1 Start Game (Admin)
**Test:** Admin starts a new game

**Frontend:** `/admin/game` → AdminGamePanel → OpeningCardSelector
**API:** WebSocket message `start_game`
**Backend:** `server/socket/game-handlers.ts` → `handleStartGame()`

**Data Flow:**
```
Admin Panel
  ↓ Select opening card (e.g., 8♠)
  ↓ Click "Start Game"
WebSocket Message
  ↓ { type: 'start_game', data: { openingCard, timerDuration } }
Game Handler
  ↓ Verify admin role
  ↓ Create game session (storage.createGameSession)
  ↓ Set game state (phase: 'betting', round: 1)
  ↓ Start countdown timer
  ↓ Broadcast to all clients
All Players
  ↓ Receive opening_card_confirmed message
  ↓ Update GameStateContext
  ↓ Show opening card
  ↓ Enable betting
  ↓ Start countdown
```

**Test Cases:**
- [ ] Admin selects opening card 8♠ → Game starts
- [ ] Check game_sessions table: New record created
- [ ] All players see opening card
- [ ] Betting timer starts (30 seconds default)
- [ ] Players can place bets
- [ ] Check game_id generated and stored

**Verification Query:**
```sql
-- Check game session
SELECT * FROM game_sessions 
WHERE status = 'active' 
ORDER BY created_at DESC LIMIT 1;
```

---

### 3.2 Place Bet (Player)
**Test:** Player places bet during betting phase

**Frontend:** `/game` → MobileGameLayout → BettingStrip
**API:** WebSocket message `place_bet`
**Backend:** `server/socket/game-handlers.ts` → `handlePlayerBet()`

**Data Flow:**
```
Player Interface
  ↓ Select chip (e.g., ₹2,500)
  ↓ Click Andar or Bahar
Frontend Validation
  ↓ Check balance >= bet amount
  ↓ Check betting phase active
  ↓ Check not already bet this round
WebSocket Message
  ↓ { type: 'place_bet', data: { side, amount, round } }
Game Handler
  ↓ Verify authenticated
  ↓ Verify balance sufficient
  ↓ Deduct balance
  ↓ Create bet record
  ↓ Update game totals
  ↓ Broadcast betting_stats
All Clients
  ↓ Receive betting_stats update
  ↓ Update andarTotal, baharTotal
  ↓ Update UI display
```

**Test Cases:**
- [ ] Player places ₹2,500 on Andar → Bet recorded
- [ ] Check balance deducted
- [ ] Check player_bets table: Bet created
- [ ] All players see updated bet totals
- [ ] Player cannot bet again same round
- [ ] Cannot bet after timer expires

**Verification Query:**
```sql
-- Check bet
SELECT * FROM player_bets 
WHERE game_id = (
  SELECT game_id FROM game_sessions 
  WHERE status = 'active' 
  ORDER BY created_at DESC LIMIT 1
);
```

---

### 3.3 Deal Cards (Admin)
**Test:** Admin deals cards to Andar/Bahar

**Frontend:** `/admin/game` → AdminGamePanel → CardDealingPanel
**API:** WebSocket message `deal_card`
**Backend:** `server/socket/game-handlers.ts` → `handleDealCard()`

**Data Flow:**
```
Admin Panel
  ↓ Select card (e.g., 6♦)
  ↓ Click deal to Bahar
WebSocket Message
  ↓ { type: 'deal_card', data: { card, side, position } }
Game Handler
  ↓ Verify admin role
  ↓ Verify game in dealing phase
  ↓ Add card to game state
  ↓ Save to dealt_cards table
  ↓ Check if winning card
  ↓ If winning: Call completeGame()
  ↓ If not: Continue or advance round
  ↓ Broadcast card_dealt
All Clients
  ↓ Receive card_dealt message
  ↓ Add card to andarCards or baharCards
  ↓ Display card animation
  ↓ If winning: Show winner celebration
```

**Test Cases:**
- [ ] Admin deals cards → Cards appear for all players
- [ ] Cards alternate: Bahar first (Round 1)
- [ ] Check dealt_cards table: Cards recorded
- [ ] Matching card triggers game completion
- [ ] Winner announcement shown
- [ ] Payouts calculated and distributed

**Verification Query:**
```sql
-- Check dealt cards
SELECT * FROM dealt_cards 
WHERE game_id = (
  SELECT game_id FROM game_sessions 
  WHERE status = 'active' 
  ORDER BY created_at DESC LIMIT 1
)
ORDER BY position;
```

---

### 3.4 Game Completion & Payouts
**Test:** Game completes, winners receive payouts

**Backend:** `server/routes.ts` → `completeGame()` lines 4051-4406

**Data Flow:**
```
Winning Card Dealt
  ↓ completeGame(winner, winningCard) called
Calculate Payouts
  ↓ For each user bet:
  ↓   Calculate payout based on round and winner
  ↓   Round 1 Andar: 1:1 (double)
  ↓   Round 1 Bahar: 1:0 (refund)
  ↓   Round 2 Andar: 1:1 on all bets
  ↓   Round 2 Bahar: R1 1:1, R2 1:0
  ↓   Round 3 Both: 1:1 on all bets
Update Database
  ↓ Update user balances (storage.updateUserBalance)
  ↓ Update bet statuses (won/lost)
  ↓ Update user stats (games_played, games_won, total_winnings)
  ↓ Save game statistics
  ↓ Save game history
  ↓ Update daily/monthly/yearly stats
Broadcast Results
  ↓ Send payout_received to winners
  ↓ Send balance_update to all players
  ↓ Send game_complete to all
  ↓ Auto-reset after 5 seconds
```

**Test Cases:**
- [ ] User bets ₹2,500 on Andar, Andar wins Round 1
  - [ ] User receives ₹5,000 payout
  - [ ] Balance updated correctly
  - [ ] Bet status = 'won'
- [ ] User bets ₹2,500 on Bahar, Andar wins Round 1
  - [ ] User receives ₹0 (bet lost)
  - [ ] Balance stays same (already deducted)
  - [ ] Bet status = 'lost'
- [ ] Check game_statistics table
- [ ] Check game_history table
- [ ] Check daily_game_statistics updated

**Verification Query:**
```sql
-- Check game completion
SELECT * FROM game_sessions 
WHERE status = 'completed' 
ORDER BY created_at DESC LIMIT 1;

-- Check game statistics
SELECT * FROM game_statistics 
WHERE game_id = (
  SELECT game_id FROM game_sessions 
  WHERE status = 'completed' 
  ORDER BY created_at DESC LIMIT 1
);

-- Check game history
SELECT * FROM game_history 
ORDER BY created_at DESC LIMIT 1;

-- Check updated balances
SELECT id, phone, balance, total_winnings, games_played 
FROM users 
WHERE phone = '9876543210';
```

---

## 4. 📊 Analytics & Statistics

### 4.1 Real-time Analytics (Admin)
**Test:** Admin sees live game statistics

**Frontend:** `/admin/analytics` → AnalyticsDashboard
**API:** `GET /api/admin/analytics` + `GET /api/admin/realtime-stats`
**Backend:** `server/routes.ts` + `server/storage-supabase.ts`

**Data Flow:**
```
Frontend Component
  ↓ useAdminStats() hook
  ↓ Fetch /api/admin/analytics
  ↓ Fetch /api/admin/realtime-stats (polling)
Backend
  ↓ Get daily stats (getDailyStats)
  ↓ Get monthly stats (getMonthlyStats)
  ↓ Get yearly stats (getYearlyStats)
  ↓ Transform snake_case → camelCase
  ↓ Return formatted data
Frontend
  ↓ Display charts and cards
  ↓ Update every 5 seconds
```

**Test Cases:**
- [ ] Admin dashboard shows today's stats
- [ ] Total games count correct
- [ ] Total bets amount correct
- [ ] Total payouts correct
- [ ] Profit/loss calculated correctly
- [ ] Real-time stats update after game completes

**Verification Query:**
```sql
-- Check daily stats
SELECT * FROM daily_game_statistics 
WHERE date = CURRENT_DATE;

-- Check monthly stats
SELECT * FROM monthly_game_statistics 
WHERE month_year = TO_CHAR(CURRENT_DATE, 'YYYY-MM');

-- Check yearly stats
SELECT * FROM yearly_game_statistics 
WHERE year = EXTRACT(YEAR FROM CURRENT_DATE);
```

---

### 4.2 User Analytics
**Test:** User sees their own statistics

**Frontend:** `/profile` → UserProfileContext
**API:** `GET /api/user/analytics`
**Backend:** `server/routes.ts` lines 3764-3820

**Data Flow:**
```
Frontend Component
  ↓ UserProfileContext → fetchUserAnalytics()
  ↓ GET /api/user/analytics
Backend
  ↓ Get user bets (storage.getUserBets)
  ↓ Calculate total wins
  ↓ Calculate total losses
  ↓ Calculate win rate
  ↓ Get user data
  ↓ Return analytics
Frontend
  ↓ Display stats in profile page
```

**Test Cases:**
- [ ] User profile shows games played
- [ ] Shows games won
- [ ] Shows total winnings
- [ ] Shows total losses
- [ ] Shows win rate percentage
- [ ] Shows current balance

**Verification Query:**
```sql
SELECT 
  id, phone, 
  balance, 
  total_winnings, 
  total_losses, 
  games_played, 
  games_won,
  (games_won::float / NULLIF(games_played, 0) * 100) as win_rate
FROM users 
WHERE phone = '9876543210';
```

---

## 5. 💳 Payment System

### 5.1 Deposit Request (User)
**Test:** User requests deposit

**Frontend:** `/game` → WalletModal
**API:** `POST /api/user/payment/deposit-request`
**Backend:** `server/payment.ts` → `processPayment()`

**Data Flow:**
```
User Interface
  ↓ Click "Add Money"
  ↓ Enter amount (e.g., ₹5000)
  ↓ Select payment method
  ↓ Submit request
API Endpoint
  ↓ Create payment request
  ↓ Create WhatsApp request entry
  ↓ Send to admin for approval
  ↓ Return request ID
Admin Panel
  ↓ Receives notification
  ↓ Views request in /admin/payments
  ↓ Approves or rejects
If Approved
  ↓ Add balance to user
  ↓ Apply deposit bonus if configured
  ↓ Update user
  ↓ Notify user via WebSocket
```

**Test Cases:**
- [ ] User requests ₹5000 deposit → Request created
- [ ] Check admin_requests table
- [ ] Admin sees request in payments panel
- [ ] Admin approves → Balance added
- [ ] User receives notification
- [ ] Deposit bonus applied if enabled

**Verification Query:**
```sql
-- Check deposit request
SELECT * FROM admin_requests 
WHERE user_id = (SELECT id FROM users WHERE phone = '9876543210')
AND request_type = 'deposit'
ORDER BY created_at DESC LIMIT 5;

-- Check user balance after approval
SELECT id, phone, balance, deposit_bonus_available 
FROM users WHERE phone = '9876543210';
```

---

### 5.2 Withdrawal Request (User)
**Test:** User requests withdrawal

**Frontend:** `/game` → WalletModal
**API:** `POST /api/user/payment/withdrawal-request`
**Backend:** `server/payment.ts`

**Data Flow:**
```
User Interface
  ↓ Click "Withdraw"
  ↓ Enter amount (e.g., ₹3000)
  ↓ Check balance >= amount
  ↓ Submit request
API Endpoint
  ↓ Validate balance sufficient
  ↓ Deduct balance immediately (hold)
  ↓ Create withdrawal request
  ↓ Send to admin for approval
Admin Panel
  ↓ Reviews request
  ↓ Approves or rejects
If Approved
  ↓ Process payment
  ↓ Mark as completed
If Rejected
  ↓ Refund held balance
  ↓ Notify user
```

**Test Cases:**
- [ ] User requests ₹3000 withdrawal → Request created
- [ ] Balance deducted immediately
- [ ] Admin approves → Payment processed
- [ ] Admin rejects → Balance refunded
- [ ] Cannot withdraw more than balance

**Verification Query:**
```sql
-- Check withdrawal request
SELECT * FROM admin_requests 
WHERE user_id = (SELECT id FROM users WHERE phone = '9876543210')
AND request_type = 'withdrawal'
ORDER BY created_at DESC LIMIT 5;
```

---

## 6. 👥 User Management (Admin)

### 6.1 View All Users
**Test:** Admin views user list

**Frontend:** `/admin/users` → UserAdmin page
**API:** `GET /api/admin/users`
**Backend:** `server/user-management.ts` → `getAllUsers()`

**Data Flow:**
```
Admin Panel
  ↓ Navigate to /admin/users
  ↓ GET /api/admin/users
Backend
  ↓ storage.getAllUsers()
  ↓ Transform snake_case → camelCase
  ↓ Return user list
Frontend
  ↓ Display users table
  ↓ Show balance, status, games played
```

**Test Cases:**
- [ ] Admin sees list of all users
- [ ] User data displays correctly
- [ ] Can search/filter users
- [ ] Can click user to see details

---

### 6.2 Create User Manually (Admin)
**Test:** Admin creates user account

**Frontend:** `/admin/users` → Create User button
**API:** `POST /api/admin/create-user`
**Backend:** `server/user-management.ts` → `createUserManually()`

**Data Flow:**
```
Admin Panel
  ↓ Click "Create User"
  ↓ Enter: phone, name, password, initial balance
  ↓ Submit form
API Endpoint
  ↓ Validate phone number
  ↓ Check user doesn't exist
  ↓ Hash password
  ↓ Create user with initial balance
  ↓ Return success
```

**Test Cases:**
- [ ] Admin creates user with ₹10,000 initial balance
- [ ] User can login with provided credentials
- [ ] Balance shows ₹10,000
- [ ] User appears in users list

**Verification Query:**
```sql
SELECT * FROM users 
WHERE phone = '9999999999' 
ORDER BY created_at DESC LIMIT 1;
```

---

### 6.3 Update User Balance (Admin)
**Test:** Admin manually adjusts user balance

**Frontend:** `/admin/users` → UserDetailsModal → Balance tab
**API:** `POST /api/admin/user/:userId/balance`
**Backend:** `server/user-management.ts` → `updateUserBalance()`

**Data Flow:**
```
Admin Panel
  ↓ Open user details
  ↓ Click "Adjust Balance"
  ↓ Enter amount and type (add/subtract)
  ↓ Submit
API Endpoint
  ↓ Get current user balance
  ↓ Calculate new balance
  ↓ Update user record
  ↓ Create transaction entry
  ↓ Broadcast WebSocket update
User Interface
  ↓ Receives balance_update
  ↓ Updates BalanceContext
  ↓ Shows new balance
```

**Test Cases:**
- [ ] Admin adds ₹5000 to user → Balance increases
- [ ] Admin deducts ₹2000 from user → Balance decreases
- [ ] Transaction record created
- [ ] User sees updated balance immediately
- [ ] Cannot set negative balance

---

### 6.4 Block/Unblock User (Admin)
**Test:** Admin blocks user account

**Frontend:** `/admin/users` → UserDetailsModal
**API:** `POST /api/admin/user/:userId/status`
**Backend:** `server/user-management.ts` → `updateUserStatus()`

**Data Flow:**
```
Admin Panel
  ↓ Open user details
  ↓ Click "Block User"
  ↓ Confirm action
API Endpoint
  ↓ Update user status to 'blocked'
  ↓ Force logout user
  ↓ Disconnect WebSocket
User Interface
  ↓ User disconnected
  ↓ Redirected to login
  ↓ Cannot login (account blocked message)
```

**Test Cases:**
- [ ] Admin blocks user → Status = 'blocked'
- [ ] User cannot login
- [ ] User disconnected from game
- [ ] Admin unblocks user → User can login again

**Verification Query:**
```sql
SELECT id, phone, status FROM users 
WHERE phone = '9876543210';
```

---

## 7. 🔄 WebSocket Real-time Features

### 7.1 WebSocket Connection
**Test:** Client connects to WebSocket server

**Frontend:** `WebSocketContext.tsx`
**Backend:** `server/routes.ts` → WebSocket server

**Data Flow:**
```
Frontend
  ↓ Initialize WebSocketManager
  ↓ Connect to ws://host:port/ws
  ↓ Send authenticate message with JWT
Server
  ↓ Verify JWT token
  ↓ Add to clients array
  ↓ Send authenticated confirmation
Frontend
  ↓ Subscribe to game state
  ↓ Connection status: CONNECTED
```

**Test Cases:**
- [ ] WebSocket connects successfully
- [ ] Authentication successful
- [ ] Connection status shows "Connected"
- [ ] Can send/receive messages
- [ ] Reconnects on disconnect

---

### 7.2 Real-time Game State Sync
**Test:** All players see same game state

**Test Scenario:**
1. Admin starts game
2. Multiple players place bets
3. Admin deals cards
4. Game completes

**Verification:**
- [ ] All players see opening card simultaneously
- [ ] All players see betting timer countdown
- [ ] Bet totals update in real-time for all
- [ ] Cards appear for all players as dealt
- [ ] Winner announcement shows for all
- [ ] Payouts received immediately

---

### 7.3 Balance Updates via WebSocket
**Test:** Balance updates propagate in real-time

**Test Scenario:**
1. User places bet → Balance deducted
2. Admin adds balance → Balance increased
3. User wins game → Balance increased

**Verification:**
- [ ] Balance updates immediately without refresh
- [ ] Multiple tabs show same balance
- [ ] BalanceContext synchronized
- [ ] UI displays correct balance

---

## 8. 🔒 Security & Permissions

### 8.1 Route Protection
**Test:** Protected routes require authentication

**Test Cases:**
- [ ] Access `/game` without login → Redirect to `/login`
- [ ] Access `/admin` without login → Redirect to `/admin-login`
- [ ] Access `/admin` as player → Redirect to `/unauthorized`
- [ ] Access `/game` as admin → Allowed
- [ ] Access with expired token → Redirect to login

---

### 8.2 API Endpoint Protection
**Test:** API endpoints require proper authentication

**Test Cases:**
- [ ] Call `/api/user/balance` without token → 401 Unauthorized
- [ ] Call `/api/admin/users` as player → 403 Forbidden
- [ ] Call `/api/user/analytics` with valid token → Success
- [ ] Call with expired token → 401 Unauthorized

---

### 8.3 WebSocket Message Authorization
**Test:** WebSocket commands require proper role

**Test Cases:**
- [ ] Player tries `start_game` → Rejected (admin only)
- [ ] Player tries `deal_card` → Rejected (admin only)
- [ ] Admin tries `place_bet` → Allowed (admin can also play)
- [ ] Unauthenticated tries any command → Rejected

---

## 9. 📈 Database Integrity

### 9.1 Foreign Key Constraints
**Test:** Database relationships enforced

**Test Cases:**
- [ ] Delete game_session → Cascades to player_bets
- [ ] Delete user → Cascades to player_bets
- [ ] Create bet with invalid game_id → Fails
- [ ] Create bet with invalid user_id → Fails

---

### 9.2 Data Type Consistency
**Test:** Data stored in correct format

**Verification Queries:**
```sql
-- Check balance as decimal
SELECT pg_typeof(balance) FROM users LIMIT 1;

-- Check timestamps
SELECT pg_typeof(created_at) FROM users LIMIT 1;

-- Check enums
SELECT DISTINCT role FROM users;
SELECT DISTINCT status FROM users;
```

---

## 10. 🚀 Performance Tests

### 10.1 Multiple Concurrent Users
**Test:** System handles multiple users

**Test Scenario:**
- 10 users login simultaneously
- All place bets in same game
- Game completes
- All receive payouts

**Verification:**
- [ ] All logins succeed
- [ ] All bets recorded
- [ ] No race conditions
- [ ] All payouts calculated correctly
- [ ] Database consistent

---

### 10.2 Rapid Bet Placement
**Test:** Handle rapid bet attempts

**Test Scenario:**
- User rapidly clicks bet button multiple times
- System should prevent duplicate bets

**Verification:**
- [ ] Only one bet recorded per user per round
- [ ] Balance deducted only once
- [ ] No duplicate player_bets entries

---

## 11. 🛠️ Critical Issues Checklist

### Issues Found & Fixed
- [x] Admin username case sensitivity → Fixed with `.toLowerCase()`
- [x] Password comparison logging → Added debug logs
- [x] Analytics data showing 0 → Fixed snake_case transformation
- [x] Winner celebration not showing bet amounts → Fixed with andarTotal/baharTotal props

### Potential Issues to Verify
- [ ] Balance synchronization between contexts (BalanceContext vs GameStateContext)
- [ ] WebSocket reconnection after network interruption
- [ ] Token refresh when access token expires
- [ ] Race conditions in concurrent bet placement
- [ ] Decimal precision in monetary calculations
- [ ] Timezone handling in statistics

---

## 12. 📋 Deployment Checklist

### Before Production
- [ ] Remove debug password logging (server/auth.ts line 387)
- [ ] Change default admin password
- [ ] Set secure JWT_SECRET in production .env
- [ ] Enable rate limiting on all endpoints
- [ ] Set up database backups
- [ ] Configure SSL/TLS for WebSocket
- [ ] Test on production domain
- [ ] Load test with realistic user count
- [ ] Set up error monitoring (Sentry, etc.)
- [ ] Configure logging (log levels, rotation)

---

## 🎉 Quick Start Testing Script

### Test Sequence (30 minutes)

1. **Authentication (5 min)**
   - [ ] Register new user
   - [ ] Login as user
   - [ ] Login as admin
   - [ ] Verify tokens stored

2. **Balance Management (5 min)**
   - [ ] Check initial balance
   - [ ] Admin add ₹10,000 to user
   - [ ] Verify balance updated

3. **Game Flow (10 min)**
   - [ ] Admin start game with opening card
   - [ ] User place ₹2,500 bet on Andar
   - [ ] Verify balance deducted
   - [ ] Admin deal cards until winner
   - [ ] Verify payout received
   - [ ] Check game history created

4. **Analytics (5 min)**
   - [ ] Check admin dashboard shows game
   - [ ] Check user profile shows stats
   - [ ] Verify totals calculated correctly

5. **Admin Functions (5 min)**
   - [ ] View all users
   - [ ] Create new user
   - [ ] Update user balance
   - [ ] View payment requests

---

## 🐛 Troubleshooting Guide

### Common Issues

**Issue: "User not found" on login**
- Check phone number format (should be 10 digits)
- Verify user exists in database
- Check password hash exists

**Issue: "Invalid password" even with correct password**
- Check server logs for password comparison
- Verify password case (case-sensitive!)
- Check password hash in database not corrupted

**Issue: Balance not updating**
- Check WebSocket connected
- Check BalanceContext subscribed to updates
- Verify balance_update message broadcast

**Issue: Bets not recorded**
- Check user authenticated
- Check sufficient balance
- Check game in betting phase
- Check WebSocket message sent successfully

**Issue: Game stats showing 0**
- Check snake_case to camelCase transformation
- Verify data exists in database tables
- Check API endpoint returning data
- Verify frontend displaying correct fields

---

This comprehensive verification ensures every critical function is working correctly!

