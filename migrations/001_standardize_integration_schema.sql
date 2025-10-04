-- Migration Script: Standardize Integration Data Structures
-- This script transforms existing integration data to use the new unified schema
-- Run this in Supabase SQL Editor

-- First, let's create a backup of the current data
CREATE TABLE IF NOT EXISTS integrations_backup AS 
SELECT * FROM integrations;

-- Update the integrations table to use the new unified schema
-- This migration handles the different data structures currently in use

-- Step 1: Update Facebook Ads integration
-- Current format: { "user": {...}, "adAccounts": [...], "accessToken": "..." }
-- New format: { "connected": true, "tokens": {...}, "accountInfo": {...}, "metadata": {...} }

UPDATE integrations 
SET config = jsonb_build_object(
  'connected', connected,
  'tokens', CASE 
    WHEN config ? 'accessToken' THEN jsonb_build_object(
      'accessToken', config->>'accessToken',
      'tokenType', 'Bearer',
      'expiresAt', CASE 
        WHEN config ? 'expiresIn' THEN 
          (NOW() + INTERVAL '1 second' * (config->>'expiresIn')::int)::text
        ELSE NULL
      END
    )
    ELSE NULL
  END,
  'accountInfo', CASE 
    WHEN config ? 'user' THEN jsonb_build_object(
      'id', config->'user'->>'id',
      'name', config->'user'->>'name',
      'email', config->'user'->>'email'
    )
    ELSE NULL
  END,
  'metadata', jsonb_build_object(
    'facebookAds', CASE 
      WHEN config ? 'adAccounts' AND jsonb_array_length(config->'adAccounts') > 0 THEN
        jsonb_build_object(
          'adAccountId', config->'adAccounts'->0->>'id',
          'businessManagerId', config->'user'->>'id'
        )
      ELSE NULL
    END
  ),
  'lastSync', last_sync,
  'connectedAt', CASE 
    WHEN connected THEN created_at::text
    ELSE NULL
  END,
  'settings', jsonb_build_object(
    'adAccounts', CASE 
      WHEN config ? 'adAccounts' THEN config->'adAccounts'
      ELSE NULL
    END
  )
)
WHERE platform = 'facebookAds' 
  AND config ? 'accessToken';

-- Step 2: Update Google Ads integration
-- Current format: { "tokens": { "accessToken": "...", "refreshToken": "...", ... } }
-- New format: { "connected": true, "tokens": {...}, "accountInfo": {...}, "metadata": {...} }

UPDATE integrations 
SET config = jsonb_build_object(
  'connected', connected,
  'tokens', CASE 
    WHEN config ? 'tokens' THEN jsonb_build_object(
      'accessToken', config->'tokens'->>'accessToken',
      'refreshToken', config->'tokens'->>'refreshToken',
      'expiresIn', config->'tokens'->>'expiresIn',
      'tokenType', config->'tokens'->>'tokenType',
      'scope', config->'tokens'->>'scope',
      'expiresAt', CASE 
        WHEN config->'tokens' ? 'expiresIn' THEN 
          (NOW() + INTERVAL '1 second' * (config->'tokens'->>'expiresIn')::int)::text
        ELSE NULL
      END
    )
    ELSE NULL
  END,
  'accountInfo', CASE 
    WHEN account_name IS NOT NULL THEN jsonb_build_object(
      'id', account_id,
      'name', account_name
    )
    ELSE NULL
  END,
  'metadata', jsonb_build_object(
    'googleAds', jsonb_build_object(
      'customerId', account_id,
      'developerToken', NULL -- Will be set separately if needed
    )
  ),
  'lastSync', last_sync,
  'connectedAt', CASE 
    WHEN connected THEN created_at::text
    ELSE NULL
  END,
  'settings', jsonb_build_object()
)
WHERE platform = 'googleAds' 
  AND config ? 'tokens';

-- Step 3: Update Google AI Studio integration
-- Current format: { "apiKey": "..." }
-- New format: { "connected": true, "apiKey": {...}, "metadata": {...} }

UPDATE integrations 
SET config = jsonb_build_object(
  'connected', connected,
  'apiKey', CASE 
    WHEN config ? 'apiKey' THEN jsonb_build_object(
      'apiKey', config->>'apiKey',
      'keyType', 'bearer'
    )
    ELSE NULL
  END,
  'accountInfo', jsonb_build_object(
    'id', 'google-ai-studio',
    'name', 'Google AI Studio'
  ),
  'metadata', jsonb_build_object(
    'googleAI', jsonb_build_object(
      'modelId', 'gemini-pro',
      'projectId', NULL,
      'region', 'us-central1'
    )
  ),
  'lastSync', last_sync,
  'connectedAt', CASE 
    WHEN connected THEN created_at::text
    ELSE NULL
  END,
  'settings', jsonb_build_object()
)
WHERE platform = 'google-ai' 
  AND config ? 'apiKey';

-- Step 4: Update GoHighLevel integration (if exists)
-- This handles the case where GoHighLevel might have different data structures

UPDATE integrations 
SET config = jsonb_build_object(
  'connected', connected,
  'tokens', CASE 
    WHEN config ? 'accessToken' THEN jsonb_build_object(
      'accessToken', config->>'accessToken',
      'refreshToken', config->>'refreshToken',
      'tokenType', 'Bearer',
      'expiresAt', CASE 
        WHEN config ? 'expiresIn' THEN 
          (NOW() + INTERVAL '1 second' * (config->>'expiresIn')::int)::text
        ELSE NULL
      END
    )
    WHEN config ? 'tokens' THEN config->'tokens'
    ELSE NULL
  END,
  'accountInfo', CASE 
    WHEN account_name IS NOT NULL THEN jsonb_build_object(
      'id', account_id,
      'name', account_name
    )
    ELSE NULL
  END,
  'metadata', jsonb_build_object(
    'goHighLevel', jsonb_build_object(
      'locationId', account_id
    )
  ),
  'lastSync', last_sync,
  'connectedAt', CASE 
    WHEN connected THEN created_at::text
    ELSE NULL
  END,
  'settings', jsonb_build_object()
)
WHERE platform = 'goHighLevel';

-- Step 5: Update Google Sheets integration (if exists)
-- This handles Google Sheets which typically uses Google Ads tokens

UPDATE integrations 
SET config = jsonb_build_object(
  'connected', connected,
  'tokens', CASE 
    WHEN config ? 'accessToken' THEN jsonb_build_object(
      'accessToken', config->>'accessToken',
      'refreshToken', config->>'refreshToken',
      'tokenType', 'Bearer',
      'expiresAt', CASE 
        WHEN config ? 'expiresIn' THEN 
          (NOW() + INTERVAL '1 second' * (config->>'expiresIn')::int)::text
        ELSE NULL
      END
    )
    WHEN config ? 'tokens' THEN config->'tokens'
    ELSE NULL
  END,
  'accountInfo', CASE 
    WHEN account_name IS NOT NULL THEN jsonb_build_object(
      'id', account_id,
      'name', account_name
    )
    ELSE NULL
  END,
  'metadata', jsonb_build_object(
    'googleSheets', jsonb_build_object(
      'spreadsheetId', NULL,
      'sheetName', NULL,
      'range', NULL
    )
  ),
  'lastSync', last_sync,
  'connectedAt', CASE 
    WHEN connected THEN created_at::text
    ELSE NULL
  END,
  'settings', jsonb_build_object()
)
WHERE platform = 'googleSheets';

-- Step 6: Add sync status to all integrations
UPDATE integrations 
SET config = config || jsonb_build_object(
  'syncStatus', CASE 
    WHEN connected THEN 'idle'
    ELSE 'idle'
  END
);

-- Step 7: Update the platform enum to include 'google-ai' if not already present
-- First check if the constraint needs to be updated
DO $$
BEGIN
  -- Drop the existing constraint if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'integrations_platform_check' 
    AND table_name = 'integrations'
  ) THEN
    ALTER TABLE integrations DROP CONSTRAINT integrations_platform_check;
  END IF;
  
  -- Add the new constraint with all platforms
  ALTER TABLE integrations ADD CONSTRAINT integrations_platform_check 
    CHECK (platform IN ('facebookAds', 'googleAds', 'goHighLevel', 'googleSheets', 'google-ai'));
END $$;

-- Step 8: Verify the migration
-- This query shows the before and after for verification
SELECT 
  platform,
  connected,
  jsonb_pretty(config) as new_config
FROM integrations 
ORDER BY platform;

-- Step 9: Create indexes for better performance on the new structure
CREATE INDEX IF NOT EXISTS idx_integrations_config_connected 
ON integrations USING GIN ((config->'connected'));

CREATE INDEX IF NOT EXISTS idx_integrations_config_tokens 
ON integrations USING GIN ((config->'tokens'));

CREATE INDEX IF NOT EXISTS idx_integrations_config_api_key 
ON integrations USING GIN ((config->'apiKey'));

-- Step 10: Add comments for documentation
COMMENT ON COLUMN integrations.config IS 'Unified integration configuration following the new schema';
COMMENT ON TABLE integrations IS 'Standardized integration data with unified config structure';

-- Migration completed successfully
-- The integrations table now uses the unified schema structure
-- All existing data has been transformed to match the new format
