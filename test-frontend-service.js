#!/usr/bin/env node

// Test script to mimic the frontend Google Ads service calls
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

// Load environment variables
config({ path: '.env.local' });
config({ path: '.env.development' });
config({ path: '.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const googleAdsDevToken = process.env.VITE_GOOGLE_ADS_DEVELOPER_TOKEN;

console.log('🔍 Frontend Service Simulation Test');
console.log('===================================');

const supabase = createClient(supabaseUrl, supabaseKey);

// Simulate the TokenManager.getAccessToken function
async function getAccessToken(platform) {
  console.log(`📋 Getting access token for platform: ${platform}`);
  
  try {
    const { data: integrations, error } = await supabase
      .from('integrations')
      .select('*')
      .eq('platform', platform)
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) {
      console.error('❌ Database error:', error);
      return null;
    }

    if (!integrations || integrations.length === 0) {
      console.error('❌ No integration found for platform:', platform);
      return null;
    }

    const integration = integrations[0];
    const tokens = integration.config?.tokens;
    
    if (!tokens || !tokens.accessToken) {
      console.error('❌ No access token found');
      return null;
    }

    // Check if token is expired
    const expiresAt = new Date(tokens.expiresAt);
    const now = new Date();
    
    if (now >= expiresAt) {
      console.log('🔄 Token expired, refreshing...');
      // In real implementation, this would refresh the token
      return null; // For testing, just return null
    }

    console.log('✅ Valid access token found');
    return tokens.accessToken;
    
  } catch (error) {
    console.error('❌ Error getting access token:', error);
    return null;
  }
}

// Simulate the DatabaseService.getIntegrations function
async function getIntegrations() {
  console.log('📋 Getting integrations from database...');
  
  try {
    const { data: integrations, error } = await supabase
      .from('integrations')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Database error:', error);
      return [];
    }

    console.log(`✅ Found ${integrations.length} integrations`);
    return integrations;
    
  } catch (error) {
    console.error('❌ Error getting integrations:', error);
    return [];
  }
}

// Simulate the GoogleAdsService.listAccessibleCustomers function
async function listAccessibleCustomers() {
  console.log('🔍 Starting listAccessibleCustomers...');
  
  try {
    const accessToken = await getAccessToken('googleAds');
    console.log('🔍 Access token check:', accessToken ? 'Found' : 'Not found');
    console.log('🔍 Access token preview:', accessToken ? accessToken.substring(0, 20) + '...' : 'null');
    
    if (!accessToken) {
      throw new Error('No valid access token found');
    }

    console.log('🔍 Getting integrations from database...');
    const integrations = await getIntegrations();
    console.log('🔍 Integrations found:', integrations.length);
    
    const googleAdsIntegration = integrations.find(integration => integration.platform === 'googleAds');
    console.log('🔍 Google Ads integration found:', !!googleAdsIntegration);
    console.log('🔍 Google Ads config:', googleAdsIntegration?.config);
    
    if (!googleAdsIntegration) {
      throw new Error('Google Ads integration not found');
    }

    const managerAccountId = googleAdsIntegration.config?.manager_account_id;
    console.log(`🔍 Manager account ID: ${managerAccountId}`);
    
    if (!managerAccountId) {
      throw new Error('Manager account ID not found');
    }

    console.log(`🔍 Got access token, fetching accounts ONLY from manager account ${managerAccountId}...`);
    
    // Call the API
    const accounts = await getCustomerClientAccounts(managerAccountId, accessToken);
    
    console.log(`🔍 Successfully fetched manager account ${managerAccountId} accounts:`, accounts.length);
    console.log('🔍 Final accounts:', accounts);
    return accounts;
    
  } catch (error) {
    console.error('❌ Error in listAccessibleCustomers:', error);
    throw error;
  }
}

// Simulate the getCustomerClientAccounts function
async function getCustomerClientAccounts(managerCustomerId, accessToken) {
  try {
    console.log(`🔍 Getting customer client accounts for manager ${managerCustomerId}`);
    
    const query = `
      SELECT 
        customer_client.client_customer,
        customer_client.descriptive_name,
        customer_client.manager,
        customer_client.level
      FROM customer_client
    `;

    const developerToken = googleAdsDevToken;
    console.log('🔍 Developer token check:', developerToken ? 'Found' : 'Not found');
    console.log('🔍 Developer token preview:', developerToken ? developerToken.substring(0, 10) + '...' : 'null');
    
    if (!developerToken || developerToken === 'your-google-ads-developer-token') {
      console.error('🔍 Google Ads Developer Token not configured!');
      throw new Error('Google Ads Developer Token not configured. Please run setup-google-ads-env.sh to configure your Google Ads API credentials.');
    }

    const url = `https://googleads.googleapis.com/v21/customers/${managerCustomerId}/googleAds:search`;
    console.log('🔍 API URL:', url);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'developer-token': developerToken,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query: query
      })
    });

    console.log('🔍 API response status:', response.status);
    console.log('🔍 API response ok:', response.ok);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('🔍 API error response:', errorText);
      return [];
    }
    
    const data = await response.json();
    console.log('🔍 API response data:', data);
    const results = data.results || [];
    console.log('🔍 Results count:', results.length);
    
    const accounts = results.map((row) => {
      const customerClient = row.customerClient;
      console.log('🔍 Processing customer client:', customerClient);
      return {
        resourceName: `customers/${customerClient.clientCustomer}`,
        id: customerClient.clientCustomer,
        descriptiveName: customerClient.descriptiveName,
        name: customerClient.descriptiveName,
      };
    });
    
    console.log('🔍 Converted accounts:', accounts);
    return accounts;
    
  } catch (error) {
    console.warn(`❌ Error getting customer_client accounts for ${managerCustomerId}:`, error);
    return [];
  }
}

// Run the test
async function runTest() {
  try {
    console.log('🚀 Starting frontend service simulation...');
    const accounts = await listAccessibleCustomers();
    console.log('\n✅ Test completed successfully!');
    console.log(`📊 Found ${accounts.length} Google Ads accounts`);
    
    if (accounts.length > 0) {
      console.log('📋 First few accounts:');
      accounts.slice(0, 3).forEach((account, index) => {
        console.log(`  ${index + 1}. ${account.name} (ID: ${account.id})`);
      });
    }
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
  }
}

runTest();
