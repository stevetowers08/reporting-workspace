/**
 * Browser-based HTTP API Tester
 * Simple utility for testing API endpoints in the browser console
 */

class BrowserHTTPTester {
  constructor(baseUrl = 'http://localhost:3000') {
    this.baseUrl = baseUrl;
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };
  }

  /**
   * Make HTTP request using fetch API
   */
  async request({
    method = 'GET',
    endpoint = '',
    body = null,
    headers = {},
    timeout = 30000
  } = {}) {
    const url = endpoint.startsWith('http') ? endpoint : `${this.baseUrl}${endpoint}`;
    const requestHeaders = { ...this.defaultHeaders, ...headers };
    
    const config = {
      method: method.toUpperCase(),
      headers: requestHeaders
    };

    if (body && ['POST', 'PUT', 'PATCH'].includes(method.toUpperCase())) {
      config.body = typeof body === 'string' ? body : JSON.stringify(body);
    }

    console.log(`🚀 ${method.toUpperCase()} ${url}`);
    if (body) console.log('📦 Body:', body);
    if (Object.keys(headers).length > 0) console.log('📋 Headers:', headers);

    const startTime = Date.now();
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      
      const response = await fetch(url, {
        ...config,
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
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

      console.log(`✅ ${response.status} ${response.statusText} (${duration}ms)`);
      console.log('📊 Response:', responseData);

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      const result = {
        success: false,
        error: error.message,
        duration: `${duration}ms`,
        url
      };

      console.log(`❌ ${error.message} (${duration}ms)`);
      return result;
    }
  }

  /**
   * Test multiple endpoints
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
   * Quick test methods for common endpoints
   */
  async testVenues() {
    return await this.request({ method: 'GET', endpoint: '/api/venues' });
  }

  async testFacebook() {
    return await this.request({ method: 'GET', endpoint: '/api/facebook/campaigns' });
  }

  async testGoogle() {
    return await this.request({ method: 'GET', endpoint: '/api/google/ads/campaigns' });
  }

  async testGHL() {
    return await this.request({ method: 'GET', endpoint: '/api/ghl/contacts' });
  }

  async testHealth() {
    return await this.request({ method: 'GET', endpoint: '/api/health' });
  }

  /**
   * Run all quick tests
   */
  async testAll() {
    console.log('🧪 Running all API tests...\n');
    
    const results = {
      venues: await this.testVenues(),
      facebook: await this.testFacebook(),
      google: await this.testGoogle(),
      ghl: await this.testGHL(),
      health: await this.testHealth()
    };

    console.log('\n📊 Test Summary:');
    Object.entries(results).forEach(([service, result]) => {
      const status = result.success ? '✅' : '❌';
      console.log(`${status} ${service}: ${result.status || 'ERROR'} (${result.duration})`);
    });

    return results;
  }
}

// Create global instance for browser console usage
window.apiTester = new BrowserHTTPTester();

// Add convenience methods to window
window.testAPI = (method, endpoint, body) => window.apiTester.request({ method, endpoint, body });
window.testVenues = () => window.apiTester.testVenues();
window.testFacebook = () => window.apiTester.testFacebook();
window.testGoogle = () => window.apiTester.testGoogle();
window.testGHL = () => window.apiTester.testGHL();
window.testAll = () => window.apiTester.testAll();

console.log(`
🔧 Browser HTTP API Tester Loaded!

Quick Commands:
  testAPI('GET', '/api/venues')           # Test specific endpoint
  testVenues()                            # Test venues API
  testFacebook()                          # Test Facebook API
  testGoogle()                            # Test Google API
  testGHL()                               # Test GoHighLevel API
  testAll()                               # Test all APIs

Advanced Usage:
  apiTester.request({ method: 'POST', endpoint: '/api/test', body: {test: true} })
  apiTester.testMethods('/api/venues', ['GET', 'POST'])
  apiTester.testEndpoints([{method: 'GET', endpoint: '/api/venues'}])

Base URL: ${window.apiTester.baseUrl}
`);

export default BrowserHTTPTester;
