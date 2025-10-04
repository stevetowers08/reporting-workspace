import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { debugLogger } from '@/lib/debug';
import { AlertCircle, RefreshCw, WifiOff } from 'lucide-react';
import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  retryCount: number;
  isRetrying: boolean;
}

export class IntegrationErrorBoundary extends Component<Props, State> {
  private retryTimeoutId: NodeJS.Timeout | null = null;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
      isRetrying: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    debugLogger.error('IntegrationErrorBoundary', 'Caught integration error', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
    });

    this.setState({
      error,
      errorInfo,
    });

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  componentWillUnmount() {
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
    }
  }

  private handleRetry = () => {
    this.setState(prevState => ({
      isRetrying: true,
      retryCount: prevState.retryCount + 1,
    }));

    // Clear error state after a short delay
    this.retryTimeoutId = setTimeout(() => {
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null,
        isRetrying: false,
      });
    }, 1000);
  };

  private handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
      isRetrying: false,
    });
  };

  private getErrorType = (error: Error): 'network' | 'auth' | 'api' | 'unknown' => {
    const message = error.message.toLowerCase();
    
    if (message.includes('network') || message.includes('fetch') || message.includes('timeout')) {
      return 'network';
    }
    if (message.includes('auth') || message.includes('token') || message.includes('unauthorized')) {
      return 'auth';
    }
    if (message.includes('api') || message.includes('server') || message.includes('500')) {
      return 'api';
    }
    return 'unknown';
  };

  private getErrorIcon = (errorType: string) => {
    switch (errorType) {
      case 'network':
        return <WifiOff className="h-8 w-8 text-red-500" />;
      case 'auth':
        return <AlertCircle className="h-8 w-8 text-yellow-500" />;
      case 'api':
        return <AlertCircle className="h-8 w-8 text-orange-500" />;
      default:
        return <AlertCircle className="h-8 w-8 text-red-500" />;
    }
  };

  private getErrorTitle = (errorType: string) => {
    switch (errorType) {
      case 'network':
        return 'Connection Error';
      case 'auth':
        return 'Authentication Error';
      case 'api':
        return 'Service Error';
      default:
        return 'Integration Error';
    }
  };

  private getErrorDescription = (errorType: string, error: Error) => {
    switch (errorType) {
      case 'network':
        return 'Unable to connect to the service. Please check your internet connection and try again.';
      case 'auth':
        return 'Your authentication has expired or is invalid. Please reconnect your account.';
      case 'api':
        return 'The service is temporarily unavailable. Please try again in a few moments.';
      default:
        return error.message || 'An unexpected error occurred. Please try again.';
    }
  };

  private getSuggestedActions = (errorType: string) => {
    switch (errorType) {
      case 'network':
        return [
          'Check your internet connection',
          'Try refreshing the page',
          'Contact support if the problem persists'
        ];
      case 'auth':
        return [
          'Reconnect your account in Settings',
          'Check if your API keys are valid',
          'Verify your account permissions'
        ];
      case 'api':
        return [
          'Wait a few minutes and try again',
          'Check service status',
          'Contact support if the issue continues'
        ];
      default:
        return [
          'Try refreshing the page',
          'Check your internet connection',
          'Contact support if the problem persists'
        ];
    }
  };

  render() {
    if (this.state.hasError && this.state.error) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const errorType = this.getErrorType(this.state.error);
      const suggestedActions = this.getSuggestedActions(errorType);

      return (
        <div className="min-h-[400px] flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                {this.getErrorIcon(errorType)}
              </div>
              <CardTitle className="text-xl font-semibold text-slate-900">
                {this.getErrorTitle(errorType)}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-slate-600 text-center">
                {this.getErrorDescription(errorType, this.state.error)}
              </p>

              {suggestedActions.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-slate-700">Suggested actions:</h4>
                  <ul className="text-sm text-slate-600 space-y-1">
                    {suggestedActions.map((action, index) => (
                      <li key={index} className="flex items-start">
                        <span className="text-slate-400 mr-2">•</span>
                        {action}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex gap-2 pt-4">
                <Button
                  onClick={this.handleRetry}
                  disabled={this.state.isRetrying}
                  className="flex-1"
                  variant="default"
                >
                  {this.state.isRetrying ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Retrying...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Try Again
                    </>
                  )}
                </Button>
                <Button
                  onClick={this.handleReset}
                  variant="outline"
                  className="flex-1"
                >
                  Reset
                </Button>
              </div>

              {this.state.retryCount > 0 && (
                <p className="text-xs text-slate-500 text-center">
                  Retry attempt: {this.state.retryCount}
                </p>
              )}

              {process.env.NODE_ENV === 'development' && (
                <details className="mt-4">
                  <summary className="text-xs text-slate-500 cursor-pointer">
                    Debug Info
                  </summary>
                  <pre className="text-xs text-slate-400 mt-2 p-2 bg-slate-50 rounded overflow-auto">
                    {this.state.error.stack}
                  </pre>
                </details>
              )}
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

// Higher-order component for easier usage
export function withIntegrationErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, 'children'>
) {
  const WrappedComponent = (props: P) => (
    <IntegrationErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </IntegrationErrorBoundary>
  );

  WrappedComponent.displayName = `withIntegrationErrorBoundary(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
}

// Hook for error boundary state
export function useIntegrationErrorBoundary() {
  const [error, setError] = React.useState<Error | null>(null);

  const resetError = React.useCallback(() => {
    setError(null);
  }, []);

  const captureError = React.useCallback((error: Error) => {
    setError(error);
  }, []);

  React.useEffect(() => {
    if (error) {
      throw error;
    }
  }, [error]);

  return { captureError, resetError };
}
