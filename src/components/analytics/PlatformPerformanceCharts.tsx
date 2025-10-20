import React from 'react';
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

// Helper function to get chart data
const getChartData = (data?: any) => {
  const metaLeads = data?.facebookMetrics?.leads || 234;
  const metaSpend = data?.facebookMetrics?.spend || 6200;
  const googleLeads = data?.googleMetrics?.leads || 190;
  const googleSpend = data?.googleMetrics?.cost || 6550;
  return { metaLeads, metaSpend, googleLeads, googleSpend };
};

// Option 1: Grouped Bar Chart
export const Option1GroupedBar: React.FC<{ data?: any }> = ({ data }) => {
  const { metaLeads, metaSpend, googleLeads, googleSpend } = getChartData(data);
  
  const chartData = [
    { name: 'Leads', meta: metaLeads, google: googleLeads },
    { name: 'Spend ($)', meta: metaSpend, google: googleSpend }
  ];

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart 
          data={chartData} 
          margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
        >
          <XAxis 
            dataKey="name"
            tick={{ fontSize: 12 }}
          />
          <YAxis 
            tick={{ fontSize: 12 }}
          />
          <Tooltip 
            formatter={(value: number, name: string) => [
              `${value.toLocaleString()}${name === 'meta' ? ' (Meta)' : ' (Google)'}`,
              name === 'meta' ? 'Meta Ads' : 'Google Ads'
            ]}
            labelStyle={{ color: '#374151' }}
            contentStyle={{ 
              backgroundColor: '#fff', 
              border: '1px solid #E2E8F0',
              borderRadius: '6px'
            }}
          />
          <Bar dataKey="meta" fill="#3B82F6" radius={[4, 4, 0, 0]} />
          <Bar dataKey="google" fill="#EF4444" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

// Option 2: Platform Comparison
export const Option2PlatformComparison: React.FC<{ data?: any }> = ({ data }) => {
  const { metaLeads, metaSpend, googleLeads, googleSpend } = getChartData(data);
  
  const chartData = [
    { name: 'Meta Ads', leads: metaLeads, spend: metaSpend },
    { name: 'Google Ads', leads: googleLeads, spend: googleSpend }
  ];

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart 
          data={chartData} 
          margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
        >
          <XAxis 
            dataKey="name"
            tick={{ fontSize: 12 }}
          />
          <YAxis 
            tick={{ fontSize: 12 }}
          />
          <Tooltip 
            formatter={(value: number, name: string) => [
              `${value.toLocaleString()}${name === 'leads' ? ' leads' : ' $'}`,
              name === 'leads' ? 'Leads' : 'Spend'
            ]}
            labelStyle={{ color: '#374151' }}
            contentStyle={{ 
              backgroundColor: '#fff', 
              border: '1px solid #E2E8F0',
              borderRadius: '6px'
            }}
          />
          <Bar dataKey="leads" fill="#10B981" radius={[4, 4, 0, 0]} />
          <Bar dataKey="spend" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

// Option 3: Metric Cards with Mini Charts
export const Option3MetricCards: React.FC<{ data?: any }> = ({ data }) => {
  const { metaLeads, metaSpend, googleLeads, googleSpend } = getChartData(data);
  
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-3 rounded-lg border border-blue-200">
          <div className="text-center">
            <div className="w-8 h-8 bg-blue-600 rounded-full mx-auto mb-2 flex items-center justify-center">
              <span className="text-white text-xs font-bold">M</span>
            </div>
            <div className="text-lg font-bold text-blue-900">{metaLeads}</div>
            <div className="text-xs text-blue-700">Meta Leads</div>
            <div className="w-full bg-blue-200 rounded-full h-1 mt-2">
              <div className="bg-blue-600 h-1 rounded-full" style={{ width: '60%' }}></div>
            </div>
          </div>
        </div>
        <div className="bg-gradient-to-br from-red-50 to-red-100 p-3 rounded-lg border border-red-200">
          <div className="text-center">
            <div className="w-8 h-8 bg-red-600 rounded-full mx-auto mb-2 flex items-center justify-center">
              <span className="text-white text-xs font-bold">G</span>
            </div>
            <div className="text-lg font-bold text-red-900">{googleLeads}</div>
            <div className="text-xs text-red-700">Google Leads</div>
            <div className="w-full bg-red-200 rounded-full h-1 mt-2">
              <div className="bg-red-600 h-1 rounded-full" style={{ width: '40%' }}></div>
            </div>
          </div>
        </div>
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-3 rounded-lg border border-blue-200">
          <div className="text-center">
            <div className="w-8 h-8 bg-blue-600 rounded-full mx-auto mb-2 flex items-center justify-center">
              <span className="text-white text-xs font-bold">$</span>
            </div>
            <div className="text-lg font-bold text-blue-900">${(metaSpend/1000).toFixed(1)}k</div>
            <div className="text-xs text-blue-700">Meta Spend</div>
            <div className="w-full bg-blue-200 rounded-full h-1 mt-2">
              <div className="bg-blue-600 h-1 rounded-full" style={{ width: '48%' }}></div>
            </div>
          </div>
        </div>
        <div className="bg-gradient-to-br from-red-50 to-red-100 p-3 rounded-lg border border-red-200">
          <div className="text-center">
            <div className="w-8 h-8 bg-red-600 rounded-full mx-auto mb-2 flex items-center justify-center">
              <span className="text-white text-xs font-bold">$</span>
            </div>
            <div className="text-lg font-bold text-red-900">${(googleSpend/1000).toFixed(1)}k</div>
            <div className="text-xs text-red-700">Google Spend</div>
            <div className="w-full bg-red-200 rounded-full h-1 mt-2">
              <div className="bg-red-600 h-1 rounded-full" style={{ width: '52%' }}></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};