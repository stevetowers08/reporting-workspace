// Test script to check Google Ads API response format
const fetch = require('node-fetch');

async function testGoogleAdsAPI() {
  try {
    console.log('Testing Google Ads API customer_client query...');
    
    // You'll need to replace these with actual values
    const accessToken = 'YOUR_ACCESS_TOKEN';
    const developerToken = 'YOUR_DEVELOPER_TOKEN';
    const managerAccountId = 'YOUR_MANAGER_ACCOUNT_ID';
    
    const query = `
      SELECT 
        customer_client.id, 
        customer_client.descriptive_name,
        customer_client.status,
        customer_client.manager
      FROM customer_client 
      WHERE customer_client.manager = FALSE
        AND customer_client.status = 'ENABLED'
    `;

    console.log('Query:', query);
    console.log('Manager Account ID:', managerAccountId);

    const response = await fetch(`https://googleads.googleapis.com/v20/customers/${managerAccountId}/googleAds:searchStream`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'developer-token': developerToken,
        'login-customer-id': managerAccountId,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ query })
    });

    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorText = await response.text();
      console.log('Error response:', errorText);
      return;
    }

    const data = await response.json();
    console.log('Full response:', JSON.stringify(data, null, 2));
    
    if (data.length > 0 && data[0].results) {
      console.log('Number of results:', data[0].results.length);
      data[0].results.forEach((result, index) => {
        console.log(`Result ${index}:`, JSON.stringify(result, null, 2));
      });
    } else {
      console.log('No results found or unexpected response format');
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

testGoogleAdsAPI();
