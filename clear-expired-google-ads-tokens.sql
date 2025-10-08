-- Clear expired Google Ads tokens to allow reconnection
-- Run this in Supabase SQL Editor
UPDATE integrations
SET connected = false,
    config = jsonb_set(config, '{tokens}', 'null'::jsonb),
    last_sync = NULL,
    updated_at = NOW()
WHERE platform = 'googleAds';
-- Verify the update
SELECT platform,
    connected,
    config->'tokens' as tokens
FROM integrations
WHERE platform = 'googleAds';