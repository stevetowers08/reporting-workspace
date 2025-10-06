// Error handling utilities and typed error objects

export interface AppError {
  code: string;
  message: string;
  details?: any;
  timestamp: string;
  context?: string;
}

export interface ValidationError extends AppError {
  code: 'VALIDATION_ERROR';
  field?: string;
  value?: any;
}

export interface ApiError extends AppError {
  code: 'API_ERROR';
  status?: number;
  endpoint?: string;
}

export interface DatabaseError extends AppError {
  code: 'DATABASE_ERROR';
  operation?: string;
  table?: string;
}

export interface AuthError extends AppError {
  code: 'AUTH_ERROR';
  provider?: string;
}

export interface NetworkError extends AppError {
  code: 'NETWORK_ERROR';
  url?: string;
}

export type ErrorType = ValidationError | ApiError | DatabaseError | AuthError | NetworkError | AppError;

export class ErrorHandler {
  static createError(
    code: string,
    message: string,
    details?: any,
    context?: string
  ): AppError {
    return {
      code,
      message,
      details,
      timestamp: new Date().toISOString(),
      context
    };
  }

  static createValidationError(
    message: string,
    field?: string,
    value?: any,
    context?: string
  ): ValidationError {
    return {
      code: 'VALIDATION_ERROR' as const,
      message,
      details: undefined,
      timestamp: new Date().toISOString(),
      context,
      field,
      value
    };
  }

  static createApiError(
    message: string,
    status?: number,
    endpoint?: string,
    context?: string
  ): ApiError {
    return {
      code: 'API_ERROR' as const,
      message,
      details: undefined,
      timestamp: new Date().toISOString(),
      context,
      status,
      endpoint
    };
  }

  static createDatabaseError(
    message: string,
    operation?: string,
    table?: string,
    context?: string
  ): DatabaseError {
    return {
      code: 'DATABASE_ERROR' as const,
      message,
      details: undefined,
      timestamp: new Date().toISOString(),
      context,
      operation,
      table
    };
  }

  static createAuthError(
    message: string,
    provider?: string,
    context?: string
  ): AuthError {
    return {
      code: 'AUTH_ERROR' as const,
      message,
      details: undefined,
      timestamp: new Date().toISOString(),
      context,
      provider
    };
  }

  static createNetworkError(
    message: string,
    url?: string,
    context?: string
  ): NetworkError {
    return {
      code: 'NETWORK_ERROR' as const,
      message,
      details: undefined,
      timestamp: new Date().toISOString(),
      context,
      url
    };
  }

  static handleError(error: unknown, context?: string): AppError {
    if (error instanceof Error) {
      return this.createError('UNKNOWN_ERROR', error.message, error.stack, context);
    }
    
    if (typeof error === 'string') {
      return this.createError('UNKNOWN_ERROR', error, undefined, context);
    }
    
    return this.createError('UNKNOWN_ERROR', 'An unknown error occurred', error, context);
  }

  static isErrorType(error: any, type: string): error is AppError {
    return error && typeof error === 'object' && error.code === type;
  }

  static formatErrorForUser(error: AppError): string {
    switch (error.code) {
      case 'VALIDATION_ERROR':
        return `Validation error: ${error.message}`;
      case 'API_ERROR':
        return `API error: ${error.message}`;
      case 'DATABASE_ERROR':
        return `Database error: ${error.message}`;
      case 'AUTH_ERROR':
        return `Authentication error: ${error.message}`;
      case 'NETWORK_ERROR':
        return `Network error: ${error.message}`;
      default:
        return error.message;
    }
  }
}
