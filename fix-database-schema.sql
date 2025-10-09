-- Fix Database Schema - Add Missing Tables
-- Run this in your Supabase SQL Editor

-- Create oauth_credentials table
CREATE TABLE IF NOT EXISTS oauth_credentials (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    platform VARCHAR(50) NOT NULL UNIQUE CHECK (platform IN ('facebookAds', 'googleAds', 'googleSheets', 'google-ai', 'goHighLevel')),
    client_id VARCHAR(255) NOT NULL,
    client_secret TEXT NOT NULL,
    redirect_uri TEXT NOT NULL,
    scopes TEXT[] NOT NULL DEFAULT '{}',
    auth_url TEXT NOT NULL,
    token_url TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for oauth_credentials
CREATE INDEX IF NOT EXISTS idx_oauth_credentials_platform ON oauth_credentials(platform);
CREATE INDEX IF NOT EXISTS idx_oauth_credentials_active ON oauth_credentials(is_active);

-- Create trigger for updated_at
CREATE TRIGGER update_oauth_credentials_updated_at BEFORE UPDATE ON oauth_credentials
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE oauth_credentials ENABLE ROW LEVEL SECURITY;

-- Create RLS policy
CREATE POLICY "Allow all operations on oauth_credentials" ON oauth_credentials
    FOR ALL USING (true);

-- Insert default OAuth credentials (using environment variables placeholders)
INSERT INTO oauth_credentials (platform, client_id, client_secret, redirect_uri, scopes, auth_url, token_url) VALUES
('googleAds', 'your_google_ads_client_id', 'your_google_ads_client_secret', 'http://localhost:5173/oauth/callback', 
 ARRAY['https://www.googleapis.com/auth/adwords'], 
 'https://accounts.google.com/o/oauth2/v2/auth', 
 'https://oauth2.googleapis.com/token'),
('googleSheets', 'your_google_sheets_client_id', 'your_google_sheets_client_secret', 'http://localhost:5173/oauth/callback',
 ARRAY['https://www.googleapis.com/auth/spreadsheets.readonly'],
 'https://accounts.google.com/o/oauth2/v2/auth',
 'https://oauth2.googleapis.com/token'),
('goHighLevel', 'your_ghl_client_id', 'your_ghl_client_secret', 'http://localhost:5173/oauth/callback',
 ARRAY['locations.read', 'locations.write', 'contacts.read', 'contacts.write'],
 'https://marketplace.leadconnectorhq.com/oauth/chooselocation',
 'https://services.leadconnectorhq.com/oauth/token')
ON CONFLICT (platform) DO NOTHING;

-- Grant permissions
GRANT ALL ON oauth_credentials TO anon, authenticated;

-- Create RPC function for safe token storage
CREATE OR REPLACE FUNCTION store_oauth_tokens_safely(
    p_platform TEXT,
    p_tokens JSONB,
    p_account_info JSONB DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
    -- Upsert integration with tokens
    INSERT INTO integrations (platform, connected, account_name, account_id, config, last_sync)
    VALUES (
        p_platform::VARCHAR(50),
        true,
        COALESCE(p_account_info->>'name', 'Unknown'),
        COALESCE(p_account_info->>'id', 'unknown'),
        jsonb_build_object(
            'tokens', p_tokens,
            'account_info', p_account_info
        ),
        NOW()
    )
    ON CONFLICT (platform) 
    DO UPDATE SET
        connected = true,
        account_name = COALESCE(p_account_info->>'name', integrations.account_name),
        account_id = COALESCE(p_account_info->>'id', integrations.account_id),
        config = jsonb_build_object(
            'tokens', p_tokens,
            'account_info', p_account_info
        ),
        last_sync = NOW(),
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION store_oauth_tokens_safely TO anon, authenticated;
