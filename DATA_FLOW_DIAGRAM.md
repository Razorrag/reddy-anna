# 📊 COMPLETE DATA FLOW DIAGRAM

**Visual representation of all data flows in the Andar Bahar application**

---

## 🎯 BONUS SYSTEM - COMPLETE FLOW

```
┌─────────────────────────────────────────────────────────────────────┐
│                         BONUS SYSTEM FLOW                            │
└─────────────────────────────────────────────────────────────────────┘

1. USER DEPOSITS ₹10,000
   │
   ├─► Frontend (profile.tsx)
   │   └─► POST /user/payment-request
   │       { type: 'deposit', amount: 10000, paymentMethod: 'UPI' }
   │
   ├─► Backend (routes.ts:2369-2410)
   │   └─► storage.createPaymentRequest()
   │
   └─► Database (payment_requests table)
       └─► INSERT INTO payment_requests
           ✅ Status: 'pending'

2. ADMIN APPROVES DEPOSIT
   │
   ├─► Frontend (admin-payments.tsx)
   │   └─► PATCH /admin/payment-requests/:id/approve
   │
   ├─► Backend (routes.ts:2579-2637)
   │   ├─► storage.approvePaymentRequestAtomic()
   │   │   └─► Database: update_balance_atomic(userId, +10000)
   │   │       ✅ Balance: ₹0 → ₹10,000
   │   │
   │   └─► storage.createDepositBonus() ← NEW!
   │       └─► Database: INSERT INTO deposit_bonuses
   │           ├─► deposit_amount: ₹10,000
   │           ├─► bonus_amount: ₹500 (5%)
   │           ├─► wagering_required: ₹5,000 (10x)
   │           ├─► wagering_completed: ₹0
   │           ├─► wagering_progress: 0%
   │           └─► status: 'locked'
   │           ✅ Bonus Created!
   │
   └─► Database (bonus_transactions table)
       └─► INSERT INTO bonus_transactions
           ├─► action: 'added'
           ├─► description: 'Deposit bonus created'
           └─► amount: ₹500
           ✅ Audit Trail Logged!

3. USER PLACES BET ₹1,000
   │
   ├─► Frontend (WebSocketContext.tsx)
   │   └─► WebSocket: { type: 'place_bet', side: 'andar', amount: 1000 }
   │
   ├─► Backend (game-handlers.ts:200-256)
   │   ├─► storage.deductBalanceAtomic(userId, 1000)
   │   │   └─► Database: update_balance_atomic(userId, -1000)
   │   │       ✅ Balance: ₹10,000 → ₹9,000
   │   │
   │   ├─► storage.createBet()
   │   │   └─► Database: INSERT INTO player_bets
   │   │       ✅ Bet Recorded!
   │   │
   │   └─► storage.updateDepositBonusWagering(userId, 1000) ← NEW!
   │       └─► Database: UPDATE deposit_bonuses
   │           ├─► wagering_completed: ₹0 → ₹1,000
   │           ├─► wagering_progress: 0% → 20%
   │           └─► status: 'locked' (still locked)
   │           ✅ Wagering Tracked!
   │
   └─► Database (bonus_transactions table)
       └─► INSERT INTO bonus_transactions
           ├─► action: 'wagering_progress'
           ├─► description: 'Wagering progress: ₹1,000 / ₹5,000 (20%)'
           └─► amount: ₹1,000
           ✅ Progress Logged!

4. USER PLACES 4 MORE BETS (₹1,000 each)
   │
   └─► (Repeat step 3 four times)
       └─► Total wagering: ₹5,000
           ├─► wagering_completed: ₹5,000
           ├─► wagering_progress: 100%
           └─► status: 'locked' → 'unlocked' ✅ AUTO-UNLOCK!

5. USER VIEWS BONUSES TAB
   │
   ├─► Frontend (profile.tsx:Bonuses tab)
   │   ├─► GET /user/bonus-summary
   │   ├─► GET /user/deposit-bonuses
   │   ├─► GET /user/referral-bonuses
   │   └─► GET /user/bonus-transactions
   │
   ├─► Backend (routes.ts:3178-3338)
   │   ├─► storage.getBonusSummary()
   │   ├─► storage.getDepositBonuses()
   │   ├─► storage.getReferralBonuses()
   │   └─► storage.getBonusTransactions()
   │
   └─► Database
       ├─► SELECT FROM user_bonus_summary VIEW
       │   └─► total_available: ₹500 ✅
       │
       ├─► SELECT FROM deposit_bonuses
       │   └─► 1 record: ₹500, status='unlocked' ✅
       │
       └─► SELECT FROM bonus_transactions
           └─► 6 records (1 added + 5 wagering progress) ✅

6. FRONTEND DISPLAYS
   │
   ├─► BonusOverviewCard.tsx
   │   └─► Total Available: ₹500
   │       Total Locked: ₹0
   │       Total Credited: ₹0
   │       Lifetime Earnings: ₹500
   │
   ├─► DepositBonusesList.tsx
   │   └─► Deposit: ₹10,000
   │       Bonus: ₹500
   │       Progress: [████████████████████] 100%
   │       Status: 🔓 Unlocked
   │       Action: [Claim ₹500] (future feature)
   │
   └─► BonusHistoryTimeline.tsx
       └─► Timeline:
           ├─► ✅ Bonus Added: ₹500
           ├─► 📊 Wagering Progress: ₹1,000 (20%)
           ├─► 📊 Wagering Progress: ₹2,000 (40%)
           ├─► 📊 Wagering Progress: ₹3,000 (60%)
           ├─► 📊 Wagering Progress: ₹4,000 (80%)
           └─► 🔓 Bonus Unlocked: ₹5,000 (100%)
```

---

## 💳 PAYMENT HISTORY - COMPLETE FLOW

```
┌─────────────────────────────────────────────────────────────────────┐
│                      PAYMENT HISTORY FLOW                            │
└─────────────────────────────────────────────────────────────────────┘

1. ADMIN OPENS PAYMENTS PAGE
   │
   ├─► Frontend (admin-payments.tsx)
   │   └─► activeTab: 'pending' (default)
   │
   ├─► useEffect triggers
   │   └─► fetchPendingRequests()
   │
   ├─► GET /admin/payment-requests/pending
   │
   ├─► Backend (routes.ts:2512-2538)
   │   └─► storage.getPendingPaymentRequests()
   │
   └─► Database
       └─► SELECT pr.*, u.phone, u.full_name
           FROM payment_requests pr
           LEFT JOIN users u ON pr.user_id = u.id
           WHERE pr.status = 'pending'
           ORDER BY pr.created_at DESC
           ✅ Returns pending requests

2. ADMIN CLICKS "HISTORY" TAB
   │
   ├─► Frontend (admin-payments.tsx)
   │   └─► setActiveTab('history')
   │
   ├─► useEffect triggers
   │   └─► fetchHistory()
   │
   ├─► GET /admin/payment-requests/history?status=all&type=all&limit=100
   │
   ├─► Backend (routes.ts:2540-2569)
   │   └─► storage.getAllPaymentRequests({ status, type, limit, offset })
   │
   └─► Database
       └─► SELECT pr.*, u.phone, u.full_name
           FROM payment_requests pr
           LEFT JOIN users u ON pr.user_id = u.id
           WHERE (pr.status = 'all' OR status = ?)
           AND (pr.request_type = 'all' OR request_type = ?)
           ORDER BY pr.created_at DESC
           LIMIT 100 OFFSET 0
           ✅ Returns all requests

3. ADMIN FILTERS BY STATUS="APPROVED"
   │
   ├─► Frontend (admin-payments.tsx)
   │   └─► setStatusFilter('approved')
   │
   ├─► useEffect triggers (dependency: statusFilter)
   │   └─► fetchHistory()
   │
   ├─► GET /admin/payment-requests/history?status=approved&type=all&limit=100
   │
   ├─► Backend (routes.ts:2540-2569)
   │   └─► storage.getAllPaymentRequests({ status: 'approved', type: 'all', limit: 100 })
   │
   └─► Database
       └─► SELECT pr.*, u.phone, u.full_name
           FROM payment_requests pr
           LEFT JOIN users u ON pr.user_id = u.id
           WHERE pr.status = 'approved'
           ORDER BY pr.created_at DESC
           LIMIT 100
           ✅ Returns only approved requests

4. FRONTEND DISPLAYS HISTORY
   │
   └─► For each request:
       ├─► User: John Doe (9876543210)
       ├─► Type: Deposit
       ├─► Amount: ₹10,000
       ├─► Status: [Approved]
       ├─► Created: Nov 7, 2024 5:00 PM
       │
       └─► Audit Trail:
           ├─► 🕐 Processed: Nov 7, 2024 5:05 PM
           ├─► 👤 Admin ID: abc12345...
           └─► 📝 Notes: "Verified via WhatsApp"
           ✅ Complete audit trail visible!
```

---

## 🎮 GAME FLOW - COMPLETE CYCLE

```
┌─────────────────────────────────────────────────────────────────────┐
│                         GAME FLOW CYCLE                              │
└─────────────────────────────────────────────────────────────────────┘

1. ADMIN STARTS GAME
   │
   ├─► Frontend (admin-game.tsx)
   │   └─► POST /admin/game/start { openingCard: 'K♥' }
   │
   ├─► Backend (routes.ts)
   │   └─► storage.createGameSession()
   │
   └─► Database
       └─► INSERT INTO game_sessions
           ├─► game_id: uuid
           ├─► opening_card: 'K♥'
           ├─► phase: 'betting'
           ├─► current_timer: 30
           └─► status: 'active'
           ✅ Game Started!

2. PLAYER PLACES BET
   │
   ├─► Frontend (WebSocketContext.tsx)
   │   └─► WebSocket: { type: 'place_bet', side: 'andar', amount: 1000 }
   │
   ├─► Backend (game-handlers.ts)
   │   ├─► Validate balance
   │   ├─► storage.deductBalanceAtomic(userId, 1000)
   │   ├─► storage.createBet()
   │   └─► storage.updateDepositBonusWagering() ← Bonus tracking!
   │
   └─► Database
       ├─► UPDATE users SET balance -= 1000
       ├─► INSERT INTO player_bets
       └─► UPDATE deposit_bonuses SET wagering_completed += 1000
       ✅ Bet Placed + Wagering Tracked!

3. TIMER EXPIRES → DEALING PHASE
   │
   ├─► Backend (game.ts)
   │   └─► updateGamePhase('dealing')
   │
   └─► Database
       └─► UPDATE game_sessions SET phase = 'dealing'
           ✅ Dealing Phase Started!

4. ADMIN DEALS CARDS
   │
   ├─► Frontend (admin-game.tsx)
   │   └─► POST /admin/game/deal-card { card: 'A♠', side: 'bahar' }
   │
   ├─► Backend (routes.ts)
   │   ├─► storage.createDealtCard()
   │   ├─► Check for winner
   │   └─► If winner found → completeGame()
   │
   └─► Database
       └─► INSERT INTO dealt_cards
           ├─► card: 'A♠'
           ├─► side: 'bahar'
           └─► is_winning_card: false
           ✅ Card Dealt!

5. WINNER FOUND → PAYOUTS
   │
   ├─► Backend (game.ts:376-404)
   │   ├─► Calculate payouts per user
   │   ├─► storage.applyPayoutsAndupdateBets()
   │   └─► storage.saveGameHistory()
   │
   └─► Database (apply_payouts_and_update_bets function)
       ├─► UPDATE users SET balance += payout
       ├─► INSERT INTO user_transactions (type='win')
       ├─► UPDATE player_bets SET status='won', actual_payout=amount
       ├─► UPDATE player_bets SET status='lost', actual_payout=0
       └─► INSERT INTO game_history
           ✅ Payouts Distributed + History Saved!

6. PLAYER VIEWS GAME HISTORY
   │
   ├─► Frontend (profile.tsx:Game History tab)
   │   └─► GET /user/game-history?limit=50
   │
   ├─► Backend (routes.ts:2292-2346)
   │   └─► storage.getUserGameHistory()
   │
   └─► Database
       └─► SELECT pb.*, gh.*
           FROM player_bets pb
           LEFT JOIN game_history gh ON pb.game_id = gh.game_id
           WHERE pb.user_id = ?
           ORDER BY pb.created_at DESC
           ✅ Returns game history with results!
```

---

## 🔄 REAL-TIME UPDATES FLOW

```
┌─────────────────────────────────────────────────────────────────────┐
│                      REAL-TIME UPDATES FLOW                          │
└─────────────────────────────────────────────────────────────────────┘

1. USER CONNECTS TO WEBSOCKET
   │
   ├─► Frontend (WebSocketContext.tsx)
   │   └─► const ws = new WebSocket('ws://localhost:5000/ws')
   │
   ├─► Backend (websocket-routes.ts)
   │   ├─► Authenticate JWT token
   │   ├─► Add client to clients array
   │   └─► Send initial game state
   │
   └─► Client receives:
       ├─► { type: 'game_state', data: {...} }
       ├─► { type: 'balance_update', data: {...} }
       └─► { type: 'connection_status', connected: true }
       ✅ Connected!

2. GAME STATE CHANGES
   │
   ├─► Backend (game.ts)
   │   └─► broadcastGameState()
   │
   └─► All connected clients receive:
       └─► { type: 'game_state', data: {
             phase: 'betting',
             timer: 30,
             openingCard: 'K♥',
             ...
           }}
       ✅ Real-time sync!

3. BALANCE UPDATES
   │
   ├─► Backend (routes.ts)
   │   └─► After balance change:
   │       └─► clients.forEach(client => {
   │             if (client.userId === userId) {
   │               client.ws.send({ type: 'balance_update', balance: newBalance })
   │             }
   │           })
   │
   └─► Frontend (BalanceContext.tsx)
       └─► useEffect(() => {
             if (message.type === 'balance_update') {
               setBalance(message.data.balance)
             }
           })
       ✅ Balance updated instantly!

4. ADMIN NOTIFICATIONS
   │
   ├─► Backend (routes.ts)
   │   └─► After new payment request:
   │       └─► clients.forEach(client => {
   │             if (client.role === 'admin') {
   │               client.ws.send({ type: 'admin_notification', event: 'new_request' })
   │             }
   │           })
   │
   └─► Frontend (admin-payments.tsx)
       └─► useEffect(() => {
             window.addEventListener('admin_notification', () => {
               fetchPendingRequests()
             })
           })
       ✅ Admin notified instantly!
```

---

## 📊 DATABASE RELATIONSHIPS

```
┌─────────────────────────────────────────────────────────────────────┐
│                     DATABASE RELATIONSHIPS                           │
└─────────────────────────────────────────────────────────────────────┘

users (id)
  ├─► player_bets (user_id) ─────► game_sessions (game_id)
  ├─► user_transactions (user_id)
  ├─► payment_requests (user_id)
  ├─► deposit_bonuses (user_id) ──► payment_requests (deposit_request_id)
  ├─► bonus_transactions (user_id)
  ├─► referral_bonuses (referrer_user_id)
  ├─► referral_bonuses (referred_user_id)
  └─► user_referrals (referrer_user_id / referred_user_id)

game_sessions (game_id)
  ├─► player_bets (game_id)
  ├─► dealt_cards (game_id)
  ├─► game_history (game_id)
  └─► game_statistics (game_id)

payment_requests (id)
  └─► deposit_bonuses (deposit_request_id)

admin_credentials (id)
  ├─► payment_requests (admin_id)
  ├─► admin_requests (admin_id)
  └─► request_audit (admin_id)
```

---

## 🎯 KEY INTEGRATION POINTS

### **1. Deposit Approval → Bonus Creation**
```
routes.ts:2588 → storage.createDepositBonus()
  ↓
storage-supabase.ts:3942 → INSERT INTO deposit_bonuses
  ↓
Database: deposit_bonuses table
```

### **2. Bet Placement → Wagering Tracking**
```
game-handlers.ts:248 → storage.updateDepositBonusWagering()
  ↓
storage-supabase.ts:4003 → UPDATE deposit_bonuses
  ↓
Database: wagering_completed += amount
```

### **3. Wagering Complete → Auto-Unlock**
```
storage-supabase.ts:4003 → Check wagering_completed >= wagering_required
  ↓
If true: UPDATE deposit_bonuses SET status = 'unlocked'
  ↓
Database: status changed from 'locked' to 'unlocked'
```

### **4. Payment History → Audit Trail**
```
routes.ts:2540 → storage.getAllPaymentRequests()
  ↓
storage-supabase.ts:3653 → SELECT with filters
  ↓
Database: payment_requests + users JOIN
  ↓
Returns: requests with admin_id, admin_notes, updated_at
```

---

## ✅ VERIFICATION POINTS

### **Check Bonus Creation:**
```sql
SELECT * FROM deposit_bonuses WHERE user_id = '9876543210';
```

### **Check Wagering Progress:**
```sql
SELECT 
  deposit_amount,
  bonus_amount,
  wagering_required,
  wagering_completed,
  wagering_progress,
  status
FROM deposit_bonuses
WHERE user_id = '9876543210';
```

### **Check Bonus Transactions:**
```sql
SELECT 
  action,
  description,
  amount,
  created_at
FROM bonus_transactions
WHERE user_id = '9876543210'
ORDER BY created_at DESC;
```

### **Check Payment History:**
```sql
SELECT 
  pr.*,
  u.phone,
  u.full_name
FROM payment_requests pr
LEFT JOIN users u ON pr.user_id = u.id
WHERE pr.status IN ('approved', 'rejected')
ORDER BY pr.created_at DESC;
```

---

**All data flows verified and working!** ✅
