import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bdmcdyxjdkgitphieklb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJkbWNkeXhqZGtnaXRwaGlla2xiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk0Mzk3MDYsImV4cCI6MjA3NTAxNTcwNn0.QwmjIXs7PbTi21GGDNd1Z0EQR2R6B_fwYWCXDFeOCPw';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSpecificIntegration() {
  console.log('🔍 Checking integration vQHFL8RDbErisZjCgSkM...');
  
  // Get the specific integration details
  const { data: integration, error } = await supabase
    .from('integrations')
    .select('*')
    .eq('account_id', 'vQHFL8RDbErisZjCgSkM')
    .single();
    
  if (error) {
    console.error('❌ Error:', error);
    return;
  }
  
  if (integration) {
    console.log('✅ Integration found:');
    console.log('   Account ID:', integration.account_id);
    console.log('   Platform:', integration.platform);
    console.log('   Connected:', integration.connected);
    console.log('   Updated:', integration.updated_at);
    console.log('   Has Tokens:', !!integration.config?.tokens?.accessToken);
    
    if (integration.config?.tokens) {
      console.log('   Location ID:', integration.config.tokens.locationId);
      console.log('   Location Name:', integration.config.tokens.locationName);
    }
  }
  
  // Now check if any client has this account_id in their accounts
  console.log('\n🔍 Checking if any client has this account_id...');
  const { data: clients, error: clientError } = await supabase
    .from('clients')
    .select('id, name, accounts, updated_at')
    .or('accounts->goHighLevel->>locationId.eq.vQHFL8RDbErisZjCgSkM,accounts->goHighLevel.eq.vQHFL8RDbErisZjCgSkM');
    
  if (clientError) {
    console.error('❌ Client error:', clientError);
  } else {
    console.log('✅ Found', clients?.length || 0, 'clients with this account_id');
    clients?.forEach((client, index) => {
      console.log(`\n${index + 1}. Client: ${client.name}`);
      console.log(`   ID: ${client.id}`);
      console.log(`   Updated: ${client.updated_at}`);
      console.log('   GoHighLevel Account:', client.accounts?.goHighLevel);
    });
  }
}

checkSpecificIntegration().catch(console.error);
