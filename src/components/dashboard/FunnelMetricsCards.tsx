import { Card } from '@/components/ui/card';
import { GoHighLevelService } from '@/services/api/goHighLevelService';
import React, { useEffect, useState } from 'react';

interface FunnelMetricsCardsProps {
  locationId: string;
  dateRange?: { start: string; end: string };
}

export const FunnelMetricsCards: React.FC<FunnelMetricsCardsProps> = ({ locationId, dateRange }) => {
  const [funnelData, setFunnelData] = useState<any>(null);
  const [totalContacts, setTotalContacts] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Only fetch contact count - funnel analytics not available via API
        const contactCount = await GoHighLevelService.getContactCount(locationId);
        setTotalContacts(contactCount);
        
        // Set placeholder data for funnel metrics since API doesn't support it
        setFunnelData({
          totalPageViews: 0,
          totalConversions: 0,
          averageConversionRate: 0
        });
      } catch (error) {
        console.error('Failed to fetch data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [locationId, dateRange]);

  if (loading) {
    return (
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4 mb-6">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="bg-white border border-slate-200 shadow-sm p-5 h-24">
            <div className="animate-pulse">
              <div className="h-4 bg-slate-200 rounded mb-2"></div>
              <div className="h-8 bg-slate-200 rounded"></div>
            </div>
          </Card>
        ))}
      </div>
    );
  }

  if (!funnelData) {
    return (
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4 mb-6">
        <Card className="bg-white border border-slate-200 shadow-sm p-5 h-24">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600 mb-2">Total Contacts</p>
              <p className="text-3xl font-bold text-slate-400">-</p>
            </div>
          </div>
        </Card>
        <Card className="bg-white border border-slate-200 shadow-sm p-5 h-24">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600 mb-2">Total Page Views</p>
              <p className="text-3xl font-bold text-slate-400">-</p>
            </div>
          </div>
        </Card>
        <Card className="bg-white border border-slate-200 shadow-sm p-5 h-24">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600 mb-2">Total Conversions</p>
              <p className="text-3xl font-bold text-slate-400">-</p>
            </div>
          </div>
        </Card>
        <Card className="bg-white border border-slate-200 shadow-sm p-5 h-24">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600 mb-2">Avg Conversion Rate</p>
              <p className="text-3xl font-bold text-slate-400">-</p>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4 mb-6">
      <Card className="bg-white border border-slate-200 shadow-sm p-5 h-24">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-600 mb-2">Total Contacts</p>
            <p className="text-3xl font-bold text-blue-600">{totalContacts.toLocaleString()}</p>
          </div>
        </div>
      </Card>
      
      <Card className="bg-white border border-slate-200 shadow-sm p-5 h-24">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-600 mb-2">Total Page Views</p>
            <p className="text-3xl font-bold text-slate-400">N/A</p>
            <p className="text-xs text-slate-500 mt-1">API not available</p>
          </div>
        </div>
      </Card>
      
      <Card className="bg-white border border-slate-200 shadow-sm p-5 h-24">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-600 mb-2">Total Conversions</p>
            <p className="text-3xl font-bold text-slate-400">N/A</p>
            <p className="text-xs text-slate-500 mt-1">API not available</p>
          </div>
        </div>
      </Card>
      
      <Card className="bg-white border border-slate-200 shadow-sm p-5 h-24">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-600 mb-2">Avg Conversion Rate</p>
            <p className="text-3xl font-bold text-slate-400">N/A</p>
            <p className="text-xs text-slate-500 mt-1">API not available</p>
          </div>
        </div>
      </Card>
    </div>
  );
};
