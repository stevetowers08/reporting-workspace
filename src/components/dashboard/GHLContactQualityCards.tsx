import { DataSkeleton } from '@/components/ui/UnifiedLoadingSystem';
import { useGHLContactCount } from '@/hooks/useGHLHooks';
import { Calendar, TrendingUp, UserPlus, Users } from 'lucide-react';
import React from 'react';

interface GHLContactQualityCardsProps {
  locationId: string;
  dateRange?: { start: string; end: string };
}

interface _GHLMetrics {
  totalContacts: number;
  newContacts: number;
  totalGuests: number;
  averageGuestsPerLead: number;
  conversionRate: number;
  topPerformingSources: Array<{ source: string; leads: number; avgGuests: number }>;
}

export const GHLContactQualityCards: React.FC<GHLContactQualityCardsProps> = ({ locationId, dateRange }) => {
  const { count: metrics, loading, error } = useGHLContactCount(locationId, dateRange);

  if (loading) {
    return (
      <div className="mb-6 grid gap-4 grid-cols-1 md:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="bg-white border border-slate-200 shadow-sm p-5 h-24">
            <DataSkeleton />
          </Card>
        ))}
      </div>
    );
  }

  if (error || !metrics) {
    return (
      <div className="mb-6 grid gap-4 grid-cols-1 md:grid-cols-4">
        <Card className="bg-white border border-slate-200 shadow-sm p-5 h-24">
          <div className="text-center text-slate-500">
            GoHighLevel Not Connected
          </div>
        </Card>
      </div>
    );
  }

  const topSource = metrics.topPerformingSources[0];

  return (
    <div className="mb-6 grid gap-4 grid-cols-1 md:grid-cols-4">
      {/* Total Contacts */}
      <Card className="bg-white border border-slate-200 shadow-sm p-5 h-24">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-600 mb-2">Total Contacts</p>
            <div className="flex items-baseline gap-2">
              <p className="text-3xl font-bold text-slate-900">{metrics.totalContacts.toLocaleString()}</p>
              <div className="flex items-center gap-1">
                <Users className="h-4 w-4 text-blue-600" />
                <span className="text-sm text-blue-600 font-medium">GHL</span>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* New Contacts */}
      <Card className="bg-white border border-slate-200 shadow-sm p-5 h-24">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-600 mb-2">New Contacts</p>
            <div className="flex items-baseline gap-2">
              <p className="text-3xl font-bold text-slate-900">{metrics.newContacts.toLocaleString()}</p>
              <div className="flex items-center gap-1">
                <UserPlus className="h-4 w-4 text-green-600" />
                <span className="text-sm text-green-600 font-medium">{metrics.conversionRate}% qualified</span>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Total Guests */}
      <Card className="bg-white border border-slate-200 shadow-sm p-5 h-24">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-600 mb-2">Total Guests</p>
            <div className="flex items-baseline gap-2">
              <p className="text-3xl font-bold text-slate-900">{metrics.totalGuests.toLocaleString()}</p>
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4 text-purple-600" />
                <span className="text-sm text-slate-500">{metrics.averageGuestsPerLead} avg per lead</span>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Top Source */}
      <Card className="bg-white border border-slate-200 shadow-sm p-5 h-24">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-600 mb-2">Top Source</p>
            <div className="flex items-baseline gap-2">
              <p className="text-3xl font-bold text-blue-600">
                {topSource ? topSource.source.split(' ')[0].substring(0, 2).toUpperCase() : 'N/A'}
              </p>
              <div className="flex items-center gap-1">
                <TrendingUp className="h-4 w-4 text-blue-600" />
                <span className="text-sm text-slate-500">
                  {topSource ? `${topSource.leads} leads` : 'No data'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};
