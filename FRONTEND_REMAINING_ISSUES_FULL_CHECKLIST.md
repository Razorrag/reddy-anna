# Frontend Remaining Issues – Deep, Implementation-Ready Checklist

Scope:
- Focus ONLY on what is NOT working or NOT fully wired in the frontend.
- Assume the core game mechanics, WebSocket logic, and most UI layouts are correct.
- No changes to existing game logic or stable flows.
- Goal: complete the remaining ~20%: correct data display, admin operations, mappings, and stale UI elements.

This document is structured by surface: Player, Profile, History, Bonus, Referral, Payments, Admin.

For each item:
- What exists (to confirm we do NOT rebuild it).
- What is broken/incomplete/misaligned.
- Exact actions needed on the frontend side.

---

## 1. Authentication and Session Usage

What exists:
- [`client/src/pages/login.tsx`](client/src/pages/login.tsx:12) uses `useAuth().login`, stores token, refreshToken, and redirects to `/game`.
- [`client/src/pages/signup.tsx`](client/src/pages/signup.tsx:12) registers, then logs in via `useAuth().login`, then redirects to `/game`.
- [`client/src/pages/player-game.tsx`](client/src/pages/player-game.tsx:31) reads from `useAuth`, shows loading until authenticated, and uses contexts properly.
- [`client/src/pages/Profile.tsx`](client/src/pages/Profile.tsx:43) requires `user` and uses `useUserProfile`, `useBalance`.

Issues / Not working (frontend):

1.1 Inconsistent route protection UX:
- Some protected pages only show a message when unauthenticated instead of redirecting.
- Example: [`Profile.tsx`](client/src/pages/Profile.tsx:317) shows “Please login to view your profile” but does not navigate.
- Risk: user can land on broken/stale screens via manual URL.

Actions:
- Add consistent route-guard behavior to all protected pages:
  - If no `user`:
    - Redirect to `/login` (for players) or `/admin/login` (for admin pages), or use `/unauthorized` where appropriate.
  - Do NOT change business logic; only improve redirects/guards.

1.2 Endpoint path inconsistencies:
- Login uses `/api/auth/login`.
- Signup uses `/auth/register`.
- Various pages use `/user/...`, `/api/user/...`, `/admin/...`, `/api/admin/...`.
- This is fragile: if backend final paths are standardized, some calls will silently fail → “empty” UIs.

Actions:
- Audit all apiClient/fetch calls and align with actual backend routes (once confirmed):
  - Only update request URLs and response mappings where there is a mismatch (no logic changes).
- Add minimal error UI where currently only `console.error` is used but UI stays blank.

---

## 2. Player Game History (Per-User) – Payout / Net Result

What exists:
- Profile "Game History" tab in [`Profile.tsx`](client/src/pages/Profile.tsx:1324) already DESIGNED to show:
  - `game.yourTotalBet`
  - `game.yourTotalPayout`
  - `game.yourNetProfit`
  - `game.result` (win/loss/none)
  - Winner, openingCard, etc.

Current bug (as reported):
- User sees only amount invested; winnings/payout not shown or always zero.

Root cause (frontend side):
- The UI is correct; the data fields `yourTotalPayout`, `yourNetProfit`, `result` are likely:
  - Not populated by `useUserProfile.fetchGameHistory`, or
  - Using different backend field names that are never mapped.

Actions:
- In `useUserProfile` (not displayed here, but exists):
  - Map backend fields to:
    - `yourTotalBet`
    - `yourTotalPayout`
    - `yourNetProfit`
    - `result`
  - If backend only returns:
    - `totalBet` and `payout`:
      - Compute on client:
        - `yourTotalBet = totalBet`
        - `yourTotalPayout = payout`
        - `yourNetProfit = payout - totalBet`
- No UI changes in [`Profile.tsx`](client/src/pages/Profile.tsx:1356); only fix context mapping so existing view starts showing correct payout and net.

---

## 3. Admin Game History (House Analytics) – Alignment

What exists:
- [`GameHistoryPage.tsx`](client/src/pages/GameHistoryPage.tsx:18) (Admin):
  - Calls `/api/admin/game-history` with advanced filters.
  - Handles multiple shapes:
    - `housePayout` vs `totalWinnings`
    - `profitLoss` vs `profit_loss`
  - Table and CSV export already compute:
    - Total Bets, Payout, Profit/Loss, %.

Issues (frontend):

3.1 If backend shape changes, page can fall back to empty:
- Some paths log warnings but do not show a clear UI error.
- Any missing `token` or 401 is only shown as generic “Failed to fetch game history”.

Actions:
- Keep logic as-is; only:
  - Improve/standardize error display (already partially there).
  - Confirm `/api/admin/game-history` path is correct; adjust if needed.
- No logic change to game computations.

---

## 4. Bonus System – Visibility and Admin Operations

Player-side:

What exists:
- Profile "Bonuses" tab in [`Profile.tsx`](client/src/pages/Profile.tsx:1438):
  - On tab:
    - Calls:
      - `/api/user/bonus-summary`
      - `/api/user/deposit-bonuses`
      - `/api/user/referral-bonuses`
      - `/api/user/bonus-transactions`
  - Uses:
    - `BonusOverviewCard`
    - `DepositBonusesList`
    - `ReferralBonusesList`
    - `BonusHistoryTimeline`
- Claim bonus uses `claimBonus()` from `useUserProfile`.

Issues:

4.1 If API responses differ from expected shape:
- Cards render 0 or blank; user thinks bonus is not tracked.

Actions:
- In `useUserProfile` and bonus components:
  - Map backend responses carefully:
    - Support both `data` wrapping and flat arrays.
    - Fallback gracefully without breaking UI.
- Do not modify bonus math; only ensure displayed numbers use correct fields.

Admin-side:

What exists:
- [`admin-bonus.tsx`](client/src/pages/admin-bonus.tsx:85):
  - Tabs:
    - Overview (totals, settings)
    - Bonus Transactions
    - Referrals
    - Player Analytics
  - Calls:
    - `/admin/bonus-transactions`
    - `/admin/referral-data`
    - `/admin/bonus-settings`
    - `/admin/player-bonus-analytics`

Critical broken parts:

4.2 Action buttons without backend wiring:
- "Apply Bonus", "Reject", "Process Bonus", "View Details":
  - Currently only UI; no `apiClient.post/put` calls.
  - Admin cannot actually:
    - Approve pending bonuses.
    - Reject invalid ones.
    - Trigger referral bonus application.

4.3 Duplicate/competing configuration:
- Bonus settings exist here (AdminBonus) AND in [`backend-settings.tsx`](client/src/pages/backend-settings.tsx:22).
- Risk of inconsistent values shown to players vs admin.

Actions:
- Implement API calls for:
  - Apply Bonus:
    - e.g. `POST /admin/bonus-transactions/:id/apply`
  - Reject Bonus:
    - e.g. `POST /admin/bonus-transactions/:id/reject`
  - Process Referral Bonus:
    - e.g. `POST /admin/referrals/:id/process`
  - Then refetch affected lists.
- Make sure AdminBonus and BackendSettings read/write from a single canonical endpoint:
  - If `/admin/game-settings` is the source, map fields accordingly.
- No change to existing display logic; only wire the operations so they actually work.

---

## 5. Referral Tracking – Player vs Admin Consistency

Player-side:

What exists:
- Profile "Referral" tab in [`Profile.tsx`](client/src/pages/Profile.tsx:1483):
  - Shows:
    - Referral code (from profile or fallback).
    - Referral stats from `profileState.referralData`.
    - Referred users list with earnings and status.

Admin-side:

What exists:
- Admin Bonus "Referrals" tab in [`admin-bonus.tsx`](client/src/pages/admin-bonus.tsx:630):
  - Shows:
    - `referrerUsername` → `referredUsername`
    - depositAmount, bonusAmount, status, timestamps.

Issues:

5.1 Schema alignment:
- If `useUserProfile.fetchReferralData` does not consume the same backend shape as `/admin/referral-data`, player tab may show:
  - Zero referrals.
  - Missing earnings.

5.2 No wired control to finalize referral bonuses:
- Admin sees pending referrals, but "Process Bonus" does not trigger status change or credit.

Actions:
- Align frontend mapping:
  - Ensure player referral data is derived from the same underlying API structure as admin.
- Wire:
  - "Process Bonus" or equivalent admin action to actual endpoint, followed by refresh.
- Result:
  - Player sees correct referral earnings and referred users, matching admin view.

---

## 6. Payments, Wallet, and WhatsApp Flows

What exists:
- Profile "Transactions" tab in [`Profile.tsx`](client/src/pages/Profile.tsx:490):
  - Deposit and Withdraw forms integrated.
  - Uses `/payment-requests` endpoints.
  - Auto-opens WhatsApp with prefilled messages to admin.
  - List and filter of payment requests with status and amounts.

Issues:

6.1 Hard-coded / scattered WhatsApp numbers:
- Some components:
  - Use `VITE_ADMIN_WHATSAPP`.
  - Others use hard-coded fallback numbers (e.g. `918686886632`).
- Leads to inconsistencies if admin changes number.

6.2 Endpoint robustness:
- If `/payment-requests` or payload shape does not exactly match backend, UI partially works or shows nothing.
- Errors are logged but sometimes not surfaced clearly.

Actions:
- Centralize WhatsApp number:
  - Use:
    - Either a single config (`/admin/whatsapp-settings`) and load it once,
    - Or a single env var, but not mixed.
- Confirm `/payment-requests` endpoints and:
  - Adjust field names mapping in Profile page.
- Keep current UX; only fix data source and consistency.

---

## 7. Admin Configuration Surfaces

### 7.1 Backend Settings (`backend-settings.tsx`)

What exists:
- Uses `/admin/game-settings` to manage:
  - minBet, maxBet
  - bettingTimerDuration
  - depositBonusPercent, referralBonusPercent
  - conditionalBonusThreshold
  - maintenanceMode, maintenanceMessage

Issues:

7.1.1 Import style mismatch:
- Uses `import apiClient from "@/lib/api-client";` (default) while other files use named `apiClient`.
- If `api-client` is exported as named only, this page silently fails → no settings load/save.

7.1.2 Overlap with Admin Bonus settings:
- Same type of fields exist in [`admin-bonus.tsx`](client/src/pages/admin-bonus.tsx:395), risking divergence.

Actions:
- Fix import to match actual `api-client` export.
- Ensure only one canonical place writes bonus-related config:
  - Others should read from it or show read-only views.

### 7.2 User Admin (`user-admin.tsx`)

What exists:
- Full user management:
  - Fetch users.
  - Update balance.
  - Update status (active/suspended/banned).
  - Reset password.
  - Create user.

Issues:

7.2.1 Dependent fields:
- Expects `AdminUser` to include:
  - `totalWinnings`, `totalLosses`, `gamesPlayed`, `gamesWon`, etc.
- If backend does not send these:
  - UI shows zeros, which is misleading (stale).

Actions:
- Add defensive rendering:
  - If these fields are missing:
    - Show `N/A` instead of `0`.
- No logic or behavior change; only safer display.

---

## 8. Stale / Partial / Cosmetic-but-Confusing Elements

Issues:

8.1 Action-only UI with no logic:
- Examples:
  - Admin Bonus: Apply/Reject/Process buttons.
  - Admin Analytics: "Export Report" button.
- Today: visually promise functionality that doesn’t exist, confusing operators.

8.2 Mixed configuration:
- Bonus, WhatsApp, and some game parameters configured in multiple places or partially from env.

8.3 Error handling:
- Several pages rely on `console.error` without clear on-screen failure messages, which looks like “no data” instead of “broken”.

Actions:
- For each visible admin control:
  - Either:
    - Wire to real backend endpoint (preferred), or
    - Disable with tooltip “Pending backend implementation” to avoid false expectation.
- Normalize configuration access:
  - WhatsApp:
    - Read from one source and reuse.
  - Bonus and limits:
    - Show values from canonical `game-settings` or equivalent.

---

## 9. Summary – Minimal, High-Impact Tasks (Frontend Only)

This is the prioritized punch list of ONLY not-working/incomplete pieces:

1) Game History (Player):
- Map backend fields in `useUserProfile` so Profile Game History shows:
  - Bet, payout, and net result.
- No UI redesign; only field mapping/fallbacks.

2) Bonus Actions (Admin):
- Wire Admin Bonus page buttons to real APIs.
- Ensure bonus-related configs are consistent with Backend Settings.
- Make player bonus tab read those results correctly.

3) Referral Sync:
- Align player referral data with admin referral data.
- Implement “Process Referral Bonus” actions so statuses and earnings match.

4) Payments and WhatsApp:
- Replace scattered hard-coded WhatsApp numbers with a single configurable source.
- Confirm `/payment-requests` payload/fields; adapt mappings where needed.

5) Admin Settings:
- Fix `apiClient` import in Backend Settings.
- Ensure only one canonical configuration drives:
  - min/max bet, timer, bonus percentages.

6) Defensive Display:
- In User Admin and analytics views:
  - Show `N/A` when stats fields are missing instead of misleading zeros.

7) Stale UI:
- For all buttons/links suggesting advanced actions (export, process, apply) that are not wired:
  - Either implement the API calls or explicitly disable them with a clear label.

Completing these items will:
- Make all existing screens truthful (no fake or missing data).
- Preserve your working game logic and flows.
- Turn the current 80% into a production-grade, fully wired frontend without unnecessary rewrites.