/**
 * INTEGRATION DATA VALIDATION COMPONENT
 * 
 * This component provides runtime validation and error boundaries
 * to prevent integration data mixing errors from breaking the UI.
 */

import { debugLogger } from '@/lib/debug';
import { ClientContextMissingError, IntegrationDataMixingError } from '@/types/integrations';
import React, { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class IntegrationDataErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    // Check if this is an integration data mixing error
    if (error instanceof IntegrationDataMixingError || error instanceof ClientContextMissingError) {
      return { hasError: true, error };
    }
    
    // Let other errors bubble up
    return { hasError: false };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    if (error instanceof IntegrationDataMixingError || error instanceof ClientContextMissingError) {
      debugLogger.error('IntegrationDataErrorBoundary', 'Integration data error caught:', {
        error: error.message,
        errorInfo,
        stack: error.stack
      });
    }
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="p-4 border border-red-200 rounded-lg bg-red-50">
          <h3 className="text-red-800 font-medium">Integration Data Error</h3>
          <p className="text-red-600 text-sm mt-1">
            {this.state.error?.message || 'An error occurred with integration data'}
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: undefined })}
            className="mt-2 px-3 py-1 bg-red-100 text-red-700 rounded text-sm hover:bg-red-200"
          >
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Hook for validating integration data at runtime
 */
export function useIntegrationDataValidation() {
  const validateData = React.useCallback((
    agencyStatus: any,
    clientAccounts: any,
    operation: string
  ) => {
    try {
      // Check if data looks like agency status
      if (typeof agencyStatus === 'object' && agencyStatus !== null) {
        const hasBooleanFields = ['facebookAds', 'googleAds', 'googleSheets', 'goHighLevel']
          .every(field => typeof agencyStatus[field] === 'boolean');
        
        if (!hasBooleanFields) {
          throw new IntegrationDataMixingError(
            `Invalid agency status data in ${operation}: expected boolean fields`
          );
        }
      }

      // Check if data looks like client accounts
      if (typeof clientAccounts === 'object' && clientAccounts !== null) {
        const hasStringFields = ['facebookAds', 'googleAds', 'googleSheets', 'goHighLevel']
          .every(field => typeof clientAccounts[field] === 'string');
        
        if (!hasStringFields) {
          throw new IntegrationDataMixingError(
            `Invalid client accounts data in ${operation}: expected string fields`
          );
        }
      }

      return true;
    } catch (error) {
      debugLogger.error('useIntegrationDataValidation', `Validation failed in ${operation}:`, error);
      throw error;
    }
  }, []);

  return { validateData };
}

/**
 * Higher-order component that wraps components with integration data validation
 */
export function withIntegrationDataValidation<P extends object>(
  Component: React.ComponentType<P>
) {
  return function WrappedComponent(props: P) {
    return (
      <IntegrationDataErrorBoundary>
        <Component {...props} />
      </IntegrationDataErrorBoundary>
    );
  };
}
