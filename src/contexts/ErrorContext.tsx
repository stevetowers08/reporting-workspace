import React, { createContext, useContext, useCallback, useState, ReactNode } from 'react';
import { debugLogger } from '@/lib/debug';

export interface AppError {
  id: string;
  message: string;
  type: 'network' | 'auth' | 'api' | 'validation' | 'unknown';
  timestamp: Date;
  context?: Record<string, any>;
  stack?: string;
}

interface ErrorContextType {
  errors: AppError[];
  addError: (error: Omit<AppError, 'id' | 'timestamp'>) => void;
  removeError: (id: string) => void;
  clearErrors: () => void;
  hasErrors: boolean;
}

const ErrorContext = createContext<ErrorContextType | undefined>(undefined);

interface ErrorProviderProps {
  children: ReactNode;
  maxErrors?: number;
}

export function ErrorProvider({ children, maxErrors = 10 }: ErrorProviderProps) {
  const [errors, setErrors] = useState<AppError[]>([]);

  const addError = useCallback((errorData: Omit<AppError, 'id' | 'timestamp'>) => {
    const error: AppError = {
      ...errorData,
      id: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
    };

    debugLogger.error('ErrorProvider', 'Adding error to context', {
      id: error.id,
      type: error.type,
      message: error.message,
    });

    setErrors(prevErrors => {
      const newErrors = [error, ...prevErrors];
      // Keep only the most recent errors
      return newErrors.slice(0, maxErrors);
    });
  }, [maxErrors]);

  const removeError = useCallback((id: string) => {
    debugLogger.info('ErrorProvider', 'Removing error from context', { id });
    setErrors(prevErrors => prevErrors.filter(error => error.id !== id));
  }, []);

  const clearErrors = useCallback(() => {
    debugLogger.info('ErrorProvider', 'Clearing all errors from context');
    setErrors([]);
  }, []);

  const hasErrors = errors.length > 0;

  const value: ErrorContextType = {
    errors,
    addError,
    removeError,
    clearErrors,
    hasErrors,
  };

  return (
    <ErrorContext.Provider value={value}>
      {children}
    </ErrorContext.Provider>
  );
}

export function useErrorContext() {
  const context = useContext(ErrorContext);
  if (context === undefined) {
    throw new Error('useErrorContext must be used within an ErrorProvider');
  }
  return context;
}

// Hook for easy error handling
export function useErrorHandler() {
  const { addError, removeError, clearErrors } = useErrorContext();

  const handleError = useCallback((
    error: Error | string,
    type: AppError['type'] = 'unknown',
    context?: Record<string, any>
  ) => {
    const message = typeof error === 'string' ? error : error.message;
    const stack = typeof error === 'string' ? undefined : error.stack;

    addError({
      message,
      type,
      context,
      stack,
    });
  }, [addError]);

  const handleNetworkError = useCallback((error: Error, context?: Record<string, any>) => {
    handleError(error, 'network', context);
  }, [handleError]);

  const handleAuthError = useCallback((error: Error, context?: Record<string, any>) => {
    handleError(error, 'auth', context);
  }, [handleError]);

  const handleApiError = useCallback((error: Error, context?: Record<string, any>) => {
    handleError(error, 'api', context);
  }, [handleError]);

  const handleValidationError = useCallback((error: Error | string, context?: Record<string, any>) => {
    handleError(error, 'validation', context);
  }, [handleError]);

  return {
    handleError,
    handleNetworkError,
    handleAuthError,
    handleApiError,
    handleValidationError,
    removeError,
    clearErrors,
  };
}
