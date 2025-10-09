import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingState } from '@/components/ui/LoadingStates';
import { debugLogger } from '@/lib/debug';
import { GoogleAdsConfigService } from "@/services/config/googleAdsConfigService";
import { AlertCircle, ArrowLeft, CheckCircle, Plus, Settings, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

interface GoogleAdsConfig {
  id?: string;
  developerToken: string;
  clientId: string;
  clientSecret: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

const GoogleAdsConfigPage = () => {
  const [configs, setConfigs] = useState<GoogleAdsConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [testing, setTesting] = useState<Record<string, boolean>>({});
  const [formData, setFormData] = useState({
    developerToken: '',
    clientId: '',
    clientSecret: '',
  });

  useEffect(() => {
    loadConfigs();
  }, []);

  const loadConfigs = async () => {
    try {
      setLoading(true);
      const configsData = await GoogleAdsConfigService.getAllConfigs();
      setConfigs(configsData);
    } catch (error) {
      debugLogger.error('GoogleAdsConfigPage', 'Error loading Google Ads configs', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.developerToken || !formData.clientId || !formData.clientSecret) {
      alert('Please fill in all fields');
      return;
    }

    try {
      await GoogleAdsConfigService.saveConfig({
        developerToken: formData.developerToken,
        clientId: formData.clientId,
        clientSecret: formData.clientSecret,
        isActive: true
      });

      setFormData({ developerToken: '', clientId: '', clientSecret: '' });
      setShowAddForm(false);
      await loadConfigs();
      alert('Google Ads configuration saved successfully!');
    } catch (error) {
      debugLogger.error('GoogleAdsConfigPage', 'Error saving config', error);
      alert('Failed to save configuration');
    }
  };

  const handleTestConfig = async (config: GoogleAdsConfig) => {
    setTesting(prev => ({ ...prev, [config.id!]: true }));
    
    try {
      const result = await GoogleAdsConfigService.testConfig(config);
      
      if (result.success) {
        alert('Configuration test successful!');
      } else {
        alert(`Configuration test failed: ${result.error}`);
      }
    } catch (error) {
      alert('Configuration test failed');
    } finally {
      setTesting(prev => ({ ...prev, [config.id!]: false }));
    }
  };

  const handleDeleteConfig = async (id: string) => {
    if (!confirm('Are you sure you want to delete this configuration?')) {
      return;
    }

    try {
      await GoogleAdsConfigService.deleteConfig(id);
      await loadConfigs();
      alert('Configuration deleted successfully!');
    } catch (error) {
      debugLogger.error('GoogleAdsConfigPage', 'Error deleting config', error);
      alert('Failed to delete configuration');
    }
  };

  const handleSetActive = async (id: string) => {
    try {
      await GoogleAdsConfigService.updateConfig(id, { isActive: true });
      await loadConfigs();
      alert('Configuration activated successfully!');
    } catch (error) {
      debugLogger.error('GoogleAdsConfigPage', 'Error activating config', error);
      alert('Failed to activate configuration');
    }
  };

  return (
    <div className="page-bg-light">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/agency">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Agency
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <Settings className="h-6 w-6 text-red-600" />
              <span className="text-lg font-bold text-gray-900">Google Ads Configuration</span>
            </div>
          </div>
        </div>
      </div>

      <div className="p-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-3">Google Ads API Configuration</h1>
            <p className="text-lg text-gray-600">
              Manage Google Ads API credentials for multiple Google accounts. 
              This allows you to use different developer tokens for different clients.
            </p>
          </div>

          {/* Add Configuration Form */}
          {showAddForm && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Add New Google Ads Configuration</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleAddConfig} className="space-y-4">
                  <div>
                    <Label htmlFor="developerToken">Developer Token</Label>
                    <Input
                      id="developerToken"
                      value={formData.developerToken}
                      onChange={(e) => setFormData(prev => ({ ...prev, developerToken: e.target.value }))}
                      placeholder="Enter Google Ads developer token"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="clientId">Client ID</Label>
                    <Input
                      id="clientId"
                      value={formData.clientId}
                      onChange={(e) => setFormData(prev => ({ ...prev, clientId: e.target.value }))}
                      placeholder="Enter Google OAuth client ID"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="clientSecret">Client Secret</Label>
                    <Input
                      id="clientSecret"
                      type="password"
                      value={formData.clientSecret}
                      onChange={(e) => setFormData(prev => ({ ...prev, clientSecret: e.target.value }))}
                      placeholder="Enter Google OAuth client secret"
                      className="mt-1"
                    />
                  </div>
                  <div className="flex gap-3">
                    <Button type="submit" className="bg-red-600 hover:bg-red-700">
                      Save Configuration
                    </Button>
                    <Button type="button" variant="outline" onClick={() => setShowAddForm(false)}>
                      Cancel
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Add Button */}
          {!showAddForm && (
            <div className="mb-6">
              <Button onClick={() => setShowAddForm(true)} className="bg-red-600 hover:bg-red-700">
                <Plus className="h-4 w-4 mr-2" />
                Add Google Ads Configuration
              </Button>
            </div>
          )}

          {/* Configurations List */}
          {loading ? (
            <LoadingState message="Loading configurations..." />
          ) : configs.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Google Ads Configurations</h3>
                <p className="text-gray-500 mb-4">Add your first Google Ads API configuration to get started.</p>
                <Button onClick={() => setShowAddForm(true)} className="bg-red-600 hover:bg-red-700">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Configuration
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6">
              {configs.map((config) => (
                <Card key={config.id} className={`${config.isActive ? 'border-green-200 bg-green-50' : ''}`}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-red-600 rounded flex items-center justify-center">
                          <span className="text-white font-bold text-sm">G</span>
                        </div>
                        <div>
                          <CardTitle className="text-lg">
                            Google Ads Configuration
                            {config.isActive && (
                              <span className="ml-2 inline-flex items-center rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-800">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Active
                              </span>
                            )}
                          </CardTitle>
                          <p className="text-sm text-gray-500">
                            Created: {config.createdAt ? new Date(config.createdAt).toLocaleDateString() : 'Unknown'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleTestConfig(config)}
                          disabled={testing[config.id!]}
                          className="text-blue-600 hover:text-blue-700"
                        >
                          {testing[config.id!] ? 'Testing...' : 'Test'}
                        </Button>
                        {!config.isActive && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleSetActive(config.id!)}
                            className="text-green-600 hover:text-green-700"
                          >
                            Set Active
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteConfig(config.id!)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <Label className="text-sm font-medium text-gray-600">Developer Token</Label>
                        <p className="text-sm text-gray-900 font-mono bg-gray-100 p-2 rounded">
                          {config.developerToken.substring(0, 8)}...
                        </p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-600">Client ID</Label>
                        <p className="text-sm text-gray-900 font-mono bg-gray-100 p-2 rounded">
                          {config.clientId.substring(0, 20)}...
                        </p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-600">Client Secret</Label>
                        <p className="text-sm text-gray-900 font-mono bg-gray-100 p-2 rounded">
                          {config.clientSecret.substring(0, 8)}...
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Information Card */}
          <Card className="mt-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-blue-600" />
                About Google Ads Authentication
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Why Some Apps Only Need Google Sign-in:</h4>
                <p className="text-sm text-gray-600">
                  Some Google Ads tools use <strong>Service Account</strong> authentication, which allows them to access 
                  Google Ads accounts without requiring individual user OAuth flows. However, for most applications, 
                  you need both OAuth (user consent) and a Developer Token (API access).
                </p>
              </div>
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Our Setup:</h4>
                <p className="text-sm text-gray-600">
                  We use <strong>OAuth 2.0 + Developer Token</strong> because it provides:
                </p>
                <ul className="text-sm text-gray-600 mt-2 ml-4 list-disc">
                  <li>User consent and security</li>
                  <li>Access to multiple Google accounts</li>
                  <li>Proper API rate limiting</li>
                  <li>Compliance with Google's requirements</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default GoogleAdsConfigPage;
