# 🤝 Partner System - Complete Implementation Guide

## Overview

A fully independent partner system where partners can view game history with configurable financial data visibility controlled by admin-set share percentages.

---

## 🎯 Key Features

### 1. **Separate Authentication System**
- Independent login/signup (different from players)
- Separate JWT tokens (`partner_token`)
- Own session management in `partners` table
- Purple-themed UI (vs gold for players)

### 2. **Admin-Controlled Data Visibility**
- Each partner has a `share_percentage` (1-100%)
- Admin sets individual percentage per partner
- Global `default_share_percentage` setting (default: 50%)
- All financial amounts multiplied by percentage before display

### 3. **Simplified Registration**
- Only 3 fields: phone, password, confirmPassword
- Auto-generates name as `Partner_{phone}`
- Uses default share percentage from settings
- Status: pending (awaits admin approval)

---

## 📊 Database Schema

### New Tables Created

#### `partners` Table
```sql
CREATE TABLE partners (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  full_name VARCHAR(255) NOT NULL,
  phone_number VARCHAR(20) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE,
  whatsapp_number VARCHAR(20),
  password_hash VARCHAR(255) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending', -- pending, active, suspended, banned
  share_percentage DECIMAL(5,2) DEFAULT 50.00, -- 1.00 to 100.00
  total_earnings DECIMAL(15,2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### `admin_partner_settings` Table
```sql
CREATE TABLE admin_partner_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  setting_key VARCHAR(100) UNIQUE NOT NULL,
  setting_value TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Default settings
INSERT INTO admin_partner_settings (setting_key, setting_value, description) VALUES
  ('default_share_percentage', '50', 'Default share percentage for new partners'),
  ('require_admin_approval', 'true', 'Require admin approval for partner registration');
```

---

## 🔐 Authentication Flow

### Partner Registration
**Endpoint:** `POST /api/partner/auth/register`

**Request Body:**
```json
{
  "phone": "9876543210",
  "password": "SecurePass123",
  "confirmPassword": "SecurePass123"
}
```

**Process:**
1. Validates phone and password
2. Checks if phone already exists
3. Hashes password with bcrypt
4. Gets `default_share_percentage` from settings
5. Creates partner with status='pending' if approval required
6. Returns partner data (without token if pending)

**Response (Pending Approval):**
```json
{
  "success": true,
  "message": "Partner registration submitted. Awaiting admin approval.",
  "partner": {
    "id": "uuid",
    "full_name": "Partner_9876543210",
    "phone_number": "9876543210",
    "status": "pending",
    "share_percentage": 50.00
  }
}
```

### Partner Login
**Endpoint:** `POST /api/partner/auth/login`

**Request Body:**
```json
{
  "phone": "9876543210",
  "password": "SecurePass123"
}
```

**Process:**
1. Finds partner by phone
2. Verifies status is 'active'
3. Compares password with bcrypt
4. Generates JWT with `role: 'partner'`
5. Returns partner data + token

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "partner": {
    "id": "uuid",
    "full_name": "Partner_9876543210",
    "status": "active",
    "share_percentage": 30.00
  },
  "token": "jwt_token_here",
  "refreshToken": "refresh_token_here"
}
```

---

## 📈 Partner Dashboard

### Game History API
**Endpoint:** `GET /api/partner/game-history`

**Headers:**
```
Authorization: Bearer {partner_token}
```

**Query Parameters:**
- `page` (default: 1)
- `limit` (default: 20)
- `dateFrom` (optional: ISO date)
- `dateTo` (optional: ISO date)
- `sortBy` (default: 'created_at')
- `sortOrder` (default: 'desc')

**Data Flow:**
1. Authenticates partner via JWT
2. Fetches partner's `share_percentage`
3. Queries `game_statistics` table
4. Queries `game_sessions` for card data
5. **Applies share multiplier** to financial values:
   ```javascript
   const shareMultiplier = share_percentage / 100;
   
   totalBets = originalTotalBets * shareMultiplier;
   andarTotalBet = originalAndarBet * shareMultiplier;
   baharTotalBet = originalBaharBet * shareMultiplier;
   profitLoss = originalProfitLoss * shareMultiplier;
   housePayout = originalPayout * shareMultiplier;
   ```
6. Returns transformed data with `sharePercentage` field

**Response:**
```json
{
  "success": true,
  "data": {
    "games": [
      {
        "id": "uuid",
        "gameId": "GAME_123",
        "createdAt": "2025-01-26T12:00:00Z",
        "sharePercentage": 30.00,
        "openingCard": "♠A",
        "winner": "andar",
        "winningCard": "♥K",
        "totalBets": 3000.00,      // 30% of ₹10,000
        "andarTotalBet": 1800.00,  // 30% of ₹6,000
        "baharTotalBet": 1200.00,  // 30% of ₹4,000
        "profitLoss": 600.00,      // 30% of ₹2,000
        "housePayout": 2400.00     // 30% of ₹8,000
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 150,
      "pages": 8
    }
  }
}
```

### What Partners See

✅ **Visible (Unchanged):**
- Game ID and date/time
- Opening card
- Winner (Andar/Bahar)
- Winning card
- Total cards dealt
- Bet counts (Andar/Bahar)

✅ **Visible (Percentage-Adjusted):**
- Total bets amount
- Andar bet amount
- Bahar bet amount
- Total winnings/payout
- House earnings
- Profit/Loss

❌ **Hidden:**
- Individual player names/IDs
- Specific bet amounts per player
- Player balances
- Other partners' data

---

## 👨‍💼 Admin Partner Management

### Admin Page
**Route:** `/admin/partners`

### View All Partners
**Endpoint:** `GET /api/admin/partners`

**Headers:**
```
Authorization: Bearer {admin_token}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "partners": [
      {
        "id": "uuid",
        "full_name": "Partner_9876543210",
        "phone_number": "9876543210",
        "status": "active",
        "share_percentage": 30.00,
        "total_earnings": 15000.00,
        "created_at": "2025-01-15T10:00:00Z"
      }
    ],
    "pagination": { "page": 1, "total": 5 }
  }
}
```

### Update Share Percentage
**Endpoint:** `PUT /api/admin/partners/:id/share`

**Request Body:**
```json
{
  "sharePercentage": 35.50
}
```

**Validation:**
- Must be between 1.00 and 100.00
- Admin only

**Process:**
1. Validates percentage range
2. Updates `partners.share_percentage`
3. Returns updated partner

### Update Partner Status
**Endpoint:** `PUT /api/admin/partners/:id/status`

**Request Body:**
```json
{
  "status": "active"  // pending, active, suspended, banned
}
```

**Process:**
1. Validates status value
2. Updates `partners.status`
3. Returns updated partner

### Admin UI Features
- **List View**: All partners with status badges
- **Inline Edit**: Click share percentage to edit
- **Status Toggle**: Approve/Suspend/Ban buttons
- **Statistics**: Total earnings per partner
- **Filters**: By status, date range
- **Search**: By name or phone

---

## 🔒 Security & Access Control

### Route Protection

#### Partner Routes (`/api/partner/*`)
- **Middleware:** `requirePartnerAuth`
- **Validation:** 
  - JWT token with `role: 'partner'`
  - Partner exists in database
  - Partner status is 'active'
- **Access:** Own data only

#### Admin Routes (`/api/admin/partners/*`)
- **Middleware:** `requireAdmin`
- **Validation:**
  - JWT token with `role: 'admin'`
  - Admin exists in database
  - Admin is active
- **Access:** All partner data

### Data Privacy
- Partners cannot see other partners' data
- Share percentage is partner-specific
- No player-identifiable information exposed
- Financial data sanitized before display

---

## 🎨 Frontend Components

### Landing Page Update
**File:** `client/src/pages/index.tsx`

Added "Become a Partner" button:
```tsx
<Button
  size="lg"
  className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800"
  onClick={() => navigate('/partner/login')}
>
  <Users className="mr-2 h-5 w-5" />
  Become a Partner
</Button>
```

### Partner Pages

#### 1. Partner Login (`/partner/login`)
- Purple gradient background
- Phone & password fields
- "Forgot Password?" link (WhatsApp admin)
- Link to signup page

#### 2. Partner Signup (`/partner/signup`)
- **Simplified 3-field form:**
  - Phone number
  - Password
  - Confirm password
- Auto-generates name
- Purple theme
- Success message: "Awaiting admin approval"

#### 3. Partner Dashboard (`/partner/dashboard`)
**Features:**
- **Header:** Shows partner name + share percentage badge
- **Stats Cards:**
  - Total Games
  - Total Bets (current page)
  - Total Payouts (current page)
  - Profit/Loss (current page)
- **Filters:**
  - Date range (from/to)
  - Sort by (date, bets, profit)
  - Sort order (asc/desc)
- **Game History Table:**
  - Date & time
  - Cards (opening, winning)
  - Winner badge
  - Bet amounts (adjusted)
  - Profit/Loss (color-coded)
- **Export:** CSV download
- **Pagination:** Previous/Next buttons

**Share Percentage Display:**
```tsx
<div className="inline-flex items-center gap-2 bg-purple-500/20 border border-purple-400/30 rounded-lg px-4 py-2">
  <BarChart3 className="h-4 w-4 text-purple-300" />
  <span className="text-purple-200 text-sm">Your Share Percentage:</span>
  <span className="text-purple-100 font-bold text-lg">{sharePercentage}%</span>
</div>
<p className="text-gray-500 text-xs mt-1">
  All financial amounts shown are calculated at your share percentage
</p>
```

#### 4. Admin Partners Page (`/admin/partners`)
**Features:**
- List all partners
- Status badges (color-coded)
- Inline share % editing
- Approve/Suspend/Ban buttons
- Performance metrics
- Filters and search

**Share Percentage Edit:**
```tsx
<Button
  variant="ghost"
  onClick={() => openEditModal(partner)}
>
  {partner.share_percentage}%
</Button>

// Modal with input validation (1-100)
<Input
  type="number"
  min={1}
  max={100}
  step={0.01}
  value={newPercentage}
  onChange={(e) => setNewPercentage(e.target.value)}
/>
```

---

## 🚀 Deployment Steps

### 1. Run Database Migration
```bash
# Execute in Supabase SQL Editor or via CLI
psql -U postgres -d your_database -f server/migrations/PARTNER_SYSTEM_SIMPLE.sql
```

This creates:
- `partners` table with `share_percentage` column
- `admin_partner_settings` table with defaults
- Necessary indexes

### 2. Restart Server
```bash
npm run dev
# or
npm run build && npm start
```

### 3. Configure Default Settings
Update via Supabase or admin panel:
```sql
UPDATE admin_partner_settings 
SET setting_value = '40' 
WHERE setting_key = 'default_share_percentage';

UPDATE admin_partner_settings 
SET setting_value = 'true' 
WHERE setting_key = 'require_admin_approval';
```

### 4. Test Partner Flow
1. **Register Partner:**
   - Visit `/partner/signup`
   - Enter phone: 9876543210
   - Set password
   - Submit → Status: pending

2. **Admin Approval:**
   - Login as admin
   - Go to `/admin/partners`
   - Find pending partner
   - Set share percentage (e.g., 30%)
   - Click "Approve" → Status: active

3. **Partner Login:**
   - Visit `/partner/login`
   - Enter phone and password
   - View dashboard with 30% of actual amounts

4. **Verify Calculations:**
   - If admin sees ₹10,000 total bets
   - Partner should see ₹3,000 (30%)
   - All financial fields multiplied by 0.3

---

## 🧮 Share Percentage Examples

### Example 1: 50% Share (Default)
**Admin View:**
- Total Bets: ₹20,000
- Andar: ₹12,000
- Bahar: ₹8,000
- Profit/Loss: +₹4,000

**Partner View (50%):**
- Total Bets: ₹10,000
- Andar: ₹6,000
- Bahar: ₹4,000
- Profit/Loss: +₹2,000

### Example 2: 25% Share
**Admin View:**
- Total Bets: ₹100,000
- Payout: ₹95,000
- Profit: +₹5,000

**Partner View (25%):**
- Total Bets: ₹25,000
- Payout: ₹23,750
- Profit: +₹1,250

### Example 3: 75% Share
**Admin View:**
- Total Bets: ₹50,000
- Loss: -₹10,000

**Partner View (75%):**
- Total Bets: ₹37,500
- Loss: -₹7,500

---

## 🔍 Troubleshooting

### Issue: Card Data Showing as "-"
**Cause:** `game_sessions` table may not have card data

**Solution:**
```sql
-- Check if game_sessions has data
SELECT game_id, opening_card, winner, winning_card 
FROM game_sessions 
WHERE game_id IN (
  SELECT game_id FROM game_statistics 
  ORDER BY created_at DESC 
  LIMIT 5
);

-- Verify game_id format matches
SELECT DISTINCT game_id FROM game_statistics LIMIT 10;
SELECT DISTINCT game_id FROM game_sessions LIMIT 10;
```

### Issue: 401 Unauthorized on Partner Routes
**Cause:** Partner routes hitting player auth middleware

**Fix:** Ensure `/api/partner` prefix bypass in `routes.ts`:
```typescript
// Skip player auth for partner routes
if (req.path.startsWith('/api/partner')) {
  return next();
}
```

### Issue: Share Percentage Not Applying
**Cause:** Backend not multiplying values

**Fix:** Verify in `server/routes/partner.ts`:
```typescript
const shareMultiplier = sharePercentage / 100;
totalBets: Math.round(originalBets * shareMultiplier * 100) / 100
```

---

## 📝 Testing Checklist

- [ ] Partner can register with phone + password only
- [ ] New partner status is 'pending'
- [ ] New partner gets default share percentage
- [ ] Admin can see pending partners
- [ ] Admin can set share percentage (1-100)
- [ ] Admin can approve partner → status changes to 'active'
- [ ] Partner can login after approval
- [ ] Partner sees share percentage badge in dashboard
- [ ] Financial amounts are multiplied by share percentage
- [ ] Cards and game info are unchanged
- [ ] Partner cannot see other partners' data
- [ ] CSV export works with adjusted amounts
- [ ] Pagination works correctly
- [ ] Date filters work
- [ ] Logout redirects to login

---

## 🎯 Key Files

### Backend
- `server/partner-auth.ts` - Partner authentication logic
- `server/routes/partner.ts` - Partner API routes
- `server/routes/admin-partners.ts` - Admin partner management
- `server/migrations/PARTNER_SYSTEM_SIMPLE.sql` - Database schema

### Frontend
- `client/src/contexts/PartnerAuthContext.tsx` - Partner auth context
- `client/src/pages/partner/partner-login.tsx` - Login page
- `client/src/pages/partner/partner-signup.tsx` - Signup page
- `client/src/pages/partner/partner-dashboard.tsx` - Dashboard
- `client/src/pages/admin-partners.tsx` - Admin management
- `client/src/components/ProtectedPartnerRoute.tsx` - Route guard

---

## 📊 System Architecture

```
┌─────────────────┐
│  Landing Page   │
│  "Become a      │
│   Partner"      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐     ┌──────────────────┐
│ Partner Signup  │────▶│  partners table  │
│ (phone+password)│     │  status: pending │
└─────────────────┘     │  share_pct: 50%  │
                        └────────┬─────────┘
                                 │
                                 ▼
                        ┌──────────────────┐
                        │  Admin Approval  │
                        │  - Set share %   │
                        │  - Activate      │
                        └────────┬─────────┘
                                 │
                                 ▼
┌─────────────────┐     ┌──────────────────┐
│ Partner Login   │────▶│  JWT Token       │
│                 │     │  role: partner   │
└────────┬────────┘     └────────┬─────────┘
         │                       │
         ▼                       ▼
┌─────────────────┐     ┌──────────────────┐
│ Partner         │────▶│  game_statistics │
│ Dashboard       │     │  × share_pct     │
│                 │◀────│  = adjusted amt  │
└─────────────────┘     └──────────────────┘
```

---

## ✅ Implementation Complete

All core features have been implemented:
- ✅ Separate partner authentication
- ✅ Simplified 3-field signup
- ✅ Share percentage system
- ✅ Admin controls for percentage + approval
- ✅ Partner dashboard with adjusted amounts
- ✅ Purple-themed UI
- ✅ CSV export
- ✅ Security & access control

**Status:** Ready for testing and deployment!

**Next Steps:**
1. Run database migration
2. Test partner registration → approval → login flow
3. Verify share percentage calculations
4. Fix card data display issue (check game_sessions)
5. Deploy to production

---

*Created: January 26, 2025*
*Version: 1.0*