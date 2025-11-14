## Decision
Start with backend core logic. It defines the single source of truth for bonuses and drives the player/admin UI via stable endpoints.

## Goals
- Per‑deposit bonus tracking with individual lower/upper thresholds
- Automatic credit when wallet crosses thresholds; no manual claim path
- Referral bonus credited only when a deposit bonus is actually credited
- Unified bonus history/summary endpoints for player/admin
- Remove legacy bonus drivers (`deposit_bonus_available`, `referral_bonus_available`, manual claim)

## Database
- Use existing tables: `deposit_bonuses`, `referral_bonuses`, `bonus_transactions`, `user_referrals`.
- Optional add to `deposit_bonuses`: `lower_threshold_balance`, `upper_threshold_balance` precomputed.
- Settings keys: `default_deposit_bonus_percent`, `referral_bonus_percent`, `conditional_bonus_threshold`, `min_deposit_for_referral`, `max_referrals_per_month`.

## Storage (server/storage-supabase.ts)
### Approve Deposit
- Edit `approvePaymentRequestAtomic(requestId, userId, amount, adminId)` at server/storage-supabase.ts:4555–4670:
  - Approve and add `amount` to wallet only.
  - Compute `bonusAmount`, `T = conditional_bonus_threshold`.
  - Compute thresholds: `lower = amount * (1 - T)`, `upper = amount * (1 + T)`.
  - Insert `deposit_bonuses` row with `status='pending'`, store thresholds.
  - Log `bonus_transactions` with `action='added'`, `bonus_type='deposit_bonus'`.
  - If first approved deposit and referral code exists: insert `user_referrals` (link referrer↔referred).
  - Do not credit any bonus here; do not run legacy referral bonus here.

### Threshold Engine
- Add `checkBonusThresholds(userId)` near conditional/wagering helpers (co‑locate with `applyConditionalBonus` at ~3346):
  - Fetch all pending `deposit_bonuses` for `userId`.
  - Read current wallet `W`.
  - For each bonus `B` with `(lower, upper)`: if `W <= lower` OR `W >= upper`:
    - Credit `B.bonus_amount` to `users.balance`.
    - Update `deposit_bonuses.status='credited'`, set `credited_at`.
    - Log `bonus_transactions` for user: `bonus_type='deposit_bonus'`, `action='credited'`, with `balanceBefore/After`.
    - Call `handleReferralForBonus(B.id)`.

### Referral on Bonus Credit
- Add `handleReferralForBonus(depositBonusId)`:
  - Resolve `referred_user_id` from `deposit_bonuses.user_id`.
  - Look up referrer via `user_referrals`.
  - Compute `R = B.bonus_amount * referral_bonus_percent / 100`.
  - If `R > 0`: insert `referral_bonuses` (status `credited`), add `R` to referrer’s wallet, log `bonus_transactions` (`bonus_type='referral_bonus'`, `action='credited'`).

### Balance Change Hook
- Instrument wallet mutations to trigger thresholds:
  - After `addBalanceAtomic(userId, amount)` at server/storage-supabase.ts:993–1069 and `deductBalanceAtomic(userId, amount)`, call `checkBonusThresholds(userId)`.
  - Guard against recursion when the change originates from bonus credit (e.g., a flag parameter or transaction reason check).
  - Also call after bet payouts and withdrawals (wherever balance changes are applied). See call sites in server/socket/game-handlers.ts:195–205.

### Remove/Simplify Legacy Paths
- Deprecate manual claim flows:
  - `claimBonus(userId)` at server/storage-supabase.ts:5674–5722 → return a 410/disabled response; keep for backward compatibility for a short period.
  - `applyAvailableBonus(userId)` and `checkAndAutoCreditBonus(userId)` in server/payment.ts:291–531, 414–475 → no‑op or remove.
- Stop using legacy user bonus buckets:
  - Do not update `deposit_bonus_available`, `referral_bonus_available`, `original_deposit_amount`, `bonus_locked`.
  - Keep fields in schema but exclude from logic.
- Wagering unlock (`checkAndUnlockBonus`) remains for any wagering‑related mechanics, but should not credit deposit bonuses outside the per‑deposit rules.

## Routes & Controllers
- Keep and align endpoints:
  - `GET /api/user/bonus-summary` → build from `deposit_bonuses`, `referral_bonuses` (totals: pending vs credited, lifetime).
  - `GET /api/user/bonus-transactions` → paginate `bonus_transactions` timeline.
  - `GET /api/user/deposit-bonuses` → status/progress list.
  - `GET /api/user/referral-bonuses` → status list.
  - `GET /api/user/referral-data` → from `user_referrals` + `referral_bonuses`.
- Remove `POST /api/user/claim-bonus` from server/routes.ts and controllers; client no longer invokes it.
- Admin:
  - `GET/PUT /api/admin/bonus-settings` → map to `default_deposit_bonus_percent`, `referral_bonus_percent`, `conditional_bonus_threshold`.
  - `GET /api/admin/bonus-transactions`, `GET /api/admin/referral-data`, `GET /api/admin/users/:userId/bonus-history` → ensure data derives only from the new tables.

## Events & Notifications
- On deposit bonus credit and on referral bonus credit:
  - Emit `bonus_update` to the affected user/referrer (existing WS channel).
  - Update any in‑memory caches used by contexts.

## Frontend Alignment (next phase)
- Profile (`client/src/pages/profile.tsx`):
  - Remove manual claim UI; rely on auto credit and summary.
  - Show pending totals and credited lifetime using `/api/user/bonus-summary`.
  - Keep history/lists consuming `/api/user/bonus-transactions`, `/deposit-bonuses`, `/referral-bonuses`.
- Contexts:
  - Remove `claimBonus()` and legacy `bonusInfo.bonusLocked` usage; derive chips from `bonusSummary.totals`.
- Admin (`client/src/pages/admin-bonus.tsx`):
  - Ensure settings keys align; no claim/apply actions for bonuses (only transactions/analytics views).

## Analytics
- Player totals: pending vs credited (deposit/referral), lifetime credited.
- Referral analytics: per referrer totals, counts, earnings by referred user and credited timestamps.
- Admin bonus transactions: filter by `bonus_type` and `action`.

## Edge Cases & Tests
- Multiple pending bonuses; verify crossing thresholds credits the correct subset.
- Rapid balance oscillation; idempotent crediting with proper row locking.
- First deposit referral linking vs subsequent deposits.
- Referral bonus computed only off credited deposit bonuses.
- Concurrency: ensure atomic updates and consistent `balanceBefore/After` logging.
- Unit/integration tests for threshold credit and referral propagation.

## Rollout
- Deploy backend changes first; leave claim endpoint returning 410 for a week, then remove.
- Migrate existing pending bonuses into `deposit_bonuses` with thresholds precomputed.
- Monitor `bonus_update` events and admin analytics to verify credits/referrals.

## Code References To Touch
- Approvals: server/storage-supabase.ts:4555–4670
- Balance ops: server/storage-supabase.ts:993–1069 (and `deductBalanceAtomic` nearby)
- Conditional legacy: server/storage-supabase.ts:3346–3519
- Claim legacy: server/storage-supabase.ts:5674–5722
- Routes: server/routes.ts (bonus endpoints block)
- Game balance changes: server/socket/game-handlers.ts:195–205

If you confirm, I’ll implement the backend changes file‑by‑file and then align the player/admin UI to the new endpoints and data shapes.