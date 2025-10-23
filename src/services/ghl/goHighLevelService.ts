// GoHighLevel Service - Unified Interface
// This provides a unified interface that combines all GoHighLevel services

import { debugLogger } from '@/lib/debug';
import { GoHighLevelAnalyticsService } from './goHighLevelAnalyticsService';
import { GoHighLevelApiService } from './goHighLevelApiService';
import { GoHighLevelAuthService } from './goHighLevelAuthService';
import type { GHLTokenData } from './goHighLevelTypes';

/**
 * Unified GoHighLevel Service
 * 
 * This class provides a unified interface that combines all GoHighLevel services
 * for backward compatibility and ease of use.
 */
export class GoHighLevelService {
  // ============================================================================
  // AUTHENTICATION METHODS
  // ============================================================================

  /**
   * Generate OAuth authorization URL
   */
  static async getAuthorizationUrl(clientId: string, redirectUri: string, scopes: string[] = [], stateData?: Record<string, unknown>): Promise<string> {
    return GoHighLevelAuthService.getAuthorizationUrl(clientId, redirectUri, scopes, stateData);
  }

  /**
   * Exchange authorization code for access token
   */
  static async exchangeCodeForToken(
    code: string,
    clientId: string,
    clientSecret: string,
    redirectUri: string
  ): Promise<GHLTokenData> {
    return GoHighLevelAuthService.exchangeCodeForToken(code, clientId, clientSecret, redirectUri);
  }

  /**
   * Set agency token
   */
  static setAgencyToken(token: string): void {
    GoHighLevelAuthService.setAgencyToken(token);
  }

  /**
   * Test agency token
   */
  static async testAgencyToken(token?: string): Promise<{ success: boolean; message?: string }> {
    if (!token) {
      token = await GoHighLevelAuthService.getAgencyToken();
    }
    return GoHighLevelAuthService.testAgencyToken(token);
  }

  /**
   * Get agency token
   */
  static async getAgencyToken(): Promise<string> {
    return GoHighLevelAuthService.getAgencyToken();
  }

  /**
   * Get location token
   */
  static getLocationToken(locationId: string): string | null {
    return GoHighLevelAuthService.getLocationToken(locationId);
  }

  /**
   * Set credentials for API calls
   */
  static setCredentials(accessToken: string, locationId?: string): void {
    if (locationId) {
      GoHighLevelAuthService.setCredentials(accessToken, locationId);
    } else {
      // Agency-level token
      GoHighLevelAuthService.setAgencyToken(accessToken);
    }
  }

  /**
   * Check if service is connected
   */
  static isConnected(): boolean {
    return GoHighLevelAuthService.getAgencyToken() !== null || 
           GoHighLevelAuthService.getLocationToken('any') !== null;
  }

  /**
   * Disconnect the service
   */
  static disconnect(): void {
    // Clear all tokens
    GoHighLevelAuthService.setAgencyToken('');
    // Note: Individual location tokens are managed per location
    debugLogger.info('GoHighLevelService', 'Service disconnected');
  }

  /**
   * Get contacts for a location
   */
  static async getContacts(locationId: string, limit = 100, offset = 0) {
    return GoHighLevelApiService.getContacts(locationId, limit, offset);
  }

  /**
   * Get campaigns for a location
   */
  static async getCampaigns(locationId: string) {
    return GoHighLevelApiService.getCampaigns(locationId);
  }

  /**
   * Get funnels for a location
   */
  static async getFunnels(locationId: string) {
    return GoHighLevelApiService.getFunnels(locationId);
  }

  /**
   * Get funnel pages for a specific funnel
   */
  static async getFunnelPages(funnelId: string, locationId: string) {
    return GoHighLevelApiService.getFunnelPages(funnelId, locationId);
  }

  /**
   * Get opportunities for a location
   */
  static async getOpportunities(locationId: string) {
    return GoHighLevelApiService.getOpportunities(locationId);
  }


  /**
   * Save location token to database
   */
  static async saveLocationToken(locationId: string, token: string, refreshToken?: string, scopes?: string[], expiresIn?: number): Promise<boolean> {
    return GoHighLevelApiService.saveLocationToken(locationId, token, refreshToken, scopes, expiresIn);
  }

  /**
   * Get valid token for a location
   */
  static async getValidToken(locationId: string): Promise<string | null> {
    return GoHighLevelApiService.getValidToken(locationId);
  }

  // ============================================================================
  // ANALYTICS METHODS (Delegated to GoHighLevelAnalyticsService)
  // ============================================================================

  /**
   * Get comprehensive GHL metrics
   */
  static async getGHLMetrics(locationId: string, dateRange?: { startDate?: string; endDate?: string }) {
    return GoHighLevelAnalyticsService.getGHLMetrics(locationId, dateRange);
  }

  /**
   * Get funnel analytics
   */
  static async getFunnelAnalytics(locationId: string, dateRange?: { startDate?: string; endDate?: string }) {
    return GoHighLevelAnalyticsService.getFunnelAnalytics(locationId, dateRange);
  }

  /**
   * Get page analytics
   */
  static async getPageAnalytics(locationId: string, dateRange?: { startDate?: string; endDate?: string }) {
    return GoHighLevelAnalyticsService.getPageAnalytics(locationId, dateRange);
  }

  /**
   * Get contact count
   */
  static async getContactCount(locationId: string, dateRange?: { startDate?: string; endDate?: string }) {
    return GoHighLevelApiService.getContactCount(locationId, dateRange);
  }

  /**
   * Get opportunities analytics
   */
  static async getOpportunitiesAnalytics(locationId: string, dateRange?: { startDate?: string; endDate?: string }) {
    return GoHighLevelAnalyticsService.getOpportunitiesAnalytics(locationId, dateRange);
  }

  /**
   * Get calendar analytics
   */
  static async getCalendarAnalytics(locationId: string, dateRange?: { startDate?: string; endDate?: string }) {
    return GoHighLevelAnalyticsService.getCalendarAnalytics(locationId, dateRange);
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  /**
   * Get account info (placeholder - implement based on needs)
   */
  static async getAccountInfo() {
    debugLogger.warn('GoHighLevelService', 'getAccountInfo not implemented');
    return null;
  }

  /**
   * Verify webhook signature (placeholder - implement based on needs)
   */
  static verifyWebhookSignature(): boolean {
    debugLogger.warn('GoHighLevelService', 'verifyWebhookSignature not implemented');
    return false;
  }

  /**
   * Setup webhook (placeholder - implement based on needs)
   */
  static async setupWebhook(_locationId: string, _webhookUrl: string, _events: string[]): Promise<boolean> {
    debugLogger.warn('GoHighLevelService', 'setupWebhook not implemented');
    return false;
  }
}

// Re-export individual services for direct access if needed
export { GoHighLevelAnalyticsService } from './goHighLevelAnalyticsService';
export { GoHighLevelApiService } from './goHighLevelApiService';
export { GoHighLevelAuthService } from './goHighLevelAuthService';

// Re-export utilities
export { GHLQueryBuilder, GHLRateLimiter } from './goHighLevelUtils';

// Re-export types
export type * from './goHighLevelTypes';

