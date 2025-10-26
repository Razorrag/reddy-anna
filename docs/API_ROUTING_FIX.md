# 🔧 API Routing & WebSocket Authentication Fix

## Problem Identified

### 1. Double `/api/` Prefix Issue
**Root Cause:** API client has `baseURL = '/api'`, but code is calling `/api/user/...`
**Result:** Requests go to `/api/api/user/...` → 404 errors

### 2. Anonymous WebSocket Fallback
**Root Cause:** WebSocket connects before user data is loaded
**Result:** Always authenticates as 'anonymous' first, then re-authenticates

### 3. Inconsistent API Call Methods
**Root Cause:** Some use `apiClient.get()`, others use `fetch()`
**Result:** Inconsistent error handling and authentication

---

## Files That Need Fixing

### ✅ FIXED:
1. `client/src/contexts/UserProfileContext.tsx` - Removed `/api/` prefix from all calls

### ❌ NEED TO FIX:

#### Payment Endpoints (UserProfileContext.tsx)
- `/api/payment/process` → `/payment/process` (2 instances)

#### WhatsApp Endpoint (WhatsAppModal.tsx)
- `/api/whatsapp/send-request` → Should use apiClient

#### Game Settings (BackendSettings.tsx)
- `/api/game/settings` → Should use apiClient
- `/api/game/stream-settings` → Should use apiClient
- `/api/game/test-stream` → Should use apiClient

#### Admin Analytics (AnalyticsDashboard.tsx)
- `/api/admin/realtime-stats` → Should use apiClient
- `/api/admin/analytics` → Should use apiClient

#### Stream Settings (SimpleStreamSettings.tsx, StreamSettingsPanel.tsx)
- `/api/game/stream-settings` → Should use apiClient

#### Bet Monitoring (BetMonitoringDashboard.tsx)
- `/api/admin/games/${gameId}/bets` → Should use apiClient
- `/api/admin/search-bets` → Should use apiClient
- `/api/admin/bets/${betId}` → Should use apiClient

#### Game History (GameHistoryPage.tsx)
- `/api/admin/game-history` → Should use apiClient

---

## Solution Strategy

### Option 1: Remove `/api/` from all calls (RECOMMENDED)
- Keep `baseURL = '/api'` in apiClient
- Remove `/api/` prefix from all API calls
- Use apiClient for ALL API calls (not fetch)

### Option 2: Change baseURL to empty
- Set `baseURL = ''` in apiClient
- Keep `/api/` prefix in all calls
- Less changes but inconsistent with current setup

---

## WebSocket Authentication Flow (FIXED)

### Current (Broken):
```
1. Page loads
2. WebSocket connects immediately
3. No user data yet → Authenticates as 'anonymous'
4. User data loads
5. Re-authenticates with real user
```

### Fixed:
```
1. Page loads
2. Check localStorage for user/token
3. If exists → Authenticate with real data
4. If not exists → Don't authenticate (or wait)
5. WebSocket only connects when needed
```

---

## Implementation Plan

1. ✅ Fix UserProfileContext.tsx (DONE)
2. Fix all payment endpoints
3. Fix all admin endpoints
4. Fix all game settings endpoints
5. Remove WebSocket anonymous fallback
6. Standardize on apiClient for all calls
7. Add proper error handling
8. Test all endpoints

---

## Testing Checklist

- [ ] User profile loads without 404
- [ ] Analytics loads without 404
- [ ] Transactions load without 404
- [ ] Game history loads without 404
- [ ] Bonus info loads without 404
- [ ] Referral data loads without 404
- [ ] Admin can start game
- [ ] Player can place bet
- [ ] WebSocket authenticates correctly
- [ ] No anonymous fallback triggered
