# Complete Admin Features Documentation

## Overview

Your admin panel now has **complete management capabilities** with all features integrated and accessible. This document covers all admin features, navigation, and functionality.

---

## 🎯 Admin Dashboard Structure

### Main Admin Panel (`/game`)
The central hub with:
- **Game Control** - Live game management
- **Stream Settings** - OBS streaming configuration  
- **Bet Monitoring** - Real-time bet tracking
- **Quick Access Navigation** - Links to all management features

### Management Features

#### 1. **User Management** (`/user-admin`)
- View all registered users
- Search by name, phone, or mobile number
- Filter by status (Active, Suspended, Banned)
- Update user balances (Add/Deduct)
- Activate/Suspend/Ban users
- View user details (games played, win rate, last login)
- Real-time user statistics

#### 2. **Bonus & Referral Management** (`/admin-bonus`)
- **Overview Tab**:
  - Total bonus paid statistics
  - Pending bonus tracking
  - Referral earnings summary
  - Bonus settings configuration (deposit %, referral %, thresholds)
  
- **Bonus Transactions Tab**:
  - All bonus transactions
  - Filter by type (Deposit, Referral, Applied)
  - Filter by status (Pending, Applied, Failed)
  - Apply/Reject pending bonuses
  
- **Referrals Tab**:
  - All referral relationships
  - Track referrer → referred connections
  - Monitor deposit amounts and bonus earnings
  - Process pending referral bonuses

#### 3. **Analytics Dashboard** (`/admin-analytics`)
- Today's win/lose statistics
- Revenue tracking
- Player activity metrics
- Game performance analytics

#### 4. **Game History** (`/game-history`)
- Complete game history
- Filter by date, winner, round
- View game details
- Export game data

#### 5. **Payments Management** (`/admin-payments`)
- Today's deposits and withdrawals
- Process payment requests
- Transaction history
- Payment status tracking

#### 6. **Backend Settings** (`/backend-settings`)
- System configuration
- Game settings
- Server parameters
- Advanced options

---

## 🎨 Theme Consistency

All admin pages now use the **dark casino theme**:

### Color Palette
- **Background**: `from-slate-950 via-purple-950 to-slate-950`
- **Gold Accents**: `from-yellow-400 via-yellow-300 to-yellow-500`
- **Cards**: `bg-purple-950/60 border-purple-400/30`
- **Buttons**: Gradient backgrounds with hover effects

### Design Elements
- **Gold gradient titles** with text-transparent
- **Backdrop blur** for modern glass-morphism
- **Shadow effects** (lg, xl, 2xl)
- **Smooth transitions** (200ms duration)
- **Hover scale effects** (scale-105)

---

## 🧭 Navigation

### From Main Admin Panel
Quick access cards navigate to:
- 👥 **User Management** → `/user-admin`
- 🎁 **Bonus & Referral** → `/admin-bonus`
- 📊 **Analytics** → `/admin-analytics`
- 📜 **Game History** → `/game-history`
- 💳 **Payments D/W** → `/admin-payments`
- ⚙️ **Backend Settings** → `/backend-settings`

### Back Navigation
All management pages have:
```tsx
<button onClick={() => setLocation('/game')}>
  ← Back to Game Control
</button>
```

---

## 🔐 Access Control

### Admin Routes (Protected)
All admin routes require authentication:
- `/game` - Main admin panel
- `/admin-game` - Alternative admin route
- `/game-admin` - Alternative admin route
- `/admin-control` - Alternative admin route
- `/user-admin` - User management
- `/admin-bonus` - Bonus management
- `/admin-analytics` - Analytics
- `/game-history` - Game history
- `/admin-payments` - Payments
- `/backend-settings` - Settings

### Authentication Check
```typescript
// Checks localStorage for:
- localStorage.getItem('admin')
- localStorage.getItem('isAdminLoggedIn') === 'true'
- Admin role === 'admin' or 'super_admin'
```

### Admin Credentials
From `supabase_init.sql`:
- **Username**: `admin`
- **Password**: `Admin@123`

---

## 📊 Features by Page

### Game Control (`/game`)

**Tabs**:
1. **Game Control**
   - Opening card selection
   - Card dealing (Rounds 1-3)
   - Real-time game state
   - Reset game functionality

2. **Stream Settings**
   - OBS streaming configuration
   - Stream URL management
   - Direct RTMP streaming

3. **Bet Monitoring**
   - Real-time bet tracking
   - Andar vs Bahar statistics
   - Bet amounts and percentages
   - Player bet history

**Quick Access Navigation**:
- 6 management feature cards
- Color-coded by category
- Hover effects and animations

---

### User Management (`/user-admin`)

**Features**:
- **Search**: By name, phone, mobile number
- **Filter**: By status (All, Active, Suspended, Banned)
- **Statistics Cards**:
  - Total Users
  - Active Users
  - Suspended Users
  - Banned Users

**User Actions**:
- **View Details**: Full user profile
- **Update Balance**: Add/Deduct funds
- **Activate**: Restore suspended/banned users
- **Suspend**: Temporarily disable users
- **Ban**: Permanently disable users

**User Information Displayed**:
- Full name and avatar
- Phone number (formatted)
- Current balance
- Account status
- Join date
- Last active time
- Games played
- Win rate percentage

---

### Bonus Management (`/admin-bonus`)

**Overview Tab**:
- **Statistics**:
  - Total Bonus Paid (all time)
  - Pending Bonus (awaiting application)
  - Referral Earnings (completed)

- **Settings**:
  - Deposit Bonus % (configurable)
  - Referral Bonus % (configurable)
  - Conditional Bonus Threshold % (configurable)

**Bonus Transactions Tab**:
- **Filters**:
  - Search by username/description
  - Filter by type (Deposit, Referral, Applied)
  - Filter by status (Pending, Applied, Failed)

- **Transaction Details**:
  - User information
  - Bonus type badge
  - Status badge
  - Amount (with related deposit amount)
  - Timestamp
  - Description

- **Actions**:
  - Apply Bonus (for pending)
  - Reject Bonus (for pending)
  - View Details

**Referrals Tab**:
- **Referral Information**:
  - Referrer → Referred relationship
  - Deposit amount
  - Bonus amount earned
  - Status (Pending, Completed, Failed)
  - Created date
  - Bonus applied date

- **Actions**:
  - Process Bonus (for pending)
  - View Details

---

## 🎮 Game Control Workflow

### Round 1 & 2
1. **Betting Phase** (30s timer)
   - Cards are LOCKED
   - Players place bets
   - Real-time bet monitoring
   - Admin sees betting statistics

2. **Dealing Phase**
   - Cards become UNLOCKED
   - Admin selects Bahar card
   - Admin selects Andar card
   - Admin clicks "Deal Cards to Players"
   - Cards appear on all player screens
   - Winner detection automatic

### Round 3 (Continuous Draw)
1. **No Betting Phase**
   - Cards immediately selectable
   - No timer

2. **Card Dealing**
   - Admin clicks any card
   - Card drops IMMEDIATELY to players
   - Side alternates automatically (Bahar → Andar → Bahar...)
   - Winner detected when card matches opening card
   - Payouts calculated and credited automatically

---

## 💰 Bonus System

### Deposit Bonus
- **Percentage**: Configurable (default 5%)
- **Trigger**: When user makes deposit
- **Status**: Pending → Applied
- **Calculation**: Deposit Amount × Bonus %

### Referral Bonus
- **Percentage**: Configurable (default 1%)
- **Trigger**: When referred user makes deposit
- **Recipient**: Referrer
- **Calculation**: Referred User's Deposit × Bonus %

### Conditional Bonus
- **Threshold**: Configurable (default 30%)
- **Trigger**: When balance deviates by threshold %
- **Type**: Automatic system bonus

---

## 🔧 Technical Implementation

### Files Structure

**Admin Pages**:
- `client/src/pages/admin-game.tsx` - Main admin panel wrapper
- `client/src/pages/user-admin.tsx` - User management
- `client/src/pages/admin-bonus.tsx` - Bonus management
- `client/src/pages/admin-analytics.tsx` - Analytics dashboard
- `client/src/pages/admin-payments.tsx` - Payments management
- `client/src/pages/backend-settings.tsx` - System settings

**Admin Components**:
- `client/src/components/AdminGamePanel/AdminGamePanel.tsx` - Main panel
- `client/src/components/AdminGamePanel/OpeningCardSelector.tsx` - Card selection
- `client/src/components/AdminGamePanel/CardDealingPanel.tsx` - Card dealing
- `client/src/components/AdminGamePanel/SimpleStreamSettings.tsx` - Stream config
- `client/src/components/BetMonitoringDashboard.tsx` - Bet tracking
- `client/src/components/PersistentSidePanel.tsx` - Side statistics

**Services**:
- `client/src/services/userAdminService.ts` - User management API
- Backend routes in `server/routes.ts`

---

## 📱 Responsive Design

All admin pages are responsive:
- **Desktop**: Full layout with all features
- **Tablet**: Adjusted grid layouts
- **Mobile**: Stacked layouts, scrollable navigation

### Breakpoints
- `md:` - 768px and up
- `lg:` - 1024px and up
- `xl:` - 1280px and up

---

## 🚀 Quick Start Guide

### 1. Access Admin Panel
```
1. Go to http://localhost:5173/admin-login
2. Login with: admin / Admin@123
3. Navigate to http://localhost:5173/game
```

### 2. Manage Users
```
1. Click "User Management" card
2. Search/filter users
3. Click "Update Balance" to add/deduct funds
4. Click "Activate/Suspend/Ban" to change status
```

### 3. Manage Bonuses
```
1. Click "Bonus & Referral" card
2. View statistics in Overview tab
3. Configure bonus percentages
4. Process pending bonuses in Transactions tab
5. Track referrals in Referrals tab
```

### 4. Control Game
```
1. Stay on main admin panel
2. Select opening card
3. Wait for betting phase
4. Deal cards when timer ends
5. Continue through rounds
6. Reset game when complete
```

---

## 🎨 Customization

### Bonus Percentages
```typescript
// In admin-bonus.tsx
depositBonusPercent: 5,      // 5% of deposit
referralBonusPercent: 1,     // 1% of referred deposit
conditionalBonusThreshold: 30 // 30% balance deviation
```

### Bet Limits
```typescript
// In schema
MIN_BET: 1000
MAX_BET: 50000
```

### Timer Duration
```typescript
// In backend
BETTING_TIMER: 30 seconds (Rounds 1 & 2)
```

---

## 📊 Statistics & Monitoring

### Real-Time Data
- Active users count
- Current bets (Andar vs Bahar)
- Bet amounts and percentages
- Game phase and round
- Timer countdown

### Historical Data
- Total users registered
- Games played
- Win/loss statistics
- Bonus paid (all time)
- Referral earnings

---

## 🔒 Security Features

### Authentication
- Protected routes with `ProtectedAdminRoute`
- localStorage-based session management
- Role-based access control

### Data Validation
- Bet amount validation (1000-50000)
- Balance checking before bets
- Status validation for user actions
- Bonus percentage limits (0-100%)

---

## 🐛 Troubleshooting

### Can't Access Admin Panel
1. Check if logged in at `/admin-login`
2. Verify `localStorage.getItem('isAdminLoggedIn')` is `'true'`
3. Check admin role in localStorage

### Features Not Loading
1. Check browser console for errors
2. Verify backend is running (`npm run dev`)
3. Check WebSocket connection
4. Refresh page

### Theme Not Matching
1. Clear browser cache
2. Hard refresh (Ctrl+Shift+R)
3. Check if using latest code

---

## 📝 Summary

### What's Available
✅ **Game Control** - Full game management
✅ **User Management** - Complete user administration
✅ **Bonus Management** - Deposit & referral bonuses
✅ **Analytics** - Performance tracking
✅ **Game History** - Complete game records
✅ **Payments** - Deposit/withdrawal management
✅ **Settings** - System configuration
✅ **Bet Monitoring** - Real-time bet tracking
✅ **Stream Settings** - OBS streaming setup

### Navigation
✅ Quick access cards from main panel
✅ Back navigation on all pages
✅ Consistent theme across all pages
✅ Responsive design for all devices

### Features
✅ Search and filter capabilities
✅ Real-time statistics
✅ User balance management
✅ Bonus processing
✅ Referral tracking
✅ Game control
✅ Bet monitoring

**Status**: ✅ **COMPLETE** - All admin features implemented and accessible!

Your admin panel is now a comprehensive management system with all features properly integrated and themed consistently!
