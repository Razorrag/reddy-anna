# Complete Navigation Guide

## 🗺️ All Routes & Pages

### Player Routes
- **`/`** - Homepage (Landing page)
- **`/play`** - Player Game (Main game interface)
- **`/player-game`** - Player Game (Alternative route)
- **`/login`** - Player Login
- **`/signup`** - Player Signup
- **`/profile`** - Player Profile

### Admin Routes (Protected)
- **`/admin`** - **Admin Dashboard** (Main hub with all management cards)
- **`/game`** - Game Control Panel
- **`/admin-game`** - Game Control Panel (Alternative)
- **`/game-admin`** - Game Control Panel (Alternative)
- **`/admin-control`** - Game Control Panel (Alternative)
- **`/user-admin`** - **User Management** (Add, edit users, manage balances)
- **`/admin-bonus`** - Bonus & Referral Management
- **`/admin-analytics`** - Analytics Dashboard
- **`/admin-payments`** - Payments & Withdrawals
- **`/backend-settings`** - Backend Settings
- **`/game-history`** - Game History
- **`/admin-login`** - Admin Login

---

## 🎯 Main Pages Explained

### 1. Admin Dashboard (`/admin`)
**Purpose**: Central navigation hub

**What you see**:
- ✅ Quick statistics (Users, Games, Revenue)
- ✅ 7 clickable management cards:
  1. 🎮 Game Control
  2. 👥 User Management
  3. 🎁 Bonus & Referral
  4. 📊 Analytics
  5. 📜 Game History
  6. 💳 Payments D/W
  7. ⚙️ Backend Settings

**How to use**:
- Click any card to go to that feature
- This is your starting point

---

### 2. Game Control (`/game`)
**Purpose**: Control live games

**What you see**:
- ✅ **Dashboard button** (top left) - Go back to admin dashboard
- ✅ Game Control Tab - Deal cards, manage rounds
- ✅ Stream Settings Tab - OBS configuration
- ✅ Bet Monitoring Tab - Real-time statistics
- ✅ Quick access cards to other features

**How to use**:
- Click "Dashboard" button to return to `/admin`
- Use tabs to switch between game/stream/bets
- Click quick access cards to jump to other features

---

### 3. User Management (`/user-admin`)
**Purpose**: Manage all users

**What you see**:
- ✅ **Back to Game Control button** (top) - Returns to `/game`
- ✅ Search users by name/phone
- ✅ Filter by status (Active/Suspended/Banned)
- ✅ Statistics cards (Total, Active, Suspended, Banned)
- ✅ User list with all details

**Features**:
- ✅ **Update Balance** - Add or deduct funds from user
- ✅ **Activate** - Restore suspended/banned users
- ✅ **Suspend** - Temporarily disable users
- ✅ **Ban** - Permanently disable users
- ✅ **View Details** - See complete user profile

**How to use**:
1. Search for user by name or phone
2. Click "Update Balance" to add/deduct money
3. Click "Activate/Suspend/Ban" to change status
4. Click "Back to Game Control" to return

---

### 4. Bonus Management (`/admin-bonus`)
**Purpose**: Manage bonuses and referrals

**What you see**:
- ✅ **Back to Game Control button** (top)
- ✅ 3 tabs: Overview, Transactions, Referrals
- ✅ Bonus settings configuration
- ✅ All bonus transactions
- ✅ Referral tracking

**Features**:
- ✅ Configure deposit bonus %
- ✅ Configure referral bonus %
- ✅ Set conditional bonus threshold
- ✅ Apply/reject pending bonuses
- ✅ Track referral relationships

---

## 🧭 Navigation Flow

### Starting from Admin Dashboard (`/admin`)

```
/admin (Dashboard)
  │
  ├─ Click "Game Control" card → /game
  │   └─ Click "Dashboard" button → Back to /admin
  │
  ├─ Click "User Management" card → /user-admin
  │   └─ Click "Back to Game Control" → /game
  │       └─ Click "Dashboard" → /admin
  │
  ├─ Click "Bonus & Referral" card → /admin-bonus
  │   └─ Click "Back to Game Control" → /game
  │
  ├─ Click "Analytics" card → /admin-analytics
  ├─ Click "Game History" card → /game-history
  ├─ Click "Payments" card → /admin-payments
  └─ Click "Backend Settings" card → /backend-settings
```

### Starting from Game Control (`/game`)

```
/game (Game Control)
  │
  ├─ Click "Dashboard" button (top left) → /admin
  │
  └─ Quick Access Cards:
      ├─ User Management → /user-admin
      ├─ Bonus & Referral → /admin-bonus
      ├─ Analytics → /admin-analytics
      ├─ Game History → /game-history
      ├─ Payments → /admin-payments
      └─ Backend Settings → /backend-settings
```

---

## 🎮 Player Game Access

### For Players
- **Route**: `/play` or `/player-game`
- **Access**: Public (no admin login needed)
- **Purpose**: Play the Andar Bahar game

### How Players Access
```
1. Go to http://localhost:5173/play
   OR
   Go to http://localhost:5173/player-game

2. See the game interface
3. Place bets
4. Watch cards being dealt
5. Win/lose and see balance updates
```

---

## 🔐 Admin Access

### How to Access Admin Features

#### Step 1: Login
```
1. Go to http://localhost:5173/admin-login
2. Enter credentials:
   - Username: admin
   - Password: Admin@123
3. Click Login
```

#### Step 2: Access Dashboard
```
After login, go to:
http://localhost:5173/admin

You'll see the admin dashboard with all management cards
```

#### Step 3: Navigate to Features
```
From dashboard, click any card:
- Game Control → Manage live games
- User Management → Add/edit users, manage balances
- Bonus & Referral → Configure bonuses
- Analytics → View statistics
- Game History → See past games
- Payments → Manage deposits/withdrawals
- Backend Settings → System configuration
```

---

## 📊 User Management Features

### What You Can Do

#### 1. Search Users
```
- Search by name
- Search by phone number
- Filter by status (All/Active/Suspended/Banned)
```

#### 2. Update User Balance
```
1. Find user in list
2. Click "Update Balance" button
3. Choose:
   - Add Funds (increase balance)
   - Deduct Funds (decrease balance)
4. Enter amount
5. Add reason/note
6. Confirm
```

#### 3. Change User Status
```
- Click "Activate" - Restore user access
- Click "Suspend" - Temporarily disable
- Click "Ban" - Permanently disable
```

#### 4. View User Details
```
- Full name and avatar
- Phone number
- Current balance
- Account status
- Join date
- Last active time
- Games played
- Win rate percentage
```

#### 5. Create New Users
```
(Feature available in user management interface)
- Add new user manually
- Set initial balance
- Assign phone number
- Set status
```

---

## 🔄 Navigation Buttons

### Dashboard Button
- **Location**: Game Control page (top left)
- **Action**: Returns to `/admin` dashboard
- **Icon**: 🏠 Home

### Back to Game Control Button
- **Location**: All management pages (top)
- **Action**: Returns to `/game` control panel
- **Icon**: ← Arrow

### Quick Access Cards
- **Location**: Game Control page (below tabs)
- **Action**: Navigate to specific feature
- **Count**: 6 cards

---

## 🎨 Visual Guide

### Admin Dashboard (`/admin`)
```
┌─────────────────────────────────────┐
│   🎰 Admin Dashboard                │
├─────────────────────────────────────┤
│                                     │
│  📊 Quick Stats                     │
│  [Users] [Games] [Revenue] [Today] │
│                                     │
│  📊 Management Features             │
│  ┌──────┬──────┬──────┐           │
│  │ Game │ User │Bonus │           │
│  │Ctrl  │ Mgmt │& Ref │           │
│  ├──────┼──────┼──────┤           │
│  │Analyt│ Game │Paymt │           │
│  │ ics  │ Hist │ D/W  │           │
│  ├──────┴──────┴──────┤           │
│  │  Backend Settings  │           │
│  └────────────────────┘           │
│                                     │
│  Click any card to navigate →      │
└─────────────────────────────────────┘
```

### Game Control (`/game`)
```
┌─────────────────────────────────────┐
│ [🏠 Dashboard] 🎰 Game Control      │
│ Round: 1  Phase: betting            │
├─────────────────────────────────────┤
│                                     │
│ [Game Control] [Stream] [Bets]     │
│                                     │
│ 📊 Quick Access                     │
│ [User] [Bonus] [Analytics]         │
│ [History] [Payments] [Settings]    │
│                                     │
│ ┌─────────────────────────────┐   │
│ │   Game Interface Here        │   │
│ │   (Cards, Betting, etc.)     │   │
│ └─────────────────────────────┘   │
└─────────────────────────────────────┘
```

### User Management (`/user-admin`)
```
┌─────────────────────────────────────┐
│ [← Back to Game Control]            │
│ 👥 User Management                  │
├─────────────────────────────────────┤
│                                     │
│ 📊 Stats                            │
│ [Total] [Active] [Suspended] [Ban] │
│                                     │
│ 🔍 Search: [_____________]          │
│ Filter: [All Status ▼]             │
│                                     │
│ 📋 User List                        │
│ ┌─────────────────────────────┐   │
│ │ User 1                       │   │
│ │ [Update Balance] [Activate]  │   │
│ ├─────────────────────────────┤   │
│ │ User 2                       │   │
│ │ [Update Balance] [Suspend]   │   │
│ └─────────────────────────────┘   │
└─────────────────────────────────────┘
```

---

## ✅ Quick Reference

### To Access Admin Dashboard
```
URL: http://localhost:5173/admin
Login: admin / Admin@123
```

### To Access User Management
```
Method 1: /admin → Click "User Management" card
Method 2: Direct URL: http://localhost:5173/user-admin
```

### To Access Game Control
```
Method 1: /admin → Click "Game Control" card
Method 2: Direct URL: http://localhost:5173/game
```

### To Return to Dashboard
```
From Game Control: Click "Dashboard" button (top left)
From Other Pages: Click "Back to Game Control" → Then "Dashboard"
```

### To Access Player Game
```
URL: http://localhost:5173/play
OR
URL: http://localhost:5173/player-game
(No admin login needed)
```

---

## 🎯 Summary

### Admin Routes
✅ `/admin` - Dashboard (main hub)
✅ `/game` - Game control
✅ `/user-admin` - User management (add/edit users, balances)
✅ `/admin-bonus` - Bonus management
✅ `/admin-analytics` - Analytics
✅ `/admin-payments` - Payments
✅ `/backend-settings` - Settings
✅ `/game-history` - History

### Player Routes
✅ `/play` - Player game
✅ `/player-game` - Player game (alternative)

### Navigation
✅ Dashboard button in game control
✅ Back buttons in all management pages
✅ Quick access cards for fast navigation
✅ Clickable cards in dashboard

**Everything is connected and accessible!** 🚀
