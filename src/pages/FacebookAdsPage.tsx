"use client";

import { FacebookConnectionPrompt } from "@/components/connection/FacebookConnectionPrompt";
import { LoadingState } from '@/components/ui/LoadingStates';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { debugLogger } from '@/lib/debug';
import { supabase } from '@/lib/supabase';
import { DatabaseService } from "@/services/data/databaseService";
import { EventDashboardData, EventMetricsService } from '@/services/data/eventMetricsService';
import {
    ArrowLeft,
    Calendar
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

const FacebookAdsPage = () => {
    const [dashboardData, setDashboardData] = useState<EventDashboardData | null>(null);
    const [loading, setLoading] = useState(true);
    const [selectedPeriod, setSelectedPeriod] = useState("30d");
    const [isFacebookConnected, setIsFacebookConnected] = useState(false);

    useEffect(() => {
        checkFacebookConnection();
        loadFacebookAdsData();
    }, [selectedPeriod]);

    const checkFacebookConnection = async () => {
        try {
            // Check database for Facebook connection
            const { data, error } = await supabase
                .from('integrations')
                .select('connected')
                .eq('platform', 'facebookAds')
                .single();
            
            setIsFacebookConnected(data?.connected || false);
        } catch (error) {
            debugLogger.error('FacebookAdsPage', 'Error checking Facebook connection', error);
            setIsFacebookConnected(false);
        }
    };

    const loadFacebookAdsData = async () => {
        try {
            setLoading(true);
            const clients = await DatabaseService.getAllClients();
            const dateRange = getDateRange(selectedPeriod);

            // Filter to only show individual venues (exclude any 'all_venues' type clients)
            const individualClients = clients.filter(client => client.id !== 'all_venues');
            
            if (individualClients.length > 0) {
                // Get data for the first individual client
                const client = individualClients[0];
                const metrics = await EventMetricsService.getComprehensiveMetrics(
                    client.id,
                    dateRange,
                    client.accounts,
                    client.conversion_actions
                );
                setDashboardData(metrics);
            }
        } catch (error) {
            debugLogger.error('FacebookAdsPage', 'Error loading Facebook ads data', error);
            setDashboardData(null);
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
                            <div className="w-6 h-6 bg-blue-600 rounded flex items-center justify-center">
                                <span className="text-white font-bold text-sm">f</span>
                            </div>
                            <span className="text-lg font-bold text-gray-900">Meta Ads</span>
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
                    {loading ? (
                        <LoadingState message="Loading Meta Ads data..." />
                    ) : dashboardData ? (
                        <>
                            {/* Key Metrics - 2 Rows of KPI Cards */}
                            <div className="mb-6">
                                {/* First Row - 4 Cards */}
                                <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4 mb-4">
                                    <Card className="bg-white border border-slate-200 shadow-sm p-5 h-24">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-sm font-medium text-slate-600 mb-2">Leads</p>
                                                <div className="flex items-baseline gap-2">
                                                    <p className="text-3xl font-bold text-slate-900">{dashboardData?.facebookMetrics?.leads || '0'}</p>
                                                    <div className="flex items-center gap-1">
                                                        <span className="text-sm text-green-600 font-medium">↑ +15.2%</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </Card>

                                    <Card className="bg-white border border-slate-200 shadow-sm p-5 h-24">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-sm font-medium text-slate-600 mb-2">Cost Per Lead</p>
                                                <div className="flex items-baseline gap-2">
                                                    <p className="text-3xl font-bold text-slate-900">${dashboardData?.facebookMetrics?.costPerLead?.toFixed(2) || '0.00'}</p>
                                                    <div className="flex items-center gap-1">
                                                        <span className="text-sm text-red-600 font-medium">↓ -8.3%</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </Card>

                                    <Card className="bg-white border border-slate-200 shadow-sm p-5 h-24">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-sm font-medium text-slate-600 mb-2">Conversion Rate</p>
                                                <div className="flex items-baseline gap-2">
                                                    <p className="text-3xl font-bold text-slate-900">{((dashboardData?.facebookMetrics?.leads || 0) / (dashboardData?.facebookMetrics?.clicks || 1) * 100).toFixed(1)}%</p>
                                                    <div className="flex items-center gap-1">
                                                        <span className="text-sm text-green-600 font-medium">↑ +5.7%</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </Card>

                                    <Card className="bg-white border border-slate-200 shadow-sm p-5 h-24">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-sm font-medium text-slate-600 mb-2">Spent</p>
                                                <div className="flex items-baseline gap-2">
                                                    <p className="text-3xl font-bold text-slate-900">${dashboardData?.facebookMetrics?.spend?.toLocaleString() || '0'}</p>
                                                    <div className="flex items-center gap-1">
                                                        <span className="text-sm text-green-600 font-medium">↑ +2.0%</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </Card>
                                </div>

                                {/* Second Row - 4 Cards */}
                                <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
                                    <Card className="bg-white border border-slate-200 shadow-sm p-5 h-24">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-sm font-medium text-slate-600 mb-2">Impressions</p>
                                                <div className="flex items-baseline gap-2">
                                                    <p className="text-3xl font-bold text-slate-900">{dashboardData?.facebookMetrics?.impressions?.toLocaleString() || '0'}</p>
                                                    <div className="flex items-center gap-1">
                                                        <span className="text-sm text-green-600 font-medium">↑ +8.5%</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </Card>

                                    <Card className="bg-white border border-slate-200 shadow-sm p-5 h-24">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-sm font-medium text-slate-600 mb-2">Link Clicks</p>
                                                <div className="flex items-baseline gap-2">
                                                    <p className="text-3xl font-bold text-slate-900">{dashboardData?.facebookMetrics?.clicks?.toLocaleString() || '0'}</p>
                                                    <div className="flex items-center gap-1">
                                                        <span className="text-sm text-green-600 font-medium">↑ +22.3%</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </Card>

                                    <Card className="bg-white border border-slate-200 shadow-sm p-5 h-24">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-sm font-medium text-slate-600 mb-2">Cost Per Link Click</p>
                                                <div className="flex items-baseline gap-2">
                                                    <p className="text-3xl font-bold text-slate-900">${dashboardData?.facebookMetrics?.cpc?.toFixed(2) || '0.00'}</p>
                                                    <div className="flex items-center gap-1">
                                                        <span className="text-sm text-red-600 font-medium">↓ -12.8%</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </Card>

                                    <Card className="bg-white border border-slate-200 shadow-sm p-5 h-24">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-sm font-medium text-slate-600 mb-2">CTR</p>
                                                <div className="flex items-baseline gap-2">
                                                    <p className="text-3xl font-bold text-slate-900">{dashboardData?.facebookMetrics?.ctr?.toFixed(2) || '0'}%</p>
                                                    <div className="flex items-center gap-1">
                                                        <span className="text-sm text-red-600 font-medium">↓ -47.2%</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </Card>
                                </div>
                            </div>

                            {/* Platform Breakdown and Demographics */}
                            <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
                                {/* Platform Breakdown */}
                                <Card className="bg-white border border-slate-200 shadow-sm">
                                    <CardHeader className="pb-4">
                                        <CardTitle className="text-lg font-semibold text-slate-900">Platform Breakdown</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-6">
                                            {/* Facebook vs Instagram */}
                                            <div>
                                                <div className="flex justify-between items-center mb-3">
                                                    <h3 className="text-sm font-semibold text-slate-700">Facebook vs Instagram</h3>
                                                    <span className="text-xs text-slate-500">{dashboardData?.facebookMetrics?.leads || '0'} total leads</span>
                                                </div>
                                                <div className="space-y-3">
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-sm text-slate-600">Facebook</span>
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-24 bg-slate-200 rounded-full h-2">
                                                                <div className="bg-blue-500 h-2 rounded-full" style={{ width: '65%' }}></div>
                                                            </div>
                                                            <span className="text-xs text-slate-500">65%</span>
                                                        </div>
                                                    </div>
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-sm text-slate-600">Instagram</span>
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-24 bg-slate-200 rounded-full h-2">
                                                                <div className="bg-pink-500 h-2 rounded-full" style={{ width: '35%' }}></div>
                                                            </div>
                                                            <span className="text-xs text-slate-500">35%</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Ad Placements */}
                                            <div>
                                                <div className="flex justify-between items-center mb-3">
                                                    <h3 className="text-sm font-semibold text-slate-700">Ad Placements</h3>
                                                    <span className="text-xs text-slate-500">${dashboardData?.facebookMetrics?.spend?.toLocaleString() || '0'} total spend</span>
                                                </div>
                                                <div className="space-y-3">
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-sm text-slate-600">Feed</span>
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-24 bg-slate-200 rounded-full h-2">
                                                                <div className="bg-blue-500 h-2 rounded-full" style={{ width: '45%' }}></div>
                                                            </div>
                                                            <span className="text-xs text-slate-500">45%</span>
                                                        </div>
                                                    </div>
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-sm text-slate-600">Stories</span>
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-24 bg-slate-200 rounded-full h-2">
                                                                <div className="bg-purple-500 h-2 rounded-full" style={{ width: '30%' }}></div>
                                                            </div>
                                                            <span className="text-xs text-slate-500">30%</span>
                                                        </div>
                                                    </div>
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-sm text-slate-600">Reels</span>
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-24 bg-slate-200 rounded-full h-2">
                                                                <div className="bg-pink-500 h-2 rounded-full" style={{ width: '25%' }}></div>
                                                            </div>
                                                            <span className="text-xs text-slate-500">25%</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Demographics */}
                                <Card className="bg-white border border-slate-200 shadow-sm">
                                    <CardHeader className="pb-4">
                                        <CardTitle className="text-lg font-semibold text-slate-900">Demographics</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-6">
                                            {/* Age Groups */}
                                            <div>
                                                <div className="flex justify-between items-center mb-3">
                                                    <h3 className="text-sm font-semibold text-slate-700">Age Groups</h3>
                                                    <span className="text-xs text-slate-500">{dashboardData?.facebookMetrics?.leads || '0'} total leads</span>
                                                </div>
                                                <div className="space-y-3">
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-sm text-slate-600">25-34</span>
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-24 bg-slate-200 rounded-full h-2">
                                                                <div className="bg-blue-500 h-2 rounded-full" style={{ width: '40%' }}></div>
                                                            </div>
                                                            <span className="text-xs text-slate-500">40%</span>
                                                        </div>
                                                    </div>
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-sm text-slate-600">35-44</span>
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-24 bg-slate-200 rounded-full h-2">
                                                                <div className="bg-green-500 h-2 rounded-full" style={{ width: '35%' }}></div>
                                                            </div>
                                                            <span className="text-xs text-slate-500">35%</span>
                                                        </div>
                                                    </div>
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-sm text-slate-600">45-54</span>
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-24 bg-slate-200 rounded-full h-2">
                                                                <div className="bg-purple-500 h-2 rounded-full" style={{ width: '20%' }}></div>
                                                            </div>
                                                            <span className="text-xs text-slate-500">20%</span>
                                                        </div>
                                                    </div>
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-sm text-slate-600">55+</span>
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-24 bg-slate-200 rounded-full h-2">
                                                                <div className="bg-orange-500 h-2 rounded-full" style={{ width: '5%' }}></div>
                                                            </div>
                                                            <span className="text-xs text-slate-500">5%</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Gender */}
                                            <div>
                                                <div className="flex justify-between items-center mb-3">
                                                    <h3 className="text-sm font-semibold text-slate-700">Gender</h3>
                                                    <span className="text-xs text-slate-500">{dashboardData?.facebookMetrics?.leads || '0'} total leads</span>
                                                </div>
                                                <div className="w-full bg-slate-200 rounded-full h-8 relative overflow-hidden">
                                                    <div className="bg-blue-500 h-8 rounded-l-full transition-all duration-700 ease-out flex items-center justify-center" style={{ width: '60%' }}>
                                                        <span className="text-xs font-normal text-white">Female (60%)</span>
                                                    </div>
                                                    <div className="bg-green-500 h-8 rounded-r-full transition-all duration-700 ease-out absolute top-0 flex items-center justify-center" style={{ width: '40%', left: '60%' }}>
                                                        <span className="text-xs font-normal text-white">Male (40%)</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        </>
                    ) : !isFacebookConnected ? (
                        <div className="max-w-md mx-auto">
                            <FacebookConnectionPrompt onConnectionSuccess={() => {
                                setIsFacebookConnected(true);
                                loadFacebookAdsData();
                            }} />
                        </div>
                    ) : (
                        <div className="text-center py-12">
                            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <span className="text-blue-600 font-bold text-xl">f</span>
                            </div>
                            <h3 className="text-lg font-medium text-gray-900 mb-2">No Meta Ads Data Found</h3>
                            <p className="text-gray-500 mb-4">No Meta Ads data available for the selected period.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default FacebookAdsPage;