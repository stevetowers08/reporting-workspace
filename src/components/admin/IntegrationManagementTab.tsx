import { GHLIntegrationCard } from '@/components/integration/GHLIntegrationCard';
import { GoogleSheetsSelector } from '@/components/integration/GoogleSheetsSelector';
import { LoadingSpinner, LoadingState } from '@/components/ui/LoadingStates';
import { LogoManager } from '@/components/ui/LogoManager';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { debugLogger } from '@/lib/debug';
import { IntegrationDisplay, TestResult } from '@/services/admin/adminService';
import { getPlatformConfig } from '@/services/admin/platformConfig';
import { IntegrationService } from '@/services/integration/IntegrationService';
import { IntegrationPlatform } from '@/types/integration';
import { AlertCircle, CheckCircle, Clock, Copy, Edit, Settings, TestTube, Trash2 } from 'lucide-react';
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
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-600" />;
      case 'not connected':
        return <Clock className="h-5 w-5 text-slate-400" />;
      default:
        return <Clock className="h-5 w-5 text-slate-400" />;
    }
  };

  const getPlatformIcon = (platform: string) => {
    const config = getPlatformConfig(platform);
    if (!config) {
      return <Settings className="h-6 w-6 text-slate-600" />;
    }
    
    return (
      <LogoManager 
        platform={config.icon} 
        size={24} 
        context="admin-panel"
        className="text-slate-600"
        fallback={<Settings className="h-6 w-6 text-slate-600" />}
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
    
    // For OAuth platforms, just trigger the OAuth flow
    if (config?.usesOAuth) {
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
          await IntegrationService.saveApiKey(platform as IntegrationPlatform, {
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
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Copy className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-800">Uses Google Ads Credentials</span>
          </div>
          <p className="text-xs text-blue-700">
            Google Sheets uses the same OAuth credentials as Google Ads. Make sure Google Ads is connected first.
          </p>
        </div>
      );
    }

    // For OAuth platforms, show simple connect message
    if (config.usesOAuth) {
      return (
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <span className="text-sm font-medium text-green-800">OAuth Integration</span>
          </div>
          <p className="text-xs text-green-700">
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
                className="text-xs h-8"
              />
              {config.defaultCredentials?.[credential] && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0 hover:bg-slate-200"
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
    return <LoadingState message="Loading integrations..." />;
  }

  return (
    <div className="space-y-6">
      {/* Go High Level Integration */}
      <div>
        <h3 className="text-lg font-semibold text-slate-900 mb-4">CRM & Marketing Automation</h3>
        <GHLIntegrationCard />
      </div>

      {/* Other Integrations */}
      <div>
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Advertising Platforms</h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {integrations.map((integration) => (
        <div key={integration.id} className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow">
          {/* Header */}
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-slate-50 border border-slate-200">
              {getPlatformIcon(integration.platform)}
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-base font-semibold text-slate-900 truncate">{integration.name}</h4>
              <div className="flex items-center gap-2 mt-1">
                {getIntegrationStatusIcon(integration.status)}
                <span className="text-sm text-slate-600 capitalize">{integration.status.replace('_', ' ')}</span>
              </div>
            </div>
          </div>

          {/* Connection Status */}
          {integration.status === 'connected' ? (
            <div className="space-y-4 mb-4">
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium text-green-800">Connected</span>
                </div>
                {integration.accountName && (
                  <p className="text-xs text-green-700">{integration.accountName}</p>
                )}
                <p className="text-xs text-green-600 mt-1">Last sync: {integration.lastSync}</p>
              </div>

              {/* Google Sheets Selector */}
              {integration.platform === 'googleSheets' && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Settings className="h-4 w-4 text-blue-600" />
                      <span className="text-sm font-medium text-blue-800">Configure Spreadsheet</span>
                    </div>
                    <Button
                      onClick={() => setShowGoogleSheetsSelector(!showGoogleSheetsSelector)}
                      variant="outline"
                      size="sm"
                      className="h-7 px-2 text-xs"
                    >
                      {showGoogleSheetsSelector ? 'Hide' : 'Configure'}
                    </Button>
                  </div>
                  
                  {showGoogleSheetsSelector && (
                    <GoogleSheetsSelector
                      onSelectionComplete={(spreadsheetId, sheetName) => {
                        console.log('Google Sheets selection completed:', { spreadsheetId, sheetName });
                        setShowGoogleSheetsSelector(false);
                        // Optionally refresh integrations or show success message
                      }}
                    />
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4 mb-4">
              {/* Test Results */}
              {testResults[integration.platform] && (
                <div className={`p-3 rounded-lg border ${
                  testResults[integration.platform].success 
                    ? 'bg-green-50 border-green-200' 
                    : 'bg-red-50 border-red-200'
                }`}>
                  <div className="flex items-center gap-2">
                    {testResults[integration.platform].success ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-red-600" />
                    )}
                    <span className={`text-sm font-medium ${
                      testResults[integration.platform].success ? 'text-green-800' : 'text-red-800'
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
                      className="h-8 px-3 text-xs bg-blue-600 hover:bg-blue-700"
                    >
                      {testing[integration.platform] ? (
                        <>
                          <LoadingSpinner size="xs" className="mr-1 border-white border-t-white" />
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

              {/* Quick Setup Info */}
              {editingIntegration !== integration.platform && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle className="h-4 w-4 text-slate-600" />
                    <span className="text-sm font-medium text-slate-800">Setup Required</span>
                  </div>
                  <div className="text-xs text-slate-600">
                    Click "Setup" to configure credentials and test connection
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Action Button */}
          <div className="flex items-center gap-2">
            {integration.status === 'connected' ? (
              <Button
                onClick={() => onDisconnectIntegration(integration.platform)}
                variant="outline"
                size="sm"
                className="flex-1 h-9 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Disconnect
              </Button>
            ) : (
              <Button
                onClick={() => setEditingIntegration(editingIntegration === integration.platform ? null : integration.platform)}
                variant="outline"
                size="sm"
                className="flex-1 h-9"
              >
                <Edit className="h-4 w-4 mr-2" />
                {editingIntegration === integration.platform ? 'Cancel' : 'Setup'}
              </Button>
            )}
          </div>
        </div>
      ))}
        </div>
      </div>
    </div>
  );
};
