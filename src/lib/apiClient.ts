import { debugLogger } from './debug';

export interface ApiRequestConfig {
  baseUrl: string;
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  rateLimitDelay?: number;
}

export interface ApiResponse<T = any> {
  data: T;
  status: number;
  statusText: string;
  headers: Headers;
}

export interface ApiError extends Error {
  status?: number;
  statusText?: string;
  response?: Response;
  isRetryable?: boolean;
}

export class ApiClient {
  private config: Required<ApiRequestConfig>;
  private requestQueue: Array<() => Promise<any>> = [];
  private isProcessingQueue = false;
  private lastRequestTime = 0;
  private cache = new Map<string, { data: any; timestamp: number }>();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  constructor(config: ApiRequestConfig) {
    this.config = {
      timeout: 30000,
      retries: 3,
      retryDelay: 1000,
      rateLimitDelay: 1000,
      ...config
    };
  }

  /**
   * Make a rate-limited API request with caching, retries, and error handling
   */
  async request<T = any>(
    endpoint: string,
    options: RequestInit = {},
    useCache = true
  ): Promise<ApiResponse<T>> {
    const url = `${this.config.baseUrl}${endpoint}`;
    const cacheKey = `${url}_${JSON.stringify(options)}`;
    
    // Check cache first
    if (useCache) {
      const cached = this.cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
        debugLogger.debug('API', 'Using cached response', { url });
        return new Response(JSON.stringify(cached.data), { status: 200 }) as any;
      }
    }

    return new Promise((resolve, reject) => {
      this.requestQueue.push(async () => {
        try {
          // Wait for minimum interval between requests
          const timeSinceLastRequest = Date.now() - this.lastRequestTime;
          if (timeSinceLastRequest < this.config.rateLimitDelay) {
            await this.delay(this.config.rateLimitDelay - timeSinceLastRequest);
          }

          const response = await this.makeRequestWithRetry(url, options);
          this.lastRequestTime = Date.now();

          // Cache successful responses
          if (response.ok && useCache) {
            const data = await response.json();
            this.cache.set(cacheKey, { data, timestamp: Date.now() });
            resolve({ data, status: response.status, statusText: response.statusText, headers: response.headers } as ApiResponse<T>);
          } else {
            const data = response.ok ? await response.json() : null;
            resolve({ data, status: response.status, statusText: response.statusText, headers: response.headers } as ApiResponse<T>);
          }
        } catch (error) {
          reject(this.createApiError(error as Error, url));
        }
      });

      this.processQueue();
    });
  }

  /**
   * Make request with retry logic
   */
  private async makeRequestWithRetry(url: string, options: RequestInit): Promise<Response> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.config.retries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

        const response = await fetch(url, {
          ...options,
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        // Handle rate limiting
        if (response.status === 429 || response.status === 403) {
          const errorData = await response.json().catch(() => ({}));
          if (errorData.error?.code === 4 || response.status === 429) {
            debugLogger.warn('API', 'Rate limit reached, waiting', { url, attempt });
            await this.delay(60000); // Wait 1 minute for rate limits
            continue;
          }
        }

        // Handle token expiration
        if (response.status === 401) {
          const errorData = await response.json().catch(() => ({}));
          if (errorData.error?.code === 190) {
            throw this.createApiError(new Error('Access token has expired. Please re-authenticate.'), url, response.status);
          }
        }

        return response;
      } catch (error) {
        lastError = error as Error;
        
        if (attempt < this.config.retries && this.isRetryableError(error as Error)) {
          debugLogger.warn('API', 'Request failed, retrying', { url, attempt: attempt + 1, error: (error as Error).message });
          await this.delay(this.config.retryDelay * Math.pow(2, attempt)); // Exponential backoff
        } else {
          throw error;
        }
      }
    }

    throw lastError || new Error('Request failed after all retries');
  }

  /**
   * Process request queue
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessingQueue || this.requestQueue.length === 0) {
      return;
    }

    this.isProcessingQueue = true;

    while (this.requestQueue.length > 0) {
      const request = this.requestQueue.shift();
      if (request) {
        try {
          await request();
        } catch (error) {
          debugLogger.error('API', 'Queue request failed', error);
        }
      }
    }

    this.isProcessingQueue = false;
  }

  /**
   * Check if error is retryable
   */
  private isRetryableError(error: Error): boolean {
    if (error.name === 'AbortError') return false;
    if (error.message.includes('token')) return false;
    return true;
  }

  /**
   * Create standardized API error
   */
  private createApiError(error: Error, url: string, status?: number): ApiError {
    const apiError = error as ApiError;
    apiError.status = status;
    apiError.isRetryable = this.isRetryableError(error);
    debugLogger.error('API', 'Request failed', { url, error: error.message, status });
    return apiError;
  }

  /**
   * Delay utility
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache stats
   */
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}

/**
 * Create API client instances for different services
 */
export const createApiClient = (config: ApiRequestConfig) => new ApiClient(config);

// Pre-configured clients for common services
export const facebookApiClient = createApiClient({
  baseUrl: 'https://graph.facebook.com/v19.0',
  rateLimitDelay: 1000
});

export const googleAdsApiClient = createApiClient({
  baseUrl: 'https://googleads.googleapis.com/v14',
  rateLimitDelay: 1000
});

export const goHighLevelApiClient = createApiClient({
  baseUrl: 'https://services.leadconnectorhq.com',
  rateLimitDelay: 500
});
