import React, { useEffect, useState } from 'react';

interface HydrationSafeProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  /**
   * Delay before showing children after hydration (in ms)
   * Helps prevent flash of unstyled content
   */
  delay?: number;
}

/**
 * HydrationSafe component prevents hydration mismatches by only rendering
 * children after the component has mounted on the client side.
 * 
 * This is particularly useful for components that use useLayoutEffect,
 * browser-only APIs, or have different behavior on server vs client.
 * 
 * Based on latest React 18 best practices for SSR hydration.
 */
export const HydrationSafe: React.FC<HydrationSafeProps> = ({ 
  children, 
  fallback = null,
  delay = 0
}) => {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    // Use setTimeout to ensure this runs after hydration is complete
    const timer = setTimeout(() => {
      setIsMounted(true);
    }, delay);

    return () => clearTimeout(timer);
  }, [delay]);

  // During SSR and initial hydration, render fallback
  if (!isMounted) {
    return <>{fallback}</>;
  }

  // After hydration, render children
  return <>{children}</>;
};

/**
 * Hook to check if component is mounted (client-side only)
 * Useful for conditional rendering based on hydration status
 * 
 * @returns boolean indicating if component is mounted
 */
export const useIsMounted = () => {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  return isMounted;
};

/**
 * Hook to safely access browser APIs only after hydration
 * Prevents SSR errors and hydration mismatches
 * 
 * @param callback - Function to execute when mounted
 * @param deps - Dependencies array
 */
export const useSafeEffect = (
  callback: () => void | (() => void),
  deps: React.DependencyList = []
) => {
  const isMounted = useIsMounted();

  useEffect(() => {
    if (isMounted) {
      return callback();
    }
  }, [isMounted, ...deps]);
};

/**
 * Higher-order component that wraps a component with HydrationSafe
 * 
 * @param Component - Component to wrap
 * @param fallback - Fallback component to show during SSR
 * @param delay - Delay before showing component after hydration
 */
export const withHydrationSafe = <P extends object>(
  Component: React.ComponentType<P>,
  fallback?: React.ReactNode,
  delay?: number
) => {
  const HydrationSafeComponent: React.FC<P> = (props) => (
    <HydrationSafe fallback={fallback} delay={delay}>
      <Component {...props} />
    </HydrationSafe>
  );

  HydrationSafeComponent.displayName = `withHydrationSafe(${Component.displayName || Component.name})`;
  
  return HydrationSafeComponent;
};

/**
 * Component that only renders on the client side
 * Useful for components that rely heavily on browser APIs
 */
export const ClientOnly: React.FC<{ children: React.ReactNode; fallback?: React.ReactNode }> = ({ 
  children, 
  fallback = null 
}) => {
  return <HydrationSafe fallback={fallback}>{children}</HydrationSafe>;
};
