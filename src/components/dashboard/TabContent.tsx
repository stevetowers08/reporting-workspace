import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EventDashboardData } from "@/services/eventMetricsService";
import { LeadQualityTable } from '@/components/LeadQualityTable';
import { LeadQualityMetricsComponent } from '@/components/LeadQualityMetrics';
import InsightsCard from '@/components/InsightsCard';

interface TabContentProps {
  dashboardData: EventDashboardData | null;
  selectedPeriod: string;
  clientData: any;
  activeTab: string;
}

export const TabContent: React.FC<TabContentProps> = ({
  dashboardData,
  selectedPeriod,
  clientData,
  activeTab
}) => {
  if (!dashboardData) {
    return (
      <div className="space-y-6">
        <Card className="animate-pulse">
          <CardHeader>
            <div className="h-6 bg-gray-200 rounded w-1/3"></div>
          </CardHeader>
          <CardContent>
            <div className="h-64 bg-gray-200 rounded"></div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Return content based on active tab
  switch (activeTab) {
    case 'summary':
      return (
        <div className="space-y-6">
          <InsightsCard dashboardData={dashboardData} selectedPeriod={selectedPeriod} />
        </div>
      );

    case 'facebook-all':
    case 'facebook':
      return (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Meta Ads Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                        {dashboardData.facebookMetrics.leads?.toLocaleString() || '0'}
                  </div>
                  <div className="text-sm text-gray-600">Leads</div>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                        ${dashboardData.facebookMetrics.spend?.toLocaleString() || '0'}
                  </div>
                  <div className="text-sm text-gray-600">Spend</div>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">
                        ${dashboardData.facebookMetrics.costPerLead?.toFixed(2) || '0.00'}
                  </div>
                  <div className="text-sm text-gray-600">Cost per Lead</div>
                </div>
                <div className="text-center p-4 bg-orange-50 rounded-lg">
                  <div className="text-2xl font-bold text-orange-600">
                        {dashboardData.facebookMetrics.roas?.toFixed(2) || '0.00'}x
                  </div>
                  <div className="text-sm text-gray-600">ROAS</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      );

    case 'google-all':
    case 'google':
      return (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Google Ads Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                        {dashboardData.googleMetrics.leads?.toLocaleString() || '0'}
                  </div>
                  <div className="text-sm text-gray-600">Leads</div>
                </div>
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                        ${dashboardData.googleMetrics.cost?.toLocaleString() || '0'}
                  </div>
                  <div className="text-sm text-gray-600">Cost</div>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">
                        ${dashboardData.googleMetrics.costPerLead?.toFixed(2) || '0.00'}
                  </div>
                  <div className="text-sm text-gray-600">Cost per Lead</div>
                </div>
                <div className="text-center p-4 bg-orange-50 rounded-lg">
                  <div className="text-2xl font-bold text-orange-600">
                        {dashboardData.googleMetrics.qualityScore?.toFixed(1) || '0.0'}
                  </div>
                  <div className="text-sm text-gray-600">Quality Score</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      );

    case 'lead-quality':
      return (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Lead Quality Metrics</CardTitle>
            </CardHeader>
            <CardContent>
              <LeadQualityMetricsComponent 
                metrics={{
                  totalLeads: dashboardData.totalLeads,
                  averageQualityScore: 7.2,
                  conversionRate: dashboardData.leadMetrics.leadToOpportunityRate,
                  sourceBreakdown: [
                    {
                      source: 'Facebook Ads',
                      count: dashboardData.facebookMetrics.leads,
                      percentage: (dashboardData.facebookMetrics.leads / dashboardData.totalLeads) * 100,
                      avgQualityScore: 7.5,
                      conversionRate: 12.5
                    },
                    {
                      source: 'Google Ads',
                      count: dashboardData.googleMetrics.leads,
                      percentage: (dashboardData.googleMetrics.leads / dashboardData.totalLeads) * 100,
                      avgQualityScore: 6.8,
                      conversionRate: 15.2
                    }
                  ],
                  statusBreakdown: [
                    { status: 'New', count: Math.floor(dashboardData.totalLeads * 0.4), percentage: 40 },
                    { status: 'Contacted', count: Math.floor(dashboardData.totalLeads * 0.3), percentage: 30 },
                    { status: 'Qualified', count: Math.floor(dashboardData.totalLeads * 0.2), percentage: 20 },
                    { status: 'Converted', count: Math.floor(dashboardData.totalLeads * 0.1), percentage: 10 }
                  ],
                  qualityScoreDistribution: [
                    { range: '8-10', count: Math.floor(dashboardData.totalLeads * 0.2), percentage: 20 },
                    { range: '6-7', count: Math.floor(dashboardData.totalLeads * 0.5), percentage: 50 },
                    { range: '4-5', count: Math.floor(dashboardData.totalLeads * 0.25), percentage: 25 },
                    { range: '1-3', count: Math.floor(dashboardData.totalLeads * 0.05), percentage: 5 }
                  ],
                  topPerformingSources: [
                    {
                      source: 'Facebook Ads',
                      leads: dashboardData.facebookMetrics.leads,
                      conversionRate: 12.5,
                      avgBudget: 8500
                    },
                    {
                      source: 'Google Ads',
                      leads: dashboardData.googleMetrics.leads,
                      conversionRate: 15.2,
                      avgBudget: 12000
                    }
                  ],
                  recentLeads: []
                }}
              />
            </CardContent>
          </Card>
        </div>
      );

    case 'event-analytics':
      return (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Event Analytics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    {dashboardData.eventMetrics.totalEvents}
                  </div>
                  <div className="text-sm text-gray-600">Total Events</div>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {dashboardData.eventMetrics.averageGuests}
                  </div>
                  <div className="text-sm text-gray-600">Avg Guests</div>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">
                    ${dashboardData.leadMetrics.averageEventValue.toLocaleString()}
                  </div>
                  <div className="text-sm text-gray-600">Avg Event Value</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      );

    default:
      return (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Content Not Found</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">The requested tab content could not be found.</p>
            </CardContent>
          </Card>
        </div>
      );
  }
};