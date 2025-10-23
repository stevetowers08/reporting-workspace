// Minimal GoHighLevel Auth Service - Only for credential management
// This is a stripped-down version that only handles token storage/retrieval

import { debugLogger } from '@/lib/debug';

export class GoHighLevelAuthService {
  private static locationTokens: Map<string, string> = new Map();

  /**
   * Set credentials for a location
   */
  static setCredentials(token: string, locationId?: string): void {
    if (locationId) {
      this.locationTokens.set(locationId, token);
      debugLogger.info('GoHighLevelAuthService', 'Set location credentials', { locationId });
    } else {
      debugLogger.info('GoHighLevelAuthService', 'Set global credentials');
    }
  }

  /**
   * Get token for a location
   */
  static getToken(locationId: string): string | null {
    return this.locationTokens.get(locationId) || null;
  }

  /**
   * Clear credentials for a location
   */
  static clearCredentials(locationId?: string): void {
    if (locationId) {
      this.locationTokens.delete(locationId);
      debugLogger.info('GoHighLevelAuthService', 'Cleared location credentials', { locationId });
    } else {
      this.locationTokens.clear();
      debugLogger.info('GoHighLevelAuthService', 'Cleared all credentials');
    }
  }
}
