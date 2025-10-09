const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function testGoogleAdsAPI() {
  try {
    console.log('🔍 Testing Google Ads API access...');
    
    // Get Google Ads integration data
    const { data: integration, error } = await supabase
      .from('integrations')
      .select('config')
      .eq('platform', 'googleAds')
      .eq('connected', true)
      .single();
    
    if (error || !integration) {
      console.log('❌ No Google Ads integration found');
      return;
    }
    
    console.log('✅ Found Google Ads integration');
    
    // Get access token (it's encrypted, so we need to decrypt it)
    const config = integration.config;
    const encryptedToken = config.tokens?.accessToken;
    
    if (!encryptedToken) {
      console.log('❌ No access token found');
      return;
    }
    
    console.log('✅ Found encrypted access token');
    console.log('Token length:', encryptedToken.length);
    
    // Simple decryption (same as TokenManager)
    const ENCRYPTION_KEY = 'your-32-character-secret-key-here';
    function decrypt(encryptedText) {
      try {
        const text = Buffer.from(encryptedText, 'base64').toString();
        let result = '';
        for (let i = 0; i < text.length; i++) {
          result += String.fromCharCode(text.charCodeAt(i) ^ ENCRYPTION_KEY.charCodeAt(i % ENCRYPTION_KEY.length));
        }
        return result;
      } catch (error) {
        console.error('Decryption error:', error);
        return null;
      }
    }
    
    const accessToken = decrypt(encryptedToken);
    if (!accessToken) {
      console.log('❌ Failed to decrypt access token');
      return;
    }
    
    console.log('✅ Successfully decrypted access token');
    console.log('Token starts with:', accessToken.substring(0, 20) + '...');
    
    // Test API call to get accessible customers
    const developerToken = process.env.VITE_GOOGLE_ADS_DEVELOPER_TOKEN || '5D7nPWHfNnpiMgxGOgNLlA';
    console.log('Developer token:', developerToken ? 'Present' : 'Missing');
    
    const response = await fetch('https://googleads.googleapis.com/v20/customers:listAccessibleCustomers', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'developer-token': developerToken,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.log('❌ API call failed:', response.status, errorText);
      return;
    }
    
    const data = await response.json();
    const customers = data.resourceNames || [];
    
    console.log(`✅ Found ${customers.length} accessible customers:`);
    customers.forEach((customer, index) => {
      const customerId = customer.split('/').pop();
      console.log(`  ${index + 1}. Customer ID: ${customerId}`);
    });
    
    // Now get details for each customer
    console.log('\n🔍 Getting details for each customer...');
    const individualAccounts = [];
    
    for (const resourceName of customers) {
      const customerId = resourceName.split('/').pop();
      
      try {
        const customerResponse = await fetch(`https://googleads.googleapis.com/v20/customers/${customerId}`, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'developer-token': developerToken,
            'Content-Type': 'application/json'
          }
        });
        
        if (customerResponse.ok) {
          const customerData = await customerResponse.json();
          const isManagerAccount = customerData.testAccountAccess === 'MANAGER';
          
          console.log(`\n📊 Customer ${customerId}:`);
          console.log(`   Name: ${customerData.descriptiveName || 'Unknown'}`);
          console.log(`   Type: ${isManagerAccount ? 'MANAGER ACCOUNT' : 'INDIVIDUAL AD ACCOUNT'}`);
          console.log(`   Currency: ${customerData.currencyCode || 'USD'}`);
          console.log(`   Timezone: ${customerData.timeZone || 'UTC'}`);
          
          if (!isManagerAccount) {
            console.log(`   ✅ This is an individual ad account we can use!`);
            individualAccounts.push({
              id: customerId,
              name: customerData.descriptiveName || `Ad Account ${customerId}`,
              currency: customerData.currencyCode || 'USD',
              timezone: customerData.timeZone || 'UTC'
            });
          }
        } else {
          console.log(`❌ Failed to get details for customer ${customerId}`);
        }
      } catch (error) {
        console.log(`❌ Error getting details for customer ${customerId}:`, error.message);
      }
    }
    
    console.log(`\n🎯 SUMMARY: Found ${individualAccounts.length} individual ad accounts:`);
    individualAccounts.forEach((account, index) => {
      console.log(`  ${index + 1}. ${account.name} (${account.id})`);
    });
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testGoogleAdsAPI();
