import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import React, { ComponentType, Suspense, lazy, forwardRef } from 'react';

interface LazyChartWrapperProps {
  chartComponent: ComponentType<any>;
  fallback?: React.ReactNode;
  [key: string]: any;
}

/**
 * Lazy loads chart components to reduce initial bundle size
 * Only loads chart libraries when the component is actually rendered
 */
export const LazyChartWrapper: React.FC<LazyChartWrapperProps> = ({ 
  chartComponent: ChartComponent, 
  fallback,
  ...props 
}) => {
  const defaultFallback = (
    <Card className="p-6">
      <div className="space-y-4">
        <Skeleton className="h-4 w-1/4" />
        <Skeleton className="h-64 w-full" />
        <div className="flex space-x-2">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-16" />
        </div>
      </div>
    </Card>
  );

  return (
    <Suspense fallback={fallback || defaultFallback}>
      <ChartComponent {...props} />
    </Suspense>
  );
};

/**
 * Creates a lazy-loaded chart component
 */
export const createLazyChart = <P extends object>(
  importFn: () => Promise<{ default: ComponentType<any> }>
) => {
  const LazyComponent = lazy(importFn);
  
  return forwardRef<any, P>((props, ref) => (
    <LazyChartWrapper 
      chartComponent={LazyComponent} 
      {...props} 
      ref={ref}
    />
  ));
};

/**
 * Pre-configured lazy chart components for common use cases
 */
export const LazyRechartsWrapper = createLazyChart(() => 
  import('recharts').then(module => ({ default: module.ResponsiveContainer }))
);

export const LazyChartJSWrapper = createLazyChart(() => 
  import('react-chartjs-2').then(module => ({ default: module.Line }))
);
