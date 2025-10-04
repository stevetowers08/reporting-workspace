// Test Facebook API directly
const testFacebookAPI = async () => {
  console.log('🔍 Testing Facebook API directly...');
  
  // Get stored tokens
  const storedTokens = localStorage.getItem('oauth_tokens_facebook');
  if (!storedTokens) {
    console.error('❌ No Facebook tokens found in localStorage');
    return;
  }
  
  const tokens = JSON.parse(storedTokens);
  const accessToken = tokens.accessToken;
  
  console.log('✅ Found access token:', accessToken.substring(0, 20) + '...');
  
  try {
    // Test 1: Basic user info
    console.log('📡 Testing /me endpoint...');
    const meResponse = await fetch(`https://graph.facebook.com/v19.0/me?access_token=${accessToken}`);
    const meData = await meResponse.json();
    
    if (meResponse.ok) {
      console.log('✅ /me endpoint working:', meData);
    } else {
      console.error('❌ /me endpoint failed:', meData);
    }
    
    // Test 2: Ad accounts
    console.log('📡 Testing /me/adaccounts endpoint...');
    const accountsResponse = await fetch(`https://graph.facebook.com/v19.0/me/adaccounts?fields=id,name,account_status&access_token=${accessToken}`);
    const accountsData = await accountsResponse.json();
    
    if (accountsResponse.ok) {
      console.log('✅ Ad accounts endpoint working:', accountsData.data?.length, 'accounts found');
    } else {
      console.error('❌ Ad accounts endpoint failed:', accountsData);
    }
    
    // Test 3: Account insights
    console.log('📡 Testing account insights...');
    const insightsResponse = await fetch(`https://graph.facebook.com/v19.0/act_34769891/insights?fields=impressions,clicks,spend,actions&access_token=${accessToken}`);
    const insightsData = await insightsResponse.json();
    
    if (insightsResponse.ok) {
      console.log('✅ Account insights working:', insightsData.data?.length, 'insights records');
    } else {
      console.error('❌ Account insights failed:', insightsData);
    }
    
    // Test 4: Demographics breakdown
    console.log('📡 Testing demographics breakdown...');
    const demoResponse = await fetch(`https://graph.facebook.com/v19.0/act_34769891/insights?fields=impressions,clicks,spend,actions&breakdowns=age,gender&access_token=${accessToken}`);
    const demoData = await demoResponse.json();
    
    if (demoResponse.ok) {
      console.log('✅ Demographics breakdown working:', demoData.data?.length, 'demographic records');
    } else {
      console.error('❌ Demographics breakdown failed:', demoData);
    }
    
    // Test 5: Platform breakdown
    console.log('📡 Testing platform breakdown...');
    const platformResponse = await fetch(`https://graph.facebook.com/v19.0/act_34769891/insights?fields=impressions,clicks,spend,actions&breakdowns=publisher_platform,platform_position&access_token=${accessToken}`);
    const platformData = await platformResponse.json();
    
    if (platformResponse.ok) {
      console.log('✅ Platform breakdown working:', platformData.data?.length, 'platform records');
    } else {
      console.error('❌ Platform breakdown failed:', platformData);
    }
    
  } catch (error) {
    console.error('❌ API test failed:', error);
  }
};

// Run the test
testFacebookAPI();
