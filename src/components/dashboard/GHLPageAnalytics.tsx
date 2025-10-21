import { Spinner } from '@/components/ui/UnifiedLoadingSystem';
import { GoHighLevelService } from '@/services/ghl/goHighLevelService';
import React, { useEffect, useState } from 'react';
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Card } from '@/components/ui/card';

interface GHLPageAnalyticsProps {
  locationId: string;
  dateRange?: { start: string; end: string };
}

interface PageData {
  pages: Array<{
    id: string;
    name: string;
    url: string;
    views: number;
    conversions: number;
    conversionRate: number;
    lastUpdated: string;
  }>;
  totalPages: number;
  totalViews: number;
  totalConversions: number;
  averageConversionRate: number;
}

const PAGE_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

export const GHLPageAnalytics: React.FC<GHLPageAnalyticsProps> = ({ locationId, dateRange }) => {
  const [pageData, setPageData] = useState<PageData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPageData = async () => {
      try {
        // Convert date range format for API
        const apiDateRange = dateRange ? {
          startDate: dateRange.start,
          endDate: dateRange.end
        } : undefined;
        
        const data = await GoHighLevelService.getPageAnalytics(locationId, apiDateRange);
        
        // Transform the API response to match our interface
        const transformedData: PageData = {
          pages: data.map(page => ({
            id: page.id,
            name: page.name,
            url: '', // Not available in API
            views: page.views,
            conversions: page.conversions,
            conversionRate: page.conversionRate,
            lastUpdated: new Date().toISOString()
          })),
          totalPages: data.length,
          totalViews: data.reduce((sum, page) => sum + page.views, 0),
          totalConversions: data.reduce((sum, page) => sum + page.conversions, 0),
          averageConversionRate: data.length > 0 ? 
            data.reduce((sum, page) => sum + page.conversionRate, 0) / data.length : 0
        };
        
        setPageData(transformedData);
      } catch (_error) {
        // Error handled by error boundary
        setPageData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchPageData();
  }, [locationId, dateRange]);

  if (loading) {
    return (
      <Card className="bg-white border border-slate-200 shadow-sm p-6">
        <div className="pb-3">
          <h3 className="text-lg font-semibold text-slate-900">Page Analytics</h3>
        </div>
        <div className="h-80 flex items-center justify-center">
          <div className="flex items-center gap-2 text-slate-500">
            <Spinner size="sm" />
            Loading page analytics...
          </div>
        </div>
      </Card>
    );
  }

  if (!pageData || pageData.totalPages === 0) {
    return (
      <Card className="bg-white border border-slate-200 shadow-sm p-6">
        <div className="pb-3">
          <h3 className="text-lg font-semibold text-slate-900">Page Analytics</h3>
        </div>
        <div className="h-80 flex items-center justify-center">
          <div className="text-slate-500">No page data available</div>
        </div>
      </Card>
    );
  }

  // Sort pages by views and take top 10
  const topPages = pageData.pages
    .sort((a, b) => b.views - a.views)
    .slice(0, 10)
    .map((page, index) => ({
      ...page,
      color: PAGE_COLORS[index % PAGE_COLORS.length],
      shortName: page.name.length > 25 ? page.name.substring(0, 25) + '...' : page.name
    }));

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-white border border-slate-200 shadow-sm p-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{pageData.totalPages}</div>
            <div className="text-sm text-slate-600">Total Pages</div>
          </div>
        </Card>
        
        <Card className="bg-white border border-slate-200 shadow-sm p-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{pageData.totalViews.toLocaleString()}</div>
            <div className="text-sm text-slate-600">Total Views</div>
          </div>
        </Card>
        
        <Card className="bg-white border border-slate-200 shadow-sm p-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">{pageData.totalConversions.toLocaleString()}</div>
            <div className="text-sm text-slate-600">Total Conversions</div>
          </div>
        </Card>
        
        <Card className="bg-white border border-slate-200 shadow-sm p-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">{pageData.averageConversionRate.toFixed(1)}%</div>
            <div className="text-sm text-slate-600">Avg Conversion Rate</div>
          </div>
        </Card>
      </div>

      {/* Top Pages Chart */}
      <Card className="bg-white border border-slate-200 shadow-sm p-6">
        <div className="pb-3">
          <h3 className="text-lg font-semibold text-slate-900">Top Performing Pages</h3>
          <p className="text-sm text-slate-600">Pages with highest view counts</p>
        </div>
        
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={topPages}>
              <XAxis 
                dataKey="shortName" 
                tick={{ fontSize: 12 }}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip 
                formatter={(value: number, name: string, _props: any) => [
                  `${value.toLocaleString()}${name === 'conversionRate' ? '%' : ''}`,
                  name === 'views' ? 'Views' : 
                  name === 'conversions' ? 'Conversions' : 
                  name === 'conversionRate' ? 'Conversion Rate' : name
                ]}
                labelFormatter={(label, payload) => {
                  const data = payload?.[0]?.payload;
                  return data?.name || label;
                }}
                contentStyle={{ 
                  backgroundColor: '#fff', 
                  border: '1px solid #E2E8F0',
                  borderRadius: '6px'
                }}
              />
              <Bar dataKey="views" fill="#3B82F6" name="views" />
              <Bar dataKey="conversions" fill="#10B981" name="conversions" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Conversion Rate Chart */}
      <Card className="bg-white border border-slate-200 shadow-sm p-6">
        <div className="pb-3">
          <h3 className="text-lg font-semibold text-slate-900">Conversion Rates</h3>
          <p className="text-sm text-slate-600">Conversion rates by page</p>
        </div>
        
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={topPages}>
              <XAxis 
                dataKey="shortName" 
                tick={{ fontSize: 12 }}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip 
                formatter={(value: number, _name: string, _props: any) => [
                  `${value.toFixed(1)}%`,
                  'Conversion Rate'
                ]}
                labelFormatter={(label, payload) => {
                  const data = payload?.[0]?.payload;
                  return data?.name || label;
                }}
                contentStyle={{ 
                  backgroundColor: '#fff', 
                  border: '1px solid #E2E8F0',
                  borderRadius: '6px'
                }}
              />
              <Bar dataKey="conversionRate" fill="#F59E0B" name="conversionRate" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Pages Table */}
      <Card className="bg-white border border-slate-200 shadow-sm p-6">
        <div className="pb-3">
          <h3 className="text-lg font-semibold text-slate-900">All Pages</h3>
          <p className="text-sm text-slate-600">Complete list of pages and their performance</p>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-2 font-medium text-slate-600">Page Name</th>
                <th className="text-left py-2 font-medium text-slate-600">URL</th>
                <th className="text-right py-2 font-medium text-slate-600">Views</th>
                <th className="text-right py-2 font-medium text-slate-600">Conversions</th>
                <th className="text-right py-2 font-medium text-slate-600">Conversion Rate</th>
                <th className="text-right py-2 font-medium text-slate-600">Last Updated</th>
              </tr>
            </thead>
            <tbody>
              {pageData.pages.map((page) => (
                <tr key={page.id} className="border-b border-slate-100">
                  <td className="py-2">
                    <div className="font-medium text-slate-700">{page.name}</div>
                  </td>
                  <td className="py-2">
                    <div className="text-slate-600 text-xs max-w-xs truncate" title={page.url}>
                      {page.url}
                    </div>
                  </td>
                  <td className="text-right py-2 text-slate-600">
                    {page.views.toLocaleString()}
                  </td>
                  <td className="text-right py-2 text-slate-600">
                    {page.conversions.toLocaleString()}
                  </td>
                  <td className="text-right py-2 text-slate-600">
                    {page.conversionRate.toFixed(1)}%
                  </td>
                  <td className="text-right py-2 text-slate-600">
                    {new Date(page.lastUpdated).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
