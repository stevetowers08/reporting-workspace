// Quick Performance Fix for Facebook API
// Add this to prevent multiple simultaneous requests

class FacebookAPICache {
  private static cache = new Map();
  private static pendingRequests = new Map();
  
  static async getCachedOrFetch(key: string, fetchFn: () => Promise<any>, ttl = 300000) { // 5 minutes
    // Return cached data if available
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < ttl) {
      return cached.data;
    }
    
    // Return pending request if already in progress
    if (this.pendingRequests.has(key)) {
      return this.pendingRequests.get(key);
    }
    
    // Create new request
    const promise = fetchFn().then(data => {
      this.cache.set(key, { data, timestamp: Date.now() });
      this.pendingRequests.delete(key);
      return data;
    }).catch(error => {
      this.pendingRequests.delete(key);
      throw error;
    });
    
    this.pendingRequests.set(key, promise);
    return promise;
  }
  
  static clearCache() {
    this.cache.clear();
    this.pendingRequests.clear();
  }
}

// Usage in FacebookAdsService
export class FacebookAdsService {
  static async getAccountMetrics(adAccountId?: string, dateRange?: { start: string; end: string }, conversionAction?: string): Promise<FacebookAdsMetrics> {
    const cacheKey = `metrics_${adAccountId}_${dateRange?.start}_${dateRange?.end}`;
    
    return FacebookAPICache.getCachedOrFetch(cacheKey, async () => {
      // Your existing getAccountMetrics implementation
      // ... existing code ...
    });
  }
}
