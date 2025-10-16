import { Card } from '@/components/ui/card';
import { EventDashboardData } from '@/services/data/eventMetricsService';
import { LeadData, LeadDataService } from '@/services/data/leadDataService';
import React, { useEffect, useState } from 'react';

interface LeadSourceBreakdownProps {
  data: EventDashboardData | null | undefined;
}

export const LeadSourceBreakdown: React.FC<LeadSourceBreakdownProps> = ({ data: _data }) => {
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
            {[...Array(2)].map((_, i) => (
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
        <div className="text-center text-slate-500">Failed to load lead source data</div>
      </Card>
    );
  }

  const facebookPercentage = leadData.totalLeads > 0 ? (leadData.facebookLeads / leadData.totalLeads) * 100 : 0;
  const googlePercentage = leadData.totalLeads > 0 ? (leadData.googleLeads / leadData.totalLeads) * 100 : 0;

  const leadSources = [
    {
      source: 'Facebook Ads',
      count: leadData.facebookLeads,
      percentage: facebookPercentage,
      color: 'bg-blue-500',
      icon: '📘'
    },
    {
      source: 'Google Ads', 
      count: leadData.googleLeads,
      percentage: googlePercentage,
      color: 'bg-green-500',
      icon: '🔍'
    }
  ].filter(source => source.count > 0);

  return (
    <Card className="bg-white border border-slate-200 shadow-sm p-6">
      <div className="pb-4">
        <h3 className="text-lg font-semibold text-slate-900">Lead Source Breakdown</h3>
        <p className="text-sm text-slate-500">Where leads are coming from</p>
      </div>
      <div>
        <div className="space-y-4">
          {leadSources.map((source, index) => (
            <div key={index} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${source.color}`}></div>
                <span className="text-lg mr-2">{source.icon}</span>
                <span className="text-sm font-medium text-slate-700">{source.source}</span>
              </div>
              <div className="text-right">
                <div className="text-sm font-semibold text-slate-900">{source.count} leads</div>
                <div className="text-xs text-slate-500">{source.percentage.toFixed(1)}%</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
};
