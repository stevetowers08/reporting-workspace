/**
 * GoHighLevel Service - Unified Interface
 * 
 * This is a wrapper that provides a unified interface to the modular GHL services.
 * It maintains backward compatibility with existing code while using the new modular services.
 */

import { GoHighLevelAnalyticsService } from './goHighLevelAnalyticsService';
import { GoHighLevelApiService } from './goHighLevelApiService';

export interface GHLAccount {
  id: string;
  name: string;
}

export interface GHLCampaign {
  id: string;
  name: string;
}

export interface GHLContact {
  id: string;
  name: string;
  email?: string;
}

/**
 * Unified GoHighLevel Service
 * Provides backward-compatible interface using modular services
 */
export class GoHighLevelService {
  /**
   * Get funnel analytics for a location
   */
  static async getFunnelAnalytics(
    locationId: string,
    dateRange?: { startDate?: string; endDate?: string }
  ): Promise<any[]> {
    // Returns GHLFunnelAnalytics[] directly
    return GoHighLevelAnalyticsService.getFunnelAnalytics(locationId, dateRange);
  }

  /**
   * Get page analytics for a location
   */
  static async getPageAnalytics(
    locationId: string,
    dateRange?: { startDate?: string; endDate?: string }
  ): Promise<any[]> {
    // Returns GHLPageAnalytics[] directly
    return GoHighLevelAnalyticsService.getPageAnalytics(locationId, dateRange);
  }

  /**
   * Get contact count for a location
   */
  static async getContactCount(
    locationId: string,
    dateRange?: { startDate?: string; endDate?: string }
  ): Promise<number> {
    return GoHighLevelApiService.getContactCount(locationId, dateRange);
  }

  /**
   * Get GHL metrics (for backward compatibility)
   */
  static async getGHLMetrics(locationId: string): Promise<any> {
    return GoHighLevelAnalyticsService.getMetrics(locationId);
  }

  /**
   * Verify webhook signature
   */
  static verifyWebhookSignature(): boolean {
    // Implementation would go here
    return true;
  }

  /**
   * Setup webhook
   */
  static async setupWebhook(
    locationId: string,
    webhookUrl: string,
    events: string[]
  ): Promise<void> {
    return GoHighLevelApiService.setupWebhook(locationId, webhookUrl, events);
  }
}

