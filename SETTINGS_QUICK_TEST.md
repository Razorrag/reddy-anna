# Admin Settings - Quick Test Guide

## 🚀 Quick Start

### 1. Test Backend Settings

```bash
# Login as admin first, get JWT token

# Test GET (should return mapped fields)
curl -X GET http://localhost:5000/api/admin/game-settings \
  -H "Authorization: Bearer YOUR_ADMIN_JWT"

# Expected Response:
{
  "success": true,
  "content": {
    "minBet": 10,
    "maxBet": 100000,
    "bettingTimerDuration": 30,
    "depositBonusPercent": 5,
    "referralBonusPercent": 1,
    "conditionalBonusThreshold": 30,
    "maintenanceMode": false,
    "maintenanceMessage": ""
  }
}

# Test PUT (update settings)
curl -X PUT http://localhost:5000/api/admin/game-settings \
  -H "Authorization: Bearer YOUR_ADMIN_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "minBet": 50,
    "maxBet": 50000,
    "depositBonusPercent": 10
  }'

# Expected Response:
{
  "success": true,
  "message": "Settings updated successfully"
}
```

---

### 2. Test WhatsApp Settings

```bash
# Test GET
curl -X GET http://localhost:5000/api/admin/settings \
  -H "Authorization: Bearer YOUR_ADMIN_JWT"

# Expected Response:
{
  "success": true,
  "content": {
    "adminWhatsappNumber": "+1234567890",
    "customerSupportEmail": "support@example.com",
    "customerSupportPhone": "+0987654321"
  }
}

# Test PUT
curl -X PUT http://localhost:5000/api/admin/settings \
  -H "Authorization: Bearer YOUR_ADMIN_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "adminWhatsappNumber": "+1234567890",
    "customerSupportEmail": "support@example.com"
  }'
```

---

## 🧪 Manual UI Test

### Backend Settings Page

1. Open `/admin/backend-settings`
2. Change Min Bet to 100
3. Click "Save Settings"
4. **Verify:** Success message appears
5. Refresh page
6. **Verify:** Min Bet still shows 100

### WhatsApp Settings Page

1. Open `/admin/whatsapp-settings`
2. Change WhatsApp number
3. Click "Save"
4. **Verify:** Success message
5. Refresh page
6. **Verify:** Number persists

---

## 🔍 Database Verification

```sql
-- Check backend settings
SELECT * FROM game_settings 
WHERE setting_key IN (
  'min_bet_amount',
  'max_bet_amount',
  'default_deposit_bonus_percent'
);

-- Check WhatsApp settings
SELECT * FROM game_settings 
WHERE setting_key IN (
  'admin_whatsapp_number',
  'customer_support_email'
);
```

---

## ✅ What Should Work Now

**Backend Settings:**
- ✅ Bet limits save and persist
- ✅ Bonus percentages save and persist
- ✅ Timer duration saves and persists
- ✅ Maintenance mode saves and persists

**WhatsApp Settings:**
- ✅ WhatsApp number saves and persists
- ✅ Support email saves and persists
- ✅ Support phone saves and persists

---

## 🐛 If Something's Wrong

### Settings Not Saving

**Check 1:** API path correct?
- Should be `/api/admin/game-settings` (with `/api`)
- NOT `/admin/game-settings`

**Check 2:** Reading response correctly?
- Use `response.content.*`
- NOT `response.data.*` or root level

**Check 3:** Admin authenticated?
```bash
# Test auth
curl -X GET http://localhost:5000/api/admin/settings \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -v

# Should return 200, not 401
```

### Database Not Updating

**Check:**
```sql
-- Test write permission
UPDATE game_settings 
SET setting_value = 'test' 
WHERE setting_key = 'min_bet_amount';

-- If fails, check Supabase connection
```

---

## 📊 What Changed

**Before:**
- Frontend: `{ minBet: 50 }`
- Backend expected: `{ minBetAmount: 50 }`
- **Result:** Ignored, not saved ❌

**After:**
- Frontend: `{ minBet: 50 }`
- Backend translates: `minBet → minBetAmount`
- **Result:** Saved correctly ✅

---

## 🎯 Key Points

1. **Field Mapping Added:**
   - Frontend names → Internal schema names
   - Automatic translation in API layer

2. **Maintenance Settings Fixed:**
   - Now routed to correct handler
   - Saves to system settings, not game settings

3. **Both Handlers Used:**
   - Game settings → `updateGameSettings()`
   - Maintenance → `updateSystemSettings()`

4. **Backward Compatible:**
   - No frontend changes needed
   - No database changes needed
   - Existing settings preserved

---

**Ready to test!** 🚀

For detailed info, see: `ADMIN_SETTINGS_PAGES_FIX.md`
