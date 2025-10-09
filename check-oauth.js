#!/usr/bin/env node

/**
 * Check OAuth Credentials Script
 * This script checks what's in the oauth_credentials table
 */

import { createClient } from '@supabase/supabase-js';

// Get environment variables
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://bdmcdyxjdkgitphieklb.supabase.co';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJkbWNkeXhqZGtnaXRwaGlla2xiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk0Mzk3MDYsImV4cCI6MjA3NTAxNTcwNn0.QwmjIXs7PbTi21GGDNd1Z0EQR2R6B_fwYWCXDFeOCPw';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkOAuthCredentials() {
  console.log('🔍 Checking OAuth credentials...');
  
  try {
    // Check what's in oauth_credentials table
    const { data, error } = await supabase
      .from('oauth_credentials')
      .select('*');
    
    if (error) {
      console.error('❌ Error querying oauth_credentials:', error);
      return false;
    }
    
    console.log('✅ OAuth credentials query successful');
    console.log('📊 Found', data?.length || 0, 'credentials');
    
    if (data && data.length > 0) {
      data.forEach(cred => {
        console.log(`- Platform: ${cred.platform}, Active: ${cred.is_active}`);
      });
    } else {
      console.log('⚠️  No OAuth credentials found');
      console.log('📝 This explains the 406 errors - no credentials to query');
    }
    
    // Check integrations table too
    const { data: integrations, error: intError } = await supabase
      .from('integrations')
      .select('platform, connected, account_name');
    
    if (intError) {
      console.error('❌ Error querying integrations:', intError);
    } else {
      console.log('📊 Found', integrations?.length || 0, 'integrations');
      if (integrations && integrations.length > 0) {
        integrations.forEach(int => {
          console.log(`- Platform: ${int.platform}, Connected: ${int.connected}, Account: ${int.account_name}`);
        });
      }
    }
    
    return true;
    
  } catch (error) {
    console.error('❌ Check failed:', error);
    return false;
  }
}

// Run the check
checkOAuthCredentials().then(success => {
  process.exit(success ? 0 : 1);
});
