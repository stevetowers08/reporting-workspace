-- Supabase Database Schema for Event Reporting Dashboard
-- Run this in your Supabase SQL Editor

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create clients table
CREATE TABLE IF NOT EXISTS clients (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(100) NOT NULL,
    location VARCHAR(255) NOT NULL,
    logo_url TEXT,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'paused', 'inactive')),
    services JSONB NOT NULL DEFAULT '{}',
    accounts JSONB DEFAULT '{}',
    shareable_link TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create integrations table
CREATE TABLE IF NOT EXISTS integrations (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    platform VARCHAR(50) NOT NULL UNIQUE CHECK (platform IN ('facebookAds', 'googleAds', 'goHighLevel', 'googleSheets')),
    connected BOOLEAN DEFAULT FALSE,
    account_name VARCHAR(255),
    account_id VARCHAR(255),
    last_sync TIMESTAMP WITH TIME ZONE,
    config JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create metrics table for storing historical data
CREATE TABLE IF NOT EXISTS metrics (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    platform VARCHAR(50) NOT NULL CHECK (platform IN ('facebookAds', 'googleAds', 'goHighLevel', 'googleSheets')),
    date DATE NOT NULL,
    metrics JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_clients_status ON clients(status);
CREATE INDEX IF NOT EXISTS idx_clients_created_at ON clients(created_at);
CREATE INDEX IF NOT EXISTS idx_integrations_platform ON integrations(platform);
CREATE INDEX IF NOT EXISTS idx_integrations_connected ON integrations(connected);
CREATE INDEX IF NOT EXISTS idx_metrics_client_id ON metrics(client_id);
CREATE INDEX IF NOT EXISTS idx_metrics_platform ON metrics(platform);
CREATE INDEX IF NOT EXISTS idx_metrics_date ON metrics(date);
CREATE INDEX IF NOT EXISTS idx_metrics_client_platform_date ON metrics(client_id, platform, date);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON clients
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_integrations_updated_at BEFORE UPDATE ON integrations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE metrics ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (allow all operations for now - adjust based on your auth needs)
CREATE POLICY "Allow all operations on clients" ON clients
    FOR ALL USING (true);

CREATE POLICY "Allow all operations on integrations" ON integrations
    FOR ALL USING (true);

CREATE POLICY "Allow all operations on metrics" ON metrics
    FOR ALL USING (true);

-- Insert sample data
INSERT INTO clients (name, type, location, services, accounts, shareable_link) VALUES
('Grand Ballroom Hotel', 'Hotel', 'Downtown', 
 '{"facebookAds": true, "googleAds": true, "crm": true, "revenue": true}',
 '{"facebookAds": "act_34769891", "googleAds": "google_ads_account"}',
 'https://eventmetrics.com/share/sample1'),
('Riverside Conference Center', 'Conference Center', 'Waterfront',
 '{"facebookAds": true, "googleAds": false, "crm": false, "revenue": false}',
 '{"facebookAds": "act_34769891"}',
 'https://eventmetrics.com/share/sample2')
ON CONFLICT DO NOTHING;

-- Insert sample integration data
INSERT INTO integrations (platform, connected, account_name, account_id, config) VALUES
('facebookAds', true, 'Steve Towers', 'act_34769891', '{"access_token": "EAAph81SWZC4YBPg05wHDwacBOutmohwqY3CykQJlIDNuJKF9rb00FOKcLKCcPG423hOJ4pHu5racSuZBnLBwsrld2QPW2ReW5rjpKoGYfMT1eVWrsdCnNLDxb4ZBU8n3dFxd94rxJk3eVYRWEr8YwfZBscgi2z9J0dZBwSSq01WPPu3nMmI6PiZAKAy1SzWwH9ZAZAkZD"}'),
('googleAds', false, null, null, '{}'),
('goHighLevel', false, null, null, '{}'),
('googleSheets', false, null, null, '{}')
ON CONFLICT (platform) DO NOTHING;

-- Create a view for client dashboard data
CREATE OR REPLACE VIEW client_dashboard AS
SELECT 
    c.id,
    c.name,
    c.type,
    c.location,
    c.status,
    c.services,
    c.accounts,
    c.shareable_link,
    c.created_at,
    c.updated_at,
    COUNT(m.id) as total_metrics,
    MAX(m.date) as last_metrics_date
FROM clients c
LEFT JOIN metrics m ON c.id = m.client_id
GROUP BY c.id, c.name, c.type, c.location, c.status, c.services, c.accounts, c.shareable_link, c.created_at, c.updated_at;

-- Create a function to get client metrics for a date range
CREATE OR REPLACE FUNCTION get_client_metrics(
    p_client_id UUID,
    p_start_date DATE,
    p_end_date DATE,
    p_platform VARCHAR DEFAULT NULL
)
RETURNS TABLE (
    platform VARCHAR,
    date DATE,
    metrics JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        m.platform,
        m.date,
        m.metrics
    FROM metrics m
    WHERE m.client_id = p_client_id
        AND m.date BETWEEN p_start_date AND p_end_date
        AND (p_platform IS NULL OR m.platform = p_platform)
    ORDER BY m.date DESC, m.platform;
END;
$$ LANGUAGE plpgsql;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;
