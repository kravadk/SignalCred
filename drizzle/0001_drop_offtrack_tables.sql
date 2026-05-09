-- Drop tables for features removed as off-track for the Bags hackathon.
-- DESTRUCTIVE: this deletes all rows in these tables.
-- Run with: psql "$DATABASE_URL" -f drizzle/0001_drop_offtrack_tables.sql

BEGIN;

-- Children first (FK references)
DROP TABLE IF EXISTS "raid_participants" CASCADE;

-- Off-track feature tables
DROP TABLE IF EXISTS "yield_vaults"        CASCADE;
DROP TABLE IF EXISTS "stealth_jars"        CASCADE;
DROP TABLE IF EXISTS "multisig_launches"   CASCADE;
DROP TABLE IF EXISTS "vesting_schedules"   CASCADE;
DROP TABLE IF EXISTS "raids"               CASCADE;
DROP TABLE IF EXISTS "referrals"           CASCADE;
DROP TABLE IF EXISTS "subscriptions"       CASCADE;
DROP TABLE IF EXISTS "invoices"            CASCADE;
DROP TABLE IF EXISTS "messages"            CASCADE;
DROP TABLE IF EXISTS "scheduled_launches"  CASCADE;
DROP TABLE IF EXISTS "milestones"          CASCADE;

-- Kept tables (DO NOT drop):
--   community_sentiment — used by token sentiment widget
--   chat_messages       — used by per-token TokenChat
--   agent_logs          — used by auto_claim/dca/trading_bot agents
--   payment_links + payments_log — kept as creator tip jars

COMMIT;
