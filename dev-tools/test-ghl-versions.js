// Test Go High Level API with different versions
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bdmcdyxjdkgitphieklb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJkbWNkeXhqZGtnaXRwaGlla2xiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk0Mzk3MDYsImV4cCI6MjA3NTAxNTcwNn0.QwmjIXs7PbTi21GGDNd1Z0EQR2R6B_fwYWCXDFeOCPw';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testGHLAPIVersions() {
  try {
    console.log('🔍 Testing Go High Level API with different versions...');
    
    // Get the integration
    const { data: integration, error } = await supabase
      .from('integrations')
      .select('*')
      .eq('platform', 'goHighLevel')
      .eq('connected', true)
      .single();
    
    if (error || !integration) {
      console.log('❌ No Go High Level integration found');
      return;
    }
    
    const config = integration.config;
    const token = config.apiKey.apiKey;
    
    console.log('Token prefix:', token.substring(0, 20) + '...');
    
    // Test different API versions
    const versions = ['2021-07-28', '2021-04-15', '2021-01-01', '2020-12-01'];
    const endpoint = 'https://services.leadconnectorhq.com/locations';
    
    for (const version of versions) {
      try {
        console.log(`\n🔍 Testing with Version: ${version}`);
        
        const response = await fetch(endpoint, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Version': version,
            'Content-Type': 'application/json'
          }
        });
        
        console.log(`Status: ${response.status} ${response.statusText}`);
        
        if (response.ok) {
          const data = await response.json();
          console.log('✅ Success! Response:', JSON.stringify(data, null, 2));
          break; // Found working version
        } else {
          const errorText = await response.text();
          console.log('❌ Error response:', errorText.substring(0, 200));
        }
      } catch (error) {
        console.log('❌ Request failed:', error.message);
      }
    }
    
    // Also test without Version header
    try {
      console.log(`\n🔍 Testing without Version header`);
      
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log(`Status: ${response.status} ${response.statusText}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Success! Response:', JSON.stringify(data, null, 2));
      } else {
        const errorText = await response.text();
        console.log('❌ Error response:', errorText.substring(0, 200));
      }
    } catch (error) {
      console.log('❌ Request failed:', error.message);
    }
    
  } catch (error) {
    console.log('❌ Test failed:', error.message);
  }
}

testGHLAPIVersions();
