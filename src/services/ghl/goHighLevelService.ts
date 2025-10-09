// GoHighLevel Main Service - Backward Compatible Exports

// Re-export all types
export * from './goHighLevelTypes';

// Re-export all services
export { GoHighLevelAuthService } from './goHighLevelAuthService';
export { GoHighLevelApiService } from './goHighLevelApiService';
export { GoHighLevelAnalyticsService } from './goHighLevelAnalyticsService';
export { 
  GHLRateLimiter, 
  GHLQueryBuilder, 
  GHLCache, 
  GHLValidator, 
  GHLFormatter 
} from './goHighLevelUtils';

// Main service class for backward compatibility
import { GoHighLevelAuthService } from './goHighLevelAuthService';
import { GoHighLevelApiService } from './goHighLevelApiService';
import { GoHighLevelAnalyticsService } from './goHighLevelAnalyticsService';
// Types are re-exported above, no need to import here

export class GoHighLevelService {
  // OAuth Methods
  static getAuthorizationUrl = GoHighLevelAuthService.getAuthorizationUrl;
  static exchangeCodeForToken = GoHighLevelAuthService.exchangeCodeForToken;
  static verifyWebhookSignature = GoHighLevelAuthService.verifyWebhookSignature;
  static setupWebhook = GoHighLevelAuthService.setupWebhook;

  // Token Management
  static setAgencyToken = GoHighLevelAuthService.setAgencyToken;
  static setCredentials = GoHighLevelAuthService.setCredentials;
  static testAgencyToken = GoHighLevelAuthService.testAgencyToken;

  // Account Info
  static getAccountInfo = GoHighLevelAuthService.getAccountInfo;
  static getCompanyInfo = GoHighLevelAuthService.getCompanyInfo;

  // API Methods
  static getCampaigns = GoHighLevelApiService.getCampaigns;
  static getContacts = GoHighLevelApiService.getContacts;
  static getContactCount = GoHighLevelApiService.getContactCount;
  static getFunnels = GoHighLevelApiService.getFunnels;
  static getFunnelPages = GoHighLevelApiService.getFunnelPages;
  static getOpportunities = GoHighLevelApiService.getOpportunities;
  static getCalendarEvents = GoHighLevelApiService.getCalendarEvents;

  // Token Management
  static generateLocationToken = GoHighLevelApiService.generateLocationToken;
  static saveLocationToken = GoHighLevelApiService.saveLocationToken;
  static getValidToken = GoHighLevelApiService.getValidToken;

  // Analytics Methods
  static getGHLMetrics = GoHighLevelAnalyticsService.getGHLMetrics;
  static getFunnelAnalytics = GoHighLevelAnalyticsService.getFunnelAnalytics;
  static getPageAnalytics = GoHighLevelAnalyticsService.getPageAnalytics;
  static getOpportunitiesAnalytics = GoHighLevelAnalyticsService.getOpportunitiesAnalytics;
  static getCalendarAnalytics = GoHighLevelAnalyticsService.getCalendarAnalytics;
}