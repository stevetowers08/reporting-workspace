import React from 'react';

// Animated loading spinner
export const LoadingSpinner: React.FC<{ size?: 'sm' | 'md' | 'lg'; className?: string }> = ({ 
  size = 'md', 
  className = '' 
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6', 
    lg: 'w-8 h-8'
  };

  return (
    <div className={`animate-spin ${sizeClasses[size]} ${className}`}>
      <svg className="w-full h-full" viewBox="0 0 24 24" fill="none">
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
    </div>
  );
};

// Pulsing dots loading animation
export const LoadingDots: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div className={`flex space-x-1 ${className}`}>
      <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
      <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
      <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
    </div>
  );
};

// Skeleton loader for cards
export const CardSkeleton: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div className={`bg-white rounded-lg border border-slate-200 p-6 ${className}`}>
      <div className="animate-pulse">
        <div className="h-4 bg-slate-200 rounded w-1/4 mb-4"></div>
        <div className="h-8 bg-slate-200 rounded w-1/2 mb-2"></div>
        <div className="h-3 bg-slate-200 rounded w-3/4"></div>
      </div>
    </div>
  );
};

// Skeleton loader for charts
export const ChartSkeleton: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div className={`bg-white rounded-lg border border-slate-200 p-6 ${className}`}>
      <div className="animate-pulse">
        <div className="h-4 bg-slate-200 rounded w-1/3 mb-4"></div>
        <div className="h-64 bg-slate-200 rounded"></div>
      </div>
    </div>
  );
};

// Tab loading indicator
export const TabLoadingIndicator: React.FC<{ 
  tabName: string; 
  isLoading: boolean; 
  className?: string 
}> = ({ tabName, isLoading, className = '' }) => {
  if (!isLoading) return null;
  
  return (
    <div className={`flex items-center space-x-2 text-slate-600 ${className}`}>
      <LoadingDots />
      <span className="text-sm">Loading {tabName} data...</span>
    </div>
  );
};

// Progress bar with animation
export const LoadingProgressBar: React.FC<{ 
  progress: number; 
  className?: string;
  showPercentage?: boolean;
}> = ({ progress, className = '', showPercentage = false }) => {
  return (
    <div className={`w-full ${className}`}>
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm text-slate-600">Loading...</span>
        {showPercentage && (
          <span className="text-sm text-slate-600">{Math.round(progress)}%</span>
        )}
      </div>
      <div className="w-full bg-slate-200 rounded-full h-2">
        <div 
          className="bg-blue-500 h-2 rounded-full transition-all duration-300 ease-out"
          style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
        ></div>
      </div>
    </div>
  );
};

// Shimmer effect for loading states
export const ShimmerEffect: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div className={`animate-pulse ${className}`}>
      <div className="h-4 bg-gradient-to-r from-slate-200 via-slate-300 to-slate-200 rounded mb-2"></div>
      <div className="h-4 bg-gradient-to-r from-slate-200 via-slate-300 to-slate-200 rounded mb-2 w-3/4"></div>
      <div className="h-4 bg-gradient-to-r from-slate-200 via-slate-300 to-slate-200 rounded w-1/2"></div>
    </div>
  );
};

// Loading overlay for entire sections
export const LoadingOverlay: React.FC<{ 
  isLoading: boolean; 
  children: React.ReactNode;
  message?: string;
}> = ({ isLoading, children, message = "Loading..." }) => {
  if (!isLoading) return <>{children}</>;
  
  return (
    <div className="relative">
      {children}
      <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-10">
        <div className="text-center">
          <LoadingSpinner size="lg" className="mx-auto mb-4 text-blue-500" />
          <p className="text-slate-600">{message}</p>
        </div>
      </div>
    </div>
  );
};
