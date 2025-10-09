// Test Go High Level API with real token
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bdmcdyxjdkgitphieklb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJkbWNkeXhqZGtnaXRwaGlla2xiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk0Mzk3MDYsImV4cCI6MjA3NTAxNTcwNn0.QwmjIXs7PbTi21GGDNd1Z0EQR2R6B_fwYWCXDFeOCPw';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testGHLAPI() {
  try {
    console.log('🔍 Testing Go High Level API with real token...');
    
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
    
    console.log('✅ Found Go High Level integration');
    console.log('Config keys:', Object.keys(integration.config));
    
    const config = integration.config;
    let token = null;
    
    // Try different token locations
    if (config.apiKey && config.apiKey.apiKey) {
      token = config.apiKey.apiKey;
      console.log('✅ Found token in config.apiKey.apiKey');
    } else if (config.tokens && config.tokens.accessToken) {
      token = config.tokens.accessToken;
      console.log('✅ Found token in config.tokens.accessToken');
    } else if (config.accessToken) {
      token = config.accessToken;
      console.log('✅ Found token in config.accessToken');
    } else {
      console.log('❌ No token found in config');
      console.log('Config structure:', JSON.stringify(config, null, 2));
      return;
    }
    
    console.log('Token prefix:', token.substring(0, 20) + '...');
    
    // Test different endpoints with new API 2.0 base URL
    const endpoints = [
      'https://services.gohighlevel.com/v2/locations',
      'https://services.gohighlevel.com/v2/companies',
      'https://services.leadconnectorhq.com/locations',
      'https://services.leadconnectorhq.com/companies'
    ];
    
    for (const endpoint of endpoints) {
      try {
        console.log(`\n🔍 Testing endpoint: ${endpoint}`);
        
        const response = await fetch(endpoint, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Version': '2021-07-28',
            'Content-Type': 'application/json'
          }
        });
        
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

testGHLAPI();
