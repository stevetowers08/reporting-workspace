import { Card } from '@/components/ui/card';
import { GoHighLevelService } from '@/services/api/goHighLevelService';
import React, { useEffect, useState } from 'react';
import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

interface GHLFunnelAnalyticsProps {
  locationId: string;
  dateRange?: { start: string; end: string };
}

interface FunnelData {
  funnels: Array<{
    id: string;
    name: string;
    status: string;
    createdAt: string;
    pages: Array<{
      id: string;
      name: string;
      url: string;
      views: number;
      conversions: number;
      conversionRate: number;
    }>;
    redirects: Array<{
      id: string;
      name: string;
      url: string;
      clicks: number;
      conversions: number;
      conversionRate: number;
    }>;
  }>;
  totalFunnels: number;
  totalPageViews: number;
  totalConversions: number;
  averageConversionRate: number;
}

const FUNNEL_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

export const GHLFunnelAnalytics: React.FC<GHLFunnelAnalyticsProps> = ({ locationId, dateRange }) => {
  const [funnelData, setFunnelData] = useState<FunnelData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFunnelData = async () => {
      try {
        const data = await GoHighLevelService.getFunnelAnalytics(locationId, dateRange);
        setFunnelData(data);
      } catch (error) {
        console.error('Failed to fetch funnel analytics:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchFunnelData();
  }, [dateRange]);

  if (loading) {
    return (
      <Card className="bg-white border border-slate-200 shadow-sm p-6">
        <div className="pb-3">
          <h3 className="text-lg font-semibold text-slate-900">Funnel Analytics</h3>
        </div>
        <div className="h-80 flex items-center justify-center">
          <div className="animate-pulse text-slate-500">Loading funnel analytics...</div>
        </div>
      </Card>
    );
  }

  if (!funnelData || funnelData.totalFunnels === 0) {
    return (
      <Card className="bg-white border border-slate-200 shadow-sm p-6">
        <div className="pb-3">
          <h3 className="text-lg font-semibold text-slate-900">Funnel Analytics</h3>
        </div>
        <div className="h-80 flex items-center justify-center">
          <div className="text-slate-500">No funnel data available</div>
        </div>
      </Card>
    );
  }

  // Prepare chart data
  const funnelPerformanceData = funnelData.funnels.map((funnel, index) => ({
    name: funnel.name.length > 15 ? funnel.name.substring(0, 15) + '...' : funnel.name,
    fullName: funnel.name,
    views: funnel.pages.reduce((sum, page) => sum + page.views, 0),
    conversions: funnel.pages.reduce((sum, page) => sum + page.conversions, 0),
    conversionRate: funnel.pages.reduce((sum, page) => sum + page.views, 0) > 0 
      ? (funnel.pages.reduce((sum, page) => sum + page.conversions, 0) / funnel.pages.reduce((sum, page) => sum + page.views, 0)) * 100 
      : 0,
    color: FUNNEL_COLORS[index % FUNNEL_COLORS.length]
  }));

  const topPagesData = funnelData.funnels
    .flatMap(funnel => funnel.pages)
    .sort((a, b) => b.views - a.views)
    .slice(0, 5)
    .map((page, index) => ({
      name: page.name.length > 20 ? page.name.substring(0, 20) + '...' : page.name,
      fullName: page.name,
      views: page.views,
      conversions: page.conversions,
      conversionRate: page.conversionRate,
      color: FUNNEL_COLORS[index % FUNNEL_COLORS.length]
    }));

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-white border border-slate-200 shadow-sm p-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{funnelData.totalFunnels}</div>
            <div className="text-sm text-slate-600">Active Funnels</div>
          </div>
        </Card>
        
        <Card className="bg-white border border-slate-200 shadow-sm p-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{funnelData.totalPageViews.toLocaleString()}</div>
            <div className="text-sm text-slate-600">Total Page Views</div>
          </div>
        </Card>
        
        <Card className="bg-white border border-slate-200 shadow-sm p-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">{funnelData.totalConversions.toLocaleString()}</div>
            <div className="text-sm text-slate-600">Total Conversions</div>
          </div>
        </Card>
        
        <Card className="bg-white border border-slate-200 shadow-sm p-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">{funnelData.averageConversionRate.toFixed(1)}%</div>
            <div className="text-sm text-slate-600">Avg Conversion Rate</div>
          </div>
        </Card>
      </div>

      {/* Funnel Performance Chart */}
      <Card className="bg-white border border-slate-200 shadow-sm p-6">
        <div className="pb-3">
          <h3 className="text-lg font-semibold text-slate-900">Funnel Performance</h3>
          <p className="text-sm text-slate-600">Page views and conversions by funnel</p>
        </div>
        
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={funnelPerformanceData}>
              <XAxis 
                dataKey="name" 
                tick={{ fontSize: 12 }}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip 
                formatter={(value: number, name: string, props: any) => [
                  `${value.toLocaleString()}${name === 'conversionRate' ? '%' : ''}`,
                  name === 'views' ? 'Page Views' : 
                  name === 'conversions' ? 'Conversions' : 
                  name === 'conversionRate' ? 'Conversion Rate' : name
                ]}
                labelFormatter={(label, payload) => {
                  const data = payload?.[0]?.payload;
                  return data?.fullName || label;
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

      {/* Top Performing Pages */}
      <Card className="bg-white border border-slate-200 shadow-sm p-6">
        <div className="pb-3">
          <h3 className="text-lg font-semibold text-slate-900">Top Performing Pages</h3>
          <p className="text-sm text-slate-600">Pages with highest conversion rates</p>
        </div>
        
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={topPagesData}
                cx="50%"
                cy="50%"
                outerRadius={100}
                dataKey="conversions"
                label={({ name, conversionRate }: any) => `${name}: ${(conversionRate as number).toFixed(1)}%`}
              >
                {topPagesData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value: number, name: string, props: any) => [
                  `${value.toLocaleString()} conversions`,
                  props.payload?.fullName || 'Unknown'
                ]}
                contentStyle={{ 
                  backgroundColor: '#fff', 
                  border: '1px solid #E2E8F0',
                  borderRadius: '6px'
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Funnel Details Table */}
      <Card className="bg-white border border-slate-200 shadow-sm p-6">
        <div className="pb-3">
          <h3 className="text-lg font-semibold text-slate-900">Funnel Details</h3>
          <p className="text-sm text-slate-600">Detailed breakdown of each funnel</p>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-2 font-medium text-slate-600">Funnel Name</th>
                <th className="text-right py-2 font-medium text-slate-600">Pages</th>
                <th className="text-right py-2 font-medium text-slate-600">Total Views</th>
                <th className="text-right py-2 font-medium text-slate-600">Total Conversions</th>
                <th className="text-right py-2 font-medium text-slate-600">Conversion Rate</th>
                <th className="text-right py-2 font-medium text-slate-600">Status</th>
              </tr>
            </thead>
            <tbody>
              {funnelData.funnels.map((funnel) => {
                const totalViews = funnel.pages.reduce((sum, page) => sum + page.views, 0);
                const totalConversions = funnel.pages.reduce((sum, page) => sum + page.conversions, 0);
                const conversionRate = totalViews > 0 ? (totalConversions / totalViews) * 100 : 0;
                
                return (
                  <tr key={funnel.id} className="border-b border-slate-100">
                    <td className="py-2">
                      <div className="font-medium text-slate-700">{funnel.name}</div>
                    </td>
                    <td className="text-right py-2 text-slate-600">
                      {funnel.pages.length}
                    </td>
                    <td className="text-right py-2 text-slate-600">
                      {totalViews.toLocaleString()}
                    </td>
                    <td className="text-right py-2 text-slate-600">
                      {totalConversions.toLocaleString()}
                    </td>
                    <td className="text-right py-2 text-slate-600">
                      {conversionRate.toFixed(1)}%
                    </td>
                    <td className="text-right py-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        funnel.status === 'active' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {funnel.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
