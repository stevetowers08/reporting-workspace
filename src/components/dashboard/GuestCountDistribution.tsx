import { Card } from '@/components/ui/card';
import { EventDashboardData } from '@/services/data/eventMetricsService';
import { LeadData, LeadDataService } from '@/services/data/leadDataService';
import React, { useEffect, useState } from 'react';

interface GuestCountDistributionProps {
  data: EventDashboardData | null | undefined;
}

export const GuestCountDistribution: React.FC<GuestCountDistributionProps> = ({ data }) => {
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
            {[...Array(5)].map((_, i) => (
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
        <div className="text-center text-slate-500">Failed to load guest count data</div>
      </Card>
    );
  }
  
  return (
    <Card className="bg-white border border-slate-200 shadow-sm p-6">
      <div className="pb-4">
        <h3 className="text-lg font-semibold text-slate-900">Guest Count Distribution</h3>
        <p className="text-sm text-slate-500">Average: {leadData.averageGuestsPerLead.toFixed(0)} guests per lead</p>
      </div>
      <div>
        <div className="space-y-4">
          {leadData.guestRanges.map((range, index) => {
            const colors = ['bg-green-500', 'bg-blue-500', 'bg-purple-500', 'bg-orange-500', 'bg-red-500'];
            const color = colors[index % colors.length];
            
            return (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${color}`}></div>
                  <span className="text-sm font-medium text-slate-700">{range.range}</span>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold text-slate-900">{range.count} leads</div>
                  <div className="text-xs text-slate-500">{range.percentage.toFixed(1)}%</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
};
