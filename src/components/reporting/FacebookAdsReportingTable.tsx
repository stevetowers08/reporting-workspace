import { LoadingState } from '@/components/ui/LoadingStates';
import { Card, CardContent } from '@/components/ui/card';
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
      <Card className="bg-white border border-slate-200 shadow-sm">
        <CardContent className="p-8">
          <LoadingState message="Loading Facebook Ads data..." />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="bg-white border border-slate-200 shadow-sm">
        <CardContent className="p-8">
          <div className="text-center">
            <div className="text-red-400 mb-4">
              <BarChart3 className="mx-auto h-12 w-12" />
            </div>
            <h3 className="text-lg font-medium text-slate-900 mb-2">Error Loading Data</h3>
            <p className="text-slate-600">{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card className="bg-white border border-slate-200 shadow-sm">
        <CardContent className="p-8">
          <div className="text-center">
            <div className="text-slate-400 mb-4">
              <BarChart3 className="mx-auto h-12 w-12" />
            </div>
            <h3 className="text-lg font-medium text-slate-900 mb-2">No Facebook Ads Accounts</h3>
            <p className="text-slate-600">
              No venues with Facebook Ads integration found. Add Facebook Ads integration to venues to see reporting data.
            </p>
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
            <thead className="bg-white border-b border-slate-200">
              <tr>
                <th className="text-left py-4 px-6 font-semibold text-slate-900">Venue</th>
                <th className="text-right py-4 px-4 font-semibold text-slate-900">Leads</th>
                <th className="text-right py-4 px-4 font-semibold text-slate-900">Cost Per Lead</th>
                <th className="text-right py-4 px-4 font-semibold text-slate-900">Conversion Rate</th>
                <th className="text-right py-4 px-4 font-semibold text-slate-900">Spent</th>
                <th className="text-right py-4 px-4 font-semibold text-slate-900">Impressions</th>
                <th className="text-right py-4 px-4 font-semibold text-slate-900">Link Clicks</th>
                <th className="text-right py-4 px-4 font-semibold text-slate-900">Cost Per Click</th>
                <th className="text-right py-4 px-4 font-semibold text-slate-900">CTR</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.map((venue) => (
                <tr key={venue.clientId} className="hover:bg-slate-50 transition-colors">
                  {/* Venue Name Column */}
                  <td className="px-6 py-4">
                    <p className="text-sm font-semibold text-slate-900">{venue.venueName}</p>
                  </td>

                  {/* Metric Columns */}
                  <MetricTableCell
                    label="Leads"
                    value={venue.metrics.leads}
                    trend={venue.trends?.leads}
                    format="number"
                  />
                  
                  <MetricTableCell
                    label="Cost Per Lead"
                    value={venue.metrics.costPerLead}
                    trend={venue.trends?.costPerLead}
                    format="currency"
                  />
                  
                  <MetricTableCell
                    label="Conversion Rate"
                    value={venue.metrics.conversionRate}
                    trend={venue.trends?.conversionRate}
                    format="percentage"
                  />
                  
                  <MetricTableCell
                    label="Spent"
                    value={venue.metrics.spent}
                    trend={venue.trends?.spent}
                    format="currency"
                  />
                  
                  <MetricTableCell
                    label="Impressions"
                    value={venue.metrics.impressions}
                    trend={venue.trends?.impressions}
                    format="number"
                  />
                  
                  <MetricTableCell
                    label="Link Clicks"
                    value={venue.metrics.clicks}
                    trend={venue.trends?.clicks}
                    format="number"
                  />
                  
                  <MetricTableCell
                    label="Cost Per Click"
                    value={venue.metrics.costPerClick}
                    trend={venue.trends?.costPerClick}
                    format="currency"
                  />
                  
                   <MetricTableCell
                     label="CTR"
                     value={venue.metrics.ctr}
                     trend={venue.trends?.ctr}
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
