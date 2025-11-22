-- Drop All Tables Script for Supabase
-- WARNING: This will DELETE ALL DATA permanently!
-- Use this to start fresh before running your init.sql

-- Disable triggers and foreign key checks temporarily
SET session_replication_role = 'replica';

-- Drop tables in reverse dependency order (to avoid foreign key errors)
DROP TABLE IF EXISTS council_votes CASCADE;
DROP TABLE IF EXISTS chat_messages CASCADE;
DROP TABLE IF EXISTS referrals CASCADE;
DROP TABLE IF EXISTS sentiment_data CASCADE;
DROP TABLE IF EXISTS treasury CASCADE;
DROP TABLE IF EXISTS projects CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Drop any custom types/enums if they exist
DROP TYPE IF EXISTS project_status CASCADE;
DROP TYPE IF EXISTS loan_type CASCADE;

-- Re-enable triggers and foreign key checks
SET session_replication_role = 'origin';

-- Verify all tables are dropped
SELECT tablename
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename NOT LIKE 'pg_%'
  AND tablename NOT LIKE 'sql_%';

-- If the query above returns no rows, all tables have been successfully dropped
