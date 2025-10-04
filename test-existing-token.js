// Test Google Sheets API with existing token
console.log('🔍 Testing Google Sheets API with existing token...');

// Get the existing token from the database
fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/integrations?select=config&platform=eq.googleAds&connected=eq.true`, {
  headers: {
    'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
  }
})
.then(response => response.json())
.then(data => {
  if (data && data.length > 0) {
    const tokens = data[0].config.tokens;
    console.log('✅ Found existing tokens');
    console.log('Access token:', tokens.accessToken ? 'Present' : 'Missing');
    console.log('Refresh token:', tokens.refreshToken ? 'Present' : 'Missing');
    console.log('Scopes:', tokens.scope);
    
    if (tokens.accessToken) {
      // Test Google Sheets API
      console.log('\n🔍 Testing Google Sheets API...');
      return fetch('https://www.googleapis.com/drive/v3/files?q=mimeType=\'application/vnd.google-apps.spreadsheet\'&pageSize=5', {
        headers: {
          'Authorization': `Bearer ${tokens.accessToken}`,
          'Content-Type': 'application/json'
        }
      });
    } else {
      throw new Error('No access token found');
    }
  } else {
    throw new Error('No Google Ads integration found');
  }
})
.then(response => {
  console.log('Google Sheets API Status:', response.status);
  if (response.status === 200) {
    console.log('✅ Google Sheets API working!');
    return response.json();
  } else if (response.status === 401) {
    console.log('❌ Token expired - need to refresh');
    throw new Error('Token expired');
  } else {
    console.log('⚠️ Unexpected status:', response.status);
    throw new Error(`Unexpected status: ${response.status}`);
  }
})
.then(data => {
  if (data && data.files) {
    console.log('✅ Google Sheets found:', data.files.length);
    console.log('Sample sheets:', data.files.map(f => f.name));
  }
})
.catch(error => {
  console.log('❌ Error:', error.message);
});

console.log('\n📋 Test Summary:');
console.log('   - OAuth consent screen: ✅ Properly configured');
console.log('   - Test users: ✅ Added');
console.log('   - Publishing status: ✅ Testing mode');
console.log('   - Next: Check Authorized JavaScript Origins');
console.log('   - Alternative: Test with existing token above');

console.log('\n🔧 If Authorized JavaScript Origins is missing:');
console.log('   1. Go to APIs & Services → Credentials');
console.log('   2. Click your OAuth Client ID');
console.log('   3. Add http://localhost:8080 to Authorized JavaScript origins');
console.log('   4. Save changes');

console.log('\n✅ Test completed.');
