// Base Service Classes for better architecture
// This file provides base classes and utilities for service modularization

import { ServiceResponse, LogContext } from '@/types';

/**
 * Base class for all services with common functionality
 */
export abstract class BaseService {
  protected serviceName: string;

  constructor(serviceName: string) {
    this.serviceName = serviceName;
  }

  /**
   * Handle service errors consistently
   */
  protected handleError(error: unknown, context?: LogContext): ServiceResponse<never> {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    // Log error (you can integrate with your logging system here)
    
    return {
      success: false,
      error: errorMessage,
      statusCode: 500
    };
  }

  /**
   * Create success response
   */
  protected createSuccessResponse<T>(data: T, message?: string): ServiceResponse<T> {
    return {
      success: true,
      data,
      message
    };
  }

  /**
   * Validate required parameters
   */
  protected validateRequired(params: Record<string, unknown>, requiredFields: string[]): string | null {
    for (const field of requiredFields) {
      if (params[field] === undefined || params[field] === null) {
        return `Missing required field: ${field}`;
      }
    }
    return null;
  }
}

/**
 * Base class for reporting services
 */
export abstract class BaseReportingService extends BaseService {
  /**
   * Calculate trend percentage between current and previous values
   */
  protected calculateTrendPercentage(current: number, previous: number): { direction: 'up' | 'down'; percentage: number } {
    if (previous === 0) {
      return { direction: 'up', percentage: current > 0 ? 100 : 0 };
    }
    
    const percentage = ((current - previous) / previous) * 100;
    const direction = percentage >= 0 ? 'up' : 'down';
    
    return {
      direction,
      percentage: Math.abs(percentage)
    };
  }

  /**
   * Format currency values
   */
  protected formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(value);
  }

  /**
   * Format percentage values
   */
  protected formatPercentage(value: number): string {
    return `${value.toFixed(2)}%`;
  }

  /**
   * Format number values
   */
  protected formatNumber(value: number): string {
    return new Intl.NumberFormat('en-US').format(value);
  }

  /**
   * Get available reporting periods
   */
  protected getAvailablePeriods() {
    return [
      { value: '7d', label: 'Last 7 days' },
      { value: '14d', label: 'Last 14 days' },
      { value: '30d', label: 'Last 30 days' },
      { value: 'lastMonth', label: 'Last month' },
      { value: '90d', label: 'Last 90 days' }
    ];
  }
}

/**
 * Base class for API services
 */
export abstract class BaseApiService extends BaseService {
  protected baseUrl: string;
  protected defaultHeaders: Record<string, string>;

  constructor(serviceName: string, baseUrl: string) {
    super(serviceName);
    this.baseUrl = baseUrl;
    this.defaultHeaders = {
      'Content-Type': 'application/json',
    };
  }

  /**
   * Make HTTP request with error handling
   */
  protected async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ServiceResponse<T>> {
    try {
      const url = `${this.baseUrl}${endpoint}`;
      const response = await fetch(url, {
        ...options,
        headers: {
          ...this.defaultHeaders,
          ...options.headers,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return this.createSuccessResponse(data);
    } catch (error) {
      return this.handleError(error, { endpoint, options });
    }
  }

  /**
   * Add authentication header
   */
  protected addAuthHeader(accessToken: string): Record<string, string> {
    return {
      Authorization: `Bearer ${accessToken}`,
    };
  }
}

/**
 * Utility class for common service operations
 */
export class ServiceUtils {
  /**
   * Debounce function calls
   */
  static debounce<T extends (...args: unknown[]) => unknown>(
    func: T,
    wait: number
  ): (...args: Parameters<T>) => void {
    let timeout: NodeJS.Timeout;
    return (...args: Parameters<T>) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    };
  }

  /**
   * Retry failed operations
   */
  static async retry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    delay: number = 1000
  ): Promise<T> {
    let lastError: unknown;
    
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        if (i < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
        }
      }
    }
    
    throw lastError;
  }

  /**
   * Cache results with TTL
   */
  static createCache<T>(ttl: number = 5 * 60 * 1000) {
    const cache = new Map<string, { data: T; timestamp: number }>();
    
    return {
      get(key: string): T | null {
        const entry = cache.get(key);
        if (!entry) return null;
        
        if (Date.now() - entry.timestamp > ttl) {
          cache.delete(key);
          return null;
        }
        
        return entry.data;
      },
      
      set(key: string, data: T): void {
        cache.set(key, { data, timestamp: Date.now() });
      },
      
      clear(): void {
        cache.clear();
      }
    };
  }
}
