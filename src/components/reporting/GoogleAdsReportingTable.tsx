import { MetricTableCell } from '@/components/reporting/MetricTableCell';
import { Card, CardContent } from '@/components/ui/card';
import { LoadingState } from '@/components/ui/LoadingStates';
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
      <Card className="bg-white border border-slate-200 shadow-sm">
        <CardContent className="p-8">
          <LoadingState message="Loading Google Ads reporting data..." />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="bg-white border border-red-200 shadow-sm">
        <CardContent className="p-8">
          <div className="text-center">
            <div className="text-red-600 mb-4">{error}</div>
            <button 
              onClick={() => window.location.reload()} 
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
            >
              Retry
            </button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card className="bg-white border border-slate-200 shadow-sm">
        <CardContent className="p-8">
          <div className="text-center text-slate-600">
            <p className="text-lg font-medium mb-2">No Google Ads Data</p>
            <p className="text-sm">No clients with Google Ads integration found.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white border border-slate-200 shadow-sm">
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left py-3 px-6 font-semibold text-gray-900">Venue</th>
                <th className="text-right py-3 px-3 font-semibold text-gray-900">Leads</th>
                <th className="text-right py-3 px-3 font-semibold text-gray-900">Cost Per Lead</th>
                <th className="text-right py-3 px-3 font-semibold text-gray-900">Conversion Rate</th>
                <th className="text-right py-3 px-3 font-semibold text-gray-900">Spent</th>
                <th className="text-right py-3 px-3 font-semibold text-gray-900">Impressions</th>
                <th className="text-right py-3 px-3 font-semibold text-gray-900">Clicks</th>
                <th className="text-right py-3 px-3 font-semibold text-gray-900">Cost Per Click</th>
                <th className="text-right py-3 px-3 font-semibold text-gray-900">CTR</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {data.map((venue) => (
                <tr key={venue.clientId} className="hover:bg-slate-50 transition-colors">
                  {/* Venue Name Column */}
                  <td className="px-6 py-1.5">
                    <p className="text-sm font-medium text-slate-900">{venue.venueName}</p>
                  </td>

                  {/* Metric Columns */}
                  <MetricTableCell
                    label="Leads"
                    value={venue.metrics.leads}
                    format="number"
                  />
                  <MetricTableCell
                    label="Cost Per Lead"
                    value={venue.metrics.costPerLead}
                    format="currency"
                  />
                  <MetricTableCell
                    label="Conversion Rate"
                    value={venue.metrics.conversionRate}
                    format="percentage"
                  />
                  <MetricTableCell
                    label="Spent"
                    value={venue.metrics.spent}
                    format="currency"
                  />
                  <MetricTableCell
                    label="Impressions"
                    value={venue.metrics.impressions}
                    format="number"
                  />
                  <MetricTableCell
                    label="Clicks"
                    value={venue.metrics.clicks}
                    format="number"
                  />
                  <MetricTableCell
                    label="Cost Per Click"
                    value={venue.metrics.costPerClick}
                    format="currency"
                  />
                  <MetricTableCell
                    label="CTR"
                    value={venue.metrics.ctr}
                    format="percentage"
                  />
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};
