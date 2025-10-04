import { debugLogger } from './debug';

export interface ErrorContext {
  component?: string;
  action?: string;
  userId?: string;
  clientId?: string;
  metadata?: Record<string, any>;
}

export interface UserFriendlyError {
  title: string;
  message: string;
  action?: string;
  code?: string;
}

export class ErrorHandler {
  /**
   * Handle API errors and convert to user-friendly messages
   */
  static handleApiError(error: any, context?: ErrorContext): UserFriendlyError {
    debugLogger.error('ERROR_HANDLER', 'API Error', { error, context });

    // Network errors
    if (error.name === 'AbortError') {
      return {
        title: 'Request Timeout',
        message: 'The request took too long to complete. Please try again.',
        action: 'Retry'
      };
    }

    if (!error.status) {
      return {
        title: 'Connection Error',
        message: 'Unable to connect to the server. Please check your internet connection.',
        action: 'Retry'
      };
    }

    // HTTP status errors
    switch (error.status) {
      case 400:
        return {
          title: 'Invalid Request',
          message: 'The request was invalid. Please check your input and try again.',
          code: 'BAD_REQUEST'
        };
      
      case 401:
        return {
          title: 'Authentication Required',
          message: 'Please sign in to continue.',
          action: 'Sign In',
          code: 'UNAUTHORIZED'
        };
      
      case 403:
        return {
          title: 'Access Denied',
          message: 'You don\'t have permission to perform this action.',
          code: 'FORBIDDEN'
        };
      
      case 404:
        return {
          title: 'Not Found',
          message: 'The requested resource was not found.',
          code: 'NOT_FOUND'
        };
      
      case 429:
        return {
          title: 'Too Many Requests',
          message: 'You\'re making requests too quickly. Please wait a moment and try again.',
          action: 'Retry Later',
          code: 'RATE_LIMITED'
        };
      
      case 500:
        return {
          title: 'Server Error',
          message: 'Something went wrong on our end. Please try again later.',
          action: 'Retry',
          code: 'SERVER_ERROR'
        };
      
      default:
        return {
          title: 'Error',
          message: error.message || 'An unexpected error occurred.',
          action: 'Retry',
          code: 'UNKNOWN'
        };
    }
  }

  /**
   * Handle validation errors
   */
  static handleValidationError(error: any, context?: ErrorContext): UserFriendlyError {
    debugLogger.error('ERROR_HANDLER', 'Validation Error', { error, context });

    if (typeof error === 'string') {
      return {
        title: 'Validation Error',
        message: error,
        code: 'VALIDATION_ERROR'
      };
    }

    if (error.errors && Array.isArray(error.errors)) {
      const firstError = error.errors[0];
      return {
        title: 'Validation Error',
        message: firstError.message || 'Please check your input.',
        code: 'VALIDATION_ERROR'
      };
    }

    return {
      title: 'Validation Error',
      message: error.message || 'Please check your input and try again.',
      code: 'VALIDATION_ERROR'
    };
  }

  /**
   * Handle authentication errors
   */
  static handleAuthError(error: any, context?: ErrorContext): UserFriendlyError {
    debugLogger.error('ERROR_HANDLER', 'Auth Error', { error, context });

    if (error.message?.includes('expired')) {
      return {
        title: 'Session Expired',
        message: 'Your session has expired. Please sign in again.',
        action: 'Sign In',
        code: 'SESSION_EXPIRED'
      };
    }

    if (error.message?.includes('invalid')) {
      return {
        title: 'Invalid Credentials',
        message: 'The provided credentials are invalid.',
        action: 'Try Again',
        code: 'INVALID_CREDENTIALS'
      };
    }

    return {
      title: 'Authentication Error',
      message: 'Please sign in to continue.',
      action: 'Sign In',
      code: 'AUTH_ERROR'
    };
  }

  /**
   * Handle file upload errors
   */
  static handleFileError(error: any, context?: ErrorContext): UserFriendlyError {
    debugLogger.error('ERROR_HANDLER', 'File Error', { error, context });

    if (error.message?.includes('size')) {
      return {
        title: 'File Too Large',
        message: 'The file is too large. Please choose a smaller file.',
        code: 'FILE_TOO_LARGE'
      };
    }

    if (error.message?.includes('type')) {
      return {
        title: 'Invalid File Type',
        message: 'Please choose a supported file type.',
        code: 'INVALID_FILE_TYPE'
      };
    }

    return {
      title: 'Upload Error',
      message: 'Failed to upload file. Please try again.',
      action: 'Retry',
      code: 'UPLOAD_ERROR'
    };
  }

  /**
   * Generic error handler for unknown errors
   */
  static handleGenericError(error: any, context?: ErrorContext): UserFriendlyError {
    debugLogger.error('ERROR_HANDLER', 'Generic Error', { error, context });

    return {
      title: 'Something Went Wrong',
      message: 'An unexpected error occurred. Please try again.',
      action: 'Retry',
      code: 'GENERIC_ERROR'
    };
  }

  /**
   * Show error to user (can be extended with toast notifications)
   */
  static showError(error: UserFriendlyError): void {
    // For now, use alert. In production, replace with toast notifications
    alert(`${error.title}: ${error.message}`);
  }

  /**
   * Log error for debugging
   */
  static logError(error: any, context?: ErrorContext): void {
    debugLogger.error('ERROR_HANDLER', 'Error logged', { 
      error: error.message || error, 
      stack: error.stack,
      context 
    });
  }

  /**
   * Wrap async function with error handling
   */
  static async withErrorHandling<T>(
    fn: () => Promise<T>,
    context?: ErrorContext,
    errorHandler?: (error: any) => UserFriendlyError
  ): Promise<T | null> {
    try {
      return await fn();
    } catch (error) {
      const userError = errorHandler 
        ? errorHandler(error)
        : this.handleGenericError(error, context);
      
      this.logError(error, context);
      this.showError(userError);
      return null;
    }
  }
}

/**
 * React hook for error handling
 */
export const useErrorHandler = () => {
  const handleError = (error: any, context?: ErrorContext) => {
    ErrorHandler.logError(error, context);
    return ErrorHandler.handleGenericError(error, context);
  };

  const handleApiError = (error: any, context?: ErrorContext) => {
    ErrorHandler.logError(error, context);
    return ErrorHandler.handleApiError(error, context);
  };

  const handleValidationError = (error: any, context?: ErrorContext) => {
    ErrorHandler.logError(error, context);
    return ErrorHandler.handleValidationError(error, context);
  };

  return {
    handleError,
    handleApiError,
    handleValidationError,
    showError: ErrorHandler.showError
  };
};
