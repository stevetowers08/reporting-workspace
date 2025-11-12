/**
 * GoHighLevel Services - Modular Interface
 * 
 * Organized by responsibility:
 * - GoHighLevelApiService: Core API endpoints
 * - GoHighLevelAnalyticsService: Analytics and metrics aggregation
 * - GHLOAuthService: OAuth 2.0 flow and token management
 * - GoHighLevelAuthService: Token caching and credential management
 * - GoHighLevelOAuthConfigService: OAuth configuration management
 */

// Core Services
export { GoHighLevelApiService } from './goHighLevelApiService';
export { GoHighLevelAnalyticsService } from './goHighLevelAnalyticsService';
export { GHLOAuthService } from './ghlOAuthService';
export { GoHighLevelAuthService } from './goHighLevelAuthService';
export { GoHighLevelOAuthConfigService } from './goHighLevelOAuthConfigService';

// Backward compatibility wrapper (deprecated - only kept for type exports)
export { GoHighLevelService } from './goHighLevelService';
export type { GHLAccount, GHLCampaign, GHLContact } from './goHighLevelTypes';

// OAuth types
export type { GHLTokenData, GHLLocationTokenRequest, GHLLocationTokenResponse } from './ghlOAuthService';

// All other types
export type * from './goHighLevelTypes';
