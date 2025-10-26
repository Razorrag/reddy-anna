# 🔍 Hardcoded Values Audit & Fixes

## Critical Hardcoded Values Found

### 1. **Default Balance: 100000** 🔴
**Locations:**
- `server/user-management.ts:267` - User creation default balance
- `server/storage-supabase.ts:315` - Database default balance
- `server/auth.ts:110` - Uses env var but defaults to "0.00"
- `server/routes.ts:2402-2408` - Balance endpoint defaults
- `client/src/pages/signup.tsx:78` - Signup default
- `client/src/pages/login.tsx:37` - Login default
- `client/src/pages/player-game.tsx:33,41,72` - Multiple defaults
- `client/src/pages/user-admin.tsx:189` - User creation form

**Issue:** Should come from database settings, not hardcoded

**Fix:** Use `DEFAULT_BALANCE` from env or database setting

---

### 2. **WhatsApp Number: 918686886632** 🔴
**Locations:**
- `server/whatsapp-service.ts:33,39` - Fallback number
- `server/content-management.ts:178,179,414` - Default values
- `client/src/pages/admin-whatsapp-settings.tsx:24,102,121` - UI defaults

**Issue:** Should come from database only

**Fix:** Remove hardcoded fallback, require admin to set it

---

### 3. **Bet Limits: 1000-100000** 🔴
**Locations:**
- `server/routes.ts:619` - WebSocket bet validation
- `server/storage-supabase.ts:951` - Game settings
- `server/content-management.ts:410-411` - Settings defaults
- `client/src/pages/player-game.tsx:64` - Bet amounts array
- `client/src/components/GameLogic/GameLogic.tsx:165,168` - Validation

**Issue:** Should come from database settings

**Fix:** Fetch from `game_settings` table

---

### 4. **Deposit/Withdrawal Limits** 🔴
**Locations:**
- `server/content-management.ts:180-183` - Hardcoded defaults
- `server/routes.ts:1296` - Max amount validation

**Issue:** Should be configurable

**Fix:** Use database settings

---

### 5. **Localhost URLs** 🔴
**Locations:**
- `client/src/components/GameAdmin/BackendSettings.tsx:81-87` - RTMP/HLS URLs
- `client/src/contexts/WebSocketContext.tsx:43` - WebSocket fallback

**Issue:** Won't work in production

**Fix:** Use environment variables

---

### 6. **Test/Mock Data** 🔴
**Locations:**
- `client/src/pages/player-game.tsx:37-42` - Test player data
- `server/routes.ts:2407-2408` - Allows without auth

**Issue:** Security risk, should be removed

**Fix:** Remove all test/mock data

---

## Implementation Plan

### Step 1: Environment Variables (.env)
```env
# Database
DATABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_key

# Defaults
DEFAULT_BALANCE=100000
MIN_BET=1000
MAX_BET=100000
MIN_DEPOSIT=100
MAX_DEPOSIT=100000
MIN_WITHDRAW=500
MAX_WITHDRAW=50000

# WhatsApp
DEFAULT_WHATSAPP=918686886632

# Server
PORT=5000
NODE_ENV=production

# JWT
JWT_SECRET=your_secret
JWT_EXPIRES_IN=7d

# WebSocket
WEBSOCKET_URL=wss://yourdomain.com/ws

# Streaming
RTMP_SERVER=rtmp://yourdomain.com:1936/live
HLS_URL=https://yourdomain.com/live/stream.m3u8
```

### Step 2: Database Settings Table
Ensure `game_settings` has all these keys:
- `default_balance`
- `min_bet_amount`
- `max_bet_amount`
- `min_deposit_amount`
- `max_deposit_amount`
- `min_withdraw_amount`
- `max_withdraw_amount`
- `admin_whatsapp_number`
- `betting_timer_duration`
- `round_transition_delay`

### Step 3: Server-Side Fixes

**auth.ts:**
```typescript
// Use DEFAULT_BALANCE from env, fallback to 100000
const defaultBalance = process.env.DEFAULT_BALANCE || "100000.00";
```

**routes.ts - Remove test balance endpoint:**
```typescript
// DELETE lines 2399-2409 - no balance without auth
app.get("/api/balance", authMiddleware, async (req, res) => {
  const user = await storage.getUserById(req.user.id);
  res.json({ balance: user.balance });
});
```

**routes.ts - Dynamic bet validation:**
```typescript
// Fetch from settings instead of hardcoded
const settings = await getGameSettings();
if (betAmount < settings.minBetAmount || betAmount > settings.maxBetAmount) {
  ws.send(JSON.stringify({
    type: 'error',
    data: { message: `Bet must be between ₹${settings.minBetAmount} and ₹${settings.maxBetAmount}` }
  }));
}
```

### Step 4: Client-Side Fixes

**Remove all hardcoded 100000:**
```typescript
// BEFORE
balance: response.user?.balance || 100000.00

// AFTER
balance: response.user?.balance || 0
// Let backend handle defaults
```

**player-game.tsx - Remove test data:**
```typescript
// DELETE lines 36-42
// No default test player
```

**Fetch bet amounts from API:**
```typescript
// BEFORE
const betAmounts = [2500, 5000, 10000, 20000, 30000, 40000, 50000, 100000];

// AFTER
const [betAmounts, setBetAmounts] = useState<number[]>([]);

useEffect(() => {
  fetch('/api/game-settings').then(res => res.json()).then(data => {
    const min = data.minBetAmount;
    const max = data.maxBetAmount;
    // Generate amounts between min and max
    setBetAmounts(generateBetAmounts(min, max));
  });
}, []);
```

### Step 5: Configuration API Endpoint

**New endpoint for client config:**
```typescript
app.get("/api/config", async (req, res) => {
  const settings = await getGameSettings();
  res.json({
    minBet: settings.minBetAmount,
    maxBet: settings.maxBetAmount,
    betAmounts: generateBetAmounts(settings.minBetAmount, settings.maxBetAmount),
    defaultBalance: settings.defaultStartingBalance,
    websocketUrl: process.env.WEBSOCKET_URL || `ws://${req.get('host')}/ws`,
    streamUrl: process.env.HLS_URL
  });
});
```

---

## Priority Fixes (Do First)

### 🔴 CRITICAL - Security Issues
1. Remove test player data from player-game.tsx
2. Remove balance endpoint that works without auth
3. Remove all mock/test data

### 🟠 HIGH - Functionality Issues
1. Make bet limits dynamic from database
2. Make default balance configurable
3. Fix WebSocket URL for production

### 🟡 MEDIUM - Configuration Issues
1. Move WhatsApp number to database only
2. Make deposit/withdrawal limits configurable
3. Add streaming URLs to env vars

---

## Testing Checklist

After fixes:
- [ ] User creation uses database default balance
- [ ] Bet validation uses database limits
- [ ] No hardcoded WhatsApp numbers
- [ ] No test/mock data in production
- [ ] WebSocket connects in production
- [ ] All limits configurable via admin panel
- [ ] No localhost URLs in production code
- [ ] Environment variables properly loaded

---

## Files to Modify

### Server (8 files):
1. `server/auth.ts` - Default balance
2. `server/routes.ts` - Bet validation, remove test endpoints
3. `server/user-management.ts` - Default balance
4. `server/storage-supabase.ts` - Default balance
5. `server/content-management.ts` - Remove hardcoded defaults
6. `server/whatsapp-service.ts` - Remove fallback number
7. `server/validation.ts` - Dynamic limits
8. `server/index.ts` - Add config endpoint

### Client (7 files):
1. `client/src/pages/login.tsx` - Remove default balance
2. `client/src/pages/signup.tsx` - Remove default balance
3. `client/src/pages/player-game.tsx` - Remove test data, dynamic bets
4. `client/src/pages/user-admin.tsx` - Remove default balance
5. `client/src/pages/admin-whatsapp-settings.tsx` - Remove defaults
6. `client/src/components/GameLogic/GameLogic.tsx` - Dynamic validation
7. `client/src/contexts/WebSocketContext.tsx` - Production URL

---

*This audit ensures NO hardcoded values remain in production code.*
