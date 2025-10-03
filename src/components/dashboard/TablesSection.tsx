import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EventDashboardData } from "@/services/eventMetricsService";
import AllVenuesGoogleAdsTable from '@/components/AllVenuesGoogleAdsTable';
import AllVenuesFacebookAdsTable from '@/components/AllVenuesFacebookAdsTable';

interface TablesSectionProps {
  dashboardData: EventDashboardData | null;
  selectedPeriod: string;
  clientData: any;
}

export const TablesSection: React.FC<TablesSectionProps> = ({
  dashboardData,
  selectedPeriod,
  clientData
}) => {
  if (!dashboardData) {
    return (
      <div className="space-y-6">
        {[...Array(2)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-6 bg-gray-200 rounded w-1/3"></div>
            </CardHeader>
            <CardContent>
              <div className="h-64 bg-gray-200 rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Facebook Ads Table */}
      <Card>
        <CardHeader>
          <CardTitle>Facebook Ads Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <AllVenuesFacebookAdsTable selectedPeriod={selectedPeriod} />
        </CardContent>
      </Card>

      {/* Google Ads Table */}
      <Card>
        <CardHeader>
          <CardTitle>Google Ads Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <AllVenuesGoogleAdsTable selectedPeriod={selectedPeriod} />
        </CardContent>
      </Card>

      {/* Platform Comparison Table */}
      <Card>
        <CardHeader>
          <CardTitle>Platform Performance Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Platform</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-700">Leads</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-700">Spend</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-700">CPL</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-700">CTR</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-700">ROAS</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b hover:bg-gray-50">
                  <td className="py-3 px-4 font-medium text-blue-600">Meta Ads</td>
                  <td className="py-3 px-4 text-right">{dashboardData.facebookMetrics.leads.toLocaleString()}</td>
                  <td className="py-3 px-4 text-right">${dashboardData.facebookMetrics.spend.toLocaleString()}</td>
                  <td className="py-3 px-4 text-right">${dashboardData.facebookMetrics.costPerLead.toFixed(2)}</td>
                  <td className="py-3 px-4 text-right">{dashboardData.facebookMetrics.ctr.toFixed(2)}%</td>
                  <td className="py-3 px-4 text-right">{dashboardData.facebookMetrics.roas.toFixed(2)}x</td>
                </tr>
                <tr className="border-b hover:bg-gray-50">
                  <td className="py-3 px-4 font-medium text-green-600">Google Ads</td>
                  <td className="py-3 px-4 text-right">{dashboardData.googleMetrics.leads.toLocaleString()}</td>
                  <td className="py-3 px-4 text-right">${dashboardData.googleMetrics.cost.toLocaleString()}</td>
                  <td className="py-3 px-4 text-right">${dashboardData.googleMetrics.costPerLead.toFixed(2)}</td>
                  <td className="py-3 px-4 text-right">{dashboardData.googleMetrics.ctr.toFixed(2)}%</td>
                  <td className="py-3 px-4 text-right">-</td>
                </tr>
                <tr className="bg-gray-50 font-medium">
                  <td className="py-3 px-4">Total</td>
                  <td className="py-3 px-4 text-right">{dashboardData.totalLeads.toLocaleString()}</td>
                  <td className="py-3 px-4 text-right">${dashboardData.totalSpend.toLocaleString()}</td>
                  <td className="py-3 px-4 text-right">${dashboardData.leadMetrics.overallCostPerLead.toFixed(2)}</td>
                  <td className="py-3 px-4 text-right">-</td>
                  <td className="py-3 px-4 text-right">{dashboardData.roi.toFixed(2)}x</td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
