import { config } from 'dotenv';
config({ path: '.env.local.new' });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;
const GOOGLE_ADS_DEVELOPER_TOKEN = process.env.VITE_GOOGLE_ADS_DEVELOPER_TOKEN;

console.log('🔍 FULL DEBUG: Google Ads Edge Function Test');
console.log('============================================');

// Test 1: Check if Edge Function exists and is accessible
console.log('\n🔍 Test 1: Edge Function Accessibility');
try {
  const edgeFunctionUrl = `${SUPABASE_URL}/functions/v1/google-ads-api/accounts`;
  console.log('Edge Function URL:', edgeFunctionUrl);
  
  const response = await fetch(edgeFunctionUrl, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'apikey': SUPABASE_ANON_KEY,
      'Content-Type': 'application/json'
    }
  });

  console.log('Edge Function Status:', response.status);
  console.log('Edge Function Headers:', Object.fromEntries(response.headers.entries()));
  
  if (response.ok) {
    const data = await response.json();
    console.log('✅ Edge Function SUCCESS! Response:', JSON.stringify(data, null, 2));
  } else {
    const errorText = await response.text();
    console.log('❌ Edge Function Error:', errorText);
  }
} catch (error) {
  console.log('❌ Edge Function Network Error:', error.message);
}

// Test 2: Check Google Ads integration in database
console.log('\n🔍 Test 2: Database Integration Check');
try {
  const dbResponse = await fetch(`${SUPABASE_URL}/rest/v1/integrations?platform=eq.googleAds&select=*`, {
    headers: {
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'apikey': SUPABASE_ANON_KEY,
      'Content-Type': 'application/json'
    }
  });

  console.log('Database Status:', dbResponse.status);
  
  if (dbResponse.ok) {
    const integrations = await dbResponse.json();
    console.log('✅ Database SUCCESS! Integrations:', JSON.stringify(integrations, null, 2));
    
    if (integrations.length > 0) {
      const integration = integrations[0];
      const tokens = integration.config?.tokens;
      console.log('Tokens:', {
        hasAccessToken: !!tokens?.accessToken,
        hasAccess_token: !!tokens?.access_token,
        tokenType: tokens?.token_type,
        scope: tokens?.scope,
        expiresAt: tokens?.expiresAt
      });
    }
  } else {
    const errorText = await dbResponse.text();
    console.log('❌ Database Error:', errorText);
  }
} catch (error) {
  console.log('❌ Database Network Error:', error.message);
}

// Test 3: Direct Google Ads API call (same as Edge Function does)
console.log('\n🔍 Test 3: Direct Google Ads API Call');
try {
  // Get tokens from database first
  const dbResponse = await fetch(`${SUPABASE_URL}/rest/v1/integrations?platform=eq.googleAds&select=config`, {
    headers: {
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'apikey': SUPABASE_ANON_KEY,
      'Content-Type': 'application/json'
    }
  });

  const integrations = await dbResponse.json();
  const tokens = integrations[0]?.config?.tokens;
  
  if (!tokens) {
    console.log('❌ No tokens found in database');
  } else {
    const accessToken = tokens.accessToken || tokens.access_token;
    console.log('Using Access Token:', accessToken?.substring(0, 30) + '...');
    console.log('Using Developer Token:', GOOGLE_ADS_DEVELOPER_TOKEN);
    
    const apiResponse = await fetch('https://googleads.googleapis.com/v20/customers:listAccessibleCustomers', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'developer-token': GOOGLE_ADS_DEVELOPER_TOKEN,
        'Content-Type': 'application/json'
      }
    });

    console.log('Direct API Status:', apiResponse.status);
    
    if (apiResponse.ok) {
      const data = await apiResponse.json();
      console.log('✅ Direct API SUCCESS! Response:', JSON.stringify(data, null, 2));
    } else {
      const errorText = await apiResponse.text();
      console.log('❌ Direct API Error:', errorText);
    }
  }
} catch (error) {
  console.log('❌ Direct API Network Error:', error.message);
}

// Test 4: Check if Edge Function has correct environment variables
console.log('\n🔍 Test 4: Environment Variables Check');
console.log('SUPABASE_URL:', SUPABASE_URL ? 'Set' : 'Not set');
console.log('SUPABASE_ANON_KEY:', SUPABASE_ANON_KEY ? 'Set' : 'Not set');
console.log('GOOGLE_ADS_DEVELOPER_TOKEN:', GOOGLE_ADS_DEVELOPER_TOKEN ? 'Set' : 'Not set');
