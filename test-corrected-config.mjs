#!/usr/bin/env node

// Test the CORRECTED Google Ads API configuration
const https = require('https');

const testCorrectedGoogleAdsAPI = async () => {
  console.log('🔍 Testing CORRECTED Google Ads API configuration...\n');
  
  // Corrected configuration based on online research
  const correctedConfig = {
    endpoint: 'https://googleads.googleapis.com/v20/customers/-1/googleAds:searchStream',
    method: 'POST',
    headers: {
      'Authorization': 'Bearer [ACCESS_TOKEN]',
      'developer-token': '[REAL_DEVELOPER_TOKEN]',
      'login-customer-id': '114022914626790301268', // Manager account ID
      'Content-Type': 'application/json'
    },
    body: {
      query: `SELECT
        customer_client.client_customer,
        customer_client.descriptive_name,
        customer_client.status,
        customer_client.currency_code,
        customer_client.time_zone,
        customer_client.test_account_access
      FROM
        customer_client
      WHERE
        customer_client.level = 1`
    }
  };
  
  console.log('📋 CORRECTED CONFIGURATION:');
  console.log('Endpoint:', correctedConfig.endpoint);
  console.log('Method:', correctedConfig.method);
  console.log('Headers:', JSON.stringify(correctedConfig.headers, null, 2));
  console.log('Query:', correctedConfig.body.query);
  console.log('');
  
  // Test with curl command
  console.log('🧪 CURL COMMAND TO TEST:');
  const curlCommand = `curl -X POST \\
  "${correctedConfig.endpoint}" \\
  -H "Authorization: Bearer [ACCESS_TOKEN]" \\
  -H "developer-token: [REAL_DEVELOPER_TOKEN]" \\
  -H "login-customer-id: 114022914626790301268" \\
  -H "Content-Type: application/json" \\
  -d '${JSON.stringify(correctedConfig.body)}'`;
  
  console.log(curlCommand);
  console.log('');
  
  console.log('❌ CANNOT TEST WITHOUT REAL TOKENS');
  console.log('Need:');
  console.log('- Real access token (not placeholder)');
  console.log('- Real developer token (not placeholder)');
  console.log('- Valid OAuth credentials');
  console.log('');
  
  console.log('🔧 NEXT STEPS:');
  console.log('1. Get real access token from OAuth flow');
  console.log('2. Get real developer token from Google Ads API Center');
  console.log('3. Test with curl command above');
  console.log('4. If successful, update the code with these headers');
};

testCorrectedGoogleAdsAPI().catch(console.error);
