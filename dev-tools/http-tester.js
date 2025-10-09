#!/usr/bin/env node

/**
 * Simple HTTP Request Tester
 * Easy way to test API endpoints with various methods and configurations
 */

import { readFileSync } from 'fs';

class HTTPTester {
  constructor() {
    this.baseUrl = process.env.BASE_URL || 'http://localhost:3000';
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };
  }

  /**
   * Make HTTP request with easy configuration
   */
  async request({
    method = 'GET',
    endpoint = '',
    body = null,
    headers = {},
    timeout = 30000,
    verbose = true
  } = {}) {
    const url = endpoint.startsWith('http') ? endpoint : `${this.baseUrl}${endpoint}`;
    const requestHeaders = { ...this.defaultHeaders, ...headers };
    
    const config = {
      method: method.toUpperCase(),
      headers: requestHeaders,
      timeout
    };

    if (body && ['POST', 'PUT', 'PATCH'].includes(method.toUpperCase())) {
      config.body = typeof body === 'string' ? body : JSON.stringify(body);
    }

    if (verbose) {
      console.log(`🚀 ${method.toUpperCase()} ${url}`);
      if (body) console.log('📦 Body:', typeof body === 'string' ? body : JSON.stringify(body, null, 2));
      if (Object.keys(headers).length > 0) console.log('📋 Headers:', headers);
    }

    const startTime = Date.now();
    
    try {
      const response = await fetch(url, config);
      const duration = Date.now() - startTime;
      
      let responseData;
      const contentType = response.headers.get('content-type');
      
      if (contentType && contentType.includes('application/json')) {
        responseData = await response.json();
      } else {
        responseData = await response.text();
      }

      const result = {
        success: response.ok,
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        data: responseData,
        duration: `${duration}ms`,
        url
      };

      if (verbose) {
        console.log(`✅ ${response.status} ${response.statusText} (${duration}ms)`);
        if (response.ok) {
          console.log('📊 Response:', typeof responseData === 'string' ? responseData : JSON.stringify(responseData, null, 2));
        } else {
          console.log('❌ Error:', responseData);
        }
      }

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      const result = {
        success: false,
        error: error.message,
        duration: `${duration}ms`,
        url
      };

      if (verbose) {
        console.log(`❌ ${error.message} (${duration}ms)`);
      }

      return result;
    }
  }

  /**
   * Test multiple endpoints in sequence
   */
  async testEndpoints(endpoints) {
    console.log(`🧪 Testing ${endpoints.length} endpoints...\n`);
    const results = [];

    for (const endpoint of endpoints) {
      const result = await this.request(endpoint);
      results.push({ ...endpoint, ...result });
      console.log(''); // Add spacing
    }

    return results;
  }

  /**
   * Test endpoint with different HTTP methods
   */
  async testMethods(endpoint, methods = ['GET', 'POST', 'PUT', 'DELETE']) {
    console.log(`🔄 Testing ${endpoint} with methods: ${methods.join(', ')}\n`);
    const results = [];

    for (const method of methods) {
      const result = await this.request({ method, endpoint });
      results.push({ method, endpoint, ...result });
      console.log('');
    }

    return results;
  }

  /**
   * Load test configuration from JSON file
   */
  loadConfig(filePath) {
    try {
      const config = JSON.parse(readFileSync(filePath, 'utf8'));
      return config;
    } catch (error) {
      console.error('❌ Failed to load config:', error.message);
      return null;
    }
  }

  /**
   * Run tests from configuration file
   */
  async runFromConfig(configPath) {
    const config = this.loadConfig(configPath);
    if (!config) return;

    if (config.baseUrl) this.baseUrl = config.baseUrl;
    if (config.headers) this.defaultHeaders = { ...this.defaultHeaders, ...config.headers };

    console.log(`📋 Running tests from ${configPath}`);
    console.log(`🌐 Base URL: ${this.baseUrl}\n`);

    if (config.endpoints) {
      return await this.testEndpoints(config.endpoints);
    }

    return [];
  }
}

// CLI Usage
if (import.meta.url === `file://${process.argv[1]}`) {
  const tester = new HTTPTester();
  
  // Parse command line arguments
  const args = process.argv.slice(2);
  const command = args[0];

  console.log(`🔧 HTTP Tester - Base URL: ${tester.baseUrl}`);
  console.log(`📋 Command: ${command}, Args: ${args.join(' ')}`);

  switch (command) {
    case 'get':
      await tester.request({ method: 'GET', endpoint: args[1] });
      break;
    
    case 'post':
      await tester.request({ 
        method: 'POST', 
        endpoint: args[1], 
        body: args[2] ? JSON.parse(args[2]) : null 
      });
      break;
    
    case 'config':
      await tester.runFromConfig(args[1]);
      break;
    
    case 'methods':
      await tester.testMethods(args[1], args.slice(2));
      break;
    
    default:
      console.log(`
🔧 HTTP Tester - Simple API Endpoint Testing

Usage:
  node http-tester.js get <endpoint>           # GET request
  node http-tester.js post <endpoint> [body]    # POST request  
  node http-tester.js config <file.json>       # Run from config file
  node http-tester.js methods <endpoint> [GET,POST,PUT,DELETE]  # Test multiple methods

Examples:
  node http-tester.js get /api/venues
  node http-tester.js post /api/test '{"name":"test"}'
  node http-tester.js config test-config.json
  node http-tester.js methods /api/venues GET POST

Environment Variables:
  BASE_URL - Override default base URL (default: http://localhost:3000)
      `);
  }
}

export default HTTPTester;
