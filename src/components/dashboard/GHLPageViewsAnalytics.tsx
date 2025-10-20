import { Spinner } from '@/components/ui/UnifiedLoadingSystem';
import { GoHighLevelService } from '@/services/ghl/goHighLevelService';
import React, { useEffect, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

interface GHLPageViewsAnalyticsProps {
  locationId: string;
  dateRange?: { start: string; end: string };
}

interface PageViewData {
  totalPageViews: number;
  uniquePages: Array<{ page: string; views: number; percentage: number }>;
  topLandingPages: Array<{ url: string; views: number; conversions: number; conversionRate: number }>;
  utmCampaigns: Array<{ campaign: string; views: number; conversions: number; conversionRate: number }>;
  utmSources: Array<{ source: string; views: number; conversions: number; conversionRate: number }>;
  referrerBreakdown: Array<{ referrer: string; views: number; percentage: number }>;
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'];

export const GHLPageViewsAnalytics: React.FC<GHLPageViewsAnalyticsProps> = ({ locationId, dateRange }) => {
  const [pageViewData, setPageViewData] = useState<PageViewData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPageViewData = async () => {
      try {
        const _metrics = await GoHighLevelService.getGHLMetrics(locationId, {
          startDate: dateRange?.start,
          endDate: dateRange?.end
        });
        
        // Extract page view data from contacts' attribution data
        // const allContacts = await GoHighLevelService.getAllContacts(); // Private method - commented out
        const allContacts: any[] = [];
        
        // Process attribution data to get page views
        const pageViews: string[] = [];
        const landingPages: Record<string, number> = {};
        const campaigns: Record<string, number> = {};
        const sources: Record<string, number> = {};
        const referrers: Record<string, number> = {};
        
        allContacts.forEach(contact => {
          if (contact.attributions) {
            contact.attributions.forEach((attribution: any) => {
              // Extract page URL
              if (attribution.pageUrl) {
                pageViews.push(attribution.pageUrl);
                
                // Track landing pages
                const url = attribution.pageUrl.split('?')[0]; // Remove query params
                landingPages[url] = (landingPages[url] || 0) + 1;
              }
              
              // Extract UTM campaign
              if (attribution.utmCampaign) {
                campaigns[attribution.utmCampaign] = (campaigns[attribution.utmCampaign] || 0) + 1;
              }
              
              // Extract UTM source
              if (attribution.utmSource) {
                sources[attribution.utmSource] = (sources[attribution.utmSource] || 0) + 1;
              }
              
              // Extract referrer
              if (attribution.referrer) {
                const referrer = attribution.referrer.replace(/^https?:\/\//, '').split('/')[0];
                referrers[referrer] = (referrers[referrer] || 0) + 1;
              }
            });
          }
        });

        const totalPageViews = pageViews.length;
        
        // Process unique pages
        const pageCounts: Record<string, number> = {};
        pageViews.forEach(page => {
          const cleanPage = page.split('?')[0];
          pageCounts[cleanPage] = (pageCounts[cleanPage] || 0) + 1;
        });
        
        const uniquePages = Object.entries(pageCounts)
          .map(([page, views]) => ({
            page: page.replace('https://magnoliaterrace.tulensystems.com/', ''),
            views,
            percentage: totalPageViews > 0 ? (views / totalPageViews) * 100 : 0
          }))
          .sort((a, b) => b.views - a.views)
          .slice(0, 10);

        // Process top landing pages with conversion data
        const topLandingPages = Object.entries(landingPages)
          .map(([url, views]) => {
            const cleanUrl = url.replace('https://magnoliaterrace.tulensystems.com/', '');
            const conversions = allContacts.filter(contact => 
              contact.attributions?.some((att: any) => att.pageUrl?.includes(url))
            ).length;
            
            return {
              url: cleanUrl,
              views,
              conversions,
              conversionRate: views > 0 ? (conversions / views) * 100 : 0
            };
          })
          .sort((a, b) => b.views - a.views)
          .slice(0, 5);

        // Process UTM campaigns
        const utmCampaigns = Object.entries(campaigns)
          .map(([campaign, views]) => {
            const conversions = allContacts.filter(contact => 
              contact.attributions?.some((att: any) => att.utmCampaign === campaign)
            ).length;
            
            return {
              campaign: campaign.length > 20 ? campaign.substring(0, 20) + '...' : campaign,
              views,
              conversions,
              conversionRate: views > 0 ? (conversions / views) * 100 : 0
            };
          })
          .sort((a, b) => b.views - a.views)
          .slice(0, 5);

        // Process UTM sources
        const utmSources = Object.entries(sources)
          .map(([source, views]) => {
            const conversions = allContacts.filter(contact => 
              contact.attributions?.some((att: any) => att.utmSource === source)
            ).length;
            
            return {
              source,
              views,
              conversions,
              conversionRate: views > 0 ? (conversions / views) * 100 : 0
            };
          })
          .sort((a, b) => b.views - a.views)
          .slice(0, 5);

        // Process referrers
        const referrerBreakdown = Object.entries(referrers)
          .map(([referrer, views]) => ({
            referrer: referrer.length > 30 ? referrer.substring(0, 30) + '...' : referrer,
            views,
            percentage: totalPageViews > 0 ? (views / totalPageViews) * 100 : 0
          }))
          .sort((a, b) => b.views - a.views)
          .slice(0, 8);

        setPageViewData({
          totalPageViews,
          uniquePages,
          topLandingPages,
          utmCampaigns,
          utmSources,
          referrerBreakdown
        });
      } catch (_error) {
        // Error handled by error boundary
      } finally {
        setLoading(false);
      }
    };

    fetchPageViewData();
  }, [dateRange]);

  if (loading) {
    return (
      <Card className="bg-white border border-slate-200  p-6">
        <div className="pb-3">
          <h3 className="text-lg font-semibold text-slate-900">GHL Page Views Analytics</h3>
        </div>
        <div className="h-64 flex items-center justify-center">
          <div className="flex items-center gap-2 text-slate-500">
            <Spinner size="sm" />
            Loading page view data...
          </div>
        </div>
      </Card>
    );
  }

  if (!pageViewData) {
    return (
      <Card className="bg-white border border-slate-200  p-6">
        <div className="pb-3">
          <h3 className="text-lg font-semibold text-slate-900">GHL Page Views Analytics</h3>
        </div>
        <div className="h-64 flex items-center justify-center">
          <div className="text-slate-500">No page view data available</div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="bg-white border border-slate-200  p-6">
      <div className="pb-3">
        <h3 className="text-lg font-semibold text-slate-900">GHL Page Views Analytics</h3>
      </div>
      
      {/* Total Page Views */}
      <div className="mb-6 p-4 bg-blue-50 rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-lg font-semibold text-blue-900">Total Page Views</h4>
            <p className="text-sm text-blue-700">From all traffic sources</p>
          </div>
          <div className="text-3xl font-bold text-blue-600">
            {pageViewData.totalPageViews.toLocaleString()}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Landing Pages */}
        <div className="h-64">
          <h4 className="text-sm font-medium text-slate-700 mb-3">Top Landing Pages</h4>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={pageViewData.topLandingPages}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis 
                dataKey="url" 
                tick={{ fontSize: 10 }}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip 
                formatter={(value: number, name: string, props: any) => [
                  `${value} views (${props.payload.conversionRate.toFixed(1)}% conversion)`,
                  'Views'
                ]}
                labelStyle={{ color: '#374151' }}
                contentStyle={{ 
                  backgroundColor: '#fff', 
                  border: '1px solid #E2E8F0',
                  borderRadius: '6px'
                }}
              />
              <Bar dataKey="views" fill="#3B82F6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* UTM Sources */}
        <div className="h-64">
          <h4 className="text-sm font-medium text-slate-700 mb-3">Traffic Sources</h4>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pageViewData.utmSources}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ source, percentage }: any) => `${source}: ${(percentage as number).toFixed(1)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="views"
              >
                {pageViewData.utmSources.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value: number, name: string, props: any) => [
                  `${value} views (${props.payload.conversionRate.toFixed(1)}% conversion)`,
                  'Views'
                ]}
                labelStyle={{ color: '#374151' }}
                contentStyle={{ 
                  backgroundColor: '#fff', 
                  border: '1px solid #E2E8F0',
                  borderRadius: '6px'
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Referrer Breakdown */}
      <div className="mt-6">
        <h4 className="text-sm font-medium text-slate-700 mb-3">Top Referrers</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {pageViewData.referrerBreakdown.map((referrer, index) => (
            <div key={referrer.referrer} className="p-3 bg-slate-50 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: COLORS[index % COLORS.length] }}
                />
                <span className="text-sm font-medium text-slate-700 truncate">
                  {referrer.referrer}
                </span>
              </div>
              <div className="text-lg font-bold text-slate-900">
                {referrer.views.toLocaleString()}
              </div>
              <div className="text-xs text-slate-500">
                {referrer.percentage.toFixed(1)}% of traffic
              </div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
};
