# Complete Testing Checklist
**For Andar Bahar Game Application**

---

## Pre-Testing Setup

### Environment Setup
- [ ] Backend running on port 5000: `npm run dev:server`
- [ ] Frontend running on port 3000: `npm run dev:client`
- [ ] WebSocket proxy configured in vite.config.ts
- [ ] .env file configured with all required variables
- [ ] Database/storage initialized

### Browser Setup
- [ ] Clear browser cache and cookies
- [ ] Open DevTools (F12)
- [ ] Check Console tab for errors
- [ ] Check Network tab for WebSocket connection
- [ ] Check Application tab for localStorage/session

---

## 1. Backend Testing

### Server Startup
- [ ] Server starts without errors
- [ ] Port 5000 is accessible
- [ ] WebSocket server initialized on /ws
- [ ] RTMP server running on port 1935
- [ ] No TypeScript compilation errors

### WebSocket Connection
- [ ] WebSocket connects successfully
- [ ] Connection message logged in console
- [ ] Authentication message sent
- [ ] Initial game state synced
- [ ] No connection errors

### API Endpoints
Test each endpoint with Postman/curl:

**Auth Endpoints:**
- [ ] POST /api/auth/signup - Creates new user
- [ ] POST /api/auth/login - Returns user data
- [ ] POST /api/auth/logout - Destroys session
- [ ] GET /api/auth/me - Returns current user

**Game Endpoints:**
- [ ] GET /api/game/current - Returns game state
- [ ] GET /api/game/history - Returns game history
- [ ] GET /api/user/balance - Returns user balance
- [ ] GET /api/game/stream-status - Returns stream status

---

## 2. Frontend Testing

### Routing
- [ ] `/` loads player game page
- [ ] `/player-game` loads player game page
- [ ] `/login` loads login page
- [ ] `/signup` loads signup page
- [ ] `/admin-login` loads admin login page
- [ ] `/admin` loads admin dashboard (protected)
- [ ] `/admin-game` loads admin game control (protected)
- [ ] `/game` loads admin game control (protected)
- [ ] `/game-admin` loads admin game control (protected)
- [ ] `/user-admin` loads user management (protected)
- [ ] `/unauthorized` loads access denied page
- [ ] Invalid routes show 404 page

### Protected Routes (DEV Mode)
- [ ] Can access admin routes without login (DEV bypass)
- [ ] Admin routes render correctly
- [ ] No infinite redirect loops

### Protected Routes (Production Mode)
- [ ] Cannot access admin routes without login
- [ ] Redirects to /admin-login
- [ ] After login, redirects to intended route
- [ ] Wrong role redirects to /unauthorized

---

## 3. Game Flow Testing - Round 1

### Game Initialization
- [ ] Admin opens /admin-game or /game
- [ ] Opening card selector displays 52 cards
- [ ] Can select any card (A-K, all suits)
- [ ] Selected card highlights
- [ ] Start game button enabled after selection

### Starting Game
- [ ] Click "Start Game" button
- [ ] Opening card confirmed message appears
- [ ] Timer starts at 30 seconds
- [ ] Timer counts down every second
- [ ] Timer synced across all clients
- [ ] Phase changes to "betting"
- [ ] Round indicator shows "ROUND 1"
- [ ] Betting areas become active

### Player Betting (Round 1)
- [ ] Chip selector displays 8 chips (1K-50K)
- [ ] Can select chip value
- [ ] Selected chip highlights
- [ ] Click Andar area to place bet
- [ ] Bet amount deducted from wallet
- [ ] Bet displays in Andar section
- [ ] Click Bahar area to place bet
- [ ] Bet amount deducted from wallet
- [ ] Bet displays in Bahar section
- [ ] Can place multiple bets
- [ ] Total bets update in real-time
- [ ] Wallet balance updates immediately

### Bet Validation
- [ ] Cannot bet with insufficient balance
- [ ] Cannot bet less than 1000
- [ ] Cannot bet more than 50000
- [ ] Cannot bet after timer expires
- [ ] Cannot bet in dealing phase
- [ ] Error notifications display correctly

### Timer Expiration
- [ ] Timer reaches 0
- [ ] Betting automatically locks
- [ ] Phase changes to "dealing"
- [ ] "Betting closed" notification appears
- [ ] Cannot place more bets
- [ ] Admin can now deal cards

### Dealing Cards (Round 1)
- [ ] Admin sees card selector
- [ ] Can select any card
- [ ] Click "Deal to Bahar" button
- [ ] Card appears in Bahar section
- [ ] Card animation plays
- [ ] All players see the card
- [ ] Click "Deal to Andar" button
- [ ] Card appears in Andar section
- [ ] All players see the card

### Winner Detection (Round 1)
**If match found:**
- [ ] Winner detected immediately
- [ ] Game phase changes to "complete"
- [ ] Winner announcement displays
- [ ] Payouts calculated correctly
  - [ ] Andar wins: 1:1 (double money)
  - [ ] Bahar wins: 1:0 (refund only)
- [ ] Wallet balances updated
- [ ] Balance update notifications sent
- [ ] Bet status updated (won/lost)
- [ ] Game saved to history

**If no match:**
- [ ] No winner detected
- [ ] Wait 2 seconds
- [ ] Auto-transition to Round 2
- [ ] "Round 2 betting started" notification

---

## 4. Game Flow Testing - Round 2

### Round 2 Start
- [ ] Round indicator changes to "ROUND 2"
- [ ] New 30-second timer starts
- [ ] Phase changes to "betting"
- [ ] Round 1 bets remain visible (locked)
- [ ] Can place NEW bets
- [ ] Round 1 + Round 2 bets shown separately

### Player Betting (Round 2)
- [ ] Can select chips again
- [ ] Can place bets on Andar
- [ ] Can place bets on Bahar
- [ ] Round 2 bets ADD to Round 1 bets
- [ ] Total bets = R1 + R2
- [ ] Wallet deducted for R2 bets only
- [ ] Both round totals display correctly

### Timer & Dealing (Round 2)
- [ ] Timer counts down from 30
- [ ] Betting locks at 0
- [ ] Phase changes to "dealing"
- [ ] Admin deals 1 more Bahar card
- [ ] Admin deals 1 more Andar card
- [ ] Cards display in correct order

### Winner Detection (Round 2)
**If match found:**
- [ ] Winner detected
- [ ] Game completes
- [ ] Payouts calculated correctly
  - [ ] Andar wins: ALL bets (R1+R2) paid 1:1
  - [ ] Bahar wins: R1 paid 1:1, R2 refunded
- [ ] Balances updated
- [ ] Game saved to history

**If no match:**
- [ ] Wait 2 seconds
- [ ] Auto-transition to Round 3
- [ ] "Round 3: Continuous Draw" notification

---

## 5. Game Flow Testing - Round 3

### Round 3 Start
- [ ] Round indicator changes to "ROUND 3"
- [ ] NO timer displayed
- [ ] Phase is "dealing"
- [ ] ALL bets permanently locked
- [ ] Cannot place any new bets
- [ ] Both R1 and R2 bets visible
- [ ] Message: "All bets locked"

### Continuous Dealing
- [ ] Admin can deal cards continuously
- [ ] No timer restriction
- [ ] Cards alternate: Bahar → Andar → Bahar → Andar
- [ ] Each card displays immediately
- [ ] All players see cards in real-time
- [ ] No betting allowed

### Winner Detection (Round 3)
- [ ] First matching card wins
- [ ] Game completes immediately
- [ ] Winner announced
- [ ] Payouts calculated correctly
  - [ ] BOTH sides: Total (R1+R2) paid 1:1
- [ ] All players receive payouts
- [ ] Balances updated
- [ ] Game saved to history

---

## 6. Multi-User Testing

### Setup
- [ ] Open 2-3 browser windows (or use incognito)
- [ ] Each window represents different player
- [ ] All connect to same game

### Synchronization Tests
- [ ] All players see same opening card
- [ ] All players see same timer value
- [ ] Timer synced within 1 second
- [ ] All players see same phase
- [ ] All players see same round number
- [ ] All players see same dealt cards
- [ ] Card dealing synced immediately

### Betting Tests
- [ ] Player 1 places bet
- [ ] Player 2 sees total bets update
- [ ] Player 3 sees total bets update
- [ ] Each player's wallet independent
- [ ] Total bets = sum of all player bets
- [ ] Admin sees all bets

### Payout Tests
- [ ] Game completes with winner
- [ ] Each player receives correct payout
- [ ] Payouts based on individual bets
- [ ] Balances update independently
- [ ] All players notified

---

## 7. Admin Panel Testing

### Opening Card Selection
- [ ] All 52 cards displayed
- [ ] Cards organized by suit
- [ ] Can select any card
- [ ] Selected card highlights
- [ ] Can change selection
- [ ] Start button enabled/disabled correctly

### Game Controls
- [ ] Start Game button works
- [ ] Deal Card buttons work
- [ ] Deal to Andar button works
- [ ] Deal to Bahar button works
- [ ] Round transition buttons work
- [ ] Reset Game button works
- [ ] Confirmation dialog on reset

### Settings Modal
- [ ] Settings button opens modal
- [ ] Game settings tab displays
- [ ] Stream settings tab displays
- [ ] Can modify min bet amount
- [ ] Can modify max bet amount
- [ ] Can modify timer duration
- [ ] Can modify stream URL
- [ ] Can modify stream type
- [ ] Save button works
- [ ] Settings persist after save
- [ ] Cancel button discards changes

### Betting Statistics
- [ ] Total Andar bets display
- [ ] Total Bahar bets display
- [ ] Round 1 bets display
- [ ] Round 2 bets display
- [ ] Bet counts display
- [ ] Statistics update in real-time
- [ ] Percentages calculated correctly

### Stream Management
- [ ] Video stream displays
- [ ] Stream URL can be changed
- [ ] RTMP settings configurable
- [ ] Stream status indicator works
- [ ] Can switch between video/RTMP

---

## 8. Error Handling

### Network Errors
- [ ] WebSocket disconnect handled
- [ ] Reconnection attempts work
- [ ] Reconnection backoff works
- [ ] Max reconnection attempts respected
- [ ] Error notifications display
- [ ] Game state preserved during reconnect

### Validation Errors
- [ ] Invalid bet amount rejected
- [ ] Invalid bet side rejected
- [ ] Late bets rejected
- [ ] Round 3 bets rejected
- [ ] Insufficient balance rejected
- [ ] Error messages clear and helpful

### Server Errors
- [ ] Server crash handled gracefully
- [ ] API errors caught and displayed
- [ ] WebSocket errors logged
- [ ] No unhandled promise rejections
- [ ] No uncaught exceptions

---

## 9. UI/UX Testing

### Responsiveness
- [ ] Desktop (1920x1080) renders correctly
- [ ] Laptop (1366x768) renders correctly
- [ ] Tablet (768x1024) renders correctly
- [ ] Mobile (375x667) renders correctly
- [ ] No horizontal scrolling
- [ ] All buttons accessible
- [ ] Text readable at all sizes

### Animations
- [ ] Timer pulse animation works
- [ ] Card dealing animation smooth
- [ ] Notification slide-in works
- [ ] Button hover effects work
- [ ] Loading spinners display
- [ ] No animation lag

### Accessibility
- [ ] All buttons have labels
- [ ] Keyboard navigation works
- [ ] Tab order logical
- [ ] Focus indicators visible
- [ ] Color contrast sufficient
- [ ] No flashing content

### Performance
- [ ] Page loads in < 3 seconds
- [ ] No memory leaks
- [ ] WebSocket messages < 100ms latency
- [ ] Timer updates smooth (no jitter)
- [ ] No console errors
- [ ] No console warnings (except dev)

---

## 10. Edge Cases

### Timing Edge Cases
- [ ] Bet placed at exactly 0 seconds
- [ ] Multiple bets in quick succession
- [ ] Card dealt during timer countdown
- [ ] Timer expires during bet placement
- [ ] Round transition during bet placement

### State Edge Cases
- [ ] Refresh page during betting
- [ ] Refresh page during dealing
- [ ] Refresh page during payout
- [ ] Close tab and reopen
- [ ] Multiple tabs same user
- [ ] Admin and player same browser

### Data Edge Cases
- [ ] Balance exactly 0
- [ ] Balance exactly bet amount
- [ ] Bet all chips at once
- [ ] Place 100+ bets in one round
- [ ] Very long game (50+ cards)
- [ ] Rapid game resets

---

## 11. Security Testing

### Authentication
- [ ] Cannot access admin without login
- [ ] Cannot access protected routes
- [ ] Session expires after timeout
- [ ] Logout clears session
- [ ] Cannot reuse old session
- [ ] Password hashing works

### Authorization
- [ ] Player cannot access admin routes
- [ ] Player cannot deal cards
- [ ] Player cannot reset game
- [ ] Player cannot modify settings
- [ ] Admin can access all features

### Input Validation
- [ ] SQL injection prevented
- [ ] XSS attacks prevented
- [ ] CSRF protection works
- [ ] Rate limiting works
- [ ] Invalid JSON rejected
- [ ] Malformed WebSocket messages rejected

---

## 12. Performance Testing

### Load Testing
- [ ] 10 concurrent users
- [ ] 50 concurrent users
- [ ] 100 concurrent users
- [ ] Server remains responsive
- [ ] WebSocket connections stable
- [ ] No memory leaks
- [ ] CPU usage acceptable

### Stress Testing
- [ ] Rapid bet placement (10/second)
- [ ] Rapid card dealing (5/second)
- [ ] Multiple games simultaneously
- [ ] Server handles gracefully
- [ ] No crashes
- [ ] Error messages appropriate

---

## 13. Browser Compatibility

### Desktop Browsers
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)
- [ ] Opera (latest)

### Mobile Browsers
- [ ] Chrome Mobile (Android)
- [ ] Safari Mobile (iOS)
- [ ] Firefox Mobile
- [ ] Samsung Internet

### Features to Test
- [ ] WebSocket support
- [ ] Video playback
- [ ] CSS Grid/Flexbox
- [ ] LocalStorage
- [ ] Session cookies
- [ ] ES6+ features

---

## 14. Regression Testing

After any code changes, re-test:
- [ ] Game flow (all 3 rounds)
- [ ] Multi-user sync
- [ ] Payout calculations
- [ ] Timer synchronization
- [ ] WebSocket connection
- [ ] Authentication
- [ ] Admin controls

---

## Test Results Template

```
Date: ___________
Tester: ___________
Environment: Dev / Staging / Production

PASSED: ___ / ___
FAILED: ___ / ___
BLOCKED: ___ / ___

Critical Issues:
1. 
2. 
3. 

Minor Issues:
1. 
2. 
3. 

Notes:


```

---

## Automated Testing (Future)

### Unit Tests
- [ ] Payout calculation function
- [ ] Timer management function
- [ ] Winner detection function
- [ ] Bet validation function
- [ ] Card generation function

### Integration Tests
- [ ] WebSocket message flow
- [ ] API endpoint responses
- [ ] Database operations
- [ ] Session management
- [ ] Authentication flow

### E2E Tests (Playwright/Cypress)
- [ ] Complete game flow
- [ ] Multi-user scenario
- [ ] Admin controls
- [ ] Error handling
- [ ] Payment flow

---

**Total Test Cases:** 300+  
**Estimated Testing Time:** 4-6 hours (manual)  
**Automation Potential:** 60% of tests

---

**Last Updated:** October 20, 2025
