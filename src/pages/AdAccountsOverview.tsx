"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DatabaseService } from "@/services/databaseService";
import { EventMetricsService } from "@/services/eventMetricsService";
import {
    ArrowLeft,
    BarChart3,
    Calendar,
    DollarSign,
    Eye,
    TrendingUp,
    Users
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

interface AdAccountData {
    clientId: string;
    venueName: string;
    logoUrl?: string;
    status: 'active' | 'paused' | 'inactive';
    platforms: {
        facebookAds?: {
            accountId: string;
            accountName: string;
            connected: boolean;
        };
        googleAds?: {
            accountId: string;
            accountName: string;
            connected: boolean;
        };
    };
    metrics: {
        totalLeads: number;
        totalSpend: number;
        totalRevenue: number;
        roi: number;
        facebookMetrics?: {
            impressions: number;
            clicks: number;
            spend: number;
            leads: number;
            ctr: number;
            cpc: number;
        };
        googleMetrics?: {
            impressions: number;
            clicks: number;
            cost: number;
            leads: number;
            ctr: number;
            cpc: number;
        };
    };
    shareableLink: string;
}

const AdAccountsOverview = () => {
    const [adAccounts, setAdAccounts] = useState<AdAccountData[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedPeriod, setSelectedPeriod] = useState("30d");

    useEffect(() => {
        loadAdAccountsData();
    }, [selectedPeriod]);

    const loadAdAccountsData = async () => {
        try {
            setLoading(true);
            const clients = await DatabaseService.getAllClients();
            const dateRange = getDateRange(selectedPeriod);

            const accountsData: AdAccountData[] = [];

            for (const client of clients) {
                // Only include clients that have at least one ad account connected
                const hasFacebookAds = client.accounts?.facebookAds && client.accounts.facebookAds !== 'none';
                const hasGoogleAds = client.accounts?.googleAds && client.accounts.googleAds !== 'none';

                if (!hasFacebookAds && !hasGoogleAds) continue;

                try {
                    // Get comprehensive metrics for this client
                    const metrics = await EventMetricsService.getComprehensiveMetrics(
                        client.id,
                        dateRange,
                        client.accounts,
                        client.conversion_actions
                    );

                    const accountData: AdAccountData = {
                        clientId: client.id,
                        venueName: client.name,
                        logoUrl: client.logo_url,
                        status: client.status,
                        platforms: {
                            facebookAds: hasFacebookAds ? {
                                accountId: client.accounts.facebookAds!,
                                accountName: `Facebook Ad Account (${client.accounts.facebookAds})`,
                                connected: true
                            } : undefined,
                            googleAds: hasGoogleAds ? {
                                accountId: client.accounts.googleAds!,
                                accountName: `Google Ads Account (${client.accounts.googleAds})`,
                                connected: true
                            } : undefined
                        },
                        metrics: {
                            totalLeads: metrics.totalLeads,
                            totalSpend: metrics.totalSpend,
                            totalRevenue: metrics.totalRevenue,
                            roi: metrics.roi,
                            facebookMetrics: hasFacebookAds ? {
                                impressions: metrics.facebookMetrics.impressions,
                                clicks: metrics.facebookMetrics.clicks,
                                spend: metrics.facebookMetrics.spend,
                                leads: metrics.facebookMetrics.leads,
                                ctr: metrics.facebookMetrics.ctr,
                                cpc: metrics.facebookMetrics.cpc
                            } : undefined,
                            googleMetrics: hasGoogleAds ? {
                                impressions: metrics.googleMetrics.impressions,
                                clicks: metrics.googleMetrics.clicks,
                                cost: metrics.googleMetrics.cost,
                                leads: metrics.googleMetrics.leads,
                                ctr: metrics.googleMetrics.ctr,
                                cpc: metrics.googleMetrics.cpc
                            } : undefined
                        },
                        shareableLink: client.shareable_link
                    };

                    accountsData.push(accountData);
                } catch (error) {
                    console.error(`Error loading metrics for client ${client.name}:`, error);
                    // Still add the client with zero metrics if there's an error
                    accountsData.push({
                        clientId: client.id,
                        venueName: client.name,
                        logoUrl: client.logo_url,
                        status: client.status,
                        platforms: {
                            facebookAds: hasFacebookAds ? {
                                accountId: client.accounts.facebookAds!,
                                accountName: `Facebook Ad Account (${client.accounts.facebookAds})`,
                                connected: true
                            } : undefined,
                            googleAds: hasGoogleAds ? {
                                accountId: client.accounts.googleAds!,
                                accountName: `Google Ads Account (${client.accounts.googleAds})`,
                                connected: true
                            } : undefined
                        },
                        metrics: {
                            totalLeads: 0,
                            totalSpend: 0,
                            totalRevenue: 0,
                            roi: 0
                        },
                        shareableLink: client.shareable_link
                    });
                }
            }

            setAdAccounts(accountsData);
        } catch (error) {
            console.error('Error loading ad accounts data:', error);
            setAdAccounts([]);
        } finally {
            setLoading(false);
        }
    };

    const getDateRange = (period: string) => {
        const end = new Date();
        const start = new Date();

        switch (period) {
            case '7d':
                start.setDate(end.getDate() - 7);
                break;
            case '30d':
                start.setDate(end.getDate() - 30);
                break;
            case '90d':
                start.setDate(end.getDate() - 90);
                break;
            default:
                start.setDate(end.getDate() - 30);
        }

        return {
            start: start.toISOString().split('T')[0],
            end: end.toISOString().split('T')[0]
        };
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount);
    };

    const formatNumber = (num: number) => {
        return new Intl.NumberFormat('en-US').format(num);
    };

    const formatPercentage = (num: number) => {
        return `${(num * 100).toFixed(1)}%`;
    };

    return (
        <div className="page-bg-light">
            {/* Header */}
            <div className="bg-white border-b border-gray-200 px-6 py-4">
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
                            <span className="text-lg font-bold text-gray-900">Ad Accounts Overview</span>
                        </div>
                    </div>

                    {/* Period Selector */}
                    <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-gray-500" />
                        <select
                            value={selectedPeriod}
                            onChange={(e) => setSelectedPeriod(e.target.value)}
                            className="px-3 py-1.5 text-sm border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="7d">Last 7 days</option>
                            <option value="30d">Last 30 days</option>
                            <option value="90d">Last 90 days</option>
                        </select>
                    </div>
                </div>
            </div>

            <div className="p-8">
                <div className="max-w-7xl mx-auto">
                    {/* Ad Accounts Table */}
                    <Card className="card-bg-light">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <BarChart3 className="h-5 w-5" />
                                Ad Accounts Performance
                            </CardTitle>
                            <div className="flex gap-2 mt-4">
                                <Link to="/facebook-ads">
                                    <Button variant="outline" size="sm" className="flex items-center gap-2">
                                        <div className="w-4 h-4 bg-blue-600 rounded flex items-center justify-center">
                                            <span className="text-white font-bold text-xs">f</span>
                                        </div>
                                        Facebook Ads
                                    </Button>
                                </Link>
                                <Link to="/google-ads">
                                    <Button variant="outline" size="sm" className="flex items-center gap-2">
                                        <div className="w-4 h-4 bg-red-600 rounded flex items-center justify-center">
                                            <span className="text-white font-bold text-xs">G</span>
                                        </div>
                                        Google Ads
                                    </Button>
                                </Link>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {loading ? (
                                <div className="flex items-center justify-center py-12">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                                    <span className="ml-3 text-gray-600">Loading ad accounts data...</span>
                                </div>
                            ) : adAccounts.length === 0 ? (
                                <div className="text-center py-12">
                                    <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Ad Accounts Found</h3>
                                    <p className="text-gray-500 mb-4">No clients have ad accounts connected yet.</p>
                                    <Link to="/admin">
                                        <Button>
                                            <BarChart3 className="h-4 w-4 mr-2" />
                                            Manage Clients
                                        </Button>
                                    </Link>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead>
                                            <tr className="border-b border-gray-200">
                                                <th className="text-left py-2 px-4 font-semibold text-gray-900">Venue</th>
                                                <th className="text-left py-2 px-4 font-semibold text-gray-900">Platforms</th>
                                                <th className="text-right py-2 px-4 font-semibold text-gray-900">Leads</th>
                                                <th className="text-right py-2 px-4 font-semibold text-gray-900">Spend</th>
                                                <th className="text-right py-2 px-4 font-semibold text-gray-900">Revenue</th>
                                                <th className="text-right py-2 px-4 font-semibold text-gray-900">ROI</th>
                                                <th className="text-center py-2 px-4 font-semibold text-gray-900">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {adAccounts.map((account) => (
                                                <tr key={account.clientId} className="border-b border-gray-100 hover:bg-gray-50">
                                                    <td className="py-2 px-4">
                                                        <div className="flex items-center gap-3">
                                                            {account.logoUrl ? (
                                                                <img
                                                                    src={account.logoUrl}
                                                                    alt={`${account.venueName} logo`}
                                                                    className="w-8 h-8 object-cover rounded-lg border border-gray-200"
                                                                />
                                                            ) : (
                                                                <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                                                                    <BarChart3 className="h-4 w-4 text-white" />
                                                                </div>
                                                            )}
                                                            <div>
                                                                <div className="font-medium text-gray-900 text-sm">{account.venueName}</div>
                                                                <div className={`text-xs px-2 py-0.5 rounded-full inline-block ${account.status === 'active' ? 'bg-green-100 text-green-800' :
                                                                        account.status === 'paused' ? 'bg-yellow-100 text-yellow-800' :
                                                                            'bg-gray-100 text-gray-800'
                                                                    }`}>
                                                                    {account.status}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </td>

                                                    <td className="py-2 px-4">
                                                        <div className="flex gap-2">
                                                            {account.platforms.facebookAds && (
                                                                <div className="flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">
                                                                    <div className="w-3 h-3 bg-blue-600 rounded flex items-center justify-center">
                                                                        <span className="text-white font-bold text-xs">f</span>
                                                                    </div>
                                                                    Facebook
                                                                </div>
                                                            )}
                                                            {account.platforms.googleAds && (
                                                                <div className="flex items-center gap-1 px-2 py-1 bg-red-100 text-red-800 rounded text-xs font-medium">
                                                                    <div className="w-3 h-3 bg-red-600 rounded flex items-center justify-center">
                                                                        <span className="text-white font-bold text-xs">G</span>
                                                                    </div>
                                                                    Google
                                                                </div>
                                                            )}
                                                        </div>
                                                    </td>

                                                    <td className="py-2 px-4 text-right">
                                                        <div className="font-medium text-gray-900 text-sm">
                                                            {formatNumber(account.metrics.totalLeads)}
                                                        </div>
                                                        {account.metrics.facebookMetrics && account.metrics.googleMetrics && (
                                                            <div className="text-xs text-gray-500">
                                                                FB: {formatNumber(account.metrics.facebookMetrics.leads)} |
                                                                GA: {formatNumber(account.metrics.googleMetrics.leads)}
                                                            </div>
                                                        )}
                                                    </td>

                                                    <td className="py-2 px-4 text-right">
                                                        <div className="font-medium text-gray-900 text-sm">
                                                            {formatCurrency(account.metrics.totalSpend)}
                                                        </div>
                                                        {account.metrics.facebookMetrics && account.metrics.googleMetrics && (
                                                            <div className="text-xs text-gray-500">
                                                                FB: {formatCurrency(account.metrics.facebookMetrics.spend)} |
                                                                GA: {formatCurrency(account.metrics.googleMetrics.cost)}
                                                            </div>
                                                        )}
                                                    </td>

                                                    <td className="py-2 px-4 text-right">
                                                        <div className="font-medium text-gray-900 text-sm">
                                                            {formatCurrency(account.metrics.totalRevenue)}
                                                        </div>
                                                    </td>

                                                    <td className="py-2 px-4 text-right">
                                                        <div className={`font-medium text-sm ${account.metrics.roi > 0 ? 'text-green-600' :
                                                                account.metrics.roi < 0 ? 'text-red-600' :
                                                                    'text-gray-600'
                                                            }`}>
                                                            {formatPercentage(account.metrics.roi)}
                                                        </div>
                                                    </td>

                                                    <td className="py-2 px-4 text-center">
                                                        <Link to={`/share/${account.clientId}`}>
                                                            <Button variant="outline" size="sm">
                                                                <Eye className="h-4 w-4 mr-2" />
                                                                View Dashboard
                                                            </Button>
                                                        </Link>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default AdAccountsOverview;
