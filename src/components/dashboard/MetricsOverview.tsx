import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EventDashboardData } from "@/services/eventMetricsService";
import { DollarSign, Users, Calendar, TrendingUp } from "lucide-react";

interface MetricsOverviewProps {
  dashboardData: EventDashboardData | null;
  selectedPeriod: string;
}

export const MetricsOverview: React.FC<MetricsOverviewProps> = ({
  dashboardData,
  selectedPeriod
}) => {
  if (!dashboardData) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="pb-2">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-full"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const periodText = selectedPeriod === '7d' ? '7 days' : 
                    selectedPeriod === '30d' ? '30 days' : '90 days';

  const metrics = [
    {
      title: "Total Leads",
      value: (dashboardData.totalLeads || 0).toLocaleString(),
      description: `Generated in last ${periodText}`,
      icon: Users,
      color: "text-blue-600",
      bgColor: "bg-blue-50"
    },
    {
      title: "Total Spend",
      value: `$${(dashboardData.totalSpend || 0).toLocaleString()}`,
      description: `Across all platforms`,
      icon: DollarSign,
      color: "text-green-600",
      bgColor: "bg-green-50"
    },
    {
      title: "Total Revenue",
      value: `$${(dashboardData.totalRevenue || 0).toLocaleString()}`,
      description: `From event bookings`,
      icon: TrendingUp,
      color: "text-purple-600",
      bgColor: "bg-purple-50"
    },
    {
      title: "ROI",
      value: `${(dashboardData.roi || 0).toFixed(1)}x`,
      description: `Return on investment`,
      icon: Calendar,
      color: "text-orange-600",
      bgColor: "bg-orange-50"
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {metrics.map((metric, index) => {
        const IconComponent = metric.icon;
        return (
          <Card key={index} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                <div className={`p-2 rounded-lg ${metric.bgColor}`}>
                  <IconComponent className={`h-4 w-4 ${metric.color}`} />
                </div>
                {metric.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900 mb-1">
                {metric.value}
              </div>
              <p className="text-sm text-gray-500">
                {metric.description}
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};
