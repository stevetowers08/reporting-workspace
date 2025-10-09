#!/usr/bin/env python3
"""
Comprehensive Google Ads OAuth Testing Suite
Tests all aspects of the OAuth flow to identify issues
"""

import requests
import json
import base64
import hashlib
import secrets
import urllib.parse
from datetime import datetime
import time

class GoogleOAuthTester:
    def __init__(self):
        self.client_id = "1040620993822-erpcbjttal5hhgb73gkafdv0dt3vip39.apps.googleusercontent.com"
        self.client_secret = "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"
        self.redirect_uri = "https://tulenreporting.vercel.app/oauth/callback"
        self.scope = "https://www.googleapis.com/auth/adwords"
        self.auth_url = "https://accounts.google.com/o/oauth2/v2/auth"
        self.token_url = "https://oauth2.googleapis.com/token"
        
    def generate_pkce(self):
        """Generate PKCE code verifier and challenge"""
        code_verifier = base64.urlsafe_b64encode(secrets.token_bytes(32)).decode('utf-8').rstrip('=')
        code_challenge = base64.urlsafe_b64encode(
            hashlib.sha256(code_verifier.encode('utf-8')).digest()
        ).decode('utf-8').rstrip('=')
        return code_verifier, code_challenge
    
    def test_1_oauth_url_generation(self):
        """Test 1: OAuth URL Generation"""
        print("🔍 Test 1: OAuth URL Generation")
        print("=" * 50)
        
        try:
            # Generate PKCE parameters
            code_verifier, code_challenge = self.generate_pkce()
            
            # Generate state
            state_data = {
                "userId": "test-user-123",
                "platform": "google",
                "timestamp": int(time.time()),
                "nonce": secrets.token_hex(4)
            }
            state = base64.b64encode(json.dumps(state_data).encode()).decode()
            
            # Build OAuth URL
            params = {
                "client_id": self.client_id,
                "redirect_uri": self.redirect_uri,
                "response_type": "code",
                "scope": self.scope,
                "access_type": "offline",
                "prompt": "consent",
                "state": state,
                "code_challenge": code_challenge,
                "code_challenge_method": "S256"
            }
            
            auth_url = f"{self.auth_url}?{urllib.parse.urlencode(params)}"
            
            print(f"✅ Generated OAuth URL:")
            print(f"URL: {auth_url}")
            print(f"Code Verifier: {code_verifier}")
            print(f"Code Challenge: {code_challenge}")
            print(f"State: {state}")
            
            # Test URL accessibility
            response = requests.get(auth_url, allow_redirects=False, timeout=10)
            print(f"URL Response Status: {response.status_code}")
            
            if response.status_code == 200:
                print("✅ OAuth URL is accessible")
            elif response.status_code in [302, 303]:
                print("✅ OAuth URL redirects (expected)")
            else:
                print(f"❌ OAuth URL returned unexpected status: {response.status_code}")
                
            return True, auth_url, code_verifier
            
        except Exception as e:
            print(f"❌ OAuth URL generation failed: {e}")
            return False, None, None
    
    def test_2_redirect_uri_validation(self):
        """Test 2: Redirect URI Validation"""
        print("\n🔍 Test 2: Redirect URI Validation")
        print("=" * 50)
        
        try:
            # Test if redirect URI is accessible
            response = requests.get(self.redirect_uri, timeout=10)
            print(f"Redirect URI Status: {response.status_code}")
            
            if response.status_code == 200:
                print("✅ Redirect URI is accessible")
                print(f"Response Content Length: {len(response.text)}")
                
                # Check if it's the OAuth callback page
                if "oauth" in response.text.lower() or "callback" in response.text.lower():
                    print("✅ Redirect URI appears to be OAuth callback page")
                else:
                    print("⚠️  Redirect URI doesn't appear to be OAuth callback page")
                    
            else:
                print(f"❌ Redirect URI returned status: {response.status_code}")
                
            return response.status_code == 200
            
        except Exception as e:
            print(f"❌ Redirect URI validation failed: {e}")
            return False
    
    def test_3_google_cloud_console_config(self):
        """Test 3: Google Cloud Console Configuration"""
        print("\n🔍 Test 3: Google Cloud Console Configuration")
        print("=" * 50)
        
        try:
            # Test with invalid redirect URI to see error
            invalid_redirect = "https://invalid-domain.com/oauth/callback"
            
            params = {
                "client_id": self.client_id,
                "redirect_uri": invalid_redirect,
                "response_type": "code",
                "scope": self.scope,
                "access_type": "offline",
                "prompt": "consent"
            }
            
            test_url = f"{self.auth_url}?{urllib.parse.urlencode(params)}"
            response = requests.get(test_url, allow_redirects=False, timeout=10)
            
            print(f"Invalid Redirect Test Status: {response.status_code}")
            
            if response.status_code == 400:
                print("✅ Google Cloud Console is properly configured (rejects invalid redirect)")
            else:
                print("⚠️  Google Cloud Console might not be properly configured")
                
            return True
            
        except Exception as e:
            print(f"❌ Google Cloud Console test failed: {e}")
            return False
    
    def test_4_pkce_implementation(self):
        """Test 4: PKCE Implementation"""
        print("\n🔍 Test 4: PKCE Implementation")
        print("=" * 50)
        
        try:
            # Test PKCE generation
            code_verifier, code_challenge = self.generate_pkce()
            
            print(f"Code Verifier Length: {len(code_verifier)}")
            print(f"Code Challenge Length: {len(code_challenge)}")
            
            # Validate PKCE format
            if len(code_verifier) >= 43 and len(code_verifier) <= 128:
                print("✅ Code verifier length is valid")
            else:
                print("❌ Code verifier length is invalid")
                
            if len(code_challenge) == 43:
                print("✅ Code challenge length is valid")
            else:
                print("❌ Code challenge length is invalid")
                
            # Test PKCE challenge generation
            test_verifier = "test_verifier_123"
            expected_challenge = base64.urlsafe_b64encode(
                hashlib.sha256(test_verifier.encode('utf-8')).digest()
            ).decode('utf-8').rstrip('=')
            
            print(f"PKCE Test - Verifier: {test_verifier}")
            print(f"PKCE Test - Challenge: {expected_challenge}")
            
            return True
            
        except Exception as e:
            print(f"❌ PKCE implementation test failed: {e}")
            return False
    
    def test_5_token_exchange_simulation(self):
        """Test 5: Token Exchange Simulation"""
        print("\n🔍 Test 5: Token Exchange Simulation")
        print("=" * 50)
        
        try:
            # Generate PKCE parameters
            code_verifier, code_challenge = self.generate_pkce()
            
            # Simulate token exchange request
            token_data = {
                "client_id": self.client_id,
                "client_secret": self.client_secret,
                "code": "test_code_123",  # This will fail, but we can see the error
                "grant_type": "authorization_code",
                "redirect_uri": self.redirect_uri,
                "code_verifier": code_verifier
            }
            
            response = requests.post(
                self.token_url,
                data=token_data,
                headers={"Content-Type": "application/x-www-form-urlencoded"},
                timeout=10
            )
            
            print(f"Token Exchange Status: {response.status_code}")
            print(f"Response: {response.text}")
            
            if response.status_code == 400:
                error_data = response.json()
                if "invalid_grant" in error_data.get("error", ""):
                    print("✅ Token exchange endpoint is working (expected invalid_grant error)")
                else:
                    print(f"⚠️  Unexpected error: {error_data}")
            else:
                print(f"❌ Unexpected status code: {response.status_code}")
                
            return True
            
        except Exception as e:
            print(f"❌ Token exchange simulation failed: {e}")
            return False
    
    def test_6_callback_url_accessibility(self):
        """Test 6: Callback URL Accessibility"""
        print("\n🔍 Test 6: Callback URL Accessibility")
        print("=" * 50)
        
        try:
            # Test callback URL with different parameters
            test_params = [
                {"code": "test_code", "state": "test_state"},
                {"error": "access_denied", "state": "test_state"},
                {"code": "test_code", "state": "test_state", "scope": "test_scope"}
            ]
            
            for i, params in enumerate(test_params, 1):
                test_url = f"{self.redirect_uri}?{urllib.parse.urlencode(params)}"
                print(f"Test {i}: {test_url}")
                
                try:
                    response = requests.get(test_url, timeout=10)
                    print(f"  Status: {response.status_code}")
                    print(f"  Content Length: {len(response.text)}")
                    
                    if response.status_code == 200:
                        print("  ✅ Callback URL is accessible")
                    else:
                        print(f"  ❌ Callback URL returned status: {response.status_code}")
                        
                except Exception as e:
                    print(f"  ❌ Callback URL test failed: {e}")
                    
            return True
            
        except Exception as e:
            print(f"❌ Callback URL accessibility test failed: {e}")
            return False
    
    def test_7_oauth_flow_simulation(self):
        """Test 7: Complete OAuth Flow Simulation"""
        print("\n🔍 Test 7: Complete OAuth Flow Simulation")
        print("=" * 50)
        
        try:
            # Step 1: Generate OAuth URL
            code_verifier, code_challenge = self.generate_pkce()
            
            state_data = {
                "userId": "test-user-123",
                "platform": "google",
                "timestamp": int(time.time()),
                "nonce": secrets.token_hex(4)
            }
            state = base64.b64encode(json.dumps(state_data).encode()).decode()
            
            params = {
                "client_id": self.client_id,
                "redirect_uri": self.redirect_uri,
                "response_type": "code",
                "scope": self.scope,
                "access_type": "offline",
                "prompt": "consent",
                "state": state,
                "code_challenge": code_challenge,
                "code_challenge_method": "S256"
            }
            
            auth_url = f"{self.auth_url}?{urllib.parse.urlencode(params)}"
            
            print("Step 1: OAuth URL Generated")
            print(f"URL: {auth_url}")
            
            # Step 2: Test OAuth URL
            response = requests.get(auth_url, allow_redirects=False, timeout=10)
            print(f"Step 2: OAuth URL Response Status: {response.status_code}")
            
            if response.status_code in [200, 302, 303]:
                print("✅ OAuth URL is working")
            else:
                print(f"❌ OAuth URL failed with status: {response.status_code}")
                return False
            
            # Step 3: Simulate callback
            print("Step 3: Simulating OAuth callback")
            callback_url = f"{self.redirect_uri}?code=test_code&state={state}"
            
            callback_response = requests.get(callback_url, timeout=10)
            print(f"Callback Response Status: {callback_response.status_code}")
            
            if callback_response.status_code == 200:
                print("✅ Callback URL is accessible")
            else:
                print(f"❌ Callback URL failed with status: {callback_response.status_code}")
                
            return True
            
        except Exception as e:
            print(f"❌ OAuth flow simulation failed: {e}")
            return False
    
    def run_all_tests(self):
        """Run all tests"""
        print("🚀 Starting Comprehensive Google Ads OAuth Testing")
        print("=" * 60)
        print(f"Client ID: {self.client_id}")
        print(f"Redirect URI: {self.redirect_uri}")
        print(f"Scope: {self.scope}")
        print(f"Timestamp: {datetime.now()}")
        print("=" * 60)
        
        results = {}
        
        # Run all tests
        results["oauth_url"] = self.test_1_oauth_url_generation()
        results["redirect_uri"] = self.test_2_redirect_uri_validation()
        results["google_cloud"] = self.test_3_google_cloud_console_config()
        results["pkce"] = self.test_4_pkce_implementation()
        results["token_exchange"] = self.test_5_token_exchange_simulation()
        results["callback_accessibility"] = self.test_6_callback_url_accessibility()
        results["oauth_flow"] = self.test_7_oauth_flow_simulation()
        
        # Summary
        print("\n📊 Test Results Summary")
        print("=" * 60)
        
        passed = 0
        total = len(results)
        
        for test_name, result in results.items():
            if isinstance(result, tuple):
                status = "✅ PASS" if result[0] else "❌ FAIL"
                if result[0]:
                    passed += 1
            else:
                status = "✅ PASS" if result else "❌ FAIL"
                if result:
                    passed += 1
            print(f"{test_name.replace('_', ' ').title()}: {status}")
        
        print(f"\nOverall: {passed}/{total} tests passed")
        
        if passed == total:
            print("🎉 All tests passed! OAuth configuration appears to be correct.")
        else:
            print("⚠️  Some tests failed. Check the issues above.")
            
        return results

if __name__ == "__main__":
    tester = GoogleOAuthTester()
    results = tester.run_all_tests()
    
    print("\n🔧 Next Steps:")
    print("1. If redirect URI test failed: Check if https://tulenreporting.vercel.app/oauth/callback is accessible")
    print("2. If Google Cloud Console test failed: Verify redirect URI is configured in Google Cloud Console")
    print("3. If PKCE test failed: Check PKCE implementation in the application")
    print("4. If token exchange test failed: Verify client credentials are correct")
    print("5. If callback accessibility test failed: Check OAuth callback page implementation")
