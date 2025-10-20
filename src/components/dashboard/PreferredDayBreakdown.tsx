import { DataSkeleton } from '@/components/ui/UnifiedLoadingSystem';
import { EventDashboardData } from '@/services/data/eventMetricsService';
import { LeadData, LeadDataService } from '@/services/data/leadDataService';
import React, { useEffect, useState } from 'react';

interface PreferredDayBreakdownProps {
  data: EventDashboardData | null | undefined;
}

export const PreferredDayBreakdown: React.FC<PreferredDayBreakdownProps> = ({ data: _data }) => {
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
      <Card className="bg-white border border-slate-200 p-6">
        <DataSkeleton />
      </Card>
    );
  }

  if (!leadData) {
    return (
      <Card className="bg-white border border-slate-200 p-6">
        <div className="text-center text-slate-500">Failed to load day preference data</div>
      </Card>
    );
  }
  
  return (
    <Card className="bg-white border border-slate-200 p-6">
      <div className="pb-4">
        <h3 className="text-lg font-semibold text-slate-900">Preferred Day of Week</h3>
        <p className="text-sm text-slate-500">Based on lead data analysis</p>
      </div>
      <div>
        <div className="space-y-4">
          {leadData.dayPreferences.map((dayPref, index) => {
            const colors = ['bg-green-500', 'bg-blue-500', 'bg-purple-500', 'bg-orange-500', 'bg-red-500', 'bg-yellow-500', 'bg-teal-500'];
            const color = colors[index % colors.length];
            
            return (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${color}`}></div>
                  <span className="text-sm font-medium text-slate-700">{dayPref.day}</span>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold text-slate-900">{dayPref.count} leads</div>
                  <div className="text-xs text-slate-500">{dayPref.percentage.toFixed(1)}%</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
};
