"use client";

import { AgencyHeader } from '@/components/dashboard/AgencyHeader';
import CompactTable from "@/components/ui/CompactTable";
import { Button } from "@/components/ui/button";
import { debugLogger } from '@/lib/debug';
import { DatabaseService } from "@/services/data/databaseService";
import { EventMetricsService } from "@/services/data/eventMetricsService";
import {
    ArrowLeft,
    BarChart3,
    Calendar,
    Eye
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

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
            previousPeriod?: {
                impressions: number;
                clicks: number;
                spend: number;
                leads: number;
                ctr: number;
                cpc: number;
            };
        };
        googleMetrics?: {
            impressions: number;
            clicks: number;
            cost: number;
            leads: number;
            ctr: number;
            cpc: number;
            previousPeriod?: {
                impressions: number;
                clicks: number;
                cost: number;
                leads: number;
                ctr: number;
                cpc: number;
            };
        };
    };
    shareableLink: string;
    // Add previous period data for trend indicators
    totalLeads_previous?: number;
    totalSpend_previous?: number;
    totalRevenue_previous?: number;
    roi_previous?: number;
}

const AdAccountsOverview = () => {
    const [adAccounts, setAdAccounts] = useState<AdAccountData[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedPeriod, setSelectedPeriod] = useState("30d");
    const [clients, setClients] = useState<Array<{id: string, name: string, logo_url?: string}>>([]);
    const navigate = useNavigate();

    useEffect(() => {
        loadAdAccountsData();
        loadClients();
    }, [selectedPeriod]);

    const loadClients = async () => {
        try {
            const allClients = await DatabaseService.getAllClients();
            setClients(allClients.map(client => ({
                id: client.id,
                name: client.name,
                logo_url: client.logo_url
            })));
        } catch (error) {
        }
    };

    const handleClientSelect = (clientId: string) => {
        navigate(`/dashboard/${clientId}`);
    };

    const handleBackToDashboard = () => {
        navigate('/');
    };

    const handleGoToAgency = () => {
        navigate('/agency');
    };

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


                if (!hasFacebookAds && !hasGoogleAds) {continue;}

                try {
                    // Get comprehensive metrics for this client with previous period comparison
                    const metrics = await EventMetricsService.getComprehensiveMetrics(
                        client.id,
                        dateRange,
                        client.accounts,
                        client.conversion_actions,
                        true // includePreviousPeriod
                    );

                    const accountData: AdAccountData = {
                        clientId: client.id,
                        venueName: client.name,
                        logoUrl: client.logo_url,
                        status: client.status,
                        platforms: {
                            facebookAds: hasFacebookAds ? {
                                accountId: client.accounts?.facebookAds || '',
                                accountName: `Facebook Ad Account (${client.accounts?.facebookAds || 'N/A'})`,
                                connected: true
                            } : undefined,
                            googleAds: hasGoogleAds ? {
                                accountId: client.accounts?.googleAds || '',
                                accountName: `Google Ads Account (${client.accounts?.googleAds || 'N/A'})`,
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
                                cpc: metrics.facebookMetrics.cpc,
                                previousPeriod: metrics.facebookMetrics.previousPeriod
                            } : undefined,
                            googleMetrics: hasGoogleAds ? {
                                impressions: metrics.googleMetrics.impressions,
                                clicks: metrics.googleMetrics.clicks,
                                cost: metrics.googleMetrics.cost,
                                leads: metrics.googleMetrics.leads,
                                ctr: metrics.googleMetrics.ctr,
                                cpc: metrics.googleMetrics.cpc,
                                previousPeriod: metrics.googleMetrics.previousPeriod
                            } : undefined
                        },
                        shareableLink: client.shareable_link || '',
                        // Add previous period data for trend indicators
                        totalLeads_previous: metrics.totalLeads_previous || 0,
                        totalSpend_previous: metrics.totalSpend_previous || 0,
                        totalRevenue_previous: metrics.totalRevenue_previous || 0,
                        roi_previous: metrics.roi_previous || 0
                    };

                    accountsData.push(accountData);
                } catch (error) {
                    debugLogger.error('AdAccountsOverview', `Error loading metrics for client ${client.name}`, error);
                    // Still add the client with zero metrics if there's an error
                    accountsData.push({
                        clientId: client.id,
                        venueName: client.name,
                        logoUrl: client.logo_url,
                        status: client.status,
                        platforms: {
                            facebookAds: hasFacebookAds ? {
                                accountId: client.accounts?.facebookAds || '',
                                accountName: `Facebook Ad Account (${client.accounts?.facebookAds || 'N/A'})`,
                                connected: true
                            } : undefined,
                            googleAds: hasGoogleAds ? {
                                accountId: client.accounts?.googleAds || '',
                                accountName: `Google Ads Account (${client.accounts?.googleAds || 'N/A'})`,
                                connected: true
                            } : undefined
                        },
                        metrics: {
                            totalLeads: 0,
                            totalSpend: 0,
                            totalRevenue: 0,
                            roi: 0
                        },
                        shareableLink: client.shareable_link || ''
                    });
                }
            }

            setAdAccounts(accountsData);
        } catch (error) {
            debugLogger.error('AdAccountsOverview', 'Error loading ad accounts data', error);
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
            {/* Agency Header with Venue Dropdown */}
            <AgencyHeader
                clients={clients}
                selectedClientId={undefined}
                onClientSelect={handleClientSelect}
                onBackToDashboard={handleBackToDashboard}
                onGoToAgency={handleGoToAgency}
                onExportPDF={() => {}}
                onShare={() => {}}
                exportingPDF={false}
                isShared={false}
                showVenueSelector={true}
            />

            {/* Header */}
            <div className="bg-transparent px-6 py-4">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link to="/">
                            <Button variant="ghost" size="sm" className="hover:bg-slate-100">
                                <ArrowLeft className="h-4 w-4 mr-2" />
                                Back to Dashboard
                            </Button>
                        </Link>
                        <div className="flex items-center gap-2">
                            <BarChart3 className="h-6 w-6 text-blue-600" />
                            <span className="text-xl font-bold text-slate-900">Ad Accounts Overview</span>
                        </div>
                    </div>

                    {/* Period Selector */}
                    <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-slate-500" />
                        <select
                            value={selectedPeriod}
                            onChange={(e) => setSelectedPeriod(e.target.value)}
                            className="px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 hover:border-slate-400 transition-colors"
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

            <div className="px-6 pb-6">
                <div className="max-w-7xl mx-auto">
                    {/* Platform Navigation */}
                    <div className="flex gap-2 mb-6">
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

                    {/* Ad Accounts Table */}
                    <CompactTable
                        data={adAccounts.map(account => ({
                            ...account,
                            venue: (
                                <div className="flex items-center gap-3">
                                    {account.logoUrl ? (
                                        <img
                                            src={account.logoUrl}
                                            alt={`${account.venueName} logo`}
                                            className="w-8 h-8 object-cover rounded-lg border border-slate-200"
                                        />
                                    ) : (
                                        <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                                            <BarChart3 className="h-4 w-4 text-white" />
                                        </div>
                                    )}
                                    <div>
                                        <div className="font-semibold text-slate-900">{account.venueName}</div>
                                        <div className={`text-xs px-2 py-1 rounded-full inline-block mt-1 ${account.status === 'active' ? 'bg-green-100 text-green-800' :
                                                account.status === 'paused' ? 'bg-yellow-100 text-yellow-800' :
                                                    'bg-gray-100 text-gray-800'
                                            }`}>
                                            {account.status}
                                        </div>
                                    </div>
                                </div>
                            ),
                            platforms: (
                                <div className="flex gap-2">
                                    {account.platforms.facebookAds && (
                                        <div className="flex items-center gap-1.5 px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs font-medium">
                                            <div className="w-3 h-3 bg-blue-600 rounded flex items-center justify-center">
                                                <span className="text-white font-bold text-xs">f</span>
                                            </div>
                                            Facebook
                                        </div>
                                    )}
                                    {account.platforms.googleAds && (
                                        <div className="flex items-center gap-1.5 px-2 py-1 bg-red-50 text-red-700 rounded text-xs font-medium">
                                            <div className="w-3 h-3 bg-red-600 rounded flex items-center justify-center">
                                                <span className="text-white font-bold text-xs">G</span>
                                            </div>
                                            Google
                                        </div>
                                    )}
                                </div>
                            ),
                            totalLeads: account.metrics.totalLeads,
                            totalSpend: account.metrics.totalSpend,
                            totalRevenue: account.metrics.totalRevenue,
                            roi: account.metrics.roi,
                            actions: (
                                <Link to={`/share/${account.clientId}`}>
                                    <Button variant="outline" size="sm" className="hover:bg-slate-100">
                                        <Eye className="h-4 w-4 mr-2" />
                                        View Dashboard
                                    </Button>
                                </Link>
                            )
                        }))}
                        columns={[
                            { key: 'venue', label: 'Venue', align: 'left', format: 'text' },
                            { key: 'platforms', label: 'Platforms', align: 'left', format: 'text' },
                            { key: 'totalLeads', label: 'Leads', align: 'right', format: 'number', showTrend: true },
                            { key: 'totalSpend', label: 'Spend', align: 'right', format: 'currency', showTrend: true },
                            { key: 'totalRevenue', label: 'Revenue', align: 'right', format: 'currency', showTrend: true },
                            { key: 'roi', label: 'ROI', align: 'right', format: 'percentage', showTrend: true },
                            { key: 'actions', label: 'Actions', align: 'center', format: 'text' }
                        ]}
                        density="compact"
                        loading={loading}
                        emptyMessage="No clients have ad accounts connected yet."
                        emptyIcon={<BarChart3 className="h-12 w-12 text-gray-400 mx-auto" />}
                        maxRows={100}
                    />
                </div>
            </div>
        </div>
    );
};

export default AdAccountsOverview;
