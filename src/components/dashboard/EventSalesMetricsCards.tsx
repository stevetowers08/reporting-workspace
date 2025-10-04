import { Card } from '@/components/ui/card';
import { EventDashboardData } from '@/services/data/eventMetricsService';
import React from 'react';

interface EventSalesMetricsCardsProps {
  data: EventDashboardData | null | undefined;
}

export const EventSalesMetricsCards: React.FC<EventSalesMetricsCardsProps> = ({ data }) => {
  return (
    <div className="mb-6 grid gap-4 grid-cols-1 md:grid-cols-4">
      <Card className="bg-white border border-slate-200 shadow-sm p-5 h-24">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-600 mb-2">Total Events</p>
            <div className="flex items-baseline gap-2">
              <p className="text-3xl font-bold text-slate-900">{data?.eventMetrics?.totalEvents || '0'}</p>
              <div className="flex items-center gap-1">
                <span className="text-sm text-green-600 font-medium">↑ +12%</span>
              </div>
            </div>
          </div>
        </div>
      </Card>

      <Card className="bg-white border border-slate-200 shadow-sm p-5 h-24">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-600 mb-2">Avg Event Value</p>
            <div className="flex items-baseline gap-2">
              <p className="text-3xl font-bold text-slate-900">${data?.leadMetrics?.averageEventValue?.toLocaleString() || '0'}</p>
              <div className="flex items-center gap-1">
                <span className="text-sm text-green-600 font-medium">↑ +8%</span>
              </div>
            </div>
          </div>
        </div>
      </Card>

      <Card className="bg-white border border-slate-200 shadow-sm p-5 h-24">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-600 mb-2">Pipeline Value</p>
            <div className="flex items-baseline gap-2">
              <p className="text-3xl font-bold text-slate-900">${data?.ghlMetrics?.pipelineValue?.toLocaleString() || '0'}</p>
              <div className="flex items-center gap-1">
                <span className="text-sm text-green-600 font-medium">↑ +15%</span>
              </div>
            </div>
          </div>
        </div>
      </Card>

      <Card className="bg-white border border-slate-200 shadow-sm p-5 h-24">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-600 mb-2">Win Rate</p>
            <div className="flex items-baseline gap-2">
              <p className="text-3xl font-bold text-green-600">{data?.ghlMetrics?.conversionRate?.toFixed(1) || '0.0'}%</p>
              <div className="flex items-center gap-1">
                <span className="text-sm text-slate-500">{data?.ghlMetrics?.wonOpportunities || '0'} won</span>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};
