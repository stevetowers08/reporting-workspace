import { cn } from '@/lib/utils';
import React from 'react';

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

/**
 * Skeleton loading component for better perceived performance
 * Provides consistent loading states across the application
 */
export const Skeleton: React.FC<SkeletonProps> = ({ className, ...props }) => {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-gray-200",
        className
      )}
      {...props}
    />
  );
};
