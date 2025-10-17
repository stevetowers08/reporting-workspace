import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bdmcdyxjdkgitphieklb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJkbWNkeXhqZGtnaXRwaGlla2xiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk0Mzk3MDYsImV4cCI6MjA3NTAxNTcwNn0.QwmjIXs7PbTi21GGDNd1Z0EQR2R6B_fwYWCXDFeOCPw';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAllClients() {
  console.log('🔍 Checking all clients...');
  
  const { data: clients, error } = await supabase
    .from('clients')
    .select('id, name, accounts, updated_at')
    .order('updated_at', { ascending: false })
    .limit(10);
    
  if (error) {
    console.error('❌ Error:', error);
    return;
  }
  
  console.log('✅ Found', clients?.length || 0, 'clients (showing most recent 10)');
  
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
}

checkAllClients().catch(console.error);
