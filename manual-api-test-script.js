#!/usr/bin/env node

/**
 * Manual API Endpoint Testing Script
 * 
 * This script provides manual testing capabilities for all API endpoints
 * when automated tests are not sufficient or when testing with real data.
 */

import fs from 'fs';
import http from 'http';
import https from 'https';
import { URL } from 'url';

// Configuration
const CONFIG = {
  baseUrl: process.env.BASE_URL || 'http://localhost:5173',
  supabaseUrl: process.env.SUPABASE_URL || 'http://localhost:54321',
  timeout: 10000,
  retries: 3
};

// Test results storage
const testResults = {
  total: 0,
  passed: 0,
  failed: 0,
  errors: [],
  results: []
};

/**
 * Make HTTP request with retry logic
 */
async function makeRequest(url, options = {}) {
  const urlObj = new URL(url);
  const isHttps = urlObj.protocol === 'https:';
  const client = isHttps ? https : http;
  
  const requestOptions = {
    hostname: urlObj.hostname,
    port: urlObj.port || (isHttps ? 443 : 80),
    path: urlObj.pathname + urlObj.search,
    method: options.method || 'GET',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'API-Test-Script/1.0',
      ...options.headers
    },
    timeout: CONFIG.timeout
  };

  return new Promise((resolve, reject) => {
    const req = client.request(requestOptions, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const jsonData = data ? JSON.parse(data) : {};
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: jsonData,
            raw: data
          });
        } catch (error) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: data,
            raw: data
          });
        }
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    
    if (options.body) {
      req.write(JSON.stringify(options.body));
    }
    
    req.end();
  });
}

/**
 * Test a single endpoint
 */
async function testEndpoint(name, url, options = {}) {
  console.log(`\n🧪 Testing: ${name}`);
  console.log(`   URL: ${url}`);
  
  testResults.total++;
  
  try {
    const response = await makeRequest(url, options);
    
    const success = response.status >= 200 && response.status < 300;
    
    if (success) {
      console.log(`   ✅ Status: ${response.status}`);
      testResults.passed++;
    } else {
      console.log(`   ❌ Status: ${response.status}`);
      testResults.failed++;
    }
    
    // Log response details
    if (response.data && typeof response.data === 'object') {
      console.log(`   📊 Response: ${JSON.stringify(response.data, null, 2)}`);
    } else if (response.raw) {
      console.log(`   📊 Response: ${response.raw.substring(0, 200)}${response.raw.length > 200 ? '...' : ''}`);
    }
    
    testResults.results.push({
      name,
      url,
      status: response.status,
      success,
      response: response.data,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
    testResults.failed++;
    testResults.errors.push({
      name,
      url,
      error: error.message,
      timestamp: new Date().toISOString()
    });
    
    testResults.results.push({
      name,
      url,
      status: 0,
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}

/**
 * Test Frontend API Routes
 */
async function testFrontendRoutes() {
  console.log('\n🌐 Testing Frontend API Routes');
  console.log('================================');
  
  // Test API testing dashboard
  await testEndpoint(
    'API Testing Dashboard',
    `${CONFIG.baseUrl}/api-testing`
  );
  
  // Test OAuth callback (should return error without params)
  await testEndpoint(
    'OAuth Callback (No Params)',
    `${CONFIG.baseUrl}/oauth/callback`
  );
  
  // Test venues API
  await testEndpoint(
    'Get All Venues',
    `${CONFIG.baseUrl}/api/venues`
  );
  
  // Test Google Ads API
  await testEndpoint(
    'Get Google Ads Accounts',
    `${CONFIG.baseUrl}/api/google-ads/accounts`
  );
  
  // Test Google Sheets API
  await testEndpoint(
    'Get Google Sheets',
    `${CONFIG.baseUrl}/api/google-sheets/spreadsheets`
  );
  
  // Test Facebook Ads API
  await testEndpoint(
    'Get Facebook Ads Accounts',
    `${CONFIG.baseUrl}/api/facebook-ads/accounts`
  );
  
  // Test GoHighLevel API
  await testEndpoint(
    'Get GoHighLevel Locations',
    `${CONFIG.baseUrl}/api/ghl/locations`
  );
}

/**
 * Test Supabase Edge Functions
 */
async function testSupabaseFunctions() {
  console.log('\n🔧 Testing Supabase Edge Functions');
  console.log('==================================');
  
  // Test Google Ads config
  await testEndpoint(
    'Google Ads Config',
    `${CONFIG.supabaseUrl}/functions/v1/google-ads-config`
  );
  
  // Test token refresh (should fail without body)
  await testEndpoint(
    'Token Refresh (No Body)',
    `${CONFIG.supabaseUrl}/functions/v1/token-refresh`,
    { method: 'POST' }
  );
  
  // Test Google Ads OAuth (should fail without params)
  await testEndpoint(
    'Google Ads OAuth (No Params)',
    `${CONFIG.supabaseUrl}/functions/v1/google-ads-oauth`
  );
}

/**
 * Test External API Integrations
 */
async function testExternalAPIs() {
  console.log('\n🌍 Testing External API Integrations');
  console.log('=====================================');
  
  // Test Facebook Graph API (should fail without token)
  await testEndpoint(
    'Facebook Graph API (No Token)',
    'https://graph.facebook.com/v18.0/me'
  );
  
  // Test Google Ads API (should fail without token)
  await testEndpoint(
    'Google Ads API (No Token)',
    'https://googleads.googleapis.com/v14/customers:listAccessibleCustomers'
  );
  
  // Test GoHighLevel API (should fail without token)
  await testEndpoint(
    'GoHighLevel API (No Token)',
    'https://services.leadconnectorhq.com/locations'
  );
}

/**
 * Test Error Handling
 */
async function testErrorHandling() {
  console.log('\n🚨 Testing Error Handling');
  console.log('=========================');
  
  // Test 404 endpoints
  await testEndpoint(
    'Non-existent Endpoint',
    `${CONFIG.baseUrl}/api/non-existent`
  );
  
  // Test invalid venue ID
  await testEndpoint(
    'Invalid Venue ID',
    `${CONFIG.baseUrl}/api/venues/invalid-id`
  );
  
  // Test malformed requests
  await testEndpoint(
    'Malformed JSON Request',
    `${CONFIG.supabaseUrl}/functions/v1/token-refresh`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: { invalid: 'json' }
    }
  );
}

/**
 * Test CORS and Headers
 */
async function testCORSAndHeaders() {
  console.log('\n🔒 Testing CORS and Headers');
  console.log('============================');
  
  // Test OPTIONS request
  await testEndpoint(
    'CORS Preflight Request',
    `${CONFIG.baseUrl}/api/venues`,
    { method: 'OPTIONS' }
  );
  
  // Test with different origins
  await testEndpoint(
    'CORS Different Origin',
    `${CONFIG.baseUrl}/api/venues`,
    { headers: { 'Origin': 'https://example.com' } }
  );
}

/**
 * Performance Testing
 */
async function testPerformance() {
  console.log('\n⚡ Testing Performance');
  console.log('======================');
  
  const endpoints = [
    `${CONFIG.baseUrl}/api/venues`,
    `${CONFIG.baseUrl}/api/google-ads/accounts`,
    `${CONFIG.baseUrl}/api/facebook-ads/accounts`,
    `${CONFIG.baseUrl}/api/ghl/locations`
  ];
  
  for (const endpoint of endpoints) {
    const startTime = Date.now();
    
    try {
      await makeRequest(endpoint);
      const duration = Date.now() - startTime;
      
      console.log(`   ⏱️  ${endpoint}: ${duration}ms`);
      
      if (duration > 5000) {
        console.log(`   ⚠️  Slow response: ${duration}ms`);
      }
    } catch (error) {
      console.log(`   ❌ ${endpoint}: ${error.message}`);
    }
  }
}

/**
 * Generate test report
 */
function generateReport() {
  console.log('\n📊 Test Report');
  console.log('===============');
  console.log(`Total Tests: ${testResults.total}`);
  console.log(`Passed: ${testResults.passed} (${((testResults.passed / testResults.total) * 100).toFixed(1)}%)`);
  console.log(`Failed: ${testResults.failed} (${((testResults.failed / testResults.total) * 100).toFixed(1)}%)`);
  
  if (testResults.errors.length > 0) {
    console.log('\n❌ Errors:');
    testResults.errors.forEach(error => {
      console.log(`   - ${error.name}: ${error.error}`);
    });
  }
  
  // Save detailed results
  const reportData = {
    summary: {
      total: testResults.total,
      passed: testResults.passed,
      failed: testResults.failed,
      successRate: ((testResults.passed / testResults.total) * 100).toFixed(1)
    },
    results: testResults.results,
    errors: testResults.errors,
    timestamp: new Date().toISOString(),
    config: CONFIG
  };
  
  fs.writeFileSync('manual-api-test-results.json', JSON.stringify(reportData, null, 2));
  console.log('\n💾 Detailed results saved to: manual-api-test-results.json');
}

/**
 * Main test runner
 */
async function runAllTests() {
  console.log('🚀 Starting Manual API Endpoint Testing');
  console.log('========================================');
  console.log(`Base URL: ${CONFIG.baseUrl}`);
  console.log(`Supabase URL: ${CONFIG.supabaseUrl}`);
  console.log(`Timeout: ${CONFIG.timeout}ms`);
  
  try {
    await testFrontendRoutes();
    await testSupabaseFunctions();
    await testExternalAPIs();
    await testErrorHandling();
    await testCORSAndHeaders();
    await testPerformance();
    
    generateReport();
    
  } catch (error) {
    console.error('\n💥 Test runner error:', error.message);
    process.exit(1);
  }
}

// Command line interface
if (process.argv[1] && process.argv[1].endsWith('manual-api-test-script.js')) {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Manual API Endpoint Testing Script

Usage: node manual-api-test-script.js [options]

Options:
  --help, -h          Show this help message
  --frontend-only     Test only frontend routes
  --supabase-only     Test only Supabase functions
  --external-only     Test only external APIs
  --performance-only  Test only performance
  --base-url URL      Set base URL (default: http://localhost:3000)
  --supabase-url URL  Set Supabase URL (default: http://localhost:54321)
  --timeout MS        Set request timeout (default: 10000)

Examples:
  node manual-api-test-script.js
  node manual-api-test-script.js --frontend-only
  node manual-api-test-script.js --base-url https://your-app.vercel.app
    `);
    process.exit(0);
  }
  
  // Parse command line arguments
  if (args.includes('--base-url')) {
    const index = args.indexOf('--base-url');
    CONFIG.baseUrl = args[index + 1] || CONFIG.baseUrl;
  }
  
  if (args.includes('--supabase-url')) {
    const index = args.indexOf('--supabase-url');
    CONFIG.supabaseUrl = args[index + 1] || CONFIG.supabaseUrl;
  }
  
  if (args.includes('--timeout')) {
    const index = args.indexOf('--timeout');
    CONFIG.timeout = parseInt(args[index + 1]) || CONFIG.timeout;
  }
  
  // Run specific tests based on arguments
  if (args.includes('--frontend-only')) {
    testFrontendRoutes().then(generateReport).catch(console.error);
  } else if (args.includes('--supabase-only')) {
    testSupabaseFunctions().then(generateReport).catch(console.error);
  } else if (args.includes('--external-only')) {
    testExternalAPIs().then(generateReport).catch(console.error);
  } else if (args.includes('--performance-only')) {
    testPerformance().then(generateReport).catch(console.error);
  } else {
    runAllTests();
  }
}

export {
    runAllTests, testCORSAndHeaders, testEndpoint, testErrorHandling, testExternalAPIs, testFrontendRoutes, testPerformance, testSupabaseFunctions
};

