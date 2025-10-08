// Test Go High Level API with correct search endpoints
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bdmcdyxjdkgitphieklb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJkbWNkeXhqZGtnaXRwaGlla2xiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk0Mzk3MDYsImV4cCI6MjA3NTAxNTcwNn0.QwmjIXs7PbTi21GGDNd1Z0EQR2R6B_fwYWCXDFeOCPw';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testCorrectGHLEndpoints() {
  try {
    console.log('🔍 Testing Go High Level API with correct search endpoints...');
    
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
    const companyId = 'WgNZ7xm35vYaZwflSov7'; // Known company ID from service
    
    console.log('Token prefix:', token.substring(0, 20) + '...');
    console.log('Company ID:', companyId);
    
    // Test correct API endpoints based on service implementation
    const endpoints = [
      {
        url: `https://services.leadconnectorhq.com/locations/search?companyId=${companyId}&limit=100`,
        method: 'GET',
        description: 'Get locations with companyId'
      },
      {
        url: 'https://services.leadconnectorhq.com/contacts/search',
        method: 'POST',
        description: 'Search contacts (POST with body)',
        body: {
          locationId: 'test-location-id', // We'll try with a test ID
          pageLimit: 10
        }
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

testCorrectGHLEndpoints();
