import { DataSkeleton } from '@/components/ui/UnifiedLoadingSystem';
import { Card } from '@/components/ui/card';
import { EventDashboardData } from '@/services/data/eventMetricsService';
import { LeadData, LeadDataService } from '@/services/data/leadDataService';
import React, { useEffect, useState } from 'react';

interface EventTypeBreakdownProps {
  data: EventDashboardData | null | undefined;
}

export const EventTypeBreakdown: React.FC<EventTypeBreakdownProps> = ({ data: _data }) => {
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
        <DataSkeleton />
      </Card>
    );
  }

  if (!leadData) {
    return (
      <Card className="bg-white border border-slate-200 shadow-sm p-6">
        <div className="text-center text-slate-500">Failed to load event type data</div>
      </Card>
    );
  }

  const maxCount = Math.max(...leadData.eventTypes.map(et => et.count));

  return (
    <Card className="bg-white border border-slate-200 shadow-sm p-6">
      <div className="pb-4">
        <h3 className="text-lg font-semibold text-slate-900">Event Type Breakdown</h3>
        <p className="text-sm text-slate-500">Based on lead data analysis</p>
      </div>
      <div className="space-y-4">
        {leadData.eventTypes.map((eventType, index) => {
          const colors = ['bg-pink-500', 'bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-gray-500'];
          const color = colors[index % colors.length];
          
          return (
            <div key={index} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${color}`}></div>
                  <span className="text-sm font-medium text-slate-700">{eventType.type}</span>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold text-slate-900">{eventType.count.toLocaleString()}</div>
                  <div className="text-xs text-slate-500">{eventType.percentage.toFixed(1)}%</div>
                </div>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full ${color}`}
                  style={{ width: `${(eventType.count / maxCount) * 100}%` }}
                ></div>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
};