import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

// Skeleton loading components for better perceived performance
export const SkeletonCard: React.FC = () => (
  <Card className="border-slate-200">
    <CardHeader className="pb-3">
      <div className="h-4 bg-slate-200 rounded animate-pulse"></div>
    </CardHeader>
    <CardContent>
      <div className="space-y-3">
        <div className="h-3 bg-slate-200 rounded animate-pulse"></div>
        <div className="h-3 bg-slate-200 rounded animate-pulse w-3/4"></div>
        <div className="h-3 bg-slate-200 rounded animate-pulse w-1/2"></div>
      </div>
    </CardContent>
  </Card>
);

export const SkeletonTable: React.FC = () => (
  <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
    <div className="p-6 border-b border-slate-200">
      <div className="h-6 bg-slate-200 rounded animate-pulse w-1/3"></div>
    </div>
    <div className="p-6 space-y-4">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex items-center gap-4">
          <div className="w-10 h-10 bg-slate-200 rounded-lg animate-pulse"></div>
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-slate-200 rounded animate-pulse w-1/4"></div>
            <div className="h-3 bg-slate-200 rounded animate-pulse w-1/6"></div>
          </div>
          <div className="w-20 h-6 bg-slate-200 rounded animate-pulse"></div>
        </div>
      ))}
    </div>
  </div>
);

// Unified loading states with consistent styling
interface LoadingStateProps {
  message?: string;
  submessage?: string;
  size?: 'sm' | 'md' | 'lg';
  fullScreen?: boolean;
  className?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({ 
  message = "Loading...", 
  submessage,
  size = 'md',
  fullScreen = false,
  className = ''
}) => {
  const sizeClasses = {
    sm: 'h-6 w-6',
    md: 'h-8 w-8', 
    lg: 'h-12 w-12'
  };

  const textSizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg'
  };

  const containerClasses = fullScreen 
    ? "min-h-screen bg-slate-50 flex items-center justify-center"
    : "flex items-center justify-center py-16";

  return (
    <div className={`${containerClasses} ${className}`}>
      <div className="text-center">
        <div className={`animate-spin rounded-full ${sizeClasses[size]} border-2 border-blue-200 border-t-blue-600 mx-auto mb-4`}></div>
        <p className={`text-slate-600 ${textSizeClasses[size]} font-medium`}>{message}</p>
        {submessage && (
          <p className="text-slate-500 text-sm mt-1">{submessage}</p>
        )}
      </div>
    </div>
  );
};

// Inline loading spinner for buttons and small components
interface LoadingSpinnerProps {
  size?: 'xs' | 'sm' | 'md';
  className?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  size = 'sm',
  className = ''
}) => {
  const sizeClasses = {
    xs: 'h-4 w-4',
    sm: 'h-5 w-5',
    md: 'h-6 w-6'
  };

  return (
    <div className={`animate-spin rounded-full border-2 border-blue-200 border-t-blue-600 ${sizeClasses[size]} ${className}`}></div>
  );
};

// Enhanced empty states
interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action
}) => (
  <div className="text-center py-16">
    <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
      {icon}
    </div>
    <h3 className="text-xl font-semibold text-slate-900 mb-2">{title}</h3>
    <p className="text-slate-600 mb-6 max-w-md mx-auto">{description}</p>
    {action && (
      <Button 
        onClick={action.onClick}
        size="lg"
        className="bg-blue-600 hover:bg-blue-700 text-white"
      >
        {action.label}
      </Button>
    )}
  </div>
);

// Error states
interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = "Something went wrong",
  message,
  onRetry
}) => (
  <div className="text-center py-16">
    <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
      <svg className="h-12 w-12 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
      </svg>
    </div>
    <h3 className="text-xl font-semibold text-slate-900 mb-2">{title}</h3>
    <p className="text-slate-600 mb-6 max-w-md mx-auto">{message}</p>
    {onRetry && (
      <Button 
        onClick={onRetry}
        variant="outline"
        size="lg"
        className="border-slate-300 text-slate-700 hover:bg-slate-50"
      >
        Try Again
      </Button>
    )}
  </div>
);
