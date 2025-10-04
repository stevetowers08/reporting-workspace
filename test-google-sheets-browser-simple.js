// Simple Google Sheets Integration Test for Browser Console
// Run this in the browser console at http://localhost:8080

console.log('🔍 Google Sheets Integration Test...\n');

// Test 1: Check environment variables
console.log('1. Environment Variables:');
console.log('   VITE_GOOGLE_CLIENT_ID:', import.meta.env.VITE_GOOGLE_CLIENT_ID || 'NOT SET');
console.log('   VITE_GOOGLE_CLIENT_SECRET:', import.meta.env.VITE_GOOGLE_CLIENT_SECRET ? 'SET' : 'NOT SET');

// Test 2: Check OAuth configuration
console.log('\n2. OAuth Configuration:');
const googleConfig = {
  clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID || '1040620993822-erpcbjttal5hhgb73gkafdv0dt3vip39.apps.googleusercontent.com',
  clientSecret: import.meta.env.VITE_GOOGLE_CLIENT_SECRET || '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',
  redirectUri: 'http://localhost:8080/oauth/callback',
  scopes: [
    'https://www.googleapis.com/auth/adwords',
    'https://www.googleapis.com/auth/spreadsheets.readonly',
    'https://www.googleapis.com/auth/drive.readonly'
  ]
};

console.log('   Client ID:', googleConfig.clientId);
console.log('   Client Secret:', googleConfig.clientSecret ? 'SET' : 'NOT SET');
console.log('   Redirect URI:', googleConfig.redirectUri);
console.log('   Scopes:', googleConfig.scopes);

// Test 3: Test Google Sheets API
console.log('\n3. Google Sheets API Test:');
fetch('https://sheets.googleapis.com/v4/spreadsheets')
  .then(response => {
    console.log('   Status:', response.status);
    if (response.status === 401) {
      console.log('   ✅ API reachable (401 = auth required)');
    } else if (response.status === 200) {
      console.log('   ✅ API working');
    } else {
      console.log('   ⚠️  Unexpected status:', response.status);
    }
  })
  .catch(error => {
    console.log('   ❌ API error:', error.message);
  });

// Test 4: Test OAuth token validation
console.log('\n4. OAuth Token Validation:');
fetch('https://www.googleapis.com/oauth2/v1/tokeninfo')
  .then(response => response.json())
  .then(data => {
    console.log('   Status:', response.status);
    console.log('   Response:', data);
    if (response.status === 400) {
      console.log('   ✅ Token validation working (400 = token required)');
    } else if (response.status === 200) {
      console.log('   ✅ Token validation working');
    } else {
      console.log('   ⚠️  Unexpected status:', response.status);
    }
  })
  .catch(error => {
    console.log('   ❌ Token validation error:', error.message);
  });

// Test 5: Test database connection
console.log('\n5. Database Connection:');
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (supabaseUrl && supabaseKey) {
  fetch(`${supabaseUrl}/rest/v1/integrations?select=platform,connected&platform=eq.googleSheets`, {
    headers: {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`
    }
  })
  .then(response => response.json())
  .then(data => {
    console.log('   Status:', response.status);
    console.log('   Google Sheets Integration:', data);
    if (data && data.length > 0) {
      console.log('   ✅ Google Sheets integration found');
    } else {
      console.log('   ⚠️  No Google Sheets integration found');
    }
  })
  .catch(error => {
    console.log('   ❌ Database error:', error.message);
  });
} else {
  console.log('   ❌ Supabase configuration missing');
}

// Test 6: Generate OAuth URL
console.log('\n6. OAuth URL Generation:');
try {
  const state = btoa(JSON.stringify({
    platform: 'google',
    timestamp: Date.now(),
    nonce: Math.random().toString(36).substring(2, 15),
    integrationPlatform: 'googleSheets'
  }));
  
  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
    `client_id=${googleConfig.clientId}&` +
    `redirect_uri=${encodeURIComponent(googleConfig.redirectUri)}&` +
    `response_type=code&` +
    `scope=${encodeURIComponent(googleConfig.scopes.join(' '))}&` +
    `state=${state}&` +
    `access_type=offline&` +
    `prompt=consent`;
  
  console.log('   OAuth URL generated:', authUrl ? 'YES' : 'NO');
  console.log('   OAuth URL:', authUrl);
  
  // Store the URL for easy access
  window.googleSheetsAuthUrl = authUrl;
  console.log('   💡 OAuth URL stored in window.googleSheetsAuthUrl');
  
} catch (error) {
  console.log('   ❌ OAuth URL generation error:', error);
}

console.log('\n📋 Test Summary:');
console.log('   - Environment variables: Check above');
console.log('   - OAuth configuration: Check above');
console.log('   - API endpoints: Check above');
console.log('   - Database connection: Check above');
console.log('   - OAuth URL: Check above');

console.log('\n🔧 Next Steps:');
console.log('   1. If environment variables are missing, check .env.local file');
console.log('   2. If OAuth is not working, verify client ID and secret');
console.log('   3. If database is not connected, check Supabase configuration');
console.log('   4. To test OAuth flow, visit: window.googleSheetsAuthUrl');
console.log('   5. Or go to admin panel and click "Connect" for Google Sheets');

console.log('\n✅ Test completed. Check results above.');
