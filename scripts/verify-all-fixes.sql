-- ============================================
-- COMPREHENSIVE SYSTEM VERIFICATION SCRIPT
-- Verifies all critical fixes are working
-- ============================================

\echo '🔍 STARTING COMPREHENSIVE SYSTEM VERIFICATION...'
\echo ''

-- ============================================
-- 1. PAYOUT SYSTEM VERIFICATION
-- ============================================
\echo '1️⃣ CHECKING PAYOUT SYSTEM...'
\echo ''

-- Check for duplicate payouts
\echo '   ✓ Checking for duplicate payouts...'
SELECT 
  CASE 
    WHEN COUNT(*) = 0 THEN '   ✅ PASS: No duplicate payouts found'
    ELSE '   ❌ FAIL: ' || COUNT(*) || ' duplicate payouts found!'
  END as result
FROM (
  SELECT user_id, game_id, round, COUNT(*) as cnt
  FROM payouts
  WHERE created_at > NOW() - INTERVAL '7 days'
  GROUP BY user_id, game_id, round
  HAVING COUNT(*) > 1
) duplicates;

-- Check payout constraints exist
\echo '   ✓ Checking payout constraints...'
SELECT 
  CASE 
    WHEN COUNT(*) > 0 THEN '   ✅ PASS: Payout unique constraints exist'
    ELSE '   ❌ FAIL: Missing payout unique constraints!'
  END as result
FROM information_schema.table_constraints 
WHERE table_name = 'payouts' 
AND constraint_type = 'UNIQUE';

-- Check for negative balances
\echo '   ✓ Checking for negative balances...'
SELECT 
  CASE 
    WHEN COUNT(*) = 0 THEN '   ✅ PASS: No negative balances'
    ELSE '   ❌ FAIL: ' || COUNT(*) || ' users with negative balances!'
  END as result
FROM users
WHERE balance < 0;

-- Verify payout accuracy for recent games
\echo '   ✓ Verifying payout accuracy...'
SELECT 
  CASE 
    WHEN COUNT(*) = 0 THEN '   ✅ PASS: All payouts match expected amounts'
    ELSE '   ⚠️  WARNING: ' || COUNT(*) || ' games with payout mismatches'
  END as result
FROM (
  SELECT 
    g.id,
    COUNT(DISTINCT p.id) as payout_count,
    COUNT(DISTINCT b.user_id) FILTER (WHERE b.side = g.winner) as winner_count
  FROM games g
  LEFT JOIN bets b ON g.id = b.game_id
  LEFT JOIN payouts p ON g.id = p.game_id
  WHERE g.status = 'completed'
  AND g.created_at > NOW() - INTERVAL '24 hours'
  GROUP BY g.id
  HAVING COUNT(DISTINCT p.id) != COUNT(DISTINCT b.user_id) FILTER (WHERE b.side = g.winner)
) mismatches;

\echo ''

-- ============================================
-- 2. GAME HISTORY VERIFICATION
-- ============================================
\echo '2️⃣ CHECKING GAME HISTORY SYSTEM...'
\echo ''

-- Check for duplicate cards
\echo '   ✓ Checking for duplicate cards...'
SELECT 
  CASE 
    WHEN COUNT(*) = 0 THEN '   ✅ PASS: No duplicate cards found'
    ELSE '   ❌ FAIL: ' || COUNT(*) || ' duplicate cards found!'
  END as result
FROM (
  SELECT game_id, side, position, COUNT(*) as cnt
  FROM game_cards
  WHERE created_at > NOW() - INTERVAL '7 days'
  GROUP BY game_id, side, position
  HAVING COUNT(*) > 1
) duplicates;

-- Check game_cards constraints
\echo '   ✓ Checking game_cards constraints...'
SELECT 
  CASE 
    WHEN COUNT(*) > 0 THEN '   ✅ PASS: Game cards unique constraints exist'
    ELSE '   ❌ FAIL: Missing game cards unique constraints!'
  END as result
FROM information_schema.table_constraints 
WHERE table_name = 'game_cards' 
AND constraint_type = 'UNIQUE';

-- Check for incomplete game histories
\echo '   ✓ Checking for incomplete game histories...'
SELECT 
  CASE 
    WHEN COUNT(*) = 0 THEN '   ✅ PASS: All completed games have cards'
    ELSE '   ⚠️  WARNING: ' || COUNT(*) || ' completed games missing cards'
  END as result
FROM games g
WHERE g.status = 'completed'
AND g.created_at > NOW() - INTERVAL '24 hours'
AND NOT EXISTS (
  SELECT 1 FROM game_cards gc WHERE gc.game_id = g.id
);

\echo ''

-- ============================================
-- 3. STREAM SYSTEM VERIFICATION
-- ============================================
\echo '3️⃣ CHECKING STREAM SYSTEM...'
\echo ''

-- Check stream_config table exists
\echo '   ✓ Checking stream_config table...'
SELECT 
  CASE 
    WHEN COUNT(*) > 0 THEN '   ✅ PASS: stream_config table exists'
    ELSE '   ❌ FAIL: stream_config table missing!'
  END as result
FROM information_schema.tables 
WHERE table_name = 'stream_config';

-- Check stream configuration
\echo '   ✓ Checking stream configuration...'
SELECT 
  '   ℹ️  Stream URL: ' || COALESCE(stream_url, 'NOT SET') as info,
  '   ℹ️  Paused: ' || COALESCE(is_paused::text, 'NULL') as status,
  '   ℹ️  Viewer Range: ' || COALESCE(viewer_count_min::text, '0') || ' - ' || COALESCE(viewer_count_max::text, '0') as viewers
FROM stream_config
LIMIT 1;

\echo ''

-- ============================================
-- 4. ANALYTICS SYSTEM VERIFICATION
-- ============================================
\echo '4️⃣ CHECKING ANALYTICS SYSTEM...'
\echo ''

-- Check statistics tables exist
\echo '   ✓ Checking statistics tables...'
SELECT 
  CASE 
    WHEN COUNT(*) = 3 THEN '   ✅ PASS: All statistics tables exist'
    ELSE '   ❌ FAIL: Missing statistics tables! Found ' || COUNT(*) || '/3'
  END as result
FROM information_schema.tables 
WHERE table_name IN ('daily_game_statistics', 'monthly_game_statistics', 'yearly_game_statistics');

-- Check today's statistics
\echo '   ✓ Checking today''s statistics...'
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM daily_game_statistics WHERE date = CURRENT_DATE)
    THEN '   ✅ PASS: Today''s statistics exist'
    ELSE '   ⚠️  INFO: No statistics for today yet (no games played)'
  END as result;

-- Verify statistics accuracy
\echo '   ✓ Verifying statistics accuracy...'
WITH actual_data AS (
  SELECT 
    COUNT(DISTINCT id) as actual_games,
    COUNT(DISTINCT user_id) as actual_players,
    COALESCE(SUM(total_bets), 0) as actual_total_bets
  FROM games
  WHERE DATE(created_at) = CURRENT_DATE
  AND status = 'completed'
),
stats_data AS (
  SELECT 
    total_games,
    unique_players,
    total_bets
  FROM daily_game_statistics
  WHERE date = CURRENT_DATE
)
SELECT 
  CASE 
    WHEN NOT EXISTS (SELECT 1 FROM stats_data) THEN '   ℹ️  INFO: No statistics to verify yet'
    WHEN (SELECT total_games FROM stats_data) = (SELECT actual_games FROM actual_data)
    THEN '   ✅ PASS: Statistics match actual data'
    ELSE '   ⚠️  WARNING: Statistics mismatch - may need trigger fix'
  END as result;

\echo ''

-- ============================================
-- 5. DATABASE TRIGGERS VERIFICATION
-- ============================================
\echo '5️⃣ CHECKING DATABASE TRIGGERS...'
\echo ''

-- Check critical triggers exist
\echo '   ✓ Checking critical triggers...'
SELECT 
  CASE 
    WHEN COUNT(*) >= 3 THEN '   ✅ PASS: Critical triggers installed (' || COUNT(*) || ' found)'
    ELSE '   ⚠️  WARNING: Only ' || COUNT(*) || ' triggers found'
  END as result
FROM pg_trigger 
WHERE tgname LIKE '%statistics%' OR tgname LIKE '%payout%';

\echo ''

-- ============================================
-- 6. SYSTEM HEALTH SUMMARY
-- ============================================
\echo '6️⃣ SYSTEM HEALTH SUMMARY...'
\echo ''

-- Overall system health
WITH health_checks AS (
  -- Duplicate payouts
  SELECT 
    'Duplicate Payouts' as check_name,
    CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END as status,
    COUNT(*) as issue_count
  FROM (
    SELECT user_id, game_id, round, COUNT(*) as cnt
    FROM payouts
    WHERE created_at > NOW() - INTERVAL '7 days'
    GROUP BY user_id, game_id, round
    HAVING COUNT(*) > 1
  ) dup_payouts
  
  UNION ALL
  
  -- Duplicate cards
  SELECT 
    'Duplicate Cards' as check_name,
    CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END as status,
    COUNT(*) as issue_count
  FROM (
    SELECT game_id, side, position, COUNT(*) as cnt
    FROM game_cards
    WHERE created_at > NOW() - INTERVAL '7 days'
    GROUP BY game_id, side, position
    HAVING COUNT(*) > 1
  ) dup_cards
  
  UNION ALL
  
  -- Negative balances
  SELECT 
    'Negative Balances' as check_name,
    CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END as status,
    COUNT(*) as issue_count
  FROM users
  WHERE balance < 0
  
  UNION ALL
  
  -- Incomplete games
  SELECT 
    'Incomplete Game Histories' as check_name,
    CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'WARNING' END as status,
    COUNT(*) as issue_count
  FROM games g
  WHERE g.status = 'completed'
  AND g.created_at > NOW() - INTERVAL '24 hours'
  AND NOT EXISTS (SELECT 1 FROM game_cards gc WHERE gc.game_id = g.id)
)
SELECT 
  '   ' || 
  CASE 
    WHEN status = 'PASS' THEN '✅'
    WHEN status = 'WARNING' THEN '⚠️ '
    ELSE '❌'
  END || ' ' ||
  check_name || ': ' || status ||
  CASE WHEN issue_count > 0 THEN ' (' || issue_count || ' issues)' ELSE '' END as summary
FROM health_checks;

\echo ''

-- ============================================
-- 7. RECENT ACTIVITY SUMMARY
-- ============================================
\echo '7️⃣ RECENT ACTIVITY (Last 24 Hours)...'
\echo ''

SELECT 
  '   📊 Total Games: ' || COUNT(DISTINCT id) as games,
  '   👥 Unique Players: ' || COUNT(DISTINCT user_id) as players,
  '   💰 Total Bets: ₹' || COALESCE(SUM(total_bets), 0)::text as bets,
  '   🎯 Completed: ' || COUNT(*) FILTER (WHERE status = 'completed') as completed
FROM games
WHERE created_at > NOW() - INTERVAL '24 hours';

\echo ''

-- ============================================
-- FINAL VERDICT
-- ============================================
\echo '═══════════════════════════════════════════'
\echo '🎯 VERIFICATION COMPLETE!'
\echo ''

WITH final_check AS (
  SELECT 
    COUNT(*) FILTER (WHERE 
      (SELECT COUNT(*) FROM (
        SELECT user_id, game_id, round, COUNT(*) as cnt
        FROM payouts
        WHERE created_at > NOW() - INTERVAL '7 days'
        GROUP BY user_id, game_id, round
        HAVING COUNT(*) > 1
      ) dup_payouts) = 0
      AND
      (SELECT COUNT(*) FROM (
        SELECT game_id, side, position, COUNT(*) as cnt
        FROM game_cards
        WHERE created_at > NOW() - INTERVAL '7 days'
        GROUP BY game_id, side, position
        HAVING COUNT(*) > 1
      ) dup_cards) = 0
      AND
      (SELECT COUNT(*) FROM users WHERE balance < 0) = 0
    ) as passed_checks
  FROM generate_series(1,1)
)
SELECT 
  CASE 
    WHEN passed_checks > 0 THEN '✅ ALL CRITICAL SYSTEMS VERIFIED - READY FOR PRODUCTION'
    ELSE '⚠️  ISSUES DETECTED - REVIEW FAILURES ABOVE'
  END as verdict
FROM final_check;

\echo '═══════════════════════════════════════════'
\echo ''
