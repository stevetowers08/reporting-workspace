-- Migration: Create Groups Tables
-- Description: Creates tables for the Groups feature including groups, group_clients join table, and share_tokens
-- Created: 2026-02-09

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- Groups Table
-- ============================================================================
CREATE TABLE groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    logo_url VARCHAR(500),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'paused', 'archived')),
    shareable_link VARCHAR(255) UNIQUE,
    share_config JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE groups IS 'Groups contain multiple clients/venues for organized management and sharing';
COMMENT ON COLUMN groups.share_config IS 'JSON configuration for sharing preferences like allowIndividualSharing, showClientList, theme';

-- ============================================================================
-- Group-Client Join Table
-- ============================================================================
CREATE TABLE group_clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    display_order INTEGER DEFAULT 0,
    added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(group_id, client_id)
);

COMMENT ON TABLE group_clients IS 'Join table linking groups to their clients with ordering support';

-- ============================================================================
-- Share Tokens Table
-- ============================================================================
CREATE TABLE share_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    token VARCHAR(255) UNIQUE NOT NULL,
    resource_type VARCHAR(20) NOT NULL CHECK (resource_type IN ('client', 'group')),
    resource_id UUID NOT NULL,
    access_level VARCHAR(20) DEFAULT 'view' CHECK (access_level IN ('view', 'edit')),
    expires_at TIMESTAMP WITH TIME ZONE,
    password_hash VARCHAR(255),
    access_count INTEGER DEFAULT 0,
    last_accessed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID
);

COMMENT ON TABLE share_tokens IS 'Secure tokens for sharing clients and groups via public links';
COMMENT ON COLUMN share_tokens.token IS 'Unique cryptographically secure random string';
COMMENT ON COLUMN share_tokens.resource_type IS 'Either client or group';
COMMENT ON COLUMN share_tokens.resource_id IS 'Reference to the shared resource (client.id or groups.id)';

-- ============================================================================
-- Indexes for Performance
-- ============================================================================

-- Groups indexes
CREATE INDEX idx_groups_status ON groups(status);
CREATE INDEX idx_groups_shareable_link ON groups(shareable_link) WHERE shareable_link IS NOT NULL;

-- Group-Client indexes
CREATE INDEX idx_group_clients_group_id ON group_clients(group_id);
CREATE INDEX idx_group_clients_client_id ON group_clients(client_id);
CREATE INDEX idx_group_clients_display_order ON group_clients(group_id, display_order);

-- Share token indexes
CREATE INDEX idx_share_tokens_token ON share_tokens(token);
CREATE INDEX idx_share_tokens_resource ON share_tokens(resource_type, resource_id);
CREATE INDEX idx_share_tokens_expires ON share_tokens(expires_at) WHERE expires_at IS NOT NULL;

-- ============================================================================
-- Updated At Trigger Function
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to groups
CREATE TRIGGER update_groups_updated_at 
    BEFORE UPDATE ON groups
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Row Level Security (RLS) Policies
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE share_tokens ENABLE ROW LEVEL SECURITY;

-- Note: These are basic policies. Adjust based on your auth setup.
-- Groups policies
CREATE POLICY "Allow full access to authenticated users" ON groups
    FOR ALL USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

-- Group clients policies  
CREATE POLICY "Allow full access to authenticated users" ON group_clients
    FOR ALL USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

-- Share tokens policies
CREATE POLICY "Allow full access to authenticated users" ON share_tokens
    FOR ALL USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

-- ============================================================================
-- Helper Functions
-- ============================================================================

-- Function to generate a unique share token
CREATE OR REPLACE FUNCTION generate_share_token()
RETURNS TEXT AS $$
DECLARE
    token TEXT;
    exists_check BOOLEAN;
BEGIN
    LOOP
        -- Generate a 32-character URL-safe random string
        token := encode(gen_random_bytes(24), 'base64');
        -- Replace non-URL-safe characters
        token := replace(replace(replace(token, '/', '_'), '+', '-'), '=', '');
        
        -- Check if token already exists
        SELECT EXISTS(SELECT 1 FROM share_tokens WHERE share_tokens.token = token) INTO exists_check;
        
        EXIT WHEN NOT exists_check;
    END LOOP;
    
    RETURN token;
END;
$$ LANGUAGE plpgsql;

-- Function to clean up expired share tokens (can be called by a scheduled job)
CREATE OR REPLACE FUNCTION cleanup_expired_share_tokens()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM share_tokens 
    WHERE expires_at IS NOT NULL 
    AND expires_at < NOW();
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Views
-- ============================================================================

-- View to get groups with client count
CREATE VIEW group_summary AS
SELECT 
    g.*,
    COUNT(gc.client_id) AS client_count
FROM groups g
LEFT JOIN group_clients gc ON g.id = gc.group_id
GROUP BY g.id;

-- View to get active share tokens with resource info
CREATE VIEW active_share_tokens AS
SELECT 
    st.*,
    CASE 
        WHEN st.resource_type = 'group' THEN g.name
        WHEN st.resource_type = 'client' THEN c.name
    END AS resource_name
FROM share_tokens st
LEFT JOIN groups g ON st.resource_type = 'group' AND st.resource_id = g.id
LEFT JOIN clients c ON st.resource_type = 'client' AND st.resource_id = c.id
WHERE st.expires_at IS NULL OR st.expires_at > NOW();

-- ============================================================================
-- Migration Complete
-- ============================================================================
