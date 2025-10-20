/**
 * Migration Example: GHLFunnelAnalytics Component
 * 
 * This shows how to gradually migrate from the old service to new modules
 */

import { Spinner } from '@/components/ui/UnifiedLoadingSystem';
// Old import (still works)
import { GoHighLevelService } from '@/services/ghl/goHighLevelService';
// New modular imports (when ready to migrate)
import React, { useEffect, useState } from 'react';
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Card } from '@/components/ui/card';

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
        // OLD WAY (still works):
        const data = await GoHighLevelService.getFunnelAnalytics(locationId, dateRange);
        
        // NEW WAY (when ready to migrate):
        // const pageViewAnalytics = await GHLAnalytics.getPageViewAnalytics(locationId, dateRange);
        // const metrics = await GHLAnalytics.getMetrics(locationId, dateRange);
        // const data = {
        //   funnels: [], // Transform pageViewAnalytics into funnel format
        //   totalFunnels: metrics.pageViewAnalytics.uniquePages.length,
        //   totalPageViews: metrics.pageViewAnalytics.totalPageViews,
        //   totalConversions: metrics.totalContacts,
        //   averageConversionRate: metrics.conversionRate
        // };
        
        setFunnelData(data);
      } catch (error) {
        console.error('Failed to fetch funnel analytics:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchFunnelData();
  }, [locationId, dateRange]);

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="flex items-center gap-2 text-slate-500">
            <Spinner size="sm" />
            Loading funnel analytics...
          </div>
        </div>
      </Card>
    );
  }

  if (!funnelData) {
    return (
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Funnel Analytics</h3>
        <p className="text-gray-500">No funnel data available</p>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Funnel Analytics</h3>
      
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-blue-50 p-4 rounded-lg">
          <p className="text-sm text-blue-600 font-medium">Total Funnels</p>
          <p className="text-2xl font-bold text-blue-900">{funnelData.totalFunnels}</p>
        </div>
        <div className="bg-green-50 p-4 rounded-lg">
          <p className="text-sm text-green-600 font-medium">Total Page Views</p>
          <p className="text-2xl font-bold text-green-900">{funnelData.totalPageViews.toLocaleString()}</p>
        </div>
        <div className="bg-purple-50 p-4 rounded-lg">
          <p className="text-sm text-purple-600 font-medium">Total Conversions</p>
          <p className="text-2xl font-bold text-purple-900">{funnelData.totalConversions}</p>
        </div>
        <div className="bg-orange-50 p-4 rounded-lg">
          <p className="text-sm text-orange-600 font-medium">Avg Conversion Rate</p>
          <p className="text-2xl font-bold text-orange-900">{funnelData.averageConversionRate.toFixed(1)}%</p>
        </div>
      </div>

      {/* Funnel Performance Chart */}
      {funnelData.funnels.length > 0 && (
        <div className="mb-6">
          <h4 className="text-md font-medium mb-3">Funnel Performance</h4>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={funnelData.funnels.map(funnel => ({
              name: funnel.name,
              views: funnel.pages.reduce((sum, page) => sum + page.views, 0),
              conversions: funnel.pages.reduce((sum, page) => sum + page.conversions, 0)
            }))}>
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="views" fill="#3B82F6" name="Page Views" />
              <Bar dataKey="conversions" fill="#10B981" name="Conversions" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Top Performing Pages */}
      {funnelData.funnels.length > 0 && (
        <div>
          <h4 className="text-md font-medium mb-3">Top Performing Pages</h4>
          <div className="space-y-2">
            {funnelData.funnels
              .flatMap(funnel => funnel.pages)
              .sort((a, b) => b.conversions - a.conversions)
              .slice(0, 5)
              .map((page, index) => (
                <div key={page.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div 
                      className="w-4 h-4 rounded-full" 
                      style={{ backgroundColor: FUNNEL_COLORS[index % FUNNEL_COLORS.length] }}
                    />
                    <div>
                      <p className="font-medium">{page.name}</p>
                      <p className="text-sm text-gray-500">{page.url}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{page.conversions} conversions</p>
                    <p className="text-sm text-gray-500">{page.conversionRate.toFixed(1)}% rate</p>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </Card>
  );
};

/**
 * Migration Notes:
 * 
 * 1. Keep the old import working: `import { GoHighLevelService } from '@/services/ghl/goHighLevelService';`
 * 2. Add new import when ready: `import { GHLAnalytics } from '@/services/ghl';`
 * 3. Gradually replace method calls:
 *    - Old: `GoHighLevelService.getFunnelAnalytics()`
 *    - New: `GHLAnalytics.getPageViewAnalytics()` + `GHLAnalytics.getMetrics()`
 * 4. Transform data as needed for component requirements
 * 5. Test thoroughly before removing old code
 */
