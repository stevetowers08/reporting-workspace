import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bdmcdyxjdkgitphieklb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJkbWNkeXhqZGtnaXRwaGlla2xiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk0Mzk3MDYsImV4cCI6MjA3NTAxNTcwNn0.QwmjIXs7PbTi21GGDNd1Z0EQR2R6B_fwYWCXDFeOCPw';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkOAuthStatus() {
  console.log('🔍 Checking OAuth status in Supabase...');
  
  // Check recent integrations
  console.log('\n📊 Recent GoHighLevel integrations:');
  const { data: integrations, error: integrationsError } = await supabase
    .from('integrations')
    .select('*')
    .eq('platform', 'goHighLevel')
    .order('updated_at', { ascending: false })
    .limit(5);
    
  if (integrationsError) {
    console.error('❌ Error:', integrationsError);
  } else {
    console.log('✅ Found', integrations?.length || 0, 'integrations');
    integrations?.forEach((integration, index) => {
      console.log(`  ${index + 1}. Account ID: ${integration.account_id}`);
      console.log(`     Connected: ${integration.connected}`);
      console.log(`     Updated: ${integration.updated_at}`);
      console.log(`     Has Tokens: ${!!integration.config?.tokens?.accessToken}`);
      console.log('');
    });
  }
  
  // Check OAuth credentials
  console.log('\n🔑 OAuth credentials:');
  const { data: credentials, error: credentialsError } = await supabase
    .from('oauth_credentials')
    .select('*')
    .eq('platform', 'goHighLevel')
    .eq('is_active', true)
    .single();
    
  if (credentialsError) {
    console.error('❌ Error:', credentialsError);
  } else {
    console.log('✅ Credentials found:');
    console.log('  Client ID:', credentials.client_id);
    console.log('  Redirect URI:', credentials.redirect_uri);
    console.log('  Active:', credentials.is_active);
    console.log('  Updated:', credentials.updated_at);
  }
}

checkOAuthStatus().catch(console.error);

