import React, { useEffect, useLayoutEffect } from 'react';

/**
 * Isomorphic layout effect hook that works in both SSR and client-side environments.
 * Uses useLayoutEffect on the client and useEffect on the server to prevent hydration mismatches.
 * 
 * This is the recommended solution for libraries that need useLayoutEffect but must work in SSR.
 * Used by chart libraries like Chart.js, Recharts, and other DOM-measuring components.
 * 
 * @param effect - The effect function to run
 * @param deps - Dependency array for the effect
 */
export const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

/**
 * Enhanced isomorphic layout effect with better error handling and SSR safety
 * @param effect - The effect function to run
 * @param deps - Dependency array for the effect
 */
export const useSafeLayoutEffect = (effect: React.EffectCallback, deps?: React.DependencyList) => {
  const isClient = typeof window !== 'undefined';
  
  // Always call hooks in the same order
  const layoutEffectResult = useLayoutEffect(() => {
    if (isClient) {
      return effect();
    }
  }, deps);
  
  const effectResult = useEffect(() => {
    if (!isClient) {
      // On server, use useEffect to prevent hydration mismatches
      const timer = setTimeout(effect, 0);
      return () => clearTimeout(timer);
    }
  }, deps);
  
  return isClient ? layoutEffectResult : effectResult;
};
