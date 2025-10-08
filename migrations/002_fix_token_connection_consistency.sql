-- Migration: Fix Token/Connection Consistency
-- This migration ensures that tokens and connection status are always in sync
-- NOTE: GoHighLevel is client-level (stored in clients.accounts), not account-level
-- 1. Create a function to automatically update connection status when tokens change
CREATE OR REPLACE FUNCTION update_integration_connection_status() RETURNS TRIGGER AS $$ BEGIN -- If tokens are null or empty, set connected to false
    IF NEW.config->>'tokens' IS NULL
    OR NEW.config->'tokens' IS NULL THEN NEW.connected := false;
-- If tokens exist, set connected to true
ELSIF NEW.config->'tokens'->>'accessToken' IS NOT NULL THEN NEW.connected := true;
ELSE NEW.connected := false;
END IF;
RETURN NEW;
END;
$$ LANGUAGE plpgsql;
-- 2. Create trigger to automatically update connection status
DROP TRIGGER IF EXISTS trigger_update_connection_status ON integrations;
CREATE TRIGGER trigger_update_connection_status BEFORE
INSERT
    OR
UPDATE ON integrations FOR EACH ROW EXECUTE FUNCTION update_integration_connection_status();
-- 3. Create a function to clean up orphaned tokens
CREATE OR REPLACE FUNCTION cleanup_orphaned_tokens() RETURNS void AS $$ BEGIN -- Update integrations where tokens are null but connected is true
UPDATE integrations
SET connected = false
WHERE connected = true
    AND (
        config->>'tokens' IS NULL
        OR config->'tokens' IS NULL
    );
-- Update integrations where tokens exist but connected is false
UPDATE integrations
SET connected = true
WHERE connected = false
    AND config->'tokens'->>'accessToken' IS NOT NULL;
END;
$$ LANGUAGE plpgsql;
-- 4. Run cleanup to fix existing inconsistencies
SELECT cleanup_orphaned_tokens();
-- 5. Add constraints to prevent future inconsistencies
-- Add check constraint to ensure connection status matches token presence
ALTER TABLE integrations
ADD CONSTRAINT check_token_connection_consistency CHECK (
        (
            connected = true
            AND config->'tokens'->>'accessToken' IS NOT NULL
        )
        OR (
            connected = false
            AND (
                config->>'tokens' IS NULL
                OR config->'tokens' IS NULL
            )
        )
    );
-- 6. Create a view for consistent token access
CREATE OR REPLACE VIEW integration_tokens AS
SELECT platform,
    connected,
    config->'tokens'->>'accessToken' as access_token,
    config->'tokens'->>'refreshToken' as refresh_token,
    config->'tokens'->>'expiresAt' as expires_at,
    config->'accountInfo' as account_info,
    config->>'lastSync' as last_sync,
    config->>'syncStatus' as sync_status,
    config->>'connectedAt' as connected_at
FROM integrations
WHERE platform IN (
        'googleAds',
        'googleSheets',
        'facebookAds',
        'goHighLevel'
    );
-- 7. Create a function to safely store tokens with atomic updates
CREATE OR REPLACE FUNCTION store_oauth_tokens_safely(
        p_platform text,
        p_tokens jsonb,
        p_account_info jsonb DEFAULT NULL
    ) RETURNS void AS $$
DECLARE v_config jsonb;
BEGIN -- Build the config object
v_config := jsonb_build_object(
    'connected',
    true,
    'tokens',
    p_tokens,
    'accountInfo',
    p_account_info,
    'lastSync',
    to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
    'syncStatus',
    'idle',
    'connectedAt',
    to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
);
-- Upsert with atomic update
INSERT INTO integrations (platform, connected, config)
VALUES (p_platform, true, v_config) ON CONFLICT (platform) DO
UPDATE
SET connected = true,
    config = v_config,
    updated_at = now();
END;
$$ LANGUAGE plpgsql;
-- 8. Create a function to safely clear tokens
CREATE OR REPLACE FUNCTION clear_oauth_tokens_safely(p_platform text) RETURNS void AS $$
DECLARE v_config jsonb;
BEGIN -- Get current config and clear tokens
SELECT config INTO v_config
FROM integrations
WHERE platform = p_platform;
IF v_config IS NOT NULL THEN v_config := v_config || jsonb_build_object(
    'tokens',
    null,
    'connected',
    false,
    'lastSync',
    to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
    'syncStatus',
    'disconnected'
);
UPDATE integrations
SET connected = false,
    config = v_config,
    updated_at = now()
WHERE platform = p_platform;
END IF;
END;
$$ LANGUAGE plpgsql;
-- 9. Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_integrations_platform_connected ON integrations(platform, connected);
CREATE INDEX IF NOT EXISTS idx_integrations_config_tokens ON integrations USING GIN ((config->'tokens'));
-- 10. Create a monitoring function to check for inconsistencies
CREATE OR REPLACE FUNCTION check_token_consistency() RETURNS TABLE(
        platform text,
        connected boolean,
        has_tokens boolean,
        is_consistent boolean
    ) AS $$ BEGIN RETURN QUERY
SELECT i.platform,
    i.connected,
    (i.config->'tokens'->>'accessToken' IS NOT NULL) as has_tokens,
    (
        i.connected = (i.config->'tokens'->>'accessToken' IS NOT NULL)
    ) as is_consistent
FROM integrations i
WHERE i.platform IN (
        'googleAds',
        'googleSheets',
        'facebookAds',
        'goHighLevel'
    );
END;
$$ LANGUAGE plpgsql;
-- 11. Add comments for documentation
COMMENT ON FUNCTION update_integration_connection_status() IS 'Automatically updates connection status based on token presence';
COMMENT ON FUNCTION cleanup_orphaned_tokens() IS 'Fixes existing token/connection inconsistencies';
COMMENT ON FUNCTION store_oauth_tokens_safely(text, jsonb, jsonb) IS 'Safely stores OAuth tokens with atomic updates';
COMMENT ON FUNCTION clear_oauth_tokens_safely(text) IS 'Safely clears OAuth tokens and updates connection status';
COMMENT ON FUNCTION check_token_consistency() IS 'Monitors token/connection consistency';
COMMENT ON VIEW integration_tokens IS 'Consistent view of integration tokens and status';
