-- ============================================
-- MIGRATION: Add per-round payout tracking to game_history
-- ============================================
-- Purpose: Store payout breakdown by round and side for game history display
-- Impact: Enables card history circles to show correct payout amounts
-- Date: 2024-11-08
-- ============================================

BEGIN;

-- Step 1: Add JSONB column for round payouts
ALTER TABLE game_history 
ADD COLUMN IF NOT EXISTS round_payouts JSONB DEFAULT '{
  "round1": {"andar": 0, "bahar": 0},
  "round2": {"andar": 0, "bahar": 0}
}'::jsonb;

-- Step 2: Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_game_history_round_payouts 
ON game_history USING GIN (round_payouts);

-- Step 3: Add comment for documentation
COMMENT ON COLUMN game_history.round_payouts IS 
'Per-round payout breakdown. Format: {"round1": {"andar": 1000, "bahar": 0}, "round2": {"andar": 500, "bahar": 2000}}. Calculated from player_bets.actual_payout grouped by round and side.';

-- Step 4: Backfill existing data (calculate from player_bets)
UPDATE game_history gh
SET round_payouts = (
  SELECT jsonb_build_object(
    'round1', jsonb_build_object(
      'andar', COALESCE(SUM(CASE WHEN pb.round = '1' AND pb.side = 'andar' THEN pb.actual_payout ELSE 0 END), 0),
      'bahar', COALESCE(SUM(CASE WHEN pb.round = '1' AND pb.side = 'bahar' THEN pb.actual_payout ELSE 0 END), 0)
    ),
    'round2', jsonb_build_object(
      'andar', COALESCE(SUM(CASE WHEN pb.round = '2' AND pb.side = 'andar' THEN pb.actual_payout ELSE 0 END), 0),
      'bahar', COALESCE(SUM(CASE WHEN pb.round = '2' AND pb.side = 'bahar' THEN pb.actual_payout ELSE 0 END), 0)
    )
  )
  FROM player_bets pb
  WHERE pb.game_id = gh.game_id
  GROUP BY pb.game_id
)
WHERE round_payouts IS NULL OR round_payouts = '{}'::jsonb;

-- Step 5: Verify migration
SELECT 
  'Migration Complete' as status,
  COUNT(*) as total_games,
  COUNT(CASE WHEN round_payouts IS NOT NULL THEN 1 END) as games_with_payouts,
  SUM((round_payouts->'round1'->>'andar')::numeric) as total_round1_andar_payouts,
  SUM((round_payouts->'round1'->>'bahar')::numeric) as total_round1_bahar_payouts,
  SUM((round_payouts->'round2'->>'andar')::numeric) as total_round2_andar_payouts,
  SUM((round_payouts->'round2'->>'bahar')::numeric) as total_round2_bahar_payouts
FROM game_history;

COMMIT;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Query 1: Check sample game with round payouts
SELECT 
  game_id,
  winner,
  winning_round,
  total_payouts,
  round_payouts,
  (round_payouts->'round1'->>'andar')::numeric as r1_andar,
  (round_payouts->'round1'->>'bahar')::numeric as r1_bahar,
  (round_payouts->'round2'->>'andar')::numeric as r2_andar,
  (round_payouts->'round2'->>'bahar')::numeric as r2_bahar
FROM game_history
ORDER BY created_at DESC
LIMIT 5;

-- Query 2: Verify totals match
SELECT 
  gh.game_id,
  gh.total_payouts as history_total,
  COALESCE(SUM(pb.actual_payout), 0) as bets_total,
  (
    (gh.round_payouts->'round1'->>'andar')::numeric +
    (gh.round_payouts->'round1'->>'bahar')::numeric +
    (gh.round_payouts->'round2'->>'andar')::numeric +
    (gh.round_payouts->'round2'->>'bahar')::numeric
  ) as round_payouts_total,
  CASE 
    WHEN ABS(gh.total_payouts - COALESCE(SUM(pb.actual_payout), 0)) < 0.01 THEN '✅ Match'
    ELSE '❌ Mismatch'
  END as validation
FROM game_history gh
LEFT JOIN player_bets pb ON pb.game_id = gh.game_id
GROUP BY gh.game_id, gh.total_payouts, gh.round_payouts, gh.created_at
ORDER BY gh.created_at DESC
LIMIT 10;

-- Query 3: Check for games with missing round_payouts
SELECT 
  COUNT(*) as games_missing_payouts,
  MIN(created_at) as oldest_missing,
  MAX(created_at) as newest_missing
FROM game_history
WHERE round_payouts IS NULL OR round_payouts = '{}'::jsonb;

-- Query 4: Summary statistics
SELECT 
  'Summary Statistics' as report_type,
  COUNT(DISTINCT game_id) as total_games,
  SUM(total_payouts) as total_payouts_all_games,
  SUM((round_payouts->'round1'->>'andar')::numeric + 
      (round_payouts->'round1'->>'bahar')::numeric +
      (round_payouts->'round2'->>'andar')::numeric +
      (round_payouts->'round2'->>'bahar')::numeric) as total_from_round_payouts,
  CASE 
    WHEN ABS(SUM(total_payouts) - SUM((round_payouts->'round1'->>'andar')::numeric + 
                                       (round_payouts->'round1'->>'bahar')::numeric +
                                       (round_payouts->'round2'->>'andar')::numeric +
                                       (round_payouts->'round2'->>'bahar')::numeric)) < 1.00 
    THEN '✅ Totals Match'
    ELSE '⚠️ Totals Mismatch'
  END as validation_status
FROM game_history;

-- ============================================
-- ROLLBACK SCRIPT (if needed)
-- ============================================
-- Uncomment and run if you need to rollback this migration:
--
-- BEGIN;
-- ALTER TABLE game_history DROP COLUMN IF EXISTS round_payouts;
-- DROP INDEX IF EXISTS idx_game_history_round_payouts;
-- COMMIT;
