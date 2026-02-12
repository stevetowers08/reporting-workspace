-- Migration: Disable RLS on Groups Tables
-- Description: Disables Row Level Security for internal tool use
-- Created: 2026-02-12
-- WARNING: Only use this for internal tools where the anon key is not exposed publicly

-- Disable RLS on all groups-related tables
ALTER TABLE groups DISABLE ROW LEVEL SECURITY;
ALTER TABLE group_clients DISABLE ROW LEVEL SECURITY;
ALTER TABLE share_tokens DISABLE ROW LEVEL SECURITY;

-- Note: With RLS disabled, anyone with the anon key can access these tables.
-- Ensure your anon key is kept private and not exposed in public repositories.
