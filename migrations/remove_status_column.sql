-- Migration to remove status column from clients table
-- This migration removes the status field that was not being used meaningfully
-- Remove the status column from clients table
ALTER TABLE clients DROP COLUMN IF EXISTS status;
-- Remove the index on status column if it exists
DROP INDEX IF EXISTS idx_clients_status;