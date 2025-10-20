import { Spinner } from '@/components/ui/UnifiedLoadingSystem';
import { Button } from '@/components/ui/button';
import { LucideIcon } from 'lucide-react';
import React from 'react';

interface DashboardActionButtonProps {
  onClick: () => void;
  icon: LucideIcon;
  children: React.ReactNode;
  disabled?: boolean;
  loading?: boolean;
  loadingText?: string;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
}

/**
 * Reusable dashboard action button component
 * Provides consistent styling and behavior for dashboard header buttons
 */
export const DashboardActionButton: React.FC<DashboardActionButtonProps> = ({
  onClick,
  icon: Icon,
  children,
  disabled = false,
  loading = false,
  loadingText,
  variant = 'secondary',
  size = 'sm',
  className = 'bg-white/10 text-white hover:bg-white/20 border-white/20 hover:border-white/30 backdrop-blur-sm'
}) => {
  return (
    <Button
      variant={variant}
      size={size}
      onClick={onClick}
      disabled={disabled || loading}
      className={className}
    >
      {loading ? (
        <>
          <Spinner size="sm" className="mr-2" />
          {loadingText || 'Loading...'}
        </>
      ) : (
        <>
          <Icon className="h-4 w-4 mr-2" />
          {children}
        </>
      )}
    </Button>
  );
};

