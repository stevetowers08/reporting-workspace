-- Migration: Add status and conversion_actions columns to clients table
-- Run this in your Supabase SQL Editor if the columns don't exist
-- Add status column if it doesn't exist
DO $$ BEGIN IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'clients'
        AND column_name = 'status'
) THEN
ALTER TABLE clients
ADD COLUMN status VARCHAR(50) DEFAULT 'active';
ALTER TABLE clients
ADD CONSTRAINT clients_status_check CHECK (
        status IN ('active', 'inactive', 'pending', 'paused')
    );
END IF;
END $$;
-- Add conversion_actions column if it doesn't exist
DO $$ BEGIN IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'clients'
        AND column_name = 'conversion_actions'
) THEN
ALTER TABLE clients
ADD COLUMN conversion_actions JSONB DEFAULT '{}';
END IF;
END $$;
-- Update existing clients to have 'active' status if they don't have one
UPDATE clients
SET status = 'active'
WHERE status IS NULL;
-- Create index on status for better query performance
CREATE INDEX IF NOT EXISTS idx_clients_status ON clients(status);
-- Create index on conversion_actions for JSONB queries
CREATE INDEX IF NOT EXISTS idx_clients_conversion_actions ON clients USING GIN (conversion_actions);