import { Card } from '@/components/ui/card';
import { EventDashboardData } from '@/services/data/eventMetricsService';
import { LeadData, LeadDataService } from '@/services/data/leadDataService';
import React, { useEffect, useState } from 'react';

interface LandingPagePerformanceProps {
  data: EventDashboardData | null | undefined;
}

export const LandingPagePerformance: React.FC<LandingPagePerformanceProps> = ({ data }) => {
  const [leadData, setLeadData] = useState<LeadData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await LeadDataService.fetchLeadData();
        setLeadData(data);
      } catch (error) {
        console.error('Failed to fetch lead data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <Card className="bg-white border border-slate-200 shadow-sm p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-slate-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="h-4 bg-slate-200 rounded w-1/2"></div>
                <div className="h-4 bg-slate-200 rounded w-1/4"></div>
              </div>
            ))}
          </div>
        </div>
      </Card>
    );
  }

  if (!leadData) {
    return (
      <Card className="bg-white border border-slate-200 shadow-sm p-6">
        <div className="text-center text-slate-500">Failed to load landing page data</div>
      </Card>
    );
  }

  const landingPageViews = data?.ghlMetrics?.totalContacts || 0; // Assuming GHL provides total contacts as landing page views

  return (
    <Card className="bg-white border border-slate-200 shadow-sm p-6">
      <div className="pb-4">
        <h3 className="text-lg font-semibold text-slate-900">Landing Page Performance</h3>
        <p className="text-sm text-slate-500">Total Views: {landingPageViews.toLocaleString()}</p>
      </div>
      <div>
        <div className="space-y-4">
          {leadData.landingPageTypes.map((page, index) => {
            const colors = ['bg-pink-500', 'bg-blue-500', 'bg-green-500', 'bg-purple-500'];
            const color = colors[index % colors.length];
            const conversionRate = page.views > 0 ? (page.leads / page.views) * 100 : 0;

            return (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${color}`}></div>
                  <span className="text-sm font-medium text-slate-700">{page.type}</span>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold text-slate-900">{page.views.toLocaleString()} views</div>
                  <div className="text-xs text-slate-500">{conversionRate.toFixed(1)}% conv</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
};