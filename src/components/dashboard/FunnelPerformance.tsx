import { Card } from '@/components/ui/card';
import { GoHighLevelService } from '@/services/ghl/goHighLevelService';
import React, { useEffect, useState } from 'react';

interface FunnelPerformanceProps {
  data: {
    ghlMetrics?: {
      pageViewAnalytics?: {
        totalPageViews: number;
        uniquePages: Array<{ page: string; views: number; percentage: number }>;
        topLandingPages: Array<{ url: string; views: number; conversions: number; conversionRate: number }>;
      };
    };
    totalLeads?: number;
    clientAccounts?: {
      goHighLevel?: string;
    };
  };
  dateRange?: { start: string; end: string };
}

export const FunnelPerformance: React.FC<FunnelPerformanceProps> = ({ data, dateRange }) => {
  const [funnelData, setFunnelData] = useState<any>(null);
  const [totalContacts, setTotalContacts] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchFunnelData = async () => {
      try {
        const locationId = data.clientAccounts?.goHighLevel || 'V7bzEjKiigXzh8r6sQq0';
        console.log('🔍 FunnelPerformance: Fetching data for location:', locationId);
        
        const funnelAnalytics = await GoHighLevelService.getFunnelAnalytics(locationId, dateRange);
        console.log('🔍 FunnelPerformance: Funnel analytics:', funnelAnalytics);
        
        const contacts = await GoHighLevelService.getContactCount(locationId, dateRange ? { startDate: dateRange.start, endDate: dateRange.end } : undefined);
        console.log('🔍 FunnelPerformance: Total contacts:', contacts);
        
        setFunnelData(funnelAnalytics);
        setTotalContacts(contacts);
        setError(null);
      } catch (err) {
        console.error('🔍 FunnelPerformance: Error fetching data:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch funnel data');
      } finally {
        setLoading(false);
      }
    };

    fetchFunnelData();
  }, [data.clientAccounts?.goHighLevel, dateRange]);

  if (loading) {
    return (
      <Card className="bg-white border border-slate-200 shadow-sm p-6">
        <div className="pb-3">
          <h3 className="text-lg font-semibold text-slate-900">Funnel Performance</h3>
          <p className="text-sm text-slate-600">
            {dateRange ? 
              `Page views and conversion rates for ${new Date(dateRange.start).toLocaleDateString()} - ${new Date(dateRange.end).toLocaleDateString()}` :
              'Page views and conversion rates'
            }
          </p>
        </div>
        <div className="h-80 flex items-center justify-center">
          <div className="animate-pulse text-slate-500">Loading funnel performance...</div>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="bg-white border border-slate-200 shadow-sm p-6">
        <div className="pb-3">
          <h3 className="text-lg font-semibold text-slate-900">Funnel Performance</h3>
          <p className="text-sm text-slate-600">
            {dateRange ? 
              `Page views and conversion rates for ${new Date(dateRange.start).toLocaleDateString()} - ${new Date(dateRange.end).toLocaleDateString()}` :
              'Page views and conversion rates'
            }
          </p>
        </div>
        <div className="h-80 flex items-center justify-center">
          <div className="text-red-500">Error: {error}</div>
        </div>
      </Card>
    );
  }

  if (!funnelData) {
    return (
      <Card className="bg-white border border-slate-200 shadow-sm p-6">
        <div className="pb-3">
          <h3 className="text-lg font-semibold text-slate-900">Funnel Performance</h3>
          <p className="text-sm text-slate-600">
            {dateRange ? 
              `Page views and conversion rates for ${new Date(dateRange.start).toLocaleDateString()} - ${new Date(dateRange.end).toLocaleDateString()}` :
              'Page views and conversion rates'
            }
          </p>
        </div>
        <div className="h-80 flex items-center justify-center">
          <div className="text-slate-500">No funnel data available</div>
        </div>
      </Card>
    );
  }

  const totalPageViews = funnelData.totalPageViews || 0;
  const conversionRate = totalPageViews > 0 ? (totalContacts / totalPageViews) * 100 : 0;

  return (
    <Card className="bg-white border border-slate-200 shadow-sm p-6">
      <div className="pb-3">
        <h3 className="text-lg font-semibold text-slate-900">Funnel Performance</h3>
        <p className="text-sm text-slate-600">
          {dateRange ? 
            `Page views and conversion rates for ${new Date(dateRange.start).toLocaleDateString()} - ${new Date(dateRange.end).toLocaleDateString()}` :
            'Page views and conversion rates'
          }
        </p>
        <div className="text-xs text-slate-400 mt-1">
          Source: GoHighLevel API | Endpoint: GET /funnels/funnel/list + POST /contacts/search | Data: Real Page Views + Real Contacts | Status: {totalPageViews > 0 ? 'Working' : 'No Data'}
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="text-center p-4 bg-slate-50 rounded-lg">
          <div className="text-2xl font-bold text-slate-900">{totalPageViews.toLocaleString()}</div>
          <div className="text-sm text-slate-600">Total Page Views</div>
        </div>
        <div className="text-center p-4 bg-slate-50 rounded-lg">
          <div className="text-2xl font-bold text-slate-900">{totalContacts.toLocaleString()}</div>
          <div className="text-sm text-slate-600">Total Contacts</div>
        </div>
        <div className="text-center p-4 bg-slate-50 rounded-lg">
          <div className="text-2xl font-bold text-green-600">{conversionRate.toFixed(1)}%</div>
          <div className="text-sm text-slate-600">Conversion Rate</div>
        </div>
      </div>
    </Card>
  );
};
