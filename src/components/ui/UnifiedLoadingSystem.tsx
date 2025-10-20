import { cn } from '@/lib/utils';
import React from 'react';

// Analytics dashboard loading patterns - following best practices
// 1. One main loading state per page
// 2. Minimal skeleton screens for data
// 3. No distracting animations
// 4. Consistent with dashboard design

// Main page loading - clean and minimal
export const PageLoader: React.FC<{ message?: string }> = ({ message = "Loading..." }) => (
  <div className="min-h-screen bg-slate-50 flex items-center justify-center">
    <div className="text-center">
      <div className="h-6 w-6 border-2 border-slate-300 border-t-blue-600 rounded-full animate-spin mx-auto mb-3" />
      <p className="text-slate-600 text-sm font-medium">{message}</p>
    </div>
  </div>
);

// Minimal data skeleton - matches card structure
export const DataSkeleton: React.FC<{ className?: string }> = ({ className }) => (
  <div className={cn("bg-white border border-slate-200 rounded-lg p-6", className)}>
    <div className="space-y-3">
      <div className="h-4 bg-slate-100 rounded w-1/3" />
      <div className="h-8 bg-slate-100 rounded w-1/2" />
      <div className="h-3 bg-slate-100 rounded w-1/4" />
    </div>
  </div>
);

// Table skeleton - matches table structure
export const TableSkeleton: React.FC<{ rows?: number; className?: string }> = ({ 
  rows = 5, 
  className 
}) => (
  <div className={cn("bg-white border border-slate-200 rounded-lg overflow-hidden", className)}>
    <div className="p-4 border-b border-slate-200">
      <div className="flex gap-4">
        <div className="h-4 bg-slate-100 rounded w-20" />
        <div className="h-4 bg-slate-100 rounded w-20" />
        <div className="h-4 bg-slate-100 rounded w-20" />
        <div className="h-4 bg-slate-100 rounded w-20" />
      </div>
    </div>
    <div className="divide-y divide-slate-200">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="p-4">
          <div className="flex gap-4">
            <div className="h-4 bg-slate-100 rounded w-16" />
            <div className="h-4 bg-slate-100 rounded w-16" />
            <div className="h-4 bg-slate-100 rounded w-16" />
            <div className="h-4 bg-slate-100 rounded w-16" />
          </div>
        </div>
      ))}
    </div>
  </div>
);

// Chart skeleton - matches chart containers
export const ChartSkeleton: React.FC<{ className?: string }> = ({ className }) => (
  <div className={cn("bg-white border border-slate-200 rounded-lg p-6", className)}>
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="h-5 bg-slate-100 rounded w-32" />
        <div className="h-4 bg-slate-100 rounded w-20" />
      </div>
      <div className="space-y-3">
        <div className="h-4 bg-slate-100 rounded w-full" />
        <div className="h-4 bg-slate-100 rounded w-5/6" />
        <div className="h-4 bg-slate-100 rounded w-4/5" />
        <div className="h-4 bg-slate-100 rounded w-3/4" />
        <div className="h-4 bg-slate-100 rounded w-2/3" />
      </div>
    </div>
  </div>
);

// Dashboard grid skeleton - matches dashboard layout
export const DashboardSkeleton: React.FC<{ className?: string }> = ({ className }) => (
  <div className={cn("space-y-6", className)}>
    {/* Header */}
    <div className="space-y-3">
      <div className="h-8 bg-slate-100 rounded w-64" />
      <div className="h-4 bg-slate-100 rounded w-96" />
    </div>

    {/* Metrics cards */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {Array.from({ length: 4 }).map((_, i) => (
        <DataSkeleton key={i} />
      ))}
    </div>

    {/* Charts */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <ChartSkeleton />
      <ChartSkeleton />
    </div>

    {/* Table */}
    <TableSkeleton rows={6} />
  </div>
);

// Button loading state - minimal spinner
export const LoadingButton: React.FC<{
  isLoading: boolean;
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  disabled?: boolean;
}> = ({ isLoading, children, className, onClick, disabled }) => (
  <button
    className={cn(
      "inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium",
      "bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500",
      "disabled:opacity-50 disabled:cursor-not-allowed",
      className
    )}
    onClick={onClick}
    disabled={disabled || isLoading}
  >
    {isLoading ? (
      <>
        <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        Loading...
      </>
    ) : (
      children
    )}
  </button>
);

// Simple spinner component
export const Spinner: React.FC<{ size?: 'sm' | 'md' | 'lg'; className?: string }> = ({ 
  size = 'md', 
  className 
}) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6', 
    lg: 'h-8 w-8'
  };
  
  return (
    <div 
      className={cn(
        "border-2 border-slate-200 border-t-blue-600 rounded-full animate-spin",
        sizeClasses[size],
        className
      )} 
    />
  );
};

