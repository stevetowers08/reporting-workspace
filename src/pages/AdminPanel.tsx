import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DatabaseService } from "@/services/databaseService";
import { OAuthService } from "@/services/oauthService";
import {
    AlertCircle,
    ArrowLeft,
    BarChart3,
    CheckCircle,
    Eye,
    FileDown,
    FileSpreadsheet,
    Globe,
    Link as LinkIcon,
    Plus,
    Trash2,
    Zap
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import AddClientModal from "./AddClientModal";

interface Client {
  id: string;
  name: string;
  logo_url?: string;
  accounts: {
    facebookAds?: string;
    googleAds?: string;
    goHighLevel?: string;
    googleSheets?: string;
  };
  status: 'active' | 'paused' | 'inactive';
  shareable_link: string;
}

interface Integration {
  id: string;
  name: string;
  platform: string;
  status: 'connected' | 'not connected' | 'error';
  lastSync: string;
  clientsUsing: number;
}

const AdminPanel = () => {
  const [activeTab, setActiveTab] = useState("clients");
  const [showAddClientModal, setShowAddClientModal] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState<Record<string, boolean>>({});
  const [deleting, setDeleting] = useState<Record<string, boolean>>({});

  useEffect(() => {
    loadClients();
    loadIntegrations();
  }, []);

  const loadClients = async () => {
    try {
      setLoading(true);
      const clientsData = await DatabaseService.getAllClients();
      setClients(clientsData);
    } catch (error) {
      console.error('Error loading clients:', error);
      // Fallback to empty array
      setClients([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddClient = async (clientData: {
    name: string;
    logo_url?: string;
    accounts: {
      facebookAds?: string;
      googleAds?: string;
      goHighLevel?: string;
      googleSheets?: string;
    };
    conversionActions?: {
      facebookAds?: string;
      googleAds?: string;
    };
  }) => {
    try {
      const newClient = await DatabaseService.createClient(clientData);
      setClients(prev => [...prev, newClient]);

      // Dispatch custom event to notify other components
      window.dispatchEvent(new CustomEvent('clientAdded', { detail: newClient }));

      alert(`Client "${newClient.name}" created successfully!`);
    } catch (error) {
      console.error('Error creating client:', error);
      alert(`Failed to create client: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const [integrations, setIntegrations] = useState<Integration[]>([]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      case 'not connected':
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected':
        return 'bg-green-100 text-green-700 border border-green-200';
      case 'error':
        return 'bg-red-100 text-red-700 border border-red-200';
      case 'not connected':
        return 'bg-gray-100 text-gray-600 border border-gray-200';
      default:
        return 'bg-gray-100 text-gray-600 border border-gray-200';
    }
  };


  const loadIntegrations = async () => {
    try {
      const integrationsData = await DatabaseService.getIntegrations();
      const clientCounts = await getClientCounts();

      const integrationsList: Integration[] = [
        {
          id: "fb1",
          name: "Facebook Business Manager",
          platform: "facebook",
          status: integrationsData.find(i => i.platform === 'facebookAds')?.connected ? "connected" : "not connected",
          lastSync: integrationsData.find(i => i.platform === 'facebookAds')?.last_sync ?
            new Date(integrationsData.find(i => i.platform === 'facebookAds')!.last_sync!).toLocaleString() : "Never",
          clientsUsing: clientCounts.facebookAds
        },
        {
          id: "ga1",
          name: "Google Ads Manager",
          platform: "google",
          status: integrationsData.find(i => i.platform === 'googleAds')?.connected ? "connected" : "not connected",
          lastSync: integrationsData.find(i => i.platform === 'googleAds')?.last_sync ?
            new Date(integrationsData.find(i => i.platform === 'googleAds')!.last_sync!).toLocaleString() : "Never",
          clientsUsing: clientCounts.googleAds
        },
        {
          id: "ghl1",
          name: "Go High Level",
          platform: "gohighlevel",
          status: integrationsData.find(i => i.platform === 'goHighLevel')?.connected ? "connected" : "not connected",
          lastSync: integrationsData.find(i => i.platform === 'goHighLevel')?.last_sync ?
            new Date(integrationsData.find(i => i.platform === 'goHighLevel')!.last_sync!).toLocaleString() : "Never",
          clientsUsing: clientCounts.goHighLevel
        },
        {
          id: "gs1",
          name: "Google Sheets",
          platform: "googlesheets",
          status: integrationsData.find(i => i.platform === 'googleSheets')?.connected ? "connected" : "not connected",
          lastSync: integrationsData.find(i => i.platform === 'googleSheets')?.last_sync ?
            new Date(integrationsData.find(i => i.platform === 'googleSheets')!.last_sync!).toLocaleString() : "Never",
          clientsUsing: clientCounts.googleSheets
        }
      ];

      setIntegrations(integrationsList);
    } catch (error) {
      console.error('Error loading integrations:', error);
      setIntegrations([]);
    }
  };

  const getClientCounts = async () => {
    try {
      const clients = await DatabaseService.getAllClients();
      return {
        facebookAds: clients.filter(c => c.accounts?.facebookAds && c.accounts.facebookAds !== 'none').length,
        googleAds: clients.filter(c => c.accounts?.googleAds && c.accounts.googleAds !== 'none').length,
        goHighLevel: clients.filter(c => c.accounts?.goHighLevel && c.accounts.goHighLevel !== 'none').length,
        googleSheets: clients.filter(c => c.accounts?.googleSheets && c.accounts.googleSheets !== 'none').length
      };
    } catch (error) {
      console.error('Error loading client counts:', error);
      return {
        facebookAds: 0,
        googleAds: 0,
        goHighLevel: 0,
        googleSheets: 0
      };
    }
  };

  const copyShareableLink = (link: string) => {
    navigator.clipboard.writeText(link);
    // Show toast notification
  };

  const handleExportClientReport = async (client: Client) => {
    try {
      // Navigate to the client's dashboard and trigger PDF export
      const dashboardUrl = `/share/${client.id}`;
      window.open(dashboardUrl, '_blank');
      
      // Show a message to the user
      alert(`Opening ${client.name}'s dashboard. Please use the "Export PDF" button on the dashboard to generate the report.`);
    } catch (error) {
      console.error('Error opening client dashboard:', error);
      alert('Failed to open client dashboard. Please try again.');
    }
  };

  const handleDeleteClient = async (clientId: string, clientName: string) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${clientName}"? This action cannot be undone and will remove all associated data.`
    );

    if (!confirmed) return;

    setDeleting(prev => ({ ...prev, [clientId]: true }));

    try {
      await DatabaseService.deleteClient(clientId);
      setClients(prev => prev.filter(client => client.id !== clientId));
      alert('Client deleted successfully!');
    } catch (error) {
      console.error('Error deleting client:', error);
      alert('Failed to delete client. Please try again.');
    } finally {
      setDeleting(prev => ({ ...prev, [clientId]: false }));
    }
  };

  const handleOAuthConnect = async (platform: string) => {
    setConnecting(prev => ({ ...prev, [platform]: true }));

    try {
      if (platform === 'facebookAds') {
        // For Facebook Ads, test connection with Marketing API token
        const { FacebookAdsService } = await import('@/services/facebookAdsService');
        const result = await FacebookAdsService.testConnection();

        if (result.success) {
          await DatabaseService.saveIntegration(platform, {
            connected: true,
            accountName: result.accountInfo?.user?.name || 'Facebook Business Account',
            accountId: result.accountInfo?.adAccounts?.[0]?.id,
            lastSync: new Date().toISOString(),
            config: result.accountInfo
          });

          // Reload integrations to update UI
          await loadIntegrations();
          alert('Facebook Ads connected successfully!');
          return;
        } else {
          throw new Error(result.error || 'Facebook connection failed');
        }
      } else {
        // For other platforms, use OAuth
        const oauthPlatformMap: Record<string, string> = {
          'googleAds': 'google',
          'googleSheets': 'google',
          'goHighLevel': 'gohighlevel'
        };

        const oauthPlatform = oauthPlatformMap[platform] || platform;

        // Check if we already have valid tokens
        if (OAuthService.isTokenValid(oauthPlatform)) {
          console.log(`${platform} already connected with valid tokens`);

          await DatabaseService.saveIntegration(platform, {
            connected: true,
            accountName: `${platform === 'googleAds' ? 'Google Ads Account' :
              platform === 'goHighLevel' ? 'GoHighLevel Location' :
                'Google Account'} Account`,
            lastSync: new Date().toISOString(),
            config: {}
          });

          // Reload integrations to update UI
          await loadIntegrations();
          return;
        }

        // Generate OAuth URL and redirect
        const authUrl = OAuthService.generateAuthUrl(oauthPlatform);

        // Redirect to OAuth URL for real authentication
        window.location.href = authUrl;
      }

    } catch (error) {
      console.error(`${platform} connection failed:`, error);
      alert(`Failed to connect ${platform}. Please try again.`);
    } finally {
      setConnecting(prev => ({ ...prev, [platform]: false }));
    }
  };

  const handleDisconnect = async (platform: string) => {
    try {
      // Use OAuth service for all platforms
      const oauthPlatformMap: Record<string, string> = {
        'facebookAds': 'facebook',
        'googleAds': 'google',
        'googleSheets': 'google',
        'goHighLevel': 'gohighlevel'
      };

      const oauthPlatform = oauthPlatformMap[platform] || platform;

      // Revoke tokens
      await OAuthService.revokeTokens(oauthPlatform);

      // For Facebook, also call the service disconnect
      if (platform === 'facebookAds') {
        const { FacebookAdsService } = await import('@/services/facebookAdsService');
        FacebookAdsService.disconnect();
      }

      // Update database
      await DatabaseService.saveIntegration(platform, {
        connected: false,
        lastSync: new Date().toISOString(),
        config: {}
      });

      // Reload integrations to update UI
      await loadIntegrations();
      console.log(`${platform} disconnected successfully`);
    } catch (error) {
      console.error(`Failed to disconnect ${platform}:`, error);
      // Still reload integrations even if revocation fails
      await loadIntegrations();
    }
  };

  return (
    <div className="page-bg-light">
      {/* Header - Always visible */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <BarChart3 className="h-6 w-6 text-blue-600" />
              <span className="text-lg font-bold text-gray-900">Admin Panel</span>
            </div>
          </div>
        </div>
      </div>

      <div className="p-8">
        <div className="max-w-4xl mx-auto">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-2 bg-gray-100 border border-gray-200">
              <TabsTrigger
                value="clients"
                className="data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-md font-semibold"
              >
                Client Management
              </TabsTrigger>
              <TabsTrigger
                value="integrations"
                className="data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-md font-semibold"
              >
                Integrations
              </TabsTrigger>
            </TabsList>

            {/* Client Management Tab */}
            <TabsContent value="clients" className="space-y-6 min-h-[600px]">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">Client Management</h2>
                <Button onClick={() => setShowAddClientModal(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add New Client
                </Button>
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  <span className="ml-2 text-gray-600">Loading clients...</span>
                </div>
              ) : (
                <div className="grid gap-6">
                  {clients.map((client) => (
                    <Card key={client.id} className="card-bg-light">
                      <CardHeader className="pb-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {client.logo_url ? (
                              <img
                                src={client.logo_url}
                                alt={`${client.name} logo`}
                                className="w-10 h-10 object-cover rounded-lg border border-gray-200"
                              />
                            ) : (
                              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                                <BarChart3 className="h-5 w-5 text-white" />
                              </div>
                            )}
                            <div>
                              <CardTitle className="text-lg">{client.name}</CardTitle>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${client.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                              }`}>
                              {client.status}
                            </span>
                            <Button variant="outline" size="sm" onClick={() => copyShareableLink(client.shareable_link)}>
                              <LinkIcon className="h-4 w-4 mr-2" />
                              Copy Link
                            </Button>
                            <Link to={`/share/${client.id}`}>
                              <Button variant="outline" size="sm">
                                <Eye className="h-4 w-4 mr-2" />
                                View Dashboard
                              </Button>
                            </Link>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleExportClientReport(client)}
                              className="text-green-600 hover:text-green-700 hover:bg-green-50"
                            >
                              <FileDown className="h-4 w-4 mr-2" />
                              Export PDF
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteClient(client.id, client.name)}
                              disabled={deleting[client.id]}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              {deleting[client.id] ? 'Deleting...' : 'Delete'}
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div>
                          <h4 className="font-medium text-gray-900 mb-3">Connected Accounts</h4>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <div className={`flex items-center gap-2 p-3 rounded-lg ${client.accounts.facebookAds && client.accounts.facebookAds !== 'none' ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50'}`}>
                              <div className="w-4 h-4 bg-blue-600 rounded flex items-center justify-center">
                                <span className="text-white font-bold text-xs">f</span>
                              </div>
                              <span className="text-sm font-medium">Facebook Ads</span>
                              {client.accounts.facebookAds && client.accounts.facebookAds !== 'none' && <CheckCircle className="h-3 w-3 text-green-600 ml-auto" />}
                            </div>

                            <div className={`flex items-center gap-2 p-3 rounded-lg ${client.accounts.googleAds && client.accounts.googleAds !== 'none' ? 'bg-red-50 border border-red-200' : 'bg-gray-50'}`}>
                              <div className="w-4 h-4 bg-red-600 rounded flex items-center justify-center">
                                <span className="text-white font-bold text-xs">G</span>
                              </div>
                              <span className="text-sm font-medium">Google Ads</span>
                              {client.accounts.googleAds && client.accounts.googleAds !== 'none' && <CheckCircle className="h-3 w-3 text-green-600 ml-auto" />}
                            </div>

                            <div className={`flex items-center gap-2 p-3 rounded-lg ${client.accounts.goHighLevel && client.accounts.goHighLevel !== 'none' ? 'bg-purple-50 border border-purple-200' : 'bg-gray-50'}`}>
                              <Zap className="h-4 w-4 text-purple-600" />
                              <span className="text-sm font-medium">GoHighLevel</span>
                              {client.accounts.goHighLevel && client.accounts.goHighLevel !== 'none' && <CheckCircle className="h-3 w-3 text-green-600 ml-auto" />}
                            </div>

                            <div className={`flex items-center gap-2 p-3 rounded-lg ${client.accounts.googleSheets && client.accounts.googleSheets !== 'none' ? 'bg-green-50 border border-green-200' : 'bg-gray-50'}`}>
                              <BarChart3 className="h-4 w-4 text-green-600" />
                              <span className="text-sm font-medium">Google Sheets</span>
                              {client.accounts.googleSheets && client.accounts.googleSheets !== 'none' && <CheckCircle className="h-3 w-3 text-green-600 ml-auto" />}
                            </div>
                          </div>
                        </div>

                        <div className="mt-4 p-3 bg-blue-50 rounded-2xl">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-blue-900">Shareable Link</p>
                              <p className="text-xs text-blue-700">Share this link with your client for dashboard access</p>
                            </div>
                            <code className="text-xs bg-white px-2 py-1 rounded border text-blue-800">
                              {client.shareable_link}
                            </code>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Integrations Tab */}
            <TabsContent value="integrations" className="space-y-6 min-h-[600px]">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">Platform Integrations</h2>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Integration
                </Button>
              </div>

              <div className="grid gap-4">
                {integrations.map((integration) => (
                  <Card key={integration.id} className="card-bg-light">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-gray-100">
                            {integration.platform === 'facebook' && (
                              <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center">
                                <span className="text-white font-bold text-sm">f</span>
                              </div>
                            )}
                            {integration.platform === 'google' && (
                              <Globe className="h-6 w-6 text-red-600" />
                            )}
                            {integration.platform === 'gohighlevel' && (
                              <Zap className="h-6 w-6 text-purple-600" />
                            )}
                            {integration.platform === 'googlesheets' && (
                              <FileSpreadsheet className="h-6 w-6 text-green-600" />
                            )}
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900">{integration.name}</h3>
                            <p className="text-sm text-gray-500">
                              {integration.clientsUsing} clients using • Last sync: {integration.lastSync}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            {getStatusIcon(integration.status)}
                            <span className={`px-3 py-1.5 rounded-lg text-xs font-medium ${getStatusColor(integration.status)}`}>
                              {integration.status}
                            </span>
                          </div>
                          <div className="flex gap-2">
                            {integration.platform === 'facebook' ? (
                              // Facebook Ads - show token input
                              <div className="flex items-center gap-2">
                                <input
                                  type="text"
                                  placeholder="Enter Facebook access token"
                                  className="px-3 py-1.5 text-sm border rounded-md w-64"
                                  defaultValue="EAAph81SWZC4YBPia2n0YL85cwzQPBlK7VmOGWkzBOduqtWxpb2xjtp2ctuqYqU8WwUQJmfXSn0gKxm05qXiYG7qlugKTsZCCrGYDQTuP01OmZAUNJi9cs8KX9jcsEu1Lj8mb6d6ZA921E2QuipYn9nMEEqyoZAc4qKfWAeCbGdmrvY0lYZAfk2LRZB2QsL6XM6cFgUZD"
                                />
                                <Button
                                  onClick={async () => {
                                    setConnecting(prev => ({ ...prev, facebookAds: true }));
                                    try {
                                      const { FacebookAdsService } = await import('@/services/facebookAdsService');
                                      const result = await FacebookAdsService.testConnection();

                                      if (result.success) {
                                        await DatabaseService.saveIntegration('facebookAds', {
                                          connected: true,
                                          accountName: result.accountInfo?.user?.name || 'Facebook Business Account',
                                          accountId: result.accountInfo?.adAccounts?.[0]?.id,
                                          lastSync: new Date().toISOString(),
                                          config: result.accountInfo
                                        });

                                        await loadIntegrations();
                                        alert('Facebook Ads connected successfully!');
                                      } else {
                                        alert(`Facebook connection failed: ${result.error}`);
                                      }
                                    } catch (error) {
                                      console.error('Facebook connection failed:', error);
                                      alert(`Failed to connect Facebook Ads: ${error}`);
                                    } finally {
                                      setConnecting(prev => ({ ...prev, facebookAds: false }));
                                    }
                                  }}
                                  disabled={connecting.facebookAds}
                                  size="sm"
                                  className="bg-blue-600 hover:bg-blue-700"
                                >
                                  {connecting.facebookAds ? 'Testing...' : 'Test & Save'}
                                </Button>
                              </div>
                            ) : (
                              // Other platforms - OAuth connect/disconnect
                              integration.status === 'connected' ? (
                                <Button
                                  onClick={() => handleDisconnect(integration.platform === 'google' ? 'googleAds' :
                                    integration.platform === 'gohighlevel' ? 'goHighLevel' : 'googleSheets')}
                                  variant="outline"
                                  size="sm"
                                  className="text-red-600 border-red-200 hover:bg-red-50"
                                >
                                  Disconnect
                                </Button>
                              ) : (
                                <Button
                                  onClick={() => handleOAuthConnect(integration.platform === 'google' ? 'googleAds' :
                                    integration.platform === 'gohighlevel' ? 'goHighLevel' : 'googleSheets')}
                                  disabled={connecting[integration.platform === 'google' ? 'googleAds' :
                                    integration.platform === 'gohighlevel' ? 'goHighLevel' : 'googleSheets']}
                                  size="sm"
                                  className={integration.platform === 'google' ? 'bg-red-600 hover:bg-red-700' :
                                    integration.platform === 'gohighlevel' ? 'bg-purple-600 hover:bg-purple-700' :
                                      'bg-green-600 hover:bg-green-700'}
                                >
                                  {connecting[integration.platform === 'google' ? 'googleAds' :
                                    integration.platform === 'gohighlevel' ? 'goHighLevel' : 'googleSheets'] ? 'Connecting...' : 'Connect'}
                                </Button>
                              )
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {/* Add New Integration Card */}
                <Card className="border-2 border-dashed border-gray-300 bg-gray-50">
                  <CardContent className="p-8 text-center">
                    <Plus className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Add New Integration</h3>
                    <p className="text-gray-500 mb-4">Connect additional platforms to expand reporting capabilities</p>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Connect Platform
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <AddClientModal
        isOpen={showAddClientModal}
        onClose={() => setShowAddClientModal(false)}
        onAddClient={handleAddClient}
      />
    </div>
  );
};

export default AdminPanel;
