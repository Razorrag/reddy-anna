# Duplicate Payout and Cards Fix

## Issues Fixed

### 1. **Duplicate Payout on "Start New Game"**

**Problem**: When admin clicked "Start New Game", players were receiving duplicate payouts with `NaN` balance values.

**Root Cause**: 
- In `BalanceContext.tsx`, the `updateBalance` function was calling `apiClient.notifyBalanceUpdate()` whenever balance was updated from a non-WebSocket source
- When `opening_card_confirmed` event was received, it triggered component re-renders that called `refreshBalance()`
- This caused the client to send balance-notify API calls to the server, which the server interpreted as balance changes
- The balance value was sometimes `NaN` because the update was triggered without a proper balance value

**Solution**:
- **Removed all client-initiated balance-notify API calls** from `BalanceContext.tsx`
- Implemented **Server as Single Source of Truth** architecture:
  - Server owns all balance changes
  - Server broadcasts balance updates via WebSocket ONLY
  - Client receives balance updates passively
  - API polling is read-only for sync/recovery only
- Added validation to reject invalid balance values (NaN, undefined, null)

**Files Changed**:
- `client/src/contexts/BalanceContext.tsx` (lines 60-90)

---

### 2. **Duplicate Cards in Admin Panel**

**Problem**: When cards were dealt, they appeared twice in the admin panel.

**Root Cause**:
- In `GameStateContext.tsx`, the `ADD_ANDAR_CARD` and `ADD_BAHAR_CARD` reducers didn't check for duplicate cards before adding them to state
- WebSocket events could be received multiple times (due to reconnections, buffered events, or race conditions)
- This caused the same card to be added to the state multiple times

**Solution**:
- Added **duplicate detection** in both `ADD_ANDAR_CARD` and `ADD_BAHAR_CARD` reducers
- Cards are now checked against existing cards by:
  - Card ID
  - Display string + suit combination
- If a duplicate is detected, it's logged and the state remains unchanged

**Files Changed**:
- `client/src/contexts/GameStateContext.tsx` (lines 186-220)

---

## Architecture Changes

### Before (❌ Race Condition Architecture)

```
Game Complete (Server)
↓
WebSocket: payout_received → Balance updated ✅
↓
Frontend: Processes payout → Updates local state ✅
↓
Admin clicks "Start New Game"
↓
opening_card_confirmed event → Triggers component re-render
↓
Component calls refreshBalance()
↓
API: GET /user/balance → Returns balance
↓
BalanceContext: updateBalance(balance, 'api')
↓
Since source !== 'websocket', calls notifyBalanceUpdate() ❌
↓
Server: POST /user/balance-notify with NaN ❌❌
```

### After (✅ Single Source of Truth)

```
┌─────────────────────────────────────────────┐
│  SERVER (Single Source of Truth)            │
│  • Manages all balance changes              │
│  • Broadcasts via WebSocket ONLY            │
│  • No client-initiated balance-notify API   │
└─────────────────────────────────────────────┘
                    │
                    │ WebSocket Events ONLY
                    ↓
┌─────────────────────────────────────────────┐
│  CLIENT                                      │
│  • Receives balance via WebSocket           │
│  • Never calls balance-notify API           │
│  • Polling ONLY for fallback/sync           │
└─────────────────────────────────────────────┘
```

---

## Key Principles

1. **Server is ALWAYS the Source of Truth**
   - All balance changes originate from server
   - Client is passive receiver, never active initiator

2. **WebSocket is Authoritative**
   - Balance updates come via WebSocket events
   - API polling is read-only backup for sync

3. **No Duplicate Processing**
   - Cards are deduplicated at state level
   - Balance updates are validated before processing

4. **Unidirectional Data Flow**
   - Server → WebSocket → Client
   - Never: Client → API → Server (for balance updates)

---

## Testing Checklist

- [x] Game complete → Payout received → Balance updated correctly
- [x] Admin starts new game → No duplicate payout
- [x] Cards dealt → No duplicate cards in admin panel
- [x] Balance updates → No NaN values
- [x] WebSocket reconnection → State syncs correctly
- [x] Multiple rapid bets → No race conditions

---

## Impact

- **Eliminated duplicate payouts** on game state changes
- **Eliminated duplicate cards** in admin panel
- **Eliminated NaN balance errors**
- **Improved data consistency** between client and server
- **Reduced API calls** (no more client-initiated balance-notify)
- **Cleaner architecture** with single source of truth

---

## Notes

- The `balance-notify` API endpoint still exists on the server for internal use
- It should ONLY be called by the server itself, never by clients
- All balance updates to clients must go through WebSocket events
- This prevents race conditions and ensures data consistency
