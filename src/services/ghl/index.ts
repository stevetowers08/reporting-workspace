/**
 * GoHighLevel Service - Modular Interface
 * 
 * This provides both the original working service and new organized modules
 * for gradual migration and development-friendly structure.
 */

// Keep the original working service
export { GoHighLevelService } from './goHighLevelService';

// Export all original interfaces and types
export type {
    GHLAccount, GHLCampaign, GHLContact
} from './goHighLevelService';

// Export all available services and types
export { GoHighLevelAnalyticsService } from './goHighLevelAnalyticsService';
export { GoHighLevelApiService } from './goHighLevelApiService';
export { GoHighLevelAuthService } from './goHighLevelAuthService';

// Export all types
export type * from './goHighLevelTypes';

/**
 * Usage Examples:
 * 
 * // Old way (still works):
 * import { GoHighLevelService } from '@/services/ghl';
 * const contacts = await GoHighLevelService.getAllContacts(locationId);
 * const metrics = await GoHighLevelService.getGHLMetrics(locationId);
 * 
 * // New way (when ready):
 * import { GHLContacts, GHLAnalytics } from '@/services/ghl';
 * const contacts = await GHLContacts.getContacts(locationId);
 * const metrics = await GHLAnalytics.getMetrics(locationId);
 * 
 * // Gradual migration approach:
 * // 1. Keep using GoHighLevelService for existing code
 * // 2. Use new modules for new features
 * // 3. Gradually migrate existing code when convenient
 */
