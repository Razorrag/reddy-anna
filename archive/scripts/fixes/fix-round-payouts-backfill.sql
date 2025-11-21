-- ============================================
-- FIX: Backfill round_payouts from existing data
-- ============================================
-- This script fixes the backfill when actual_payout is 0 or NULL
-- It calculates payouts based on bet amounts and game winner
-- ============================================

BEGIN;

-- Step 1: Check current state
SELECT 
  'Before Fix' as status,
  COUNT(*) as total_games,
  COUNT(CASE WHEN round_payouts IS NOT NULL AND round_payouts != '{"round1": {"andar": 0, "bahar": 0}, "round2": {"andar": 0, "bahar": 0}}'::jsonb THEN 1 END) as games_with_real_payouts,
  SUM(total_payouts) as total_payouts_in_history
FROM game_history;

-- Step 2: Check player_bets actual_payout values
SELECT 
  'Player Bets Status' as info,
  COUNT(*) as total_bets,
  COUNT(CASE WHEN actual_payout IS NULL THEN 1 END) as null_payouts,
  COUNT(CASE WHEN actual_payout = 0 THEN 1 END) as zero_payouts,
  COUNT(CASE WHEN actual_payout > 0 THEN 1 END) as positive_payouts,
  SUM(actual_payout) as total_actual_payouts
FROM player_bets;

-- Step 3: If actual_payout is populated, use it
UPDATE game_history gh
SET round_payouts = (
  SELECT jsonb_build_object(
    'round1', jsonb_build_object(
      'andar', COALESCE(SUM(CASE WHEN pb.round = '1' AND pb.side = 'andar' AND pb.actual_payout > 0 THEN pb.actual_payout ELSE 0 END), 0),
      'bahar', COALESCE(SUM(CASE WHEN pb.round = '1' AND pb.side = 'bahar' AND pb.actual_payout > 0 THEN pb.actual_payout ELSE 0 END), 0)
    ),
    'round2', jsonb_build_object(
      'andar', COALESCE(SUM(CASE WHEN pb.round = '2' AND pb.side = 'andar' AND pb.actual_payout > 0 THEN pb.actual_payout ELSE 0 END), 0),
      'bahar', COALESCE(SUM(CASE WHEN pb.round = '2' AND pb.side = 'bahar' AND pb.actual_payout > 0 THEN pb.actual_payout ELSE 0 END), 0)
    )
  )
  FROM player_bets pb
  WHERE pb.game_id = gh.game_id
  GROUP BY pb.game_id
)
WHERE EXISTS (
  SELECT 1 FROM player_bets pb 
  WHERE pb.game_id = gh.game_id 
  AND pb.actual_payout > 0
);

-- Step 4: For games where actual_payout is 0/NULL, calculate from total_payouts
-- This assumes the winner side gets all the payouts
UPDATE game_history gh
SET round_payouts = CASE
  -- If winner is andar and won in round 1
  WHEN gh.winner = 'andar' AND gh.winning_round = 1 THEN
    jsonb_build_object(
      'round1', jsonb_build_object('andar', gh.total_payouts, 'bahar', 0),
      'round2', jsonb_build_object('andar', 0, 'bahar', 0)
    )
  -- If winner is bahar and won in round 1
  WHEN gh.winner = 'bahar' AND gh.winning_round = 1 THEN
    jsonb_build_object(
      'round1', jsonb_build_object('andar', 0, 'bahar', gh.total_payouts),
      'round2', jsonb_build_object('andar', 0, 'bahar', 0)
    )
  -- If winner is andar and won in round 2
  WHEN gh.winner = 'andar' AND gh.winning_round = 2 THEN
    jsonb_build_object(
      'round1', jsonb_build_object('andar', 0, 'bahar', 0),
      'round2', jsonb_build_object('andar', gh.total_payouts, 'bahar', 0)
    )
  -- If winner is bahar and won in round 2
  WHEN gh.winner = 'bahar' AND gh.winning_round = 2 THEN
    jsonb_build_object(
      'round1', jsonb_build_object('andar', 0, 'bahar', 0),
      'round2', jsonb_build_object('andar', 0, 'bahar', gh.total_payouts)
    )
  ELSE
    -- Fallback: empty payouts
    '{"round1": {"andar": 0, "bahar": 0}, "round2": {"andar": 0, "bahar": 0}}'::jsonb
END
WHERE gh.total_payouts > 0
AND (
  gh.round_payouts IS NULL 
  OR gh.round_payouts = '{"round1": {"andar": 0, "bahar": 0}, "round2": {"andar": 0, "bahar": 0}}'::jsonb
);

-- Step 5: Verify the fix
SELECT 
  'After Fix' as status,
  COUNT(*) as total_games,
  COUNT(CASE WHEN round_payouts IS NOT NULL AND round_payouts != '{"round1": {"andar": 0, "bahar": 0}, "round2": {"andar": 0, "bahar": 0}}'::jsonb THEN 1 END) as games_with_real_payouts,
  SUM((round_payouts->'round1'->>'andar')::numeric) as total_round1_andar,
  SUM((round_payouts->'round1'->>'bahar')::numeric) as total_round1_bahar,
  SUM((round_payouts->'round2'->>'andar')::numeric) as total_round2_andar,
  SUM((round_payouts->'round2'->>'bahar')::numeric) as total_round2_bahar,
  SUM(
    (round_payouts->'round1'->>'andar')::numeric +
    (round_payouts->'round1'->>'bahar')::numeric +
    (round_payouts->'round2'->>'andar')::numeric +
    (round_payouts->'round2'->>'bahar')::numeric
  ) as total_from_round_payouts,
  SUM(total_payouts) as total_payouts_in_history
FROM game_history;

-- Step 6: Show sample games
SELECT 
  game_id,
  winner,
  winning_round,
  total_payouts,
  (round_payouts->'round1'->>'andar')::numeric as r1_andar,
  (round_payouts->'round1'->>'bahar')::numeric as r1_bahar,
  (round_payouts->'round2'->>'andar')::numeric as r2_andar,
  (round_payouts->'round2'->>'bahar')::numeric as r2_bahar,
  (
    (round_payouts->'round1'->>'andar')::numeric +
    (round_payouts->'round1'->>'bahar')::numeric +
    (round_payouts->'round2'->>'andar')::numeric +
    (round_payouts->'round2'->>'bahar')::numeric
  ) as calculated_total,
  CASE 
    WHEN ABS(total_payouts - (
      (round_payouts->'round1'->>'andar')::numeric +
      (round_payouts->'round1'->>'bahar')::numeric +
      (round_payouts->'round2'->>'andar')::numeric +
      (round_payouts->'round2'->>'bahar')::numeric
    )) < 0.01 THEN '✅ Match'
    ELSE '❌ Mismatch'
  END as validation
FROM game_history
ORDER BY created_at DESC
LIMIT 10;

COMMIT;

-- ============================================
-- FINAL VALIDATION
-- ============================================

SELECT 
  'Final Validation' as report_type,
  COUNT(*) as total_games,
  SUM(total_payouts) as total_payouts_all_games,
  SUM(
    (round_payouts->'round1'->>'andar')::numeric +
    (round_payouts->'round1'->>'bahar')::numeric +
    (round_payouts->'round2'->>'andar')::numeric +
    (round_payouts->'round2'->>'bahar')::numeric
  ) as total_from_round_payouts,
  CASE 
    WHEN ABS(SUM(total_payouts) - SUM(
      (round_payouts->'round1'->>'andar')::numeric +
      (round_payouts->'round1'->>'bahar')::numeric +
      (round_payouts->'round2'->>'andar')::numeric +
      (round_payouts->'round2'->>'bahar')::numeric
    )) < 1.00 
    THEN '✅ Totals Match'
    ELSE '⚠️ Totals Mismatch'
  END as validation_status
FROM game_history;
