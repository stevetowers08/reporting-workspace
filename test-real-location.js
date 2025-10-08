// Test Go High Level API with real location ID from Supabase
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bdmcdyxjdkgitphieklb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJkbWNkeXhqZGtnaXRwaGlla2xiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk0Mzk3MDYsImV4cCI6MjA3NTAxNTcwNn0.QwmjIXs7PbTi21GGDNd1Z0EQR2R6B_fwYWCXDFeOCPw';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testWithRealLocationId() {
  try {
    console.log('🔍 Testing Go High Level API with real location ID...');
    
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
    const realLocationId = config.locationId; // V7bzEjKiigXzh8r6sQq0
    
    console.log('Token prefix:', token.substring(0, 20) + '...');
    console.log('Real Location ID:', realLocationId);
    
    // Test different endpoints with the real location ID
    const endpoints = [
      {
        url: 'https://services.leadconnectorhq.com/contacts/search',
        method: 'POST',
        description: 'Search contacts with real location ID',
        body: {
          locationId: realLocationId,
          pageLimit: 10
        }
      },
      {
        url: `https://services.leadconnectorhq.com/contacts?locationId=${realLocationId}`,
        method: 'GET',
        description: 'Get contacts with real location ID (GET)',
        body: null
      },
      {
        url: `https://services.leadconnectorhq.com/opportunities?locationId=${realLocationId}`,
        method: 'GET',
        description: 'Get opportunities with real location ID',
        body: null
      },
      {
        url: `https://services.leadconnectorhq.com/calendars?locationId=${realLocationId}`,
        method: 'GET',
        description: 'Get calendars with real location ID',
        body: null
      }
    ];
    
    for (const endpoint of endpoints) {
      try {
        console.log(`\n🔍 Testing: ${endpoint.description}`);
        console.log(`URL: ${endpoint.url}`);
        
        const headers = {
          'Authorization': `Bearer ${token}`,
          'Version': '2021-07-28',
          'Content-Type': 'application/json'
        };
        
        const requestOptions = {
          method: endpoint.method,
          headers
        };
        
        if (endpoint.body) {
          requestOptions.body = JSON.stringify(endpoint.body);
          console.log('Body:', JSON.stringify(endpoint.body, null, 2));
        }
        
        const response = await fetch(endpoint.url, requestOptions);
        
        console.log(`Status: ${response.status} ${response.statusText}`);
        
        if (response.ok) {
          const data = await response.json();
          console.log('✅ Success! Response:', JSON.stringify(data, null, 2));
        } else {
          const errorText = await response.text();
          console.log('❌ Error response:', errorText);
        }
      } catch (error) {
        console.log('❌ Request failed:', error.message);
      }
    }
    
  } catch (error) {
    console.log('❌ Test failed:', error.message);
  }
}

testWithRealLocationId();
