import { DataSkeleton } from '@/components/ui/UnifiedLoadingSystem';
import { FacebookAdsReportingData } from '@/services/data/facebookAdsReportingService';
import { BarChart3 } from 'lucide-react';
import React from 'react';
import { MetricTableCell } from './MetricTableCell';

interface FacebookAdsReportingTableProps {
  data: FacebookAdsReportingData[];
  loading: boolean;
  error?: string;
}

export const FacebookAdsReportingTable: React.FC<FacebookAdsReportingTableProps> = ({
  data,
  loading,
  error
}) => {
  if (loading) {
    return (
      <div className="bg-white border border-slate-200 shadow-sm rounded-lg p-8">
        <DataSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white border border-slate-200 shadow-sm rounded-lg p-8">
        <div className="text-center">
          <div className="text-red-400 mb-4">
            <BarChart3 className="mx-auto h-12 w-12" />
          </div>
          <h3 className="text-lg font-medium text-slate-900 mb-2">Error Loading Data</h3>
          <p className="text-slate-600">{error}</p>
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="bg-white border border-slate-200 shadow-sm rounded-lg p-8">
        <div className="text-center">
          <div className="text-slate-400 mb-4">
            <BarChart3 className="mx-auto h-12 w-12" />
          </div>
          <h3 className="text-lg font-medium text-slate-900 mb-2">No Facebook Ads Accounts</h3>
          <p className="text-slate-600">
            No venues with Facebook Ads integration found. Add Facebook Ads integration to venues to see reporting data.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 shadow-sm rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left py-2 px-3 text-xs font-medium text-slate-700 border-r border-slate-200">Venue</th>
              <th className="text-left py-2 px-3 text-xs font-medium text-slate-700 border-r border-slate-200">Leads</th>
              <th className="text-left py-2 px-3 text-xs font-medium text-slate-700 border-r border-slate-200">Cost Per Lead</th>
              <th className="text-left py-2 px-3 text-xs font-medium text-slate-700 border-r border-slate-200">Conversion Rate</th>
              <th className="text-left py-2 px-3 text-xs font-medium text-slate-700 border-r border-slate-200">Spent</th>
              <th className="text-left py-2 px-3 text-xs font-medium text-slate-700 border-r border-slate-200">Impressions</th>
              <th className="text-left py-2 px-3 text-xs font-medium text-slate-700 border-r border-slate-200">Landing Page Views</th>
              <th className="text-left py-2 px-3 text-xs font-medium text-slate-700 border-r border-slate-200">Cost Per Click</th>
              <th className="text-left py-2 px-3 text-xs font-medium text-slate-700">CTR</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.map((venue) => (
              <tr key={venue.clientId} className="hover:bg-slate-50 transition-colors">
                {/* Venue Name Column */}
                <td className="px-3 py-4 border-r border-slate-200">
                  <p className="text-sm font-semibold text-slate-900">{venue.venueName}</p>
                </td>

                {/* Metric Columns */}
                <MetricTableCell
                  label="Leads"
                  value={venue.metrics.leads}
                  trend={venue.trends?.leads}
                  format="number"
                  padding="normal"
                  className="border-r border-slate-200"
                />
                
                <MetricTableCell
                  label="Cost Per Lead"
                  value={venue.metrics.costPerLead}
                  trend={venue.trends?.costPerLead}
                  format="currency"
                  padding="normal"
                  colorCode={true}
                  className="border-r border-slate-200"
                />
                
                <MetricTableCell
                  label="Conversion Rate"
                  value={venue.metrics.conversionRate}
                  trend={venue.trends?.conversionRate}
                  format="percentage"
                  padding="normal"
                  className="border-r border-slate-200"
                />
                
                <MetricTableCell
                  label="Spent"
                  value={venue.metrics.spent}
                  trend={venue.trends?.spent}
                  format="currency"
                  padding="normal"
                  className="border-r border-slate-200"
                />
                
                <MetricTableCell
                  label="Impressions"
                  value={venue.metrics.impressions}
                  trend={venue.trends?.impressions}
                  format="number"
                  padding="normal"
                  className="border-r border-slate-200"
                />
                
                <MetricTableCell
                  label="Landing Page Views"
                  value={venue.metrics.clicks}
                  trend={venue.trends?.clicks}
                  format="number"
                  padding="normal"
                  className="border-r border-slate-200"
                />
                
                <MetricTableCell
                  label="Cost Per Click"
                  value={venue.metrics.costPerClick}
                  trend={venue.trends?.costPerClick}
                  format="currency"
                  padding="normal"
                  className="border-r border-slate-200"
                />
                
                 <MetricTableCell
                   label="CTR"
                   value={venue.metrics.ctr}
                   trend={venue.trends?.ctr}
                   format="percentage"
                   padding="normal"
                 />
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
