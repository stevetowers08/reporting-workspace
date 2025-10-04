import { debugLogger } from '@/lib/debug';
import { GoHighLevelService } from '@/services/api/goHighLevelService';
import { DatabaseService } from '@/services/data/databaseService';

/**
 * Comprehensive test suite for Go High Level integration
 */
export class GHLIntegrationTest {
  
  /**
   * Test 1: Credentials retrieval
   */
  static async testCredentialsRetrieval(): Promise<boolean> {
    try {
      debugLogger.info('GHLTest', 'Testing credentials retrieval');
      
      const credentials = await GoHighLevelService.getCredentials();
      
      if (!credentials) {
        debugLogger.error('GHLTest', 'No credentials found');
        return false;
      }
      
      if (!credentials.client_id || !credentials.client_secret || !credentials.shared_secret) {
        debugLogger.error('GHLTest', 'Incomplete credentials');
        return false;
      }
      
      debugLogger.info('GHLTest', 'Credentials retrieval test passed', {
        hasClientId: !!credentials.client_id,
        hasClientSecret: !!credentials.client_secret,
        hasSharedSecret: !!credentials.shared_secret,
        redirectUri: credentials.redirect_uri
      });
      
      return true;
    } catch (error) {
      debugLogger.error('GHLTest', 'Credentials retrieval test failed', error);
      return false;
    }
  }

  /**
   * Test 2: Authorization URL generation
   */
  static async testAuthorizationUrlGeneration(): Promise<boolean> {
    try {
      debugLogger.info('GHLTest', 'Testing authorization URL generation');
      
      const authUrl = await GoHighLevelService.getAuthorizationUrl();
      
      if (!authUrl || !authUrl.includes('marketplace.gohighlevel.com')) {
        debugLogger.error('GHLTest', 'Invalid authorization URL');
        return false;
      }
      
      if (!authUrl.includes('response_type=code')) {
        debugLogger.error('GHLTest', 'Missing response_type parameter');
        return false;
      }
      
      if (!authUrl.includes('client_id=')) {
        debugLogger.error('GHLTest', 'Missing client_id parameter');
        return false;
      }
      
      debugLogger.info('GHLTest', 'Authorization URL generation test passed', {
        urlLength: authUrl.length,
        hasCorrectDomain: authUrl.includes('marketplace.gohighlevel.com'),
        hasResponseType: authUrl.includes('response_type=code'),
        hasClientId: authUrl.includes('client_id=')
      });
      
      return true;
    } catch (error) {
      debugLogger.error('GHLTest', 'Authorization URL generation test failed', error);
      return false;
    }
  }

  /**
   * Test 3: Database connection methods
   */
  static async testDatabaseMethods(): Promise<boolean> {
    try {
      debugLogger.info('GHLTest', 'Testing database methods');
      
      // Test getGHLConnection (should return null initially)
      const existingConnection = await DatabaseService.getGHLConnection();
      if (existingConnection && existingConnection.connected) {
        debugLogger.warn('GHLTest', 'Existing GHL connection found - this may affect tests');
      }
      
      // Test saveGHLConnection with mock data
      const mockConnectionData = {
        accessToken: 'test_access_token',
        refreshToken: 'test_refresh_token',
        locationId: 'test_location_id',
        expiresIn: 3600
      };
      
      await DatabaseService.saveGHLConnection(mockConnectionData);
      
      // Verify the connection was saved
      const savedConnection = await DatabaseService.getGHLConnection();
      if (!savedConnection || !savedConnection.connected) {
        debugLogger.error('GHLTest', 'Failed to save GHL connection');
        return false;
      }
      
      if (savedConnection.account_id !== mockConnectionData.locationId) {
        debugLogger.error('GHLTest', 'Location ID mismatch');
        return false;
      }
      
      debugLogger.info('GHLTest', 'Database methods test passed', {
        connectionSaved: !!savedConnection,
        locationIdMatch: savedConnection.account_id === mockConnectionData.locationId
      });
      
      return true;
    } catch (error) {
      debugLogger.error('GHLTest', 'Database methods test failed', error);
      return false;
    }
  }

  /**
   * Test 4: Service credential management
   */
  static async testServiceCredentialManagement(): Promise<boolean> {
    try {
      debugLogger.info('GHLTest', 'Testing service credential management');
      
      // Test initial state
      const initialConnected = GoHighLevelService.isConnected();
      if (initialConnected) {
        debugLogger.warn('GHLTest', 'Service already connected - disconnecting first');
        GoHighLevelService.disconnect();
      }
      
      // Test setting credentials
      const testToken = 'test_access_token';
      const testLocationId = 'test_location_id';
      
      GoHighLevelService.setCredentials(testToken, testLocationId);
      
      // Test connection status
      const isConnected = GoHighLevelService.isConnected();
      if (!isConnected) {
        debugLogger.error('GHLTest', 'Service not connected after setting credentials');
        return false;
      }
      
      // Test disconnect
      GoHighLevelService.disconnect();
      const isDisconnected = !GoHighLevelService.isConnected();
      if (!isDisconnected) {
        debugLogger.error('GHLTest', 'Service still connected after disconnect');
        return false;
      }
      
      debugLogger.info('GHLTest', 'Service credential management test passed', {
        initialConnected,
        connectedAfterSet: isConnected,
        disconnectedAfterDisconnect: isDisconnected
      });
      
      return true;
    } catch (error) {
      debugLogger.error('GHLTest', 'Service credential management test failed', error);
      return false;
    }
  }

  /**
   * Test 5: Webhook signature verification
   */
  static async testWebhookSignatureVerification(): Promise<boolean> {
    try {
      debugLogger.info('GHLTest', 'Testing webhook signature verification');
      
      const testPayload = '{"test": "data"}';
      const testSignature = 'sha256=invalid_signature';
      
      // Test with invalid signature (should return false)
      const isValidInvalid = await GoHighLevelService.verifyWebhookSignature(testPayload, testSignature);
      if (isValidInvalid) {
        debugLogger.error('GHLTest', 'Invalid signature was accepted');
        return false;
      }
      
      debugLogger.info('GHLTest', 'Webhook signature verification test passed', {
        invalidSignatureRejected: !isValidInvalid
      });
      
      return true;
    } catch (error) {
      debugLogger.error('GHLTest', 'Webhook signature verification test failed', error);
      return false;
    }
  }

  /**
   * Run all tests
   */
  static async runAllTests(): Promise<{
    passed: number;
    failed: number;
    results: Record<string, boolean>;
  }> {
    debugLogger.info('GHLTest', 'Starting comprehensive GHL integration tests');
    
    const tests = [
      { name: 'Credentials Retrieval', test: this.testCredentialsRetrieval },
      { name: 'Authorization URL Generation', test: this.testAuthorizationUrlGeneration },
      { name: 'Database Methods', test: this.testDatabaseMethods },
      { name: 'Service Credential Management', test: this.testServiceCredentialManagement },
      { name: 'Webhook Signature Verification', test: this.testWebhookSignatureVerification }
    ];
    
    const results: Record<string, boolean> = {};
    let passed = 0;
    let failed = 0;
    
    for (const { name, test } of tests) {
      try {
        const result = await test.call(this);
        results[name] = result;
        if (result) {
          passed++;
        } else {
          failed++;
        }
      } catch (error) {
        debugLogger.error('GHLTest', `Test ${name} threw an error`, error);
        results[name] = false;
        failed++;
      }
    }
    
    debugLogger.info('GHLTest', 'All tests completed', {
      passed,
      failed,
      total: tests.length,
      results
    });
    
    return { passed, failed, results };
  }
}
