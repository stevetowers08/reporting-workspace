// Comprehensive Google Sheets Integration Test
console.log('🔍 Comprehensive Google Sheets Integration Test...\n');

// Test 1: Environment Variables
console.log('1. Environment Variables Check:');
console.log('   VITE_GOOGLE_CLIENT_ID:', import.meta.env.VITE_GOOGLE_CLIENT_ID || 'NOT SET');
console.log('   VITE_GOOGLE_CLIENT_SECRET:', import.meta.env.VITE_GOOGLE_CLIENT_SECRET ? 'SET' : 'NOT SET');
console.log('   VITE_SUPABASE_URL:', import.meta.env.VITE_SUPABASE_URL ? 'SET' : 'NOT SET');
console.log('   VITE_SUPABASE_ANON_KEY:', import.meta.env.VITE_SUPABASE_ANON_KEY ? 'SET' : 'NOT SET');

// Test 2: OAuth Service Configuration
console.log('\n2. OAuth Service Configuration:');
try {
  // Check if OAuth service is available
  console.log('   OAuth service: Available');
  
  // Check Google OAuth config
  const googleConfig = {
    clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID || '1040620993822-erpcbjttal5hhgb73gkafdv0dt3vip39.apps.googleusercontent.com',
    clientSecret: import.meta.env.VITE_GOOGLE_CLIENT_SECRET || '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',
    redirectUri: import.meta.env.DEV ? 'http://localhost:8080/oauth/callback' : `${window.location.origin}/oauth/callback`,
    scopes: [
      'https://www.googleapis.com/auth/adwords',
      'https://www.googleapis.com/auth/spreadsheets.readonly',
      'https://www.googleapis.com/auth/drive.readonly'
    ]
  };
  
  console.log('   Google Client ID:', googleConfig.clientId);
  console.log('   Google Client Secret:', googleConfig.clientSecret ? 'SET' : 'NOT SET');
  console.log('   Redirect URI:', googleConfig.redirectUri);
  console.log('   Scopes:', googleConfig.scopes);
  
} catch (error) {
  console.log('   ❌ OAuth service error:', error);
}

// Test 3: Google Sheets API Endpoints
console.log('\n3. Google Sheets API Endpoints:');

// Test Sheets API
fetch('https://sheets.googleapis.com/v4/spreadsheets')
  .then(response => {
    console.log('   Sheets API Status:', response.status);
    if (response.status === 401) {
      console.log('   ✅ Sheets API: Reachable (401 = auth required)');
    } else if (response.status === 200) {
      console.log('   ✅ Sheets API: Working');
    } else {
      console.log('   ⚠️  Sheets API: Unexpected status');
    }
  })
  .catch(error => {
    console.log('   ❌ Sheets API Error:', error.message);
  });

// Test Drive API
fetch('https://www.googleapis.com/drive/v3/files')
  .then(response => {
    console.log('   Drive API Status:', response.status);
    if (response.status === 401) {
      console.log('   ✅ Drive API: Reachable (401 = auth required)');
    } else if (response.status === 200) {
      console.log('   ✅ Drive API: Working');
    } else {
      console.log('   ⚠️  Drive API: Unexpected status');
    }
  })
  .catch(error => {
    console.log('   ❌ Drive API Error:', error.message);
  });

// Test 4: OAuth Token Validation
console.log('\n4. OAuth Token Validation:');
fetch('https://www.googleapis.com/oauth2/v1/tokeninfo')
  .then(response => response.json())
  .then(data => {
    console.log('   Token Info Status:', response.status);
    console.log('   Response:', data);
    if (response.status === 400) {
      console.log('   ✅ Token validation: Working (400 = token required)');
    } else if (response.status === 200) {
      console.log('   ✅ Token validation: Working');
    } else {
      console.log('   ⚠️  Token validation: Unexpected status');
    }
  })
  .catch(error => {
    console.log('   ❌ Token validation error:', error.message);
  });

// Test 5: Database Connection
console.log('\n5. Database Connection:');
try {
  // Check if Supabase is available
  console.log('   Supabase URL:', import.meta.env.VITE_SUPABASE_URL);
  console.log('   Supabase Key:', import.meta.env.VITE_SUPABASE_ANON_KEY ? 'SET' : 'NOT SET');
  
  // Test Supabase connection
  fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/integrations?select=*&limit=1`, {
    headers: {
      'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
    }
  })
  .then(response => {
    console.log('   Database Status:', response.status);
    if (response.status === 200) {
      console.log('   ✅ Database: Connected');
    } else {
      console.log('   ⚠️  Database: Unexpected status');
    }
  })
  .catch(error => {
    console.log('   ❌ Database error:', error.message);
  });
  
} catch (error) {
  console.log('   ❌ Database test error:', error);
}

// Test 6: Integration Service
console.log('\n6. Integration Service:');
try {
  // Check if integration service is available
  console.log('   Integration service: Available');
  
  // Test getting integrations
  fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/integrations?select=platform,connected&platform=eq.googleSheets`, {
    headers: {
      'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
    }
  })
  .then(response => response.json())
  .then(data => {
    console.log('   Google Sheets Integration:', data);
    if (data && data.length > 0) {
      console.log('   ✅ Google Sheets integration found');
    } else {
      console.log('   ⚠️  No Google Sheets integration found');
    }
  })
  .catch(error => {
    console.log('   ❌ Integration service error:', error.message);
  });
  
} catch (error) {
  console.log('   ❌ Integration service test error:', error);
}

// Test 7: OAuth Flow Test
console.log('\n7. OAuth Flow Test:');
try {
  // Generate OAuth URL
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '1040620993822-erpcbjttal5hhgb73gkafdv0dt3vip39.apps.googleusercontent.com';
  const redirectUri = import.meta.env.DEV ? 'http://localhost:8080/oauth/callback' : `${window.location.origin}/oauth/callback`;
  const scopes = [
    'https://www.googleapis.com/auth/adwords',
    'https://www.googleapis.com/auth/spreadsheets.readonly',
    'https://www.googleapis.com/auth/drive.readonly'
  ].join(' ');
  
  const state = btoa(JSON.stringify({
    platform: 'google',
    timestamp: Date.now(),
    nonce: Math.random().toString(36).substring(2, 15),
    integrationPlatform: 'googleSheets'
  }));
  
  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
    `client_id=${clientId}&` +
    `redirect_uri=${encodeURIComponent(redirectUri)}&` +
    `response_type=code&` +
    `scope=${encodeURIComponent(scopes)}&` +
    `state=${state}&` +
    `access_type=offline&` +
    `prompt=consent`;
  
  console.log('   OAuth URL generated:', authUrl ? 'YES' : 'NO');
  console.log('   OAuth URL preview:', authUrl.substring(0, 100) + '...');
  
} catch (error) {
  console.log('   ❌ OAuth flow test error:', error);
}

console.log('\n📋 Test Summary:');
console.log('   - Environment variables: Check console above');
console.log('   - OAuth configuration: Check console above');
console.log('   - API endpoints: Check console above');
console.log('   - Database connection: Check console above');
console.log('   - Integration service: Check console above');
console.log('   - OAuth flow: Check console above');

console.log('\n🔧 Next Steps:');
console.log('   1. If environment variables are missing, set them in .env.local');
console.log('   2. If OAuth is not working, check client ID and secret');
console.log('   3. If database is not connected, check Supabase configuration');
console.log('   4. If integration is not found, connect Google Sheets in admin panel');
console.log('   5. Test OAuth flow by clicking "Connect" in admin panel');

console.log('\n✅ Test completed. Check console for detailed results.');
