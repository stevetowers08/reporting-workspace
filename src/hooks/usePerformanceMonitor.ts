import { debugLogger } from '@/lib/debug';
import { useEffect, useRef } from 'react';

interface PerformanceMetrics {
  renderTime: number;
  memoryUsage?: number;
  componentName: string;
}

export const usePerformanceMonitor = (componentName: string) => {
  const renderStartTime = useRef<number>(0);
  const renderCount = useRef<number>(0);

  useEffect(() => {
    renderStartTime.current = performance.now();
    renderCount.current += 1;

    return () => {
      const renderTime = performance.now() - renderStartTime.current;
      
      // Log performance metrics in development
      if (process.env.NODE_ENV === 'development') {
        debugLogger.debug('usePerformanceMonitor', `Performance: ${componentName}`, {
          renderTime: `${renderTime.toFixed(2)}ms`,
          renderCount: renderCount.current,
          memoryUsage: (performance as any).memory ? 
            `${Math.round((performance as any).memory.usedJSHeapSize / 1024 / 1024)}MB` : 'N/A'
        });
      }

      // Send to analytics in production
      if (process.env.NODE_ENV === 'production' && renderTime > 100) {
        // Send slow render warning to analytics
        debugLogger.warn('usePerformanceMonitor', `Slow render detected: ${componentName} took ${renderTime.toFixed(2)}ms`);
      }
    };
  });

  return {
    renderCount: renderCount.current,
    startTiming: () => {
      renderStartTime.current = performance.now();
    }
  };
};
