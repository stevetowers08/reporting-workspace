// Test Go High Level API with correct endpoints and format
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bdmcdyxjdkgitphieklb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJkbWNkeXhqZGtnaXRwaGlla2xiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk0Mzk3MDYsImV4cCI6MjA3NTAxNTcwNn0.QwmjIXs7PbTi21GGDNd1Z0EQR2R6B_fwYWCXDFeOCPw';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testCorrectGHLAPI() {
  try {
    console.log('🔍 Testing Go High Level API with correct format...');
    
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
    
    // Test correct API endpoints based on documentation
    const endpoints = [
      {
        url: 'https://services.leadconnectorhq.com/companies',
        method: 'GET',
        description: 'Get companies'
      },
      {
        url: 'https://services.leadconnectorhq.com/locations',
        method: 'GET', 
        description: 'Get locations'
      },
      {
        url: 'https://services.leadconnectorhq.com/contacts',
        method: 'GET',
        description: 'Get contacts (needs locationId)'
      }
    ];
    
    for (const endpoint of endpoints) {
      try {
        console.log(`\n🔍 Testing: ${endpoint.description}`);
        console.log(`URL: ${endpoint.url}`);
        
        const headers = {
          'Authorization': `Bearer ${token}`,
          'Version': '2021-04-15', // Correct API version
          'Content-Type': 'application/json'
        };
        
        const response = await fetch(endpoint.url, {
          method: endpoint.method,
          headers
        });
        
        console.log(`Status: ${response.status} ${response.statusText}`);
        
        if (response.ok) {
          const data = await response.json();
          console.log('✅ Success! Response:', JSON.stringify(data, null, 2));
        } else {
          const errorText = await response.text();
          console.log('❌ Error response:', errorText);
          
          // Try with different API version
          console.log('\n🔄 Trying with Version: 2021-07-28');
          const headers2 = {
            'Authorization': `Bearer ${token}`,
            'Version': '2021-07-28',
            'Content-Type': 'application/json'
          };
          
          const response2 = await fetch(endpoint.url, {
            method: endpoint.method,
            headers: headers2
          });
          
          console.log(`Status: ${response2.status} ${response2.statusText}`);
          
          if (response2.ok) {
            const data2 = await response2.json();
            console.log('✅ Success with 2021-07-28! Response:', JSON.stringify(data2, null, 2));
          } else {
            const errorText2 = await response2.text();
            console.log('❌ Still error:', errorText2);
          }
        }
      } catch (error) {
        console.log('❌ Request failed:', error.message);
      }
    }
    
  } catch (error) {
    console.log('❌ Test failed:', error.message);
  }
}

testCorrectGHLAPI();
