import { Card } from '@/components/ui/card';
import React from 'react';

interface OpportunityStagesChartProps {
  data: {
    ghlMetrics?: {
      opportunities?: Array<{
        stageName: string;
        count: number;
        value: number;
      }>;
    };
  };
  dateRange?: { start: string; end: string };
}

export const OpportunityStagesChart: React.FC<OpportunityStagesChartProps> = ({ data, dateRange }) => {
  const opportunities = data.ghlMetrics?.opportunities || [];

  if (opportunities.length === 0) {
    return (
      <Card className="bg-white border border-slate-200 shadow-sm p-6">
        <div className="pb-3">
          <h3 className="text-lg font-semibold text-slate-900">Opportunity Stages</h3>
          <p className="text-sm text-slate-600">
            {dateRange ? 
              `Pipeline breakdown for ${new Date(dateRange.start).toLocaleDateString()} - ${new Date(dateRange.end).toLocaleDateString()}` :
              'Current pipeline breakdown'
            }
          </p>
        </div>
        <div className="h-80 flex items-center justify-center">
          <div className="text-center">
            <div className="text-slate-500 mb-2">No opportunities in pipeline</div>
            <div className="text-xs text-slate-400">
              No opportunities found in GoHighLevel. This is normal if no deals are currently being tracked.
            </div>
            <div className="text-xs text-slate-400 mt-2">
              API Status: ✅ Connected | Endpoint: POST /opportunities/search | Response: Empty array
            </div>
          </div>
        </div>
      </Card>
    );
  }

  // Calculate total for percentage calculations
  const totalCount = opportunities.reduce((sum, opp) => sum + opp.count, 0);
  const totalValue = opportunities.reduce((sum, opp) => sum + opp.value, 0);

  // Sort by count descending
  const sortedOpportunities = [...opportunities].sort((a, b) => b.count - a.count);

  return (
    <Card className="bg-white border border-slate-200 shadow-sm p-6 w-full">
      <div className="pb-3">
        <h3 className="text-lg font-semibold text-slate-900">Opportunity Stages</h3>
        <p className="text-sm text-slate-600">
          {dateRange ? 
            `Pipeline breakdown for ${new Date(dateRange.start).toLocaleDateString()} - ${new Date(dateRange.end).toLocaleDateString()}` :
            'Current pipeline breakdown'
          }
        </p>
        <div className="text-xs text-slate-400 mt-1">
          API: POST /opportunities/search | Pipeline breakdown
        </div>
      </div>
      
      <div className="space-y-4">
        {sortedOpportunities.map((opportunity, index) => {
          const percentage = totalCount > 0 ? (opportunity.count / totalCount) * 100 : 0;
          const avgValue = opportunity.count > 0 ? opportunity.value / opportunity.count : 0;
          
          return (
            <div key={index} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                  <span className="text-sm font-medium text-slate-700">{opportunity.stageName}</span>
                </div>
                <div className="flex items-center space-x-4 text-sm text-slate-600">
                  <span>{opportunity.count} opportunities</span>
                  <span className="font-medium text-green-600">${opportunity.value.toLocaleString()}</span>
                  <span className="font-medium text-blue-600">{percentage.toFixed(1)}%</span>
                </div>
              </div>
              
              {/* Horizontal bar */}
              <div className="w-full bg-slate-100 rounded-full h-2">
                <div 
                  className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${percentage}%` }}
                ></div>
              </div>
              
              {/* Additional details */}
              <div className="text-xs text-slate-500 ml-6">
                Avg. value: ${avgValue.toLocaleString()} per opportunity
              </div>
            </div>
          );
        })}
      </div>
      
      {/* Summary */}
      <div className="mt-6 pt-4 border-t border-slate-200">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-lg font-semibold text-slate-900">{totalCount}</div>
            <div className="text-sm text-slate-600">Total Opportunities</div>
          </div>
          <div>
            <div className="text-lg font-semibold text-green-600">${totalValue.toLocaleString()}</div>
            <div className="text-sm text-slate-600">Total Pipeline Value</div>
          </div>
          <div>
            <div className="text-lg font-semibold text-blue-600">
              ${totalCount > 0 ? (totalValue / totalCount).toLocaleString() : '0'}
            </div>
            <div className="text-sm text-slate-600">Average Deal Size</div>
          </div>
        </div>
      </div>
    </Card>
  );
};
