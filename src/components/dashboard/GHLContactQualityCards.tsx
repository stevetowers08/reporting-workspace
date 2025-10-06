import { Card } from '@/components/ui/card';
import { GoHighLevelService } from '@/services/api/goHighLevelService';
import React, { useEffect, useState } from 'react';
import { Users, UserPlus, Calendar, TrendingUp } from 'lucide-react';

interface GHLContactQualityCardsProps {
  dateRange?: { start: string; end: string };
}

interface GHLMetrics {
  totalContacts: number;
  newContacts: number;
  totalGuests: number;
  averageGuestsPerLead: number;
  conversionRate: number;
  topPerformingSources: Array<{ source: string; leads: number; avgGuests: number }>;
}

export const GHLContactQualityCards: React.FC<GHLContactQualityCardsProps> = ({ dateRange }) => {
  const [metrics, setMetrics] = useState<GHLMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const data = await GoHighLevelService.getGHLMetrics(dateRange);
        setMetrics(data);
      } catch (error) {
        console.error('Failed to fetch GHL metrics:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
  }, [dateRange]);

  if (loading) {
    return (
      <div className="mb-6 grid gap-4 grid-cols-1 md:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="bg-white border border-slate-200 shadow-sm p-5 h-24">
            <div className="animate-pulse">
              <div className="h-4 bg-slate-200 rounded w-3/4 mb-2"></div>
              <div className="h-8 bg-slate-200 rounded w-1/2"></div>
            </div>
          </Card>
        ))}
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="mb-6 grid gap-4 grid-cols-1 md:grid-cols-4">
        <Card className="bg-white border border-slate-200 shadow-sm p-5 h-24">
          <div className="text-center text-slate-500">Failed to load GHL data</div>
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
