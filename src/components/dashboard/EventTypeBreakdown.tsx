import { Card } from '@/components/ui/card';
import { EventDashboardData } from '@/services/data/eventMetricsService';
import React from 'react';

interface EventTypeBreakdownProps {
  data: EventDashboardData | null | undefined;
}

export const EventTypeBreakdown: React.FC<EventTypeBreakdownProps> = ({ data }) => {
  return (
    <Card className="bg-white border border-slate-200 shadow-sm p-6">
      <div className="pb-4">
        <h3 className="text-lg font-semibold text-slate-900">Event Type Breakdown</h3>
      </div>
      <div>
        <div className="space-y-4">
          {data?.eventMetrics?.eventTypeBreakdown?.map((eventType, index) => (
            <div key={index} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-blue-600"></div>
                <span className="text-sm font-medium text-slate-700">{eventType.type}</span>
              </div>
              <div className="text-right">
                <div className="text-sm font-semibold text-slate-900">{eventType.count} events</div>
                <div className="text-xs text-slate-500">{eventType.percentage}%</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
};
