import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { debugComponent, debugLogger } from '@/lib/debug';
import { DatabaseService } from "@/services/databaseService";
import { OAuthService } from "@/services/oauthService";
import {
    AlertCircle,
    ArrowLeft,
    CheckCircle,
    FileSpreadsheet,
    Globe,
    Settings,
    Zap
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";


interface IntegrationConfig {
    facebookAds: {
        connected: boolean;
        accountName?: string;
        lastSync?: string;
    };
    googleAds: {
        connected: boolean;
        accountName?: string;
        lastSync?: string;
    };
    goHighLevel: {
        connected: boolean;
        accountName?: string;
        lastSync?: string;
    };
    googleSheets: {
        connected: boolean;
        accountName?: string;
        lastSync?: string;
    };
}

const IntegrationSetup = () => {
    const debug = debugComponent('IntegrationSetup');

    const [config, setConfig] = useState<IntegrationConfig>({
        facebookAds: {
            connected: false
        },
        googleAds: {
            connected: false
        },
        goHighLevel: {
            connected: false
        },
        googleSheets: {
            connected: false
        }
    });

    const [connecting, setConnecting] = useState<Record<string, boolean>>({});
    const [clientCounts, setClientCounts] = useState<Record<string, number>>({
        facebookAds: 0,
        googleAds: 0,
        goHighLevel: 0,
        googleSheets: 0
    });

    useEffect(() => {
        debug.mount();
        loadIntegrations();
        loadClientCounts();

        return () => debug.unmount();
    }, []);

    const loadClientCounts = async () => {
        try {
            const clients = await DatabaseService.getAllClients();
            console.log('Loaded clients:', clients);
            const counts = {
                facebookAds: clients.filter(c => c.accounts?.facebookAds && c.accounts.facebookAds !== 'none').length,
                googleAds: clients.filter(c => c.accounts?.googleAds && c.accounts.googleAds !== 'none').length,
                goHighLevel: clients.filter(c => c.accounts?.goHighLevel && c.accounts.goHighLevel !== 'none').length,
                googleSheets: clients.filter(c => c.accounts?.googleSheets && c.accounts.googleSheets !== 'none').length
            };
            console.log('Client counts:', counts);
            setClientCounts(counts);
        } catch (error) {
            console.error('Error loading client counts:', error);
            // Set default counts if error - based on actual database data
            setClientCounts({
                facebookAds: 0,
                googleAds: 0,
                goHighLevel: 0,
                googleSheets: 0
            });
        }
    };

    const loadIntegrations = async () => {
        try {
            const integrations = await DatabaseService.getIntegrations();
            const config: IntegrationConfig = {
                facebookAds: { connected: false },
                googleAds: { connected: false },
                goHighLevel: { connected: false },
                googleSheets: { connected: false }
            };

            integrations.forEach(integration => {
                const platform = integration.platform as keyof IntegrationConfig;
                config[platform] = {
                    connected: integration.connected,
                    accountName: integration.account_name || undefined,
                    lastSync: integration.last_sync || undefined
                };
            });

            setConfig(config);
        } catch (error) {
            console.error('Error loading integrations:', error);
            // Default config when no data
            setConfig({
                facebookAds: { connected: false },
                googleAds: { connected: false },
                goHighLevel: { connected: false },
                googleSheets: { connected: false }
            });
        }
    };

    const handleOAuthConnect = async (platform: keyof IntegrationConfig) => {
        debugLogger.info('INTEGRATION', `Connecting ${platform}`);
        setConnecting(prev => ({ ...prev, [platform]: true }));

        try {
            // Check if we already have valid tokens for this platform
            const oauthPlatformMap: Record<string, string> = {
                'facebookAds': 'facebook',
                'googleAds': 'google',
                'googleSheets': 'google',
                'goHighLevel': 'gohighlevel'
            };

            const oauthPlatform = oauthPlatformMap[platform] || platform;

            // Check if we already have valid tokens
            if (OAuthService.isTokenValid(oauthPlatform)) {
                console.log(`${platform} already connected with valid tokens`);

                // Test the connection
                if (platform === 'facebookAds') {
                    const { FacebookAdsService } = await import('@/services/facebookAdsService');
                    const result = await FacebookAdsService.testConnection();

                    if (result.success) {
                        setConfig(prev => ({
                            ...prev,
                            [platform]: {
                                connected: true,
                                accountName: result.accountInfo?.user?.name || 'Facebook Business Account',
                                lastSync: new Date().toISOString()
                            }
                        }));

                        // Save to database
                        await DatabaseService.saveIntegration(platform, {
                            connected: true,
                            accountName: result.accountInfo?.user?.name || 'Facebook Business Account',
                            accountId: result.accountInfo?.adAccounts?.[0]?.id,
                            lastSync: new Date().toISOString(),
                            config: result.accountInfo
                        });
                    } else {
                        throw new Error(result.error || 'Facebook connection failed');
                    }
                } else {
                    setConfig(prev => ({
                        ...prev,
                        [platform]: {
                            connected: true,
                            accountName: `${platform === 'googleAds' ? 'Google Ads Account' :
                                platform === 'goHighLevel' ? 'GoHighLevel Location' :
                                    'Google Account'} Account`,
                            lastSync: new Date().toISOString()
                        }
                    }));
                }
                return;
            }

            // Generate OAuth URL and redirect
            const authUrl = OAuthService.generateAuthUrl(oauthPlatform);

            // For production, redirect to OAuth URL
            // For demo, we'll simulate the flow
            if (import.meta.env.MODE === 'production') {
                window.location.href = authUrl;
            } else {
                // Demo mode - simulate OAuth flow
                console.log(`Demo mode: Would redirect to ${authUrl}`);

                // Simulate OAuth popup delay
                await new Promise(resolve => setTimeout(resolve, 2000));

                // Simulate successful connection
                if (platform === 'facebookAds') {
                    // For Facebook, we need to simulate OAuth tokens
                    const mockTokens = {
                        accessToken: 'mock_facebook_token',
                        tokenType: 'Bearer',
                        expiresIn: 3600,
                        timestamp: Date.now()
                    };
                    localStorage.setItem('oauth_tokens_facebook', JSON.stringify(mockTokens));
                }

                setConfig(prev => ({
                    ...prev,
                    [platform]: {
                        connected: true,
                        accountName: `${platform === 'facebookAds' ? 'Facebook Business Account' :
                            platform === 'googleAds' ? 'Google Ads Account' :
                                platform === 'goHighLevel' ? 'GoHighLevel Location' :
                                    'Google Account'} Account`,
                        lastSync: new Date().toISOString()
                    }
                }));

                // Save to database
                await DatabaseService.saveIntegration(platform, {
                    connected: true,
                    accountName: `${platform === 'facebookAds' ? 'Facebook Business Account' :
                        platform === 'googleAds' ? 'Google Ads Account' :
                            platform === 'goHighLevel' ? 'GoHighLevel Location' :
                                'Google Account'} Account`,
                    lastSync: new Date().toISOString(),
                    config: {}
                });

                console.log(`${platform} connected successfully (demo mode)`);
            }

        } catch (error) {
            console.error(`${platform} connection failed:`, error);
            alert(`Failed to connect ${platform}. Please try again.`);
        } finally {
            setConnecting(prev => ({ ...prev, [platform]: false }));
        }
    };

    const handleDisconnect = async (platform: keyof IntegrationConfig) => {
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

            const updatedConfig = {
                ...config,
                [platform]: {
                    connected: false
                }
            };

            setConfig(updatedConfig);
            localStorage.setItem('integrationConfig', JSON.stringify(updatedConfig));
            console.log(`${platform} disconnected successfully`);
        } catch (error) {
            console.error(`Failed to disconnect ${platform}:`, error);
            // Still update UI even if revocation fails
            const updatedConfig = {
                ...config,
                [platform]: {
                    connected: false
                }
            };

            setConfig(updatedConfig);
            localStorage.setItem('integrationConfig', JSON.stringify(updatedConfig));
        }
    };

    return (
        <div className="page-bg-light">
            {/* Header */}
            <div className="bg-white border-b border-gray-200 px-6 py-4">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link to="/admin">
                            <Button variant="ghost" size="sm">
                                <ArrowLeft className="h-4 w-4 mr-2" />
                                Back to Admin
                            </Button>
                        </Link>
                        <div className="flex items-center gap-2">
                            <Settings className="h-6 w-6 text-blue-600" />
                            <span className="text-lg font-bold text-gray-900">Integration Setup</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="p-8">
                <div className="max-w-4xl mx-auto">
                    <div className="mb-8">
                        <h1 className="text-3xl font-bold text-gray-900 mb-3">Platform Integrations</h1>
                        <p className="text-lg text-gray-600">Configure API connections to sync data from your marketing platforms.</p>
                    </div>

                    <div className="grid gap-6">

                        {/* Facebook Ads */}
                        <Card className="hover:shadow-lg transition-shadow">
                            <CardContent className="p-6">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center">
                                            <span className="text-white font-bold text-lg">f</span>
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-semibold text-gray-900">Facebook Business Manager</h3>
                                            <p className="text-sm text-gray-500 mt-1">
                                                {clientCounts.facebookAds} clients using • Last sync: {config.facebookAds.lastSync ? new Date(config.facebookAds.lastSync).toLocaleDateString() : 'Never'}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        {config.facebookAds.connected ? (
                                            <div className="flex items-center gap-3">
                                                <CheckCircle className="h-5 w-5 text-green-600" />
                                                <span className="inline-flex items-center rounded-full border border-green-200 bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                                                    Connected
                                                </span>
                                                <Button
                                                    onClick={() => handleDisconnect('facebookAds')}
                                                    variant="outline"
                                                    size="sm"
                                                    className="text-red-600 border-red-200 hover:bg-red-50"
                                                >
                                                    Disconnect
                                                </Button>
                                            </div>
                                        ) : (
                                            <Button
                                                onClick={() => handleOAuthConnect('facebookAds')}
                                                disabled={connecting.facebookAds}
                                                size="sm"
                                                className="bg-blue-600 hover:bg-blue-700"
                                            >
                                                {connecting.facebookAds ? 'Connecting...' : 'Connect'}
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Google Ads */}
                        <Card className="hover:shadow-lg transition-shadow">
                            <CardContent className="p-6">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-red-600 rounded-2xl flex items-center justify-center">
                                            <Globe className="h-6 w-6 text-white" />
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-semibold text-gray-900">Google Ads Manager</h3>
                                            <p className="text-sm text-gray-500 mt-1">
                                                {clientCounts.googleAds} clients using • Last sync: {config.googleAds.lastSync ? new Date(config.googleAds.lastSync).toLocaleDateString() : 'Never'}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        {config.googleAds.connected ? (
                                            <div className="flex items-center gap-3">
                                                <CheckCircle className="h-5 w-5 text-green-600" />
                                                <span className="inline-flex items-center rounded-full border border-green-200 bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                                                    Connected
                                                </span>
                                                <Button
                                                    onClick={() => handleDisconnect('googleAds')}
                                                    variant="outline"
                                                    size="sm"
                                                    className="text-red-600 border-red-200 hover:bg-red-50"
                                                >
                                                    Disconnect
                                                </Button>
                                            </div>
                                        ) : (
                                            <Button
                                                onClick={() => handleOAuthConnect('googleAds')}
                                                disabled={connecting.googleAds}
                                                size="sm"
                                                className="bg-red-600 hover:bg-red-700"
                                            >
                                                {connecting.googleAds ? 'Connecting...' : 'Connect'}
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Go High Level */}
                        <Card className="hover:shadow-lg transition-shadow">
                            <CardContent className="p-6">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-purple-600 rounded-2xl flex items-center justify-center">
                                            <Zap className="h-6 w-6 text-white" />
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-semibold text-gray-900">Go High Level</h3>
                                            <p className="text-sm text-gray-500 mt-1">
                                                {clientCounts.goHighLevel} clients using • Last sync: {config.goHighLevel.lastSync ? new Date(config.goHighLevel.lastSync).toLocaleDateString() : 'Never'}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        {config.goHighLevel.connected ? (
                                            <div className="flex items-center gap-3">
                                                <CheckCircle className="h-5 w-5 text-green-600" />
                                                <span className="inline-flex items-center rounded-full border border-green-200 bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                                                    Connected
                                                </span>
                                                <Button
                                                    onClick={() => handleDisconnect('goHighLevel')}
                                                    variant="outline"
                                                    size="sm"
                                                    className="text-red-600 border-red-200 hover:bg-red-50"
                                                >
                                                    Disconnect
                                                </Button>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-3">
                                                <AlertCircle className="h-5 w-5 text-gray-500" />
                                                <span className="inline-flex items-center rounded-full border border-gray-200 bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600">
                                                    Not Connected
                                                </span>
                                                <Button
                                                    onClick={() => handleOAuthConnect('goHighLevel')}
                                                    disabled={connecting.goHighLevel}
                                                    size="sm"
                                                    className="bg-purple-600 hover:bg-purple-700"
                                                >
                                                    {connecting.goHighLevel ? 'Connecting...' : 'Connect'}
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Google Sheets */}
                        <Card className="hover:shadow-lg transition-shadow">
                            <CardContent className="p-6">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-green-600 rounded-2xl flex items-center justify-center">
                                            <FileSpreadsheet className="h-6 w-6 text-white" />
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-semibold text-gray-900">Google Sheets</h3>
                                            <p className="text-sm text-gray-500 mt-1">
                                                {clientCounts.googleSheets} clients using • Last sync: {config.googleSheets.lastSync ? new Date(config.googleSheets.lastSync).toLocaleDateString() : 'Never'}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        {config.googleSheets.connected ? (
                                            <div className="flex items-center gap-3">
                                                <CheckCircle className="h-5 w-5 text-green-600" />
                                                <span className="inline-flex items-center rounded-full border border-green-200 bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                                                    Connected
                                                </span>
                                                <Button
                                                    onClick={() => handleDisconnect('googleSheets')}
                                                    variant="outline"
                                                    size="sm"
                                                    className="text-red-600 border-red-200 hover:bg-red-50"
                                                >
                                                    Disconnect
                                                </Button>
                                            </div>
                                        ) : (
                                            <Button
                                                onClick={() => handleOAuthConnect('googleSheets')}
                                                disabled={connecting.googleSheets}
                                                size="sm"
                                                className="bg-green-600 hover:bg-green-700"
                                            >
                                                {connecting.googleSheets ? 'Connecting...' : 'Connect'}
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default IntegrationSetup;
