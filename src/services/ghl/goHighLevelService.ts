/**
 * GoHighLevel Service - Backward Compatibility Wrapper
 * 
 * This wrapper maintains backward compatibility for existing code.
 * New code should import services directly:
 * - GoHighLevelApiService for API calls
 * - GoHighLevelAnalyticsService for analytics
 * - GHLOAuthService for OAuth flow
 */

import { GoHighLevelAnalyticsService } from './goHighLevelAnalyticsService';
import { GoHighLevelApiService } from './goHighLevelApiService';

/**
 * @deprecated Use GoHighLevelApiService, GoHighLevelAnalyticsService, or GHLOAuthService directly
 * This wrapper is kept for backward compatibility only
 * Types are exported from goHighLevelTypes.ts
 */
export class GoHighLevelService {
  static async getFunnelAnalytics(
    locationId: string,
    dateRange?: { startDate?: string; endDate?: string }
  ): Promise<any[]> {
    return GoHighLevelAnalyticsService.getFunnelAnalytics(locationId, dateRange);
  }

  static async getPageAnalytics(
    locationId: string,
    dateRange?: { startDate?: string; endDate?: string }
  ): Promise<any[]> {
    return GoHighLevelAnalyticsService.getPageAnalytics(locationId, dateRange);
  }

  static async getContactCount(
    locationId: string,
    dateRange?: { startDate?: string; endDate?: string }
  ): Promise<number> {
    return GoHighLevelApiService.getContactCount(locationId, dateRange);
  }

  static async getGHLMetrics(locationId: string): Promise<any> {
    return GoHighLevelAnalyticsService.getGHLMetrics(locationId);
  }
}

