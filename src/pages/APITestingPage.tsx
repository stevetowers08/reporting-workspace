import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button-simple';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress-simple';
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { DevAPITester, ServiceTestResults, TestResult } from '../../tests/dev-helpers/api-tester';

interface TestSummary {
  total: number;
  passed: number;
  failed: number;
  successRate: number;
  avgDuration: number;
}

export const APITestingPage: React.FC = () => {
  const navigate = useNavigate();
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [testSummary, setTestSummary] = useState<TestSummary | null>(null);
  const [serviceResults, setServiceResults] = useState<ServiceTestResults | null>(null);

  // Update test summary when results change
  useEffect(() => {
    if (testResults.length > 0) {
      const summary = DevAPITester.getResultsSummary();
      setTestSummary(summary);
    }
  }, [testResults]);

  const runAllTests = async () => {
    setIsRunning(true);
    setTestResults([]);
    setServiceResults(null);
    setTestSummary(null);
    
    try {
      const results = await DevAPITester.testAllEndpoints();
      setServiceResults(results);
      
      // Flatten all results for display
      const allResults = [
        ...results.facebook,
        ...results.google,
        ...results.ghl,
        ...results.database
      ];
      setTestResults(allResults);
    } finally {
      setIsRunning(false);
    }
  };

  const testSpecificService = async (service: 'facebook' | 'google' | 'ghl' | 'database') => {
    setIsRunning(true);
    
    try {
      const results = await DevAPITester.testService(service);
      setTestResults(results);
    } finally {
      setIsRunning(false);
    }
  };

  const testRateLimiting = async (service: string) => {
    setIsRunning(true);
    
    try {
      const results = await DevAPITester.testRateLimiting(service, 5);
      setTestResults(results);
    } finally {
      setIsRunning(false);
    }
  };

  const testErrorHandling = async (service: string) => {
    setIsRunning(true);
    
    try {
      const results = await DevAPITester.testErrorHandling(service);
      setTestResults(results);
    } finally {
      setIsRunning(false);
    }
  };

  const clearResults = () => {
    setTestResults([]);
    setServiceResults(null);
    setTestSummary(null);
    DevAPITester.clearResults();
  };

  const exportResults = () => {
    const exportData = DevAPITester.exportResults();
    const blob = new Blob([exportData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `api-test-results-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 mb-8">
        <div className="max-w-6xl mx-auto px-8">
          <div className="flex items-center h-14">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/agency')}
              className="text-slate-600"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back to Agency
            </Button>
          </div>
        </div>
      </header>

      <div className="p-8 max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-4">API Testing Dashboard</h1>
          <p className="text-gray-600 mb-6">
            Test all API connections and identify issues with Google Ads and Go High Level integrations.
          </p>
        
        {/* Test Summary */}
        {testSummary && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Test Summary</span>
                <Badge variant={testSummary.successRate >= 80 ? 'default' : testSummary.successRate >= 60 ? 'secondary' : 'destructive'}>
                  {testSummary.successRate}% Success Rate
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{testSummary.passed}</div>
                  <div className="text-sm text-gray-600">Passed</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">{testSummary.failed}</div>
                  <div className="text-sm text-gray-600">Failed</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{testSummary.total}</div>
                  <div className="text-sm text-gray-600">Total</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">{testSummary.avgDuration}ms</div>
                  <div className="text-sm text-gray-600">Avg Duration</div>
                </div>
              </div>
              <Progress value={testSummary.successRate} className="w-full" />
            </CardContent>
          </Card>
        )}

        {/* Test Controls */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          <div className="space-y-2">
            <h3 className="font-semibold text-sm text-gray-700">Main Tests</h3>
            <div className="flex flex-wrap gap-2">
              <Button onClick={runAllTests} disabled={isRunning} size="sm">
                {isRunning ? 'Running...' : 'Run All Tests'}
              </Button>
              <Button onClick={clearResults} variant="outline" disabled={isRunning} size="sm">
                Clear Results
              </Button>
              <Button onClick={exportResults} variant="outline" disabled={isRunning || testResults.length === 0} size="sm">
                Export Results
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold text-sm text-gray-700">Service Tests</h3>
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => testSpecificService('facebook')} variant="outline" disabled={isRunning} size="sm">
                Facebook Ads
              </Button>
              <Button onClick={() => testSpecificService('google')} variant="outline" disabled={isRunning} size="sm">
                Google Ads
              </Button>
              <Button onClick={() => testSpecificService('ghl')} variant="outline" disabled={isRunning} size="sm">
                Go High Level
              </Button>
              <Button onClick={() => testSpecificService('database')} variant="outline" disabled={isRunning} size="sm">
                Database
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold text-sm text-gray-700">Advanced Tests</h3>
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => testRateLimiting('GoHighLevel')} variant="outline" disabled={isRunning} size="sm">
                Rate Limiting
              </Button>
              <Button onClick={() => testErrorHandling('GoHighLevel')} variant="outline" disabled={isRunning} size="sm">
                Error Handling
              </Button>
            </div>
          </div>
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
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  {result.duration && (
                    <Badge variant="outline" className="text-xs">
                      {result.duration}ms
                    </Badge>
                  )}
                  <span>{new Date(result.timestamp).toLocaleTimeString()}</span>
                </div>
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
    </div>
  );
};

export default APITestingPage;
