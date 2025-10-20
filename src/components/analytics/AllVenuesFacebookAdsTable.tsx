import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataSkeleton } from "@/components/ui/UnifiedLoadingSystem";
import { debugLogger } from '@/lib/debug';
import { DatabaseService } from "@/services/data/databaseService";
import { EventMetricsService } from "@/services/data/eventMetricsService";
import {
    BarChart3,
    Eye,
    TrendingUp
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

interface FacebookAdAccountData {
    clientId: string;
    venueName: string;
    logoUrl?: string;
    status: 'active' | 'paused' | 'inactive';
    facebookAccount: {
        accountId: string;
        accountName: string;
        connected: boolean;
    };
    metrics: {
        impressions: number;
        clicks: number;
        spend: number;
        leads: number;
        ctr: number;
        cpc: number;
        cpm: number;
        reach: number;
        frequency: number;
    };
    shareableLink: string;
}

interface AllVenuesFacebookAdsTableProps {
    selectedPeriod: string;
}

const AllVenuesFacebookAdsTable = ({ selectedPeriod }: AllVenuesFacebookAdsTableProps) => {
    const [facebookAccounts, setFacebookAccounts] = useState<FacebookAdAccountData[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadFacebookAdsData();
    }, [selectedPeriod]);

    const loadFacebookAdsData = async () => {
        try {
            setLoading(true);
            const clients = await DatabaseService.getAllClients();
            const dateRange = getDateRange(selectedPeriod);

            const accountsData: FacebookAdAccountData[] = [];

            for (const client of clients) {
                // Only include clients that have Facebook ads connected
                const hasFacebookAds = client.accounts?.facebookAds && client.accounts.facebookAds !== 'none';

                if (!hasFacebookAds) {continue;}

                try {
                    // Get comprehensive metrics for this client
                    const metrics = await EventMetricsService.getComprehensiveMetrics(
                        client.id,
                        dateRange,
                        client.accounts,
                        client.conversion_actions
                    );

                    const accountData: FacebookAdAccountData = {
                        clientId: client.id,
                        venueName: client.name,
                        logoUrl: client.logo_url,
                        status: client.status,
                        facebookAccount: {
                            accountId: client.accounts?.facebookAds || '',
                            accountName: `Facebook Ad Account (${client.accounts?.facebookAds || 'N/A'})`,
                            connected: true
                        },
                        metrics: {
                            impressions: metrics.facebookMetrics.impressions,
                            clicks: metrics.facebookMetrics.clicks,
                            spend: metrics.facebookMetrics.spend,
                            leads: metrics.facebookMetrics.leads,
                            ctr: metrics.facebookMetrics.ctr,
                            cpc: metrics.facebookMetrics.cpc,
                            cpm: metrics.facebookMetrics.cpm || 0,
                            reach: metrics.facebookMetrics.reach || 0,
                            frequency: metrics.facebookMetrics.frequency || 0
                        },
                        shareableLink: client.shareable_link || ''
                    };

                    accountsData.push(accountData);
                } catch (error) {
                    debugLogger.error('AllVenuesFacebookAdsTable', `Error loading metrics for client ${client.name}`, error);
                    // Still add the client with zero metrics if there's an error
                    accountsData.push({
                        clientId: client.id,
                        venueName: client.name,
                        logoUrl: client.logo_url,
                        status: client.status,
                        facebookAccount: {
                            accountId: client.accounts?.facebookAds || '',
                            accountName: `Facebook Ad Account (${client.accounts?.facebookAds || 'N/A'})`,
                            connected: true
                        },
                        metrics: {
                            impressions: 0,
                            clicks: 0,
                            spend: 0,
                            leads: 0,
                            ctr: 0,
                            cpc: 0,
                            cpm: 0,
                            reach: 0,
                            frequency: 0
                        },
                        shareableLink: client.shareable_link || ''
                    });
                }
            }

            setFacebookAccounts(accountsData);
        } catch (error) {
            debugLogger.error('AllVenuesFacebookAdsTable', 'Error loading Facebook ads data', error);
            setFacebookAccounts([]);
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

    // Calculate totals
    const totals = facebookAccounts.reduce((acc, account) => ({
        impressions: acc.impressions + account.metrics.impressions,
        clicks: acc.clicks + account.metrics.clicks,
        spend: acc.spend + account.metrics.spend,
        leads: acc.leads + account.metrics.leads,
    }), { impressions: 0, clicks: 0, spend: 0, leads: 0 });

    const avgCtr = totals.clicks > 0 ? totals.clicks / totals.impressions : 0;
    const avgCpc = totals.clicks > 0 ? totals.spend / totals.clicks : 0;

    return (
        <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid gap-4 grid-cols-1 md:grid-cols-4">
                <Card className="bg-white border border-slate-200 shadow-sm p-5">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-slate-600 mb-2">Total Venues</p>
                            <p className="text-3xl font-bold text-slate-900">{facebookAccounts.length}</p>
                        </div>
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                            <BarChart3 className="h-5 w-5 text-blue-600" />
                        </div>
                    </div>
                </Card>

                <Card className="bg-white border border-slate-200 shadow-sm p-5">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-slate-600 mb-2">Total Leads</p>
                            <p className="text-3xl font-bold text-slate-900">{formatNumber(totals.leads)}</p>
                        </div>
                        <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                            <TrendingUp className="h-5 w-5 text-green-600" />
                        </div>
                    </div>
                </Card>

                <Card className="bg-white border border-slate-200 shadow-sm p-5">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-slate-600 mb-2">Total Spend</p>
                            <p className="text-3xl font-bold text-slate-900">{formatCurrency(totals.spend)}</p>
                        </div>
                        <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                            <span className="text-orange-600 font-bold text-lg">$</span>
                        </div>
                    </div>
                </Card>

                <Card className="bg-white border border-slate-200 shadow-sm p-5">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-slate-600 mb-2">Avg CTR</p>
                            <p className="text-3xl font-bold text-slate-900">{formatPercentage(avgCtr)}</p>
                        </div>
                        <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                            <span className="text-purple-600 font-bold text-lg">%</span>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Facebook Ads Table */}
            <Card className="card-bg-light">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <div className="w-5 h-5 bg-blue-600 rounded flex items-center justify-center">
                            <span className="text-white font-bold text-xs">f</span>
                        </div>
                        Facebook Ads Performance - All Venues
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <DataSkeleton />
                    ) : facebookAccounts.length === 0 ? (
                        <div className="text-center py-12">
                            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <span className="text-blue-600 font-bold text-xl">f</span>
                            </div>
                            <h3 className="text-lg font-medium text-gray-900 mb-2">No Facebook Ads Found</h3>
                            <p className="text-gray-500 mb-4">No venues have Facebook ad accounts connected yet.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-slate-200">
                                        <th className="text-left py-3 px-3 font-semibold text-slate-900">Venue</th>
                                        <th className="text-right py-3 px-3 font-semibold text-slate-900">Impressions</th>
                                        <th className="text-right py-3 px-3 font-semibold text-slate-900">Clicks</th>
                                        <th className="text-right py-3 px-3 font-semibold text-slate-900">CTR</th>
                                        <th className="text-right py-3 px-3 font-semibold text-slate-900">Spend</th>
                                        <th className="text-right py-3 px-3 font-semibold text-slate-900">CPC</th>
                                        <th className="text-right py-3 px-3 font-semibold text-slate-900">Leads</th>
                                        <th className="text-right py-3 px-3 font-semibold text-slate-900">CPM</th>
                                        <th className="text-center py-3 px-3 font-semibold text-slate-900">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {facebookAccounts.map((account) => (
                                        <tr key={account.clientId} className="border-b border-slate-100 hover:bg-slate-50">
                                            <td className="py-3 px-3">
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

                                            <td className="py-3 px-3 text-right">
                                                <div className="font-medium text-slate-900 text-sm">
                                                    {formatNumber(account.metrics.impressions)}
                                                </div>
                                            </td>

                                            <td className="py-3 px-3 text-right">
                                                <div className="font-medium text-slate-900 text-sm">
                                                    {formatNumber(account.metrics.clicks)}
                                                </div>
                                            </td>

                                            <td className="py-3 px-3 text-right">
                                                <div className="font-medium text-slate-900 text-sm">
                                                    {formatPercentage(account.metrics.ctr)}
                                                </div>
                                            </td>

                                            <td className="py-3 px-3 text-right">
                                                <div className="font-medium text-slate-900 text-sm">
                                                    {formatCurrency(account.metrics.spend)}
                                                </div>
                                            </td>

                                            <td className="py-3 px-3 text-right">
                                                <div className="font-medium text-slate-900 text-sm">
                                                    {formatCurrency(account.metrics.cpc)}
                                                </div>
                                            </td>

                                            <td className="py-3 px-3 text-right">
                                                <div className="font-medium text-green-600 text-sm">
                                                    {formatNumber(account.metrics.leads)}
                                                </div>
                                            </td>

                                            <td className="py-3 px-3 text-right">
                                                <div className="font-medium text-slate-900 text-sm">
                                                    {formatCurrency(account.metrics.cpm)}
                                                </div>
                                            </td>

                                            <td className="py-3 px-3 text-center">
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
                                {/* Totals Row */}
                                <tfoot>
                                    <tr className="border-t-2 border-slate-300 bg-slate-50 font-semibold">
                                        <td className="py-3 px-3 text-slate-900">TOTAL</td>
                                        <td className="py-3 px-3 text-right text-slate-900">{formatNumber(totals.impressions)}</td>
                                        <td className="py-3 px-3 text-right text-slate-900">{formatNumber(totals.clicks)}</td>
                                        <td className="py-3 px-3 text-right text-slate-900">{formatPercentage(avgCtr)}</td>
                                        <td className="py-3 px-3 text-right text-slate-900">{formatCurrency(totals.spend)}</td>
                                        <td className="py-3 px-3 text-right text-slate-900">{formatCurrency(avgCpc)}</td>
                                        <td className="py-3 px-3 text-right text-green-600">{formatNumber(totals.leads)}</td>
                                        <td className="py-3 px-3 text-right text-slate-900">-</td>
                                        <td className="py-3 px-3 text-center">-</td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export default AllVenuesFacebookAdsTable;
