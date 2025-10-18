import { Card } from '@/components/ui/card';
import React from 'react';

interface ResponsiveChartLayoutProps {
  children: React.ReactNode;
  className?: string;
  minItemWidth?: string;
  gap?: string;
}

/**
 * Responsive chart layout that automatically adjusts when charts are removed
 * Uses CSS Grid with auto-fit to fill available space horizontally
 */
export const ResponsiveChartLayout: React.FC<ResponsiveChartLayoutProps> = ({
  children,
  className = '',
  minItemWidth = '300px',
  gap = '1.5rem'
}) => {
  const childrenArray = React.Children.toArray(children);
  
  // If no children, return empty div
  if (childrenArray.length === 0) {
    return <div className={`responsive-chart-layout ${className}`} />;
  }

  return (
    <div 
      className={`responsive-chart-layout ${className}`}
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(auto-fit, minmax(${minItemWidth}, 1fr))`,
        gap: gap,
        width: '100%',
      }}
    >
      {children}
    </div>
  );
};

interface ChartCardProps {
  children: React.ReactNode;
  className?: string;
  minHeight?: string;
}

/**
 * Individual chart card wrapper with consistent styling
 */
export const ChartCard: React.FC<ChartCardProps> = ({
  children,
  className = '',
  minHeight = '300px'
}) => {
  return (
    <Card 
      className={`bg-white border border-slate-200 p-6 ${className}`}
      style={{ minHeight }}
    >
      {children}
    </Card>
  );
};

interface ConditionalChartProps {
  show: boolean;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * Wrapper component for conditional chart rendering
 * Only renders children when show is true
 */
export const ConditionalChart: React.FC<ConditionalChartProps> = ({
  show,
  children,
  fallback = null
}) => {
  if (!show) {
    return <>{fallback}</>;
  }
  
  return <>{children}</>;
};
