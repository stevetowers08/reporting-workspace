import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, Home, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { debugLogger } from '@/lib/debug';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string;
}

export class AppErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: '',
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
      errorId: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    debugLogger.error('AppErrorBoundary', 'Caught application error', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      errorId: this.state.errorId,
    });

    this.setState({
      error,
      errorInfo,
    });

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Log to external service in production
    if (process.env.NODE_ENV === 'production') {
      this.logErrorToService(error, errorInfo);
    }
  }

  private logErrorToService = (error: Error, errorInfo: ErrorInfo) => {
    // In production, you would send this to an error tracking service
    // like Sentry, LogRocket, or Bugsnag
    console.error('Production Error:', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      errorId: this.state.errorId,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
    });
  };

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  private handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: '',
    });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-lg">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <AlertTriangle className="h-12 w-12 text-red-500" />
              </div>
              <CardTitle className="text-2xl font-bold text-slate-900">
                Something went wrong
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="text-center">
                <p className="text-slate-600 mb-4">
                  We're sorry, but something unexpected happened. Our team has been notified.
                </p>
                <p className="text-sm text-slate-500">
                  Error ID: <code className="bg-slate-100 px-2 py-1 rounded text-xs">{this.state.errorId}</code>
                </p>
              </div>

              <div className="space-y-3">
                <Button
                  onClick={this.handleReset}
                  className="w-full"
                  variant="default"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Try Again
                </Button>
                <Button
                  onClick={this.handleGoHome}
                  className="w-full"
                  variant="outline"
                >
                  <Home className="h-4 w-4 mr-2" />
                  Go to Homepage
                </Button>
                <Button
                  onClick={this.handleReload}
                  className="w-full"
                  variant="ghost"
                >
                  Reload Page
                </Button>
              </div>

              {process.env.NODE_ENV === 'development' && (
                <details className="mt-6">
                  <summary className="text-sm text-slate-500 cursor-pointer font-medium">
                    Debug Information
                  </summary>
                  <div className="mt-3 space-y-3">
                    <div>
                      <h4 className="text-sm font-medium text-slate-700 mb-1">Error Message:</h4>
                      <pre className="text-xs text-slate-600 bg-slate-100 p-2 rounded overflow-auto">
                        {this.state.error.message}
                      </pre>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-slate-700 mb-1">Stack Trace:</h4>
                      <pre className="text-xs text-slate-600 bg-slate-100 p-2 rounded overflow-auto max-h-40">
                        {this.state.error.stack}
                      </pre>
                    </div>
                    {this.state.errorInfo && (
                      <div>
                        <h4 className="text-sm font-medium text-slate-700 mb-1">Component Stack:</h4>
                        <pre className="text-xs text-slate-600 bg-slate-100 p-2 rounded overflow-auto max-h-40">
                          {this.state.errorInfo.componentStack}
                        </pre>
                      </div>
                    )}
                  </div>
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
export function withAppErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, 'children'>
) {
  const WrappedComponent = (props: P) => (
    <AppErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </AppErrorBoundary>
  );

  WrappedComponent.displayName = `withAppErrorBoundary(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
}
