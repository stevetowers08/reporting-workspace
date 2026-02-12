-- Migration: Fix Groups RLS Policies for Anon Access
-- Description: Updates RLS policies to allow anon key access for internal use
-- Created: 2026-02-12

-- Drop existing policies
DROP POLICY IF EXISTS "Allow full access to authenticated users" ON groups;
DROP POLICY IF EXISTS "Allow full access to authenticated users" ON group_clients;
DROP POLICY IF EXISTS "Allow full access to authenticated users" ON share_tokens;

-- Create new policies that allow both authenticated and anon access
-- This is suitable for internal tools without user authentication

-- Groups policies
CREATE POLICY "Allow full access to all users" ON groups
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- Group clients policies
CREATE POLICY "Allow full access to all users" ON group_clients
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- Share tokens policies
CREATE POLICY "Allow full access to all users" ON share_tokens
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- Note: These policies allow unrestricted access via the anon key.
-- This is suitable for internal tools where the database is not exposed publicly.
-- If you add user authentication later, update these policies accordingly.
