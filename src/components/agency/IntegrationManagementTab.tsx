import { GoogleSheetsSelector } from '@/components/integration/GoogleSheetsSelector';
import { LogoManager } from '@/components/ui/LogoManager';
import { PageLoader, Spinner } from '@/components/ui/UnifiedLoadingSystem';
import { Button } from '@/components/ui/button-simple';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label-simple';
import { debugLogger } from '@/lib/debug';
import { IntegrationDisplay, TestResult } from '@/services/agency/agencyService';
import { getPlatformConfig } from '@/services/agency/platformConfig';
import { UnifiedIntegrationService } from '@/services/integration/IntegrationService';
import { IntegrationPlatform } from '@/types/integration';
import { AlertCircle, CheckCircle, Copy, Edit, Settings, TestTube, Trash2 } from 'lucide-react';
import React, { useState } from 'react';

interface IntegrationManagementTabProps {
  integrations: IntegrationDisplay[];
  loading: boolean;
  testing: Record<string, boolean>;
  testResults: Record<string, TestResult>;
  onConnectIntegration: (platform: string) => void;
  onDisconnectIntegration: (platform: string) => void;
  onTestConnection: (platform: string) => Promise<TestResult>;
}

export const IntegrationManagementTab: React.FC<IntegrationManagementTabProps> = ({
  integrations,
  loading,
  testing,
  testResults,
  onConnectIntegration,
  onDisconnectIntegration,
  onTestConnection
}) => {
  const [editingIntegration, setEditingIntegration] = useState<string | null>(null);
  const [credentials, setCredentials] = useState<Record<string, Record<string, string>>>({});
  const [showGoogleSheetsSelector, setShowGoogleSheetsSelector] = useState(false);

  const getIntegrationStatusIcon = (status: string) => {
    switch (status) {
      case 'connected':
        return <div className="w-2 h-2 rounded-full bg-emerald-500" />;
      case 'error':
        return <div className="w-2 h-2 rounded-full bg-red-500" />;
      case 'not connected':
        return <div className="w-2 h-2 rounded-full bg-slate-300" />;
      default:
        return <div className="w-2 h-2 rounded-full bg-slate-300" />;
    }
  };

  const getPlatformIcon = (platform: string) => {
    const config = getPlatformConfig(platform);
    if (!config) {
      return <Settings className="h-5 w-5 text-slate-500" />;
    }
    
    return (
      <LogoManager 
        platform={config.icon} 
        size={20} 
        context="agency-panel"
        className="text-slate-500"
        fallback={<Settings className="h-5 w-5 text-slate-500" />}
      />
    );
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      // Could add a toast notification here in the future
    });
  };

  const handleCredentialChange = (platform: string, field: string, value: string) => {
    setCredentials(prev => ({
      ...prev,
      [platform]: {
        ...prev[platform],
        [field]: value
      }
    }));
  };

  const testApiConnection = async (platform: string) => {
    const config = getPlatformConfig(platform);
    // Testing API connection for platform
    // Platform config loaded
    // Checking OAuth requirement
    
    // For OAuth platforms, just trigger the OAuth flow
    if (config?.usesOAuth) {
    // Testing API connection for platform
      await onConnectIntegration(platform);
      return;
    }
    
    // For API key platforms, get credentials from the form
    const platformCredentials = credentials[platform] || {};
    
    // Merge form credentials with default credentials
    const finalCredentials: Record<string, string> = {};
    if (config) {
      config.credentials.forEach(credential => {
        finalCredentials[credential] = platformCredentials[credential] || config.defaultCredentials?.[credential] || '';
      });
    }
    
    // Save credentials to database before testing
    if (Object.keys(finalCredentials).length > 0) {
      try {
        // For API key platforms like Google AI Studio
        if (platform === 'google-ai' && finalCredentials.apiKey) {
          await UnifiedIntegrationService.saveApiKey(platform as IntegrationPlatform, {
            apiKey: finalCredentials.apiKey,
            keyType: 'bearer'
          }, {
            id: 'google-ai-studio',
            name: 'Google AI Studio'
          });
        }
      } catch (error) {
        debugLogger.error('IntegrationManagementTab', 'Failed to save credentials', error);
      }
    }
    
    const result = await onTestConnection(platform);
    
    if (result.success) {
      // Auto-save credentials if test passes
      await onConnectIntegration(platform);
      setEditingIntegration(null);
    }
  };

  const getCredentialInputs = (platform: string) => {
    const config = getPlatformConfig(platform);
    if (!config) {
      return (
        <div className="text-xs text-slate-500">
          Contact support for setup instructions
        </div>
      );
    }

    if (platform === 'googleSheets') {
      return (
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <span className="text-sm font-medium text-green-800">Google Sheets Integration</span>
          </div>
          <p className="text-xs text-green-700">
            Connect your Google account to access and manage Google Sheets for data export and reporting.
          </p>
        </div>
      );
    }

    // For OAuth platforms, show simple connect message
    if (config.usesOAuth) {
      return (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="h-4 w-4 text-emerald-600" />
            <span className="text-sm font-medium text-emerald-800">OAuth Integration</span>
          </div>
          <p className="text-xs text-emerald-700">
            {config.name} uses OAuth for secure authentication. Click "Connect" to authorize with your account.
          </p>
        </div>
      );
    }

    // For API key platforms, show credential inputs
    return (
      <div className="space-y-3">
        {config.credentials.map(credential => (
          <div key={credential}>
            <Label htmlFor={`${platform}-${credential}`} className="text-xs font-medium text-slate-700">
              {config.name} {credential.charAt(0).toUpperCase() + credential.slice(1)}
            </Label>
            <div className="flex items-center gap-2 mt-1">
              <Input
                id={`${platform}-${credential}`}
                type={credential.includes('secret') || credential.includes('key') ? 'password' : 'text'}
                placeholder={config.defaultCredentials?.[credential] || `your_${credential}`}
                value={credentials[platform]?.[credential] || config.defaultCredentials?.[credential] || ''}
                onChange={(e) => handleCredentialChange(platform, credential, e.target.value)}
                className="text-xs h-8 border-slate-200 focus:border-slate-400 focus:ring-slate-400"
              />
              {config.defaultCredentials?.[credential] && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0 hover:bg-slate-100"
                  onClick={() => copyToClipboard(config.defaultCredentials?.[credential] || '')}
                >
                  <Copy className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };

  if (loading) {
    return <PageLoader message="Loading integrations..." />;
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="border-b border-slate-200 pb-6">
        <h2 className="text-xl font-semibold text-slate-900">Integrations</h2>
        <p className="text-sm text-slate-600 mt-1">Connect your marketing platforms and data sources</p>
      </div>

      {/* Integrations Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {integrations.map((integration) => (
          <div key={integration.id} className="group relative">
            <div className="bg-white border border-slate-200 rounded-xl p-6 hover:border-slate-300 hover:shadow-sm transition-all duration-200">
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-slate-50 flex items-center justify-center border border-slate-200">
                    {getPlatformIcon(integration.platform)}
                  </div>
                  <div>
                    <h3 className="font-medium text-slate-900">{integration.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      {getIntegrationStatusIcon(integration.status)}
                      <span className="text-xs text-slate-500 capitalize">{integration.status.replace('_', ' ')}</span>
                    </div>
                  </div>
                </div>
                
                {/* Status Badge */}
                <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                  integration.status === 'connected' 
                    ? 'bg-emerald-50 text-emerald-700' 
                    : integration.status === 'error'
                    ? 'bg-red-50 text-red-700'
                    : 'bg-slate-50 text-slate-600'
                }`}>
                  {integration.status === 'connected' ? 'Active' : 'Inactive'}
                </div>
              </div>

              {/* Content */}
              {integration.status === 'connected' ? (
                <div className="space-y-4">
                  {/* Connected State */}
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <CheckCircle className="h-4 w-4 text-emerald-600" />
                      <span className="text-sm font-medium text-emerald-800">Connected</span>
                    </div>
                    {integration.accountName && (
                      <p className="text-xs text-emerald-700">{integration.accountName}</p>
                    )}
                    <p className="text-xs text-emerald-600 mt-1">Last sync: {integration.lastSync}</p>
                  </div>

                  {/* GoHighLevel Configuration */}
                  {integration.platform === 'goHighLevel' && (
                    <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
                      <div className="flex items-center gap-2 mb-1">
                        <Settings className="h-4 w-4 text-purple-600" />
                        <span className="text-sm font-medium text-purple-800">Per-Client Configuration</span>
                      </div>
                      <p className="text-xs text-purple-700">
                        GoHighLevel is configured individually for each client location. 
                        Each client connects their own GoHighLevel account during setup.
                      </p>
                    </div>
                  )}

                  {/* Google Sheets Configuration */}
                  {integration.platform === 'googleSheets' && (
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Settings className="h-4 w-4 text-blue-600" />
                          <span className="text-sm font-medium text-blue-800">Spreadsheet</span>
                        </div>
                        <Button
                          onClick={() => setShowGoogleSheetsSelector(!showGoogleSheetsSelector)}
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-100"
                        >
                          {showGoogleSheetsSelector ? 'Hide' : 'Configure'}
                        </Button>
                      </div>
                      
                      {showGoogleSheetsSelector && (
                        <GoogleSheetsSelector
                          onSelectionComplete={async (spreadsheetId, sheetName) => {
                            // Google Sheets selection completed
                            
                            try {
                              // Get spreadsheet name from the GoogleSheetsSelector or use a default
                              const _spreadsheetName = 'Selected Spreadsheet';
                              
                              await UnifiedIntegrationService.saveIntegration('googleSheets', {
                                connected: true,
                                lastSync: new Date().toISOString(),
                                syncStatus: 'idle',
                                metadata: {
                                  googleSheets: {
                                    spreadsheetId: spreadsheetId,
                                    sheetName: sheetName
                                  }
                                }
                              });
                              
                              // Google Sheets metadata saved successfully
                              setShowGoogleSheetsSelector(false);
                            } catch (_error) {
                              // Failed to save Google Sheets selection
                            }
                          }}
                        />
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Test Results */}
                  {testResults[integration.platform] && (
                    <div className={`p-3 rounded-lg border ${
                      testResults[integration.platform].success 
                        ? 'bg-emerald-50 border-emerald-200' 
                        : 'bg-red-50 border-red-200'
                    }`}>
                      <div className="flex items-center gap-2">
                        {testResults[integration.platform].success ? (
                          <CheckCircle className="h-4 w-4 text-emerald-600" />
                        ) : (
                          <AlertCircle className="h-4 w-4 text-red-600" />
                        )}
                        <span className={`text-sm font-medium ${
                          testResults[integration.platform].success ? 'text-emerald-800' : 'text-red-800'
                        }`}>
                          {testResults[integration.platform].message}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Credential Input Form */}
                  {editingIntegration === integration.platform && (
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-3">
                      {getCredentialInputs(integration.platform)}
                      
                      <div className="flex items-center gap-2 pt-2">
                        <Button
                          onClick={() => testApiConnection(integration.platform)}
                          disabled={testing[integration.platform]}
                          size="sm"
                          className="h-8 px-3 text-xs"
                        >
                          {testing[integration.platform] ? (
                            <>
                              <Spinner size="sm" className="mr-1" />
                              Testing...
                            </>
                          ) : (
                            <>
                              <TestTube className="h-3 w-3 mr-1" />
                              Test & Save
                            </>
                          )}
                        </Button>
                        
                        <Button
                          onClick={() => setEditingIntegration(null)}
                          variant="outline"
                          size="sm"
                          className="h-8 px-3 text-xs"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Setup Info */}
                  {editingIntegration !== integration.platform && (
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                      <div className="flex items-center gap-2 mb-1">
                        <AlertCircle className="h-4 w-4 text-slate-500" />
                        <span className="text-sm font-medium text-slate-700">
                          {integration.platform === 'goHighLevel' ? 'Per-Client Setup' : 'Setup Required'}
                        </span>
                      </div>
                      <div className="text-xs text-slate-600">
                        {integration.platform === 'goHighLevel' 
                          ? 'GoHighLevel is configured per client. Each client connects their own account during client setup.'
                          : 'Configure credentials to connect this integration'
                        }
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-2 mt-6 pt-4 border-t border-slate-100">
                {integration.status === 'connected' ? (
                  <Button
                    onClick={() => onDisconnectIntegration(integration.platform)}
                    variant="outline"
                    size="sm"
                    className="flex-1 h-8 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 hover:border-red-300"
                  >
                    <Trash2 className="h-3 w-3 mr-1" />
                    Disconnect
                  </Button>
                ) : (
                  <Button
                    onClick={() => setEditingIntegration(editingIntegration === integration.platform ? null : integration.platform)}
                    variant="outline"
                    size="sm"
                    className="flex-1 h-8"
                  >
                    <Edit className="h-3 w-3 mr-1" />
                    {editingIntegration === integration.platform ? 'Cancel' : 'Setup'}
                  </Button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
