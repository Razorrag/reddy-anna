# Database Schema Column Reference

## Users Table
**Columns Available:**
- `id` (character varying) - Primary key
- `phone` (character varying) - Unique phone number
- `password_hash` (text)
- `full_name` (text) - Can be NULL
- `role` (user_role enum)
- `status` (user_status enum)
- `balance` (numeric)
- `total_winnings` (numeric)
- `total_losses` (numeric)
- `games_played` (integer)
- `games_won` (integer)
- `deposit_bonus_available` (numeric)
- `referral_bonus_available` (numeric)
- `created_at` (timestamp)
- `updated_at` (timestamp)

**Note:** There is NO `username` column. Use `COALESCE(full_name, phone)` for user identification.

## Game History Table
**Columns Available:**
- `id` (character varying) - Primary key
- `game_id` (character varying) - Unique
- `opening_card` (text)
- `winner` (user-defined enum: 'andar' | 'bahar')
- `winning_card` (text)
- `winning_round` (integer) - **NOT `round`**
- `total_cards` (integer)
- `total_bets` (numeric)
- `total_payouts` (numeric)
- `round_payouts` (jsonb)
- `created_at` (timestamp)

**Note:** Use `winning_round` NOT `round` when querying game_history.

## Deposit Bonuses Table
**Columns Available:**
- `id` (character varying) - Primary key
- `user_id` (character varying) - Foreign key to users
- `deposit_request_id` (character varying) - Foreign key to payment_requests
- `deposit_amount` (numeric)
- `bonus_amount` (numeric)
- `bonus_percentage` (numeric)
- `wagering_required` (numeric)
- `wagering_completed` (numeric)
- `wagering_progress` (numeric)
- `status` (character varying) - 'locked' | 'unlocked' | 'credited' | 'expired' | 'forfeited'
- `locked_at` (timestamp)
- `unlocked_at` (timestamp)
- `credited_at` (timestamp)
- `expired_at` (timestamp)
- `notes` (text)
- `created_at` (timestamp)
- `updated_at` (timestamp)

## Payment Requests Table
**Columns Available:**
- `id` (character varying) - Primary key
- `user_id` (character varying) - Foreign key to users
- `request_type` (user-defined enum) - 'deposit' | 'withdrawal'
- `amount` (numeric)
- `payment_method` (character varying)
- `utr_number` (character varying)
- `status` (user-defined enum) - 'pending' | 'approved' | 'rejected'
- `admin_id` (character varying) - Foreign key to admin_credentials
- `admin_notes` (text)
- `created_at` (timestamp)
- `updated_at` (timestamp)
- `processed_at` (timestamp)
- `payment_details` (text)
- `processed_by` (character varying)

## Game Sessions Table
**Columns Available:**
- `id` (character varying) - Primary key
- `game_id` (character varying) - Unique
- `opening_card` (text)
- `phase` (user-defined enum) - 'idle' | 'betting' | 'dealing' | 'complete'
- `status` (user-defined enum) - 'active' | 'completed' | 'cancelled'
- `current_timer` (integer)
- `current_round` (integer)
- `andar_cards` (text array)
- `bahar_cards` (text array)
- `winner` (user-defined enum) - 'andar' | 'bahar'
- `winning_card` (text)
- `winning_round` (integer)
- `total_andar_bets` (numeric)
- `total_bahar_bets` (numeric)
- `total_payouts` (numeric)
- `started_at` (timestamp)
- `created_at` (timestamp)
- `updated_at` (timestamp)

## Referral Bonuses Table
**Columns Available:**
- `id` (character varying) - Primary key
- `referrer_user_id` (character varying) - Foreign key to users
- `referred_user_id` (character varying) - Foreign key to users
- `referral_id` (character varying) - Foreign key to user_referrals
- `deposit_amount` (numeric)
- `bonus_amount` (numeric)
- `bonus_percentage` (numeric)
- `status` (character varying) - 'pending' | 'credited' | 'expired'
- `credited_at` (timestamp)
- `expired_at` (timestamp)
- `notes` (text)
- `created_at` (timestamp)
- `updated_at` (timestamp)

## Bonus Transactions Table
**Columns Available:**
- `id` (character varying) - Primary key
- `user_id` (character varying) - Foreign key to users
- `bonus_type` (character varying) - 'deposit_bonus' | 'referral_bonus' | 'conditional_bonus' | 'promotional_bonus'
- `bonus_source_id` (character varying)
- `amount` (numeric)
- `balance_before` (numeric)
- `balance_after` (numeric)
- `action` (character varying) - 'added' | 'locked' | 'unlocked' | 'credited' | 'expired' | 'forfeited' | 'wagering_progress'
- `description` (text)
- `metadata` (jsonb)
- `created_at` (timestamp)

