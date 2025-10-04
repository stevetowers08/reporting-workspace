// Test OAuth Flow Debug
console.log('🔍 OAuth Flow Debug Test...');

// Test 1: Check current OAuth configuration
console.log('1. OAuth Configuration:');
console.log('   Current URL:', window.location.href);
console.log('   Origin:', window.location.origin);
console.log('   Protocol:', window.location.protocol);
console.log('   Host:', window.location.host);

// Test 2: Check if we can generate OAuth URL
console.log('\n2. OAuth URL Generation Test:');
try {
  const clientId = '1040620993822-erpcbjttal5hhgb73gkafdv0dt3vip39.apps.googleusercontent.com';
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
  
  console.log('   ✅ OAuth URL generated successfully');
  console.log('   OAuth URL:', authUrl);
  
  // Store for easy access
  window.debugOAuthUrl = authUrl;
  console.log('   💡 OAuth URL stored in window.debugOAuthUrl');
  
} catch (error) {
  console.log('   ❌ OAuth URL generation failed:', error.message);
}

// Test 3: Check browser security policies
console.log('\n3. Browser Security Check:');
console.log('   User Agent:', navigator.userAgent);
console.log('   Cookie Enabled:', navigator.cookieEnabled);
console.log('   Do Not Track:', navigator.doNotTrack);

// Test 4: Test OAuth callback route
console.log('\n4. OAuth Callback Route Test:');
fetch('/oauth/callback')
  .then(response => {
    console.log('   ✅ OAuth callback route accessible');
    console.log('   Status:', response.status);
    return response.text();
  })
  .then(html => {
    console.log('   ✅ OAuth callback page loaded');
    console.log('   HTML length:', html.length);
  })
  .catch(error => {
    console.log('   ❌ OAuth callback route error:', error.message);
  });

console.log('\n📋 Debug Summary:');
console.log('   - OAuth configuration: Check above');
console.log('   - OAuth URL generation: Check above');
console.log('   - Browser security: Check above');
console.log('   - Callback route: Check above');

console.log('\n🔧 Next Steps:');
console.log('   1. Check Authorized JavaScript Origins in Google Cloud Console');
console.log('   2. Verify OAuth Consent Screen is in Testing mode');
console.log('   3. Add your email as a test user');
console.log('   4. Ensure Google Sheets API is enabled');
console.log('   5. Try the OAuth flow with: window.debugOAuthUrl');

console.log('\n✅ OAuth debug test completed.');
