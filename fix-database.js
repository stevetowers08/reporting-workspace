#!/usr/bin/env node

/**
 * Database Schema Fix Script
 * This script fixes the missing oauth_credentials table in Supabase
 */

import { createClient } from '@supabase/supabase-js';

// Get environment variables
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://bdmcdyxjdkgitphieklb.supabase.co';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJkbWNkeXhqZGtnaXRwaGlla2xiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk0Mzk3MDYsImV4cCI6MjA3NTAxNTcwNn0.QwmjIXs7PbTi21GGDNd1Z0EQR2R6B_fwYWCXDFeOCPw';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function fixDatabaseSchema() {
  console.log('🔧 Fixing database schema...');
  
  try {
    // Test connection first
    const { data: _testData, error: testError } = await supabase
      .from('clients')
      .select('count')
      .limit(1);
    
    if (testError) {
      console.error('❌ Database connection failed:', testError.message);
      return false;
    }
    
    console.log('✅ Database connection successful');
    
    // Check if oauth_credentials table exists
    const { data: _tableCheck, error: tableError } = await supabase
      .from('oauth_credentials')
      .select('count')
      .limit(1);
    
    if (tableError && tableError.code === '42P01') {
      console.log('❌ oauth_credentials table does not exist');
      console.log('📝 Please run the following SQL in your Supabase SQL Editor:');
      console.log('');
      console.log('-- Create oauth_credentials table');
      console.log('CREATE TABLE IF NOT EXISTS oauth_credentials (');
      console.log('    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,');
      console.log('    platform VARCHAR(50) NOT NULL UNIQUE CHECK (platform IN (\'facebookAds\', \'googleAds\', \'googleSheets\', \'google-ai\', \'goHighLevel\')),');
      console.log('    client_id VARCHAR(255) NOT NULL,');
      console.log('    client_secret TEXT NOT NULL,');
      console.log('    redirect_uri TEXT NOT NULL,');
      console.log('    scopes TEXT[] NOT NULL DEFAULT \'{}\',');
      console.log('    auth_url TEXT NOT NULL,');
      console.log('    token_url TEXT NOT NULL,');
      console.log('    is_active BOOLEAN DEFAULT TRUE,');
      console.log('    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),');
      console.log('    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()');
      console.log(');');
      console.log('');
      console.log('-- Create indexes');
      console.log('CREATE INDEX IF NOT EXISTS idx_oauth_credentials_platform ON oauth_credentials(platform);');
      console.log('CREATE INDEX IF NOT EXISTS idx_oauth_credentials_active ON oauth_credentials(is_active);');
      console.log('');
      console.log('-- Create trigger');
      console.log('CREATE TRIGGER update_oauth_credentials_updated_at BEFORE UPDATE ON oauth_credentials');
      console.log('    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();');
      console.log('');
      console.log('-- Enable RLS');
      console.log('ALTER TABLE oauth_credentials ENABLE ROW LEVEL SECURITY;');
      console.log('');
      console.log('-- Create policy');
      console.log('CREATE POLICY "Allow all operations on oauth_credentials" ON oauth_credentials');
      console.log('    FOR ALL USING (true);');
      console.log('');
      console.log('-- Grant permissions');
      console.log('GRANT ALL ON oauth_credentials TO anon, authenticated;');
      console.log('');
      console.log('-- Create RPC function for safe token storage');
      console.log('CREATE OR REPLACE FUNCTION store_oauth_tokens_safely(');
      console.log('    p_platform TEXT,');
      console.log('    p_tokens JSONB,');
      console.log('    p_account_info JSONB DEFAULT NULL');
      console.log(')');
      console.log('RETURNS VOID AS $$');
      console.log('BEGIN');
      console.log('    -- Upsert integration with tokens');
      console.log('    INSERT INTO integrations (platform, connected, account_name, account_id, config, last_sync)');
      console.log('    VALUES (');
      console.log('        p_platform::VARCHAR(50),');
      console.log('        true,');
      console.log('        COALESCE(p_account_info->>\'name\', \'Unknown\'),');
      console.log('        COALESCE(p_account_info->>\'id\', \'unknown\'),');
      console.log('        jsonb_build_object(');
      console.log('            \'tokens\', p_tokens,');
      console.log('            \'account_info\', p_account_info');
      console.log('        ),');
      console.log('        NOW()');
      console.log('    )');
      console.log('    ON CONFLICT (platform)');
      console.log('    DO UPDATE SET');
      console.log('        connected = true,');
      console.log('        account_name = COALESCE(p_account_info->>\'name\', integrations.account_name),');
      console.log('        account_id = COALESCE(p_account_info->>\'id\', integrations.account_id),');
      console.log('        config = jsonb_build_object(');
      console.log('            \'tokens\', p_tokens,');
      console.log('            \'account_info\', p_account_info');
      console.log('        ),');
      console.log('        last_sync = NOW(),');
      console.log('        updated_at = NOW();');
      console.log('END;');
      console.log('$$ LANGUAGE plpgsql SECURITY DEFINER;');
      console.log('');
      console.log('-- Grant execute permission on the function');
      console.log('GRANT EXECUTE ON FUNCTION store_oauth_tokens_safely TO anon, authenticated;');
      console.log('');
      return false;
    } else if (tableError) {
      console.error('❌ Error checking oauth_credentials table:', tableError.message);
      return false;
    } else {
      console.log('✅ oauth_credentials table exists');
      
      // Check if RPC function exists
      const { data: _rpcCheck, error: rpcError } = await supabase
        .rpc('store_oauth_tokens_safely', {
          p_platform: 'test',
          p_tokens: {},
          p_account_info: {}
        });
      
      if (rpcError && rpcError.code === '42883') {
        console.log('❌ store_oauth_tokens_safely function does not exist');
        console.log('📝 Please also run the RPC function creation SQL shown above');
        return false;
      } else if (rpcError && rpcError.code !== '23514') { // Ignore constraint violations for test data
        console.log('❌ Error checking RPC function:', rpcError.message);
        return false;
      } else {
        console.log('✅ store_oauth_tokens_safely function exists');
        return true;
      }
    }
    
  } catch (error) {
    console.error('❌ Database fix failed:', error);
    return false;
  }
}

// Run the fix
fixDatabaseSchema().then(success => {
  if (success) {
    console.log('🎉 Database schema is correct!');
  } else {
    console.log('⚠️  Please apply the SQL fixes manually in Supabase SQL Editor');
  }
  process.exit(success ? 0 : 1);
});
