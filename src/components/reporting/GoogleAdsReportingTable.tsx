import { MetricTableCell } from '@/components/reporting/MetricTableCell';
import { DataSkeleton } from '@/components/ui/UnifiedLoadingSystem';
import { GoogleAdsReportingData } from '@/services/data/googleAdsReportingService';
import React from 'react';

interface GoogleAdsReportingTableProps {
  data: GoogleAdsReportingData[];
  loading: boolean;
  error: string | null;
}

export const GoogleAdsReportingTable: React.FC<GoogleAdsReportingTableProps> = ({
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
      <div className="bg-white border border-red-200 shadow-sm rounded-lg p-8">
        <div className="text-center">
          <div className="text-red-600 mb-4">{error}</div>
          <button 
            onClick={() => window.location.reload()} 
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="bg-white border border-slate-200 shadow-sm rounded-lg p-8">
        <div className="text-center text-slate-600">
          <p className="text-lg font-medium mb-2">No Google Ads Data</p>
          <p className="text-sm">No clients with Google Ads integration found.</p>
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
              <th className="text-left py-2 px-3 text-xs font-medium text-slate-700 border-r border-slate-200">Clicks</th>
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
                  label="Clicks"
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
