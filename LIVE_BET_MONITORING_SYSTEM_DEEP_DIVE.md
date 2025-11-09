# Live Bet Monitoring System - Deep Dive and Usage Guide

This document explains exactly how the live bet monitoring and admin bet editing system works with the existing codebase and defines the rules to keep it reliable.

---

## 1. High-Level Overview

Live bet monitoring is implemented as:

- A backend layer that:
  - Tracks current game state in memory and in the database.
  - Exposes endpoints for:
    - Live grouped bets
    - Editing/cancelling bets
    - Undo logic
  - Broadcasts real-time updates via WebSocket.

- A frontend layer that:
  - Shows live bet monitoring ONLY on the `/admin` dashboard.
  - Provides an edit UI for admins.
  - Periodically polls the backend and reacts to WebSocket-driven update events.

The system is designed so that:
- Database is always the source of truth.
- The in-memory game state keeps totals in sync.
- Admins manage bets from a single, dedicated place.

---

## 2. Backend Architecture

File: [`server.routes()`](server/routes.ts:1073)

### 2.1. Game State Core

Global game state: `currentGameState` (instance of `GameState`)

Tracks:
- `gameId`
- `phase` ("idle" | "betting" | "dealing" | "complete")
- `currentRound`
- `bettingLocked`
- `round1Bets` / `round2Bets` (global totals)
- `userBets` (per-user structured totals)
- `andarCards`, `baharCards`, `winner`, `winningCard`
- Timer and related fields

Exposed globally at bottom of routes.ts:
- `(global as any).currentGameState = currentGameState;`
- `(global as any).broadcast = broadcast;`
- `(global as any).broadcastToRole = broadcastToRole;`

Used consistently by:
- Bet placement
- Undo
- Cancel
- Bet editing
- Live grouped endpoint
- Realtime analytics

---

### 2.2. Live Grouped Bets Endpoint

Handler: [`server.routes()`](server/routes.ts:4643)

- URL:
  - `GET /api/admin/bets/live-grouped`
- Purpose:
  - Provide CUMULATIVE per-player bet view for the CURRENT GAME.

Flow:
1. Read `currentGameState.gameId`.
   - If missing or `default-game`:
     - Return `success: true, data: []` (no active game).
2. Load bets:
   - `storage.getBetsForGame(gameId)`
3. Filter:
   - Only `status === 'active' || status === 'pending'`
4. Group by `userId`:
   - For each user:
     - `round1Andar`, `round1Bahar`
     - `round2Andar`, `round2Bahar`
     - `totalAndar`, `totalBahar`
     - `grandTotal`
     - `bets[]` with full individual bet records
5. Sort:
   - Descending by `grandTotal`
6. Respond:
   - `data`: array of player aggregates
   - `gameId`, `gamePhase`, `currentRound`

Key guarantees:
- Always computed from DB → resilient against stale in-memory state.
- Frontend can fully trust this endpoint as source of truth.

---

### 2.3. Admin Bet Edit Endpoint

Handler: [`server.routes()`](server/routes.ts:4478)

- URL:
  - `PATCH /api/admin/bets/:betId`
- Security:
  - `requireAuth`
  - `requireAdmin`
  - `generalLimiter` (rate limiting)

Validation:
- `side` ∈ {`andar`, `bahar`}
- `amount`:
  - > 0
  - ≤ 1,000,000 (configurable via code)
- `round` ∈ {1, 2}

Flow:
1. Load bet: `storage.getBetById(betId)`
   - 404 if not found.
2. Load game session: `storage.getGameSession(currentBet.gameId)`
   - 404 if not found.
3. Check phase:
   - Allowed phases: `betting`, `dealing`
   - If NOT allowed → reject:
     - "Cannot modify bets during {phase} phase."
4. Update bet in DB:
   - `storage.updateBetDetails(betId, { side, amount, round })`
5. Update in-memory game state (best-effort):
   - Adjust `currentGameState.userBets` for that user.
   - Adjust `currentGameState.round1Bets` / `round2Bets`.
   - Uses defensive `Math.max(0, ...)` to avoid negative totals.
6. Broadcast:
   - `broadcast({ type: 'admin_bet_update', data: { ... } })`
   - Contains:
     - betId, userId
     - oldSide/newSide, oldAmount/newAmount
     - round, updatedBy, timestamp

Notes:
- If in-memory update fails (user missing), DB is still correct.
- Live monitoring re-pulls from DB, so UI remains consistent.

---

### 2.4. Undo and Cancel Logic (Impact on Monitoring)

1) Player undo last bet

Handler: [`server.routes()`](server/routes.ts:4774)

- URL:
  - `DELETE /api/user/undo-last-bet`
- Constraints:
  - Authenticated user only.
  - `currentGameState.phase` MUST be `betting`.
  - Operates only on latest `pending` bet in current round for that user.
- Actions:
  - Marks that bet `cancelled` in DB.
  - Refunds amount via `storage.addBalanceAtomic`.
  - Updates `currentGameState.userBets` and `roundX` totals.
  - Broadcasts:
    - `admin_bet_update` to admins (through `broadcastToRole`).
    - `bet_undo_success` for user feedback.

2) Admin cancel bet

Handler: [`server.routes()`](server/routes.ts:4968)

- URL:
  - `DELETE /api/admin/bets/:betId`
- Constraints:
  - `requireAuth`, `requireAdmin`
  - Only in `betting` phase.
- Actions:
  - Refunds user.
  - Sets `status: 'cancelled'`.
  - Updates `currentGameState`.
  - Broadcasts `bet_cancelled`.

All these mutations:
- Ultimately recomputed into the live grouped view via `/api/admin/bets/live-grouped`.

---

## 3. Frontend Architecture

### 3.1. Admin Dashboard (/admin)

File: [`client.src.pages.Admin()`](client/src/pages/admin.tsx:24)

Key elements:
- Uses `AdminLayout`.
- Shows summary analytics via `useAdminStats`.
- Renders Live Bet Monitoring:

  - Heading: "🧭 Live Bet Monitoring"
  - Component: `<LiveBetMonitoring />`
  - This is the ONLY place the full monitoring UI is rendered.

This matches the requirement:
- Bet monitoring should be accessible on the outer admin page, not inside game control.

---

### 3.2. Game Control (/admin/game)

File: [`client.src.pages.AdminGame()`](client/src/pages/admin-game.tsx:4)

- Wraps `AdminGamePanel` in `AdminLayout`.
- Responsibility:
  - Start/reset game.
  - Select opening card.
  - Control phases.
  - Deal cards.
  - Show timers and per-side totals.

Reference file for expected behavior:
- [`client.src.components.AdminGamePanel.AdminGamePanelSimplified()`](client/src/components/AdminGamePanel/AdminGamePanelSimplified.tsx:21)

Design rules:
- CLEAN game control:
  - No bet monitoring dashboard UI here.
  - No user-level editing here.
- It may:
  - Listen to `admin_bet_update` and `gameStateUpdated` to refresh displayed totals.
  - Reflect current totals and state but not act as monitoring/edit surface.

If any `LiveBetMonitoring` import/usage reappears inside game control:
- That is a regression and must be removed.

---

### 3.3. LiveBetMonitoring Component

File: [`client.src.components.LiveBetMonitoring()`](client/src/components/LiveBetMonitoring.tsx:51)

Responsibilities:
- Show per-player cumulative bets for current game.
- Allow admin to edit bets until game completion.
- Keep data fresh via:
  - Polling
  - WebSocket-triggered refresh

Key behaviors:

1) Initial fetch and auto-refresh:
- On mount:
  - Calls `/admin/bets/live-grouped`.
- Interval:
  - Every 3 seconds: re-fetch.
- Dependencies:
  - `gameState.gameId`
  - `gameState.phase`
- Logs:
  - "🔄 Fetching live bets from API..."
  - "📊 Fetched N players' bets: [...]"

2) WebSocket event hook:
- Registers:
  - `window.addEventListener('admin_bet_update', handler)`
- On event:
  - Logs:
    - "📨 LiveBetMonitoring received admin_bet_update: {...}"
  - Calls `fetchLiveBets()` again.

IMPORTANT:
- This requires the WebSocket layer to dispatch DOM events:
  - When receiving `type: 'admin_bet_update'` from server:
    - It should do:
      - `window.dispatchEvent(new CustomEvent('admin_bet_update', { detail: message.data }))`
- If that bridge is missing:
  - Polling still works → system is correct but less "instant".

3) Edit flow:
- `startEdit(player, round)`:
  - Derives current side and amount for that round based on cumulative values.
- `saveEdit()`:
  - For selected player+round:
    - Collects all their bet IDs for that round:
      - from `player.bets[]`.
    - Calculates `amountPerBet = newAmount / roundBets.length`.
    - For each bet:
      - `PATCH /api/admin/bets/${bet.id}` with:
        - `{ side: newSide, amount: amountPerBet, round: round.toString() }`
  - On success:
    - Shows "✅ Bet updated successfully".
    - Cancels edit state.
    - Calls `fetchLiveBets()`.

Outcome:
- Database is updated for each underlying bet.
- Server updates `currentGameState` and broadcasts `admin_bet_update`.
- UI re-fetches grouped data, showing consistent totals.

---

## 4. WebSocket Integration: admin_bet_update

Backend:
- Uses:
  - `broadcast(...)`
  - `broadcastToRole(...)`
- Sends messages including:
  - `type: 'admin_bet_update'`
  - `data: { gameId, userId, round, side, amount, ... }`

Frontend (required pattern in WebSocketContext or similar):
- On WebSocket message:
  - If `message.type === 'admin_bet_update'`:
    - Update any relevant contexts (game totals, etc.)
    - Dispatch browser event:
      - `window.dispatchEvent(new CustomEvent('admin_bet_update', { detail: message.data }))`

Effect:
- `LiveBetMonitoring`:
  - Already listens to this event and triggers a fresh fetch.
- Any admin/game panels:
  - Can listen to same event to refresh displayed totals without duplicating logic.

If this bridge is missing:
- Directly add in WebSocket handler:
  - `if (msg.type === 'admin_bet_update') { window.dispatchEvent(new CustomEvent('admin_bet_update', { detail: msg.data })); }`

---

## 5. Common Failure Modes and How Existing Design Prevents Them

1) Live monitoring visible inside game control page:
- Cause:
  - Importing and rendering `LiveBetMonitoring` or similar inside `AdminGamePanel`.
- Fix (using current architecture):
  - Only keep `LiveBetMonitoring` in `/admin` dashboard.
  - `AdminGamePanel` should only visualize totals via `GameStateContext` and events.

2) Blank monitoring list while bets exist:
- Possible causes:
  - `currentGameState.gameId` invalid or not initialized.
  - Bets placed with mismatched gameId.
- Protective design:
  - Game must be started correctly from admin game page.
  - `restoreActiveGameState()` tries to restore on server start.
- Operational rule:
  - Always use the admin game controls to start/reset games.
  - Do not manually inject inconsistent game IDs.

3) Inconsistent edits / partial updates:
- Scenario:
  - Admin changes cumulative bet when game transitions from `betting` to `dealing` or `complete` mid-loop.
- Behavior:
  - Some PATCH may succeed, some fail (backend enforces phase).
  - `LiveBetMonitoring` always re-fetches from `/live-grouped` after edit.
- Result:
  - Final UI always reflects DB.
  - No silent corruption; worst case: partial adjustment visible, which is still correct as per accepted updates.

4) Stale UI (no instant updates):
- If WebSocket → DOM event bridge not wired or broken:
  - System falls back to 3s polling.
- This does NOT break correctness.
- It only affects "live" feel.

---

## 6. Operational Rules for Proper Usage

To keep live bet monitoring reliable without new systems:

1) Single monitoring surface:
   - Use the Live Bet Monitoring dashboard ONLY on:
     - `/admin` (Admin Dashboard).
   - Do NOT embed monitoring table or edit controls inside:
     - `/admin/game` or other pages.

2) Start games correctly:
   - Admin:
     - Uses game control UI to start/reset games.
   - Ensures:
     - `currentGameState.gameId` is valid.
     - All bets link to that gameId.
     - `/live-grouped` returns correct data.

3) Edit bets only during allowed phases:
   - Allowed:
     - `betting`, `dealing`
   - Backend already enforces; admins should be aware:
     - If game is `complete`, edits will be rejected.

4) Always rely on `/api/admin/bets/live-grouped`:
   - Treat this endpoint as the authoritative source for:
     - Cumulative per-user totals.
   - Never try to compute totals on the client using old data.

5) Ensure WebSocket bridge is present:
   - On receiving `type: 'admin_bet_update'`:
     - Dispatch `admin_bet_update` event on `window`.
   - This makes:
     - LiveBetMonitoring + Admin UIs instantly update after:
       - Edits
       - Cancels
       - Undo
       - Any admin bet operation.

---

## 7. Minimal Code-Level Checklist

Use the existing implementation and confirm:

- Frontend:
  - [`client.src.pages.Admin()`](client/src/pages/admin.tsx:24):
    - Imports and renders `LiveBetMonitoring` → YES.
  - [`client.src.pages.AdminGame()`](client/src/pages/admin-game.tsx:4):
    - Uses `AdminGamePanel` only.
    - Does NOT import `LiveBetMonitoring` → must be TRUE.
  - [`client.src.components.LiveBetMonitoring()`](client/src/components/LiveBetMonitoring.tsx:51):
    - Uses `/admin/bets/live-grouped`.
    - Listens for `admin_bet_update` window event.
    - On save:
      - PATCH `/api/admin/bets/:betId` for each underlying bet.
      - Calls `fetchLiveBets()`.

- Backend:
  - [`server.routes()`](server/routes.ts:4643):
    - `/api/admin/bets/live-grouped` implemented as described.
  - [`server.routes()`](server/routes.ts:4478):
    - `/api/admin/bets/:betId`:
      - Validations
      - Phase check
      - In-memory update
      - `admin_bet_update` broadcast
  - [`server.routes()`](server/routes.ts:4774):
    - `/api/user/undo-last-bet`:
      - Uses currentGameState
      - Cancels last bet
      - Broadcasts admin update
  - [`server.routes()`](server/routes.ts:4968):
    - `/api/admin/bets/:betId` DELETE:
      - Admin cancel bet, refund, broadcast.

If all items above hold, the live bet monitoring + admin bet editing flow will be stable, consistent, and aligned with the existing architecture without requiring new major changes.
