#!/usr/bin/env python3
"""
Detailed OAuth Callback Analysis
Tests what happens when OAuth callback is hit with real parameters
"""

import requests
import json
import base64
import hashlib
import secrets
import urllib.parse
from datetime import datetime

class OAuthCallbackAnalyzer:
    def __init__(self):
        self.redirect_uri = "https://tulenreporting.vercel.app/oauth/callback"
        
    def analyze_callback_response(self, params):
        """Analyze the callback response with specific parameters"""
        print(f"🔍 Testing callback with parameters: {params}")
        
        test_url = f"{self.redirect_uri}?{urllib.parse.urlencode(params)}"
        print(f"URL: {test_url}")
        
        try:
            response = requests.get(test_url, timeout=10)
            print(f"Status: {response.status_code}")
            print(f"Content Length: {len(response.text)}")
            
            # Check response headers
            print(f"Content-Type: {response.headers.get('content-type', 'Not set')}")
            
            # Check if it's HTML
            if 'text/html' in response.headers.get('content-type', ''):
                print("✅ Response is HTML")
                
                # Look for specific content
                content = response.text.lower()
                
                if 'oauth' in content:
                    print("✅ Contains 'oauth' in content")
                else:
                    print("❌ Does not contain 'oauth' in content")
                    
                if 'callback' in content:
                    print("✅ Contains 'callback' in content")
                else:
                    print("❌ Does not contain 'callback' in content")
                    
                if 'error' in content:
                    print("⚠️  Contains 'error' in content")
                    
                if 'success' in content:
                    print("✅ Contains 'success' in content")
                    
                # Check for React/JavaScript indicators
                if 'react' in content or 'jsx' in content:
                    print("✅ Appears to be a React application")
                    
                # Check for loading states
                if 'loading' in content:
                    print("⚠️  Contains 'loading' - might be loading state")
                    
            else:
                print(f"❌ Response is not HTML: {response.headers.get('content-type')}")
                
            return response
            
        except Exception as e:
            print(f"❌ Request failed: {e}")
            return None
    
    def test_realistic_oauth_callback(self):
        """Test with realistic OAuth callback parameters"""
        print("🚀 Testing Realistic OAuth Callback Scenarios")
        print("=" * 60)
        
        # Generate realistic state
        state_data = {
            "userId": "test-user-123",
            "platform": "google",
            "timestamp": int(datetime.now().timestamp()),
            "nonce": secrets.token_hex(4)
        }
        state = base64.b64encode(json.dumps(state_data).encode()).decode()
        
        # Test scenarios
        scenarios = [
            {
                "name": "Successful OAuth Callback",
                "params": {
                    "code": "4/0AX4XfWh_test_code_123",
                    "state": state,
                    "scope": "https://www.googleapis.com/auth/adwords"
                }
            },
            {
                "name": "OAuth Error - Access Denied",
                "params": {
                    "error": "access_denied",
                    "state": state
                }
            },
            {
                "name": "OAuth Error - Invalid Request",
                "params": {
                    "error": "invalid_request",
                    "state": state
                }
            },
            {
                "name": "Missing Code Parameter",
                "params": {
                    "state": state
                }
            },
            {
                "name": "Missing State Parameter",
                "params": {
                    "code": "4/0AX4XfWh_test_code_123"
                }
            },
            {
                "name": "Empty Parameters",
                "params": {}
            }
        ]
        
        results = {}
        
        for scenario in scenarios:
            print(f"\n📋 {scenario['name']}")
            print("-" * 40)
            
            response = self.analyze_callback_response(scenario['params'])
            results[scenario['name']] = response is not None
            
        return results
    
    def test_callback_page_content(self):
        """Test the callback page content in detail"""
        print("\n🔍 Detailed Callback Page Content Analysis")
        print("=" * 60)
        
        try:
            response = requests.get(self.redirect_uri, timeout=10)
            
            if response.status_code == 200:
                content = response.text
                
                print(f"Content Length: {len(content)}")
                print(f"Content Type: {response.headers.get('content-type')}")
                
                # Look for specific patterns
                patterns = [
                    'oauth',
                    'callback',
                    'google',
                    'ads',
                    'error',
                    'success',
                    'loading',
                    'react',
                    'javascript',
                    'token',
                    'auth',
                    'redirect'
                ]
                
                print("\n📊 Content Analysis:")
                for pattern in patterns:
                    count = content.lower().count(pattern)
                    if count > 0:
                        print(f"  '{pattern}': {count} occurrences")
                
                # Check for common OAuth callback elements
                oauth_elements = [
                    'OAuthCallback',
                    'handleOAuthCallback',
                    'searchParams',
                    'useSearchParams',
                    'code',
                    'state',
                    'error'
                ]
                
                print("\n🔍 OAuth-specific Elements:")
                for element in oauth_elements:
                    if element in content:
                        print(f"  ✅ Found: {element}")
                    else:
                        print(f"  ❌ Missing: {element}")
                
                # Check for error handling
                error_handling = [
                    'try',
                    'catch',
                    'error',
                    'Error',
                    'exception'
                ]
                
                print("\n🛡️ Error Handling:")
                for handler in error_handling:
                    if handler in content:
                        print(f"  ✅ Found: {handler}")
                    else:
                        print(f"  ❌ Missing: {handler}")
                        
            else:
                print(f"❌ Failed to fetch callback page: {response.status_code}")
                
        except Exception as e:
            print(f"❌ Error analyzing callback page: {e}")
    
    def run_comprehensive_analysis(self):
        """Run comprehensive OAuth callback analysis"""
        print("🚀 Starting Comprehensive OAuth Callback Analysis")
        print("=" * 60)
        print(f"Callback URL: {self.redirect_uri}")
        print(f"Timestamp: {datetime.now()}")
        print("=" * 60)
        
        # Test realistic scenarios
        results = self.test_realistic_oauth_callback()
        
        # Analyze callback page content
        self.test_callback_page_content()
        
        # Summary
        print("\n📊 Analysis Summary")
        print("=" * 60)
        
        passed = sum(1 for result in results.values() if result)
        total = len(results)
        
        print(f"Callback Response Tests: {passed}/{total} passed")
        
        for test_name, result in results.items():
            status = "✅ PASS" if result else "❌ FAIL"
            print(f"  {test_name}: {status}")
        
        print("\n🔧 Recommendations:")
        print("1. Check if OAuth callback page is properly handling URL parameters")
        print("2. Verify that the callback page is extracting 'code' and 'state' parameters")
        print("3. Ensure error handling is working for OAuth errors")
        print("4. Check browser console for JavaScript errors during OAuth flow")
        print("5. Verify that the callback page is calling the correct OAuth service")

if __name__ == "__main__":
    analyzer = OAuthCallbackAnalyzer()
    analyzer.run_comprehensive_analysis()
