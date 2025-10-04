// Test Google Ads API directly with current tokens
console.log('=== TESTING GOOGLE ADS API DIRECTLY ===');

// Get tokens from database
const { DatabaseService } = await import('@/services/data/databaseService');
const integrations = await DatabaseService.getIntegrations();
const googleIntegration = integrations.find(i => i.platform === 'googleAds' && i.connected);

if (!googleIntegration?.config?.tokens?.accessToken) {
  console.error('❌ No Google Ads tokens found in database');
} else {
  console.log('✅ Found Google Ads tokens in database');
  
  const accessToken = googleIntegration.config.tokens.accessToken;
  const developerToken = '5D7nPWHfNnpiMgxGOgNLlA'; // From .env.local
  
  console.log('Testing Google Ads API...');
  
  try {
    // Test 1: List accessible customers
    console.log('1. Testing listAccessibleCustomers...');
    const response1 = await fetch('https://googleads.googleapis.com/v14/customers:listAccessibleCustomers', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'developer-token': developerToken,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Response status:', response1.status);
    console.log('Response headers:', Object.fromEntries(response1.headers.entries()));
    
    if (response1.ok) {
      const data1 = await response1.json();
      console.log('✅ listAccessibleCustomers success:', data1);
      
      // Test 2: Get customer details
      if (data1.resourceNames && data1.resourceNames.length > 0) {
        const customerId = data1.resourceNames[0].split('/').pop();
        console.log(`2. Testing customer details for ${customerId}...`);
        
        const query = `
          SELECT 
            customer.id,
            customer.descriptive_name,
            customer.currency_code,
            customer.time_zone
          FROM customer
        `;
        
        const response2 = await fetch(`https://googleads.googleapis.com/v14/customers/${customerId}/googleAds:search`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'developer-token': developerToken,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ query })
        });
        
        console.log('Customer details response status:', response2.status);
        
        if (response2.ok) {
          const data2 = await response2.json();
          console.log('✅ Customer details success:', data2);
        } else {
          const error2 = await response2.text();
          console.error('❌ Customer details failed:', error2);
        }
      }
    } else {
      const error1 = await response1.text();
      console.error('❌ listAccessibleCustomers failed:', error1);
    }
  } catch (error) {
    console.error('❌ API test failed:', error);
  }
}
