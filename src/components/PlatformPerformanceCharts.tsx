import React from 'react';
import { Bar, Line, Pie } from 'react-chartjs-2';

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
  
  const chartData = {
    labels: ['Leads', 'Spend ($)'],
    datasets: [
      {
        label: 'Meta Ads',
        data: [metaLeads, metaSpend],
        backgroundColor: 'rgba(59, 130, 246, 0.8)',
        borderColor: 'rgb(59, 130, 246)',
        borderWidth: 1,
        borderRadius: 6,
      },
      {
        label: 'Google Ads',
        data: [googleLeads, googleSpend],
        backgroundColor: 'rgba(220, 38, 38, 0.8)',
        borderColor: 'rgb(220, 38, 38)',
        borderWidth: 1,
        borderRadius: 6,
      }
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: true, position: 'top' as const },
      title: { display: true, text: 'Option 1: Grouped Bars' }
    },
    scales: {
      y: { beginAtZero: true, title: { display: true, text: 'Count' } },
      x: { title: { display: true, text: 'Metrics' } }
    }
  };

  return <Bar data={chartData} options={options} />;
};

// Option 2: Horizontal Grouped Bars
export const Option2HorizontalBar: React.FC<{ data?: any }> = ({ data }) => {
  const { metaLeads, metaSpend, googleLeads, googleSpend } = getChartData(data);
  
  const chartData = {
    labels: ['Meta Ads', 'Google Ads'],
    datasets: [
      {
        label: 'Leads',
        data: [metaLeads, googleLeads],
        backgroundColor: 'rgba(34, 197, 94, 0.8)',
        borderColor: 'rgb(34, 197, 94)',
        borderWidth: 1,
      },
      {
        label: 'Spend ($)',
        data: [metaSpend, googleSpend],
        backgroundColor: 'rgba(168, 85, 247, 0.8)',
        borderColor: 'rgb(168, 85, 247)',
        borderWidth: 1,
      }
    ],
  };

  const options = {
    indexAxis: 'y' as const,
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: true, position: 'top' as const },
      title: { display: true, text: 'Option 2: Horizontal Bars' }
    },
    scales: {
      x: { beginAtZero: true, title: { display: true, text: 'Count' } },
      y: { title: { display: true, text: 'Platforms' } }
    }
  };

  return <Bar data={chartData} options={options} />;
};

// Option 3: Stacked Bar Chart
export const Option3StackedBar: React.FC<{ data?: any }> = ({ data }) => {
  const { metaLeads, metaSpend, googleLeads, googleSpend } = getChartData(data);
  
  const chartData = {
    labels: ['Meta Ads', 'Google Ads'],
    datasets: [
      {
        label: 'Leads',
        data: [metaLeads, googleLeads],
        backgroundColor: 'rgba(59, 130, 246, 0.8)',
        borderColor: 'rgb(59, 130, 246)',
        borderWidth: 1,
      },
      {
        label: 'Spend ($)',
        data: [metaSpend, googleSpend],
        backgroundColor: 'rgba(220, 38, 38, 0.8)',
        borderColor: 'rgb(220, 38, 38)',
        borderWidth: 1,
      }
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: true, position: 'top' as const },
      title: { display: true, text: 'Option 3: Stacked Bars' }
    },
    scales: {
      x: { stacked: true, title: { display: true, text: 'Platforms' } },
      y: { stacked: true, beginAtZero: true, title: { display: true, text: 'Count' } }
    }
  };

  return <Bar data={chartData} options={options} />;
};

// Option 4: Side-by-Side Comparison Cards
export const Option4ComparisonCards: React.FC<{ data?: any }> = ({ data }) => {
  const { metaLeads, metaSpend, googleLeads, googleSpend } = getChartData(data);
  
  return (
    <div className="space-y-4">
      <h4 className="text-sm font-semibold text-center">Option 4: Comparison Cards</h4>
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-3 h-3 bg-blue-600 rounded-full"></div>
            <span className="text-sm font-medium">Meta Ads</span>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span>Leads:</span>
              <span className="font-medium">{metaLeads}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span>Spend:</span>
              <span className="font-medium">${metaSpend.toLocaleString()}</span>
            </div>
          </div>
        </div>
        <div className="bg-red-50 p-4 rounded-lg border border-red-200">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-3 h-3 bg-red-600 rounded-full"></div>
            <span className="text-sm font-medium">Google Ads</span>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span>Leads:</span>
              <span className="font-medium">{googleLeads}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span>Spend:</span>
              <span className="font-medium">${googleSpend.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Option 5: Donut Chart
export const Option5DonutChart: React.FC<{ data?: any }> = ({ data }) => {
  const { metaLeads, metaSpend, googleLeads, googleSpend } = getChartData(data);
  
  const chartData = {
    labels: ['Meta Leads', 'Google Leads', 'Meta Spend', 'Google Spend'],
    datasets: [{
      data: [metaLeads, googleLeads, metaSpend, googleSpend],
      backgroundColor: [
        'rgba(59, 130, 246, 0.8)',
        'rgba(220, 38, 38, 0.8)',
        'rgba(59, 130, 246, 0.4)',
        'rgba(220, 38, 38, 0.4)'
      ],
      borderWidth: 2,
      borderColor: '#fff'
    }]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: true, position: 'bottom' as const },
      title: { display: true, text: 'Option 5: Donut Chart' }
    }
  };

  return <Pie data={chartData} options={options} />;
};

// Option 6: Progress Bars
export const Option6ProgressBars: React.FC<{ data?: any }> = ({ data }) => {
  const { metaLeads, metaSpend, googleLeads, googleSpend } = getChartData(data);
  const totalLeads = metaLeads + googleLeads;
  const totalSpend = metaSpend + googleSpend;
  
  return (
    <div className="space-y-4">
      <div>
        <div className="flex justify-between text-sm mb-2">
          <span className="font-medium text-slate-700">Leads Distribution</span>
          <span className="text-slate-500">{totalLeads} total</span>
        </div>
        <div className="flex h-6 bg-gray-200 rounded-full overflow-hidden">
          <div 
            className="bg-blue-600 h-full" 
            style={{ width: `${(metaLeads / totalLeads) * 100}%` }}
          ></div>
          <div 
            className="bg-red-600 h-full" 
            style={{ width: `${(googleLeads / totalLeads) * 100}%` }}
          ></div>
        </div>
        <div className="flex justify-between text-sm mt-2">
          <span className="text-blue-600 font-medium">Meta: {metaLeads}</span>
          <span className="text-red-600 font-medium">Google: {googleLeads}</span>
        </div>
      </div>
      <div>
        <div className="flex justify-between text-sm mb-2">
          <span className="font-medium text-slate-700">Spend Distribution</span>
          <span className="text-slate-500">${totalSpend.toLocaleString()} total</span>
        </div>
        <div className="flex h-6 bg-gray-200 rounded-full overflow-hidden">
          <div 
            className="bg-blue-600 h-full" 
            style={{ width: `${(metaSpend / totalSpend) * 100}%` }}
          ></div>
          <div 
            className="bg-red-600 h-full" 
            style={{ width: `${(googleSpend / totalSpend) * 100}%` }}
          ></div>
        </div>
        <div className="flex justify-between text-sm mt-2">
          <span className="text-blue-600 font-medium">Meta: ${metaSpend.toLocaleString()}</span>
          <span className="text-red-600 font-medium">Google: ${googleSpend.toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
};

// Option 7: Line Chart Comparison
export const Option7LineChart: React.FC<{ data?: any }> = ({ data }) => {
  const { metaLeads, metaSpend, googleLeads, googleSpend } = getChartData(data);
  
  const chartData = {
    labels: ['Meta Ads', 'Google Ads'],
    datasets: [
      {
        label: 'Leads',
        data: [metaLeads, googleLeads],
        borderColor: 'rgb(34, 197, 94)',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        tension: 0.1,
        pointRadius: 6,
      },
      {
        label: 'Spend ($)',
        data: [metaSpend, googleSpend],
        borderColor: 'rgb(168, 85, 247)',
        backgroundColor: 'rgba(168, 85, 247, 0.1)',
        tension: 0.1,
        pointRadius: 6,
      }
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: true, position: 'top' as const },
      title: { display: true, text: 'Option 7: Line Chart' }
    },
    scales: {
      y: { beginAtZero: true, title: { display: true, text: 'Count' } },
      x: { title: { display: true, text: 'Platforms' } }
    }
  };

  return <Line data={chartData} options={options} />;
};

// Option 8: Scatter Plot
export const Option8ScatterPlot: React.FC<{ data?: any }> = ({ data }) => {
  const { metaLeads, metaSpend, googleLeads, googleSpend } = getChartData(data);
  
  const chartData = {
    datasets: [
      {
        label: 'Meta Ads',
        data: [{ x: metaSpend, y: metaLeads }],
        backgroundColor: 'rgba(59, 130, 246, 0.8)',
        borderColor: 'rgb(59, 130, 246)',
        pointRadius: 10,
      },
      {
        label: 'Google Ads',
        data: [{ x: googleSpend, y: googleLeads }],
        backgroundColor: 'rgba(220, 38, 38, 0.8)',
        borderColor: 'rgb(220, 38, 38)',
        pointRadius: 10,
      }
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: true, position: 'top' as const },
      title: { display: true, text: 'Option 8: Scatter Plot' }
    },
    scales: {
      x: { title: { display: true, text: 'Spend ($)' } },
      y: { title: { display: true, text: 'Leads' } }
    }
  };

  return <Line data={chartData} options={options} />;
};

// Option 9: Metric Cards with Mini Charts
export const Option9MetricCards: React.FC<{ data?: any }> = ({ data }) => {
  const { metaLeads, metaSpend, googleLeads, googleSpend } = getChartData(data);
  
  return (
    <div className="space-y-4">
      <h4 className="text-sm font-semibold text-center">Option 9: Metric Cards</h4>
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-3 rounded-lg border border-blue-200">
          <div className="text-center">
            <div className="w-8 h-8 bg-blue-600 rounded-full mx-auto mb-2 flex items-center justify-center">
              <span className="text-white text-xs font-bold">M</span>
            </div>
            <div className="text-lg font-bold text-blue-900">{metaLeads}</div>
            <div className="text-xs text-blue-700">Leads</div>
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
            <div className="text-xs text-red-700">Leads</div>
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
            <div className="text-xs text-blue-700">Spend</div>
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
            <div className="text-xs text-red-700">Spend</div>
            <div className="w-full bg-red-200 rounded-full h-1 mt-2">
              <div className="bg-red-600 h-1 rounded-full" style={{ width: '52%' }}></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Option 10: Heatmap Grid
export const Option10HeatmapGrid: React.FC<{ data?: any }> = ({ data }) => {
  const { metaLeads, metaSpend, googleLeads, googleSpend } = getChartData(data);
  
  return (
    <div className="space-y-4">
      <h4 className="text-sm font-semibold text-center">Option 10: Heatmap Grid</h4>
      <div className="grid grid-cols-2 gap-2">
        <div className="text-center">
          <div className="text-xs text-gray-600 mb-1">Meta Leads</div>
          <div className="w-full h-16 bg-blue-600 rounded flex items-center justify-center">
            <span className="text-white font-bold text-sm">{metaLeads}</span>
          </div>
        </div>
        <div className="text-center">
          <div className="text-xs text-gray-600 mb-1">Google Leads</div>
          <div className="w-full h-16 bg-red-600 rounded flex items-center justify-center">
            <span className="text-white font-bold text-sm">{googleLeads}</span>
          </div>
        </div>
        <div className="text-center">
          <div className="text-xs text-gray-600 mb-1">Meta Spend</div>
          <div className="w-full h-16 bg-blue-500 rounded flex items-center justify-center">
            <span className="text-white font-bold text-sm">${(metaSpend/1000).toFixed(1)}k</span>
          </div>
        </div>
        <div className="text-center">
          <div className="text-xs text-gray-600 mb-1">Google Spend</div>
          <div className="w-full h-16 bg-red-500 rounded flex items-center justify-center">
            <span className="text-white font-bold text-sm">${(googleSpend/1000).toFixed(1)}k</span>
          </div>
        </div>
      </div>
    </div>
  );
};
