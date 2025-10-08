// API Test Script for Terminal
import https from 'https';
import http from 'http';
import { createClient } from '@supabase/supabase-js';

console.log('🚀 Testing APIs from Terminal...\n');

// Test 1: Check if dev server is running
function testDevServer() {
  return new Promise((resolve) => {
    const req = http.get('http://localhost:5173/', (res) => {
      console.log(`✅ Dev server is running (Status: ${res.statusCode})`);
      resolve(true);
    });
    
    req.on('error', (err) => {
      console.log(`❌ Dev server not accessible: ${err.message}`);
      resolve(false);
    });
    
    req.setTimeout(5000, () => {
      console.log('❌ Dev server timeout');
      req.destroy();
      resolve(false);
    });
  });
}

// Test 2: Test Supabase connection
async function testSupabaseConnection() {
  try {
    const supabaseUrl = 'https://bdmcdyxjdkgitphieklb.supabase.co';
    const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJkbWNkeXhqZGtnaXRwaGlla2xiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk0Mzk3MDYsImV4cCI6MjA3NTAxNTcwNn0.QwmjIXs7PbTi21GGDNd1Z0EQR2R6B_fwYWCXDFeOCPw';
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Test clients table
    const { data: clients, error: clientsError } = await supabase
      .from('clients')
      .select('*')
      .limit(5);
    
    if (clientsError) {
      console.log(`❌ Supabase clients error: ${clientsError.message}`);
      return false;
    }
    
    console.log(`✅ Supabase clients table working - Found ${clients.length} clients`);
    
    // Test integrations table
    const { data: integrations, error: integrationsError } = await supabase
      .from('integrations')
      .select('*');
    
    if (integrationsError) {
      console.log(`❌ Supabase integrations error: ${integrationsError.message}`);
      return false;
    }
    
    console.log(`✅ Supabase integrations table working - Found ${integrations.length} integrations`);
    
    // Check Google Ads integration
    const googleAdsIntegration = integrations.find(i => i.platform === 'googleAds' && i.connected);
    if (googleAdsIntegration) {
      console.log('✅ Google Ads integration found and connected');
    } else {
      console.log('⚠️ Google Ads integration not connected');
    }
    
    // Check Go High Level integration
    const ghlIntegration = integrations.find(i => i.platform === 'goHighLevel' && i.connected);
    if (ghlIntegration) {
      console.log('✅ Go High Level integration found and connected');
    } else {
      console.log('⚠️ Go High Level integration not connected');
    }
    
    return true;
  } catch (error) {
    console.log(`❌ Supabase test failed: ${error.message}`);
    return false;
  }
}

// Test 3: Test Google Ads Edge Function
async function testGoogleAdsEdgeFunction() {
  try {
    const supabaseUrl = 'https://bdmcdyxjdkgitphieklb.supabase.co';
    const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJkbWNkeXhqZGtnaXRwaGlla2xiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk0Mzk3MDYsImV4cCI6MjA3NTAxNTcwNn0.QwmjIXs7PbTi21GGDNd1Z0EQR2R6B_fwYWCXDFeOCPw';
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const { data, error } = await supabase.functions.invoke('google-ads-api/accounts');
    
    if (error) {
      console.log(`❌ Google Ads Edge Function error: ${error.message}`);
      return false;
    }
    
    console.log('✅ Google Ads Edge Function working');
    if (data && data.data) {
      console.log(`   Found ${data.data.length} Google Ads accounts`);
    }
    
    return true;
  } catch (error) {
    console.log(`❌ Google Ads Edge Function test failed: ${error.message}`);
    return false;
  }
}

// Test 4: Test Go High Level API
async function testGoHighLevelAPI() {
  try {
    const supabaseUrl = 'https://bdmcdyxjdkgitphieklb.supabase.co';
    const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJkbWNkeXhqZGtnaXRwaGlla2xiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk0Mzk3MDYsImV4cCI6MjA3NTAxNTcwNn0.QwmjIXs7PbTi21GGDNd1Z0EQR2R6B_fwYWCXDFeOCPw';
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const { data: integration, error } = await supabase
      .from('integrations')
      .select('*')
      .eq('platform', 'goHighLevel')
      .eq('connected', true)
      .single();
    
    if (error || !integration) {
      console.log('⚠️ Go High Level integration not found or not connected');
      return false;
    }
    
    const config = integration.config;
    if (config && config.apiKey && config.apiKey.apiKey) {
      const token = config.apiKey.apiKey;
      
      // Test API call
      const response = await fetch('https://services.leadconnectorhq.com/locations', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Version': '2021-07-28',
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Go High Level API working');
        console.log(`   Found ${data.locations ? data.locations.length : 0} locations`);
        return true;
      } else {
        console.log(`❌ Go High Level API error: ${response.status} ${response.statusText}`);
        return false;
      }
    } else {
      console.log('⚠️ No Go High Level API key found');
      return false;
    }
  } catch (error) {
    console.log(`❌ Go High Level API test failed: ${error.message}`);
    return false;
  }
}

// Run all tests
async function runAllTests() {
  console.log('📋 Running comprehensive API tests...\n');
  
  const devServerOk = await testDevServer();
  console.log('');
  
  const supabaseOk = await testSupabaseConnection();
  console.log('');
  
  if (supabaseOk) {
    await testGoogleAdsEdgeFunction();
    console.log('');
    
    await testGoHighLevelAPI();
    console.log('');
  }
  
  console.log('🎉 API testing completed!');
  
  if (devServerOk && supabaseOk) {
    console.log('✅ Core services are working');
    console.log('📝 You can now test the frontend at: http://localhost:5173/api-testing');
  } else {
    console.log('❌ Some services need attention');
  }
}

// Run the tests
runAllTests().catch(console.error);
