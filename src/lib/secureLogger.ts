import { debugLogger } from '@/lib/debug';

/**
 * Secure logging utility that scrubs sensitive data before logging
 */
export class SecureLogger {
  private static readonly SENSITIVE_PATTERNS = [
    /access[_-]?token/gi,
    /refresh[_-]?token/gi,
    /client[_-]?secret/gi,
    /developer[_-]?token/gi,
    /api[_-]?key/gi,
    /password/gi,
    /secret/gi,
    /token/gi,
    /key/gi,
    /auth/gi
  ];

  private static readonly REDACTION_PLACEHOLDER = '[REDACTED]';

  /**
   * Scrub sensitive data from objects and strings
   */
  private static scrubSensitiveData(data: any): any {
    if (typeof data === 'string') {
      return this.scrubString(data);
    }

    if (Array.isArray(data)) {
      return data.map(item => this.scrubSensitiveData(item));
    }

    if (data && typeof data === 'object') {
      const scrubbed: any = {};
      for (const [key, value] of Object.entries(data)) {
        const lowerKey = key.toLowerCase();
        
        // Check if key contains sensitive patterns
        const isSensitive = this.SENSITIVE_PATTERNS.some(pattern => pattern.test(lowerKey));
        
        if (isSensitive) {
          scrubbed[key] = this.REDACTION_PLACEHOLDER;
        } else {
          scrubbed[key] = this.scrubSensitiveData(value);
        }
      }
      return scrubbed;
    }

    return data;
  }

  /**
   * Scrub sensitive data from strings
   */
  private static scrubString(str: string): string {
    let scrubbed = str;
    
    // Replace common token patterns
    scrubbed = scrubbed.replace(/Bearer\s+[A-Za-z0-9\-._~+/]+=*/g, 'Bearer [REDACTED]');
    scrubbed = scrubbed.replace(/[A-Za-z0-9\-._~+/]{20,}=*/g, '[REDACTED]');
    
    return scrubbed;
  }

  /**
   * Log debug information with sensitive data scrubbed
   */
  static debug(service: string, message: string, data?: any): void {
    const scrubbedData = data ? this.scrubSensitiveData(data) : undefined;
    debugLogger.debug(service, message, scrubbedData);
  }

  /**
   * Log info information with sensitive data scrubbed
   */
  static info(service: string, message: string, data?: any): void {
    const scrubbedData = data ? this.scrubSensitiveData(data) : undefined;
    debugLogger.info(service, message, scrubbedData);
  }

  /**
   * Log warning information with sensitive data scrubbed
   */
  static warn(service: string, message: string, data?: any): void {
    const scrubbedData = data ? this.scrubSensitiveData(data) : undefined;
    debugLogger.warn(service, message, scrubbedData);
  }

  /**
   * Log error information with sensitive data scrubbed
   */
  static error(service: string, message: string, data?: any): void {
    const scrubbedData = data ? this.scrubSensitiveData(data) : undefined;
    debugLogger.error(service, message, scrubbedData);
  }

  /**
   * Log success information with sensitive data scrubbed
   */
  static success(service: string, message: string, data?: any): void {
    const scrubbedData = data ? this.scrubSensitiveData(data) : undefined;
    debugLogger.success(service, message, scrubbedData);
  }

  /**
   * Log API request details with sensitive headers scrubbed
   */
  static logApiRequest(service: string, method: string, url: string, headers?: Record<string, string>, body?: any): void {
    const scrubbedHeaders = headers ? this.scrubSensitiveData(headers) : undefined;
    const scrubbedBody = body ? this.scrubSensitiveData(body) : undefined;
    
    this.debug(service, `API Request: ${method} ${url}`, {
      headers: scrubbedHeaders,
      body: scrubbedBody
    });
  }

  /**
   * Log API response details with sensitive data scrubbed
   */
  static logApiResponse(service: string, status: number, statusText: string, data?: any): void {
    const scrubbedData = data ? this.scrubSensitiveData(data) : undefined;
    
    this.debug(service, `API Response: ${status} ${statusText}`, scrubbedData);
  }

  /**
   * Log OAuth flow details with sensitive data scrubbed
   */
  static logOAuthFlow(service: string, step: string, data?: any): void {
    const scrubbedData = data ? this.scrubSensitiveData(data) : undefined;
    
    this.debug(service, `OAuth Flow - ${step}`, scrubbedData);
  }

  /**
   * Log token operations with sensitive data scrubbed
   */
  static logTokenOperation(service: string, operation: string, data?: any): void {
    const scrubbedData = data ? this.scrubSensitiveData(data) : undefined;
    
    this.debug(service, `Token Operation - ${operation}`, scrubbedData);
  }

  /**
   * Log Google Ads API calls with sensitive data scrubbed
   */
  static logGoogleAdsApiCall(service: string, operation: string, customerId: string, data?: any): void {
    const scrubbedData = data ? this.scrubSensitiveData(data) : undefined;
    
    this.debug(service, `Google Ads API - ${operation}`, {
      customerId: customerId,
      ...scrubbedData
    });
  }

  /**
   * Log rate limiting information
   */
  static logRateLimit(service: string, action: string, waitTime?: number): void {
    this.warn(service, `Rate Limit - ${action}`, {
      waitTime: waitTime,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Log security events
   */
  static logSecurityEvent(service: string, event: string, details?: any): void {
    const scrubbedDetails = details ? this.scrubSensitiveData(details) : undefined;
    
    this.warn(service, `Security Event - ${event}`, {
      timestamp: new Date().toISOString(),
      details: scrubbedDetails
    });
  }
}
