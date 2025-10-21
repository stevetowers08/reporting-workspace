/**
 * Chart Error Boundary Component
 * Demonstrates best practice error handling for reporting applications
 */

import React, { Component, ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { debugLogger } from '@/lib/debug';

interface Props {
  children: ReactNode;
  chartName: string;
  onRetry?: () => void;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
}

export class ChartErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    debugLogger.error('ChartErrorBoundary', `Error in ${this.props.chartName}`, {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack
    });
    
    this.setState({ error, errorInfo });
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
    if (this.props.onRetry) {
      this.props.onRetry();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <Card className="bg-red-50 border-red-200">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center space-x-2 text-red-800">
              <AlertTriangle className="h-5 w-5" />
              <span>Chart Error: {this.props.chartName}</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <p className="text-sm text-red-700">
                This chart failed to load. This could be due to:
              </p>
              <ul className="text-xs text-red-600 list-disc list-inside space-y-1">
                <li>API connection issues</li>
                <li>Data format changes</li>
                <li>Authentication problems</li>
                <li>Rate limiting</li>
              </ul>
              
              <div className="flex items-center space-x-2">
                <button
                  onClick={this.handleRetry}
                  className="flex items-center space-x-1 px-3 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700 transition-colors"
                >
                  <RefreshCw className="h-3 w-3" />
                  <span>Retry</span>
                </button>
                <span className="text-xs text-gray-500">
                  Last error: {this.state.error?.message || 'Unknown error'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      );
    }

    return this.props.children;
  }
}

/**
 * Data Loading State Component
 * Shows proper loading states for charts
 */
interface LoadingStateProps {
  isLoading: boolean;
  error?: Error | null;
  chartName: string;
  children: ReactNode;
}

export const ChartLoadingState: React.FC<LoadingStateProps> = ({
  isLoading,
  error,
  chartName,
  children
}) => {
  if (error) {
    return (
      <Card className="bg-yellow-50 border-yellow-200">
        <CardContent className="p-6">
          <div className="text-center">
            <AlertTriangle className="h-8 w-8 text-yellow-600 mx-auto mb-2" />
            <h3 className="text-sm font-semibold text-yellow-800 mb-1">
              Data Loading Failed
            </h3>
            <p className="text-xs text-yellow-700 mb-3">
              {chartName} - {error.message}
            </p>
            <div className="text-xs text-yellow-600">
              Check your API connections and try refreshing the page
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card className="bg-gray-50 border-gray-200">
        <CardContent className="p-6">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
            <h3 className="text-sm font-semibold text-gray-700 mb-1">
              Loading {chartName}...
            </h3>
            <p className="text-xs text-gray-500">
              Fetching data from APIs
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return <>{children}</>;
};

