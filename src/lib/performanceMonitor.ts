/**
 * Performance Monitoring Utilities
 * Tracks Core Web Vitals and performance metrics
 */

import { envConfig } from '@/lib/envConfig';
import { LogContext } from '@/types';

// Declare PerformanceObserver for TypeScript
declare global {
  interface PerformanceObserver {
    observe(options?: PerformanceObserverInit): void;
    disconnect(): void;
    takeRecords(): PerformanceEntry[];
  }

  interface PerformanceObserverEntryList {
    getEntries(): PerformanceEntry[];
    getEntriesByType(type: string): PerformanceEntry[];
    getEntriesByName(name: string, type?: string): PerformanceEntry[];
  }

  interface Window {
    gtag?: (command: string, eventName: string, parameters: any) => void;
  }
}

interface PerformanceMetrics {
  fcp?: number; // First Contentful Paint
  lcp?: number; // Largest Contentful Paint
  fid?: number; // First Input Delay
  cls?: number; // Cumulative Layout Shift
  ttfb?: number; // Time to First Byte
}

class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: PerformanceMetrics = {};
  private observers: PerformanceObserver[] = [];

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  init() {
    if (!envConfig.isProduction() || typeof window === 'undefined') {
      return;
    }

    this.observeWebVitals();
    this.observeResourceTiming();
  }

  private observeWebVitals() {
    // First Contentful Paint
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'paint' && entry.name === 'first-contentful-paint') {
            this.metrics.fcp = entry.startTime;
            this.logMetric('FCP', entry.startTime);
          }
        }
      });
      observer.observe({ entryTypes: ['paint'] });
      this.observers.push(observer);
    }

    // Largest Contentful Paint
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        this.metrics.lcp = lastEntry.startTime;
        this.logMetric('LCP', lastEntry.startTime);
      });
      observer.observe({ entryTypes: ['largest-contentful-paint'] });
      this.observers.push(observer);
    }

    // Cumulative Layout Shift
    if ('PerformanceObserver' in window) {
      let clsValue = 0;
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          // Type assertion for layout shift entries
          const layoutShiftEntry = entry as any;
          if (!layoutShiftEntry.hadRecentInput) {
            clsValue += layoutShiftEntry.value || 0;
          }
        }
        this.metrics.cls = clsValue;
        this.logMetric('CLS', clsValue);
      });
      observer.observe({ entryTypes: ['layout-shift'] });
      this.observers.push(observer);
    }
  }

  private observeResourceTiming() {
    // Monitor resource loading times
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'navigation') {
            // Type assertion for navigation entries
            const navEntry = entry as any;
            this.metrics.ttfb = navEntry.responseStart - navEntry.requestStart;
            this.logMetric('TTFB', this.metrics.ttfb);
          }
        }
      });
      observer.observe({ entryTypes: ['navigation'] });
      this.observers.push(observer);
    }
  }

  private logMetric(name: string, value: number) {
    
    // Send to analytics service
    if (envConfig.getConfig().enableAnalytics) {
      // TODO: Send to Google Analytics, Mixpanel, etc.
      this.sendToAnalytics(name, value);
    }
  }

  private sendToAnalytics(name: string, value: number) {
    // Example: Send to Google Analytics
    if (typeof window !== 'undefined' && 'gtag' in window) {
      (window as Window & { gtag?: (command: string, eventName: string, parameters: LogContext) => void }).gtag?.('event', 'web_vitals', {
        event_category: 'Performance',
        event_label: name,
        value: Math.round(value),
      });
    }
  }

  getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  disconnect() {
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
  }
}

// Export singleton instance
export const performanceMonitor = PerformanceMonitor.getInstance();

// Auto-initialize in production
if (typeof window !== 'undefined' && envConfig.isProduction()) {
  // Initialize after page load
  if (document.readyState === 'complete') {
    performanceMonitor.init();
  } else {
    window.addEventListener('load', () => {
      performanceMonitor.init();
    });
  }
}

