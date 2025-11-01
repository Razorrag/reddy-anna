# API Testing Guide

## Overview
This is an **Andar Bahar** card game application with JWT-based authentication, payment processing, game management, and streaming capabilities.

**Base URL:** `http://localhost:5000` (or your production URL)

---

## 🔐 Authentication APIs (Public - No Auth Required)

### 1. User Registration
```http
POST /api/auth/register
Content-Type: application/json

{
  "name": "John Doe",
  "phone": "9876543210",
  "password": "Password123",
  "confirmPassword": "Password123",
  "referralCode": "ABC123" // Optional
}
```

### 2. User Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "phone": "9876543210",
  "password": "Password123"
}
```

**Response includes:**
- `token` (access token)
- `refreshToken` (refresh token)
- `user` object with balance, id, role

### 3. Admin Login
```http
POST /api/auth/admin-login
Content-Type: application/json

{
  "username": "admin",
  "password": "admin123"
}
```

### 4. Refresh Token
```http
POST /api/auth/refresh
Content-Type: application/json

{
  "refreshToken": "your_refresh_token_here"
}
```

### 5. Logout
```http
POST /api/auth/logout
```

---

## 👤 User APIs (Requires Authentication)

**Header:** `Authorization: Bearer <access_token>`

### 6. Get User Profile
```http
GET /api/user/profile
```

### 7. Update User Profile
```http
PUT /api/user/profile
Content-Type: application/json

{
  "name": "Updated Name",
  "email": "user@example.com"
}
```

### 8. Get User Balance
```http
GET /api/user/balance
```

### 9. Get User Analytics
```http
GET /api/user/analytics
```

### 10. Get User Transactions
```http
GET /api/user/transactions
```

**Query Params:**
- `limit` (optional)
- `offset` (optional)
- `type` (optional: deposit, withdraw, bonus)

### 11. Get Wagering Progress
```http
GET /api/user/wagering-progress
```

### 12. Get Bonus Info
```http
GET /api/user/bonus-info
```

### 13. Claim Bonus
```http
POST /api/user/claim-bonus
Content-Type: application/json

{}
```

### 14. Get Referral Data
```http
GET /api/user/referral-data
```

### 15. Get Game History
```http
GET /api/user/game-history
```

**Query Params:**
- `limit` (optional)
- `offset` (optional)

### 16. Get Detailed Game History
```http
GET /api/user/game-history-detailed
```

### 17. Balance Notify (Webhook)
```http
POST /api/user/balance-notify
Content-Type: application/json

{
  "userId": "user_id",
  "newBalance": 1500.00
}
```

---

## 💰 Payment APIs

### 18. Create Payment Request (User)
```http
POST /api/payment-requests
Authorization: Bearer <token>
Content-Type: application/json

{
  "amount": 5000,
  "paymentMethod": {
    "type": "upi",
    "details": {
      "upiId": "user@paytm"
    }
  },
  "requestType": "deposit" // or "withdrawal"
}
```

### 19. Get Payment Requests (User)
```http
GET /api/payment-requests
Authorization: Bearer <token>
```

**Query Params:**
- `status` (optional: pending, approved, rejected)
- `type` (optional: deposit, withdrawal)

### 20. Process Payment Directly (Admin Only)
```http
POST /api/payment/process
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "userId": "user_id",
  "amount": 5000,
  "method": {
    "type": "upi",
    "details": {
      "upiId": "user@paytm"
    }
  },
  "type": "deposit" // or "withdraw"
}
```

### 21. Get Payment History
```http
GET /api/payment/history/:userId
Authorization: Bearer <token>
```

---

## 👑 Admin Payment Management APIs

### 22. Get Pending Payment Requests (Admin)
```http
GET /api/admin/payment-requests/pending
Authorization: Bearer <admin_token>
```

### 23. Approve Payment Request (Admin)
```http
PATCH /api/admin/payment-requests/:requestId/approve
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "notes": "Approved via UPI transfer"
}
```

### 24. Reject Payment Request (Admin)
```http
PATCH /api/admin/payment-requests/:requestId/reject
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "reason": "Invalid payment details"
}
```

### 25. Create Payment Request (Admin)
```http
POST /api/admin/payment-requests/create
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "userId": "user_id",
  "amount": 5000,
  "type": "deposit",
  "paymentMethod": {
    "type": "upi",
    "details": {
      "upiId": "user@paytm"
    }
  }
}
```

---

## 🎮 Game APIs

### 26. Get Current Game State
```http
GET /api/game/current
```

**Response includes:**
- Current round
- Game status
- Betting timer
- Active bets

### 27. Get Game History
```http
GET /api/game/history
```

**Query Params:**
- `limit` (optional, default: 10)
- `offset` (optional)

### 28. Get Game Settings
```http
GET /api/game-settings
```

### 29. Update Game Settings (Requires Auth)
```http
POST /api/game-settings
Authorization: Bearer <token>
Content-Type: application/json

{
  "betting_timer_duration": 30,
  "min_bet_amount": 1000,
  "max_bet_amount": 100000
}
```

### 30. Stream Status Check
```http
GET /api/game/stream-status-check
```

---

## 📺 Streaming APIs

### 31. Get Stream Configuration
```http
GET /api/stream/config
```

### 32. Switch Stream Method (Admin)
```http
POST /api/stream/method
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "method": "rtmp" // or "webrtc"
}
```

### 33. Update RTMP Config (Admin)
```http
POST /api/stream/rtmp/config
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "serverUrl": "rtmp://server.com",
  "streamKey": "stream_key",
  "playerUrl": "https://player.com/stream"
}
```

### 34. Update WebRTC Config (Admin)
```http
POST /api/stream/webrtc/config
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "quality": "high",
  "resolution": "1080p",
  "fps": 30,
  "bitrate": 5000,
  "audioEnabled": true,
  "screenSource": "screen",
  "roomId": "room_123"
}
```

### 35. Update Stream Status (Admin)
```http
POST /api/stream/status
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "method": "rtmp",
  "status": "online" // or "offline", "connecting", "error"
}
```

### 36. Update Stream Title (Admin)
```http
POST /api/stream/title
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "title": "Live Andar Bahar - Round 1"
}
```

### 37. Toggle Stream Visibility (Admin)
```http
POST /api/stream/show
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "show": true
}
```

### 38. Start Stream Session (Admin)
```http
POST /api/stream/session/start
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "method": "rtmp" // or "webrtc"
}
```

### 39. End Stream Session (Admin)
```http
POST /api/stream/session/end
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "sessionId": "session_id"
}
```

### 40. Update Viewer Count (Admin)
```http
POST /api/stream/viewers
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "count": 150
}
```

### 41. Get Stream Sessions (Admin)
```http
GET /api/stream/sessions
Authorization: Bearer <admin_token>
```

**Query Params:**
- `limit` (optional, default: 10)

---

## 👥 Admin User Management APIs

### 42. Get All Users (Admin)
```http
GET /api/admin/users
Authorization: Bearer <admin_token>
```

**Query Params:**
- `status` (optional: active, suspended, banned)
- `search` (optional: search by phone/name)
- `limit` (optional)
- `offset` (optional)
- `sortBy` (optional: createdAt, lastLogin, balance, name)
- `sortOrder` (optional: asc, desc)

### 43. Get User Details (Admin)
```http
GET /api/admin/users/:userId
Authorization: Bearer <admin_token>
```

### 44. Update User Status (Admin)
```http
PATCH /api/admin/users/:userId/status
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "status": "suspended", // or "active", "banned"
  "reason": "Violation of terms"
}
```

### 45. Update User Balance (Admin)
```http
PATCH /api/admin/users/:userId/balance
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "amount": 1000,
  "type": "add", // or "subtract"
  "reason": "Bonus credit"
}
```

### 46. Create User Manually (Admin)
```http
POST /api/admin/users/create
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "phone": "9876543210",
  "name": "New User",
  "password": "Password123", // Optional, defaults to phone number
  "initialBalance": 0,
  "role": "player",
  "status": "active",
  "referralCode": "ABC123" // Optional
}
```

### 47. Bulk Update User Status (Admin)
```http
POST /api/admin/users/bulk-status
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "userIds": ["user_id_1", "user_id_2"],
  "status": "suspended",
  "reason": "Batch update"
}
```

### 48. Export Users (Admin)
```http
GET /api/admin/users/export
Authorization: Bearer <admin_token>
```

**Query Params:**
- Same filters as Get All Users

### 49. Get User Referrals (Admin)
```http
GET /api/admin/users/:userId/referrals
Authorization: Bearer <admin_token>
```

### 50. Get Admin Statistics
```http
GET /api/admin/statistics
Authorization: Bearer <admin_token>
```

---

## 🎁 Bonus & Referral APIs (Admin)

### 51. Get Bonus Analytics (Admin)
```http
GET /api/admin/bonus-analytics
Authorization: Bearer <admin_token>
```

### 52. Get Referral Analytics (Admin)
```http
GET /api/admin/referral-analytics
Authorization: Bearer <admin_token>
```

### 53. Apply Bonus Manually (Admin)
```http
POST /api/admin/apply-bonus
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "userId": "user_id",
  "amount": 500,
  "reason": "Promotional bonus",
  "type": "deposit_bonus" // or "referral_bonus"
}
```

### 54. Get Bonus Settings (Admin)
```http
GET /api/admin/bonus-settings
Authorization: Bearer <admin_token>
```

### 55. Update Bonus Settings (Admin)
```http
PUT /api/admin/bonus-settings
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "depositBonus": 30,
  "referralCommission": 5,
  "default_deposit_bonus_percent": 30,
  "referral_bonus_percent": 1,
  "wagering_multiplier": 0.3
}
```

### 56. Get Bonus Transactions (Admin)
```http
GET /api/admin/bonus-transactions
Authorization: Bearer <admin_token>
```

### 57. Get Referral Data (Admin)
```http
GET /api/admin/referral-data
Authorization: Bearer <admin_token>
```

---

## ⚙️ Game Settings APIs (Admin)

### 58. Get Game Settings (Admin)
```http
GET /api/admin/game-settings
Authorization: Bearer <admin_token>
```

### 59. Update Game Settings (Admin)
```http
PUT /api/admin/game-settings
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "bettingTimerDuration": 30,
  "roundTransitionDelay": 2,
  "minBetAmount": 1000,
  "maxBetAmount": 100000,
  "defaultStartingBalance": 100000,
  "houseCommissionRate": 0.05,
  "adminWhatsAppNumber": "918686886632",
  "default_deposit_bonus_percent": 30,
  "referral_bonus_percent": 1
}
```

---

## 📊 Game Management APIs (Admin)

### 60. Get Game Bets (Admin)
```http
GET /api/admin/games/:gameId/bets
Authorization: Bearer <admin_token>
```

### 61. Get All Bets (Admin)
```http
GET /api/admin/bets/all
Authorization: Bearer <admin_token>
```

**Query Params:**
- `status` (optional)
- `gameId` (optional)
- `userId` (optional)
- `limit` (optional)
- `offset` (optional)

### 62. Update Bet (Admin)
```http
PATCH /api/admin/bets/:betId
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "status": "completed",
  "payout": 2000
}
```

### 63. Delete Bet (Admin)
```http
DELETE /api/admin/bets/:betId
Authorization: Bearer <admin_token>
```

### 64. Search Bets (Admin)
```http
GET /api/admin/search-bets
Authorization: Bearer <admin_token>
```

**Query Params:**
- `query` (required)
- `limit` (optional)

---

## 📈 Analytics APIs (Admin)

### 65. Get Admin Analytics
```http
GET /api/admin/analytics
Authorization: Bearer <admin_token>
```

### 66. Get Realtime Stats
```http
GET /api/admin/realtime-stats
Authorization: Bearer <admin_token>
```

### 67. Get Game History (Admin)
```http
GET /api/admin/game-history
Authorization: Bearer <admin_token>
```

**Query Params:**
- `limit` (optional)
- `offset` (optional)
- `fromDate` (optional)
- `toDate` (optional)

---

## 📝 Content Management APIs

### 68. Get Site Content
```http
GET /api/content
```

### 69. Update Site Content (Admin)
```http
PUT /api/admin/content
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "whatsappNumber": "+91 8686886632",
  "siteTitle": "Andar Bahar Game",
  "siteSubtitle": "Play and Win",
  "heroTitle": "Welcome",
  "heroDescription": "Play now",
  "contactInfo": {
    "phone": "+91 8686886632",
    "email": "support@example.com",
    "address": "Mumbai, India"
  }
}
```

### 70. Get System Settings (Admin)
```http
GET /api/admin/settings
Authorization: Bearer <admin_token>
```

### 71. Update System Settings (Admin)
```http
PUT /api/admin/settings
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "maintenanceMode": false,
  "maintenanceMessage": "",
  "depositBonus": 30,
  "referralCommission": 5,
  "minDepositAmount": 100,
  "maxDepositAmount": 100000,
  "minWithdrawAmount": 500,
  "maxWithdrawAmount": 50000,
  "customerSupportEmail": "support@example.com",
  "customerSupportPhone": "+91 8686886632"
}
```

---

## 🌐 WebSocket Connection

**Endpoint:** `ws://localhost:5000/ws` (or `wss://` for HTTPS)

**Authentication:** Send token in query parameter or authorization header

**WebSocket Events:**
- Game state updates
- Bet placements
- Round results
- Real-time balance updates
- Stream status changes

---

## 🧪 Quick Test Examples

### Test User Registration & Login Flow:
```bash
# 1. Register
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","phone":"9876543210","password":"Test123","confirmPassword":"Test123"}'

# 2. Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"phone":"9876543210","password":"Test123"}'

# 3. Get Balance (use token from login response)
curl -X GET http://localhost:5000/api/user/balance \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Test Payment Request Flow:
```bash
# 1. Create deposit request
curl -X POST http://localhost:5000/api/payment-requests \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer USER_TOKEN" \
  -d '{"amount":5000,"paymentMethod":{"type":"upi","details":{"upiId":"test@paytm"}},"requestType":"deposit"}'

# 2. Admin approves (use admin token)
curl -X PATCH http://localhost:5000/api/admin/payment-requests/REQUEST_ID/approve \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -d '{"notes":"Approved"}'
```

### Test Admin Operations:
```bash
# Get all users
curl -X GET http://localhost:5000/api/admin/users \
  -H "Authorization: Bearer ADMIN_TOKEN"

# Get game settings
curl -X GET http://localhost:5000/api/admin/game-settings \
  -H "Authorization: Bearer ADMIN_TOKEN"

# Get analytics
curl -X GET http://localhost:5000/api/admin/analytics \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

---

## 📌 Important Notes

1. **Authentication:** Most endpoints require JWT token in `Authorization: Bearer <token>` header
2. **Admin Endpoints:** Require user role to be `admin` or `super_admin`
3. **Rate Limiting:** Some endpoints have rate limits (auth endpoints have stricter limits)
4. **Payment Processing:** Direct payments (`/api/payment/process`) are **admin-only**. Regular users must use payment request flow (`/api/payment-requests`)
5. **WebSocket:** Requires authentication token for connection
6. **Phone Format:** Indian 10-digit mobile numbers (e.g., "9876543210")
7. **Amounts:** All amounts are in Indian Rupees (₹)

---

## 🔍 Testing Tools

- **Postman:** Import collection or manually test endpoints
- **cURL:** Command line testing (examples above)
- **Thunder Client:** VS Code extension for API testing
- **Insomnia:** API testing client
- **WebSocket Client:** Test WebSocket connection for real-time game updates

---

## 🐛 Common Test Scenarios

1. **User Registration → Login → Get Balance → Create Payment Request**
2. **Admin Login → View Pending Payments → Approve Payment → Check User Balance**
3. **Get Game Settings → Update Settings → Verify Changes**
4. **Get Stream Config → Update Stream Status → Check Stream**
5. **Place Bet via WebSocket → Check Bet Status → View Game History**
6. **Create User → Check Referral → Apply Bonus → Verify Balance**
7. **Get Analytics → Check Statistics → Export Data**

---

This comprehensive guide covers all major API endpoints in your Andar Bahar application. Start testing with the authentication endpoints first, then proceed with user-specific and admin-specific endpoints based on your needs.









