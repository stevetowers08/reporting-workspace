import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bdmcdyxjdkgitphieklb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJkbWNkeXhqZGtnaXRwaGlla2xiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk0Mzk3MDYsImV4cCI6MjA3NTAxNTcwNn0.QwmjIXs7PbTi21GGDNd1Z0EQR2R6B_fwYWCXDFeOCPw';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkBklynCommons() {
  console.log('🔍 Checking for "bklyn commons" client...');
  
  // Search for clients with 'bklyn' or 'commons' in the name
  const { data: clients, error } = await supabase
    .from('clients')
    .select('id, name, accounts, created_at, updated_at')
    .or('name.ilike.%bklyn%,name.ilike.%commons%')
    .order('updated_at', { ascending: false });
    
  if (error) {
    console.error('❌ Error:', error);
    return;
  }
  
  console.log('✅ Found', clients?.length || 0, 'clients matching "bklyn" or "commons"');
  
  clients?.forEach((client, index) => {
    console.log(`\n${index + 1}. Client: ${client.name}`);
    console.log(`   ID: ${client.id}`);
    console.log(`   Updated: ${client.updated_at}`);
    
    if (client.accounts?.goHighLevel) {
      console.log('   🔗 GoHighLevel Status: CONNECTED');
      if (typeof client.accounts.goHighLevel === 'object') {
        console.log(`   📍 Location ID: ${client.accounts.goHighLevel.locationId}`);
        console.log(`   📍 Location Name: ${client.accounts.goHighLevel.locationName}`);
      } else {
        console.log(`   📍 Account ID: ${client.accounts.goHighLevel}`);
      }
    } else {
      console.log('   ❌ GoHighLevel Status: NOT CONNECTED');
    }
  });
  
  // Also check integrations table for any GoHighLevel connections
  console.log('\n🔍 Checking GoHighLevel integrations...');
  const { data: integrations, error: intError } = await supabase
    .from('integrations')
    .select('*')
    .eq('platform', 'goHighLevel')
    .eq('connected', true)
    .order('updated_at', { ascending: false });
    
  if (intError) {
    console.error('❌ Integration error:', intError);
  } else {
    console.log('✅ Found', integrations?.length || 0, 'connected GoHighLevel integrations');
    integrations?.forEach((integration, index) => {
      console.log(`\n${index + 1}. Integration:`);
      console.log(`   Account ID: ${integration.account_id}`);
      console.log(`   Connected: ${integration.connected}`);
      console.log(`   Updated: ${integration.updated_at}`);
      console.log(`   Has Tokens: ${!!integration.config?.tokens?.accessToken}`);
    });
  }
}

checkBklynCommons().catch(console.error);
