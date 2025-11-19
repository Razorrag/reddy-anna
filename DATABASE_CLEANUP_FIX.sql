-- ========================================
-- DATABASE CLEANUP SCRIPT
-- Fixes duplicate functions, redundant triggers, and data inconsistencies
-- ========================================

-- BACKUP RECOMMENDATION: Export your database before running this!

DO $$
BEGIN
  -- ========================================
  -- STEP 1: DROP DUPLICATE RPC FUNCTIONS
  -- ========================================

  -- Drop the 2-parameter version (keeping 3-parameter with pagination)
  DROP FUNCTION IF EXISTS get_user_game_history(TEXT, INT);

  -- Drop old referral code generator (VARCHAR version)
  DROP FUNCTION IF EXISTS generate_referral_code(VARCHAR);

  RAISE NOTICE '✅ Dropped duplicate RPC functions';

  -- ========================================
  -- STEP 2: DROP ONLY TRULY REDUNDANT USER STATS TRIGGERS
  -- ========================================

  -- Analysis of player_bets triggers:
  -- 1. daily_stats_trigger (INSERT) → KEEP - Updates daily analytics
  -- 2. trg_instant_user_statistics (UPDATE) → DROP - Redundant
  -- 3. trg_instant_user_statistics_insert (INSERT) → DROP - Redundant
  -- 4. trigger_update_player_stats_on_bet_complete (UPDATE) → KEEP - Updates user stats

  -- Drop ONLY the truly redundant ones
  DROP TRIGGER IF EXISTS trg_instant_user_statistics ON player_bets;
  DROP TRIGGER IF EXISTS trg_instant_user_statistics_insert ON player_bets;

  -- KEEP daily_stats_trigger - needed for analytics
  -- KEEP trigger_update_player_stats_on_bet_complete - needed for user stats

  RAISE NOTICE '✅ Dropped redundant player_bets triggers (kept essential ones)';

  -- ========================================
  -- STEP 3: DROP OLD BONUS TRIGGERS
  -- ========================================

  -- Deposit bonuses - drop old version
  DROP TRIGGER IF EXISTS deposit_bonuses_updated_at ON deposit_bonuses;
  -- KEEP: trigger_deposit_bonuses_updated_at

  -- Referral bonuses - drop old version
  DROP TRIGGER IF EXISTS referral_bonuses_updated_at ON referral_bonuses;
  -- KEEP: trigger_referral_bonuses_updated_at

  RAISE NOTICE '✅ Dropped old bonus triggers';

  -- ========================================
  -- STEP 4: DROP UNUSED FUNCTIONS
  -- ========================================

  -- Drop old instant update function ONLY if the trigger is removed
  -- This function was being called by trg_instant_user_statistics
  DROP FUNCTION IF EXISTS instant_update_user_statistics() CASCADE;

  -- Note: instant_calculate_game_statistics() is KEPT - used by game_history trigger
  -- Note: update_player_stats_on_bet_complete() is KEPT - used by trigger

  RAISE NOTICE '✅ Dropped unused functions (kept essential ones)';

  -- ========================================
  -- STEP 5: FIX CORRUPTED USER STATS (OPTIONAL - RUN SEPARATELY IF NEEDED)
  -- ========================================

  -- NOTE: Commented out due to function return type mismatch
  -- If you need to recalculate stats, run this separately in SQL Editor:
  -- SELECT * FROM recalculate_all_player_stats();
  
  RAISE NOTICE '⚠️  STEP 5 SKIPPED: Run recalculate_all_player_stats() separately if needed';
  RAISE NOTICE '   The main fixes (removing redundant triggers) are now complete';

  -- ========================================
  -- STEP 6: ADD MISSING INDEXES (Performance)
  -- ========================================

  -- Index for game history RPC lookup
  CREATE INDEX IF NOT EXISTS idx_player_bets_user_game_created
    ON player_bets(user_id, game_id, created_at DESC);

  -- Index for game history aggregation
  CREATE INDEX IF NOT EXISTS idx_game_history_created_desc
    ON game_history(created_at DESC);

  RAISE NOTICE '✅ Added performance indexes';
END $$;

-- ========================================
-- STEP 7: VERIFY CLEANUP
-- ========================================

-- List remaining functions related to game history
DO $$
DECLARE
  func_record RECORD;
  func_count INT := 0;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '📋 REMAINING GAME HISTORY FUNCTIONS:';
  
  FOR func_record IN
    SELECT
      r.routine_name,
      string_agg(p.parameter_name || ' ' || p.data_type, ', ' ORDER BY p.ordinal_position) as params
    FROM information_schema.routines r
    LEFT JOIN information_schema.parameters p ON r.specific_name = p.specific_name
    WHERE r.routine_schema = 'public'
      AND r.routine_name LIKE '%game_history%'
    GROUP BY r.routine_name
  LOOP
    func_count := func_count + 1;
    RAISE NOTICE '  ✓ %(%) ', func_record.routine_name, COALESCE(func_record.params, 'no params');
  END LOOP;
  
  IF func_count = 0 THEN
    RAISE NOTICE '  ⚠️  No game history functions found!';
  END IF;
END $$;

-- List remaining triggers on player_bets
DO $$
DECLARE
  trig_record RECORD;
  trig_count INT := 0;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '📋 REMAINING TRIGGERS ON player_bets:';
  
  FOR trig_record IN 
    SELECT trigger_name, action_timing, event_manipulation
    FROM information_schema.triggers
    WHERE event_object_table = 'player_bets'
    ORDER BY trigger_name
  LOOP
    trig_count := trig_count + 1;
    RAISE NOTICE '  ✓ % (% %)', trig_record.trigger_name, trig_record.action_timing, trig_record.event_manipulation;
  END LOOP;
  
  RAISE NOTICE '  Total: % triggers', trig_count;
END $$;

-- ========================================
-- STEP 8: VERIFY ESSENTIAL TRIGGERS REMAIN
-- ========================================

DO $$
DECLARE
  essential_triggers TEXT[] := ARRAY[
    'trigger_update_player_stats_on_bet_complete',
    'daily_stats_trigger',
    'trg_instant_game_statistics',
    'trigger_update_daily_analytics_on_game_complete'
  ];
  trig TEXT;
  found_count INT := 0;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '📋 VERIFYING ESSENTIAL TRIGGERS:';
  
  FOREACH trig IN ARRAY essential_triggers LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.triggers
      WHERE trigger_name = trig
    ) THEN
      found_count := found_count + 1;
      RAISE NOTICE '  ✓ % - ACTIVE', trig;
    ELSE
      RAISE WARNING '  ✗ % - MISSING!', trig;
    END IF;
  END LOOP;
  
  RAISE NOTICE '  Total: %/% essential triggers active', found_count, array_length(essential_triggers, 1);
END $$;

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ DATABASE CLEANUP COMPLETE!';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'WHAT WAS REMOVED:';
  RAISE NOTICE '  ❌ Duplicate get_user_game_history(TEXT, INT) function';
  RAISE NOTICE '  ❌ Old generate_referral_code(VARCHAR) function';
  RAISE NOTICE '  ❌ trg_instant_user_statistics trigger (redundant)';
  RAISE NOTICE '  ❌ trg_instant_user_statistics_insert trigger (redundant)';
  RAISE NOTICE '  ❌ instant_update_user_statistics() function (unused)';
  RAISE NOTICE '  ❌ Old bonus triggers (replaced by newer versions)';
  RAISE NOTICE '';
  RAISE NOTICE 'WHAT WAS KEPT (ESSENTIAL FOR ANALYTICS):';
  RAISE NOTICE '  ✓ trigger_update_player_stats_on_bet_complete';
  RAISE NOTICE '  ✓ daily_stats_trigger (updates daily analytics)';
  RAISE NOTICE '  ✓ trg_instant_game_statistics (creates game stats)';
  RAISE NOTICE '  ✓ trigger_update_daily_analytics_on_game_complete';
  RAISE NOTICE '  ✓ All monthly/yearly aggregation triggers';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. ✓ TypeScript code updated (storage-supabase.ts)';
  RAISE NOTICE '2. Deploy backend changes';
  RAISE NOTICE '3. Test game completion and payouts';
  RAISE NOTICE '4. Verify admin and player see same data';
  RAISE NOTICE '5. Verify user stats update correctly after each game';
END $$;