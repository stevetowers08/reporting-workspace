import {
    CategoryScale,
    Chart as ChartJS,
    Filler,
    Legend,
    LinearScale,
    LineElement,
    PointElement,
    Title,
    Tooltip,
} from 'chart.js';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

// Color palette matching the reference image
export const CHART_COLORS = {
  primary: '#4285F4', // Blue from reference
  secondary: '#EA4335', // Pink/magenta from reference
  grid: '#E5E7EB', // Light gray grid lines
  text: '#374151', // Dark gray text
  textSecondary: '#6B7280', // Lighter gray text
  background: '#FFFFFF', // White background
};

// Default chart options matching the reference style
export const getDefaultChartOptions = (title?: string) => ({
  responsive: true,
  maintainAspectRatio: false,
  layout: {
    padding: {
      top: 20,
      bottom: 20,
      left: 20,
      right: 20,
    },
  },
  interaction: {
    mode: 'index' as const,
    intersect: false,
  },
  plugins: {
    legend: {
      display: true,
      position: 'top' as const,
      align: 'end' as const,
      labels: {
        usePointStyle: true,
        pointStyle: 'circle',
        padding: 20,
        font: {
          size: 12,
          family: 'Inter, system-ui, sans-serif',
        },
        color: CHART_COLORS.text,
      },
    },
    title: {
      display: !!title,
      text: title,
      font: {
        size: 16,
        weight: 'bold' as const,
        family: 'Inter, system-ui, sans-serif',
      },
      color: CHART_COLORS.text,
      padding: {
        top: 10,
        bottom: 20,
      },
    },
    tooltip: {
      backgroundColor: 'rgba(0, 0, 0, 0.9)',
      titleColor: 'white',
      bodyColor: 'white',
      borderColor: 'rgba(255, 255, 255, 0.1)',
      borderWidth: 1,
      cornerRadius: 8,
      titleFont: {
        size: 12,
        weight: 'bold' as const,
        family: 'Inter, system-ui, sans-serif',
      },
      bodyFont: {
        size: 11,
        family: 'Inter, system-ui, sans-serif',
      },
      padding: 12,
    },
  },
  scales: {
    x: {
      display: true,
      grid: {
        display: true,
        color: CHART_COLORS.grid,
        drawBorder: false,
      },
      ticks: {
        font: {
          size: 11,
          family: 'Inter, system-ui, sans-serif',
        },
        color: CHART_COLORS.textSecondary,
        maxTicksLimit: 8,
      },
    },
    y: {
      display: true,
      beginAtZero: true,
      grid: {
        display: true,
        color: CHART_COLORS.grid,
        drawBorder: false,
      },
      ticks: {
        font: {
          size: 11,
          family: 'Inter, system-ui, sans-serif',
        },
        color: CHART_COLORS.textSecondary,
        callback: function(value: any) {
          return value;
        },
      },
    },
  },
});

// Dataset configuration for line charts
export const getLineDatasetConfig = (
  label: string,
  data: number[],
  color: string = CHART_COLORS.primary,
  fill: boolean = false
) => ({
  label,
  data,
  borderColor: color,
  backgroundColor: fill ? `${color}15` : 'transparent', // 15% opacity for fill
  tension: 0.4, // Smooth curves like in reference
  fill,
  pointBackgroundColor: color,
  pointBorderColor: CHART_COLORS.background,
  pointBorderWidth: 2,
  pointRadius: 4,
  pointHoverRadius: 6,
  borderWidth: 2,
});

// Generate date labels for time series charts
export const generateDateLabels = (days: number, format: 'short' | 'long' = 'short') => {
  const labels = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    
    if (format === 'short') {
      labels.push(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
    } else {
      labels.push(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }));
    }
  }
  return labels;
};

// Chart header component props
export interface ChartHeaderProps {
  title: string;
  subtitle?: string;
  value?: string | number;
  valueLabel?: string;
  className?: string;
}

// Utility to format chart values
export const formatChartValue = (value: number, type: 'number' | 'currency' | 'percentage' = 'number') => {
  switch (type) {
    case 'currency':
      return `$${value.toLocaleString()}`;
    case 'percentage':
      return `${value.toFixed(1)}%`;
    default:
      return value.toLocaleString();
  }
};
