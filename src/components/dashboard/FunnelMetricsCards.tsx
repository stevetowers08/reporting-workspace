import { DataSkeleton } from '@/components/ui/UnifiedLoadingSystem';
import { Card } from '@/components/ui/card';
import { GoHighLevelService } from '@/services/ghl/goHighLevelService';
import React, { useEffect, useState } from 'react';

interface FunnelMetricsCardsProps {
  locationId: string;
  dateRange?: { start: string; end: string };
}

export const FunnelMetricsCards: React.FC<FunnelMetricsCardsProps> = ({ locationId, dateRange }) => {
  const [funnelData, setFunnelData] = useState<any>(null);
  const [totalContacts, setTotalContacts] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [isConnected, setIsConnected] = useState<boolean>(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Convert date range format for API
        const apiDateRange = dateRange ? {
          startDate: dateRange.start,
          endDate: dateRange.end
        } : undefined;
        
        const [funnelAnalytics, contactCount] = await Promise.all([
          GoHighLevelService.getFunnelAnalytics(locationId, apiDateRange),
          GoHighLevelService.getContactCount(locationId)
        ]);
        setFunnelData(funnelAnalytics);
        setTotalContacts(contactCount);
      } catch (error) {
        // Check if it's a connection error
        if (error instanceof Error && (
          error.message.includes('not authorized') || 
          error.message.includes('No valid OAuth token') ||
          error.message.includes('Failed to search contacts')
        )) {
          setIsConnected(false);
        }
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
            <DataSkeleton />
          </Card>
        ))}
      </div>
    );
  }

  if (!funnelData || !isConnected) {
    return (
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4 mb-6">
        <Card className="bg-white border border-slate-200 shadow-sm p-5 h-24">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600 mb-2">Total Contacts</p>
              <p className="text-lg font-medium text-slate-400">Not Connected</p>
            </div>
          </div>
        </Card>
        <Card className="bg-white border border-slate-200 shadow-sm p-5 h-24">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600 mb-2">Total Page Views</p>
              <p className="text-lg font-medium text-slate-400">Not Connected</p>
            </div>
          </div>
        </Card>
        <Card className="bg-white border border-slate-200 shadow-sm p-5 h-24">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600 mb-2">Total Conversions</p>
              <p className="text-lg font-medium text-slate-400">Not Connected</p>
            </div>
          </div>
        </Card>
        <Card className="bg-white border border-slate-200 shadow-sm p-5 h-24">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600 mb-2">Avg Conversion Rate</p>
              <p className="text-lg font-medium text-slate-400">Not Connected</p>
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
            <p className="text-3xl font-bold text-green-600">{funnelData.totalPageViews.toLocaleString()}</p>
          </div>
        </div>
      </Card>
      
      <Card className="bg-white border border-slate-200 shadow-sm p-5 h-24">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-600 mb-2">Total Conversions</p>
            <p className="text-3xl font-bold text-purple-600">{funnelData.totalConversions.toLocaleString()}</p>
          </div>
        </div>
      </Card>
      
      <Card className="bg-white border border-slate-200 shadow-sm p-5 h-24">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-600 mb-2">Avg Conversion Rate</p>
            <p className="text-3xl font-bold text-orange-600">{funnelData.averageConversionRate.toFixed(1)}%</p>
          </div>
        </div>
      </Card>
    </div>
  );
};
