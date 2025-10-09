/**
 * Google Ads API Error Handler
 * Provides user-friendly error messages and proper error categorization
 */
export class GoogleAdsErrorHandler {
  /**
   * Convert Google Ads API errors to user-friendly messages
   */
  static handleApiError(error: any, context?: string): {
    userMessage: string;
    technicalMessage: string;
    errorCode: string;
    canRetry: boolean;
    requiresReauth: boolean;
  } {
    const errorMessage = error?.message || String(error);
    const statusCode = error?.status || error?.response?.status;
    
    // Authentication errors
    if (statusCode === 401 || errorMessage.includes('AUTHENTICATION_ERROR')) {
      return {
        userMessage: 'Your Google Ads connection has expired. Please reconnect your account.',
        technicalMessage: `Authentication failed: ${errorMessage}`,
        errorCode: 'AUTHENTICATION_ERROR',
        canRetry: false,
        requiresReauth: true
      };
    }

    // Missing required headers
    if (statusCode === 403 && errorMessage.includes('developer-token')) {
      return {
        userMessage: 'Google Ads configuration is incomplete. Please contact support.',
        technicalMessage: `Missing developer token: ${errorMessage}`,
        errorCode: 'MISSING_DEVELOPER_TOKEN',
        canRetry: false,
        requiresReauth: false
      };
    }

    // Rate limiting
    if (statusCode === 429 || errorMessage.includes('RATE_LIMIT')) {
      return {
        userMessage: 'Google Ads API is temporarily busy. Please try again in a few minutes.',
        technicalMessage: `Rate limited: ${errorMessage}`,
        errorCode: 'RATE_LIMIT',
        canRetry: true,
        requiresReauth: false
      };
    }

    // Quota exhaustion
    if (statusCode === 403 && errorMessage.includes('RESOURCE_EXHAUSTED')) {
      return {
        userMessage: 'Google Ads API daily quota has been reached. Please try again tomorrow.',
        technicalMessage: `Quota exhausted: ${errorMessage}`,
        errorCode: 'QUOTA_EXHAUSTED',
        canRetry: false,
        requiresReauth: false
      };
    }

    // Permission errors
    if (statusCode === 403 && errorMessage.includes('PERMISSION_DENIED')) {
      return {
        userMessage: 'You don\'t have permission to access this Google Ads account.',
        technicalMessage: `Permission denied: ${errorMessage}`,
        errorCode: 'PERMISSION_DENIED',
        canRetry: false,
        requiresReauth: true
      };
    }

    // Account not found
    if (statusCode === 404 || errorMessage.includes('NOT_FOUND')) {
      return {
        userMessage: 'Google Ads account not found. Please check your account ID.',
        technicalMessage: `Account not found: ${errorMessage}`,
        errorCode: 'ACCOUNT_NOT_FOUND',
        canRetry: false,
        requiresReauth: false
      };
    }

    // Network errors
    if (errorMessage.includes('fetch') || errorMessage.includes('network') || errorMessage.includes('timeout')) {
      return {
        userMessage: 'Unable to connect to Google Ads. Please check your internet connection and try again.',
        technicalMessage: `Network error: ${errorMessage}`,
        errorCode: 'NETWORK_ERROR',
        canRetry: true,
        requiresReauth: false
      };
    }

    // Generic API errors
    if (statusCode >= 400 && statusCode < 500) {
      return {
        userMessage: 'There was an issue with your Google Ads request. Please try again.',
        technicalMessage: `API error ${statusCode}: ${errorMessage}`,
        errorCode: 'API_ERROR',
        canRetry: true,
        requiresReauth: false
      };
    }

    // Server errors
    if (statusCode >= 500) {
      return {
        userMessage: 'Google Ads service is temporarily unavailable. Please try again later.',
        technicalMessage: `Server error ${statusCode}: ${errorMessage}`,
        errorCode: 'SERVER_ERROR',
        canRetry: true,
        requiresReauth: false
      };
    }

    // Unknown errors
    return {
      userMessage: 'An unexpected error occurred. Please try again or contact support if the issue persists.',
      technicalMessage: `Unknown error: ${errorMessage}`,
      errorCode: 'UNKNOWN_ERROR',
      canRetry: true,
      requiresReauth: false
    };
  }

  /**
   * Handle OAuth errors
   */
  static handleOAuthError(error: any): {
    userMessage: string;
    technicalMessage: string;
    errorCode: string;
    canRetry: boolean;
    requiresReauth: boolean;
  } {
    const errorMessage = error?.message || String(error);
    
    if (errorMessage.includes('invalid_grant')) {
      return {
        userMessage: 'Your Google authorization has expired. Please reconnect your account.',
        technicalMessage: `OAuth invalid grant: ${errorMessage}`,
        errorCode: 'OAUTH_INVALID_GRANT',
        canRetry: false,
        requiresReauth: true
      };
    }

    if (errorMessage.includes('access_denied')) {
      return {
        userMessage: 'You denied access to your Google account. Please try again and grant the required permissions.',
        technicalMessage: `OAuth access denied: ${errorMessage}`,
        errorCode: 'OAUTH_ACCESS_DENIED',
        canRetry: true,
        requiresReauth: true
      };
    }

    if (errorMessage.includes('invalid_client')) {
      return {
        userMessage: 'Google Ads configuration error. Please contact support.',
        technicalMessage: `OAuth invalid client: ${errorMessage}`,
        errorCode: 'OAUTH_INVALID_CLIENT',
        canRetry: false,
        requiresReauth: false
      };
    }

    if (errorMessage.includes('invalid_request')) {
      return {
        userMessage: 'Invalid Google Ads request. Please try reconnecting your account.',
        technicalMessage: `OAuth invalid request: ${errorMessage}`,
        errorCode: 'OAUTH_INVALID_REQUEST',
        canRetry: true,
        requiresReauth: true
      };
    }

    return {
      userMessage: 'Google authorization failed. Please try reconnecting your account.',
      technicalMessage: `OAuth error: ${errorMessage}`,
      errorCode: 'OAUTH_ERROR',
      canRetry: true,
      requiresReauth: true
    };
  }

  /**
   * Get retry delay based on error type
   */
  static getRetryDelay(errorCode: string, attempt: number): number {
    const baseDelays: Record<string, number> = {
      'RATE_LIMIT': 5000, // 5 seconds
      'NETWORK_ERROR': 2000, // 2 seconds
      'SERVER_ERROR': 10000, // 10 seconds
      'API_ERROR': 3000, // 3 seconds
      'UNKNOWN_ERROR': 5000 // 5 seconds
    };

    const baseDelay = baseDelays[errorCode] || 5000;
    return Math.min(baseDelay * Math.pow(2, attempt - 1), 60000); // Max 1 minute
  }

  /**
   * Check if error should trigger re-authentication
   */
  static shouldTriggerReauth(errorCode: string): boolean {
    const reauthErrors = [
      'AUTHENTICATION_ERROR',
      'OAUTH_INVALID_GRANT',
      'OAUTH_ACCESS_DENIED',
      'OAUTH_INVALID_REQUEST',
      'OAUTH_ERROR',
      'PERMISSION_DENIED'
    ];

    return reauthErrors.includes(errorCode);
  }

  /**
   * Get support contact information based on error
   */
  static getSupportInfo(errorCode: string): {
    shouldContactSupport: boolean;
    supportMessage: string;
  } {
    const supportRequired = [
      'MISSING_DEVELOPER_TOKEN',
      'OAUTH_INVALID_CLIENT',
      'CONFIGURATION_ERROR'
    ];

    if (supportRequired.includes(errorCode)) {
      return {
        shouldContactSupport: true,
        supportMessage: 'This appears to be a configuration issue. Please contact support with error code: ' + errorCode
      };
    }

    return {
      shouldContactSupport: false,
      supportMessage: ''
    };
  }
}
