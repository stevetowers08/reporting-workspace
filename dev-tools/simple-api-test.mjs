#!/usr/bin/env node

/**
 * Simple API Test Runner
 * Tests the running development server endpoints
 */

const baseUrl = 'http://localhost:5173';

async function testEndpoint(method, endpoint, body = null) {
  const url = `${baseUrl}${endpoint}`;
  const options = {
    method: method.toUpperCase(),
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    }
  };

  if (body && ['POST', 'PUT', 'PATCH'].includes(method.toUpperCase())) {
    options.body = typeof body === 'string' ? body : JSON.stringify(body);
  }

  console.log(`🚀 ${method.toUpperCase()} ${url}`);
  if (body) console.log('📦 Body:', typeof body === 'string' ? body : JSON.stringify(body, null, 2));

  const startTime = Date.now();
  
  try {
    const response = await fetch(url, options);
    const duration = Date.now() - startTime;
    
    let responseData;
    const contentType = response.headers.get('content-type');
    
    if (contentType && contentType.includes('application/json')) {
      responseData = await response.json();
    } else {
      responseData = await response.text();
    }

    console.log(`✅ ${response.status} ${response.statusText} (${duration}ms)`);
    console.log('📊 Response:', typeof responseData === 'string' ? responseData : JSON.stringify(responseData, null, 2));
    
    return {
      success: response.ok,
      status: response.status,
      data: responseData,
      duration: `${duration}ms`
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    console.log(`❌ ${error.message} (${duration}ms)`);
    return {
      success: false,
      error: error.message,
      duration: `${duration}ms`
    };
  }
}

async function runTests() {
  console.log('🧪 Running API Endpoint Tests');
  console.log('==============================\n');

  const tests = [
    { method: 'GET', endpoint: '/api/health', name: 'Health Check' },
    { method: 'GET', endpoint: '/api/venues', name: 'Venues API' },
    { method: 'GET', endpoint: '/api/facebook/campaigns', name: 'Facebook Campaigns' },
    { method: 'GET', endpoint: '/api/google/ads/campaigns', name: 'Google Ads Campaigns' },
    { method: 'GET', endpoint: '/api/ghl/contacts', name: 'GoHighLevel Contacts' },
    { method: 'GET', endpoint: '/api/sheets/data', name: 'Google Sheets Data' }
  ];

  const results = [];

  for (const test of tests) {
    console.log(`\n📋 ${test.name}`);
    console.log('─'.repeat(50));
    const result = await testEndpoint(test.method, test.endpoint);
    results.push({ ...test, ...result });
    console.log('');
  }

  // Summary
  console.log('\n📊 Test Summary');
  console.log('===============');
  results.forEach(result => {
    const status = result.success ? '✅' : '❌';
    console.log(`${status} ${result.name}: ${result.status || 'ERROR'} (${result.duration})`);
  });

  const successCount = results.filter(r => r.success).length;
  console.log(`\n🎯 Results: ${successCount}/${results.length} tests passed`);
}

// Run tests if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runTests().catch(console.error);
}

export { runTests, testEndpoint };

