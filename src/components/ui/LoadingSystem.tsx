import { cn } from '@/lib/utils';
import React from 'react';

// Modern shimmer effect component
export const ShimmerEffect: React.FC<{ className?: string }> = ({ className }) => (
  <div className={cn("animate-pulse bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 bg-[length:200%_100%] animate-shimmer", className)} />
);

// Skeleton components for different content types
export const SkeletonCard: React.FC<{ className?: string; height?: string }> = ({ 
  className, 
  height = "h-32" 
}) => (
  <div className={cn("bg-white border border-slate-200 rounded-lg p-6", height, className)}>
    <div className="space-y-3">
      <ShimmerEffect className="h-4 w-3/4 rounded" />
      <ShimmerEffect className="h-6 w-1/2 rounded" />
      <ShimmerEffect className="h-3 w-1/4 rounded" />
    </div>
  </div>
);

export const SkeletonMetricCard: React.FC<{ className?: string }> = ({ className }) => (
  <div className={cn("bg-white border border-slate-200 rounded-lg p-6", className)}>
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <ShimmerEffect className="h-4 w-24 rounded" />
        <ShimmerEffect className="h-6 w-6 rounded-full" />
      </div>
      <ShimmerEffect className="h-8 w-20 rounded" />
      <div className="flex items-center space-x-2">
        <ShimmerEffect className="h-3 w-3 rounded-full" />
        <ShimmerEffect className="h-3 w-16 rounded" />
      </div>
    </div>
  </div>
);

export const SkeletonChart: React.FC<{ className?: string; height?: string }> = ({ 
  className, 
  height = "h-64" 
}) => (
  <div className={cn("bg-white border border-slate-200 rounded-lg p-6", height, className)}>
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <ShimmerEffect className="h-5 w-32 rounded" />
        <ShimmerEffect className="h-4 w-20 rounded" />
      </div>
      <div className="space-y-3">
        <ShimmerEffect className="h-4 w-full rounded" />
        <ShimmerEffect className="h-4 w-5/6 rounded" />
        <ShimmerEffect className="h-4 w-4/5 rounded" />
        <ShimmerEffect className="h-4 w-3/4 rounded" />
        <ShimmerEffect className="h-4 w-2/3 rounded" />
      </div>
    </div>
  </div>
);

export const SkeletonTable: React.FC<{ 
  rows?: number; 
  columns?: number; 
  className?: string 
}> = ({ 
  rows = 5, 
  columns = 4, 
  className 
}) => (
  <div className={cn("bg-white border border-slate-200 rounded-lg overflow-hidden", className)}>
    {/* Table header */}
    <div className="border-b border-slate-200 p-4">
      <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
        {Array.from({ length: columns }).map((_, i) => (
          <ShimmerEffect key={i} className="h-4 w-20 rounded" />
        ))}
      </div>
    </div>
    
    {/* Table rows */}
    <div className="divide-y divide-slate-200">
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="p-4">
          <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
            {Array.from({ length: columns }).map((_, colIndex) => (
              <ShimmerEffect key={colIndex} className="h-4 w-16 rounded" />
            ))}
          </div>
        </div>
      ))}
    </div>
  </div>
);

// Modern loading spinner with gradient
export const ModernSpinner: React.FC<{
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}> = ({ size = 'md', className }) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
    xl: 'h-12 w-12'
  };

  return (
    <div className={cn("relative", className)}>
      <div className={cn(
        "animate-spin rounded-full border-2 border-slate-200",
        sizeClasses[size]
      )}>
        <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-blue-600 border-r-blue-600" />
      </div>
    </div>
  );
};

// Pulse loading indicator
export const PulseLoader: React.FC<{
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}> = ({ size = 'md', className }) => {
  const sizeClasses = {
    sm: 'h-2 w-2',
    md: 'h-3 w-3',
    lg: 'h-4 w-4'
  };

  return (
    <div className={cn("flex items-center space-x-1", className)}>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className={cn(
            "bg-blue-600 rounded-full animate-pulse",
            sizeClasses[size]
          )}
          style={{
            animationDelay: `${i * 0.2}s`,
            animationDuration: '1s'
          }}
        />
      ))}
    </div>
  );
};

// Progress bar with modern styling
export const ProgressBar: React.FC<{
  progress: number;
  className?: string;
  showPercentage?: boolean;
}> = ({ progress, className, showPercentage = true }) => (
  <div className={cn("w-full", className)}>
    <div className="flex items-center justify-between mb-2">
      <span className="text-sm font-medium text-slate-700">Loading...</span>
      {showPercentage && (
        <span className="text-sm text-slate-500">{Math.round(progress)}%</span>
      )}
    </div>
    <div className="w-full bg-slate-200 rounded-full h-2">
      <div
        className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full transition-all duration-300 ease-out"
        style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
      />
    </div>
  </div>
);

// Centralized loading state hook
export const useLoadingState = (initialState = false) => {
  const [isLoading, setIsLoading] = React.useState(initialState);
  const [progress, setProgress] = React.useState(0);
  const [loadingMessage, setLoadingMessage] = React.useState('Loading...');

  const startLoading = (message = 'Loading...') => {
    setIsLoading(true);
    setProgress(0);
    setLoadingMessage(message);
  };

  const updateProgress = (newProgress: number, message?: string) => {
    setProgress(newProgress);
    if (message) setLoadingMessage(message);
  };

  const stopLoading = () => {
    setIsLoading(false);
    setProgress(100);
    setTimeout(() => setProgress(0), 300);
  };

  return {
    isLoading,
    progress,
    loadingMessage,
    startLoading,
    updateProgress,
    stopLoading,
    setIsLoading
  };
};

// Full-screen loading overlay
export const LoadingOverlay: React.FC<{
  isLoading: boolean;
  progress?: number;
  message?: string;
  className?: string;
}> = ({ isLoading, progress, message = 'Loading...', className }) => {
  if (!isLoading) return null;

  return (
    <div className={cn(
      "fixed inset-0 bg-white/80 backdrop-blur-sm z-50 flex items-center justify-center",
      className
    )}>
      <div className="bg-white rounded-lg p-8 max-w-sm w-full mx-4">
        <div className="text-center space-y-4">
          <ModernSpinner size="lg" className="mx-auto" />
          <div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              {message}
            </h3>
            {progress !== undefined && (
              <ProgressBar progress={progress} className="mt-4" />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Dashboard-specific skeleton layouts
export const DashboardSkeleton: React.FC<{ className?: string }> = ({ className }) => (
  <div className={cn("space-y-6", className)}>
    {/* Header skeleton */}
    <div className="space-y-4">
      <ShimmerEffect className="h-8 w-64 rounded" />
      <ShimmerEffect className="h-4 w-96 rounded" />
    </div>

    {/* Metrics cards skeleton */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {Array.from({ length: 4 }).map((_, i) => (
        <SkeletonMetricCard key={i} />
      ))}
    </div>

    {/* Charts skeleton */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <SkeletonChart height="h-80" />
      <SkeletonChart height="h-80" />
    </div>

    {/* Table skeleton */}
    <SkeletonTable rows={6} columns={5} />
  </div>
);

// Marketing dashboard specific skeleton
export const MarketingDashboardSkeleton: React.FC<{ className?: string }> = ({ className }) => (
  <div className={cn("space-y-8", className)}>
    {/* Integration status skeleton */}
    <div className="bg-white border border-slate-200 rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <ShimmerEffect className="h-5 w-48 rounded" />
        <ShimmerEffect className="h-4 w-24 rounded" />
      </div>
      <div className="flex items-center space-x-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center space-x-2">
            <ShimmerEffect className="h-8 w-8 rounded-full" />
            <ShimmerEffect className="h-4 w-16 rounded" />
          </div>
        ))}
      </div>
    </div>

    {/* Campaign metrics skeleton */}
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {Array.from({ length: 3 }).map((_, i) => (
        <SkeletonMetricCard key={i} />
      ))}
    </div>

    {/* Performance charts skeleton */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <SkeletonChart height="h-96" />
      <div className="space-y-6">
        <SkeletonChart height="h-48" />
        <SkeletonChart height="h-48" />
      </div>
    </div>

    {/* Data table skeleton */}
    <SkeletonTable rows={8} columns={6} />
  </div>
);

// Add shimmer animation to global CSS
export const shimmerCSS = `
@keyframes shimmer {
  0% {
    background-position: -200% 0;
  }
  100% {
    background-position: 200% 0;
  }
}

.animate-shimmer {
  animation: shimmer 2s infinite;
}
`;
