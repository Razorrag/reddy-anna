# 🧪 TESTING GUIDE - Andar Bahar Game

## 🚀 Quick Start Testing

### **Prerequisites**
1. Server is running on port 5000
2. Client is running on port 5173 (or deployed)
3. Database is set up with schema
4. Environment variables are configured

---

## 📋 TEST SCENARIOS

### **Scenario 1: User Registration & Login**

**Steps:**
1. Navigate to `/register`
2. Fill in registration form:
   - Phone: 10-digit number
   - Username: Unique username
   - Password: Minimum 6 characters
   - Full Name: Your name
3. Click "Register"
4. Navigate to `/login`
5. Enter phone and password
6. Click "Login"

**Expected Results:**
- ✅ Registration success message
- ✅ Redirect to login page
- ✅ Login success message
- ✅ JWT token stored in localStorage
- ✅ Redirect to game page
- ✅ User data visible in UI

**Check:**
```javascript
// Open browser console
localStorage.getItem('token')        // Should show JWT token
localStorage.getItem('user')         // Should show user data
localStorage.getItem('isLoggedIn')   // Should be 'true'
```

---

### **Scenario 2: WebSocket Connection**

**Steps:**
1. Login as player
2. Open browser console
3. Check for WebSocket messages

**Expected Results:**
- ✅ "🔌 Connecting to WebSocket" message
- ✅ "✅ WebSocket connected successfully" message
- ✅ "📤 Sending WebSocket authentication" message
- ✅ "✅ WebSocket authentication sent" message
- ✅ Connection status shows "Connected"

**Check:**
```javascript
// In browser console
window.gameWebSocket                 // Should be WebSocket object
window.gameWebSocket.readyState      // Should be 1 (OPEN)
```

---

### **Scenario 3: Admin Panel Access**

**Steps:**
1. Login with admin credentials
2. Navigate to `/admin`
3. Check admin controls

**Expected Results:**
- ✅ Admin panel loads
- ✅ Opening card selector visible
- ✅ Card dealing controls visible
- ✅ Game controls visible
- ✅ Analytics dashboard visible

**Admin Credentials:**
- Check `docs/ADMIN_CREDENTIALS.md` for credentials

---

### **Scenario 4: Complete Game Flow (Round 1 Winner)**

**Setup:**
- Admin logged in
- At least 1 player logged in

**Steps:**
1. **Admin:** Select opening card (e.g., "K♠")
2. **Admin:** Click "Start Game"
3. **Player:** Place bet on Andar (₹1000)
4. **Admin:** Wait for betting timer to end
5. **Admin:** Deal 1st card to Bahar (e.g., "5♥")
6. **Admin:** Deal 2nd card to Andar (e.g., "K♦") - WINNER!

**Expected Results:**
- ✅ Opening card broadcast to all players
- ✅ Betting phase starts with timer
- ✅ Player can place bet
- ✅ Balance deducted immediately (₹1000)
- ✅ Betting locked after timer
- ✅ Cards dealt and broadcast
- ✅ Winner detected (Andar)
- ✅ Payout calculated (₹2000 for 1:1)
- ✅ Balance updated (original + ₹2000)
- ✅ Game complete message shown
- ✅ Game resets after 5 seconds

**Verify:**
```javascript
// Player's balance should increase by ₹1000 (bet ₹1000, won ₹2000)
// Check in UI and localStorage
JSON.parse(localStorage.getItem('user')).balance
```

---

### **Scenario 5: Complete Game Flow (Round 2 Winner)**

**Steps:**
1. **Admin:** Select opening card (e.g., "Q♥")
2. **Admin:** Start game
3. **Player:** Bet ₹2000 on Bahar (Round 1)
4. **Admin:** Deal to Bahar (e.g., "7♠") - No match
5. **Admin:** Deal to Andar (e.g., "3♦") - No match
6. **System:** Auto-transition to Round 2
7. **Player:** Bet ₹3000 on Bahar (Round 2)
8. **Admin:** Deal to Bahar (e.g., "Q♣") - WINNER!

**Expected Results:**
- ✅ Round 1 completes without winner
- ✅ "Round 1 complete! Starting Round 2..." notification
- ✅ Round 2 betting starts automatically
- ✅ Player can place Round 2 bet
- ✅ Winner detected in Round 2
- ✅ Payout: R1 Bahar (₹2000 × 2) + R2 Bahar (₹3000 × 1) = ₹7000
- ✅ Balance updated correctly

---

### **Scenario 6: Complete Game Flow (Round 3 Winner)**

**Steps:**
1. **Admin:** Select opening card (e.g., "A♠")
2. **Admin:** Start game
3. **Player:** Bet ₹1000 on Andar (Round 1)
4. **Admin:** Deal R1 cards - No winner
5. **System:** Auto-transition to Round 2
6. **Player:** Bet ₹1000 on Andar (Round 2)
7. **Admin:** Deal R2 cards - No winner
8. **System:** Auto-transition to Round 3
9. **Admin:** Deal alternating cards until match (e.g., 5th card is "A♦" on Andar)

**Expected Results:**
- ✅ Round 1 and 2 complete without winner
- ✅ Round 3 starts (Continuous Draw)
- ✅ No betting in Round 3
- ✅ Cards dealt alternating (Bahar, Andar, Bahar, Andar...)
- ✅ Winner detected when match occurs
- ✅ Payout: Total Andar bets (₹2000) × 2 = ₹4000
- ✅ Balance updated correctly

---

### **Scenario 7: Insufficient Balance**

**Steps:**
1. Login as player with low balance (e.g., ₹500)
2. Try to place bet of ₹1000

**Expected Results:**
- ✅ Error message: "Insufficient balance"
- ✅ Bet not placed
- ✅ Balance unchanged

---

### **Scenario 8: Duplicate Bet Prevention**

**Steps:**
1. Place bet on Andar (₹1000)
2. Try to place another bet on Andar in same round

**Expected Results:**
- ✅ Error message: "You have already placed a bet on this side for this round"
- ✅ Second bet not placed
- ✅ Balance only deducted once

---

### **Scenario 9: Token Expiration**

**Steps:**
1. Login as player
2. Wait for token to expire (1 hour) OR manually delete token
3. Try to place a bet

**Expected Results:**
- ✅ Error message: "Authentication required"
- ✅ Automatic redirect to login page
- ✅ localStorage cleared

**Manual Test:**
```javascript
// In browser console
localStorage.removeItem('token')
// Then try to place a bet
```

---

### **Scenario 10: WebSocket Reconnection**

**Steps:**
1. Login and connect
2. Stop the server
3. Wait 5 seconds
4. Restart the server

**Expected Results:**
- ✅ "WebSocket closed" message
- ✅ "Attempting to reconnect" messages
- ✅ Exponential backoff (1s, 2s, 4s, 8s, 16s)
- ✅ Successful reconnection when server is back
- ✅ Automatic re-authentication
- ✅ Game state synchronized

---

## 🔍 DEBUGGING TIPS

### **Check WebSocket Messages**
```javascript
// In browser console, monitor WebSocket traffic
const ws = window.gameWebSocket;
ws.addEventListener('message', (event) => {
  console.log('📨 Received:', JSON.parse(event.data));
});
```

### **Check Game State**
```javascript
// Access game state from context (if exposed)
// Or check server logs for state changes
```

### **Check Balance Updates**
```javascript
// Monitor balance changes
const checkBalance = () => {
  const user = JSON.parse(localStorage.getItem('user'));
  console.log('Current balance:', user.balance);
};
checkBalance();
```

### **Check Server Logs**
```bash
# Server should log all important events:
# - WebSocket connections
# - Authentication attempts
# - Bet placements
# - Card dealing
# - Winner detection
# - Balance updates
# - Errors
```

---

## 🐛 COMMON ISSUES & SOLUTIONS

### **Issue: WebSocket won't connect**
**Solution:**
1. Check server is running
2. Check CORS settings in server
3. Check WebSocket URL in client
4. Check browser console for errors

### **Issue: Token not stored**
**Solution:**
1. Check login response includes token
2. Check localStorage is enabled
3. Check browser privacy settings

### **Issue: Balance not updating**
**Solution:**
1. Check WebSocket connection
2. Check server logs for errors
3. Check database function `update_balance_atomic` exists
4. Check Supabase connection

### **Issue: Winner not detected**
**Solution:**
1. Check card format (e.g., "K♠" not "K-spades")
2. Check opening card is set
3. Check server logs for winner detection
4. Verify `checkWinner()` function is called

### **Issue: Round not progressing**
**Solution:**
1. Check `isRoundComplete()` logic
2. Check card counts (Andar/Bahar)
3. Check server logs for transition messages
4. Verify timer is working

---

## 📊 PERFORMANCE TESTING

### **Load Test: Multiple Players**
1. Open 5+ browser tabs
2. Login different players in each
3. All place bets simultaneously
4. Check for race conditions

**Expected:**
- ✅ All bets processed correctly
- ✅ No duplicate balance deductions
- ✅ All clients receive updates
- ✅ No server crashes

### **Stress Test: Rapid Actions**
1. Rapidly place multiple bets
2. Rapidly deal multiple cards
3. Check system stability

**Expected:**
- ✅ Rate limiting prevents abuse
- ✅ Server handles load
- ✅ No data corruption

---

## ✅ FINAL CHECKLIST

Before deploying to production:

- [ ] All test scenarios pass
- [ ] No console errors
- [ ] WebSocket stable
- [ ] Balance updates correct
- [ ] Winner detection works
- [ ] Round progression works
- [ ] Error handling works
- [ ] Token expiration works
- [ ] Reconnection works
- [ ] Multiple players work
- [ ] Admin controls work
- [ ] Database functions exist
- [ ] Environment variables set
- [ ] CORS configured
- [ ] SSL/TLS enabled (production)

---

## 🎯 AUTOMATED TESTING (Future)

Consider adding:
- Unit tests for game logic
- Integration tests for API endpoints
- E2E tests with Playwright/Cypress
- Load tests with Artillery/k6

---

**Happy Testing! 🎮**
