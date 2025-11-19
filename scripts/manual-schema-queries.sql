
-- ============================================================
-- COMPREHENSIVE DATABASE SCHEMA QUERIES
-- Run these in Supabase SQL Editor to get complete details
-- ============================================================

-- 1. GET ALL TABLES WITH COLUMNS
SELECT 
  t.table_name,
  json_agg(
    json_build_object(
      'column_name', c.column_name,
      'ordinal_position', c.ordinal_position,
      'data_type', c.data_type,
      'udt_name', c.udt_name,
      'is_nullable', c.is_nullable,
      'column_default', c.column_default,
      'character_maximum_length', c.character_maximum_length,
      'numeric_precision', c.numeric_precision,
      'numeric_scale', c.numeric_scale
    ) ORDER BY c.ordinal_position
  ) as columns
FROM information_schema.tables t
LEFT JOIN information_schema.columns c 
  ON t.table_name = c.table_name 
  AND t.table_schema = c.table_schema
WHERE t.table_schema = 'public' 
  AND t.table_type = 'BASE TABLE'
GROUP BY t.table_name
ORDER BY t.table_name;

-- 2. GET ALL RPC FUNCTIONS WITH FULL DEFINITIONS
SELECT 
  r.routine_name,
  r.routine_type,
  r.data_type as return_type,
  r.routine_definition,
  (
    SELECT json_agg(
      json_build_object(
        'parameter_name', p.parameter_name,
        'data_type', p.data_type,
        'parameter_mode', p.parameter_mode
      ) ORDER BY p.ordinal_position
    )
    FROM information_schema.parameters p
    WHERE p.specific_name = r.specific_name
  ) as parameters
FROM information_schema.routines r
WHERE r.routine_schema = 'public'
  AND r.routine_type = 'FUNCTION'
ORDER BY r.routine_name;

-- 3. GET ALL TRIGGERS
SELECT 
  t.trigger_name,
  t.event_object_table as table_name,
  t.action_timing,
  t.event_manipulation,
  t.action_statement,
  t.action_orientation
FROM information_schema.triggers t
WHERE t.trigger_schema = 'public'
ORDER BY t.event_object_table, t.trigger_name;

-- 4. GET ALL FOREIGN KEYS
SELECT
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name,
  rc.update_rule,
  rc.delete_rule
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
JOIN information_schema.referential_constraints AS rc
  ON tc.constraint_name = rc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
ORDER BY tc.table_name, tc.constraint_name;

-- 5. GET ALL INDEXES
SELECT
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- 6. GET PRIMARY KEYS
SELECT
  tc.table_name,
  kcu.column_name,
  tc.constraint_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
WHERE tc.constraint_type = 'PRIMARY KEY'
  AND tc.table_schema = 'public'
ORDER BY tc.table_name;

-- 7. GET TABLE STATISTICS (size, row counts)
SELECT 
  schemaname,
  relname as table_name,
  n_live_tup as row_count,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||relname)) as total_size,
  pg_size_pretty(pg_relation_size(schemaname||'.'||relname)) as table_size
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||relname) DESC;

-- 8. LIST ALL VIEWS
SELECT 
  table_name as view_name,
  view_definition
FROM information_schema.views
WHERE table_schema = 'public'
ORDER BY table_name;
