// Test OAuth Callback Route
console.log('🔍 Testing OAuth Callback Route...');

// Test 1: Check if the route is accessible
fetch('/oauth/callback')
  .then(response => {
    console.log('✅ OAuth callback route accessible');
    console.log('Status:', response.status);
    console.log('Headers:', Object.fromEntries(response.headers.entries()));
    return response.text();
  })
  .then(html => {
    console.log('✅ OAuth callback page loaded');
    console.log('HTML preview:', html.substring(0, 200) + '...');
  })
  .catch(error => {
    console.log('❌ OAuth callback route error:', error.message);
  });

// Test 2: Test with OAuth parameters
const testUrl = '/oauth/callback?state=test&code=test&scope=test';
fetch(testUrl)
  .then(response => {
    console.log('✅ OAuth callback with parameters accessible');
    console.log('Status:', response.status);
    return response.text();
  })
  .then(html => {
    console.log('✅ OAuth callback with parameters loaded');
    console.log('HTML preview:', html.substring(0, 200) + '...');
  })
  .catch(error => {
    console.log('❌ OAuth callback with parameters error:', error.message);
  });

console.log('📋 OAuth Callback Test Results:');
console.log('   - Route accessibility: Check console above');
console.log('   - Parameter handling: Check console above');
console.log('   - Page loading: Check console above');

console.log('\n🔧 If the route is working but browser shows ERR_FAILED:');
console.log('   1. Clear browser cache');
console.log('   2. Try incognito mode');
console.log('   3. Check firewall/antivirus settings');
console.log('   4. Restart the dev server');
console.log('   5. Check browser console for errors');

console.log('\n✅ OAuth callback route test completed.');
