"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingState } from '@/components/ui/LoadingStates';
import { debugLogger } from '@/lib/debug';
import { DatabaseService } from "@/services/data/databaseService";
import { EventMetricsService } from "@/services/data/eventMetricsService";
import {
    ArrowLeft,
    BarChart3,
    Calendar,
    Eye,
    Globe
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

interface GoogleAdAccountData {
    clientId: string;
    venueName: string;
    logoUrl?: string;
    status: 'active' | 'paused' | 'inactive';
    googleAccount: {
        accountId: string;
        accountName: string;
        connected: boolean;
    };
    metrics: {
        impressions: number;
        clicks: number;
        cost: number;
        leads: number;
        conversions: number;
        ctr: number;
        cpc: number;
        conversionRate: number;
    };
    shareableLink: string;
}

const GoogleAdsPage = () => {
    const [googleAccounts, setGoogleAccounts] = useState<GoogleAdAccountData[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedPeriod, setSelectedPeriod] = useState("30d");

    useEffect(() => {
        loadGoogleAdsData();
    }, [selectedPeriod]);

    const loadGoogleAdsData = async () => {
        try {
            setLoading(true);
            const clients = await DatabaseService.getAllClients();
            const dateRange = getDateRange(selectedPeriod);

            // Filter to only show individual venues (exclude any 'all_venues' type clients)
            const individualClients = clients.filter(client => client.id !== 'all_venues');
            
            const accountsData: GoogleAdAccountData[] = [];

            for (const client of individualClients) {
                // Only include clients that have Google ads connected AND the integration is actually working
                const hasGoogleAds = client.accounts?.googleAds && client.accounts.googleAds !== 'none';

                if (!hasGoogleAds) continue;

                try {
                    // Get comprehensive metrics for this individual client only
                    const metrics = await EventMetricsService.getComprehensiveMetrics(
                        client.id,
                        dateRange,
                        client.accounts,
                        client.conversion_actions
                    );

                    // Only show clients with actual Google Ads data (not just zeros)
                    const hasRealGoogleData = metrics.googleMetrics.impressions > 0 || 
                                            metrics.googleMetrics.clicks > 0 || 
                                            metrics.googleMetrics.cost > 0;

                    if (!hasRealGoogleData) {
                        console.log(`🔍 GoogleAdsPage: Skipping ${client.name} - no real Google Ads data`);
                        continue;
                    }

                    const accountData: GoogleAdAccountData = {
                        clientId: client.id,
                        venueName: client.name,
                        logoUrl: client.logo_url,
                        status: client.status,
                        googleAccount: {
                            accountId: client.accounts?.googleAds || '',
                            accountName: `Google Ads Account (${client.accounts?.googleAds || 'N/A'})`,
                            connected: true
                        },
                        metrics: {
                            impressions: metrics.googleMetrics.impressions,
                            clicks: metrics.googleMetrics.clicks,
                            cost: metrics.googleMetrics.cost,
                            leads: metrics.googleMetrics.leads,
                            conversions: metrics.googleMetrics.leads, // Same as leads for ads
                            ctr: metrics.googleMetrics.ctr,
                            cpc: metrics.googleMetrics.cpc,
                            conversionRate: metrics.googleMetrics.conversionRate || 0
                        },
                        shareableLink: client.shareable_link || ''
                    };

                    accountsData.push(accountData);
                } catch (error) {
                    debugLogger.error('GoogleAdsPage', `Error loading metrics for client ${client.name}`, error);
                    // Don't add clients with errors - only show real data
                    console.log(`🔍 GoogleAdsPage: Error loading ${client.name}, skipping`);
                }
            }

            setGoogleAccounts(accountsData);
        } catch (error) {
            debugLogger.error('GoogleAdsPage', 'Error loading Google ads data', error);
            setGoogleAccounts([]);
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
            case '14d':
                start.setDate(end.getDate() - 14);
                break;
            case '30d':
                start.setDate(end.getDate() - 30);
                break;
            case 'lastMonth':
                // Last month: e.g., if today is Oct 10th, show Sep 1st to Sep 30th
                start.setMonth(end.getMonth() - 1);
                start.setDate(1);
                end.setDate(0); // Last day of previous month
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
                        <Link to="/ad-accounts">
                            <Button variant="ghost" size="sm">
                                <ArrowLeft className="h-4 w-4 mr-2" />
                                Back to All Ads
                            </Button>
                        </Link>
                        <div className="flex items-center gap-2">
                            <div className="w-6 h-6 bg-red-600 rounded flex items-center justify-center">
                                <span className="text-white font-bold text-sm">G</span>
                            </div>
                            <span className="text-lg font-bold text-gray-900">Google Ads</span>
                        </div>
                    </div>

                    {/* Period Selector */}
                    <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-gray-500" />
                        <select
                            value={selectedPeriod}
                            onChange={(e) => setSelectedPeriod(e.target.value)}
                            className="px-3 py-1.5 text-sm border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-red-500"
                        >
                            <option value="7d">Last 7 days</option>
                            <option value="14d">Last 14 days</option>
                            <option value="30d">Last 30 days</option>
                            <option value="lastMonth">Last month</option>
                            <option value="90d">Last 90 days</option>
                        </select>
                    </div>
                </div>
            </div>

            <div className="p-8">
                <div className="max-w-7xl mx-auto">
                    {/* Google Ads Table */}
                    <Card className="card-bg-light">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <div className="w-5 h-5 bg-red-600 rounded flex items-center justify-center">
                                    <span className="text-white font-bold text-xs">G</span>
                                </div>
                                Google Ads Performance
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {loading ? (
                                <LoadingState message="Loading Google ads data..." />
                            ) : googleAccounts.length === 0 ? (
                                <div className="text-center py-12">
                                    <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <Globe className="h-6 w-6 text-red-600" />
                                    </div>
                                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Google Ads Found</h3>
                                    <p className="text-gray-500 mb-4">No clients have Google ad accounts connected yet.</p>
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
                                                <th className="text-right py-2 px-4 font-semibold text-gray-900">Impressions</th>
                                                <th className="text-right py-2 px-4 font-semibold text-gray-900">Clicks</th>
                                                <th className="text-right py-2 px-4 font-semibold text-gray-900">CTR</th>
                                                <th className="text-right py-2 px-4 font-semibold text-gray-900">Cost</th>
                                                <th className="text-right py-2 px-4 font-semibold text-gray-900">CPC</th>
                                                <th className="text-right py-2 px-4 font-semibold text-gray-900">Conversions</th>
                                                <th className="text-right py-2 px-4 font-semibold text-gray-900">Conv. Rate</th>
                                                <th className="text-center py-2 px-4 font-semibold text-gray-900">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {googleAccounts.map((account) => (
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
                                                                <div className="w-8 h-8 bg-gradient-to-br from-red-600 to-orange-600 rounded-lg flex items-center justify-center">
                                                                    <Globe className="h-4 w-4 text-white" />
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

                                                    <td className="py-2 px-4 text-right">
                                                        <div className="font-medium text-gray-900 text-sm">
                                                            {formatNumber(account.metrics.impressions)}
                                                        </div>
                                                    </td>

                                                    <td className="py-2 px-4 text-right">
                                                        <div className="font-medium text-gray-900 text-sm">
                                                            {formatNumber(account.metrics.clicks)}
                                                        </div>
                                                    </td>

                                                    <td className="py-2 px-4 text-right">
                                                        <div className="font-medium text-gray-900 text-sm">
                                                            {formatPercentage(account.metrics.ctr)}
                                                        </div>
                                                    </td>

                                                    <td className="py-2 px-4 text-right">
                                                        <div className="font-medium text-gray-900 text-sm">
                                                            {formatCurrency(account.metrics.cost)}
                                                        </div>
                                                    </td>

                                                    <td className="py-2 px-4 text-right">
                                                        <div className="font-medium text-gray-900 text-sm">
                                                            {formatCurrency(account.metrics.cpc)}
                                                        </div>
                                                    </td>

                                                    <td className="py-2 px-4 text-right">
                                                        <div className="font-medium text-green-600 text-sm">
                                                            {formatNumber(account.metrics.conversions)}
                                                        </div>
                                                    </td>

                                                    <td className="py-2 px-4 text-right">
                                                        <div className="font-medium text-gray-900 text-sm">
                                                            {formatPercentage(account.metrics.conversionRate)}
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

export default GoogleAdsPage;
