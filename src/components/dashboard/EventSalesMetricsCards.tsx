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
            <p className="text-sm font-medium text-slate-600 mb-2">Total Leads</p>
            <div className="flex items-baseline gap-2">
              <p className="text-3xl font-bold text-slate-900">{data?.eventMetrics?.totalEvents || '0'}</p>
            </div>
          </div>
        </div>
      </Card>

      <Card className="bg-white border border-slate-200 shadow-sm p-5 h-24">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-600 mb-2">Total Guests</p>
            <div className="flex items-baseline gap-2">
              <p className="text-3xl font-bold text-slate-900">{data?.eventMetrics?.averageGuests?.toLocaleString() || '0'}</p>
              <div className="flex items-center gap-1">
                <span className="text-sm text-slate-500">{data?.eventMetrics?.averageGuests || '0'} avg per lead</span>
              </div>
            </div>
          </div>
        </div>
      </Card>

      <Card className="bg-white border border-slate-200 shadow-sm p-5 h-24">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-600 mb-2">Facebook Leads</p>
            <div className="flex items-baseline gap-2">
              <p className="text-3xl font-bold text-blue-600">{data?.facebookMetrics?.leads || '0'}</p>
              <div className="flex items-center gap-1">
                <span className="text-sm text-slate-500">{data?.facebookMetrics?.leads || '0'} from Facebook</span>
              </div>
            </div>
          </div>
        </div>
      </Card>

      <Card className="bg-white border border-slate-200 shadow-sm p-5 h-24">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-600 mb-2">Google Leads</p>
            <div className="flex items-baseline gap-2">
              <p className="text-3xl font-bold text-green-600">{data?.googleMetrics?.leads || '0'}</p>
              <div className="flex items-center gap-1">
                <span className="text-sm text-slate-500">{data?.googleMetrics?.leads || '0'} from Google</span>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};
