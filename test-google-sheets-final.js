// Comprehensive Google Sheets Integration Test
// This test verifies that Google Sheets integration is working correctly

console.log('🔍 Comprehensive Google Sheets Integration Test...\n');

// Test 1: Check if we have Google OAuth tokens
console.log('1. Checking Google OAuth tokens...');
fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/integrations?select=platform,connected,config&platform=eq.googleAds`, {
  headers: {
    'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
  }
})
.then(response => response.json())
.then(data => {
  console.log('   Google Ads Integration:', data);
  
  if (data && data.length > 0 && data[0].connected) {
    const integration = data[0];
    const tokens = integration.config?.tokens;
    
    if (tokens?.accessToken) {
      console.log('   ✅ Google OAuth tokens found');
      console.log('   Access Token:', tokens.accessToken.substring(0, 20) + '...');
      console.log('   Scopes:', tokens.scope);
      
      // Check if Sheets scope is included
      if (tokens.scope && tokens.scope.includes('spreadsheets.readonly')) {
        console.log('   ✅ Google Sheets scope included');
        
        // Test 2: Test Google Sheets API with the token
        console.log('\n2. Testing Google Sheets API...');
        return fetch('https://sheets.googleapis.com/v4/spreadsheets', {
          headers: {
            'Authorization': `Bearer ${tokens.accessToken}`,
            'Content-Type': 'application/json'
          }
        });
      } else {
        console.log('   ❌ Google Sheets scope not included');
        throw new Error('Google Sheets scope not included in OAuth token');
      }
    } else {
      console.log('   ❌ No access token found');
      throw new Error('No access token found');
    }
  } else {
    console.log('   ❌ Google Ads integration not connected');
    throw new Error('Google Ads integration not connected');
  }
})
.then(response => {
  if (response) {
    console.log('   Sheets API Status:', response.status);
    
    if (response.status === 200) {
      console.log('   ✅ Google Sheets API working');
      return response.json();
    } else if (response.status === 401) {
      console.log('   ❌ Google Sheets API: Unauthorized (token expired?)');
      throw new Error('Google Sheets API unauthorized');
    } else {
      console.log('   ⚠️  Google Sheets API: Unexpected status');
      throw new Error(`Google Sheets API unexpected status: ${response.status}`);
    }
  }
})
.then(data => {
  if (data) {
    console.log('   Response:', data);
  }
})
.catch(error => {
  console.log('   ❌ Error:', error.message);
});

// Test 3: Test Google Sheets service directly
console.log('\n3. Testing Google Sheets service...');
try {
  // Import the Google Sheets service
  import('/src/services/api/googleSheetsService.js')
    .then(module => {
      console.log('   Google Sheets service imported successfully');
      
      // Test getting sheets accounts
      return module.GoogleSheetsService.getSheetsAccounts();
    })
    .then(accounts => {
      console.log('   Google Sheets accounts:', accounts);
      if (accounts && accounts.length > 0) {
        console.log('   ✅ Google Sheets service working');
      } else {
        console.log('   ⚠️  No Google Sheets accounts found');
      }
    })
    .catch(error => {
      console.log('   ❌ Google Sheets service error:', error.message);
    });
} catch (error) {
  console.log('   ❌ Import error:', error.message);
}

// Test 4: Test OAuth flow
console.log('\n4. Testing OAuth flow...');
try {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '1040620993822-erpcbjttal5hhgb73gkafdv0dt3vip39.apps.googleusercontent.com';
  const redirectUri = 'http://localhost:8080/oauth/callback';
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
  console.log('   OAuth URL:', authUrl);
  
  // Store for easy access
  window.googleSheetsAuthUrl = authUrl;
  console.log('   💡 OAuth URL stored in window.googleSheetsAuthUrl');
  
} catch (error) {
  console.log('   ❌ OAuth flow error:', error.message);
}

// Test 5: Test database connection
console.log('\n5. Testing database connection...');
fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/integrations?select=platform,connected&limit=5`, {
  headers: {
    'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
  }
})
.then(response => response.json())
.then(data => {
  console.log('   Database Status:', response.status);
  console.log('   Integrations:', data);
  
  if (response.status === 200) {
    console.log('   ✅ Database connected');
  } else {
    console.log('   ❌ Database connection failed');
  }
})
.catch(error => {
  console.log('   ❌ Database error:', error.message);
});

console.log('\n📋 Test Summary:');
console.log('   - Google OAuth tokens: Check console above');
console.log('   - Google Sheets API: Check console above');
console.log('   - Google Sheets service: Check console above');
console.log('   - OAuth flow: Check console above');
console.log('   - Database connection: Check console above');

console.log('\n🔧 Next Steps:');
console.log('   1. If OAuth tokens are missing, connect Google Ads in admin panel');
console.log('   2. If Sheets API fails, check token expiration');
console.log('   3. If service fails, check implementation');
console.log('   4. To test OAuth flow, visit: window.googleSheetsAuthUrl');
console.log('   5. Check admin panel for integration status');

console.log('\n✅ Test completed. Check console for detailed results.');
