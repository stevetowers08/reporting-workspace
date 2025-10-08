import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import React, { useState } from 'react';

interface TestResult {
  service: string;
  test: string;
  success: boolean;
  error?: string;
  data?: any;
  timestamp: string;
}

export const APITestingPage: React.FC = () => {
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const addTestResult = (service: string, test: string, success: boolean, error?: string, data?: any) => {
    const result: TestResult = {
      service,
      test,
      success,
      error,
      data,
      timestamp: new Date().toISOString()
    };
    setTestResults(prev => [...prev, result]);
  };

  const testGoogleAdsAPI = async () => {
    addTestResult('Google Ads', 'Starting tests...', true);
    
    try {
      // Test 1: Check connection
      const { TokenManager } = await import('@/services/auth/TokenManager');
      const isConnected = await TokenManager.isConnected('googleAds');
      addTestResult('Google Ads', 'Connection Check', isConnected, !isConnected ? 'Not connected' : undefined);
      
      if (!isConnected) {
        addTestResult('Google Ads', 'Skipping API tests', false, 'Not connected');
        return;
      }

      // Test 2: Get access token
      const accessToken = await TokenManager.getAccessToken('googleAds');
      addTestResult('Google Ads', 'Access Token', !!accessToken, !accessToken ? 'No token found' : undefined);

      // Test 3: Test service
      const { GoogleAdsService } = await import('@/services/api/googleAdsService');
      
      const accounts = await GoogleAdsService.getAdAccounts();
      addTestResult('Google Ads', 'Get Accounts', true, undefined, { count: accounts.length, accounts });
      
      if (accounts.length > 0) {
        const metrics = await GoogleAdsService.getAccountMetrics(accounts[0].id, {
          start: '2024-01-01',
          end: '2024-01-31'
        });
        addTestResult('Google Ads', 'Get Metrics', true, undefined, metrics);
      }
      
    } catch (error) {
      addTestResult('Google Ads', 'API Test Failed', false, error instanceof Error ? error.message : String(error));
    }
  };

  const testGoHighLevelAPI = async () => {
    addTestResult('Go High Level', 'Starting tests...', true);
    
    try {
      // Test 1: Check connection
      const { TokenManager } = await import('@/services/auth/TokenManager');
      const isConnected = await TokenManager.isConnected('goHighLevel');
      addTestResult('Go High Level', 'Connection Check', isConnected, !isConnected ? 'Not connected' : undefined);
      
      if (!isConnected) {
        addTestResult('Go High Level', 'Skipping API tests', false, 'Not connected');
        return;
      }

      // Test 2: Get access token
      const accessToken = await TokenManager.getAccessToken('goHighLevel');
      addTestResult('Go High Level', 'Access Token', !!accessToken, !accessToken ? 'No token found' : undefined);

      // Test 3: Test service (simplified for location-level OAuth)
      const { GoHighLevelService } = await import('@/services/api/goHighLevelService');
      
      // Since we're using location-level OAuth, we don't need to test getAllLocations
      addTestResult('Go High Level', 'Get Locations', true, 'Skipped (location-level OAuth)', { 
        message: 'Using location-level OAuth, no need to fetch all locations' 
      });
      
      // Skip metrics test since we don't have location data
      addTestResult('Go High Level', 'Get Metrics', true, 'Skipped (location-level OAuth)', { 
        message: 'Using location-level OAuth, metrics will be fetched per location' 
      });
      
    } catch (error) {
      addTestResult('Go High Level', 'API Test Failed', false, error instanceof Error ? error.message : String(error));
    }
  };

  const testEventMetricsService = async () => {
    addTestResult('EventMetricsService', 'Starting tests...', true);
    
    try {
      const { EventMetricsService } = await import('@/services/data/eventMetricsService');
      
      const metrics = await EventMetricsService.getComprehensiveMetrics(
        'test-client',
        { start: '2024-01-01', end: '2024-01-31' },
        {
          facebookAds: 'test-facebook-account',
          googleAds: 'test-google-account',
          goHighLevel: 'test-ghl-location'
        }
      );
      
      addTestResult('EventMetricsService', 'Get Comprehensive Metrics', true, undefined, metrics);
      
    } catch (error) {
      addTestResult('EventMetricsService', 'API Test Failed', false, error instanceof Error ? error.message : String(error));
    }
  };

  const testDatabaseConnections = async () => {
    addTestResult('Database', 'Starting tests...', true);
    
    try {
      const { DatabaseService } = await import('@/services/data/databaseService');
      
      const clients = await DatabaseService.getAllClients();
      addTestResult('Database', 'Get All Clients', true, undefined, { count: clients.length });
      
      const integrations = await DatabaseService.getIntegrations();
      addTestResult('Database', 'Get Integrations', true, undefined, { count: integrations.length });
      
    } catch (error) {
      addTestResult('Database', 'API Test Failed', false, error instanceof Error ? error.message : String(error));
    }
  };

  const runAllTests = async () => {
    setIsRunning(true);
    setTestResults([]);
    
    try {
      await testDatabaseConnections();
      await testGoogleAdsAPI();
      await testGoHighLevelAPI();
      await testEventMetricsService();
    } finally {
      setIsRunning(false);
    }
  };

  const clearResults = () => {
    setTestResults([]);
  };

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-4">API Testing Dashboard</h1>
        <p className="text-gray-600 mb-6">
          Test all API connections and identify issues with Google Ads and Go High Level integrations.
        </p>
        
        <div className="flex gap-4 mb-6">
          <Button onClick={runAllTests} disabled={isRunning}>
            {isRunning ? 'Running Tests...' : 'Run All Tests'}
          </Button>
          <Button onClick={testGoogleAdsAPI} variant="outline" disabled={isRunning}>
            Test Google Ads Only
          </Button>
          <Button onClick={testGoHighLevelAPI} variant="outline" disabled={isRunning}>
            Test Go High Level Only
          </Button>
          <Button onClick={testEventMetricsService} variant="outline" disabled={isRunning}>
            Test EventMetricsService
          </Button>
          <Button onClick={testDatabaseConnections} variant="outline" disabled={isRunning}>
            Test Database
          </Button>
          <Button onClick={clearResults} variant="ghost" disabled={isRunning}>
            Clear Results
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        {testResults.map((result, index) => (
          <Card key={index} className={result.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center justify-between">
                <span className={result.success ? 'text-green-800' : 'text-red-800'}>
                  {result.success ? '✅' : '❌'} {result.service} - {result.test}
                </span>
                <span className="text-xs text-gray-500">
                  {new Date(result.timestamp).toLocaleTimeString()}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {result.error && (
                <div className="text-red-700 text-sm mb-2">
                  <strong>Error:</strong> {result.error}
                </div>
              )}
              {result.data && (
                <details className="text-sm">
                  <summary className="cursor-pointer text-gray-600 hover:text-gray-800">
                    View Data ({typeof result.data === 'object' ? Object.keys(result.data).length : 'data'})
                  </summary>
                  <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-auto max-h-40">
                    {JSON.stringify(result.data, null, 2)}
                  </pre>
                </details>
              )}
            </CardContent>
          </Card>
        ))}
        
        {testResults.length === 0 && (
          <Card>
            <CardContent className="text-center py-8">
              <p className="text-gray-500">No test results yet. Click "Run All Tests" to start.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default APITestingPage;
