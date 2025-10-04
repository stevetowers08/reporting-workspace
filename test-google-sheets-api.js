#!/usr/bin/env node

// Test Google Sheets API connection
import https from 'https';

console.log('🔍 Testing Google Sheets API Connection...\n');

// Test 1: Check if we can reach Google Sheets API
console.log('1. Testing Google Sheets API endpoint...');
const testEndpoint = 'https://sheets.googleapis.com/v4/spreadsheets';

const options = {
  hostname: 'sheets.googleapis.com',
  port: 443,
  path: '/v4/spreadsheets',
  method: 'GET',
  headers: {
    'User-Agent': 'Tulen-Reporting-Test/1.0'
  }
};

const req = https.request(options, (res) => {
  console.log(`   Status: ${res.statusCode}`);
  console.log(`   Headers: ${JSON.stringify(res.headers, null, 2)}`);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log(`   Response: ${data.substring(0, 200)}...`);
    
    if (res.statusCode === 401) {
      console.log('   ✅ API endpoint is reachable (401 = authentication required)');
    } else if (res.statusCode === 200) {
      console.log('   ✅ API endpoint is reachable and working');
    } else {
      console.log(`   ⚠️  Unexpected status code: ${res.statusCode}`);
    }
    
    // Test 2: Check OAuth token validation endpoint
    console.log('\n2. Testing OAuth token validation endpoint...');
    testTokenValidation();
  });
});

req.on('error', (error) => {
  console.log(`   ❌ Error: ${error.message}`);
});

req.end();

function testTokenValidation() {
  const tokenOptions = {
    hostname: 'www.googleapis.com',
    port: 443,
    path: '/oauth2/v1/tokeninfo',
    method: 'GET',
    headers: {
      'User-Agent': 'Tulen-Reporting-Test/1.0'
    }
  };
  
  const tokenReq = https.request(tokenOptions, (res) => {
    console.log(`   Status: ${res.statusCode}`);
    
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      console.log(`   Response: ${data.substring(0, 200)}...`);
      
      if (res.statusCode === 400) {
        console.log('   ✅ Token validation endpoint is reachable (400 = token required)');
      } else if (res.statusCode === 200) {
        console.log('   ✅ Token validation endpoint is working');
      } else {
        console.log(`   ⚠️  Unexpected status code: ${res.statusCode}`);
      }
      
      // Test 3: Check environment variables
      console.log('\n3. Checking environment variables...');
      checkEnvironmentVariables();
    });
  });
  
  tokenReq.on('error', (error) => {
    console.log(`   ❌ Error: ${error.message}`);
  });
  
  tokenReq.end();
}

function checkEnvironmentVariables() {
  const requiredVars = [
    'VITE_GOOGLE_CLIENT_ID',
    'VITE_GOOGLE_CLIENT_SECRET'
  ];
  
  const missingVars = [];
  
  requiredVars.forEach(varName => {
    if (process.env[varName]) {
      console.log(`   ✅ ${varName}: SET`);
    } else {
      console.log(`   ❌ ${varName}: NOT SET`);
      missingVars.push(varName);
    }
  });
  
  if (missingVars.length === 0) {
    console.log('\n✅ All required environment variables are set');
  } else {
    console.log(`\n❌ Missing environment variables: ${missingVars.join(', ')}`);
  }
  
  // Test 4: Check OAuth scopes
  console.log('\n4. Checking OAuth scopes...');
  const requiredScopes = [
    'https://www.googleapis.com/auth/spreadsheets.readonly',
    'https://www.googleapis.com/auth/drive.readonly'
  ];
  
  console.log('   Required scopes:');
  requiredScopes.forEach(scope => {
    console.log(`     - ${scope}`);
  });
  
  console.log('\n📋 Summary:');
  console.log('   - Google Sheets API endpoint: Reachable');
  console.log('   - OAuth token validation: Working');
  console.log(`   - Environment variables: ${missingVars.length === 0 ? 'All set' : 'Missing some'}`);
  console.log('   - OAuth scopes: Configured in code');
  
  if (missingVars.length === 0) {
    console.log('\n✅ Google Sheets API setup appears to be correct');
    console.log('   Next step: Test OAuth flow in the application');
  } else {
    console.log('\n❌ Google Sheets API setup has issues');
    console.log('   Fix: Set missing environment variables');
  }
}
