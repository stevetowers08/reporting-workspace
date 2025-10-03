import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, Home, RefreshCw } from 'lucide-react';
import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error?: Error;
}

class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('Error caught by boundary:', error, errorInfo);
    }

    handleReload = () => {
        window.location.reload();
    };

    handleGoHome = () => {
        window.location.href = '/';
    };

    render() {
        if (this.state.hasError) {
            return (
                <div className="page-bg-light flex items-center justify-center p-4">
                    <Card className="w-full max-w-md">
                        <CardHeader className="text-center">
                            <CardTitle className="text-xl flex items-center justify-center gap-2">
                                <AlertTriangle className="h-6 w-6 text-red-600" />
                                Something went wrong
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="text-center space-y-4">
                            <p className="text-gray-600">
                                An unexpected error occurred. Please try refreshing the page or contact support if the problem persists.
                            </p>

                            {import.meta.env.DEV && this.state.error && (
                                <div className="bg-red-50 border border-red-200 rounded-md p-3 text-left">
                                    <p className="text-sm font-medium text-red-800">Error Details:</p>
                                    <p className="text-xs text-red-700 mt-1 font-mono">
                                        {this.state.error.message}
                                    </p>
                                </div>
                            )}

                            <div className="space-y-2">
                                <Button onClick={this.handleReload} className="w-full">
                                    <RefreshCw className="h-4 w-4 mr-2" />
                                    Refresh Page
                                </Button>

                                <Button onClick={this.handleGoHome} variant="outline" className="w-full">
                                    <Home className="h-4 w-4 mr-2" />
                                    Go to Dashboard
                                </Button>
                            </div>

                            <div className="text-xs text-gray-500 pt-4 border-t">
                                <p>Error ID: {Date.now()}</p>
                                <p>If this continues, please contact support with this error ID.</p>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
